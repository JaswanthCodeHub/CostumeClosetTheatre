const express = require("express");
const { db, initializeDatabase } = require("./db");

// Import route modules
const actorRoutes = require("./routes/actorRoutes");
const costumeRoutes = require("./routes/costumeRoutes");
const hireRoutes = require("./routes/hireRoutes");

const app = express();
const PORT = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Register route modules
app.use("/actors", actorRoutes);
app.use("/costumes", costumeRoutes);
app.use("/hires", hireRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to CostumeCloset Theatre API" });
});

// Handle 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize the database FIRST, then start the server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CostumeCloset Theatre server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err.message);
    process.exit(1);
  });
