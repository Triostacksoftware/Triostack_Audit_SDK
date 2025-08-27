#!/usr/bin/env node

import fetch from 'node-fetch';

console.log('🎬 Triostack Audit SDK Demo');
console.log('===========================\n');

const SERVER_URL = 'http://localhost:3001';
const AUDIT_URL = 'http://localhost:3002';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': options.userId || 'demo-user',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    return { status: 0, ok: false, error: error.message };
  }
}

async function checkServers() {
  console.log('🔍 Checking if servers are running...');
  
  const serverCheck = await makeRequest(`${SERVER_URL}/`);
  const auditCheck = await makeRequest(`${AUDIT_URL}/health`);
  
  if (!serverCheck.ok) {
    console.log('❌ Test server is not running. Please start it first:');
    console.log('   npm run start');
    return false;
  }
  
  if (!auditCheck.ok) {
    console.log('❌ Audit server is not running. Please start it first:');
    console.log('   npm run audit');
    return false;
  }
  
  console.log('✅ Both servers are running!\n');
  return true;
}

async function runDemo() {
  if (!(await checkServers())) {
    return;
  }
  
  console.log('🎯 Starting demo...\n');
  
  // Demo 1: Basic requests
  console.log('1️⃣ Demo: Basic API Requests');
  console.log('───────────────────────────');
  
  const users = ['alice', 'bob', 'charlie', 'admin'];
  const endpoints = ['/', '/api/users', '/api/manual-track'];
  
  for (let i = 0; i < 6; i++) {
    const user = users[i % users.length];
    const endpoint = endpoints[i % endpoints.length];
    
    console.log(`📡 ${user} → ${endpoint}`);
    const result = await makeRequest(`${SERVER_URL}${endpoint}`, { userId: user });
    
    if (result.ok) {
      console.log(`   ✅ Success (${result.status})`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    
    await wait(500); // Wait between requests
  }
  
  // Demo 2: Slow endpoint
  console.log('\n2️⃣ Demo: Slow Endpoint (2 seconds)');
  console.log('──────────────────────────────────');
  console.log('⏳ This will take 2 seconds...');
  
  const startTime = Date.now();
  const slowResult = await makeRequest(`${SERVER_URL}/api/slow`, { userId: 'slow-user' });
  const duration = (Date.now() - startTime) / 1000;
  
  if (slowResult.ok) {
    console.log(`✅ Slow request completed in ${duration.toFixed(1)}s`);
  } else {
    console.log(`❌ Slow request failed: ${slowResult.error}`);
  }
  
  // Demo 3: Error handling
  console.log('\n3️⃣ Demo: Error Handling');
  console.log('───────────────────────');
  
  const errorResult = await makeRequest(`${SERVER_URL}/api/error`, { userId: 'error-user' });
  console.log(`📊 Error endpoint returned: ${errorResult.status}`);
  
  // Demo 4: Login simulation
  console.log('\n4️⃣ Demo: Login Simulation');
  console.log('─────────────────────────');
  
  const loginResult = await makeRequest(`${SERVER_URL}/api/login`, {
    method: 'POST',
    userId: 'login-user',
    body: JSON.stringify({ username: 'demo', password: 'test123' })
  });
  
  if (loginResult.ok) {
    console.log('✅ Login simulation completed');
  } else {
    console.log(`❌ Login failed: ${loginResult.error}`);
  }
  
  // Demo 5: Bulk requests
  console.log('\n5️⃣ Demo: Bulk Requests (10 requests)');
  console.log('─────────────────────────────────────');
  
  const bulkResults = { success: 0, error: 0 };
  
  for (let i = 0; i < 10; i++) {
    const user = `bulk-user-${i}`;
    const endpoint = endpoints[i % endpoints.length];
    
    const result = await makeRequest(`${SERVER_URL}${endpoint}`, { userId: user });
    
    if (result.ok) {
      bulkResults.success++;
      process.stdout.write('✅');
    } else {
      bulkResults.error++;
      process.stdout.write('❌');
    }
    
    await wait(200);
  }
  
  console.log(`\n📊 Bulk Results: ${bulkResults.success} success, ${bulkResults.error} errors`);
  
  // Demo 6: View audit events
  console.log('\n6️⃣ Demo: Viewing Audit Events');
  console.log('─────────────────────────────');
  
  await wait(1000); // Wait for all events to be processed
  
  const eventsResult = await makeRequest(`${AUDIT_URL}/audit`);
  
  if (eventsResult.ok) {
    const { totalEvents, events } = eventsResult.data;
    console.log(`📈 Total audit events: ${totalEvents}`);
    
    if (events.length > 0) {
      console.log('\n📊 Recent Events:');
      events.slice(-5).forEach((event, index) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        console.log(`   ${index + 1}. ${time} - ${event.route} (${event.userId}) - ${event.duration}s`);
      });
    }
  } else {
    console.log(`❌ Failed to fetch events: ${eventsResult.error}`);
  }
  
  console.log('\n🎉 Demo completed!');
  console.log('\n💡 What happened:');
  console.log('   • All requests were automatically audited');
  console.log('   • Each request captured user ID, route, duration, and geolocation');
  console.log('   • Audit events were sent to the mock audit server');
  console.log('   • You can view all events at http://localhost:3002/audit');
  console.log('\n🔗 Next steps:');
  console.log('   • Open client-test.html for interactive testing');
  console.log('   • Run "node curl-test.js" for automated testing');
  console.log('   • Check the console output for detailed audit logs');
}

// Run the demo
runDemo().catch(console.error);
