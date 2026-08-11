const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/alerts — most recent alerts across all of the user's vehicles.
// This is the "catch-up" endpoint: SSE only streams events that happen
// WHILE connected, so the frontend calls this once on load to backfill
// anything it missed, then keeps the SSE connection open for new ones.
router.get('/', async (req, res) => {
  const ownership = req.user.role === 'owner' ? 'AND v.owner_id = ?' : '';
  const params = req.user.role === 'owner' ? [req.user.id] : [];
  const [rows] = await pool.query(
    `SELECT a.id, a.vehicle_id, v.nickname, a.severity, a.type, a.message, a.is_read, a.created_at
     FROM alerts a
     JOIN vehicles v ON v.id = a.vehicle_id
    WHERE 1 = 1 ${ownership}
    ORDER BY a.created_at DESC`,
      params
  );
  res.json(rows);
});

router.post('/:id/read', async (req, res) => {
  const ownership = req.user.role === 'owner' ? 'AND v.owner_id = ?' : '';
  const params = req.user.role === 'owner' ? [req.params.id, req.user.id] : [req.params.id];
  await pool.query(
    `UPDATE alerts a JOIN vehicles v ON v.id = a.vehicle_id
     SET a.is_read = TRUE
    WHERE a.id = ? ${ownership}`,
      params
  );
  res.json({ ok: true });
});

module.exports = router;
