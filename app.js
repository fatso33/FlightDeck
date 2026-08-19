import { renderRadiosPage, initRadiosEvents, updateRadioDisplays } from './pages/radios.js?v=210';

let ws = null;
let currentPage = 'radios';
let isMenuOpen = false;
let deferredPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((reg) => console.log('[PWA] Service Worker active with scope:', reg.scope))
      .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[PWA] 1-Tap install prompt captured and ready');
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] App successfully installed');
  deferredPrompt = null;
});

function updateProfileBadge(name) {
  if (!name) return;
  const badge = document.getElementById('aircraft-model');
  if (badge) {
    badge.innerText = name.trim().slice(0, 7).toUpperCase();
  }
}

function getBridgeHost() {
  const hostname = window.location.hostname;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');

  if (!isLocalHost) {
    let savedIp = localStorage.getItem('msfs_bridge_ip');
    if (!savedIp) {
      savedIp = prompt('Enter your PC Local IP address (e.g. 10.0.0.222):', '10.0.0.222');
      if (savedIp) {
        localStorage.setItem('msfs_bridge_ip', savedIp.trim());
      }
    }
    return `${savedIp || '10.0.0.222'}:3000`;
  }
  return `${hostname}:3000`;
}

const pages = {
  radios: {
    render: renderRadiosPage,
    init: initRadiosEvents
  },
  autopilot: {
    render: () => `
      <section class="garmin-card">
        <div class="section-title-center">AUTOPILOT</div>
        <p style="color: var(--text-dim); text-align:center; padding: 40px 10px; font-size: 14px;">Autopilot Panel Coming Soon</p>
      </section>
    `,
    init: () => {}
  },
  lights: {
    render: () => `
      <section class="garmin-card">
        <div class="section-title-center">AIRCRAFT LIGHTING</div>
        <p style="color: var(--text-dim); text-align:center; padding: 40px 10px; font-size: 14px;">Lighting Controls Coming Soon</p>
      </section>
    `,
    init: () => {}
  },
  settings: {
    render: () => {
      const currentIp = localStorage.getItem('msfs_bridge_ip') || '10.0.0.222';
      return `
        <section class="garmin-card">
          <div class="section-title-center">SETTINGS</div>
          <div style="display: flex; flex-direction: column; gap: 12px; padding: 10px 0;">
            <div class="modal-field">
              <label for="settings-ip-input">Bridge PC IP Address</label>
              <input type="text" id="settings-ip-input" value="${currentIp}" style="width: 100%;" />
            </div>
            <button id="save-ip-btn" class="btn-primary" style="margin-top: 4px;">Save & Reconnect</button>
          </div>
        </section>
      `;
    },
    init: () => {
      const saveBtn = document.getElementById('save-ip-btn');
      const ipInput = document.getElementById('settings-ip-input');
      if (saveBtn && ipInput) {
        saveBtn.addEventListener('click', () => {
          const val = ipInput.value.trim();
          if (val) {
            localStorage.setItem('msfs_bridge_ip', val);
            if (ws) ws.close();
            connectWebSocket();
            alert('Bridge IP updated. Reconnecting...');
          }
        });
      }
    }
  }
};

function connectWebSocket() {
  const bridgeHost = getBridgeHost();
  const wsUrl = `ws://${bridgeHost}`;
  
  if (ws) {
    try { ws.close(); } catch (e) {}
  }

  try {
    ws = new WebSocket(wsUrl);
  } catch (err) {
    console.error('[WS Error] Could not construct WebSocket:', err);
    return;
  }

  const simStatus = document.getElementById('sim-status');

  ws.onopen = () => {
    console.log('[WS] Connected to PC bridge at', wsUrl);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'SIM_STATUS') {
        if (data.connected) {
          simStatus.className = 'wifi-badge connected';
        } else {
          simStatus.className = 'wifi-badge disconnected';
        }
      } else if (data.type === 'PROFILE_STATE') {
        updateProfileBadge(data.profile_name);
      } else if (data.type === 'RADIO_STATE') {
        if (data.profile_name) {
          updateProfileBadge(data.profile_name);
        }
        if (currentPage === 'radios') {
          updateRadioDisplays(data);
        }
      }
    } catch (e) {
      console.error('[WS Error]', e);
    }
  };

  ws.onclose = () => {
    if (simStatus) simStatus.className = 'wifi-badge disconnected';
    setTimeout(connectWebSocket, 4000);
  };
}

export function sendSimCommand(category, event, value) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'SIM_COMMAND',
      category,
      event,
      value
    }));
  }
}

function switchPage(pageKey) {
  if (!pages[pageKey]) return;
  currentPage = pageKey;

  document.querySelectorAll('.menu-item-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageKey);
  });

  const content = document.getElementById('content-area');
  content.innerHTML = pages[pageKey].render();
  pages[pageKey].init();

  closeMenu();
}

function toggleMenu() {
  isMenuOpen = !isMenuOpen;
  const menuDropdown = document.getElementById('menu-dropdown');
  if (isMenuOpen) {
    menuDropdown.classList.add('open');
  } else {
    menuDropdown.classList.remove('open');
  }
}

function closeMenu() {
  isMenuOpen = false;
  const menuDropdown = document.getElementById('menu-dropdown');
  if (menuDropdown) {
    menuDropdown.classList.remove('open');
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('msfs_theme') || 'dark';
  applyTheme(savedTheme);

  const toggleCheckbox = document.getElementById('theme-toggle-checkbox');
  if (toggleCheckbox) {
    toggleCheckbox.checked = (savedTheme === 'light');
    toggleCheckbox.addEventListener('change', (e) => {
      const nextTheme = e.target.checked ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('msfs_theme', theme);

  const labelText = document.getElementById('theme-label-text');
  const icon = document.getElementById('theme-icon');

  if (theme === 'light') {
    if (labelText) labelText.textContent = 'Light Theme';
    if (icon) {
      icon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    }
  } else {
    if (labelText) labelText.textContent = 'Dark Theme';
    if (icon) {
      icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
  }
}

function initPwaInstall() {
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      closeMenu();

      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          deferredPrompt = null;
        }
      } else if (isIos) {
        document.getElementById('ios-install-modal')?.classList.remove('hidden');
      } else {
        if (window.matchMedia('(display-mode: standalone)').matches) {
          alert('Flight Deck is already running as an installed standalone app.');
        } else {
          alert('Ready to install: Tap Chrome\'s menu (⋮) -> "Install app".');
        }
      }
    });
  }

  document.getElementById('ios-install-done-btn')?.addEventListener('click', () => {
    document.getElementById('ios-install-modal')?.classList.add('hidden');
  });
}

document.getElementById('menu-toggle-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleMenu();
});

document.addEventListener('click', (e) => {
  if (isMenuOpen && !e.target.closest('#menu-dropdown') && !e.target.closest('#menu-toggle-btn')) {
    closeMenu();
  }
});

document.querySelectorAll('.menu-item-btn[data-page]').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initPwaInstall();
  switchPage('radios');
  setTimeout(connectWebSocket, 500);
});