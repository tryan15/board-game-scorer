const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Ordered by most recently used in a session first, then alphabetically
router.get('/', (req, res) => {
  const players = db.prepare(`
    SELECT p.*, MAX(s.created_at) as last_used
    FROM players p
    LEFT JOIN session_players sp ON sp.player_id = p.id
    LEFT JOIN sessions s ON s.id = sp.session_id
    GROUP BY p.id
    ORDER BY
      CASE WHEN MAX(s.created_at) IS NULL THEN 1 ELSE 0 END,
      MAX(s.created_at) DESC,
      p.name
  `).all();
  res.json(players);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const existing = db.prepare('SELECT * FROM players WHERE lower(name) = lower(?)').get(name);
  if (existing) return res.status(409).json({ error: 'Player already exists', player: existing });

  const result = db.prepare('INSERT INTO players (name) VALUES (?)').run(name);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(player);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
