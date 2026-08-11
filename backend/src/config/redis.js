const { createClient } = require('redis');

const redisEnabled = process.env.REDIS_ENABLED !== 'false';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const currentStateTtlSeconds = Number(process.env.REDIS_CURRENT_STATE_TTL_SECONDS) || 60;

const client = createClient({ url: redisUrl });
let connectionWarningLogged = false;

client.on('error', (err) => {
  if (!connectionWarningLogged) {
    console.error(`[redis] ${err.message}`);
    connectionWarningLogged = true;
  }
});

async function connectRedis() {
  if (!redisEnabled || client.isOpen) return;

  try {
    await client.connect();
    connectionWarningLogged = false;
    console.log(`[redis] Connected to ${redisUrl}`);
  } catch (err) {
    console.error(`[redis] Unavailable; current-state storage disabled: ${err.message}`);
  }
}

function currentStateKey(vehicleId) {
  return `vehicle:${vehicleId}:current`;
}

async function setCurrentTelemetry(payload) {
  if (!redisEnabled || !client.isReady) return false;

  try {
    await client.setEx(
      currentStateKey(payload.vehicleId),
      currentStateTtlSeconds,
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    if (!connectionWarningLogged) {
      console.error(`[redis] Could not write current telemetry: ${err.message}`);
      connectionWarningLogged = true;
    }
    return false;
  }
}

async function getCurrentTelemetry(vehicleId) {
  if (!redisEnabled || !client.isReady) return null;

  try {
    const value = await client.get(currentStateKey(vehicleId));
    return value ? JSON.parse(value) : null;
  } catch (err) {
    if (!connectionWarningLogged) {
      console.error(`[redis] Could not read current telemetry: ${err.message}`);
      connectionWarningLogged = true;
    }
    return null;
  }
}

module.exports = { connectRedis, setCurrentTelemetry, getCurrentTelemetry };
