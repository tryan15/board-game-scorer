const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/board_game_scorer',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Thin wrapper so all route files keep their { rows } destructuring pattern
const db = {
  async query(sql, params = []) {
    const { rows } = await pool.query(sql, params);
    return { rows };
  },
  async withTransaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};

async function init() {
  for (const sql of [
    `CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      scoring_type TEXT NOT NULL DEFAULT 'endgame',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS scoring_elements (
      id SERIAL PRIMARY KEY,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      input_type TEXT NOT NULL DEFAULT 'number',
      point_value REAL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      game_id INTEGER NOT NULL REFERENCES games(id),
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS session_players (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id),
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id),
      element_id INTEGER NOT NULL REFERENCES scoring_elements(id),
      value REAL NOT NULL DEFAULT 0,
      UNIQUE(session_id, player_id, element_id)
    )`,
    `CREATE TABLE IF NOT EXISTS score_events (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id),
      points REAL NOT NULL,
      label TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  ]) {
    await pool.query(sql);
  }

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
  const { rows } = await pool.query('SELECT id FROM games WHERE name = $1', [name]);
  if (rows.length > 0) return;

  await db.withTransaction(async (client) => {
    const { rows: inserted } = await client.query(
      'INSERT INTO games (name, description, scoring_type) VALUES ($1, $2, $3) RETURNING id',
      [name, description, scoringType]
    );
    const gameId = inserted[0].id;
    for (const [elName, elDesc, sortOrder] of elements) {
      await client.query(
        'INSERT INTO scoring_elements (game_id, name, description, input_type, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [gameId, elName, elDesc, 'number', sortOrder]
      );
    }
  });
}

module.exports = { db, init };
