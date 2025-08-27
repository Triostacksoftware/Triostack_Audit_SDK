# Quick Start: Triostack Audit SDK in Next.js

## 🚀 5-Minute Setup

### 1. Install the SDK
```bash
npm install triostack-audit-sdk
```

### 2. Create Environment File
Create `.env.local`:
```env
NEXT_PUBLIC_AUDIT_API_URL=https://your-audit-api.com
```

### 3. Quick Implementation

**For App Router (`app/layout.tsx`):**
```typescript
'use client';

import { useEffect } from 'react';
import { createAuditClient } from 'triostack-audit-sdk';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const auditClient = createAuditClient({
      baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
      userId: 'user123', // Replace with actual user ID
    });

    return () => auditClient.cleanup();
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**For Pages Router (`pages/_app.tsx`):**
```typescript
import { useEffect } from 'react';
import { createAuditClient } from 'triostack-audit-sdk';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const auditClient = createAuditClient({
      baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
      userId: 'user123', // Replace with actual user ID
    });

    return () => auditClient.cleanup();
  }, []);

  return <Component {...pageProps} />;
}
```

### 4. That's It! 🎉

Your Next.js app will now automatically track:
- ✅ Page navigation
- ✅ Route changes
- ✅ Time spent on each page
- ✅ User sessions
- ✅ Geolocation data (optional)

## 🔧 Advanced: Custom Hook (Recommended)

Create `hooks/useAudit.ts`:
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { createAuditClient } from 'triostack-audit-sdk';

export function useAudit() {
  const auditClientRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      auditClientRef.current = createAuditClient({
        baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
        userId: 'user123',
      });
    }

    return () => {
      if (auditClientRef.current) {
        auditClientRef.current.cleanup();
      }
    };
  }, []);

  const track = async (route: string, duration: number) => {
    if (auditClientRef.current) {
      return await auditClientRef.current.track({ route, duration });
    }
  };

  return { track };
}
```

Use in any component:
```typescript
import { useAudit } from '@/hooks/useAudit';

export default function Dashboard() {
  const { track } = useAudit();

  const handleAction = async () => {
    await track('/dashboard/action', 30);
  };

  return <button onClick={handleAction}>Custom Action</button>;
}
```

## 📊 What Gets Tracked

The SDK automatically sends this data:
```javascript
{
  userId: "user123",
  route: "/dashboard",
  duration: 45, // seconds
  ip: "192.168.1.1",
  city: "New York",
  region: "NY", 
  country: "United States",
  timestamp: "2024-01-15T10:30:00.000Z",
  sessionId: "550e8400-e29b-41d4-a716-446655440000"
}
```

## 🎯 Next Steps

1. **Replace `user123`** with actual user ID from your auth system
2. **Set up your audit API** to receive the data
3. **Add custom tracking** for specific user actions
4. **Configure error handling** for production

That's it! Your Next.js app is now fully integrated with Triostack Audit SDK! 🚀
