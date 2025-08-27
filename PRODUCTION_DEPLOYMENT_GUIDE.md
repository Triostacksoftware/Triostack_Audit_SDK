# Production Deployment Guide - Triostack Audit SDK

## 🚀 Server-Side Deployment Best Practices

This guide covers deploying the **server-side** Triostack Audit SDK in production environments.

## 📋 Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Production Setup](#production-setup)
3. [Database Integration](#database-integration)
4. [Performance Optimization](#performance-optimization)
5. [Monitoring & Debugging](#monitoring--debugging)
6. [Troubleshooting](#troubleshooting)

## ⚙️ Environment Configuration

### **Production Environment Variables**

```env
# .env.production
AUDIT_DB_URL=https://api.yourdomain.com/audit-logs
AUDIT_USER_ID_HEADER=x-user-id
AUDIT_ENABLE_GEO=true
NODE_ENV=production
AUDIT_LOG_LEVEL=warn
```

### **Development Environment Variables**

```env
# .env.development
AUDIT_DB_URL=http://localhost:3000/api/audit-logs
AUDIT_USER_ID_HEADER=x-user-id
AUDIT_ENABLE_GEO=false
NODE_ENV=development
AUDIT_LOG_LEVEL=debug
```

## 🚀 Production Setup

### **1. Production-Ready API Route**

```javascript
// app/api/audit-logs/route.js
import { createAuditServer } from 'triostack-audit-sdk';

const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  userIdHeader: process.env.AUDIT_USER_ID_HEADER || 'x-user-id',
  enableGeo: process.env.AUDIT_ENABLE_GEO === 'true',
  onError: (err) => {
    // Production error handling
    if (process.env.NODE_ENV === 'production') {
      console.warn('Audit error:', err.message);
      // Send to error reporting service (e.g., Sentry)
      // captureException(err);
    } else {
      console.error('Audit error:', err);
    }
  }
});

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.userId || !data.route) {
      return Response.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Track audit event
    await auditServer.track(request, data);
    
    return Response.json({ success: true });
  } catch (error) {
    // Graceful error handling - don't break the application
    console.warn('Audit API error:', error.message);
    return Response.json(
      { success: false, message: 'Audit tracking failed' },
      { status: 500 }
    );
  }
}
```

### **2. Health Check Endpoint**

```javascript
// app/api/audit/health/route.js
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV,
    auditEnabled: !!process.env.AUDIT_DB_URL
  });
}
```

### **3. Production Middleware**

```javascript
// middleware.js
import { NextResponse } from 'next/server';
import { createAuditServer } from 'triostack-audit-sdk';

const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  userIdHeader: process.env.AUDIT_USER_ID_HEADER || 'x-user-id',
  enableGeo: process.env.AUDIT_ENABLE_GEO === 'true',
  onError: (err) => {
    // Silent error handling for production
    if (process.env.NODE_ENV === 'production') {
      console.warn('Audit middleware error:', err.message);
    }
  }
});

export function middleware(request) {
  // Only track API routes in production
  if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/api/')) {
    const startTime = Date.now();
    
    const response = NextResponse.next();
    response.headers.set('x-audit-start-time', startTime.toString());
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
```

## 🗄️ Database Integration

### **1. MongoDB Integration**

```javascript
// lib/auditDatabase.js
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

export async function saveAuditToMongoDB(auditData) {
  try {
    await client.connect();
    const db = client.db('audit');
    const collection = db.collection('audit_logs');
    
    // Add timestamp and index
    const document = {
      ...auditData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await collection.insertOne(document);
    return { success: true };
  } catch (error) {
    console.error('MongoDB save error:', error);
    return { success: false, error: error.message };
  }
}

// app/api/audit-logs/route.js
import { saveAuditToMongoDB } from '@/lib/auditDatabase';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Save to MongoDB
    const result = await saveAuditToMongoDB(data);
    
    if (result.success) {
      return Response.json({ success: true });
    } else {
      return Response.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### **2. PostgreSQL Integration**

```javascript
// lib/auditDatabase.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function saveAuditToPostgreSQL(auditData) {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO audit_logs (
        session_id, timestamp, ip, city, region, country,
        latitude, longitude, user_agent, user_id, route,
        method, status_code, duration, request_size, response_size,
        event, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `;
    
    const values = [
      auditData.sessionId,
      auditData.timestamp,
      auditData.ip,
      auditData.city,
      auditData.region,
      auditData.country,
      auditData.latitude,
      auditData.longitude,
      auditData.userAgent,
      auditData.userId,
      auditData.route,
      auditData.method,
      auditData.statusCode,
      auditData.duration,
      auditData.requestSize,
      auditData.responseSize,
      auditData.event || null,
      JSON.stringify(auditData.metadata || {})
    ];
    
    await client.query(query, values);
    return { success: true };
  } catch (error) {
    console.error('PostgreSQL save error:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
```

### **3. External API Integration**

```javascript
// lib/auditAPI.js
export async function sendToExternalAPI(auditData) {
  try {
    const response = await fetch(process.env.AUDIT_DB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AUDIT_API_KEY}`,
      },
      body: JSON.stringify(auditData),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('External API error:', error);
    return { success: false, error: error.message };
  }
}
```

## ⚡ Performance Optimization

### **1. Async Processing**

```javascript
// app/api/audit-logs/route.js
export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate quickly
    if (!data.userId || !data.route) {
      return Response.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Process audit asynchronously - don't wait for completion
    auditServer.track(request, data).catch(err => {
      console.warn('Async audit error:', err.message);
    });
    
    // Return immediately
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### **2. Batch Processing**

```javascript
// lib/auditBatch.js
let auditQueue = [];
let batchTimeout = null;

export function queueAuditEvent(auditData) {
  auditQueue.push(auditData);
  
  if (auditQueue.length >= 10) {
    processBatch();
  } else if (!batchTimeout) {
    batchTimeout = setTimeout(processBatch, 5000); // Process after 5 seconds
  }
}

async function processBatch() {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }
  
  if (auditQueue.length === 0) return;
  
  const batch = auditQueue.splice(0);
  
  try {
    // Send batch to database
    await saveAuditBatch(batch);
  } catch (error) {
    console.error('Batch processing error:', error);
  }
}
```

## 📊 Monitoring & Debugging

### **1. Audit Dashboard**

```javascript
// app/api/audit/stats/route.js
export async function GET() {
  try {
    // Get audit statistics
    const stats = await getAuditStats();
    
    return Response.json({
      success: true,
      stats: {
        totalEvents: stats.total,
        eventsToday: stats.today,
        topRoutes: stats.topRoutes,
        averageResponseTime: stats.avgResponseTime,
        errorRate: stats.errorRate
      }
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### **2. Logging Configuration**

```javascript
// lib/auditLogger.js
export function createAuditLogger() {
  const logLevel = process.env.AUDIT_LOG_LEVEL || 'info';
  
  return {
    info: (message, data) => {
      if (['info', 'warn', 'error'].includes(logLevel)) {
        console.log(`[AUDIT INFO] ${message}`, data);
      }
    },
    warn: (message, data) => {
      if (['warn', 'error'].includes(logLevel)) {
        console.warn(`[AUDIT WARN] ${message}`, data);
      }
    },
    error: (message, data) => {
      if (['error'].includes(logLevel)) {
        console.error(`[AUDIT ERROR] ${message}`, data);
      }
    }
  };
}
```

## 🔧 Troubleshooting

### **Common Issues**

#### **1. "dbUrl is required" Error**
```javascript
// Check environment variables
console.log('Environment check:', {
  AUDIT_DB_URL: process.env.AUDIT_DB_URL,
  NODE_ENV: process.env.NODE_ENV
});
```

#### **2. Database Connection Issues**
```javascript
// Test database connection
export async function GET() {
  try {
    await testDatabaseConnection();
    return Response.json({ status: 'connected' });
  } catch (error) {
    return Response.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
```

#### **3. Performance Issues**
```javascript
// Monitor audit processing time
const startTime = Date.now();
await auditServer.track(request, data);
const processingTime = Date.now() - startTime;

if (processingTime > 1000) {
  console.warn(`Slow audit processing: ${processingTime}ms`);
}
```

### **Debug Mode**

```javascript
// Enable debug logging in development
const auditServer = createAuditServer({
  dbUrl: process.env.AUDIT_DB_URL,
  onError: (err) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Audit Debug:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn('Audit error:', err.message);
    }
  }
});
```

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Error handling implemented
- [ ] Performance monitoring enabled
- [ ] Health check endpoint working
- [ ] Logging configured
- [ ] Security headers set
- [ ] Rate limiting implemented (if needed)
- [ ] Backup strategy in place

This server-side approach provides robust, scalable audit logging for production environments! 🚀
