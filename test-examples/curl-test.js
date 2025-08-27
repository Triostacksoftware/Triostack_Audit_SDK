import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3001';
const AUDIT_URL = 'http://localhost:3002';

// Test data
const testUsers = [
  'user-001',
  'user-002', 
  'user-003',
  'admin-user',
  'test-user'
];

const testRoutes = [
  '/',
  '/api/users',
  '/api/login',
  '/api/manual-track',
  '/api/slow',
  '/api/error'
];

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': options.userId || 'curl-test-user',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json().catch(() => ({}));
    
    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: {}
    };
  }
}

async function testServerEndpoints() {
  console.log('🚀 Testing Server Endpoints...\n');
  
  for (const route of testRoutes) {
    const method = route === '/api/login' ? 'POST' : 'GET';
    const userId = testUsers[Math.floor(Math.random() * testUsers.length)];
    
    console.log(`📡 ${method} ${route} (User: ${userId})`);
    
    const options = {
      method,
      userId
    };
    
    if (method === 'POST') {
      options.body = JSON.stringify({ 
        test: true, 
        timestamp: new Date().toISOString() 
      });
    }
    
    const result = await makeRequest(`${SERVER_URL}${route}`, options);
    
    if (result.ok) {
      console.log(`✅ Status: ${result.status} - Success`);
    } else {
      console.log(`❌ Status: ${result.status} - ${result.error || 'Failed'}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function testAuditServer() {
  console.log('\n📊 Testing Audit Server...\n');
  
  // Check health
  console.log('🏥 Checking audit server health...');
  const health = await makeRequest(`${AUDIT_URL}/health`);
  if (health.ok) {
    console.log(`✅ Health: ${health.data.status}`);
    console.log(`📈 Events received: ${health.data.eventsReceived}`);
  } else {
    console.log(`❌ Health check failed: ${health.error}`);
  }
  
  // Get all events
  console.log('\n📋 Fetching all audit events...');
  const events = await makeRequest(`${AUDIT_URL}/audit`);
  if (events.ok) {
    console.log(`✅ Found ${events.data.totalEvents} events`);
    
    if (events.data.events.length > 0) {
      console.log('\n📊 Recent Events:');
      events.data.events.slice(-3).forEach((event, index) => {
        console.log(`${index + 1}. ${event.route} - ${event.userId} - ${event.duration}s`);
      });
    }
  } else {
    console.log(`❌ Failed to fetch events: ${events.error}`);
  }
}

async function runBulkTest(count = 10) {
  console.log(`\n🔄 Running bulk test (${count} requests)...\n`);
  
  const results = { success: 0, error: 0 };
  
  for (let i = 0; i < count; i++) {
    const route = testRoutes[Math.floor(Math.random() * testRoutes.length)];
    const userId = testUsers[Math.floor(Math.random() * testUsers.length)];
    const method = route === '/api/login' ? 'POST' : 'GET';
    
    const options = {
      method,
      userId: `${userId}-${i}`
    };
    
    if (method === 'POST') {
      options.body = JSON.stringify({ bulk: true, index: i });
    }
    
    const result = await makeRequest(`${SERVER_URL}${route}`, options);
    
    if (result.ok) {
      results.success++;
      process.stdout.write('✅');
    } else {
      results.error++;
      process.stdout.write('❌');
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n\n📊 Bulk Test Results:`);
  console.log(`✅ Success: ${results.success}`);
  console.log(`❌ Errors: ${results.error}`);
  console.log(`📈 Total: ${results.success + results.error}`);
}

async function clearAuditEvents() {
  console.log('\n🗑️  Clearing audit events...');
  const result = await makeRequest(`${AUDIT_URL}/audit`, { method: 'DELETE' });
  
  if (result.ok) {
    console.log('✅ Audit events cleared');
  } else {
    console.log(`❌ Failed to clear events: ${result.error}`);
  }
}

async function main() {
  console.log('🔍 Triostack Audit SDK - Curl Test\n');
  console.log('=' .repeat(50));
  
  // Check if servers are running
  console.log('🔍 Checking server availability...');
  
  const serverCheck = await makeRequest(`${SERVER_URL}/`);
  const auditCheck = await makeRequest(`${AUDIT_URL}/health`);
  
  if (!serverCheck.ok) {
    console.log('❌ Main server is not running. Please start it first.');
    console.log('   Run: npm run start');
    return;
  }
  
  if (!auditCheck.ok) {
    console.log('❌ Audit server is not running. Please start it first.');
    console.log('   Run: npm run audit');
    return;
  }
  
  console.log('✅ Both servers are running!\n');
  
  // Run tests
  await testServerEndpoints();
  await testAuditServer();
  await runBulkTest(15);
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 All tests completed!');
  console.log('\n💡 Tips:');
  console.log('   - Open test-examples/client-test.html for a visual interface');
  console.log('   - Run "npm run dev" to start both servers');
  console.log('   - Check the console output for detailed audit logs');
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'clear':
    clearAuditEvents();
    break;
  case 'bulk':
    const count = parseInt(args[1]) || 10;
    runBulkTest(count);
    break;
  case 'health':
    testAuditServer();
    break;
  default:
    main();
}

export { makeRequest, testServerEndpoints, testAuditServer, runBulkTest, clearAuditEvents };
