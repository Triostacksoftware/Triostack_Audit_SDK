# How to Test the Triostack Audit SDK

This guide shows you how to test the audit SDK using the examples in this directory.

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
cd test-examples
npm install
```

### Step 2: Start the Test Environment
```bash
# Option A: Use the startup script (recommended)
./start-testing.sh

# Option B: Start manually
npm run dev
```

### Step 3: Test the SDK
```bash
# Option A: Run the demo (recommended for first time)
npm run demo

# Option B: Use the web interface
# Open test-examples/client-test.html in your browser

# Option C: Run automated tests
npm run curl
```

## 📁 What Each File Does

| File | Purpose | How to Use |
|------|---------|------------|
| `server-test.js` | Express server with audit middleware | `npm run start` |
| `mock-audit-server.js` | Receives and displays audit events | `npm run audit` |
| `client-test.html` | Web interface for testing | Open in browser |
| `curl-test.js` | Automated test script | `npm run curl` |
| `demo.js` | Guided demo with examples | `npm run demo` |
| `quick-test.js` | Basic functionality test | `npm run quick` |
| `start-testing.sh` | One-click startup script | `./start-testing.sh` |

## 🎯 Testing Scenarios

### 1. Basic Functionality Test
```bash
npm run quick
```
Tests if the SDK can be imported and basic functions work.

### 2. Interactive Demo
```bash
npm run demo
```
Runs a guided demo showing different types of requests and their audit events.

### 3. Web Interface Testing
1. Start servers: `npm run dev`
2. Open `client-test.html` in your browser
3. Click buttons to test different endpoints
4. Watch real-time audit events in the console

### 4. Automated Testing
```bash
npm run curl
```
Runs comprehensive automated tests with detailed reporting.

### 5. Bulk Testing
```bash
# Run 20 requests
node curl-test.js bulk 20

# Or use the web interface bulk testing feature
```

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
📱 User Agent: Mozilla/5.0...
📊 Status Code: 200
📍 IP: 127.0.0.1
🎯 Session ID: 550e8400-e29b-41d4-a716-446655440000
```

### Web Interface Features
- Real-time server status monitoring
- Individual endpoint testing
- Bulk request testing
- Audit event viewing and management
- Performance metrics

## 🔧 Configuration Options

### Server Configuration (`server-test.js`)
```javascript
const auditServer = createAuditServer({
  dbUrl: 'http://localhost:3002/audit', // Where to send audit events
  userIdHeader: 'x-user-id',            // Header for user ID
  enableGeo: true,                      // Enable geolocation
  onError: (err) => console.error(err)  // Error handler
});
```

### Test Endpoints Available
- `GET /` - Simple home page
- `GET /api/users` - Returns user list (100ms delay)
- `POST /api/login` - Login endpoint
- `GET /api/slow` - Slow endpoint (2 second delay)
- `GET /api/manual-track` - Manual audit tracking
- `GET /api/error` - Error endpoint (500 status)

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the ports
   lsof -i :3001
   lsof -i :3002
   ```

2. **Servers Not Starting**
   ```bash
   # Check if dependencies are installed
   npm install
   
   # Check Node.js version (needs 14+)
   node --version
   ```

3. **No Audit Events Appearing**
   - Make sure both servers are running
   - Check console for error messages
   - Verify the audit server URL in `server-test.js`

### Debug Mode
Add this to see detailed error information:
```javascript
onError: (err) => {
  console.error('🔍 DEBUG - Audit Error:', err);
  console.error('Stack:', err.stack);
}
```

## 🎉 Success Indicators

You'll know everything is working when you see:

1. ✅ Both servers start without errors
2. ✅ Audit events appear in the console
3. ✅ Web interface shows server status as "Online"
4. ✅ Demo script completes successfully
5. ✅ Bulk tests generate multiple audit events

## 📈 Performance Testing

The test environment can help you measure:
- **Response Times**: Each request shows duration
- **Throughput**: Bulk testing with multiple requests
- **Error Rates**: Failed requests and handling
- **Geolocation**: IP-based location detection
- **Memory Usage**: Event storage and cleanup

## 🔗 Next Steps

After successful testing:

1. **Integrate into Your App**: Use patterns from `server-test.js`
2. **Customize Configuration**: Modify settings for your needs
3. **Set Up Production**: Replace mock server with real audit service
4. **Monitor Performance**: Use metrics to optimize your app

## 📚 Related Files

- `../README.md` - Main SDK documentation
- `../NEXTJS_IMPLEMENTATION_GUIDE.md` - Next.js integration guide
- `../PRODUCTION_DEPLOYMENT_GUIDE.md` - Production setup guide
