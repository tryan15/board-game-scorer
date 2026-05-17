const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const { rows: sessions } = await db.execute(`
      SELECT s.*, g.name as game_name, g.scoring_type
      FROM sessions s
      JOIN games g ON g.id = s.game_id
      ORDER BY s.created_at DESC
      LIMIT 50
    `);
    for (const session of sessions) {
      const { rows } = await db.execute({
        sql: `SELECT p.id, p.name, sp.sort_order
              FROM session_players sp
              JOIN players p ON p.id = sp.player_id
              WHERE sp.session_id = ?
              ORDER BY sp.sort_order`,
        args: [session.id],
      });
      session.players = rows;
    }
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT s.*, g.name as game_name, g.scoring_type
            FROM sessions s JOIN games g ON g.id = s.game_id
            WHERE s.id = ?`,
      args: [req.params.id],
    });
    if (!rows[0]) return res.status(404).json({ error: 'Session not found' });
    const session = { ...rows[0] };

    const [{ rows: players }, { rows: elements }, { rows: scores }, { rows: score_events }] =
      await Promise.all([
        db.execute({
          sql: `SELECT p.id, p.name, sp.sort_order
                FROM session_players sp JOIN players p ON p.id = sp.player_id
                WHERE sp.session_id = ? ORDER BY sp.sort_order`,
          args: [session.id],
        }),
        db.execute({
          sql: 'SELECT * FROM scoring_elements WHERE game_id = ? ORDER BY sort_order',
          args: [session.game_id],
        }),
        db.execute({ sql: 'SELECT * FROM scores WHERE session_id = ?', args: [session.id] }),
        db.execute({
          sql: 'SELECT * FROM score_events WHERE session_id = ? ORDER BY created_at',
          args: [session.id],
        }),
      ]);

    session.players = players;
    session.elements = elements;
    session.scores = scores;
    session.score_events = score_events;
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { game_id, player_ids } = req.body;
  if (!game_id || !Array.isArray(player_ids) || player_ids.length === 0) {
    return res.status(400).json({ error: 'game_id and player_ids are required' });
  }

  let tx;
  try {
    tx = await db.transaction('write');
    const result = await tx.execute({ sql: 'INSERT INTO sessions (game_id) VALUES (?)', args: [game_id] });
    const sessionId = Number(result.lastInsertRowid);
    for (const [i, pid] of player_ids.entries()) {
      await tx.execute({
        sql: 'INSERT INTO session_players (session_id, player_id, sort_order) VALUES (?, ?, ?)',
        args: [sessionId, pid, i],
      });
    }
    await tx.commit();

    const { rows } = await db.execute({
      sql: `SELECT s.*, g.name as game_name, g.scoring_type
            FROM sessions s JOIN games g ON g.id = s.game_id WHERE s.id = ?`,
      args: [sessionId],
    });
    const session = { ...rows[0] };
    const { rows: players } = await db.execute({
      sql: `SELECT p.id, p.name, sp.sort_order
            FROM session_players sp JOIN players p ON p.id = sp.player_id
            WHERE sp.session_id = ? ORDER BY sp.sort_order`,
      args: [sessionId],
    });
    session.players = players;
    res.status(201).json(session);
  } catch (e) {
    if (tx) await tx.rollback();
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/scores', async (req, res) => {
  const { scores = [], completed = false } = req.body;
  let tx;
  try {
    tx = await db.transaction('write');
    for (const { player_id, element_id, value } of scores) {
      await tx.execute({
        sql: `INSERT INTO scores (session_id, player_id, element_id, value) VALUES (?, ?, ?, ?)
              ON CONFLICT(session_id, player_id, element_id) DO UPDATE SET value = excluded.value`,
        args: [req.params.id, player_id, element_id, value],
      });
    }
    if (completed) {
      await tx.execute({ sql: 'UPDATE sessions SET completed = 1 WHERE id = ?', args: [req.params.id] });
    }
    await tx.commit();
    res.json({ success: true });
  } catch (e) {
    if (tx) await tx.rollback();
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/events', async (req, res) => {
  const { player_id, points, label } = req.body;
  if (player_id == null || points == null) {
    return res.status(400).json({ error: 'player_id and points are required' });
  }
  try {
    const result = await db.execute({
      sql: 'INSERT INTO score_events (session_id, player_id, points, label) VALUES (?, ?, ?, ?)',
      args: [req.params.id, player_id, points, label || null],
    });
    const { rows } = await db.execute({
      sql: 'SELECT * FROM score_events WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    await db.execute({ sql: 'UPDATE sessions SET completed = 1 WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
