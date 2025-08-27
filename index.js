import { randomUUID } from "crypto";
import geoip from "geoip-lite";
import fetch from "node-fetch";

/**
 * Extract client IP from request
 * @param {import("http").IncomingMessage & { headers: Record<string,string> }} req
 * @returns {string} IP address
 */
function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

/**
 * Build enriched audit event
 * @param {object} data - Extra data (userId, route, duration)
 * @param {string} ip
 * @returns {object}
 */
function buildAuditEvent(data, ip) {
  const geo = geoip.lookup(ip) || {};

  return {
    sessionId: randomUUID(),
    timestamp: new Date().toISOString(),
    ip,
    city: geo.city || "Unknown",
    region: geo.region || "Unknown",
    country: geo.country || "Unknown",
    latitude: geo.ll ? geo.ll[0] : null,
    longitude: geo.ll ? geo.ll[1] : null,
    userAgent: data.userAgent || "Unknown",
    ...data,
  };
}

/**
 * Send audit event to DB/logging service
 * @param {string} url
 * @param {object} auditEvent
 */
async function saveAuditEvent(url, auditEvent) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(auditEvent),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Audit save failed: ${res.status} ${errorText}`);
    }

    try {
      return await res.json();
    } catch {
      return { success: true };
    }
  } catch (err) {
    console.warn("Audit save error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Factory for backend audit server
 * Provides middleware for automatic logging
 *
 * @param {object} options
 * @param {string} options.dbUrl - Where to persist audit logs
 * @param {string} options.userIdHeader - Header name for user ID (default: 'x-user-id')
 * @param {boolean} options.enableGeo - Enable geolocation (default: true)
 * @param {function} options.onError - Error handler function
 * @returns {{ expressMiddleware(): Function, track(req, data): Promise<object> }}
 */
export function createAuditServer({
  dbUrl,
  userIdHeader = "x-user-id",
  enableGeo = true,
  onError = (err) => console.error("TriostackAudit Error:", err),
}) {
  if (!dbUrl) {
    throw new Error("dbUrl is required for audit server");
  }

  async function track(req, data) {
    try {
      const ip = getClientIp(req);
      const auditEvent = buildAuditEvent(
        {
          ...data,
          userAgent: req.headers["user-agent"],
          enableGeo,
        },
        ip
      );

      const result = await saveAuditEvent(dbUrl, auditEvent);

      if (!result.success) {
        onError(new Error(result.error));
      }

      return auditEvent;
    } catch (err) {
      onError(err);
      throw err;
    }
  }

  function expressMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      res.on("finish", async () => {
        const duration = Math.round((Date.now() - startTime) / 1000);
        const userId = req.headers[userIdHeader] || "anonymous";

        try {
          await track(req, {
            userId,
            route: req.originalUrl || req.url,
            method: req.method,
            statusCode: res.statusCode,
            duration,
            requestSize: req.headers["content-length"] || 0,
            responseSize: res.getHeader("content-length") || 0,
          });
        } catch (err) {
          console.warn("Audit middleware failed:", err.message);
        }
      });

      next();
    };
  }

  return { track, expressMiddleware };
}

/**
 * Fastify plugin for audit logging
 * @param {object} options
 * @param {string} options.dbUrl - Where to persist audit logs
 * @param {string} options.userIdHeader - Header name for user ID
 * @param {boolean} options.enableGeo - Enable geolocation
 * @param {function} options.onError - Error handler function
 */
export function fastifyAuditPlugin(options) {
  return async function (fastify, opts) {
    const auditServer = createAuditServer(options);

    fastify.addHook("onRequest", async (request, reply) => {
      request.auditStartTime = Date.now();
    });

    fastify.addHook("onResponse", async (request, reply) => {
      const duration = Math.round((Date.now() - request.auditStartTime) / 1000);
      const userId =
        request.headers[options.userIdHeader || "x-user-id"] || "anonymous";

      try {
        await auditServer.track(request, {
          userId,
          route: request.url,
          method: request.method,
          statusCode: reply.statusCode,
          duration,
          requestSize: request.headers["content-length"] || 0,
          responseSize: reply.getHeader("content-length") || 0,
        });
      } catch (err) {
        console.warn("Fastify audit failed:", err.message);
      }
    });
  };
}

/**
 * Koa middleware for audit logging
 * @param {object} options
 * @param {string} options.dbUrl - Where to persist audit logs
 * @param {string} options.userIdHeader - Header name for user ID
 * @param {boolean} options.enableGeo - Enable geolocation
 * @param {function} options.onError - Error handler function
 */
export function koaAuditMiddleware(options) {
  const auditServer = createAuditServer(options);

  return async (ctx, next) => {
    const startTime = Date.now();

    try {
      await next();
    } finally {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const userId =
        ctx.headers[options.userIdHeader || "x-user-id"] || "anonymous";

      try {
        await auditServer.track(ctx.req, {
          userId,
          route: ctx.url,
          method: ctx.method,
          statusCode: ctx.status,
          duration,
          requestSize: ctx.headers["content-length"] || 0,
          responseSize: ctx.length || 0,
        });
      } catch (err) {
        console.warn("Koa audit failed:", err.message);
      }
    }
  };
}

export default createAuditServer;
