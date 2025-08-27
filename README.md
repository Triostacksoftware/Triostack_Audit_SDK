# Triostack Audit SDK

A server-side audit logging middleware for Node.js applications with Express, Fastify, and Koa support. Automatically tracks API requests, user activity, and provides geolocation data.

## Features

- **Automatic Request Logging**: Tracks all HTTP requests with timing and metadata
- **Geolocation Support**: IP-based geolocation using geoip-lite
- **Multi-Framework Support**: Express, Fastify, and Koa middleware
- **Rich Data Collection**: Request/response sizes, status codes, user agents
- **Flexible Configuration**: Customizable user ID headers and error handling
- **Performance Optimized**: Non-blocking async logging with timeouts

## Installation

```bash
npm install triostack-audit-sdk
```

## Quick Start

### Express.js

```javascript
import express from 'express';
import { createAuditServer } from 'triostack-audit-sdk';

const app = express();

// Create audit server
const auditServer = createAuditServer({
  dbUrl: 'https://your-api.com/audit-logs',
  userIdHeader: 'x-user-id', // Optional: custom header for user ID
  enableGeo: true, // Optional: enable geolocation
  onError: (err) => console.error('Audit error:', err) // Optional: error handler
});

// Use middleware
app.use(auditServer.expressMiddleware());

// Your routes
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
```

### Fastify

```javascript
import Fastify from 'fastify';
import { fastifyAuditPlugin } from 'triostack-audit-sdk';

const fastify = Fastify();

// Register audit plugin
await fastify.register(fastifyAuditPlugin, {
  dbUrl: 'https://your-api.com/audit-logs',
  userIdHeader: 'x-user-id',
  enableGeo: true
});

// Your routes
fastify.get('/api/users', async (request, reply) => {
  return { users: [] };
});

await fastify.listen({ port: 3000 });
```

### Koa

```javascript
import Koa from 'koa';
import { koaAuditMiddleware } from 'triostack-audit-sdk';

const app = new Koa();

// Use middleware
app.use(koaAuditMiddleware({
  dbUrl: 'https://your-api.com/audit-logs',
  userIdHeader: 'x-user-id',
  enableGeo: true
}));

// Your routes
app.use(async (ctx) => {
  ctx.body = { users: [] };
});

app.listen(3000);
```

## Manual Tracking

You can also manually track specific events:

```javascript
import { createAuditServer } from 'triostack-audit-sdk';

const auditServer = createAuditServer({
  dbUrl: 'https://your-api.com/audit-logs'
});

// Manual tracking
app.post('/api/login', async (req, res) => {
  try {
    const user = await authenticateUser(req.body);
    
    // Track successful login
    await auditServer.track(req, {
      userId: user.id,
      route: '/api/login',
      method: 'POST',
      statusCode: 200,
      duration: 150,
      event: 'user_login',
      metadata: {
        loginMethod: 'email',
        success: true
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    // Track failed login
    await auditServer.track(req, {
      userId: 'anonymous',
      route: '/api/login',
      method: 'POST',
      statusCode: 401,
      duration: 50,
      event: 'user_login_failed',
      metadata: {
        loginMethod: 'email',
        success: false,
        error: error.message
      }
    });
    
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

## Configuration Options

### createAuditServer(options)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dbUrl` | string | **required** | URL where audit logs will be sent |
| `userIdHeader` | string | `'x-user-id'` | HTTP header name for user ID |
| `enableGeo` | boolean | `true` | Enable IP-based geolocation |
| `onError` | function | `console.error` | Error handler function |

### Data Structure

The SDK sends this data structure to your endpoint:

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
  event: "api_request", // Optional for manual tracking
  metadata: {} // Optional for manual tracking
}
```

## API Endpoint Setup

Your audit endpoint should accept POST requests with the data structure above:

```javascript
// Example Express endpoint
app.post('/audit-logs', async (req, res) => {
  try {
    const auditData = req.body;
    
    // Validate required fields
    if (!auditData.userId || !auditData.route) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Save to database
    await saveToDatabase(auditData);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Audit save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Error Handling

The SDK includes comprehensive error handling:

```javascript
const auditServer = createAuditServer({
  dbUrl: 'https://your-api.com/audit-logs',
  onError: (error) => {
    // Custom error handling
    console.error('Audit failed:', error.message);
    
    // Send to error reporting service
    // sendToErrorReporting(error);
    
    // Don't break your application
  }
});
```

## Performance Considerations

- **Non-blocking**: All audit operations are asynchronous
- **Timeouts**: 10-second timeout for network requests
- **Error isolation**: Audit failures won't break your application
- **Minimal overhead**: Lightweight middleware with minimal performance impact

## Browser Support

This is a **server-side SDK** and does not run in browsers. For client-side tracking, consider using:

- Google Analytics
- Mixpanel
- Amplitude
- Custom client-side tracking

## License

MIT
