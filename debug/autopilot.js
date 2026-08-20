import { sendSimCommand } from '../app.js';

// State holding current target selections and mode engagements
let apState = {
  // Master
  ap: false,
  at: false,
  fd: false,
  lvl: false,
  toga: false,
  yd: false,

  // Lateral
  hdg_mode: false,
  nav: false,
  bc: false,
  apr: false,

  // Vertical
  alt_mode: false,
  vnv: false,
  vs_mode: false,

  // Speed
  spd_mode: false,
  flc: false,

  // Digital target selections
  hdg: 360,
  crs: 360,
  alt: 5000,
  vs: 0,
  ias: 120
};

export function renderAutopilotPage() {
  return `
    <!-- MASTER SECTION -->
    <section class="garmin-card">
      <div class="section-title-center">AUTOPILOT MASTER</div>

      <div class="ap-master-toggle-row">
        <button id="ap-btn-master" class="ap-master-btn ${apState.ap ? 'active' : ''}">AP</button>
        <div id="ap-led-master" class="ap-led ${apState.ap ? 'on' : ''}"></div>
        <button id="ap-btn-at" class="ap-master-btn ${apState.at ? 'active' : ''}">AT</button>
      </div>

      <div class="ap-flex-row">
        <div class="ap-grid-2x2 ap-flex-2">
          <button id="ap-btn-fd" class="ap-mode-btn ${apState.fd ? 'active' : ''}">FD</button>
          <button id="ap-btn-lvl" class="ap-mode-btn ${apState.lvl ? 'active' : ''}">LVL</button>
          <button id="ap-btn-toga" class="ap-mode-btn ${apState.toga ? 'active' : ''}">TOGA</button>
          <button id="ap-btn-yd" class="ap-mode-btn ${apState.yd ? 'active' : ''}">YD</button>
        </div>
        <button id="ap-btn-disc" class="ap-disc-btn ap-flex-1">AP DISC</button>
      </div>
    </section>

    <!-- LATERAL NAVIGATION SECTION -->
    <section class="garmin-card">
      <div class="section-title-center">LATERAL NAVIGATION</div>

      <div class="ap-flex-row">
        <div class="ap-display-well ap-flex-2">
          <span class="field-label">HDG</span>
          <input type="text" inputmode="numeric" enterkeyhint="done" class="freq-value stby-box ap-display-input" id="ap-hdg-val" value="${formatHeading(apState.hdg)}" />
        </div>
        <div class="ap-grid-2x2 ap-flex-3">
          <button id="ap-btn-hdg-mode" class="ap-mode-btn ${apState.hdg_mode ? 'active' : ''}">HDG</button>
          <button id="ap-btn-nav" class="ap-mode-btn ${apState.nav ? 'active' : ''}">NAV</button>
          <button id="ap-btn-bc" class="ap-mode-btn ${apState.bc ? 'active' : ''}">BC</button>
          <button id="ap-btn-apr" class="ap-mode-btn ${apState.apr ? 'active' : ''}">APR</button>
        </div>
      </div>

      <div class="ap-sync-row">
        <div class="ap-display-well" style="flex:1;">
          <span class="field-label">CRS</span>
          <input type="text" inputmode="numeric" enterkeyhint="done" class="freq-value stby-box ap-display-input" id="ap-crs-val" value="${formatHeading(apState.crs)}" />
        </div>
        <button id="ap-btn-crs-sync" class="ap-sync-btn-lg">SYNC</button>
      </div>
    </section>

    <!-- VERTICAL NAVIGATION SECTION -->
    <section class="garmin-card">
      <div class="section-title-center">VERTICAL NAVIGATION</div>

      <div class="ap-flex-row">
        <div class="ap-display-well ap-flex-2">
          <span class="field-label">ALT</span>
          <input type="text" inputmode="numeric" enterkeyhint="done" class="freq-value stby-box ap-display-input" id="ap-alt-val" value="${apState.alt}" />
        </div>
        <div class="ap-grid-2x2 ap-flex-3">
          <button id="ap-btn-alt-mode" class="ap-mode-btn ${apState.alt_mode ? 'active' : ''}">ALT</button>
          <button class="ap-mode-btn ap-btn-unused" disabled aria-hidden="true"></button>
          <button id="ap-btn-vnv" class="ap-mode-btn ${apState.vnv ? 'active' : ''}">VNV</button>
          <button id="ap-btn-vs-mode" class="ap-mode-btn ${apState.vs_mode ? 'active' : ''}">VS</button>
        </div>
      </div>

      <div class="ap-flex-row">
        <div class="ap-display-well ap-flex-2">
          <span class="field-label">&nbsp;</span>
          <input type="text" inputmode="numeric" enterkeyhint="done" class="freq-value stby-box ap-display-input" id="ap-vs-val" value="${formatVerticalSpeed(apState.vs)}" />
        </div>
        <div class="vs-wheel ap-flex-3" id="vs-wheel" aria-label="Vertical Speed Scroll Wheel">
          <div class="vs-wheel-ticks" id="vs-wheel-ticks"></div>
          <div class="vs-wheel-indicator"></div>
        </div>
      </div>
    </section>

    <!-- SPEED SECTION -->
    <section class="garmin-card">
      <div class="section-title-center">AIRSPEED</div>

      <div class="ap-flex-row">
        <div class="ap-display-well ap-flex-2">
          <span class="field-label">IAS</span>
          <input type="text" inputmode="numeric" enterkeyhint="done" class="freq-value stby-box ap-display-input" id="ap-ias-val" value="${apState.ias}" />
        </div>
        <div class="ap-grid-2x2 ap-flex-3">
          <button id="ap-btn-spd-mode" class="ap-mode-btn ${apState.spd_mode ? 'active' : ''}">SPD</button>
          <button class="ap-mode-btn ap-btn-unused" disabled aria-hidden="true"></button>
          <button id="ap-btn-flc" class="ap-mode-btn ${apState.flc ? 'active' : ''}">FLC</button>
          <button class="ap-mode-btn ap-btn-unused" disabled aria-hidden="true"></button>
        </div>
      </div>
    </section>
  `;
}

