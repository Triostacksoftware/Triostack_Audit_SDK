# Next.js Implementation Guide - Triostack Audit SDK

## 🚀 Server-Side Audit Middleware for Next.js

This guide shows how to implement the **server-side** Triostack Audit SDK in your Next.js application using API routes and middleware.

## 📋 Table of Contents

1. [Quick Setup](#quick-setup)
2. [API Route Implementation](#api-route-implementation)
3. [Middleware Integration](#middleware-integration)
4. [Advanced Configuration](#advanced-configuration)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

## 🚀 Quick Setup

### 1. Install the SDK

```bash
npm install triostack-audit-sdk
```

### 2. Create Environment Variables

```env
# .env.local
AUDIT_DB_URL=https://your-database-api.com/audit-logs
AUDIT_USER_ID_HEADER=x-user-id
AUDIT_ENABLE_GEO=true
```

### 3. Basic API Route Setup

```javascript
// app/api/audit-logs/route.js or pages/api/audit-logs.js
import { createAuditServer } from "triostack-audit-sdk";

const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  userIdHeader: process.env.AUDIT_USER_ID_HEADER || "x-user-id",
  enableGeo: process.env.AUDIT_ENABLE_GEO === "true",
  onError: (err) => console.warn("Audit error:", err),
});

export async function POST(request) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.userId || !data.route) {
      return Response.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save audit data
    await auditServer.track(request, data);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Audit API error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

## 🔧 API Route Implementation

### **Option 1: Express-Style Middleware (Recommended)**

```javascript
// app/api/audit-logs/route.js
import { createAuditServer } from "triostack-audit-sdk";

const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  userIdHeader: "x-user-id",
  enableGeo: true,
  onError: (err) => console.warn("Audit error:", err),
});

export async function GET(request) {
  // Apply audit middleware to track this request
  return new Promise((resolve) => {
    auditServer.expressMiddleware()(
      request,
      {
        statusCode: 200,
        getHeader: (name) => request.headers.get(name),
        on: (event, callback) => {
          if (event === "finish") {
            // Simulate response finish
            setTimeout(() => {
              callback();
              resolve(Response.json({ message: "Audit tracked" }));
            }, 100);
          }
        },
      },
      () => {
        // Request processing complete
        resolve(Response.json({ message: "Audit tracked" }));
      }
    );
  });
}

export async function POST(request) {
  const data = await request.json();

  // Manual tracking
  await auditServer.track(request, {
    userId: data.userId || "anonymous",
    route: "/api/audit-logs",
    method: "POST",
    statusCode: 200,
    duration: 50,
    event: "custom_audit_event",
    metadata: data.metadata || {},
  });

  return Response.json({ success: true });
}
```

### **Option 2: Manual Tracking**

```javascript
// app/api/users/route.js
import { createAuditServer } from "triostack-audit-sdk";

const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
});

export async function GET(request) {
  const startTime = Date.now();

  try {
    // Your API logic
    const users = await fetchUsers();

    // Track successful request
    await auditServer.track(request, {
      userId: request.headers.get("x-user-id") || "anonymous",
      route: "/api/users",
      method: "GET",
      statusCode: 200,
      duration: Math.round((Date.now() - startTime) / 1000),
      event: "users_fetched",
      metadata: { count: users.length },
    });

    return Response.json({ users });
  } catch (error) {
    // Track failed request
    await auditServer.track(request, {
      userId: request.headers.get("x-user-id") || "anonymous",
      route: "/api/users",
      method: "GET",
      statusCode: 500,
      duration: Math.round((Date.now() - startTime) / 1000),
      event: "users_fetch_failed",
      metadata: { error: error.message },
    });

    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
```

## 🔄 Middleware Integration

### **Next.js Middleware (App Router)**

```javascript
// middleware.js
import { NextResponse } from "next/server";
import { createAuditServer } from "triostack-audit-sdk";

const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  userIdHeader: "x-user-id",
  enableGeo: true,
});

