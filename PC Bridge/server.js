import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { open, SimConnectConstants, DataType } from 'node-simconnect';
import { ProfileManager } from './profileManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const profileManager = new ProfileManager();

// Serve the web client app
const webClientPath = path.join(__dirname, '..');
app.use(express.static(webClientPath));
app.use(express.json());

// API Endpoints
app.get('/api/profiles', (req, res) => {
    res.json({
        profiles: profileManager.getAllProfiles(),
        activeProfile: profileManager.getActiveProfileId()
    });
});

app.post('/api/profiles/active', (req, res) => {
    const { profileId } = req.body;
    if (profileManager.setActiveProfile(profileId)) {
        res.json({ success: true, activeProfile: profileId });
        broadcast({
            type: 'PROFILES_LIST',
            data: {
                profiles: profileManager.getAllProfiles(),
                activeProfile: profileManager.getActiveProfileId()
            }
        });
    } else {
        res.status(404).json({ error: 'Profile not found' });
    }
});

// Broadcast helper
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// -------------------------------------------------------------
// SimConnect Integration
// -------------------------------------------------------------
let simConnect = null;
let isConnectedToSim = false;
let reconnectTimer = null;

const DEFINITION_ID = 1;
const REQUEST_ID = 1;

// Standardized MSFS SimConnect Variable list
// Verified SimConnect names and valid units
const SIM_VARS = [
    // Radios COM
    { name: 'COM ACTIVE FREQUENCY:1', unit: 'Megahertz', key: 'COM_ACTIVE_FREQUENCY:1' },
    { name: 'COM STANDBY FREQUENCY:1', unit: 'Megahertz', key: 'COM_STANDBY_FREQUENCY:1' },
    { name: 'COM ACTIVE FREQUENCY:2', unit: 'Megahertz', key: 'COM_ACTIVE_FREQUENCY:2' },
    { name: 'COM STANDBY FREQUENCY:2', unit: 'Megahertz', key: 'COM_STANDBY_FREQUENCY:2' },

    // Radios NAV
    { name: 'NAV ACTIVE FREQUENCY:1', unit: 'Megahertz', key: 'NAV_ACTIVE_FREQUENCY:1' },
    { name: 'NAV STANDBY FREQUENCY:1', unit: 'Megahertz', key: 'NAV_STANDBY_FREQUENCY:1' },
    { name: 'NAV ACTIVE FREQUENCY:2', unit: 'Megahertz', key: 'NAV_ACTIVE_FREQUENCY:2' },
    { name: 'NAV STANDBY FREQUENCY:2', unit: 'Megahertz', key: 'NAV_STANDBY_FREQUENCY:2' },

    // Transponder & Baro
    { name: 'TRANSPONDER CODE:1', unit: 'BCO16', key: 'TRANSPONDER_CODE:1' },
    { name: 'KOHLSMAN SETTING HG', unit: 'inHg', key: 'KOHLSMAN_SETTING_HG' },

    // Autopilot Masters & States
    { name: 'AUTOPILOT MASTER', unit: 'Bool', key: 'AUTOPILOT_MASTER' },
    { name: 'AUTOPILOT FLIGHT DIRECTOR ACTIVE', unit: 'Bool', key: 'AUTOPILOT_FLIGHT_DIRECTOR_ACTIVE' },
    { name: 'AUTOPILOT YAW DAMPER', unit: 'Bool', key: 'AUTOPILOT_YAW_DAMPER' },
    { name: 'AUTOPILOT THROTTLE ARM', unit: 'Bool', key: 'AUTOPILOT_THROTTLE_ARM' },

    // Autopilot Lateral Modes
    { name: 'AUTOPILOT HEADING LOCK', unit: 'Bool', key: 'AUTOPILOT_HEADING_LOCK' },
    { name: 'AUTOPILOT NAV1 LOCK', unit: 'Bool', key: 'AUTOPILOT_NAV1_LOCK' },
    { name: 'AUTOPILOT APPROACH HOLD', unit: 'Bool', key: 'AUTOPILOT_APPROACH_HOLD' },
    { name: 'AUTOPILOT BACKCOURSE HOLD', unit: 'Bool', key: 'AUTOPILOT_BACKCOURSE_HOLD' },

    // Autopilot Vertical Modes
    { name: 'AUTOPILOT ALTITUDE LOCK', unit: 'Bool', key: 'AUTOPILOT_ALTITUDE_LOCK' },
    { name: 'AUTOPILOT VERTICAL HOLD', unit: 'Bool', key: 'AUTOPILOT_VERTICAL_HOLD' },
    { name: 'AUTOPILOT FLIGHT LEVEL CHANGE', unit: 'Bool', key: 'AUTOPILOT_FLIGHT_LEVEL_CHANGE' },
    { name: 'AUTOPILOT GLIDESLOPE HOLD', unit: 'Bool', key: 'AUTOPILOT_GLIDESLOPE_HOLD' },

    // Autopilot Targets & Values
    { name: 'AUTOPILOT HEADING LOCK DIR', unit: 'Degrees', key: 'AUTOPILOT_HEADING_LOCK_DIR' },
    { name: 'AUTOPILOT ALTITUDE LOCK VAR', unit: 'Feet', key: 'AUTOPILOT_ALTITUDE_LOCK_VAR' },
    { name: 'AUTOPILOT VERTICAL HOLD VAR', unit: 'Feet per minute', key: 'AUTOPILOT_VERTICAL_HOLD_VAR' },
    { name: 'AUTOPILOT AIRSPEED HOLD VAR', unit: 'Knots', key: 'AUTOPILOT_AIRSPEED_HOLD_VAR' }
];

