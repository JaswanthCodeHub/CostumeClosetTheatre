const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Ensure the database directory exists BEFORE opening the database
const dbDir = path.join(__dirname, "database");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Path to the SQLite database file
const dbPath = path.join(dbDir, "costume_closet.db");

// Create and connect to the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// Initialize the database: create tables, seed data, enable foreign keys
// Returns a promise so the server can wait for it before listening
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Enable foreign key constraints
    db.run("PRAGMA foreign_keys = ON", (err) => {
      if (err) {
        return reject(err);
      }

      db.serialize(() => {
        // Table 1: actors
        db.run(`
          CREATE TABLE IF NOT EXISTS actors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
          )
        `);

        // Table 2: costumes
        db.run(`
          CREATE TABLE IF NOT EXISTS costumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            era TEXT NOT NULL
          )
        `);

        // Table 3: hires
        db.run(`
          CREATE TABLE IF NOT EXISTS hires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_id INTEGER NOT NULL,
            costume_id INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            FOREIGN KEY (actor_id) REFERENCES actors(id),
            FOREIGN KEY (costume_id) REFERENCES costumes(id)
          )
        `);

        // Seed sample actors (only if the actors table is empty)
        db.get("SELECT COUNT(*) AS count FROM actors", (err, row) => {
          if (err) {
            console.error("Error checking actors table:", err.message);
            return;
          }
          if (row.count === 0) {
            const actors = [
              "John", "Sarah", "David", "Emma", "Michael",
              "Olivia", "James", "Sophia", "Daniel", "Isabella"
            ];
            const stmt = db.prepare("INSERT INTO actors (name) VALUES (?)");
            actors.forEach((name) => {
              stmt.run(name);
            });
            stmt.finalize(() => {
              console.log("Sample actors inserted.");
            });
          }
        });

        // Seed sample costumes (only if the costumes table is empty)
        // We insert exactly 15 costumes so Costume 15 has id = 15
        db.get("SELECT COUNT(*) AS count FROM costumes", (err, row) => {
          if (err) {
            console.error("Error checking costumes table:", err.message);
            return;
          }
          if (row.count === 0) {
            const costumes = [
              { name: "Royal King Costume", era: "Victorian" },
              { name: "Royal Queen Costume", era: "Victorian" },
              { name: "Knight Armor", era: "Medieval" },
              { name: "Court Jester Outfit", era: "Medieval" },
              { name: "Roman Senator Toga", era: "Roman" },
              { name: "Egyptian Pharaoh Robe", era: "Ancient" },
              { name: "Renaissance Gown", era: "Renaissance" },
              { name: "Pirate Captain Coat", era: "Colonial" },
              { name: "Victorian Gentleman Suit", era: "Victorian" },
              { name: "Tudor Royal Dress", era: "Tudor" },
              { name: "Samurai Warrior Outfit", era: "Feudal" },
              { name: "Greek Philosopher Robe", era: "Ancient" },
              { name: "Wild West Sheriff Costume", era: "Western" },
              { name: "Art Deco Flapper Dress", era: "Modern" },
              { name: "Costume 15", era: "Victorian" }
            ];
            const stmt = db.prepare("INSERT INTO costumes (name, era) VALUES (?, ?)");
            costumes.forEach((costume) => {
              stmt.run(costume.name, costume.era);
            });
            stmt.finalize(() => {
              console.log("Sample costumes inserted.");
            });
          }
        });

        // Use a final db.run to signal that serialize block is complete
        db.run("SELECT 1", () => {
          console.log("Database initialization complete.");
          resolve();
        });
      });
    });
  });
}

module.exports = { db, initializeDatabase };
