const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function init() {
  // Create schema
  for (const sql of [
    `CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      scoring_type TEXT NOT NULL DEFAULT 'endgame',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS scoring_elements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      input_type TEXT NOT NULL DEFAULT 'number',
      point_value REAL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL REFERENCES games(id),
      completed INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS session_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id),
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id),
      element_id INTEGER NOT NULL REFERENCES scoring_elements(id),
      value REAL NOT NULL DEFAULT 0,
      UNIQUE(session_id, player_id, element_id)
    )`,
    `CREATE TABLE IF NOT EXISTS score_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id),
      points REAL NOT NULL,
      label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  ]) {
    await db.execute(sql);
  }

  // Seed predefined games
  await seedGame(
    'Wingspan', 'Engine-building bird card game by Elizabeth Hargrave', 'endgame',
    [
      ['Birds', 'Points printed on each bird card played', 0],
      ['Bonus Cards', 'Points from bonus card objectives met', 1],
      ['End-of-Round Goals', 'Tokens earned from end-of-round goal tiles (4 rounds)', 2],
      ['Eggs', 'Each egg on a bird card scores 1 point', 3],
      ['Cached Food', 'Each food token cached on a bird card scores 1 point', 4],
      ['Tucked Cards', 'Each card tucked under a bird scores 1 point', 5],
    ]
  );

  await seedGame(
    'Pinochle', 'Trick-taking card game played over multiple hands to 1500 points', 'ingame',
    [
      ['Meld', 'Points from card combinations declared before trick play', 0],
      ['Tricks', 'Points from aces, tens, and kings taken in tricks (+ 10 for last trick)', 1],
    ]
  );
}

async function seedGame(name, description, scoringType, elements) {
  const { rows } = await db.execute({ sql: 'SELECT id FROM games WHERE name = ?', args: [name] });
  if (rows.length > 0) return;

  let tx;
  try {
    tx = await db.transaction('write');
    const result = await tx.execute({
      sql: 'INSERT INTO games (name, description, scoring_type) VALUES (?, ?, ?)',
      args: [name, description, scoringType],
    });
    const gameId = Number(result.lastInsertRowid);
    for (const [elName, elDesc, sortOrder] of elements) {
      await tx.execute({
        sql: 'INSERT INTO scoring_elements (game_id, name, description, input_type, sort_order) VALUES (?, ?, ?, ?, ?)',
        args: [gameId, elName, elDesc, 'number', sortOrder],
      });
    }
    await tx.commit();
  } catch (e) {
    if (tx) await tx.rollback();
    throw e;
  }
}

module.exports = { db, init };
