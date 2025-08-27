# Next.js Implementation Guide for Triostack Audit SDK

## 📋 Table of Contents

1. [Installation](#installation)
2. [Environment Setup](#environment-setup)
3. [Implementation Options](#implementation-options)
4. [Complete Implementation Examples](#complete-implementation-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## 🚀 Installation

```bash
npm install triostack-audit-sdk
```

## ⚙️ Environment Setup

Create `.env.local` in your Next.js project:

```env
# Audit API Configuration
NEXT_PUBLIC_AUDIT_API_URL=https://your-audit-api.com
NEXT_PUBLIC_AUDIT_CLIENT_DB_URL=https://your-client-db.com/audit

# Optional: Disable audit in development
NEXT_PUBLIC_ENABLE_AUDIT=true
```

## 🎯 Implementation Options

### Option 1: Custom Hook (Recommended)

### Option 2: Context Provider (Complex Apps)

### Option 3: Layout Integration (Simple Apps)

### Option 4: Middleware Integration (Advanced)

## 📁 Complete Implementation Examples

### 1. Custom Hook Implementation

**File: `hooks/useAudit.ts`**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { createAuditClient, AuditClient } from "triostack-audit-sdk";

interface UseAuditOptions {
  baseUrl: string;
  userId?: string;
  includeGeo?: boolean;
  clientDbUrl?: string;
  onError?: (error: Error) => void;
}

export function useAudit(options: UseAuditOptions) {
  const auditClientRef = useRef<AuditClient | null>(null);

  useEffect(() => {
    // Only initialize on client side
    if (typeof window !== "undefined") {
      auditClientRef.current = createAuditClient({
        baseUrl: options.baseUrl,
        userId: options.userId || "anonymous",
        includeGeo: options.includeGeo ?? true,
        clientDbUrl: options.clientDbUrl,
        onError:
          options.onError ||
          ((error) => {
            console.error("Audit tracking error:", error);
          }),
      });
    }

    // Cleanup function
    return () => {
      if (auditClientRef.current) {
        auditClientRef.current.cleanup();
        auditClientRef.current = null;
      }
    };
  }, [
    options.baseUrl,
    options.userId,
    options.includeGeo,
    options.clientDbUrl,
  ]);

  // Return manual track function for custom tracking
  const track = async (route: string, duration: number) => {
    if (auditClientRef.current) {
      return await auditClientRef.current.track({ route, duration });
    }
  };

  return { track };
}
```

### 2. Context Provider Implementation

**File: `contexts/AuditContext.tsx`**

```typescript
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { createAuditClient, AuditClient } from "triostack-audit-sdk";

interface AuditContextType {
  track: (route: string, duration: number) => Promise<any>;
}

const AuditContext = createContext<AuditContextType | null>(null);

interface AuditProviderProps {
  children: ReactNode;
  baseUrl: string;
  userId?: string;
  includeGeo?: boolean;
  clientDbUrl?: string;
  onError?: (error: Error) => void;
}

export function AuditProvider({
  children,
  baseUrl,
  userId,
  includeGeo,
  clientDbUrl,
  onError,
}: AuditProviderProps) {
  const auditClientRef = useRef<AuditClient | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      auditClientRef.current = createAuditClient({
        baseUrl,
        userId: userId || "anonymous",
        includeGeo: includeGeo ?? true,
        clientDbUrl,
        onError:
          onError ||
          ((error) => {
            console.error("Audit tracking error:", error);
          }),
      });
    }

    return () => {
      if (auditClientRef.current) {
        auditClientRef.current.cleanup();
        auditClientRef.current = null;
      }
    };
  }, [baseUrl, userId, includeGeo, clientDbUrl]);

  const track = async (route: string, duration: number) => {
    if (auditClientRef.current) {
      return await auditClientRef.current.track({ route, duration });
    }
  };

  return (
    <AuditContext.Provider value={{ track }}>{children}</AuditContext.Provider>
  );
}

export function useAuditContext() {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error("useAuditContext must be used within an AuditProvider");
  }
  return context;
}
```

### 3. Layout Integration

**File: `app/layout.tsx` (App Router)**

```typescript
"use client";

import { useEffect } from "react";
import { createAuditClient } from "triostack-audit-sdk";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const auditClient = createAuditClient({
      baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
      userId: "user123", // Replace with actual user ID
      includeGeo: true,
      onError: (error) => {
        console.error("Audit tracking error:", error);
      },
    });

    return () => {
      auditClient.cleanup();
    };
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**File: `pages/_app.tsx` (Pages Router)**

```typescript
import { useEffect } from "react";
import { createAuditClient } from "triostack-audit-sdk";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const auditClient = createAuditClient({
      baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
      userId: "user123", // Replace with actual user ID
      includeGeo: true,
      onError: (error) => {
        console.error("Audit tracking error:", error);
      },
    });

    return () => {
      auditClient.cleanup();
    };
  }, []);

  return <Component {...pageProps} />;
}
```

### 4. Middleware Integration (Advanced)

**File: `middleware.ts`**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Add audit headers for server-side tracking
  const response = NextResponse.next();

  response.headers.set("x-audit-route", request.nextUrl.pathname);
  response.headers.set("x-audit-timestamp", new Date().toISOString());

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

