CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS telemetry_snapshots (
  vehicle_id       INTEGER NOT NULL,
  recorded_at      TIMESTAMPTZ NOT NULL,
  speed_kmh        DOUBLE PRECISION NOT NULL,
  battery_pct      DOUBLE PRECISION NOT NULL,
  motor_temp_c     DOUBLE PRECISION NOT NULL,
  range_km         DOUBLE PRECISION NOT NULL,
  latitude         DOUBLE PRECISION NOT NULL,
  longitude        DOUBLE PRECISION NOT NULL,
  odometer_km      DOUBLE PRECISION NOT NULL
);

SELECT create_hypertable('telemetry_snapshots', 'recorded_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time
  ON telemetry_snapshots (vehicle_id, recorded_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_telemetry_vehicle_time
  ON telemetry_snapshots (vehicle_id, recorded_at);

-- Keep raw telemetry for seven days. Add continuous aggregates later when
-- long-range analytics requirements are defined.
SELECT add_retention_policy(
  'telemetry_snapshots',
  INTERVAL '7 days',
  if_not_exists => TRUE
);
