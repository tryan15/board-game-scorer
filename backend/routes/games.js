const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const games = db.prepare('SELECT * FROM games ORDER BY name').all();
  res.json(games);
});

router.get('/:id', (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  game.elements = db.prepare(
    'SELECT * FROM scoring_elements WHERE game_id = ? ORDER BY sort_order'
  ).all(game.id);
  res.json(game);
});

router.post('/', (req, res) => {
  const { name, description, scoring_type = 'endgame', elements = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  db.exec('BEGIN');
  try {
    const result = db.prepare(
      'INSERT INTO games (name, description, scoring_type) VALUES (?, ?, ?)'
    ).run(name, description || null, scoring_type);
    const gameId = result.lastInsertRowid;
    const insertEl = db.prepare(
      'INSERT INTO scoring_elements (game_id, name, description, input_type, point_value, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    elements.forEach((el, i) =>
      insertEl.run(gameId, el.name, el.description || null, el.input_type || 'number', el.point_value ?? null, i)
    );
    db.exec('COMMIT');

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
    game.elements = db.prepare('SELECT * FROM scoring_elements WHERE game_id = ? ORDER BY sort_order').all(gameId);
    res.status(201).json(game);
  } catch (e) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  const game = db.prepare('SELECT id FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const { name, description, scoring_type = 'endgame', elements = [] } = req.body;

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE games SET name = ?, description = ?, scoring_type = ? WHERE id = ?').run(
      name, description || null, scoring_type, req.params.id
    );
    db.prepare('DELETE FROM scoring_elements WHERE game_id = ?').run(req.params.id);
    const insertEl = db.prepare(
      'INSERT INTO scoring_elements (game_id, name, description, input_type, point_value, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    elements.forEach((el, i) =>
      insertEl.run(req.params.id, el.name, el.description || null, el.input_type || 'number', el.point_value ?? null, i)
    );
    db.exec('COMMIT');

    const updated = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    updated.elements = db.prepare('SELECT * FROM scoring_elements WHERE game_id = ? ORDER BY sort_order').all(req.params.id);
    res.json(updated);
  } catch (e) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  const game = db.prepare('SELECT id FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
