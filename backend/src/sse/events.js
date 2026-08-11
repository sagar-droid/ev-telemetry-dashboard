const express = require('express');
const { verifyTokenFromQuery } = require('../middleware/auth');
const eventBus = require('../websocket/eventBus');

const router = express.Router();

/**
 * WHY SSE FOR ALERTS?
 * Alerts (low battery, motor overheat, geofence exit, firmware ready)
 * are SERVER -> CLIENT ONLY, low-frequency, and need to survive/auto-
 * reconnect through flaky mobile connections. SSE runs over plain HTTP
 * (works through corporate proxies/load balancers that sometimes choke
 * on WebSocket upgrades), the browser's EventSource auto-reconnects for
 * you with zero extra code, and each event can carry an `id:` so on
 * reconnect the browser sends `Last-Event-ID` and the server can resume
 * exactly where it left off. None of that reconnect/resume logic is
 * built into raw WebSockets — you'd hand-roll it.
 *
 * Rule of thumb used in this project:
 *   WebSocket -> live telemetry (fast, two-way, ephemeral)
 *   SSE       -> alerts/notifications (occasional, one-way, must-not-miss)
 */
router.get('/stream', (req, res) => {
  const user = verifyTokenFromQuery(req.query.token);
  if (!user) return res.status(401).end();

  // Required SSE headers. Note: no `res.json()` — SSE is a raw, long-lived
  // `text/event-stream` HTTP response that we write to manually.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no' // disable nginx buffering so events flush immediately
  });
  res.flushHeaders();

  // Tell the browser to wait 3s before auto-reconnecting if the connection drops.
  res.write('retry: 3000\n\n');

  const send = (event, data, id) => {
    if (id) res.write(`id: ${id}\n`);
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send('connected', { message: 'SSE stream open', userId: user.id });

  // Only forward alerts for vehicles this user actually owns.
  const onAlert = (alert) => {
    if (alert.ownerId !== user.id) return;
    send('alert', alert, alert.id);
  };
  eventBus.on('alert', onAlert);

  // Keep-alive comment every 20s so proxies/load balancers don't time out
  // an apparently-idle connection (comments start with ":" and are ignored
  // by EventSource, so they don't trigger onmessage on the client).
  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    eventBus.off('alert', onAlert);
  });
});

module.exports = router;
