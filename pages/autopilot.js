import { sendSimCommand } from '../app.js';

// State holding current target selections and mode engagements
let apState = {
  // Master & Modes
  master: false,
  fd: false,
  yd: false,
  nav: false,
  apr: false,
  hdg_mode: false,
  alt_mode: false,
  vs_mode: false,
  flc_mode: false,
  bc: false,

  // Digital target selections
  hdg: 360,
  alt: 5000,
  vs: 0,
  ias: 120,
  crs1: 360,
  crs2: 360
};

export function renderAutopilotPage() {
  return `
    <!-- AUTOPILOT MASTER & LATERAL MODES -->
    <section class="garmin-card">
      <div class="section-title-center">AUTOPILOT MODES</div>

      <!-- Master Engagements Row -->
      <div class="ap-btn-grid ap-btn-grid-3">
        <button id="ap-btn-master" class="ap-mode-btn ${apState.master ? 'active' : ''}">AP</button>
        <button id="ap-btn-fd" class="ap-mode-btn ${apState.fd ? 'active' : ''}">FD</button>
        <button id="ap-btn-yd" class="ap-mode-btn ${apState.yd ? 'active' : ''}">YD</button>
      </div>

      <!-- Lateral / Navigation Modes -->
      <div class="ap-btn-grid ap-btn-grid-4">
        <button id="ap-btn-hdg-mode" class="ap-mode-btn ${apState.hdg_mode ? 'active' : ''}">HDG</button>
        <button id="ap-btn-nav" class="ap-mode-btn ${apState.nav ? 'active' : ''}">NAV</button>
        <button id="ap-btn-apr" class="ap-mode-btn ${apState.apr ? 'active' : ''}">APR</button>
        <button id="ap-btn-bc" class="ap-mode-btn ${apState.bc ? 'active' : ''}">BC</button>
      </div>

      <!-- Vertical Modes -->
      <div class="ap-btn-grid ap-btn-grid-3">
        <button id="ap-btn-alt-mode" class="ap-mode-btn ${apState.alt_mode ? 'active' : ''}">ALT</button>
        <button id="ap-btn-vs-mode" class="ap-mode-btn ${apState.vs_mode ? 'active' : ''}">VS</button>
        <button id="ap-btn-flc-mode" class="ap-mode-btn ${apState.flc_mode ? 'active' : ''}">FLC</button>
      </div>
    </section>

    <!-- HEADING & COURSE CONTROLS -->
    <section class="garmin-card">
      <div class="section-title-center">HEADING & COURSE</div>

      <!-- Heading Row -->
      <div class="ap-control-row">
        <div class="ap-label-col">
          <span class="field-label">HEADING</span>
          <button id="ap-btn-hdg-sync" class="ap-sync-btn">SYNC</button>
        </div>
        <div class="ap-stepper-group">
          <button class="ap-step-btn" data-target="hdg" data-step="-10">-10</button>
          <button class="ap-step-btn" data-target="hdg" data-step="-1">-1</button>
          <input type="text" inputmode="numeric" class="freq-value stby-box ap-val-input" id="ap-hdg-val" value="${formatHeading(apState.hdg)}" />
          <button class="ap-step-btn" data-target="hdg" data-step="1">+1</button>
          <button class="ap-step-btn" data-target="hdg" data-step="10">+10</button>
        </div>
      </div>

      <!-- Course 1 Row -->
      <div class="ap-control-row">
        <div class="ap-label-col">
          <span class="field-label">CRS 1</span>
          <button id="ap-btn-crs1-sync" class="ap-sync-btn">SYNC</button>
        </div>
        <div class="ap-stepper-group">
          <button class="ap-step-btn" data-target="crs1" data-step="-10">-10</button>
          <button class="ap-step-btn" data-target="crs1" data-step="-1">-1</button>
          <input type="text" inputmode="numeric" class="freq-value stby-box ap-val-input" id="ap-crs1-val" value="${formatHeading(apState.crs1)}" />
          <button class="ap-step-btn" data-target="crs1" data-step="1">+1</button>
          <button class="ap-step-btn" data-target="crs1" data-step="10">+10</button>
        </div>
      </div>

      <!-- Course 2 Row -->
      <div class="ap-control-row">
        <div class="ap-label-col">
          <span class="field-label">CRS 2</span>
          <button id="ap-btn-crs2-sync" class="ap-sync-btn">SYNC</button>
        </div>
        <div class="ap-stepper-group">
          <button class="ap-step-btn" data-target="crs2" data-step="-10">-10</button>
          <button class="ap-step-btn" data-target="crs2" data-step="-1">-1</button>
          <input type="text" inputmode="numeric" class="freq-value stby-box ap-val-input" id="ap-crs2-val" value="${formatHeading(apState.crs2)}" />
          <button class="ap-step-btn" data-target="crs2" data-step="1">+1</button>
          <button class="ap-step-btn" data-target="crs2" data-step="10">+10</button>
        </div>
      </div>
    </section>

    <!-- ALTITUDE & VERTICAL SPEED CONTROLS -->
    <section class="garmin-card">
      <div class="section-title-center">ALTITUDE & SPEED</div>

      <!-- Selected Altitude Row -->
      <div class="ap-control-row">
        <div class="ap-label-col">
          <span class="field-label">ALT (FT)</span>
          <button id="ap-btn-alt-sync" class="ap-sync-btn">SYNC</button>
        </div>
        <div class="ap-stepper-group">
          <button class="ap-step-btn" data-target="alt" data-step="-1000">-1k</button>
          <button class="ap-step-btn" data-target="alt" data-step="-100">-100</button>
          <input type="text" inputmode="numeric" class="freq-value stby-box ap-val-input ap-wide" id="ap-alt-val" value="${apState.alt}" />
          <button class="ap-step-btn" data-target="alt" data-step="100">+100</button>
          <button class="ap-step-btn" data-target="alt" data-step="1000">+1k</button>
        </div>
      </div>

      <!-- Vertical Speed Row -->
      <div class="ap-control-row">
        <div class="ap-label-col">
          <span class="field-label">VS (FPM)</span>
        </div>
        <div class="ap-stepper-group">
          <button class="ap-step-btn" data-target="vs" data-step="-500">-500</button>
          <button class="ap-step-btn" data-target="vs" data-step="-100">-100</button>
          <input type="text" inputmode="numeric" class="freq-value stby-box ap-val-input ap-wide" id="ap-vs-val" value="${formatVerticalSpeed(apState.vs)}" />
          <button class="ap-step-btn" data-target="vs" data-step="100">+100</button>
          <button class="ap-step-btn" data-target="vs" data-step="500">+500</button>
        </div>
      </div>

      <!-- Airspeed / FLC Row -->
      <div class="ap-control-row">
        <div class="ap-label-col">
          <span class="field-label">IAS (KT)</span>
        </div>
        <div class="ap-stepper-group">
          <button class="ap-step-btn" data-target="ias" data-step="-10">-10</button>
          <button class="ap-step-btn" data-target="ias" data-step="-1">-1</button>
          <input type="text" inputmode="numeric" class="freq-value stby-box ap-val-input" id="ap-ias-val" value="${apState.ias}" />
          <button class="ap-step-btn" data-target="ias" data-step="1">+1</button>
          <button class="ap-step-btn" data-target="ias" data-step="10">+10</button>
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
    'ap-btn-fd': data.ap_fd,
    'ap-btn-yd': data.ap_yd,
    'ap-btn-hdg-mode': data.ap_hdg_mode,
    'ap-btn-nav': data.ap_nav_mode,
    'ap-btn-apr': data.ap_apr_mode,
    'ap-btn-bc': data.ap_bc_mode,
    'ap-btn-alt-mode': data.ap_alt_mode,
    'ap-btn-vs-mode': data.ap_vs_mode,
    'ap-btn-flc-mode': data.ap_flc_mode
  };

  Object.entries(modeMappings).forEach(([btnId, stateVal]) => {
    if (stateVal !== undefined) {
      const btn = document.getElementById(btnId);
      if (btn) btn.classList.toggle('active', !!stateVal);
    }
  });

  // Sync Input Displays
  if (data.ap_hdg !== undefined && !isInputFocused('ap-hdg-val')) {
    apState.hdg = data.ap_hdg;
    const el = document.getElementById('ap-hdg-val');
    if (el) el.value = formatHeading(data.ap_hdg);
  }
  if (data.ap_crs1 !== undefined && !isInputFocused('ap-crs1-val')) {
    apState.crs1 = data.ap_crs1;
    const el = document.getElementById('ap-crs1-val');
    if (el) el.value = formatHeading(data.ap_crs1);
  }
  if (data.ap_crs2 !== undefined && !isInputFocused('ap-crs2-val')) {
    apState.crs2 = data.ap_crs2;
    const el = document.getElementById('ap-crs2-val');
    if (el) el.value = formatHeading(data.ap_crs2);
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
  // Mode Button Toggles
  const buttonCommands = [
    { id: 'ap-btn-master', event: 'AP_MASTER' },
    { id: 'ap-btn-fd', event: 'TOGGLE_FLIGHT_DIRECTOR' },
    { id: 'ap-btn-yd', event: 'YAW_DAMPER_TOGGLE' },
    { id: 'ap-btn-hdg-mode', event: 'AP_PANEL_HEADING_HOLD' },
    { id: 'ap-btn-nav', event: 'AP_NAV1_HOLD' },
    { id: 'ap-btn-apr', event: 'AP_APR_HOLD' },
    { id: 'ap-btn-bc', event: 'AP_BC_HOLD' },
    { id: 'ap-btn-alt-mode', event: 'AP_PANEL_ALTITUDE_HOLD' },
    { id: 'ap-btn-vs-mode', event: 'AP_PANEL_VS_HOLD' },
    { id: 'ap-btn-flc-mode', event: 'FLIGHT_LEVEL_CHANGE' },
    { id: 'ap-btn-hdg-sync', event: 'HEADING_BUG_SET' },
    { id: 'ap-btn-crs1-sync', event: 'VOR1_SET' },
    { id: 'ap-btn-crs2-sync', event: 'VOR2_SET' },
    { id: 'ap-btn-alt-sync', event: 'AP_ALT_VAR_SET_ENGLISH' }
  ];

  buttonCommands.forEach(({ id, event }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        sendSimCommand('AUTOPILOT', event, 0);
      });
    }
  });

  // Step Adjustment Buttons
  document.querySelectorAll('.ap-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const step = parseInt(btn.dataset.step, 10);
      modifyApValue(target, step);
    });
  });

  // Direct Input Listeners
  attachDirectInput('ap-hdg-val', 'hdg', 'HEADING_BUG_SET', (v) => formatHeading(v), 1, 360);
  attachDirectInput('ap-crs1-val', 'crs1', 'VOR1_SET', (v) => formatHeading(v), 1, 360);
  attachDirectInput('ap-crs2-val', 'crs2', 'VOR2_SET', (v) => formatHeading(v), 1, 360);
  attachDirectInput('ap-alt-val', 'alt', 'AP_ALT_VAR_SET_ENGLISH', (v) => String(v), 0, 60000);
  attachDirectInput('ap-vs-val', 'vs', 'AP_VS_VAR_SET_ENGLISH', (v) => formatVerticalSpeed(v), -6000, 6000);
  attachDirectInput('ap-ias-val', 'ias', 'AP_SPD_VAR_SET', (v) => String(v), 0, 500);
}

function modifyApValue(target, delta) {
  if (target === 'hdg' || target === 'crs1' || target === 'crs2') {
    let current = parseInt(apState[target], 10) || 0;
    current = ((current + delta - 1) % 360 + 360) % 360 + 1;
    apState[target] = current;

    const el = document.getElementById(`ap-${target}-val`);
    if (el) el.value = formatHeading(current);

    const eventName = target === 'hdg' ? 'HEADING_BUG_SET' : (target === 'crs1' ? 'VOR1_SET' : 'VOR2_SET');
    sendSimCommand('AUTOPILOT', eventName, current);
  } else if (target === 'alt') {
    let current = Math.max(0, Math.min(60000, (parseInt(apState.alt, 10) || 0) + delta));
    apState.alt = current;
    const el = document.getElementById('ap-alt-val');
    if (el) el.value = current;
    sendSimCommand('AUTOPILOT', 'AP_ALT_VAR_SET_ENGLISH', current);
  } else if (target === 'vs') {
    let current = Math.max(-6000, Math.min(6000, (parseInt(apState.vs, 10) || 0) + delta));
    apState.vs = current;
    const el = document.getElementById('ap-vs-val');
    if (el) el.value = formatVerticalSpeed(current);
    sendSimCommand('AUTOPILOT', 'AP_VS_VAR_SET_ENGLISH', current);
  } else if (target === 'ias') {
    let current = Math.max(0, Math.min(500, (parseInt(apState.ias, 10) || 0) + delta));
    apState.ias = current;
    const el = document.getElementById('ap-ias-val');
    if (el) el.value = current;
    sendSimCommand('AUTOPILOT', 'AP_SPD_VAR_SET', current);
  }
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
      if (stateKey === 'hdg' || stateKey === 'crs1' || stateKey === 'crs2') {
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