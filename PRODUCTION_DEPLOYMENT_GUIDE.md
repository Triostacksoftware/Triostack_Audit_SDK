# Production Deployment Guide - Triostack Audit SDK

## 🚨 Common Deployment Issues & Solutions

### **Issue 1: CORS Policy Errors**

**Problem:** `Access to fetch at 'https://ipapi.co/json/' has been blocked by CORS policy`

**Solutions:**

#### Option A: Disable Geolocation (Recommended for Production)
```javascript
const auditClient = createAuditClient({
  baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL,
  userId: 'user123',
  includeGeo: false, // Disable geolocation to avoid CORS issues
});
```

#### Option B: Use Your Own Geolocation API
```javascript
// Create a server-side API route in Next.js
// pages/api/geolocation.js or app/api/geolocation/route.js
export async function GET() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({
      ip: "unknown",
      city: "unknown",
      region: "unknown",
      country: "unknown"
    });
  }
}

// Then use your own endpoint
const auditClient = createAuditClient({
  baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL,
  userId: 'user123',
  includeGeo: true, // This will use your API instead
});
```

### **Issue 2: HTTP 400 Bad Request**

**Problem:** `Audit API failed with status 400`

**Solutions:**

#### Check API Endpoint Format
```javascript
// Make sure your API endpoint is correct
const auditClient = createAuditClient({
  baseUrl: 'https://api.iicpa.in/api/audit', // Should end without trailing slash
  userId: 'user123',
});
```

#### Verify API Payload Format
Your API should expect this payload:
```json
{
  "userId": "user123",
  "route": "/dashboard",
  "duration": 45,
  "ip": "192.168.1.1",
  "city": "New York",
  "region": "NY",
  "country": "United States",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### API Route Example (Next.js)
```javascript
// pages/api/audit/audit-log.js or app/api/audit/audit-log/route.js
export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.userId || !data.route) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Process audit data
    console.log('Audit data received:', data);
    
    // Save to database or external service
    // await saveAuditData(data);
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Audit API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### **Issue 3: Multiple Initializations**

**Problem:** Audit client being created multiple times

**Solution:** Use the updated SDK with global instance management

```javascript
// The SDK now prevents multiple initializations automatically
// Just use it normally in your layout or _app.tsx
```

### **Issue 4: Network Failures**

**Problem:** `Failed to load resource: net::ERR_FAILED`

**Solutions:**

#### Add Retry Logic
```javascript
const auditClient = createAuditClient({
  baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL,
  userId: 'user123',
  onError: (error) => {
    // Log error but don't break the app
    console.warn('Audit tracking failed:', error.message);
    
    // Optionally retry or disable audit
    if (error.message.includes('Network')) {
      // Handle network errors gracefully
    }
  },
});
```

#### Environment-Specific Configuration
```javascript
// .env.production
NEXT_PUBLIC_AUDIT_API_URL=https://api.iicpa.in/api/audit
NEXT_PUBLIC_ENABLE_AUDIT=true

// .env.development
NEXT_PUBLIC_AUDIT_API_URL=http://localhost:3000/api/audit
NEXT_PUBLIC_ENABLE_AUDIT=false
```

## 🛠️ Production-Ready Implementation

### **1. Environment Configuration**
```env
# .env.production
NEXT_PUBLIC_AUDIT_API_URL=https://api.iicpa.in/api/audit
NEXT_PUBLIC_ENABLE_AUDIT=true
NEXT_PUBLIC_AUDIT_INCLUDE_GEO=false
```

### **2. Production Hook**
```typescript
// hooks/useAudit.ts
'use client';

import { useEffect, useRef } from 'react';
import { createAuditClient } from 'triostack-audit-sdk';

export function useAudit() {
  const auditClientRef = useRef<any>(null);

  useEffect(() => {
    // Only initialize in production or when explicitly enabled
    const enableAudit = process.env.NEXT_PUBLIC_ENABLE_AUDIT === 'true';
    
    if (typeof window !== 'undefined' && enableAudit) {
      auditClientRef.current = createAuditClient({
        baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
        userId: 'user123', // Replace with actual user ID
        includeGeo: process.env.NEXT_PUBLIC_AUDIT_INCLUDE_GEO === 'true',
        onError: (error) => {
          // Production error handling - don't break the app
          console.warn('Audit tracking failed:', error.message);
        },
      });
    }

    return () => {
      if (auditClientRef.current) {
        auditClientRef.current.cleanup();
      }
    };
  }, []);

  return { track: auditClientRef.current?.track || (() => Promise.resolve()) };
}
```

### **3. API Route Setup**
```javascript
// app/api/audit/audit-log/route.js
export async function POST(request) {
  try {
    const data = await request.json();
    
    // Log audit data (replace with your database logic)
    console.log('Audit data:', data);
    
    // Return success
    return Response.json({ success: true });
  } catch (error) {
    console.error('Audit API error:', error);
    return Response.json({ success: false }, { status: 500 });
  }
}
```

## 🔧 Debugging Steps

### **1. Check Network Tab**
- Open Chrome DevTools → Network tab
- Look for failed requests to your audit API
- Check request/response headers and payload

### **2. Verify Environment Variables**
```javascript
// Add this to your component to debug
console.log('Audit Config:', {
  baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL,
  enableAudit: process.env.NEXT_PUBLIC_ENABLE_AUDIT,
  includeGeo: process.env.NEXT_PUBLIC_AUDIT_INCLUDE_GEO,
});
```

### **3. Test API Endpoint**
```bash
# Test your API endpoint directly
curl -X POST https://api.iicpa.in/api/audit/audit-log \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","route":"/test","duration":10}'
```

## 🎯 Quick Fix for Immediate Deployment

If you need a quick fix for production:

```javascript
// In your layout.tsx or _app.tsx
const auditClient = createAuditClient({
  baseUrl: 'https://api.iicpa.in/api/audit',
  userId: 'user123',
  includeGeo: false, // Disable geolocation to avoid CORS
  onError: (error) => {
    // Silent error handling for production
    console.warn('Audit failed:', error.message);
  },
});
```

This should resolve the immediate deployment issues you're experiencing.
