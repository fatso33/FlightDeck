import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startBridgeServer, broadcastProfileChange } from './server.js';
import { profileManager } from './profileManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.platform === 'win32') {
  app.setAppUserModelId('com.flightdeck.bridge');
}

let mainWindow = null;
let configWindow = null;
let tray = null;
let currentUrl = 'http://localhost:3000';
let isSimConnected = false;

const taskbarIconPath = path.join(__dirname, 'icon.png');
let appTaskbarIcon = null;
try {
  appTaskbarIcon = nativeImage.createFromPath(taskbarIconPath);
} catch (err) {
  console.warn('[Icon] Could not load icon.png:', err);
}

let cachedIcons = {
  cyan: null,
  magenta: null
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 600,
    title: 'Flight Deck Bridge',
    icon: appTaskbarIcon,
    resizable: false,
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'bridge-ui.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createConfigWindow() {
  if (configWindow) {
    configWindow.show();
    configWindow.focus();
    return;
  }

  const currentIcon = isSimConnected ? cachedIcons.magenta : cachedIcons.cyan;

  configWindow = new BrowserWindow({
    width: 780,
    height: 750,
    title: 'Aircraft Profile Configuration',
    icon: currentIcon || appTaskbarIcon,
    resizable: true,
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  configWindow.setMenu(null);
  configWindow.loadFile(path.join(__dirname, 'config-ui.html'));

  configWindow.once('ready-to-show', () => {
    configWindow.show();
    configWindow.focus();
  });

  configWindow.on('closed', () => {
    configWindow = null;
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const profileMenuItems = profileManager.profiles.map(p => ({
    label: p.name,
    type: 'radio',
    checked: p.id === profileManager.activeProfileId,
    click: () => {
      profileManager.setActiveProfile(p.id);
      broadcastProfileChange();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status-update', { type: 'PROFILE_CHANGED', profile: p });
      }
      updateTrayMenu();
    }
  }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Flight Deck Bridge', enabled: false },
    { type: 'separator' },
    { label: 'Open Bridge Status', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: 'Aircraft Profiles / Config...', click: () => { createConfigWindow(); } },
    { type: 'separator' },
    { label: 'Active Profile', submenu: profileMenuItems },
    { type: 'separator' },
    { label: 'Quit Bridge', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setContextMenu(contextMenu);
}

function updateVisuals() {
  const activeIcon = isSimConnected ? cachedIcons.magenta : cachedIcons.cyan;
  if (!activeIcon || activeIcon.isEmpty()) return;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIcon(activeIcon);
  }

  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.setIcon(activeIcon);
  }

  if (tray) {
    tray.setImage(activeIcon.resize({ width: 16, height: 16 }));
    tray.setToolTip(isSimConnected ? 'Flight Deck Bridge - Connected to MSFS' : 'Flight Deck Bridge - Waiting for MSFS');
  }
}

ipcMain.on('register-dynamic-icons', (event, data) => {
  cachedIcons.cyan = nativeImage.createFromDataURL(data.cyan);
  cachedIcons.magenta = nativeImage.createFromDataURL(data.magenta);

  if (!tray) {
    const initialIcon = cachedIcons.cyan.resize({ width: 16, height: 16 });
    tray = new Tray(initialIcon);
    updateTrayMenu();

    tray.on('double-click', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  }

  updateVisuals();
});

ipcMain.on('get-profiles-data', (event) => {
  event.returnValue = {
    activeProfileId: profileManager.activeProfileId,
    profiles: profileManager.profiles
  };
});

ipcMain.on('set-active-profile', (event, profileId) => {
  profileManager.setActiveProfile(profileId);
  broadcastProfileChange();
  updateTrayMenu();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', { type: 'PROFILE_CHANGED', profile: profileManager.getActiveProfile() });
  }
});

ipcMain.on('save-profile', (event, profile) => {
  profileManager.saveProfile(profile);
  broadcastProfileChange();
  updateTrayMenu();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', { type: 'PROFILE_CHANGED', profile: profileManager.getActiveProfile() });
  }
});

ipcMain.on('delete-profile', (event, profileId) => {
  profileManager.deleteProfile(profileId);
  broadcastProfileChange();
  updateTrayMenu();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', { type: 'PROFILE_CHANGED', profile: profileManager.getActiveProfile() });
  }
});

ipcMain.on('open-config-window', () => {
  createConfigWindow();
});

ipcMain.on('close-config-window', () => {
  if (configWindow) {
    configWindow.close();
  }
});

app.whenReady().then(() => {
  createMainWindow();

  startBridgeServer((msg) => {
    if (msg.type === 'INIT') {
      currentUrl = msg.url;
    }
    if (msg.type === 'STATUS') {
      isSimConnected = msg.connected;
      updateVisuals();
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-update', msg);
    }
  });
});