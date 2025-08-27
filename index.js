// Check if we're in a browser environment
const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

// Global instance to prevent multiple initializations
let globalAuditInstance = null;

// Polyfill for crypto.randomUUID() for older browsers
function generateSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createAuditClient({
  baseUrl,
  clientDbUrl,
  includeGeo = true,
  userId = "anonymous",
  onError = (err) => console.error("TriostackAudit Error:", err),
}) {
  if (!baseUrl) throw new Error("baseUrl is required");

  // Only proceed if we're in a browser environment
  if (!isBrowser) {
    console.warn(
      "TriostackAudit: Not in browser environment, audit tracking disabled"
    );
    return {
      track: async () => {},
      cleanup: () => {},
    };
  }

  // Prevent multiple instances
  if (globalAuditInstance) {
    console.warn(
      "TriostackAudit: Client already initialized, returning existing instance"
    );
    return globalAuditInstance;
  }

  let currentRoute = window.location.pathname;
  let routeStartTime = Date.now();
  const sessionId = generateSessionId();

  // Store event listeners for cleanup
  const eventListeners = [];

  // Store original history methods to prevent multiple patching
  const originalHistoryMethods = {
    pushState: history.pushState,
    replaceState: history.replaceState,
  };

  function handleRouteChange() {
    const duration = Math.round((Date.now() - routeStartTime) / 1000);
    track({ route: currentRoute, duration }).catch(onError);
    currentRoute = window.location.pathname;
    routeStartTime = Date.now();
  }

  // Add event listener for popstate (this is the only native event)
  const popstateListener = () => handleRouteChange();
  window.addEventListener("popstate", popstateListener);
  eventListeners.push({
    element: window,
    event: "popstate",
    listener: popstateListener,
  });

  // Add event listeners for custom events dispatched by patched history methods
  const pushstateListener = () => handleRouteChange();
  const replacestateListener = () => handleRouteChange();
  window.addEventListener("pushstate", pushstateListener);
  window.addEventListener("replacestate", replacestateListener);
  eventListeners.push(
    { element: window, event: "pushstate", listener: pushstateListener },
    { element: window, event: "replacestate", listener: replacestateListener }
  );

  // Patch history methods to dispatch custom events
  patchHistoryMethod("pushState", "pushstate");
  patchHistoryMethod("replaceState", "replacestate");

  // Track initial route
  setTimeout(() => {
    track({ route: currentRoute, duration: 0 }).catch(onError);
  }, 0);

  async function track({ route, duration }) {
    let geo = {
      ip: "unknown",
      city: "unknown",
      region: "unknown",
      country: "unknown",
    };

    if (includeGeo) {
      try {
        geo = await getUserGeo();
      } catch (err) {
        onError(err);
      }
    }

    const activity = {
      userId,
      route,
      duration,
      ...geo,
      timestamp: new Date().toISOString(),
      sessionId,
    };

    try {
      await sendToAuditAPI(activity);
    } catch (err) {
      onError(err);
    }

    if (clientDbUrl) {
      try {
        await saveToClientDB(activity, clientDbUrl);
      } catch (err) {
        onError(err);
      }
    }

    return activity;
  }

  async function sendToAuditAPI(activity) {
    try {
      const res = await fetch(baseUrl + "/audit-log", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(activity),
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(
          `Audit API failed with status ${res.status}: ${errorText}`
        );
      }

      // Try to parse response for better error handling
      try {
        const responseData = await res.json();
        return responseData;
      } catch (parseError) {
        // Response might not be JSON, which is okay
        return { success: true };
      }
    } catch (err) {
      // Don't throw errors in production, just log them
      if (process.env.NODE_ENV === "development") {
        throw new Error(`Failed to send to audit API: ${err.message}`);
      } else {
        console.warn("Audit API call failed:", err.message);
        return { success: false, error: err.message };
      }
    }
  }

  async function saveToClientDB(activity, clientDbUrl) {
    try {
      const res = await fetch(clientDbUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(activity),
      });
      if (!res.ok)
        throw new Error("Client DB save failed with status " + res.status);
    } catch (err) {
      throw new Error(`Failed to save to client DB: ${err.message}`);
    }
  }

  // Cleanup function to remove event listeners and restore history methods
  function cleanup() {
    eventListeners.forEach(({ element, event, listener }) => {
      element.removeEventListener(event, listener);
    });
    eventListeners.length = 0;

    // Restore original history methods
    if (originalHistoryMethods.pushState) {
      history.pushState = originalHistoryMethods.pushState;
    }
    if (originalHistoryMethods.replaceState) {
      history.replaceState = originalHistoryMethods.replaceState;
    }

    // Clear global instance
    globalAuditInstance = null;
  }

  globalAuditInstance = { track, cleanup };
  return globalAuditInstance;
}

function patchHistoryMethod(method, eventName) {
  if (!isBrowser) return;

  const original = history[method];
  if (!original) return; // Guard against undefined methods

  history[method] = function () {
    const result = original.apply(this, arguments);
    // Dispatch custom event for the patched method
    window.dispatchEvent(new CustomEvent(eventName));
    return result;
  };
}

async function getUserGeo() {
  try {
    // Try multiple geolocation services with CORS handling
    const services = [
      "https://ipapi.co/json/",
      "https://api.ipify.org?format=json",
      "https://ip-api.com/json/",
    ];

    for (const service of services) {
      try {
        const res = await fetch(service, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) continue;

        const data = await res.json();

        // Handle different API response formats
        if (data.ip) {
          return {
            ip: data.ip || "unknown",
            city: data.city || data.regionName || "unknown",
            region: data.region || data.regionCode || "unknown",
            country: data.country_name || data.country || "unknown",
          };
        }
      } catch (serviceError) {
        console.warn(
          `Geolocation service ${service} failed:`,
          serviceError.message
        );
        continue;
      }
    }

    // If all services fail, return fallback
    throw new Error("All geolocation services failed");
  } catch (err) {
    console.warn("Geolocation failed, using fallback values:", err.message);
    return {
      ip: "unknown",
      city: "unknown",
      region: "unknown",
      country: "unknown",
    };
  }
}

// Default export for CommonJS compatibility
export default createAuditClient;
