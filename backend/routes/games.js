const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM games ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM games WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Game not found' });
    const game = { ...rows[0] };
    const { rows: elements } = await db.query(
      'SELECT * FROM scoring_elements WHERE game_id = $1 ORDER BY sort_order',
      [game.id]
    );
    game.elements = elements;
    res.json(game);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, description, scoring_type = 'endgame', elements = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const gameId = await db.withTransaction(async (client) => {
      const { rows } = await client.query(
        'INSERT INTO games (name, description, scoring_type) VALUES ($1, $2, $3) RETURNING id',
        [name, description || null, scoring_type]
      );
      const id = rows[0].id;
      for (const [i, el] of elements.entries()) {
        await client.query(
          'INSERT INTO scoring_elements (game_id, name, description, input_type, point_value, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, el.name, el.description || null, el.input_type || 'number', el.point_value ?? null, i]
        );
      }
      return id;
    });

    const { rows } = await db.query('SELECT * FROM games WHERE id = $1', [gameId]);
    const game = { ...rows[0] };
    const { rows: els } = await db.query(
      'SELECT * FROM scoring_elements WHERE game_id = $1 ORDER BY sort_order',
      [gameId]
    );
    game.elements = els;
    res.status(201).json(game);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id FROM games WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Game not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { name, description, scoring_type = 'endgame', elements = [] } = req.body;

  try {
    await db.withTransaction(async (client) => {
      await client.query(
        'UPDATE games SET name = $1, description = $2, scoring_type = $3 WHERE id = $4',
        [name, description || null, scoring_type, req.params.id]
      );
      await client.query('DELETE FROM scoring_elements WHERE game_id = $1', [req.params.id]);
      for (const [i, el] of elements.entries()) {
        await client.query(
          'INSERT INTO scoring_elements (game_id, name, description, input_type, point_value, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
          [req.params.id, el.name, el.description || null, el.input_type || 'number', el.point_value ?? null, i]
        );
      }
    });

    const { rows } = await db.query('SELECT * FROM games WHERE id = $1', [req.params.id]);
    const game = { ...rows[0] };
    const { rows: els } = await db.query(
      'SELECT * FROM scoring_elements WHERE game_id = $1 ORDER BY sort_order',
      [req.params.id]
    );
    game.elements = els;
    res.json(game);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id FROM games WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Game not found' });
    await db.query('DELETE FROM games WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
