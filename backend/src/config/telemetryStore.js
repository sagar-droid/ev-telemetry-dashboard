const { Pool } = require('pg');

const useTimescale = process.env.TELEMETRY_STORE === 'timescale';
const pool = useTimescale
  ? new Pool({
      connectionString: process.env.TIMESCALE_URL,
      host: process.env.TIMESCALE_HOST || 'localhost',
      port: Number(process.env.TIMESCALE_PORT) || 5432,
      user: process.env.TIMESCALE_USER || 'postgres',
      password: process.env.TIMESCALE_PASSWORD || '',
      database: process.env.TIMESCALE_DB || 'ev_telemetry',
      max: 10
    })
  : null;

let unavailableLogged = false;

async function connectTelemetryStore() {
  if (!useTimescale) return;
  const client = await pool.connect();
  client.release();
  console.log('[telemetry] Using TimescaleDB for telemetry history.');
}

async function writeTelemetrySnapshot(payload) {
  if (!useTimescale) return false;
  try {
    await pool.query(
      `INSERT INTO telemetry_snapshots
       (vehicle_id, recorded_at, speed_kmh, battery_pct, motor_temp_c, range_km,
        latitude, longitude, odometer_km)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        payload.vehicleId,
        payload.timestamp,
        payload.speed_kmh,
        payload.battery_pct,
        payload.motor_temp_c,
        payload.range_km,
        payload.latitude,
        payload.longitude,
        payload.odometer_km
      ]
    );
    return true;
  } catch (err) {
    if (!unavailableLogged) {
      console.error(`[telemetry] TimescaleDB write failed: ${err.message}`);
      unavailableLogged = true;
    }
    return false;
  }
}

async function getTelemetryHistory(vehicleId, hours) {
  if (!useTimescale) return null;
  const { rows } = await pool.query(
    `SELECT speed_kmh, battery_pct, motor_temp_c, range_km,
            latitude, longitude, odometer_km, recorded_at
     FROM telemetry_snapshots
     WHERE vehicle_id = $1 AND recorded_at >= NOW() - ($2 * INTERVAL '1 hour')
     ORDER BY recorded_at ASC`,
    [vehicleId, hours]
  );
  return rows;
}

module.exports = { useTimescale, connectTelemetryStore, writeTelemetrySnapshot, getTelemetryHistory };
