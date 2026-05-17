const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const sessions = db.prepare(`
    SELECT s.*, g.name as game_name, g.scoring_type
    FROM sessions s
    JOIN games g ON g.id = s.game_id
    ORDER BY s.created_at DESC
    LIMIT 50
  `).all();

  for (const session of sessions) {
    session.players = db.prepare(`
      SELECT p.id, p.name, sp.sort_order
      FROM session_players sp
      JOIN players p ON p.id = sp.player_id
      WHERE sp.session_id = ?
      ORDER BY sp.sort_order
    `).all(session.id);
  }

  res.json(sessions);
});

router.get('/:id', (req, res) => {
  const session = db.prepare(`
    SELECT s.*, g.name as game_name, g.scoring_type
    FROM sessions s
    JOIN games g ON g.id = s.game_id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.players = db.prepare(`
    SELECT p.id, p.name, sp.sort_order
    FROM session_players sp
    JOIN players p ON p.id = sp.player_id
    WHERE sp.session_id = ?
    ORDER BY sp.sort_order
  `).all(session.id);

  session.elements = db.prepare(
    'SELECT * FROM scoring_elements WHERE game_id = ? ORDER BY sort_order'
  ).all(session.game_id);

  session.scores = db.prepare('SELECT * FROM scores WHERE session_id = ?').all(session.id);

  session.score_events = db.prepare(
    'SELECT * FROM score_events WHERE session_id = ? ORDER BY created_at'
  ).all(session.id);

  res.json(session);
});

router.post('/', (req, res) => {
  const { game_id, player_ids } = req.body;
  if (!game_id || !Array.isArray(player_ids) || player_ids.length === 0) {
    return res.status(400).json({ error: 'game_id and player_ids are required' });
  }

  db.exec('BEGIN');
  try {
    const result = db.prepare('INSERT INTO sessions (game_id) VALUES (?)').run(game_id);
    const sessionId = result.lastInsertRowid;
    const insertSP = db.prepare(
      'INSERT INTO session_players (session_id, player_id, sort_order) VALUES (?, ?, ?)'
    );
    player_ids.forEach((pid, i) => insertSP.run(sessionId, pid, i));
    db.exec('COMMIT');

    const session = db.prepare(`
      SELECT s.*, g.name as game_name, g.scoring_type
      FROM sessions s JOIN games g ON g.id = s.game_id WHERE s.id = ?
    `).get(sessionId);
    session.players = db.prepare(`
      SELECT p.id, p.name, sp.sort_order
      FROM session_players sp JOIN players p ON p.id = sp.player_id
      WHERE sp.session_id = ? ORDER BY sp.sort_order
    `).all(sessionId);

    res.status(201).json(session);
  } catch (e) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
});

// Save end-game element scores
router.post('/:id/scores', (req, res) => {
  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { scores = [], completed = false } = req.body;

  db.exec('BEGIN');
  try {
    for (const { player_id, element_id, value } of scores) {
      const existing = db.prepare(
        'SELECT id FROM scores WHERE session_id = ? AND player_id = ? AND element_id = ?'
      ).get(req.params.id, player_id, element_id);

      if (existing) {
        db.prepare('UPDATE scores SET value = ? WHERE session_id = ? AND player_id = ? AND element_id = ?')
          .run(value, req.params.id, player_id, element_id);
      } else {
        db.prepare('INSERT INTO scores (session_id, player_id, element_id, value) VALUES (?, ?, ?, ?)')
          .run(req.params.id, player_id, element_id, value);
      }
    }
    if (completed) {
      db.prepare('UPDATE sessions SET completed = 1 WHERE id = ?').run(req.params.id);
    }
    db.exec('COMMIT');
    res.json({ success: true });
  } catch (e) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
});

// Add a live score event (in-game scoring)
router.post('/:id/events', (req, res) => {
  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { player_id, points, label } = req.body;
  if (player_id == null || points == null) {
    return res.status(400).json({ error: 'player_id and points are required' });
  }

  const result = db.prepare(
    'INSERT INTO score_events (session_id, player_id, points, label) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, player_id, points, label || null);

  const event = db.prepare('SELECT * FROM score_events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(event);
});

// Mark session complete
router.post('/:id/complete', (req, res) => {
  db.prepare('UPDATE sessions SET completed = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
