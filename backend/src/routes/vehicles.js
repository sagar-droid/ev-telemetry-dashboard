const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getCurrentTelemetry } = require('../config/redis');
const { useTimescale, getTelemetryHistory } = require('../config/telemetryStore');

const router = express.Router();
router.use(requireAuth);

function fleetScope(user) {
  return user.role === 'owner'
    ? { clause: 'WHERE owner_id = ?', params: [user.id] }
    : { clause: '', params: [] };
}

// GET /api/vehicles — list vehicles owned by the logged-in user
router.get('/', async (req, res) => {
  const scope = fleetScope(req.user);
  const [rows] = await pool.query(
    `SELECT id, owner_id, vin, model, nickname, battery_capacity_wh, firmware_version, status, created_at
     FROM vehicles ${scope.clause} ORDER BY created_at DESC`,
    scope.params
  );
  res.json(rows);
});

// GET /api/vehicles/:id — single vehicle detail
router.get('/:id', async (req, res) => {
  const scope = fleetScope(req.user);
  const [rows] = await pool.query(
    `SELECT * FROM vehicles ${scope.clause ? `${scope.clause} AND id = ?` : 'WHERE id = ?'}`,
    [...scope.params, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(rows[0]);
});

// GET /api/vehicles/:id/history?hours=24 — recent telemetry snapshots for charts
router.get('/:id/history', async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 24, 24 * 183);

  const scope = fleetScope(req.user);
  const [owned] = await pool.query(
    `SELECT id FROM vehicles ${scope.clause ? `${scope.clause} AND id = ?` : 'WHERE id = ?'}`,
    [...scope.params, req.params.id]
  );
  if (!owned.length) return res.status(404).json({ error: 'Vehicle not found' });

  const timescaleRows = useTimescale ? await getTelemetryHistory(req.params.id, hours) : null;
  const [rows] = timescaleRows
    ? [timescaleRows]
    : hours <= 24 * 7
    ? await pool.query(
      `SELECT speed_kmh, battery_pct, motor_temp_c, range_km, latitude, longitude, odometer_km, recorded_at
       FROM telemetry_snapshots
       WHERE vehicle_id = ? AND recorded_at >= NOW() - INTERVAL ? HOUR
       ORDER BY recorded_at ASC`,
      [req.params.id, hours]
    )
    : await pool.query(
      `SELECT avg_speed_kmh AS speed_kmh, min_battery_pct AS battery_pct,
              avg_temp_c AS motor_temp_c, last_range_km AS range_km,
              NULL AS latitude, NULL AS longitude, last_odometer_km AS odometer_km,
              hour_start AS recorded_at
       FROM telemetry_hourly
       WHERE vehicle_id = ? AND hour_start >= NOW() - INTERVAL ? HOUR
       ORDER BY hour_start ASC`,
      [req.params.id, hours]
    );
  res.json(rows);
});

// GET /api/vehicles/:id/current — freshest telemetry from Redis.
router.get('/:id/current', async (req, res) => {
  const scope = fleetScope(req.user);
  const [vehicles] = await pool.query(
    `SELECT id FROM vehicles ${scope.clause ? `${scope.clause} AND id = ?` : 'WHERE id = ?'}`,
    [...scope.params, req.params.id]
  );
  if (!vehicles.length) return res.status(404).json({ error: 'Vehicle not found' });

  const current = await getCurrentTelemetry(req.params.id);
  if (!current) return res.status(404).json({ error: 'Current telemetry unavailable' });
  res.json(current);
});

// POST /api/vehicles — register a new motorcycle to this account
router.post('/', requireRole('admin', 'fleet_admin'), async (req, res) => {
  const { owner_id, vin, model, nickname, battery_capacity_wh } = req.body;
  if (!owner_id) return res.status(400).json({ error: 'owner_id is required' });
  if (!vin) return res.status(400).json({ error: 'vin is required' });

  const [owners] = await pool.query(
    `SELECT id FROM users WHERE id = ? AND role = 'owner'`,
    [owner_id]
  );
  if (!owners.length) return res.status(400).json({ error: 'owner_id must belong to an owner user' });

  const [existingVin] = await pool.query('SELECT id FROM vehicles WHERE vin = ?', [vin.trim()]);
  if (existingVin.length) return res.status(409).json({ error: 'VIN is already registered' });

  const [result] = await pool.query(
    `INSERT INTO vehicles (owner_id, vin, model, nickname, battery_capacity_wh, status)
     VALUES (?, ?, ?, ?, ?, 'offline')`,
    [owner_id, vin.trim(), model || 'EV One', nickname || null, battery_capacity_wh || 4000]
  );
  res.status(201).json({ id: result.insertId });
});

module.exports = router;
