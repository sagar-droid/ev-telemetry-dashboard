-- ============================================================
--  Motorcycles EV Dashboard — MySQL Schema
-- ============================================================
CREATE DATABASE IF NOT EXISTS ev_vehicle CHARACTER SET utf8mb4;
USE ev_vehicle;

-- ---------------------------------------------------------
-- Users (owners / fleet admins / service engineers)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('fleet_admin','admin','engineer','owner') NOT NULL DEFAULT 'owner',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Vehicles (each electric motorcycle)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id        INT UNSIGNED NOT NULL,
  vin             VARCHAR(32) NOT NULL UNIQUE,
  model           VARCHAR(80) NOT NULL DEFAULT 'Ev One',
  nickname        VARCHAR(80),
  battery_capacity_wh INT UNSIGNED NOT NULL DEFAULT 4000, -- watt-hours
  firmware_version VARCHAR(20) DEFAULT '1.0.0',
  status          ENUM('online','offline','charging','service') NOT NULL DEFAULT 'offline',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Telemetry snapshots (historical / persisted samples)
-- Live/streamed data rides over WebSocket without hitting
-- the DB on every tick; this table stores periodic snapshots
-- (e.g. every 10-30s) for history, analytics & charts.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry_snapshots (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id      INT UNSIGNED NOT NULL,
  speed_kmh       DECIMAL(5,2) NOT NULL,
  battery_pct     DECIMAL(5,2) NOT NULL,
  motor_temp_c    DECIMAL(5,2) NOT NULL,
  range_km        DECIMAL(6,2) NOT NULL,
  latitude        DECIMAL(9,6) NOT NULL,
  longitude       DECIMAL(9,6) NOT NULL,
  odometer_km     DECIMAL(10,2) NOT NULL,
  recorded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  INDEX idx_vehicle_time (vehicle_id, recorded_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Hourly telemetry aggregates for long-range charts
-- Raw snapshots older than the retention window can be removed
-- after their measurements are represented here.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry_hourly (
  vehicle_id      INT UNSIGNED NOT NULL,
  hour_start      DATETIME NOT NULL,
  avg_speed_kmh   DECIMAL(5,2) NOT NULL,
  min_battery_pct DECIMAL(5,2) NOT NULL,
  max_battery_pct DECIMAL(5,2) NOT NULL,
  avg_temp_c      DECIMAL(5,2) NOT NULL,
  max_temp_c      DECIMAL(5,2) NOT NULL,
  last_range_km   DECIMAL(6,2) NOT NULL,
  last_odometer_km DECIMAL(10,2) NOT NULL,
  sample_count    INT UNSIGNED NOT NULL,
  PRIMARY KEY (vehicle_id, hour_start),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Ride sessions (start/stop of a trip)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS ride_sessions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id      INT UNSIGNED NOT NULL,
  started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at        TIMESTAMP NULL,
  distance_km     DECIMAL(6,2) DEFAULT 0,
  avg_speed_kmh   DECIMAL(5,2) DEFAULT 0,
  battery_used_pct DECIMAL(5,2) DEFAULT 0,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Alerts / events (low battery, geofence, firmware, fault codes)
-- These are what get pushed to clients over SSE.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id      INT UNSIGNED NOT NULL,
  severity        ENUM('info','warning','critical') NOT NULL DEFAULT 'info',
  type            VARCHAR(60) NOT NULL,           -- e.g. 'low_battery', 'motor_overheat'
  message         VARCHAR(255) NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  INDEX idx_vehicle_created (vehicle_id, created_at)
) ENGINE=InnoDB;
