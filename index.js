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

// Simple local storage for audit data
function getLocalAuditData() {
  try {
    const data = localStorage.getItem("triostack-audit-data");
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn("Failed to read local audit data:", error);
    return [];
  }
}

function saveLocalAuditData(data) {
  try {
    const existing = getLocalAuditData();
    const updated = [...existing, data];
    // Keep only last 100 entries to prevent storage bloat
    if (updated.length > 100) {
      updated.splice(0, updated.length - 100);
    }
    localStorage.setItem("triostack-audit-data", JSON.stringify(updated));
    return true;
  } catch (error) {
    console.warn("Failed to save local audit data:", error);
    return false;
  }
}

// Get basic user info without external APIs
function getUserInfo() {
  return {
    ip: "local",
    city: "Unknown",
    region: "Unknown",
    country: "Unknown",
    latitude: null,
    longitude: null,
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };
}

export function createAuditClient({
  baseUrl,
  clientDbUrl,
  includeGeo = false, // Default to false to avoid issues
  userId = "anonymous",
  onError = (err) => console.error("TriostackAudit Error:", err),
  enableLocalStorage = true, // New option for local storage
  enableServerSync = false, // New option to control server sync
}) {
  if (!isBrowser) {
    console.warn(
      "TriostackAudit: Not in browser environment, audit tracking disabled"
    );
    return {
      track: async () => {},
      cleanup: () => {},
      getLocalData: () => [],
      clearLocalData: () => {},
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
    const userInfo = getUserInfo();

    const activity = {
      userId,
      route,
      duration,
      ...userInfo,
      timestamp: new Date().toISOString(),
      sessionId,
    };

    // Always save locally if enabled
    if (enableLocalStorage) {
      const saved = saveLocalAuditData(activity);
      if (saved) {
        console.log("Audit data saved locally:", activity);
      }
    }

    // Only try server sync if enabled and baseUrl is provided
    if (enableServerSync && baseUrl) {
      try {
        await sendToAuditAPI(activity);
      } catch (err) {
        onError(err);
      }
    }

    if (clientDbUrl && enableServerSync) {
      try {
        await saveToClientDB(activity, clientDbUrl);
      } catch (err) {
        onError(err);
      }
    }

    return activity;
  }

  async function sendToAuditAPI(activity) {
    if (!baseUrl) {
      console.warn("No baseUrl provided, skipping server sync");
      return;
    }

    try {
      const res = await fetch(baseUrl + "/audit-log", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(activity),
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
        headers: {
          "content-type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(activity),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(
          `Client DB save failed with status ${res.status}: ${errorText}`
        );
      }

      try {
        const responseData = await res.json();
        return responseData;
      } catch (parseError) {
        return { success: true };
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        throw new Error(`Failed to save to client DB: ${err.message}`);
      } else {
        console.warn("Client DB save failed:", err.message);
        return { success: false, error: err.message };
      }
    }
  }

  // New functions for local data management
  function getLocalData() {
    return getLocalAuditData();
  }

  function clearLocalData() {
    try {
      localStorage.removeItem("triostack-audit-data");
      console.log("Local audit data cleared");
    } catch (error) {
      console.warn("Failed to clear local audit data:", error);
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

  globalAuditInstance = {
    track,
    cleanup,
    getLocalData,
    clearLocalData,
  };
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

// Default export for CommonJS compatibility
export default createAuditClient;
