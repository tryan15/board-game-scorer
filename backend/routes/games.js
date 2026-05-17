const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.execute('SELECT * FROM games ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.execute({ sql: 'SELECT * FROM games WHERE id = ?', args: [req.params.id] });
    if (!rows[0]) return res.status(404).json({ error: 'Game not found' });
    const game = { ...rows[0] };
    const { rows: elements } = await db.execute({
      sql: 'SELECT * FROM scoring_elements WHERE game_id = ? ORDER BY sort_order',
      args: [game.id],
    });
    game.elements = elements;
    res.json(game);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, description, scoring_type = 'endgame', elements = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  let tx;
  try {
    tx = await db.transaction('write');
    const result = await tx.execute({
      sql: 'INSERT INTO games (name, description, scoring_type) VALUES (?, ?, ?)',
      args: [name, description || null, scoring_type],
    });
    const gameId = Number(result.lastInsertRowid);
    for (const [i, el] of elements.entries()) {
      await tx.execute({
        sql: 'INSERT INTO scoring_elements (game_id, name, description, input_type, point_value, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        args: [gameId, el.name, el.description || null, el.input_type || 'number', el.point_value ?? null, i],
      });
    }
    await tx.commit();

    const { rows } = await db.execute({ sql: 'SELECT * FROM games WHERE id = ?', args: [gameId] });
    const game = { ...rows[0] };
    const { rows: els } = await db.execute({
      sql: 'SELECT * FROM scoring_elements WHERE game_id = ? ORDER BY sort_order',
      args: [gameId],
    });
    game.elements = els;
    res.status(201).json(game);
  } catch (e) {
    if (tx) await tx.rollback();
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rows } = await db.execute({ sql: 'SELECT id FROM games WHERE id = ?', args: [req.params.id] });
    if (!rows[0]) return res.status(404).json({ error: 'Game not found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { name, description, scoring_type = 'endgame', elements = [] } = req.body;

  let tx;
  try {
    tx = await db.transaction('write');
    await tx.execute({
      sql: 'UPDATE games SET name = ?, description = ?, scoring_type = ? WHERE id = ?',
      args: [name, description || null, scoring_type, req.params.id],
    });
    await tx.execute({ sql: 'DELETE FROM scoring_elements WHERE game_id = ?', args: [req.params.id] });
    for (const [i, el] of elements.entries()) {
      await tx.execute({
        sql: 'INSERT INTO scoring_elements (game_id, name, description, input_type, point_value, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        args: [req.params.id, el.name, el.description || null, el.input_type || 'number', el.point_value ?? null, i],
      });
    }
    await tx.commit();

    const { rows } = await db.execute({ sql: 'SELECT * FROM games WHERE id = ?', args: [req.params.id] });
    const game = { ...rows[0] };
    const { rows: els } = await db.execute({
      sql: 'SELECT * FROM scoring_elements WHERE game_id = ? ORDER BY sort_order',
      args: [req.params.id],
    });
    game.elements = els;
    res.json(game);
  } catch (e) {
    if (tx) await tx.rollback();
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.execute({ sql: 'SELECT id FROM games WHERE id = ?', args: [req.params.id] });
    if (!rows[0]) return res.status(404).json({ error: 'Game not found' });
    await db.execute({ sql: 'DELETE FROM games WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
