// Creates a demo user + two vehicles so you can log in and see the
// dashboard immediately. Run with: npm run seed
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const [userResult] = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES (?, ?, ?, 'fleet_admin')
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
    ['Demo Rider', 'demo@evmotorcycles.com', passwordHash]
  );

  const [[user]] = await pool.query('SELECT id FROM users WHERE email = ?', [
    'demo@evmotorcycles.com'
  ]);

  const vehicles = [
    { vin: 'EV-ONE-0001', nickname: 'Thunder', battery_capacity_wh: 4000 },
    { vin: 'EV-ONE-0002', nickname: 'Falcon', battery_capacity_wh: 4500 }
  ];

  for (const v of vehicles) {
    await pool.query(
      `INSERT INTO vehicles (owner_id, vin, model, nickname, battery_capacity_wh, status)
       VALUES (?, ?, 'Ev One', ?, ?, 'online')
       ON DUPLICATE KEY UPDATE nickname = VALUES(nickname)`,
      [user.id, v.vin, v.nickname, v.battery_capacity_wh]
    );
  }

  console.log('Seed complete.');
  console.log('Login with: demo@evmotorcycles.com / password123');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
