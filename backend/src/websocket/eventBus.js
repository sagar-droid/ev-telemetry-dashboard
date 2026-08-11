const { EventEmitter } = require('events');

// One shared bus for the whole backend process.
// - telemetrySimulator EMITS 'telemetry' and 'alert' events
// - websocket/server.js LISTENS for 'telemetry' -> pushes to WS clients
// - sse/events.js LISTENS for 'alert' -> pushes to SSE clients
// This keeps the "data producer" decoupled from the "transport" — later
// you can swap the simulator for real MQTT/BLE messages from actual bikes
// without touching the WebSocket or SSE code at all.
const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

module.exports = eventBus;
