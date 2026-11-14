const express = require("express");
const router = express.Router();
const { db } = require("../db");

// Helper: validate that an ID parameter is a positive integer
function isValidId(id) {
  const num = Number(id);
  return Number.isInteger(num) && num > 0;
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

  if (month < 1 || month > 12) {
    return false;
  }

  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

// GET /hires/details - Get hire records with actor and costume names (SQL JOIN)
// IMPORTANT: This route is defined BEFORE /hires/:id to avoid route conflicts
router.get("/details", (req, res) => {
  const sql = `
    SELECT
      hires.id,
      hires.actor_id,
      actors.name AS actor_name,
      hires.costume_id,
      costumes.name AS costume_name,
      hires.start_date,
      hires.end_date
    FROM hires
    JOIN actors ON hires.actor_id = actors.id
    JOIN costumes ON hires.costume_id = costumes.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve hire details" });
    }
    res.status(200).json(rows);
  });
});

// GET /hires - Get all hire records
router.get("/", (req, res) => {
  const sql = "SELECT * FROM hires";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve hires" });
    }
    res.status(200).json(rows);
  });
});

// GET /hires/:id - Get one hire record by ID
router.get("/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid hire ID" });
  }

  const sql = "SELECT * FROM hires WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve hire" });
    }
    if (!row) {
      return res.status(404).json({ error: "Hire record not found" });
    }
    res.status(200).json(row);
  });
});

// POST /hires - Create a new hire record
router.post("/", (req, res) => {
  const { actor_id, costume_id, start_date, end_date } = req.body;

  // Validation: all fields are required
  if (actor_id === undefined || actor_id === null) {
    return res.status(400).json({ error: "actor_id is required" });
  }
  if (costume_id === undefined || costume_id === null) {
    return res.status(400).json({ error: "costume_id is required" });
  }
  if (!start_date) {
    return res.status(400).json({ error: "start_date is required" });
  }
  if (!end_date) {
    return res.status(400).json({ error: "end_date is required" });
  }

  // Validate actor_id and costume_id are positive integers
  if (!isValidId(actor_id)) {
    return res.status(400).json({ error: "actor_id must be a positive integer" });
  }
  if (!isValidId(costume_id)) {
    return res.status(400).json({ error: "costume_id must be a positive integer" });
  }

  // Validate date formats
  if (!isValidDate(start_date)) {
    return res.status(400).json({ error: "Invalid start_date format. Use YYYY-MM-DD" });
  }
  if (!isValidDate(end_date)) {
    return res.status(400).json({ error: "Invalid end_date format. Use YYYY-MM-DD" });
  }

  // Validate: end_date cannot be earlier than start_date
  if (end_date < start_date) {
    return res.status(400).json({ error: "End date cannot be earlier than start date" });
  }

  // Check if actor exists
  db.get("SELECT * FROM actors WHERE id = ?", [actor_id], (err, actor) => {
    if (err) {
      return res.status(500).json({ error: "Failed to check actor" });
    }
    if (!actor) {
      return res.status(404).json({ error: "Actor not found" });
    }

    // Check if costume exists
    db.get("SELECT * FROM costumes WHERE id = ?", [costume_id], (err, costume) => {
      if (err) {
        return res.status(500).json({ error: "Failed to check costume" });
      }
      if (!costume) {
        return res.status(404).json({ error: "Costume not found" });
      }

      // Insert the hire record
      const sql = "INSERT INTO hires (actor_id, costume_id, start_date, end_date) VALUES (?, ?, ?, ?)";
      db.run(sql, [actor_id, costume_id, start_date, end_date], function (err) {
        if (err) {
          return res.status(500).json({ error: "Failed to create hire record" });
        }
        res.status(201).json({
          id: this.lastID,
          actor_id,
          costume_id,
          start_date,
          end_date
        });
      });
    });
  });
});

// PUT /hires/:id - Update an existing hire record
router.put("/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid hire ID" });
  }

  const { actor_id, costume_id, start_date, end_date } = req.body;

  // Validation: all fields are required
  if (actor_id === undefined || actor_id === null) {
    return res.status(400).json({ error: "actor_id is required" });
  }
  if (costume_id === undefined || costume_id === null) {
    return res.status(400).json({ error: "costume_id is required" });
  }
  if (!start_date) {
    return res.status(400).json({ error: "start_date is required" });
  }
  if (!end_date) {
    return res.status(400).json({ error: "end_date is required" });
  }

  // Validate actor_id and costume_id are positive integers
  if (!isValidId(actor_id)) {
    return res.status(400).json({ error: "actor_id must be a positive integer" });
  }
  if (!isValidId(costume_id)) {
    return res.status(400).json({ error: "costume_id must be a positive integer" });
  }

  // Validate date formats
  if (!isValidDate(start_date)) {
    return res.status(400).json({ error: "Invalid start_date format. Use YYYY-MM-DD" });
  }
  if (!isValidDate(end_date)) {
    return res.status(400).json({ error: "Invalid end_date format. Use YYYY-MM-DD" });
  }

  // Validate: end_date cannot be earlier than start_date
  if (end_date < start_date) {
    return res.status(400).json({ error: "End date cannot be earlier than start date" });
  }

  // Check if the hire record exists
  db.get("SELECT * FROM hires WHERE id = ?", [req.params.id], (err, hire) => {
    if (err) {
      return res.status(500).json({ error: "Failed to check hire record" });
    }
    if (!hire) {
      return res.status(404).json({ error: "Hire record not found" });
    }

    // Check if actor exists
    db.get("SELECT * FROM actors WHERE id = ?", [actor_id], (err, actor) => {
      if (err) {
        return res.status(500).json({ error: "Failed to check actor" });
      }
      if (!actor) {
        return res.status(404).json({ error: "Actor not found" });
      }

      // Check if costume exists
      db.get("SELECT * FROM costumes WHERE id = ?", [costume_id], (err, costume) => {
        if (err) {
          return res.status(500).json({ error: "Failed to check costume" });
        }
        if (!costume) {
          return res.status(404).json({ error: "Costume not found" });
        }

        // Update the hire record
        const sql = "UPDATE hires SET actor_id = ?, costume_id = ?, start_date = ?, end_date = ? WHERE id = ?";
        db.run(sql, [actor_id, costume_id, start_date, end_date, req.params.id], function (err) {
          if (err) {
            return res.status(500).json({ error: "Failed to update hire record" });
          }
          res.status(200).json({
            id: parseInt(req.params.id),
            actor_id,
            costume_id,
            start_date,
            end_date
          });
        });
      });
    });
  });
});

// DELETE /hires/:id - Delete a hire record
router.delete("/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid hire ID" });
  }

  // Check if the hire record exists
  db.get("SELECT * FROM hires WHERE id = ?", [req.params.id], (err, hire) => {
    if (err) {
      return res.status(500).json({ error: "Failed to check hire record" });
    }
    if (!hire) {
      return res.status(404).json({ error: "Hire record not found" });
    }

    const sql = "DELETE FROM hires WHERE id = ?";
    db.run(sql, [req.params.id], function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to delete hire record" });
      }
      res.status(204).send();
    });
  });
});

module.exports = router;
