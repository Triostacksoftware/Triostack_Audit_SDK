# Triostack Audit Client

A browser-based audit tracking client for monitoring user activity and route changes. This library automatically tracks page navigation, route changes, and user sessions with optional geolocation data.

## Features

- **Automatic Route Tracking**: Monitors browser navigation and route changes
- **Session Management**: Generates unique session IDs for user tracking
- **Geolocation Support**: Optional IP-based geolocation data
- **Dual Storage**: Send data to both audit API and client database
- **Memory Safe**: Proper cleanup of event listeners and history method restoration
- **Browser Compatibility**: Works with modern browsers and includes polyfills for older ones

## Installation

```bash
npm install triostack-audit-sdk
```

## Quick Start

```javascript
import { createAuditClient } from "triostack-audit-sdk";

const auditClient = createAuditClient({
  baseUrl: "https://your-audit-api.com",
  userId: "user123",
});

// Cleanup when done (e.g., on component unmount)
auditClient.cleanup();
```

## API Reference

### `createAuditClient(options: AuditClientOptions): AuditClient`

Creates and initializes an audit client instance.

#### Input Parameters

```typescript
interface AuditClientOptions {
  /** The base URL for your audit API endpoint (required) */
  baseUrl: string;

  /** URL for additional client-side database storage (optional) */
  clientDbUrl?: string;

  /** Whether to include geolocation data (optional, default: true) */
  includeGeo?: boolean;

  /** User identifier for tracking (optional, default: "anonymous") */
  userId?: string;

  /** Error handler function (optional) */
  onError?: (error: Error) => void;
}
```

#### Return Value

```typescript
interface AuditClient {
  /** Manually track a route change */
  track(params: TrackParams): Promise<AuditActivity>;

  /** Remove event listeners and restore original history methods */
  cleanup(): void;
}

interface TrackParams {
  /** The route path to track */
  route: string;

  /** Duration in seconds spent on the previous route */
  duration: number;
}

interface AuditActivity {
  /** User identifier */
  userId: string;

  /** Route path */
  route: string;

  /** Duration in seconds */
  duration: number;

  /** IP address */
  ip: string;

  /** City name */
  city: string;

  /** Region/state */
  region: string;

  /** Country name */
  country: string;

  /** ISO timestamp */
  timestamp: string;

  /** Unique session identifier */
  sessionId: string;
}
```

## Usage Examples

### Basic Configuration

```javascript
import { createAuditClient } from "triostack-audit-sdk";

const auditClient = createAuditClient({
  baseUrl: "https://your-audit-api.com",
  userId: "user123",
});

// Cleanup when done
auditClient.cleanup();
```

### Advanced Configuration

```javascript
import { createAuditClient } from "triostack-audit-sdk";

const auditClient = createAuditClient({
  baseUrl: "https://your-audit-api.com",
  clientDbUrl: "https://your-client-db.com/audit",
  includeGeo: true,
  userId: "user123",
  onError: (error) => {
    console.error("Audit tracking error:", error);
    // Send to your error reporting service
  },
});
```

### Manual Tracking

```javascript
// Manually track a specific route change
const activity = await auditClient.track({
  route: "/dashboard",
  duration: 120, // 2 minutes
});

console.log("Tracked activity:", activity);
```

### React Integration

```javascript
import { useEffect } from "react";
import { createAuditClient } from "triostack-audit-sdk";

function App() {
  useEffect(() => {
    const auditClient = createAuditClient({
      baseUrl: "https://your-audit-api.com",
      userId: "user123",
    });

    // Cleanup on component unmount
    return () => {
      auditClient.cleanup();
    };
  }, []);

  return <div>Your app content</div>;
}
```

### Vue.js Integration

```javascript
import { createAuditClient } from "triostack-audit-sdk";

export default {
  mounted() {
    this.auditClient = createAuditClient({
      baseUrl: "https://your-audit-api.com",
      userId: "user123",
    });
  },

  beforeUnmount() {
    if (this.auditClient) {
      this.auditClient.cleanup();
    }
  },
};
```

## Data Structure

The audit client automatically sends the following data structure to your endpoints:

```javascript
{
  userId: "user123",
  route: "/dashboard",
  duration: 45, // seconds spent on previous route
  ip: "192.168.1.1",
  city: "New York",
  region: "NY",
  country: "United States",
  timestamp: "2024-01-15T10:30:00.000Z",
  sessionId: "550e8400-e29b-41d4-a716-446655440000"
}
```

## Browser Support

| Browser | Version | Support                     |
| ------- | ------- | --------------------------- |
| Chrome  | 76+     | ✅ Full                     |
| Firefox | 69+     | ✅ Full                     |
| Safari  | 13+     | ✅ Full                     |
| Edge    | 79+     | ✅ Full                     |
| IE      | 11      | ⚠️ Partial (with polyfills) |

### Polyfills Included

- `crypto.randomUUID()` - Fallback for older browsers
- Custom events - For history method patching

## Error Handling

The library includes comprehensive error handling:

- **Network Failures**: Caught and reported via `onError` callback
- **Geolocation Failures**: Fall back to "unknown" values
- **Invalid API Responses**: Properly handled with descriptive errors
- **Memory Leaks**: Prevented through proper cleanup
- **Browser Compatibility**: Graceful degradation for unsupported features

### Error Types

```javascript
// Network errors
new Error("Failed to send to audit API: Network timeout");

// API errors
new Error("Audit API failed with status 500");

// Geolocation errors
new Error("Geo API failed");
```

## Security Considerations

- **HTTPS Only**: User data is sent via HTTPS POST requests
- **No Sensitive Data**: No sensitive information is logged by default
- **Secure Session IDs**: Randomly generated using crypto-safe methods
- **Trusted Geolocation**: Data obtained from trusted third-party service (ipapi.co)
- **No Local Storage**: No sensitive data stored locally

## Performance

- **Lightweight**: ~5.8kB minified
- **Non-blocking**: All operations are asynchronous
- **Memory Efficient**: Proper cleanup prevents memory leaks
- **Minimal Impact**: Low overhead on page performance

## Troubleshooting

### Common Issues

**Q: Not tracking route changes in my SPA?**
A: Make sure you're using the HTML5 History API (`pushState`, `replaceState`) or the library will only track `popstate` events.

**Q: Geolocation data showing "unknown"?**
A: Check your network connection and ensure `includeGeo` is set to `true`. The service may be blocked by ad blockers.

**Q: Memory leaks in long-running apps?**
A: Always call `cleanup()` when the component unmounts or the app is destroyed.

**Q: Errors in console about missing crypto.randomUUID?**
A: The library includes a polyfill, but ensure you're using a modern browser or the polyfill will be used automatically.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.
