const { WebSocketServer } = require('ws');
const url = require('url');
const { verifyTokenFromQuery } = require('../middleware/auth');
const pool = require('../config/db');
const eventBus = require('./eventBus');

/**
 * WHY WEBSOCKET FOR TELEMETRY?
 * Telemetry (speed, battery %, GPS, motor temp) is BIDIRECTIONAL-capable,
 * high-frequency (every 1-2s), and low-latency sensitive — a WebSocket
 * gives us one persistent, full-duplex TCP connection instead of the
 * client polling a REST endpoint every second (wasteful) or us needing
 * one-way-only streaming (SSE would work for the display, but WS also
 * lets the client SEND commands back down the same socket later, e.g.
 * "lock bike", "honk horn", "start climate pre-conditioning").
 *
 * Rooms: clients subscribe to a specific vehicleId, so we don't broadcast
 * every bike's data to every connected browser.
 */
function attachWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Map<vehicleId, Set<ws>> — simple in-memory "room" registry.
  // For multi-instance deployments (>1 Node process) you'd back this with
  // Redis pub/sub instead of an in-memory Map so all instances stay in sync.
  const rooms = new Map();

  function joinRoom(vehicleId, ws) {
    if (!rooms.has(vehicleId)) rooms.set(vehicleId, new Set());
    rooms.get(vehicleId).add(ws);
  }

  function leaveRoom(vehicleId, ws) {
    rooms.get(vehicleId)?.delete(ws);
    if (rooms.get(vehicleId)?.size === 0) rooms.delete(vehicleId);
  }

  // Upgrade HTTP -> WebSocket manually so we can auth BEFORE accepting
  // the connection (reject bad tokens with a proper HTTP status instead
  // of accepting then closing, which some proxies handle badly).
  httpServer.on('upgrade', async (req, socket, head) => {
    const { pathname, query } = url.parse(req.url, true);

    if (pathname !== '/ws/live') {
      socket.destroy();
      return;
    }

    const user = verifyTokenFromQuery(query.token);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const ownership = user.role === 'owner' ? 'AND owner_id = ?' : '';
    const params = user.role === 'owner' ? [query.vehicleId, user.id] : [query.vehicleId];
    const [vehicles] = await pool.query(
      `SELECT id FROM vehicles WHERE id = ? ${ownership}`,
      params
    );
    if (!vehicles.length) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.vehicleId = String(query.vehicleId || '');
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    if (!ws.vehicleId) {
      ws.close(4000, 'vehicleId query param required');
      return;
    }

    joinRoom(ws.vehicleId, ws);
    ws.isAlive = true;

    ws.send(JSON.stringify({ type: 'connected', vehicleId: ws.vehicleId }));

    // Client -> Server messages: e.g. { "type": "command", "action": "honk" }
    // This is the bidirectional part REST/SSE can't do on the same channel.
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          ws.isAlive = true;
          return;
        }
        if (msg.type === 'command') {
          console.log(`[WS] command "${msg.action}" for vehicle ${ws.vehicleId} from user ${ws.user.id}`);
          // In a real system you'd publish this to the bike (MQTT topic, etc.)
          ws.send(JSON.stringify({ type: 'command_ack', action: msg.action }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'invalid message format' }));
      }
    });

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => leaveRoom(ws.vehicleId, ws));
  });

  // Heartbeat: terminate dead connections (client's laptop slept, wifi
  // dropped without a clean close, etc.) so `rooms` doesn't leak sockets.
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  wss.on('close', () => clearInterval(heartbeat));

  // Listen for telemetry produced anywhere in the app (simulator or, later,
  // real bikes) and fan it out only to clients watching that vehicle.
  eventBus.on('telemetry', (payload) => {
    const room = rooms.get(String(payload.vehicleId));
    if (!room || room.size === 0) return;

    const message = JSON.stringify({ type: 'telemetry', data: payload });
    for (const client of room) {
      if (client.readyState === client.OPEN) client.send(message);
    }
  });

  return wss;
}

module.exports = { attachWebSocketServer };
