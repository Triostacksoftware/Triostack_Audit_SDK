import express from 'express';

const app = express();
const PORT = 3002;

// Store audit events in memory for testing
const auditEvents = [];

app.use(express.json());

// Endpoint to receive audit events
app.post('/audit', (req, res) => {
  const auditEvent = req.body;
  const timestamp = new Date().toLocaleString();
  
  // Store the event
  auditEvents.push({
    ...auditEvent,
    receivedAt: timestamp
  });
  
  // Log the event
  console.log('\n📊 AUDIT EVENT RECEIVED:');
  console.log('⏰ Time:', timestamp);
  console.log('👤 User ID:', auditEvent.userId);
  console.log('🛣️  Route:', auditEvent.route);
  console.log('📝 Method:', auditEvent.method);
  console.log('⏱️  Duration:', auditEvent.duration + 's');
  console.log('🌍 Location:', `${auditEvent.city}, ${auditEvent.country}`);
  console.log('📱 User Agent:', auditEvent.userAgent?.substring(0, 50) + '...');
  console.log('📊 Status Code:', auditEvent.statusCode);
  console.log('📦 Request Size:', auditEvent.requestSize + ' bytes');
  console.log('📦 Response Size:', auditEvent.responseSize + ' bytes');
  console.log('📍 IP:', auditEvent.ip);
  console.log('🎯 Session ID:', auditEvent.sessionId);
  console.log('─'.repeat(50));
  
  res.json({ success: true, message: 'Audit event logged' });
});

// Endpoint to view all audit events
app.get('/audit', (req, res) => {
  res.json({
    totalEvents: auditEvents.length,
    events: auditEvents
  });
});

// Endpoint to clear audit events
app.delete('/audit', (req, res) => {
  auditEvents.length = 0;
  res.json({ success: true, message: 'All audit events cleared' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    eventsReceived: auditEvents.length,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`📊 Mock audit server running on http://localhost:${PORT}`);
  console.log('📝 POST /audit - Receive audit events');
  console.log('👀 GET /audit - View all events');
  console.log('🗑️  DELETE /audit - Clear all events');
  console.log('❤️  GET /health - Health check');
});

export default app;