let eventIdCounter = 100;
const eventIdMap = new Map();

function getEventId(eventName) {
    if (!eventIdMap.has(eventName)) {
        eventIdMap.set(eventName, eventIdCounter++);
    }
    return eventIdMap.get(eventName);
}

function connectToSim() {
    if (isConnectedToSim || simConnect) return;

    console.log('[SimConnect] Connecting to MSFS...');

    open('FlightDeck Bridge', (handle, error) => {
        if (error) {
            console.log('[SimConnect] Connection failed. Retrying in 5s...');
            scheduleReconnect();
            return;
        }

        simConnect = handle;
        isConnectedToSim = true;
        console.log('[SimConnect] Connected to MSFS!');

        broadcast({
            type: 'SIM_STATUS',
            data: { connected: true }
        });

        setupDataDefinitions();
        setupEvents();

        simConnect.on('close', () => {
            console.log('[SimConnect] Connection closed.');
            cleanupSimConnect();
            scheduleReconnect();
        });

        simConnect.on('exception', (recvException) => {
            console.warn('[SimConnect Exception]:', recvException);
        });

        simConnect.on('simObjectDataByType', (recvSimObjectDataByType) => {
            if (recvSimObjectDataByType.requestID === REQUEST_ID) {
                const data = {};
                try {
                    const rawBuffer = recvSimObjectDataByType.data;
                    for (const variable of SIM_VARS) {
                        // Check if buffer has remaining readable bytes for Float64 (8 bytes)
                        if (rawBuffer.offset + 8 <= rawBuffer.buffer.length) {
                            const val = rawBuffer.readFloat64();
                            data[variable.key] = val;
                        }
                    }
                } catch (e) {
                    console.error('[SimConnect] Buffer decode error:', e);
                }

                if (Object.keys(data).length > 0) {
                    broadcast({
                        type: 'STATE_UPDATE',
                        data: data
                    });
                }
            }
        });

        // Request telemetry data every 200ms
        simConnect.requestDataOnSimObjectType(
            REQUEST_ID,
            DEFINITION_ID,
            0,
            SimConnectConstants.SIMOBJECT_TYPE_USER
        );
    });
}

function setupDataDefinitions() {
    if (!simConnect) return;

    for (const v of SIM_VARS) {
        simConnect.addToDataDefinition(
            DEFINITION_ID,
            v.name,
            v.unit,
            DataType.FLOAT64,
            0,
            SimConnectConstants.UNUSED
        );
    }
}

function setupEvents() {
    // Event definitions are bound dynamically in triggerEvent
}

function triggerEvent(eventName, value = 0) {
    if (!simConnect || !isConnectedToSim) {
        console.warn(`[SimConnect] Cannot trigger ${eventName}: Sim not connected.`);
        return;
    }

    const eventId = getEventId(eventName);
    simConnect.mapClientEventToSimEvent(eventId, eventName);
    simConnect.transmitClientEvent(
        SimConnectConstants.OBJECT_ID_USER,
        eventId,
        Number(value) || 0,
        SimConnectConstants.GROUP_PRIORITY_HIGHEST,
        SimConnectConstants.EVENT_FLAG_GROUPID_IS_PRIORITY
    );
}

function cleanupSimConnect() {
    isConnectedToSim = false;
    simConnect = null;
    broadcast({
        type: 'SIM_STATUS',
        data: { connected: false }
    });
}

function scheduleReconnect() {
    if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectToSim();
        }, 5000);
    }
}

// -------------------------------------------------------------
// WebSocket Client Handling
// -------------------------------------------------------------
wss.on('connection', (ws) => {
    // Send initial state to newly connected client
    ws.send(JSON.stringify({
        type: 'SIM_STATUS',
        data: { connected: isConnectedToSim }
    }));

    ws.send(JSON.stringify({
        type: 'PROFILES_LIST',
        data: {
            profiles: profileManager.getAllProfiles(),
            activeProfile: profileManager.getActiveProfileId()
        }
    }));

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message.toString());
            handleClientCommand(parsed);
        } catch (e) {
            console.error('[WebSocket] Error parsing message:', e);
        }
    });
});

function handleClientCommand(cmd) {
    switch (cmd.type) {
        case 'COMMAND':
            if (cmd.event) {
                triggerEvent(cmd.event, cmd.value);
            }
            break;

        case 'SET_PROFILE':
            if (cmd.data && cmd.data.profileId) {
                profileManager.setActiveProfile(cmd.data.profileId);
                broadcast({
                    type: 'PROFILES_LIST',
                    data: {
                        profiles: profileManager.getAllProfiles(),
                        activeProfile: profileManager.getActiveProfileId()
                    }
                });
            }
            break;

        case 'GET_PROFILES':
            broadcast({
                type: 'PROFILES_LIST',
                data: {
                    profiles: profileManager.getAllProfiles(),
                    activeProfile: profileManager.getActiveProfileId()
                }
            });
            break;
    }
}

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bridge Server] Running on http://localhost:${PORT}`);
    connectToSim();
});