# 🚨 IMMEDIATE FIX for Production Issues

## **Current Issues:**
1. CORS errors with geolocation API (429 Too Many Requests)
2. HTTP 400 errors with audit API
3. Multiple audit client initializations

## **Quick Fix - Update Your Next.js Code:**

### **Step 1: Update to Latest Version**
```bash
npm install triostack-audit-sdk@latest
```

### **Step 2: Replace Your Current Implementation**

**In your `layout.tsx` or `_app.tsx`:**

```javascript
'use client';

import { useEffect } from 'react';
import { createAuditClient } from 'triostack-audit-sdk';

export default function RootLayout({ children }) {
  useEffect(() => {
    // ONLY initialize once and disable geolocation
    const auditClient = createAuditClient({
      baseUrl: 'https://api.iicpa.in/api/audit',
      userId: 'admin@iicpa.com', // Use actual user ID
      includeGeo: false, // DISABLE geolocation to fix CORS
      onError: (error) => {
        // Silent error handling - don't break the app
        console.warn('Audit tracking failed:', error.message);
      },
    });

    return () => {
      auditClient.cleanup();
    };
  }, []); // Empty dependency array to prevent re-initialization

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### **Step 3: Fix Your API Endpoint**

**Create this API route in your Next.js app:**

**File: `app/api/audit/audit-log/route.js`**
```javascript
export async function POST(request) {
  try {
    const data = await request.json();
    
    // Log the received data for debugging
    console.log('Audit data received:', data);
    
    // Validate required fields
    if (!data.userId || !data.route) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // TODO: Save to your database here
    // await saveToDatabase(data);
    
    return Response.json({ 
      success: true,
      message: 'Audit data received successfully'
    });
    
  } catch (error) {
    console.error('Audit API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### **Step 4: Environment Variables**

**Create `.env.local`:**
```env
NEXT_PUBLIC_AUDIT_API_URL=https://api.iicpa.in/api/audit
NEXT_PUBLIC_ENABLE_AUDIT=true
NEXT_PUBLIC_AUDIT_INCLUDE_GEO=false
```

## **Alternative: Disable Audit Completely (Temporary)**

If you need to deploy immediately without audit:

```javascript
// In your layout.tsx or _app.tsx
export default function RootLayout({ children }) {
  // Temporarily disable audit
  // useEffect(() => {
  //   const auditClient = createAuditClient({...});
  // }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

## **Debug Your API Endpoint**

**Test your API directly:**
```bash
curl -X POST https://api.iicpa.in/api/audit/audit-log \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admin@iicpa.com",
    "route": "/admin-dashboard",
    "duration": 30,
    "ip": "unknown",
    "city": "unknown",
    "region": "unknown",
    "country": "unknown",
    "timestamp": "2024-08-27T15:51:00.000Z",
    "sessionId": "test-session-123"
  }'
```

## **Expected Response:**
```json
{
  "success": true,
  "message": "Audit data received successfully"
}
```

## **If Still Getting 400 Errors:**

1. **Check your API endpoint** - Make sure it's exactly: `https://api.iicpa.in/api/audit/audit-log`
2. **Verify the request format** - The SDK sends POST requests with JSON body
3. **Check server logs** - Look at your API server logs for the exact error
4. **Test with Postman** - Use Postman to test the API endpoint manually

## **Quick Test:**

Add this to your component to test:
```javascript
useEffect(() => {
  // Test API endpoint
  fetch('https://api.iicpa.in/api/audit/audit-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'test',
      route: '/test',
      duration: 10
    })
  })
  .then(res => res.json())
  .then(data => console.log('API Test Response:', data))
  .catch(err => console.error('API Test Error:', err));
}, []);
```

This should resolve your immediate production issues!
