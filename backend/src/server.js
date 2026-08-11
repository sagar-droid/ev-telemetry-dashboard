require('dotenv').config();
const http = require('http');
const app = require('./app');
const { attachWebSocketServer } = require('./websocket/server');
const simulator = require('./simulator/telemetrySimulator');
const { connectRedis } = require('./config/redis');
const { startRetentionWorker } = require('./telemetry/retention');
const { useTimescale, connectTelemetryStore } = require('./config/telemetryStore');

const PORT = process.env.PORT || 4000;

// One raw http.Server instance is shared by Express (REST + SSE, both
// just normal HTTP) and the WebSocket server (which hijacks the HTTP
// "upgrade" event on the same port). This is why WS doesn't need its own port.
const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(PORT, async () => {
  console.log(`EV backend listening on http://localhost:${PORT}`);
  console.log(`  REST:      http://localhost:${PORT}/api`);
  console.log(`  SSE:       http://localhost:${PORT}/api/events/stream?token=...`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws/live?token=...&vehicleId=...`);

  await connectRedis();
  await connectTelemetryStore();
  if (!useTimescale) startRetentionWorker();

  if (process.env.ENABLE_SIMULATOR !== 'false') {
    try {
      await simulator.start(Number(process.env.SIMULATOR_INTERVAL_MS) || 1500);
    } catch (err) {
      console.error('Simulator failed to start (is MySQL running & seeded?):', err.message);
    }
  }
});
