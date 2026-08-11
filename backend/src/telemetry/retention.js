const pool = require('../config/db');

const RAW_RETENTION_DAYS = Number(process.env.TELEMETRY_RAW_RETENTION_DAYS) || 7;
const RUN_EVERY_MS = 60 * 60 * 1000;

async function compactRawTelemetry() {
  await pool.query(
    `INSERT INTO telemetry_hourly
       (vehicle_id, hour_start, avg_speed_kmh, min_battery_pct, max_battery_pct,
        avg_temp_c, max_temp_c, last_range_km, last_odometer_km, sample_count)
     SELECT vehicle_id,
      MIN(TIMESTAMP(DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00'))),
       AVG(speed_kmh), MIN(battery_pct), MAX(battery_pct), AVG(motor_temp_c),
       MAX(motor_temp_c), SUBSTRING_INDEX(GROUP_CONCAT(range_km ORDER BY recorded_at DESC), ',', 1),
       SUBSTRING_INDEX(GROUP_CONCAT(odometer_km ORDER BY recorded_at DESC), ',', 1), COUNT(*)
     FROM telemetry_snapshots
     WHERE recorded_at < NOW() - INTERVAL ? DAY
     GROUP BY vehicle_id, YEAR(recorded_at), MONTH(recorded_at), DAY(recorded_at), HOUR(recorded_at)
     ON DUPLICATE KEY UPDATE
       avg_speed_kmh = VALUES(avg_speed_kmh), min_battery_pct = VALUES(min_battery_pct),
       max_battery_pct = VALUES(max_battery_pct), avg_temp_c = VALUES(avg_temp_c),
       max_temp_c = VALUES(max_temp_c), last_range_km = VALUES(last_range_km),
       last_odometer_km = VALUES(last_odometer_km), sample_count = VALUES(sample_count)`,
    [RAW_RETENTION_DAYS]
  );

  await pool.query(
    'DELETE FROM telemetry_snapshots WHERE recorded_at < NOW() - INTERVAL ? DAY',
    [RAW_RETENTION_DAYS]
  );
}

function startRetentionWorker() {
  compactRawTelemetry().catch((err) => console.error('[telemetry] initial compaction failed:', err.message));
  setInterval(() => {
    compactRawTelemetry().catch((err) => console.error('[telemetry] compaction failed:', err.message));
  }, RUN_EVERY_MS);
  console.log(`[telemetry] Raw snapshots retained for ${RAW_RETENTION_DAYS} days; older data is hourly-aggregated.`);
}

module.exports = { startRetentionWorker };