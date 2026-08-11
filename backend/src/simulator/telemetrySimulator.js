const pool = require('../config/db');
const eventBus = require('../websocket/eventBus');
const { setCurrentTelemetry } = require('../config/redis');
const { useTimescale, writeTelemetrySnapshot } = require('../config/telemetryStore');

/**
 * Stands in for real bikes sending telemetry over cellular/BLE.
 * Swap this file out for an MQTT subscriber later; nothing else in the
 * app needs to change since everything downstream just listens on eventBus.
 */

const state = new Map(); // vehicleId -> { speed, battery, temp, odometer, lat, lng }
const SNAPSHOT_EVERY_N_TICKS = 10; // persist to MySQL less often than we broadcast

function randomWalk(value, delta, min, max) {
  const next = value + (Math.random() * 2 - 1) * delta;
  return Math.max(min, Math.min(max, next));
}

async function loadVehicles() {
  const [rows] = await pool.query(
    `SELECT v.id, v.owner_id, v.battery_capacity_wh
     FROM vehicles v WHERE v.status != 'service'`
  );
  return rows;
}

function initState(vehicle) {
  state.set(vehicle.id, {
    ownerId: vehicle.owner_id,
    speed: 0,
    battery: 60 + Math.random() * 35,
    temp: 28 + Math.random() * 5,
    odometer: 1000 + Math.random() * 4000,
    lat: 27.7172 + (Math.random() - 0.5) * 0.05, // Kathmandu-ish
    lng: 85.324 + (Math.random() - 0.5) * 0.05,
    tick: 0,
    lowBatteryAlerted: false,
    overheatAlerted: false
  });
}

async function insertAlert(vehicleId, ownerId, severity, type, message) {
  const [result] = await pool.query(
    `INSERT INTO alerts (vehicle_id, severity, type, message) VALUES (?, ?, ?, ?)`,
    [vehicleId, severity, type, message]
  );
  eventBus.emit('alert', {
    id: result.insertId,
    vehicleId,
    ownerId,
    severity,
    type,
    message,
    created_at: new Date().toISOString()
  });
}

async function tick(vehicleId) {
  const s = state.get(vehicleId);
  if (!s) return;
  s.tick += 1;

  s.speed = randomWalk(s.speed, 8, 0, 90);
  s.battery = Math.max(0, s.battery - s.speed * 0.0008 - 0.01);
  s.temp = randomWalk(s.temp, 1.2, 20, 85);
  s.odometer += s.speed * (1.5 / 3600); // km covered in ~1.5s tick
  s.lat = randomWalk(s.lat, 0.0003, -90, 90);
  s.lng = randomWalk(s.lng, 0.0003, -180, 180);

  const rangeKm = Math.round((s.battery / 100) * 90); // 90km rated range at 100%

  const payload = {
    vehicleId,
    speed_kmh: Number(s.speed.toFixed(1)),
    battery_pct: Number(s.battery.toFixed(1)),
    motor_temp_c: Number(s.temp.toFixed(1)),
    range_km: rangeKm,
    latitude: Number(s.lat.toFixed(6)),
    longitude: Number(s.lng.toFixed(6)),
    odometer_km: Number(s.odometer.toFixed(2)),
    timestamp: new Date().toISOString()
  };

  // Redis holds only the freshest reading for fast current-state queries.
  // The write is isolated from the live broadcast and MySQL history path.
  void setCurrentTelemetry(payload);

  // 1) Always broadcast the live tick over WebSocket — this is the
  //    high-frequency stream, never touches the DB.
  eventBus.emit('telemetry', payload);

  // 2) Persist history outside the relational database when TimescaleDB is enabled.
  if (useTimescale) {
    void writeTelemetrySnapshot(payload);
  } else if (s.tick % SNAPSHOT_EVERY_N_TICKS === 0) {
    await pool.query(
      `INSERT INTO telemetry_snapshots
       (vehicle_id, speed_kmh, battery_pct, motor_temp_c, range_km, latitude, longitude, odometer_km)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicleId, payload.speed_kmh, payload.battery_pct, payload.motor_temp_c, payload.range_km, payload.latitude, payload.longitude, payload.odometer_km]
    );
  }

  // 3) Threshold-based alerts -> low-frequency, one-way -> SSE.
  if (s.battery <= 15 && !s.lowBatteryAlerted) {
    s.lowBatteryAlerted = true;
    await insertAlert(vehicleId, s.ownerId, 'warning', 'low_battery', `Battery at ${payload.battery_pct}% — find a charging point soon.`);
  }
  if (s.battery > 25) s.lowBatteryAlerted = false; // reset once recovered (e.g. after charging)

  if (s.temp >= 75 && !s.overheatAlerted) {
    s.overheatAlerted = true;
    await insertAlert(vehicleId, s.ownerId, 'critical', 'motor_overheat', `Motor temperature at ${payload.motor_temp_c}°C — reduce speed.`);
  }
  if (s.temp < 65) s.overheatAlerted = false;
}

async function start(intervalMs = 1500) {
  const vehicles = await loadVehicles();
  if (!vehicles.length) {
    console.warn('[simulator] No vehicles found — run `npm run seed` first.');
    return;
  }
  vehicles.forEach(initState);

  setInterval(() => {
    for (const vehicleId of state.keys()) tick(vehicleId);
  }, intervalMs);

  console.log(`[simulator] Streaming live telemetry for ${vehicles.length} vehicle(s) every ${intervalMs}ms`);
}

module.exports = { start };
