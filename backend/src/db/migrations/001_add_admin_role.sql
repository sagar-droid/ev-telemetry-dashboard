USE ev_vehicle;

ALTER TABLE users
  MODIFY role ENUM('fleet_admin','admin','engineer','owner') NOT NULL DEFAULT 'owner';
