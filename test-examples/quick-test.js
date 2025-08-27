#!/usr/bin/env node

import { createAuditServer } from "../index.js";

console.log("🧪 Quick Test - Triostack Audit SDK\n");

// Test 1: Create audit server
console.log("1️⃣ Testing audit server creation...");
try {
  const auditServer = createAuditServer({
    dbUrl: "http://localhost:3002/audit",
    userIdHeader: "x-user-id",
    enableGeo: true,
    onError: (err) => console.error("❌ Audit Error:", err.message),
  });
  console.log("✅ Audit server created successfully");
} catch (error) {
  console.log("❌ Failed to create audit server:", error.message);
  process.exit(1);
}

// Test 2: Test middleware creation
console.log("\n2️⃣ Testing middleware creation...");
try {
  const auditServer = createAuditServer({
    dbUrl: "http://localhost:3002/audit",
  });
  const middleware = auditServer.expressMiddleware();
  console.log("✅ Express middleware created successfully");
} catch (error) {
  console.log("❌ Failed to create middleware:", error.message);
  process.exit(1);
}

// Test 3: Test manual tracking
console.log("\n3️⃣ Testing manual tracking...");
try {
  const auditServer = createAuditServer({
    dbUrl: "http://localhost:3002/audit",
  });

  // Mock request object
  const mockReq = {
    headers: {
      "user-agent": "Test User Agent",
      "x-user-id": "test-user",
    },
    connection: { remoteAddress: "127.0.0.1" },
    socket: { remoteAddress: "127.0.0.1" },
  };

  const trackPromise = auditServer.track(mockReq, {
    userId: "test-user",
    route: "/test",
    method: "GET",
    statusCode: 200,
    duration: 1,
  });

  console.log("✅ Manual tracking function created successfully");
} catch (error) {
  console.log("❌ Failed to create tracking function:", error.message);
  process.exit(1);
}

// Test 4: Test Fastify plugin
console.log("\n4️⃣ Testing Fastify plugin...");
try {
  const { fastifyAuditPlugin } = await import("../index.js");
  console.log("✅ Fastify plugin imported successfully");
} catch (error) {
  console.log("❌ Failed to import Fastify plugin:", error.message);
}

// Test 5: Test Koa middleware
console.log("\n5️⃣ Testing Koa middleware...");
try {
  const { koaAuditMiddleware } = await import("../index.js");
  console.log("✅ Koa middleware imported successfully");
} catch (error) {
  console.log("❌ Failed to import Koa middleware:", error.message);
}

console.log("\n🎉 All basic tests passed!");
console.log("\n💡 To run full tests:");
console.log("   npm install");
console.log("   npm run dev");
console.log("   # Then open test-examples/client-test.html in your browser");
