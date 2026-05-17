const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Vercel's deployment filesystem is read-only; use /tmp for the writable DB path
const dbPath = process.env.VERCEL ? '/tmp/scorer.db' : path.join(__dirname, 'scorer.db');
const db = new DatabaseSync(dbPath);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    scoring_type TEXT NOT NULL DEFAULT 'endgame',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scoring_elements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    input_type TEXT NOT NULL DEFAULT 'number',
    point_value REAL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id),
    completed INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS session_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id),
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id),
    element_id INTEGER NOT NULL REFERENCES scoring_elements(id),
    value REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS score_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id),
    points REAL NOT NULL,
    label TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate existing DBs that lack new columns
try { db.exec(`ALTER TABLE games ADD COLUMN scoring_type TEXT NOT NULL DEFAULT 'endgame'`); } catch {}
try { db.exec(`ALTER TABLE scoring_elements ADD COLUMN point_value REAL`); } catch {}

// Seed Wingspan if not already present
const existing = db.prepare('SELECT id FROM games WHERE name = ?').get('Wingspan');
if (!existing) {
  db.exec('BEGIN');
  try {
    const gameResult = db.prepare(
      `INSERT INTO games (name, description, scoring_type) VALUES (?, ?, 'endgame')`
    ).run('Wingspan', 'Engine-building bird card game by Elizabeth Hargrave');

    const gameId = gameResult.lastInsertRowid;
    const insertElement = db.prepare(
      'INSERT INTO scoring_elements (game_id, name, description, input_type, sort_order) VALUES (?, ?, ?, ?, ?)'
    );

    [
      ['Birds', 'Points printed on each bird card played', 'number', 0],
      ['Bonus Cards', 'Points from bonus card objectives met', 'number', 1],
      ['End-of-Round Goals', 'Tokens earned from end-of-round goal tiles (4 rounds)', 'number', 2],
      ['Eggs', 'Each egg on a bird card scores 1 point', 'number', 3],
      ['Cached Food', 'Each food token cached on a bird card scores 1 point', 'number', 4],
      ['Tucked Cards', 'Each card tucked under a bird scores 1 point', 'number', 5],
    ].forEach(([name, desc, type, order]) => insertElement.run(gameId, name, desc, type, order));

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Seed Pinochle if not already present
const existingPinochle = db.prepare('SELECT id FROM games WHERE name = ?').get('Pinochle');
if (!existingPinochle) {
  db.exec('BEGIN');
  try {
    const gameResult = db.prepare(
      `INSERT INTO games (name, description, scoring_type) VALUES (?, ?, 'ingame')`
    ).run('Pinochle', 'Trick-taking card game played over multiple hands to 1500 points');

    const gameId = gameResult.lastInsertRowid;
    const insertElement = db.prepare(
      'INSERT INTO scoring_elements (game_id, name, description, input_type, sort_order) VALUES (?, ?, ?, ?, ?)'
    );

    [
      ['Meld', 'Points from card combinations declared before trick play', 'number', 0],
      ['Tricks', 'Points from aces, tens, and kings taken in tricks (+ 10 for last trick)', 'number', 1],
    ].forEach(([name, desc, type, order]) => insertElement.run(gameId, name, desc, type, order));

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = db;
