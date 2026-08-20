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

      simHandle.on('simObjectData', (recvSimObjectData) => {
        if (!recvSimObjectData || !recvSimObjectData.data) return;

        try {
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