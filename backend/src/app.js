require('dotenv').config();
require('express-async-errors'); // lets `async (req,res)=>{ throw }` be caught below, no try/catch spam

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const alertRoutes = require('./routes/alerts');
const sseRoutes = require('./sse/events');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'ev-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/events', sseRoutes); // GET /api/events/stream (SSE)

// Centralized error handler — express-async-errors funnels thrown errors here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
