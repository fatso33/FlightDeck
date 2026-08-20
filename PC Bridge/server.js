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

// Autopilot telemetry is split across THREE independent data definitions
// instead of one big one. SimConnect rejects an ENTIRE data definition if
// even a single variable inside it is unrecognized by the sim/aircraft -
// silently, with no thrown error, just no data ever arriving for that
// definition. Splitting into core / secondary / vnav means a rejected
// variable in one group can't take down telemetry for the others.
const DEFINITION_AP_CORE = 2;   // Long-standing, well-documented SimVars
const REQUEST_AP_CORE = 2;
const DEFINITION_AP_EXT = 3;    // AT / LVL / TOGA - present on most aircraft but less universal
const REQUEST_AP_EXT = 3;
const DEFINITION_AP_VNAV = 4;   // VNAV - least standardized, isolated on its own
const REQUEST_AP_VNAV = 4;

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

      // ---- AUTOPILOT telemetry definitions ----
      // Split into 3 independent definitions on purpose. If ANY single
      // variable below is unrecognized by the sim/aircraft, MSFS silently
      // rejects the WHOLE data definition it belongs to - no thrown error,
      // just no data ever arriving for that request. Splitting into groups
      // means a rejected variable only takes out its own small group
      // instead of killing every autopilot field on the page.

      // Group 1 (CORE): long-standing, well-documented SimVars. High
      // confidence these work on virtually any aircraft.
      try {
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT MASTER', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT FLIGHT DIRECTOR ACTIVE', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT YAW DAMPER', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT HEADING LOCK', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT NAV1 LOCK', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT BACKCOURSE HOLD', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT APPROACH HOLD', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT ALTITUDE LOCK', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT VERTICAL HOLD', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT AIRSPEED HOLD', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT FLIGHT LEVEL CHANGE', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT HEADING LOCK DIR', 'Degrees', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'NAV OBS:1', 'Degrees', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT ALTITUDE LOCK VAR', 'Feet', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT VERTICAL HOLD VAR', 'Feet per minute', SimConnectDataType.FLOAT64);
        simHandle.addToDataDefinition(DEFINITION_AP_CORE, 'AUTOPILOT AIRSPEED HOLD VAR', 'Knots', SimConnectDataType.FLOAT64);

        setTimeout(() => {
          if (isConnectedToSim && simHandle) {
            simHandle.requestDataOnSimObject(
              REQUEST_AP_CORE,
              DEFINITION_AP_CORE,
              SimConnectConstants.OBJECT_ID_USER,
              SimConnectPeriod.SIM_FRAME,
              1
            );
          }
        }, 300);
      } catch (err) {
        console.error('[SimConnect] Error registering AP core data definition:', err);
      }

      // Group 2 (EXT): present on most aircraft but less universally
      // standardized than group 1. On complex/study-level add-ons (custom
      // avionics suites like Working Title G3000/CJ4, Airbus/FBW-style FMS
      // platforms) these may only exist as aircraft-specific "L:" variables
      // instead of the stock SimVar. If AT/LVL/TOGA don't light up on a
      // given aircraft, use a SimVar/LVar spy tool (e.g. the MobiFlight WASM
      // module, or FSUIPC's variable browser) to find the correct variable
      // and swap it in below - it's isolated from group 1 so it can't break
      // the rest of the page even if wrong.
      try {
        simHandle.addToDataDefinition(DEFINITION_AP_EXT, 'AUTOPILOT THROTTLE ARM', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_EXT, 'AUTOPILOT WING LEVELER', 'Bool', SimConnectDataType.INT32);
        simHandle.addToDataDefinition(DEFINITION_AP_EXT, 'AUTOPILOT TAKEOFF POWER ACTIVE', 'Bool', SimConnectDataType.INT32);

        setTimeout(() => {
          if (isConnectedToSim && simHandle) {
            simHandle.requestDataOnSimObject(
              REQUEST_AP_EXT,
              DEFINITION_AP_EXT,
              SimConnectConstants.OBJECT_ID_USER,
              SimConnectPeriod.SIM_FRAME,
              1
            );
          }
        }, 300);
      } catch (err) {
        console.error('[SimConnect] Error registering AP ext data definition:', err);
      }

      // Group 3 (VNAV): isolated on its own because it's the least
      // standardized of the bunch and the prime suspect if the whole
      // autopilot definition was previously getting rejected outright. If
      // this variable turns out to be invalid, only the VNV button fails
      // to reflect live state - nothing else on the page is affected.
      try {
        simHandle.addToDataDefinition(DEFINITION_AP_VNAV, 'AUTOPILOT VNAV ACTIVE', 'Bool', SimConnectDataType.INT32);

        setTimeout(() => {
          if (isConnectedToSim && simHandle) {
            simHandle.requestDataOnSimObject(
              REQUEST_AP_VNAV,
              DEFINITION_AP_VNAV,
              SimConnectConstants.OBJECT_ID_USER,
              SimConnectPeriod.SIM_FRAME,
              1
            );
          }
        }, 300);
      } catch (err) {
        console.error('[SimConnect] Error registering AP vnav data definition:', err);
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

          } else if (recvSimObjectData.requestID === REQUEST_AP_CORE) {
            const buf = recvSimObjectData.data;

            const apMaster = buf.readInt32();
            const apFd = buf.readInt32();
            const apYd = buf.readInt32();
            const apHdgMode = buf.readInt32();
            const apNavMode = buf.readInt32();
            const apBcMode = buf.readInt32();
            const apAprMode = buf.readInt32();
            const apAltMode = buf.readInt32();
            const apVsMode = buf.readInt32();
            const apSpdMode = buf.readInt32();
            const apFlcMode = buf.readInt32();
            const apHdg = buf.readFloat64();
            const apCrs = buf.readFloat64();
            const apAlt = buf.readFloat64();
            const apVs = buf.readFloat64();
            const apIas = buf.readFloat64();

            broadcastToClients({
              type: 'AUTOPILOT_STATE',
              ap_master: !!apMaster,
              ap_fd: !!apFd,
              ap_yd: !!apYd,
              ap_hdg_mode: !!apHdgMode,
              ap_nav_mode: !!apNavMode,
              ap_bc_mode: !!apBcMode,
              ap_apr_mode: !!apAprMode,
              ap_alt_mode: !!apAltMode,
              ap_vs_mode: !!apVsMode,
              ap_spd_mode: !!apSpdMode,
              ap_flc_mode: !!apFlcMode,
              ap_hdg: Math.round(apHdg),
              ap_crs: Math.round(apCrs),
              ap_alt: Math.round(apAlt),
              ap_vs: Math.round(apVs),
              ap_ias: Math.round(apIas)
            });

          } else if (recvSimObjectData.requestID === REQUEST_AP_EXT) {
            const buf = recvSimObjectData.data;

            const apAt = buf.readInt32();
            const apLvl = buf.readInt32();
            const apToga = buf.readInt32();

            broadcastToClients({
              type: 'AUTOPILOT_STATE',
              ap_at: !!apAt,
              ap_lvl: !!apLvl,
              ap_toga: !!apToga
            });

          } else if (recvSimObjectData.requestID === REQUEST_AP_VNAV) {
            const buf = recvSimObjectData.data;
            const apVnvMode = buf.readInt32();

            broadcastToClients({
              type: 'AUTOPILOT_STATE',
              ap_vnv_mode: !!apVnvMode
            });
          }
        } catch (e) {
          console.error('[SimConnect] Buffer decode error:', e);
        }
      });

      simHandle.on('exception', (e) => {
        // Logs the raw exception object (typically includes an exception
        // code and the send ID it relates to) so a rejected variable name
        // can actually be diagnosed from the bridge app's console/terminal
        // output instead of failing silently.
        console.warn('[SimConnect Exception]:', JSON.stringify(e));
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
          REQUEST_AP_CORE,
          DEFINITION_AP_CORE,
          SimConnectConstants.OBJECT_ID_USER,
          SimConnectPeriod.ONCE
        );
        simHandle.requestDataOnSimObject(
          REQUEST_AP_EXT,
          DEFINITION_AP_EXT,
          SimConnectConstants.OBJECT_ID_USER,
          SimConnectPeriod.ONCE
        );
        simHandle.requestDataOnSimObject(
          REQUEST_AP_VNAV,
          DEFINITION_AP_VNAV,
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