## 🎯 Usage Examples

### Using Custom Hook

```typescript
// In any component
import { useAudit } from "@/hooks/useAudit";

export default function Dashboard() {
  const { track } = useAudit({
    baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
    userId: "user123",
  });

  const handleCustomAction = async () => {
    // Manual tracking
    await track("/dashboard/action", 30);
  };

  return (
    <div>
      <button onClick={handleCustomAction}>Custom Action</button>
    </div>
  );
}
```

### Using Context Provider

```typescript
// In _app.tsx or layout.tsx
import { AuditProvider } from "@/contexts/AuditContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuditProvider
      baseUrl={process.env.NEXT_PUBLIC_AUDIT_API_URL!}
      userId="user123"
    >
      <Component {...pageProps} />
    </AuditProvider>
  );
}

// In any component
import { useAuditContext } from "@/contexts/AuditContext";

export default function Profile() {
  const { track } = useAuditContext();

  const handleProfileUpdate = async () => {
    await track("/profile/update", 45);
  };

  return (
    <div>
      <button onClick={handleProfileUpdate}>Update Profile</button>
    </div>
  );
}
```

## 🔧 Configuration Options

### Environment Variables

```env
# Required
NEXT_PUBLIC_AUDIT_API_URL=https://your-audit-api.com

# Optional
NEXT_PUBLIC_AUDIT_CLIENT_DB_URL=https://your-client-db.com/audit
NEXT_PUBLIC_ENABLE_AUDIT=true
NEXT_PUBLIC_AUDIT_INCLUDE_GEO=true
```

### TypeScript Configuration

**File: `types/audit.d.ts`**

```typescript
declare module "triostack-audit-sdk" {
  export interface AuditClient {
    track(params: { route: string; duration: number }): Promise<any>;
    cleanup(): void;
  }

  export interface AuditClientOptions {
    baseUrl: string;
    clientDbUrl?: string;
    includeGeo?: boolean;
    userId?: string;
    onError?: (error: Error) => void;
  }

  export function createAuditClient(options: AuditClientOptions): AuditClient;
}
```

## 🚀 Best Practices

### 1. User Authentication Integration

```typescript
// With NextAuth.js
import { useSession } from "next-auth/react";

export function useAuditWithAuth() {
  const { data: session } = useSession();

  const { track } = useAudit({
    baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
    userId: session?.user?.id || "anonymous",
  });

  return { track };
}
```

### 2. Error Handling

```typescript
const { track } = useAudit({
  baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
  onError: (error) => {
    // Send to error reporting service
    console.error("Audit error:", error);

    // Optionally disable audit on repeated errors
    if (error.message.includes("Network")) {
      // Handle network errors
    }
  },
});
```

### 3. Development vs Production

```typescript
const isDevelopment = process.env.NODE_ENV === "development";
const enableAudit = process.env.NEXT_PUBLIC_ENABLE_AUDIT === "true";

const { track } = useAudit({
  baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
  // Disable in development if needed
  onError: isDevelopment
    ? console.error
    : (error) => {
        // Production error handling
      },
});
```

## 🔍 Troubleshooting

### Common Issues

1. **SSR Errors**

   ```typescript
   // Always check for window object
   if (typeof window !== "undefined") {
     // Initialize audit client
   }
   ```

2. **Memory Leaks**

   ```typescript
   // Always cleanup in useEffect
   useEffect(() => {
     const client = createAuditClient(options);
     return () => client.cleanup();
   }, []);
   ```

3. **Route Changes Not Tracked**

   ```typescript
   // Ensure you're using Next.js router
   import { useRouter } from "next/router";

   const router = useRouter();
   // Audit client will automatically track route changes
   ```

### Debug Mode

```typescript
const { track } = useAudit({
  baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
  onError: (error) => {
    if (process.env.NODE_ENV === "development") {
      console.log("Audit Debug:", error);
    }
  },
});
```

## 📊 Analytics Integration

### With Google Analytics

```typescript
import { useAudit } from "@/hooks/useAudit";

export function useAuditWithGA() {
  const { track } = useAudit({
    baseUrl: process.env.NEXT_PUBLIC_AUDIT_API_URL!,
  });

  const trackWithGA = async (route: string, duration: number) => {
    // Track in audit system
    await track(route, duration);

    // Track in Google Analytics
    if (typeof gtag !== "undefined") {
      gtag("event", "page_view", {
        page_title: route,
        page_location: window.location.href,
      });
    }
  };

  return { track: trackWithGA };
}
```

## 🎯 Complete Project Structure

```
your-nextjs-app/
├── app/                    # App Router
│   ├── layout.tsx         # Root layout with audit
│   └── page.tsx
├── hooks/
│   └── useAudit.ts        # Custom audit hook
├── contexts/
│   └── AuditContext.tsx   # Audit context provider
├── types/
│   └── audit.d.ts         # TypeScript definitions
├── middleware.ts          # Audit middleware
├── .env.local            # Environment variables
└── package.json
```

This implementation plan provides a complete guide for integrating the Triostack Audit SDK into any Next.js application with multiple options for different complexity levels.
