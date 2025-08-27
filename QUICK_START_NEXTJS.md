# Quick Start: Triostack Audit SDK in Next.js

## 🚀 5-Minute Server-Side Setup

### 1. Install the SDK

```bash
npm install triostack-audit-sdk
```

### 2. Create Environment File

Create `.env.local`:

```env
AUDIT_DB_URL=https://your-database-api.com/audit-logs
AUDIT_USER_ID_HEADER=x-user-id
AUDIT_ENABLE_GEO=true
```

### 3. Quick API Route Implementation

**Create `app/api/audit-logs/route.js` (App Router):**

```javascript
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

    // Track audit event
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

**Or for Pages Router (`pages/api/audit-logs.js`):**

```javascript
import { createAuditServer } from "triostack-audit-sdk";

const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  userIdHeader: process.env.AUDIT_USER_ID_HEADER || "x-user-id",
  enableGeo: process.env.AUDIT_ENABLE_GEO === "true",
  onError: (err) => console.warn("Audit error:", err),
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    // Validate required fields
    if (!data.userId || !data.route) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Track audit event
    await auditServer.track(req, data);

    res.json({ success: true });
  } catch (error) {
    console.error("Audit API error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

### 4. Use in Your API Routes

**Example: Track user login (`app/api/login/route.js`):**

```javascript
import { createAuditServer } from "triostack-audit-sdk";

const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
});

export async function POST(request) {
  const startTime = Date.now();

  try {
    const { email, password } = await request.json();

    // Your authentication logic
    const user = await authenticateUser(email, password);

    // Track successful login
    await auditServer.track(request, {
      userId: user.id,
      route: "/api/login",
      method: "POST",
      statusCode: 200,
      duration: Math.round((Date.now() - startTime) / 1000),
      event: "user_login",
      metadata: {
        loginMethod: "email",
        success: true,
      },
    });

    return Response.json({ success: true, user });
  } catch (error) {
    // Track failed login
    await auditServer.track(request, {
      userId: "anonymous",
      route: "/api/login",
      method: "POST",
      statusCode: 401,
      duration: Math.round((Date.now() - startTime) / 1000),
      event: "user_login_failed",
      metadata: {
        loginMethod: "email",
        success: false,
        error: error.message,
      },
    });

    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
```

### 5. That's It! 🎉

Your Next.js API routes will now automatically track:

- ✅ API requests and responses
- ✅ User authentication events
- ✅ Request timing and performance
- ✅ IP-based geolocation
- ✅ User agents and metadata

## 🔧 Advanced: Middleware Integration

### **Next.js Middleware (Optional)**

Create `middleware.js`:

```javascript
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

  // Add audit tracking header
  response.headers.set("x-audit-start-time", startTime.toString());

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## 📊 What Gets Tracked

The SDK automatically sends this data to your endpoint:

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
  route: "/api/login",
  method: "POST",
  statusCode: 200,
  duration: 150,
  requestSize: 1024,
  responseSize: 2048,
  event: "user_login", // Optional
  metadata: {          // Optional
    loginMethod: "email",
    success: true
  }
}
```

## 🎯 Next Steps

1. **Set up your database endpoint** to receive audit data
2. **Configure user authentication** to get real user IDs
3. **Add custom events** for specific business logic
4. **Monitor audit logs** in production

## 🚨 Important Notes

- **This is a server-side SDK** - No client-side code needed
- **No CORS issues** - All processing happens on your server
- **No external API dependencies** - Uses IP-based geolocation
- **Production ready** - Handles errors gracefully

That's it! Your Next.js app now has robust server-side audit logging! 🚀
