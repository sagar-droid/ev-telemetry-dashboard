const mysql = require('mysql2/promise');
require('dotenv').config();

// A connection POOL (not a single connection) is used because Node handles
// many requests concurrently. The pool hands out and reclaims connections
// automatically so parallel API calls / WebSocket writes don't collide.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ev_vehicle',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

module.exports = pool;
