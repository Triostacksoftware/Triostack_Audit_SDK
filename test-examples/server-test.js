import express from "express";
import { createAuditServer } from "../index.js";

const app = express();
const PORT = 3001;

// Create audit server instance
const auditServer = createAuditServer({
  dbUrl: "http://localhost:3002/audit", // Mock audit endpoint
  userIdHeader: "x-user-id",
  enableGeo: true,
  onError: (err) => {
    console.error("Audit Error:", err.message);
  },
});

// Use audit middleware
app.use(auditServer.expressMiddleware());

// Test routes
app.get("/", (req, res) => {
  res.json({ message: "Hello from audit test server!" });
});

app.get("/api/users", (req, res) => {
  // Simulate some processing time
  setTimeout(() => {
    res.json({ users: ["user1", "user2", "user3"] });
  }, 100);
});

app.post("/api/login", (req, res) => {
  // Set user ID in header for audit tracking
  res.setHeader("x-user-id", "user123");
  res.json({ success: true, userId: "user123" });
});

app.get("/api/slow", async (req, res) => {
  // Simulate slow endpoint
  await new Promise((resolve) => setTimeout(resolve, 2000));
  res.json({ message: "Slow response completed" });
});

// Manual tracking example
app.get("/api/manual-track", async (req, res) => {
  try {
    // Manual audit tracking
    const auditResult = await auditServer.track(req, {
      userId: "user456",
      route: "/api/manual-track",
      method: "GET",
      statusCode: 200,
      duration: 50,
      customData: "This was manually tracked",
    });

    res.json({
      message: "Manually tracked endpoint",
      auditResult,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error endpoint to test error handling
app.get("/api/error", (req, res) => {
  res.status(500).json({ error: "Test error endpoint" });
});

app.listen(PORT, () => {
  console.log(`🚀 Audit test server running on http://localhost:${PORT}`);
  console.log("📊 All requests will be automatically audited");
  console.log("🔍 Check the console for audit logs");
});

export default app;
