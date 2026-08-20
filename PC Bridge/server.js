/**
 * FlightDeck PC Bridge Server
 * WebSocket server caching latest MSFS SimVars and broadcasting to connected clients.
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// In-memory cache of all received simulator variable values
let simStateCache = {
  AUTOPILOT_MASTER: 0,
  AUTOPILOT_FLIGHT_DIRECTOR_ACTIVE: 0,
  AUTOPILOT_YAW_DAMPER: 0,
  AUTOPILOT_THROTTLE_ARM: 0,
  AUTOPILOT_HEADING_LOCK: 0,
  AUTOPILOT_HEADING_LOCK_DIR: 360,
  AUTOPILOT_NAV1_LOCK: 0,
  AUTOPILOT_APPROACH_HOLD: 0,
  AUTOPILOT_BACKCOURSE_HOLD: 0,
  AUTOPILOT_ALTITUDE_LOCK: 0,
  AUTOPILOT_ALTITUDE_LOCK_VAR: 10000,
  AUTOPILOT_VERTICAL_HOLD: 0,
  AUTOPILOT_VERTICAL_HOLD_VAR: 0,
  AUTOPILOT_FLIGHT_LEVEL_CHANGE: 0,
  AUTOPILOT_AIRSPEED_HOLD: 0,
  AUTOPILOT_AIRSPEED_HOLD_VAR: 250,
  COM_ACTIVE_FREQUENCY_1: 121.500,
  COM_STANDBY_FREQUENCY_1: 118.000,
  COM_ACTIVE_FREQUENCY_2: 122.800,
  COM_STANDBY_FREQUENCY_2: 121.900,
  NAV_ACTIVE_FREQUENCY_1: 110.30,
  NAV_STANDBY_FREQUENCY_1: 108.00,
  TRANSPONDER_CODE_1: 1200,
};

/**
 * Broadcast payload to all connected clients
 */
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

/**
 * Update variable in cache and broadcast changes
 */
function updateSimVars(newVars) {
  Object.assign(simStateCache, newVars);
  broadcast({
    type: 'simData',
    data: newVars,
  });
}

wss.on('connection', (ws) => {
  console.log('[PC Bridge] Client connected. Sending initial state dump...');

  // Send current full cache immediately upon client connection
  ws.send(
    JSON.stringify({
      type: 'simData',
      data: simStateCache,
    })
  );

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);

      if (parsed.type === 'requestState') {
        ws.send(
          JSON.stringify({
            type: 'simData',
            data: simStateCache,
          })
        );
      } else if (parsed.type === 'event') {
        console.log(`[PC Bridge] Triggering SimConnect Event: ${parsed.name} (${parsed.value || 0})`);
        
        // Handle SimConnect event triggering logic here
        // (e.g., simconnect.trigger(parsed.name, parsed.value))
      }
    } catch (err) {
      console.error('[PC Bridge] Invalid incoming packet:', err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[PC Bridge] FlightDeck Server running on port ${PORT}`);
});

module.exports = { updateSimVars, simStateCache };