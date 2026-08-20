import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import simconnectPkg from 'node-simconnect';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { profileManager } from './profileManager.js';

const {
  open,
  Protocol,
  SimConnectDataType,
  SimConnectConstants,
  SimConnectPeriod
} = simconnectPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// SimConnect IDs
const DEFINITION_RADIO = 1;
const REQUEST_RADIO = 1;
const DEFINITION_AUTOPILOT = 2;
const REQUEST_AUTOPILOT = 2;

let nextEventId = 1000;
const eventMap = new Map();
let globalWss = null;

function getActiveProfileName() {
  const activeProfile = profileManager.getActiveProfile();
  return activeProfile ? activeProfile.name : 'DEFAULT';
}

export function broadcastProfileChange() {
  if (!globalWss) return;
  const profileName = getActiveProfileName();
  const msg = JSON.stringify({ 
    type: 'PROFILE_STATE', 
    profile_name: profileName 
  });
  globalWss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

export function startBridgeServer(onStatusCallback) {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  globalWss = wss;

  app.use(express.static(path.join(__dirname, 'public')));

  let simHandle = null;
  let isConnectedToSim = false;

  function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  function formatMhz(val, decimals = 3) {
    if (val === undefined || val === null || isNaN(val) || val === 0) return null;
    let num = Number(val);
    if (num > 1000000) {
      num = num / 1000000;
    }
    return num.toFixed(decimals);
  }

  function getEventId(eventName) {
    if (eventMap.has(eventName)) {
      return eventMap.get(eventName);
    }
    const id = nextEventId++;
    if (simHandle) {
      try {
        simHandle.mapClientEventToSimEvent(id, eventName);
        eventMap.set(eventName, id);
      } catch (err) {
        console.error(`[SimConnect] Failed to map event ${eventName}:`, err);
      }
    }
    return id;
  }

  async function connectToMSFS() {
    try {
      console.log('[SimConnect] Connecting to MSFS...');
      const connection = await open('MSFSControllerBridge', Protocol.FSX_SP2);
      simHandle = connection.handle;
      isConnectedToSim = true;
      eventMap.clear();

      onStatusCallback({ type: 'STATUS', connected: true });
      broadcastToClients({ type: 'SIM_STATUS', connected: true });

      try {
        simHandle.addToDataDefinition(DEFINITION_RADIO, 'COM ACTIVE FREQUENCY:1', 'Megahertz', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_RADIO, 'COM STANDBY FREQUENCY:1', 'Megahertz', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_RADIO, 'COM ACTIVE FREQUENCY:2', 'Megahertz', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_RADIO, 'COM STANDBY FREQUENCY:2', 'Megahertz', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_RADIO, 'NAV ACTIVE FREQUENCY:1', 'Megahertz', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_RADIO, 'NAV STANDBY FREQUENCY:1', 'Megahertz', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_RADIO, 'NAV ACTIVE FREQUENCY:2', 'Megahertz', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_RADIO, 'NAV STANDBY FREQUENCY:2', 'Megahertz', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_RADIO, 'TRANSPONDER CODE:1', 'BCO16', SimConnectDataType.INT32);

        setTimeout(() => {
          if (isConnectedToSim && simHandle) {
            simHandle.requestDataOnSimObject(
              REQUEST_RADIO,
              DEFINITION_RADIO,
              SimConnectConstants.OBJECT_ID_USER,
              SimConnectPeriod.SIM_FRAME,
              1
            );
          }
        }, 300);

      } catch (err) {
        console.error('[SimConnect] Error registering data definition:', err);
      }

      // ---- AUTOPILOT telemetry definition ----
      // NOTE: AUTOPILOT MASTER / HEADING LOCK / ALTITUDE LOCK / VERTICAL HOLD /
      // AIRSPEED HOLD / NAV1 LOCK / APPROACH HOLD / BACKCOURSE HOLD / FLIGHT
      // LEVEL CHANGE / YAW DAMPER are standard MSFS SimVars and should work on
      // most default and payware aircraft. AT / LVL / TOGA / VNV are less
      // universally standardized (some complex/study-level aircraft, including
      // many add-ons using custom avionics suites like Working Title G3000/CJ4
      // or Airbus/embedded FMS platforms, expose these only via aircraft-specific
      // "L:" variables rather than the stock SimVar). If those four buttons don't
      // light up correctly on a given aircraft, use a SimVar/LVar spy tool
      // (e.g. the MobiFlight WASM module, or FSUIPC's variable browser) to find
      // the correct variable for that aircraft and swap it into the
      // addToDataDefinition calls below.
      try {
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT MASTER', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT THROTTLE ARM', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT FLIGHT DIRECTOR ACTIVE', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT WING LEVELER', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT TAKEOFF POWER ACTIVE', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT YAW DAMPER', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT HEADING LOCK', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT NAV1 LOCK', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT BACKCOURSE HOLD', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT APPROACH HOLD', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT ALTITUDE LOCK', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT VNAV ACTIVE', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT VERTICAL HOLD', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT AIRSPEED HOLD', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT FLIGHT LEVEL CHANGE', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT HEADING LOCK DIR', 'Degrees', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'NAV OBS:1', 'Degrees', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT ALTITUDE LOCK VAR', 'Feet', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT VERTICAL HOLD VAR', 'Feet per minute', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_AUTOPILOT, 'AUTOPILOT AIRSPEED HOLD VAR', 'Knots', SimConnectDataType.FLOAT64);

        setTimeout(() => {
          if (isConnectedToSim && simHandle) {
            simHandle.requestDataOnSimObject(
              REQUEST_AUTOPILOT,
              DEFINITION_AUTOPILOT,
              SimConnectConstants.OBJECT_ID_USER,
              SimConnectPeriod.SIM_FRAME,
              1
            );
          }
        }, 300);

      } catch (err) {
        console.error('[SimConnect] Error registering autopilot data definition:', err);
      }

      simHandle.on('simObjectData', (recvSimObjectData) => {
        if (!recvSimObjectData || !recvSimObjectData.data) return;

        try {
          if (recvSimObjectData.requestID === REQUEST_RADIO) {
            const buf = recvSimObjectData.data;

            const com1Act = buf.readFloat64();
            const com1Stby = buf.readFloat64();
            const com2Act = buf.readFloat64();
            const com2Stby = buf.readFloat64();
            const nav1Act = buf.readFloat64();
            const nav1Stby = buf.readFloat64();
            const nav2Act = buf.readFloat64();
            const nav2Stby = buf.readFloat64();
            const xpndrRaw = buf.readInt32();

            // Convert BCO16 (hex representation of octal squawk) to clean 4-digit string
            const xpndrCode = (xpndrRaw >>> 0).toString(16).padStart(4, '0');

            const payload = {
              type: 'RADIO_STATE',
              com1_act: formatMhz(com1Act, 3),
              com1_stby: formatMhz(com1Stby, 3),
              com2_act: formatMhz(com2Act, 3),
              com2_stby: formatMhz(com2Stby, 3),
              nav1_act: formatMhz(nav1Act, 2),
              nav1_stby: formatMhz(nav1Stby, 2),
              nav2_act: formatMhz(nav2Act, 2),
              nav2_stby: formatMhz(nav2Stby, 2),
              xpndr: xpndrCode,
              profile_name: getActiveProfileName()
            };

            broadcastToClients(payload);

          } else if (recvSimObjectData.requestID === REQUEST_AUTOPILOT) {
            const buf = recvSimObjectData.data;

            const apMaster = buf.readInt32();
            const apAt = buf.readInt32();
            const apFd = buf.readInt32();
            const apLvl = buf.readInt32();
            const apToga = buf.readInt32();
            const apYd = buf.readInt32();
            const apHdgMode = buf.readInt32();
            const apNavMode = buf.readInt32();
            const apBcMode = buf.readInt32();
            const apAprMode = buf.readInt32();
            const apAltMode = buf.readInt32();
            const apVnvMode = buf.readInt32();
            const apVsMode = buf.readInt32();
            const apSpdMode = buf.readInt32();
            const apFlcMode = buf.readInt32();
            const apHdg = buf.readFloat64();
            const apCrs = buf.readFloat64();
            const apAlt = buf.readFloat64();
            const apVs = buf.readFloat64();
            const apIas = buf.readFloat64();

            const payload = {
              type: 'AUTOPILOT_STATE',
              ap_master: !!apMaster,
              ap_at: !!apAt,
              ap_fd: !!apFd,
              ap_lvl: !!apLvl,
              ap_toga: !!apToga,
              ap_yd: !!apYd,
              ap_hdg_mode: !!apHdgMode,
              ap_nav_mode: !!apNavMode,
              ap_bc_mode: !!apBcMode,
              ap_apr_mode: !!apAprMode,
              ap_alt_mode: !!apAltMode,
              ap_vnv_mode: !!apVnvMode,
              ap_vs_mode: !!apVsMode,
              ap_spd_mode: !!apSpdMode,
              ap_flc_mode: !!apFlcMode,
              ap_hdg: Math.round(apHdg),
              ap_crs: Math.round(apCrs),
              ap_alt: Math.round(apAlt),
              ap_vs: Math.round(apVs),
              ap_ias: Math.round(apIas)
            };

            broadcastToClients(payload);
          }
        } catch (e) {
          console.error('[SimConnect] Buffer decode error:', e);
        }
      });

      simHandle.on('exception', (e) => {
        console.warn('[SimConnect Exception]:', e);
      });

      simHandle.on('close', () => {
        console.log('[SimConnect] Connection closed.');
        isConnectedToSim = false;
        simHandle = null;
        onStatusCallback({ type: 'STATUS', connected: false });
        broadcastToClients({ type: 'SIM_STATUS', connected: false });
        setTimeout(connectToMSFS, 5000);
      });

    } catch (err) {
      isConnectedToSim = false;
      simHandle = null;
      onStatusCallback({ type: 'STATUS', connected: false });
      setTimeout(connectToMSFS, 5000);
    }
  }

  function dispatchSimEvent(payload) {
    const rawAction = payload.event;
    const rawValue = payload.value;

    const profile = profileManager.getActiveProfile();
    const mapping = profile.mappings[rawAction] || { event: rawAction, valueFormat: 'RAW_INT' };

    const targetEvent = mapping.event;
    const finalValue = profileManager.transformValue(mapping.valueFormat, rawValue);

    onStatusCallback({
      type: 'COMMAND',
      command: `[${profile.name}] ${rawAction} → ${targetEvent} (${finalValue})`,
      timestamp: new Date().toLocaleTimeString()
    });

    if (isConnectedToSim && simHandle) {
      try {
        const eventId = getEventId(targetEvent);

        simHandle.transmitClientEvent(
          SimConnectConstants.OBJECT_ID_USER,
          eventId,
          finalValue,
          SimConnectConstants.GROUP_PRIORITY_HIGHEST || 1,
          16
        );
      } catch (err) {
        console.error('[Bridge] Command execution failed:', err);
      }
    }
  }

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'SIM_STATUS', connected: isConnectedToSim }));
    ws.send(JSON.stringify({ type: 'PROFILE_STATE', profile_name: getActiveProfileName() }));

    if (isConnectedToSim && simHandle) {
      try {
        simHandle.requestDataOnSimObject(
          REQUEST_RADIO,
          DEFINITION_RADIO,
          SimConnectConstants.OBJECT_ID_USER,
          SimConnectPeriod.ONCE
        );
        simHandle.requestDataOnSimObject(
          REQUEST_AUTOPILOT,
          DEFINITION_AUTOPILOT,
          SimConnectConstants.OBJECT_ID_USER,
          SimConnectPeriod.ONCE
        );
      } catch {}
    }

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'SIM_COMMAND') {
          dispatchSimEvent(data);
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    });
  });

  function broadcastToClients(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) c.send(msg);
    });
  }

  const httpServer = server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`[Bridge Server] Running on http://${ip}:${PORT}`);
    onStatusCallback({ type: 'INIT', url: `http://${ip}:${PORT}` });
    connectToMSFS();
  });

  return { server: httpServer, wss };
}
