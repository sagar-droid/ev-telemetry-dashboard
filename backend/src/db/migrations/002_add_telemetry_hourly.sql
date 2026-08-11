USE ev_vehicle;

CREATE TABLE IF NOT EXISTS telemetry_hourly (
  vehicle_id       INT UNSIGNED NOT NULL,
  hour_start       DATETIME NOT NULL,
  avg_speed_kmh    DECIMAL(5,2) NOT NULL,
  min_battery_pct  DECIMAL(5,2) NOT NULL,
  max_battery_pct  DECIMAL(5,2) NOT NULL,
  avg_temp_c       DECIMAL(5,2) NOT NULL,
  max_temp_c       DECIMAL(5,2) NOT NULL,
  last_range_km    DECIMAL(6,2) NOT NULL,
  last_odometer_km DECIMAL(10,2) NOT NULL,
  sample_count     INT UNSIGNED NOT NULL,
  PRIMARY KEY (vehicle_id, hour_start),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB;