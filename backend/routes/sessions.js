const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const { rows: sessions } = await db.query(`
      SELECT s.*, g.name as game_name, g.scoring_type
      FROM sessions s
      JOIN games g ON g.id = s.game_id
      ORDER BY s.created_at DESC
      LIMIT 50
    `);
    for (const session of sessions) {
      const { rows } = await db.query(
        `SELECT p.id, p.name, sp.sort_order
         FROM session_players sp
         JOIN players p ON p.id = sp.player_id
         WHERE sp.session_id = $1
         ORDER BY sp.sort_order`,
        [session.id]
      );
      session.players = rows;
    }
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, g.name as game_name, g.scoring_type
       FROM sessions s JOIN games g ON g.id = s.game_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Session not found' });
    const session = { ...rows[0] };

    const [{ rows: players }, { rows: elements }, { rows: scores }, { rows: score_events }] =
      await Promise.all([
        db.query(
          `SELECT p.id, p.name, sp.sort_order
           FROM session_players sp JOIN players p ON p.id = sp.player_id
           WHERE sp.session_id = $1 ORDER BY sp.sort_order`,
          [session.id]
        ),
        db.query(
          'SELECT * FROM scoring_elements WHERE game_id = $1 ORDER BY sort_order',
          [session.game_id]
        ),
        db.query('SELECT * FROM scores WHERE session_id = $1', [session.id]),
        db.query(
          'SELECT * FROM score_events WHERE session_id = $1 ORDER BY created_at',
          [session.id]
        ),
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

  try {
    const sessionId = await db.withTransaction(async (client) => {
      const { rows } = await client.query(
        'INSERT INTO sessions (game_id) VALUES ($1) RETURNING id',
        [game_id]
      );
      const id = rows[0].id;
      for (const [i, pid] of player_ids.entries()) {
        await client.query(
          'INSERT INTO session_players (session_id, player_id, sort_order) VALUES ($1, $2, $3)',
          [id, pid, i]
        );
      }
      return id;
    });

    const { rows } = await db.query(
      `SELECT s.*, g.name as game_name, g.scoring_type
       FROM sessions s JOIN games g ON g.id = s.game_id WHERE s.id = $1`,
      [sessionId]
    );
    const session = { ...rows[0] };
    const { rows: players } = await db.query(
      `SELECT p.id, p.name, sp.sort_order
       FROM session_players sp JOIN players p ON p.id = sp.player_id
       WHERE sp.session_id = $1 ORDER BY sp.sort_order`,
      [sessionId]
    );
    session.players = players;
    res.status(201).json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/scores', async (req, res) => {
  const { scores = [], completed = false } = req.body;
  try {
    await db.withTransaction(async (client) => {
      for (const { player_id, element_id, value } of scores) {
        await client.query(
          `INSERT INTO scores (session_id, player_id, element_id, value) VALUES ($1, $2, $3, $4)
           ON CONFLICT (session_id, player_id, element_id) DO UPDATE SET value = EXCLUDED.value`,
          [req.params.id, player_id, element_id, value]
        );
      }
      if (completed) {
        await client.query('UPDATE sessions SET completed = 1 WHERE id = $1', [req.params.id]);
      }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/events', async (req, res) => {
  const { player_id, points, label } = req.body;
  if (player_id == null || points == null) {
    return res.status(400).json({ error: 'player_id and points are required' });
  }
  try {
    const { rows } = await db.query(
      'INSERT INTO score_events (session_id, player_id, points, label) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, player_id, points, label || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    await db.query('UPDATE sessions SET completed = 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM sessions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
