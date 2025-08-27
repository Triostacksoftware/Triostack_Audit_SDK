# Triostack Audit SDK - Test Examples

This directory contains comprehensive test examples for the Triostack Audit SDK, demonstrating both server-side and client-side usage.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd test-examples
npm install
```

### 2. Start the Test Environment

```bash
# Start both servers (audit server + test server)
npm run dev

# Or start them separately:
npm run audit    # Start mock audit server (port 3002)
npm run start    # Start test server (port 3001)
```

### 3. Run Tests

```bash
# Run automated tests
npm run curl

# Or use the visual interface
# Open test-examples/client-test.html in your browser
```

## 📁 Test Components

### 1. `server-test.js` - Main Test Server
- Express server with audit middleware
- Multiple test endpoints with different behaviors
- Demonstrates automatic and manual audit tracking
- Runs on port 3001

**Test Endpoints:**
- `GET /` - Simple home page
- `GET /api/users` - Returns user list (100ms delay)
- `POST /api/login` - Login endpoint with user ID header
- `GET /api/slow` - Slow endpoint (2 second delay)
- `GET /api/manual-track` - Manual audit tracking example
- `GET /api/error` - Error endpoint (500 status)

### 2. `mock-audit-server.js` - Mock Audit Receiver
- Receives and displays audit events
- Stores events in memory for testing
- Provides management endpoints
- Runs on port 3002

**Endpoints:**
- `POST /audit` - Receive audit events
- `GET /audit` - View all stored events
- `DELETE /audit` - Clear all events
- `GET /health` - Health check

### 3. `client-test.html` - Visual Test Interface
- Beautiful web interface for testing
- Real-time status monitoring
- Bulk testing capabilities
- Event visualization

### 4. `curl-test.js` - Automated Test Script
- Node.js script for automated testing
- Command-line interface
- Bulk testing capabilities
- Detailed reporting

## 🧪 Testing Scenarios

### Basic Functionality
```bash
# Test individual endpoints
npm run curl

# Check audit server health
node curl-test.js health

# Clear audit events
node curl-test.js clear
```

### Bulk Testing
```bash
# Run 20 requests
node curl-test.js bulk 20

# Or use the web interface for visual feedback
```

### Visual Testing
1. Open `client-test.html` in your browser
2. Click buttons to test different endpoints
3. Watch real-time audit events in the console
4. Use bulk testing for load simulation

## 📊 What You'll See

### Console Output (Mock Audit Server)
```
📊 AUDIT EVENT RECEIVED:
⏰ Time: 12/19/2023, 2:30:45 PM
👤 User ID: user-123
🛣️  Route: /api/users
📝 Method: GET
⏱️  Duration: 0s
🌍 Location: San Francisco, US
📱 User Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...
📊 Status Code: 200
📦 Request Size: 0 bytes
📦 Response Size: 45 bytes
📍 IP: 127.0.0.1
🎯 Session ID: 550e8400-e29b-41d4-a716-446655440000
──────────────────────────────────────────────────
```

### Audit Event Structure
Each audit event contains:
- **Session ID**: Unique identifier for the request
- **Timestamp**: When the event occurred
- **User ID**: From request headers or default
- **Route**: Requested endpoint
- **Method**: HTTP method used
- **Duration**: Response time in seconds
- **Geolocation**: City, region, country, coordinates
- **User Agent**: Browser/client information
- **Status Code**: HTTP response status
- **Request/Response Size**: Data transfer amounts
- **IP Address**: Client IP address

## 🔧 Configuration

### Environment Variables
The test servers use default configurations, but you can modify:

**Server Test (`server-test.js`):**
```javascript
const auditServer = createAuditServer({
  dbUrl: 'http://localhost:3002/audit', // Audit endpoint
  userIdHeader: 'x-user-id',            // User ID header
  enableGeo: true,                      // Enable geolocation
  onError: (err) => console.error(err)  // Error handler
});
```

**Mock Audit Server (`mock-audit-server.js`):**
- Port: 3002 (configurable)
- Memory storage (events lost on restart)
- JSON response format

## 🎯 Advanced Testing

### Custom User IDs
```bash
# Test with specific user ID
curl -H "x-user-id: admin-user" http://localhost:3001/api/users
```

### Performance Testing
```bash
# Run 100 requests to test performance
node curl-test.js bulk 100
```

### Error Scenarios
- Test `/api/error` endpoint for error handling
- Disconnect audit server to test failure scenarios
- Modify network conditions to test timeouts

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the ports
   lsof -i :3001
   lsof -i :3002
   
   # Kill processes if needed
   kill -9 <PID>
   ```

2. **CORS Issues (Web Interface)**
   - The mock audit server doesn't have CORS enabled
   - Use the curl test script for automated testing

3. **Audit Events Not Appearing**
   - Check if both servers are running
   - Verify the audit server URL in `server-test.js`
   - Check console for error messages

### Debug Mode
Enable detailed logging by modifying the error handler:
```javascript
onError: (err) => {
  console.error('🔍 DEBUG - Audit Error:', err);
  console.error('Stack:', err.stack);
}
```

## 📈 Performance Metrics

The test environment can help you measure:
- **Response Times**: Duration tracking for each request
- **Throughput**: Bulk testing with multiple concurrent requests
- **Error Rates**: Failed requests and error handling
- **Geolocation Accuracy**: IP-based location detection
- **Memory Usage**: Event storage and cleanup

## 🎉 Next Steps

After testing with these examples:

1. **Integrate into Your App**: Use the patterns shown in `server-test.js`
2. **Customize Configuration**: Modify audit settings for your needs
3. **Set Up Production**: Replace mock audit server with your actual audit service
4. **Monitor Performance**: Use the metrics to optimize your application

## 📚 Related Documentation

- [Main SDK Documentation](../README.md)
- [NextJS Implementation Guide](../NEXTJS_IMPLEMENTATION_GUIDE.md)
- [Production Deployment Guide](../PRODUCTION_DEPLOYMENT_GUIDE.md)