export function middleware(request) {
  const startTime = Date.now();

  // Process the request
  const response = NextResponse.next();

  // Track the request after response is sent
  response.headers.set("x-audit-start-time", startTime.toString());

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### **Custom Middleware Hook**

```javascript
// lib/auditMiddleware.js
import { createAuditServer } from "triostack-audit-sdk";

export function createAuditMiddleware() {
  const auditServer = createAuditServer({
    dbUrl: process.env.AUDIT_DB_URL,
    userIdHeader: "x-user-id",
    enableGeo: true,
  });

  return async function auditMiddleware(request, response, next) {
    const startTime = Date.now();

    // Add audit tracking to response
    const originalEnd = response.end;
    response.end = function (...args) {
      const duration = Math.round((Date.now() - startTime) / 1000);

      // Track the request
      auditServer
        .track(request, {
          userId: request.headers["x-user-id"] || "anonymous",
          route: request.url,
          method: request.method,
          statusCode: response.statusCode,
          duration,
          event: "api_request",
        })
        .catch((err) => {
          console.warn("Audit tracking failed:", err.message);
        });

      // Call original end method
      return originalEnd.apply(this, args);
    };

    next();
  };
}
```

## ⚙️ Advanced Configuration

### **Environment-Specific Setup**

```javascript
// lib/auditConfig.js
export function getAuditConfig() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    dbUrl: process.env.AUDIT_DB_URL,
    userIdHeader: process.env.AUDIT_USER_ID_HEADER || "x-user-id",
    enableGeo: process.env.AUDIT_ENABLE_GEO === "true",
    onError: (err) => {
      if (isProduction) {
        // Production: Log to external service
        console.warn("Audit error:", err.message);
        // sendToErrorReporting(err);
      } else {
        // Development: Detailed logging
        console.error("Audit error:", err);
      }
    },
  };
}
```

### **Database Integration**

```javascript
// lib/auditDatabase.js
import { createAuditServer } from "triostack-audit-sdk";

// Custom database handler
async function saveToDatabase(auditData) {
  // Example: Save to MongoDB
  const { MongoClient } = require("mongodb");
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db("audit");
    await db.collection("audit_logs").insertOne(auditData);
  } finally {
    await client.close();
  }
}

// Custom audit server with database integration
export function createCustomAuditServer() {
  const auditServer = createAuditServer({
    dbUrl: "http://localhost:3000/api/audit-logs", // Internal endpoint
    userIdHeader: "x-user-id",
    enableGeo: true,
    onError: (err) => console.warn("Audit error:", err),
  });

  return auditServer;
}
```

## 🚀 Production Deployment

### **1. Environment Configuration**

```env
# .env.production
AUDIT_DB_URL=https://api.yourdomain.com/audit-logs
AUDIT_USER_ID_HEADER=x-user-id
AUDIT_ENABLE_GEO=true
NODE_ENV=production
```

### **2. Production API Route**

```javascript
// app/api/audit-logs/route.js
import { createAuditServer } from "triostack-audit-sdk";

const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  userIdHeader: process.env.AUDIT_USER_ID_HEADER,
  enableGeo: process.env.AUDIT_ENABLE_GEO === "true",
  onError: (err) => {
    // Production error handling
    console.warn("Audit error:", err.message);
    // Don't break the application
  },
});

export async function POST(request) {
  try {
    const data = await request.json();

    // Validate input
    if (!data.userId || !data.route) {
      return Response.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Track audit event
    await auditServer.track(request, data);

    return Response.json({ success: true });
  } catch (error) {
    // Graceful error handling
    console.warn("Audit API error:", error.message);
    return Response.json(
      { success: false, message: "Audit tracking failed" },
      { status: 500 }
    );
  }
}
```

### **3. Health Check Endpoint**

```javascript
// app/api/audit/health/route.js
export async function GET() {
  return Response.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
}
```

## 🔧 Troubleshooting

### **Common Issues**

#### **1. "dbUrl is required" Error**

```javascript
// Make sure AUDIT_DB_URL is set in your environment
console.log("AUDIT_DB_URL:", process.env.AUDIT_DB_URL);
```

#### **2. Network Timeout Errors**

```javascript
const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  onError: (err) => {
    if (err.message.includes("timeout")) {
      console.warn("Audit timeout - continuing without tracking");
    } else {
      console.error("Audit error:", err);
    }
  },
});
```

#### **3. Missing User ID**

```javascript
// Set default user ID for anonymous requests
const userId = request.headers.get("x-user-id") || "anonymous";
```

### **Debug Mode**

```javascript
// Enable debug logging
const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  onError: (err) => {
    if (process.env.NODE_ENV === "development") {
      console.error("Audit Debug:", err);
    } else {
      console.warn("Audit error:", err.message);
    }
  },
});
```

## 📊 Data Structure

The SDK sends this data to your endpoint:

```javascript
{
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  timestamp: "2024-08-27T16:09:00.000Z",
  ip: "192.168.1.1",
  city: "New York",
  region: "NY",
  country: "United States",
  latitude: 40.7128,
  longitude: -74.0060,
  userAgent: "Mozilla/5.0...",
  userId: "user123",
  route: "/api/users",
  method: "GET",
  statusCode: 200,
  duration: 45,
  requestSize: 1024,
  responseSize: 2048,
  event: "api_request", // Optional
  metadata: {} // Optional
}
```

## 🎯 Best Practices

1. **Always handle errors gracefully** - Don't let audit failures break your app
2. **Use environment variables** - Keep configuration flexible
3. **Validate input data** - Ensure required fields are present
4. **Monitor performance** - Audit tracking should be fast and non-blocking
5. **Test thoroughly** - Verify audit data in development before production

This server-side approach eliminates all client-side issues and provides robust audit logging for your Next.js application! 🚀
