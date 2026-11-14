const express = require("express");
const router = express.Router();
const { db } = require("../db");

// Helper: validate that an ID parameter is a positive integer
function isValidId(id) {
  const num = Number(id);
  return Number.isInteger(num) && num > 0;
}

// Helper: validate that a value is a non-empty string
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

// GET /actors - Get all actors
router.get("/", (req, res) => {
  const sql = "SELECT * FROM actors";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve actors" });
    }
    res.status(200).json(rows);
  });
});

// GET /actors/:id - Get one actor by ID
router.get("/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid actor ID" });
  }

  const sql = "SELECT * FROM actors WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve actor" });
    }
    if (!row) {
      return res.status(404).json({ error: "Actor not found" });
    }
    res.status(200).json(row);
  });
});

// POST /actors - Add a new actor
router.post("/", (req, res) => {
  const { name } = req.body;

  // Validation: name must be a non-empty string
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "Actor name is required" });
  }

  const trimmedName = name.trim();
  const sql = "INSERT INTO actors (name) VALUES (?)";
  db.run(sql, [trimmedName], function (err) {
    if (err) {
      return res.status(500).json({ error: "Failed to add actor" });
    }
    res.status(201).json({ id: this.lastID, name: trimmedName });
  });
});

// PUT /actors/:id - Update an actor
router.put("/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid actor ID" });
  }

  const { name } = req.body;

  // Validation: name must be a non-empty string
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "Actor name is required" });
  }

  const trimmedName = name.trim();

  // Check if the actor exists
  const checkSql = "SELECT * FROM actors WHERE id = ?";
  db.get(checkSql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to check actor" });
    }
    if (!row) {
      return res.status(404).json({ error: "Actor not found" });
    }

    const updateSql = "UPDATE actors SET name = ? WHERE id = ?";
    db.run(updateSql, [trimmedName, req.params.id], function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to update actor" });
      }
      res.status(200).json({ id: parseInt(req.params.id), name: trimmedName });
    });
  });
});

// DELETE /actors/:id - Delete an actor
router.delete("/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid actor ID" });
  }

  // Check if the actor exists
  const checkSql = "SELECT * FROM actors WHERE id = ?";
  db.get(checkSql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to check actor" });
    }
    if (!row) {
      return res.status(404).json({ error: "Actor not found" });
    }

    const deleteSql = "DELETE FROM actors WHERE id = ?";
    db.run(deleteSql, [req.params.id], function (err) {
      if (err) {
        // Handle foreign key constraint error (actor referenced in hires)
        if (err.message.includes("FOREIGN KEY")) {
          return res.status(400).json({ error: "Cannot delete actor. It is referenced in hire records" });
        }
        return res.status(500).json({ error: "Failed to delete actor" });
      }
      res.status(204).send();
    });
  });
});

module.exports = router;
