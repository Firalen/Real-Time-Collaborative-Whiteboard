const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

router.post('/start', async (req, res) => {
  try {
    const { title, agenda } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO meeting_sessions (board_id, host_id, title, agenda)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.boardId, req.user.id, title || 'Meeting', JSON.stringify(agenda || [])],
    );
    res.status(201).json(formatSession(rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to start meeting' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM meeting_sessions WHERE board_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [req.params.boardId],
    );
    res.json(rows[0] ? formatSession(rows[0]) : null);
  } catch {
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

router.patch('/:sessionId', async (req, res) => {
  try {
    const { followHost, spotlight, timerSeconds, summary, ended } = req.body;
    const { rows } = await pool.query(
      `UPDATE meeting_sessions SET
        follow_host = COALESCE($3, follow_host),
        spotlight = COALESCE($4, spotlight),
        timer_seconds = COALESCE($5, timer_seconds),
        summary = COALESCE($6, summary),
        ended_at = CASE WHEN $7 = true THEN NOW() ELSE ended_at END
       WHERE id = $1 AND board_id = $2 RETURNING *`,
      [
        req.params.sessionId,
        req.params.boardId,
        followHost,
        spotlight ? JSON.stringify(spotlight) : null,
        timerSeconds,
        summary,
        ended,
      ],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Session not found' });
    res.json(formatSession(rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

router.get('/presentations', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, (
        SELECT json_agg(s ORDER BY s.sort_order)
        FROM presentation_slides s WHERE s.presentation_id = p.id
      ) AS slides
       FROM presentations p WHERE p.board_id = $1`,
      [req.params.boardId],
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch presentations' });
  }
});

router.post('/presentations', async (req, res) => {
  try {
    const { name, slides } = req.body;
    const { rows: pres } = await pool.query(
      `INSERT INTO presentations (board_id, name, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.boardId, name || 'Presentation', req.user.id],
    );
    if (slides?.length) {
      for (let i = 0; i < slides.length; i++) {
        await pool.query(
          `INSERT INTO presentation_slides (presentation_id, label, viewport, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [pres[0].id, slides[i].label, JSON.stringify(slides[i].viewport), i],
        );
      }
    }
    res.status(201).json(pres[0]);
  } catch {
    res.status(500).json({ error: 'Failed to create presentation' });
  }
});

function formatSession(s) {
  return {
    id: s.id,
    boardId: s.board_id,
    hostId: s.host_id,
    title: s.title,
    agenda: s.agenda,
    followHost: s.follow_host,
    spotlight: s.spotlight,
    timerSeconds: s.timer_seconds,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    summary: s.summary,
    recordingUrl: s.recording_url,
  };
}

module.exports = router;