export function formatHeading(val) {
  let num = parseInt(val, 10);
  if (isNaN(num)) return '000';
  num = ((num - 1) % 360 + 360) % 360 + 1;
  return String(num).padStart(3, '0');
}

export function formatVerticalSpeed(val) {
  const num = parseInt(val, 10);
  if (isNaN(num)) return '0';
  return (num > 0 ? `+${num}` : `${num}`);
}

export function updateAutopilotDisplays(data) {
  const isInputFocused = (id) => document.activeElement === document.getElementById(id);

  // Sync Mode Enunciations
  const modeMappings = {
    'ap-btn-master': data.ap_master,
    'ap-btn-at': data.ap_at,
    'ap-btn-fd': data.ap_fd,
    'ap-btn-lvl': data.ap_lvl,
    'ap-btn-toga': data.ap_toga,
    'ap-btn-yd': data.ap_yd,
    'ap-btn-hdg-mode': data.ap_hdg_mode,
    'ap-btn-nav': data.ap_nav_mode,
    'ap-btn-bc': data.ap_bc_mode,
    'ap-btn-apr': data.ap_apr_mode,
    'ap-btn-alt-mode': data.ap_alt_mode,
    'ap-btn-vnv': data.ap_vnv_mode,
    'ap-btn-vs-mode': data.ap_vs_mode,
    'ap-btn-spd-mode': data.ap_spd_mode,
    'ap-btn-flc': data.ap_flc_mode
  };

  const stateKeyMap = {
    'ap-btn-master': 'ap',
    'ap-btn-at': 'at',
    'ap-btn-fd': 'fd',
    'ap-btn-lvl': 'lvl',
    'ap-btn-toga': 'toga',
    'ap-btn-yd': 'yd',
    'ap-btn-hdg-mode': 'hdg_mode',
    'ap-btn-nav': 'nav',
    'ap-btn-bc': 'bc',
    'ap-btn-apr': 'apr',
    'ap-btn-alt-mode': 'alt_mode',
    'ap-btn-vnv': 'vnv',
    'ap-btn-vs-mode': 'vs_mode',
    'ap-btn-spd-mode': 'spd_mode',
    'ap-btn-flc': 'flc'
  };

  Object.entries(modeMappings).forEach(([btnId, stateVal]) => {
    if (stateVal !== undefined) {
      const key = stateKeyMap[btnId];
      if (key) apState[key] = !!stateVal;

      const btn = document.getElementById(btnId);
      if (btn) btn.classList.toggle('active', !!stateVal);
    }
  });

  // AP Master LED
  if (data.ap_master !== undefined) {
    const led = document.getElementById('ap-led-master');
    if (led) led.classList.toggle('on', !!data.ap_master);
  }

  // Sync Input Displays
  if (data.ap_hdg !== undefined && !isInputFocused('ap-hdg-val')) {
    apState.hdg = data.ap_hdg;
    const el = document.getElementById('ap-hdg-val');
    if (el) el.value = formatHeading(data.ap_hdg);
  }
  if (data.ap_crs !== undefined && !isInputFocused('ap-crs-val')) {
    apState.crs = data.ap_crs;
    const el = document.getElementById('ap-crs-val');
    if (el) el.value = formatHeading(data.ap_crs);
  }
  if (data.ap_alt !== undefined && !isInputFocused('ap-alt-val')) {
    apState.alt = data.ap_alt;
    const el = document.getElementById('ap-alt-val');
    if (el) el.value = data.ap_alt;
  }
  if (data.ap_vs !== undefined && !isInputFocused('ap-vs-val')) {
    apState.vs = data.ap_vs;
    const el = document.getElementById('ap-vs-val');
    if (el) el.value = formatVerticalSpeed(data.ap_vs);
  }
  if (data.ap_ias !== undefined && !isInputFocused('ap-ias-val')) {
    apState.ias = data.ap_ias;
    const el = document.getElementById('ap-ias-val');
    if (el) el.value = data.ap_ias;
  }
}

export function initAutopilotEvents() {
  // Simple toggle / trigger buttons (state confirmed back via telemetry)
  const buttonCommands = [
    { id: 'ap-btn-master', event: 'AP_MASTER' },
    { id: 'ap-btn-at', event: 'AUTO_THROTTLE_ARM' },
    { id: 'ap-btn-fd', event: 'TOGGLE_FLIGHT_DIRECTOR' },
    { id: 'ap-btn-lvl', event: 'AP_WING_LEVELER' },
    { id: 'ap-btn-toga', event: 'AP_TOGA' },
    { id: 'ap-btn-yd', event: 'YAW_DAMPER_TOGGLE' },
    { id: 'ap-btn-hdg-mode', event: 'AP_PANEL_HEADING_HOLD' },
    { id: 'ap-btn-nav', event: 'AP_NAV1_HOLD' },
    { id: 'ap-btn-bc', event: 'AP_BC_HOLD' },
    { id: 'ap-btn-apr', event: 'AP_APR_HOLD' },
    { id: 'ap-btn-alt-mode', event: 'AP_PANEL_ALTITUDE_HOLD' },
    { id: 'ap-btn-vnv', event: 'AP_PANEL_VNAV_HOLD' },
    { id: 'ap-btn-vs-mode', event: 'AP_PANEL_VS_HOLD' },
    { id: 'ap-btn-spd-mode', event: 'AP_PANEL_SPEED_HOLD' },
    { id: 'ap-btn-flc', event: 'FLIGHT_LEVEL_CHANGE' }
  ];

  buttonCommands.forEach(({ id, event }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        sendSimCommand('AUTOPILOT', event, 0);
      });
    }
  });

  // AP Disconnect - momentary, gives immediate local feedback
  const discBtn = document.getElementById('ap-btn-disc');
  if (discBtn) {
    discBtn.addEventListener('click', () => {
      sendSimCommand('AUTOPILOT', 'AUTOPILOT_DISENGAGE_TOGGLE', 0);
      apState.ap = false;
      const masterBtn = document.getElementById('ap-btn-master');
      if (masterBtn) masterBtn.classList.remove('active');
      const led = document.getElementById('ap-led-master');
      if (led) led.classList.remove('on');
    });
  }

  // CRS Sync
  const crsSyncBtn = document.getElementById('ap-btn-crs-sync');
  if (crsSyncBtn) {
    crsSyncBtn.addEventListener('click', () => {
      sendSimCommand('AUTOPILOT', 'VOR1_SET', 0);
    });
  }

  // Direct Input Listeners
  attachDirectInput('ap-hdg-val', 'hdg', 'HEADING_BUG_SET', (v) => formatHeading(v), 1, 360);
  attachDirectInput('ap-crs-val', 'crs', 'VOR1_SET', (v) => formatHeading(v), 1, 360);
  attachDirectInput('ap-alt-val', 'alt', 'AP_ALT_VAR_SET_ENGLISH', (v) => String(v), 0, 60000);
  attachDirectInput('ap-vs-val', 'vs', 'AP_VS_VAR_SET_ENGLISH', (v) => formatVerticalSpeed(v), -6000, 6000);
  attachDirectInput('ap-ias-val', 'ias', 'AP_SPD_VAR_SET', (v) => String(v), 0, 500);

  initVsWheel();
}

function attachDirectInput(id, stateKey, eventName, formatter, min, max) {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener('focus', () => el.select());

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.blur();
    }
  });

  el.addEventListener('blur', () => {
    let val = parseInt(el.value.replace(/[^0-9-]/g, ''), 10);
    if (isNaN(val)) {
      el.value = formatter(apState[stateKey]);
      return;
    }

    if (min !== undefined && max !== undefined) {
      if (stateKey === 'hdg' || stateKey === 'crs') {
        val = ((val - 1) % 360 + 360) % 360 + 1;
      } else {
        val = Math.max(min, Math.min(max, val));
      }
    }

    apState[stateKey] = val;
    el.value = formatter(val);
    sendSimCommand('AUTOPILOT', eventName, val);
  });
}

// Garmin-style horizontal scroll wheel for Vertical Speed
function initVsWheel() {
  const wheel = document.getElementById('vs-wheel');
  const ticks = document.getElementById('vs-wheel-ticks');
  if (!wheel || !ticks) return;

  const PX_PER_STEP = 24; // drag distance (px) required per 100 fpm step
  let dragging = false;
  let lastX = 0;
  let accumulated = 0;
  let tickOffset = 0;

  function updateVsValue(newVal) {
    newVal = Math.max(-6000, Math.min(6000, newVal));
    if (newVal === apState.vs) return;
    apState.vs = newVal;
    const el = document.getElementById('ap-vs-val');
    if (el) el.value = formatVerticalSpeed(newVal);
    sendSimCommand('AUTOPILOT', 'AP_VS_VAR_SET_ENGLISH', newVal);
  }

  function onPointerDown(e) {
    dragging = true;
    lastX = e.clientX;
    accumulated = 0;
    wheel.classList.add('dragging');
    try { wheel.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;

    tickOffset += dx;
    ticks.style.backgroundPosition = `${tickOffset}px 0`;

    accumulated += dx;
    while (accumulated >= PX_PER_STEP) {
      updateVsValue(apState.vs + 100);
      accumulated -= PX_PER_STEP;
    }
    while (accumulated <= -PX_PER_STEP) {
      updateVsValue(apState.vs - 100);
      accumulated += PX_PER_STEP;
    }
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    wheel.classList.remove('dragging');
    try { wheel.releasePointerCapture(e.pointerId); } catch (err) {}
  }

  wheel.addEventListener('pointerdown', onPointerDown);
  wheel.addEventListener('pointermove', onPointerMove);
  wheel.addEventListener('pointerup', onPointerUp);
  wheel.addEventListener('pointercancel', onPointerUp);
  wheel.addEventListener('pointerleave', (e) => { if (dragging) onPointerUp(e); });
}
