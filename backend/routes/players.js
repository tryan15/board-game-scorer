const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT p.*, MAX(s.created_at) as last_used
      FROM players p
      LEFT JOIN session_players sp ON sp.player_id = p.id
      LEFT JOIN sessions s ON s.id = sp.session_id
      GROUP BY p.id
      ORDER BY
        CASE WHEN MAX(s.created_at) IS NULL THEN 1 ELSE 0 END,
        MAX(s.created_at) DESC,
        p.name
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const { rows: existing } = await db.execute({
      sql: 'SELECT * FROM players WHERE lower(name) = lower(?)',
      args: [name],
    });
    if (existing[0]) return res.status(409).json({ error: 'Player already exists', player: existing[0] });

    const result = await db.execute({ sql: 'INSERT INTO players (name) VALUES (?)', args: [name] });
    const { rows } = await db.execute({
      sql: 'SELECT * FROM players WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM players WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
