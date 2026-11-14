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

// Helper function to validate a date string in YYYY-MM-DD format
function isValidDate(dateStr) {
  if (typeof dateStr !== "string") {
    return false;
  }

  // Check format using regex
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }

  // Check if it is a valid calendar date
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  // Month must be 1-12
  if (month < 1 || month > 12) {
    return false;
  }

  // Create a date object and check if it matches
  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

// GET /costumes/available?date=YYYY-MM-DD - Get costumes available on a date
// IMPORTANT: This route is defined BEFORE /costumes/:id to avoid route conflicts
router.get("/available", (req, res) => {
  const { date } = req.query;

  // Validate: date parameter is required
  if (!date) {
    return res.status(400).json({ error: "Date query parameter is required" });
  }

  // Validate: date format and calendar validity
  if (!isValidDate(date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }

  // Find costumes that are NOT hired out on the given date
  const sql = `
    SELECT * FROM costumes
    WHERE NOT EXISTS (
      SELECT 1 FROM hires
      WHERE hires.costume_id = costumes.id
      AND hires.start_date <= ?
      AND hires.end_date >= ?
    )
  `;
  db.all(sql, [date, date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve available costumes" });
    }
    res.status(200).json(rows);
  });
});

// GET /costumes - Get all costumes (with optional era query parameter)
router.get("/", (req, res) => {
  const { era } = req.query;

  if (era) {
    // Search costumes by era (case-insensitive)
    const sql = "SELECT * FROM costumes WHERE LOWER(era) = LOWER(?)";
    db.all(sql, [era], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to search costumes" });
      }
      res.status(200).json(rows);
    });
  } else {
    // Return all costumes
    const sql = "SELECT * FROM costumes";
    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to retrieve costumes" });
      }
      res.status(200).json(rows);
    });
  }
});

// GET /costumes/:id - Get one costume by ID
router.get("/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid costume ID" });
  }

  const sql = "SELECT * FROM costumes WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve costume" });
    }
    if (!row) {
      return res.status(404).json({ error: "Costume not found" });
    }
    res.status(200).json(row);
  });
});

// POST /costumes - Add a new costume
router.post("/", (req, res) => {
  const { name, era } = req.body;

  // Validation: name and era must be non-empty strings
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "Costume name is required" });
  }
  if (!isNonEmptyString(era)) {
    return res.status(400).json({ error: "Costume era is required" });
  }

  const trimmedName = name.trim();
  const trimmedEra = era.trim();

  const sql = "INSERT INTO costumes (name, era) VALUES (?, ?)";
  db.run(sql, [trimmedName, trimmedEra], function (err) {
    if (err) {
      return res.status(500).json({ error: "Failed to add costume" });
    }
    res.status(201).json({ id: this.lastID, name: trimmedName, era: trimmedEra });
  });
});

// PUT /costumes/:id - Update a costume
router.put("/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid costume ID" });
  }

  const { name, era } = req.body;

  // Validation: name and era must be non-empty strings
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "Costume name is required" });
  }
  if (!isNonEmptyString(era)) {
    return res.status(400).json({ error: "Costume era is required" });
  }

  const trimmedName = name.trim();
  const trimmedEra = era.trim();

  // Check if the costume exists
  const checkSql = "SELECT * FROM costumes WHERE id = ?";
  db.get(checkSql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to check costume" });
    }
    if (!row) {
      return res.status(404).json({ error: "Costume not found" });
    }

    const updateSql = "UPDATE costumes SET name = ?, era = ? WHERE id = ?";
    db.run(updateSql, [trimmedName, trimmedEra, req.params.id], function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to update costume" });
      }
      res.status(200).json({ id: parseInt(req.params.id), name: trimmedName, era: trimmedEra });
    });
  });
});

// DELETE /costumes/:id - Delete a costume
router.delete("/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid costume ID" });
  }

  // Check if the costume exists
  const checkSql = "SELECT * FROM costumes WHERE id = ?";
  db.get(checkSql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to check costume" });
    }
    if (!row) {
      return res.status(404).json({ error: "Costume not found" });
    }

    const deleteSql = "DELETE FROM costumes WHERE id = ?";
    db.run(deleteSql, [req.params.id], function (err) {
      if (err) {
        // Handle foreign key constraint error
        if (err.message.includes("FOREIGN KEY")) {
          return res.status(400).json({ error: "Cannot delete costume. It is referenced in hire records" });
        }
        return res.status(500).json({ error: "Failed to delete costume" });
      }
      res.status(204).send();
    });
  });
});

module.exports = router;
