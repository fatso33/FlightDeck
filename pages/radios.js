import { sendSimCommand } from '../app.js';

const presets = {
  COMM: JSON.parse(localStorage.getItem('msfs_comm_presets') || '[null, null, null, null]'),
  NAV: JSON.parse(localStorage.getItem('msfs_nav_presets') || '[null, null, null, null]')
};

let editingPresetIndex = null;
let editingPresetCategory = null;

// Track last valid strings for error/revert states
const lastValidFreqs = {
  'com1-stby': '121.500',
  'com2-stby': '119.100',
  'nav1-stby': '113.70',
  'nav2-stby': '117.20',
  'xpndr-code': '1200'
};

const errorTimeouts = {};
let identTimer = null;

export function renderRadiosPage() {
  return `
    <!-- COM RADIOS SECTION -->
    <section class="garmin-card">
      <div class="section-header-row">
        <div class="unit-label">COM 1</div>
        <div class="section-title-center">COM RADIOS</div>
        <div class="header-spacer"></div>
      </div>

      <!-- COM 1 ROW -->
      <div class="radio-sub-unit">
        <div class="radio-row-container">
          <div class="freq-block">
            <span class="field-label">ACTIVE</span>
            <input type="text" class="freq-value active" id="com1-act" value="122.800" readonly />
          </div>
          <button class="swap-action-btn" id="com1-swap" aria-label="Swap COM1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m16 3 4 4-4 4"></path>
              <path d="M20 7H4"></path>
              <path d="m8 21-4-4 4-4"></path>
              <path d="M4 17h16"></path>
            </svg>
          </button>
          <div class="freq-block">
            <span class="field-label">STBY</span>
            <input type="text" inputmode="numeric" enterkeyhint="done" class="freq-value stby-box" id="com1-stby" value="121.500" />
          </div>
        </div>
      </div>

      <!-- COM 2 ROW -->
      <div class="radio-sub-unit">
        <div class="unit-label">COM 2</div>
        <div class="radio-row-container">
          <div class="freq-block">
            <span class="field-label">ACTIVE</span>
            <input type="text" class="freq-value active" id="com2-act" value="118.700" readonly />
          </div>
          <button class="swap-action-btn" id="com2-swap" aria-label="Swap COM2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m16 3 4 4-4 4"></path>
              <path d="M20 7H4"></path>
              <path d="m8 21-4-4 4-4"></path>
              <path d="M4 17h16"></path>
            </svg>
          </button>
          <div class="freq-block">
            <span class="field-label">STBY</span>
            <input type="text" inputmode="numeric" enterkeyhint="done" class="freq-value stby-box" id="com2-stby" value="119.100" />
          </div>
        </div>
      </div>

      <!-- COM Presets Row -->
      ${renderPresetsRow('COMM', 'com1')}
    </section>

    <!-- NAV RADIOS SECTION -->
    <section class="garmin-card">
      <div class="section-header-row">
        <div class="unit-label">NAV 1</div>
        <div class="section-title-center">NAV RADIOS</div>
        <div class="header-spacer"></div>
      </div>

      <!-- NAV 1 ROW -->
      <div class="radio-sub-unit">
        <div class="radio-row-container">
          <div class="freq-block">
            <span class="field-label">ACTIVE</span>
            <input type="text" class="freq-value active" id="nav1-act" value="110.30" readonly />
          </div>
          <button class="swap-action-btn" id="nav1-swap" aria-label="Swap NAV1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m16 3 4 4-4 4"></path>
              <path d="M20 7H4"></path>
              <path d="m8 21-4-4 4-4"></path>
              <path d="M4 17h16"></path>
            </svg>
          </button>
          <div class="freq-block">
            <span class="field-label">STBY</span>
            <input type="text" inputmode="numeric" enterkeyhint="done" class="freq-value stby-box" id="nav1-stby" value="113.70" />
          </div>
        </div>
      </div>

      <!-- NAV 2 ROW -->
      <div class="radio-sub-unit">
        <div class="unit-label">NAV 2</div>
        <div class="radio-row-container">
          <div class="freq-block">
            <span class="field-label">ACTIVE</span>
            <input type="text" class="freq-value active" id="nav2-act" value="108.00" readonly />
          </div>
          <button class="swap-action-btn" id="nav2-swap" aria-label="Swap NAV2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m16 3 4 4-4 4"></path>
              <path d="M20 7H4"></path>
              <path d="m8 21-4-4 4-4"></path>
              <path d="M4 17h16"></path>
            </svg>
          </button>
          <div class="freq-block">
            <span class="field-label">STBY</span>
            <input type="text" inputmode="numeric" enterkeyhint="done" class="freq-value stby-box" id="nav2-stby" value="117.20" />
          </div>
        </div>
      </div>

      <!-- NAV Presets Row -->
      ${renderPresetsRow('NAV', 'nav1')}
    </section>

    <!-- TRANSPONDER SECTION -->
    <section class="garmin-card">
      <div class="section-title-center" style="margin-bottom: 2px;">TRANSPONDER</div>
      <div class="xpndr-grid">
        <div class="xpndr-box">
          <span class="field-label">SQUAWK</span>
          <span id="xpndr-ident-tag" class="ident-active-tag hidden">IDENT</span>
          <input type="text" inputmode="numeric" enterkeyhint="done" id="xpndr-code" class="xpndr-input" maxlength="4" value="1200" />
        </div>
        <div class="xpndr-actions">
          <button id="xpndr-vfr-btn" class="xpndr-btn vfr-active">VFR</button>
          <button id="xpndr-ident" class="xpndr-btn">IDENT</button>
        </div>
      </div>
    </section>
  `;
}

function renderPresetsRow(category, targetRadio) {
  const catPresets = presets[category];
  const isCom = category === 'COMM';
  return `
    <div class="presets-sub-row">
      ${[0, 1, 2, 3].map(i => {
        const item = catPresets[i];
        const hasData = item && item.freq;
        const displayVal = hasData ? (isCom ? formatCom(item.freq) : formatNav(item.freq)) : '---';
        return `
          <div class="preset-chip" data-category="${category}" data-index="${i}" data-target="${targetRadio}">
            <span class="preset-val">${displayVal}</span>
            <span class="preset-lbl">${hasData ? item.label : ''}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function formatCom(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '';
  return num.toFixed(3);
}

export function formatNav(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

function isValidComFreq(val) {
  const num = parseFloat(val);
  if (isNaN(num) || num < 118.0 || num > 136.975) return false;

  const parts = num.toFixed(3).split('.');
  if (parts.length < 2) return true;
  const dec3 = parts[1];
  const suffix2 = dec3.slice(1);
  if (['20', '45', '70', '95'].includes(suffix2)) {
    return false;
  }
  return true;
}

function isValidNavFreq(val) {
  const num = parseFloat(val);
  if (isNaN(num) || num < 108.0 || num > 117.975) return false;
  return true;
}

function updateVfrButtonState(code) {
  const vfrBtn = document.getElementById('xpndr-vfr-btn');
  if (vfrBtn) {
    if (String(code).trim() === '1200') {
      vfrBtn.classList.add('vfr-active');
    } else {
      vfrBtn.classList.remove('vfr-active');
    }
  }
}

// Live update handler from Bridge telemetry
export function updateRadioDisplays(data) {
  const isInputFocused = (id) => document.activeElement === document.getElementById(id);

  const c1Act = document.getElementById('com1-act');
  const c1Stby = document.getElementById('com1-stby');
  const c2Act = document.getElementById('com2-act');
  const c2Stby = document.getElementById('com2-stby');

  if (c1Act && data.com1_act) c1Act.value = formatCom(data.com1_act);
  if (c1Stby && data.com1_stby && !isInputFocused('com1-stby')) {
    c1Stby.value = formatCom(data.com1_stby);
    lastValidFreqs['com1-stby'] = c1Stby.value;
  }
  if (c2Act && data.com2_act) c2Act.value = formatCom(data.com2_act);
  if (c2Stby && data.com2_stby && !isInputFocused('com2-stby')) {
    c2Stby.value = formatCom(data.com2_stby);
    lastValidFreqs['com2-stby'] = c2Stby.value;
  }

  const n1Act = document.getElementById('nav1-act');
  const n1Stby = document.getElementById('nav1-stby');
  const n2Act = document.getElementById('nav2-act');
  const n2Stby = document.getElementById('nav2-stby');

  if (n1Act && data.nav1_act) n1Act.value = formatNav(data.nav1_act);
  if (n1Stby && data.nav1_stby && !isInputFocused('nav1-stby')) {
    n1Stby.value = formatNav(data.nav1_stby);
    lastValidFreqs['nav1-stby'] = n1Stby.value;
  }
  if (n2Act && data.nav2_act) n2Act.value = formatNav(data.nav2_act);
  if (n2Stby && data.nav2_stby && !isInputFocused('nav2-stby')) {
    n2Stby.value = formatNav(data.nav2_stby);
    lastValidFreqs['nav2-stby'] = n2Stby.value;
  }
}

export function initRadiosEvents() {
  // Swaps
  attachSwapListener('com1-swap', 'RADIO', 'COM_STBY_RADIO_SWAP');
  attachSwapListener('com2-swap', 'RADIO', 'COM2_RADIO_SWAP');
  attachSwapListener('nav1-swap', 'RADIO', 'NAV1_RADIO_SWAP');
  attachSwapListener('nav2-swap', 'RADIO', 'NAV2_RADIO_SWAP');

  // Smart Prepend Frequency Input Listeners
  attachSmartFreqListener('com1-stby', 'RADIO', 'COM1_STBY_RADIO_SET_HZ', true);
  attachSmartFreqListener('com2-stby', 'RADIO', 'COM2_STBY_RADIO_SET_HZ', true);
  attachSmartFreqListener('nav1-stby', 'RADIO', 'NAV1_RADIO_SET_HZ', false);
  attachSmartFreqListener('nav2-stby', 'RADIO', 'NAV2_RADIO_SET_HZ', false);

  // Presets click & long-press handling
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = parseInt(chip.dataset.index);
      const cat = chip.dataset.category;
      const target = chip.dataset.target.toLowerCase();
      const presetData = presets[cat][idx];

      if (!presetData || !presetData.freq) {
        openPresetModal(cat, idx);
      } else {
        const stbyInput = document.getElementById(`${target}-stby`);
        const isCom = cat === 'COMM';
        if (stbyInput) {
          stbyInput.value = isCom ? formatCom(presetData.freq) : formatNav(presetData.freq);
          lastValidFreqs[`${target}-stby`] = stbyInput.value;
          const eventName = target.startsWith('com') ? 'COM1_STBY_RADIO_SET_HZ' : 'NAV1_RADIO_SET_HZ';
          sendSimCommand('RADIO', eventName, parseFloat(presetData.freq));
        }
      }
    });

    let pressTimer;
    chip.addEventListener('touchstart', () => {
      pressTimer = setTimeout(() => {
        openPresetModal(chip.dataset.category, parseInt(chip.dataset.index));
      }, 650);
    });
    chip.addEventListener('touchend', () => clearTimeout(pressTimer));
  });

  // IDENT Button with 5-second upper-right corner indicator
  const identBtn = document.getElementById('xpndr-ident');
  const identTag = document.getElementById('xpndr-ident-tag');
  if (identBtn) {
    identBtn.addEventListener('click', () => {
      sendSimCommand('ATC', 'XPNDR_IDENT', 1);

      if (identTag) {
        identTag.classList.remove('hidden');
        if (identTimer) clearTimeout(identTimer);
        identTimer = setTimeout(() => {
          identTag.classList.add('hidden');
        }, 5000);
      }
    });
  }

  // VFR Button
  const vfrBtn = document.getElementById('xpndr-vfr-btn');
  if (vfrBtn) {
    vfrBtn.addEventListener('click', () => {
      const input = document.getElementById('xpndr-code');
      if (input) {
        input.value = '1200';
        lastValidFreqs['xpndr-code'] = '1200';
        updateVfrButtonState('1200');
      }
      sendSimCommand('ATC', 'XPNDR_SET', '1200');
    });
  }

  // Transponder Input
  const xpndrInput = document.getElementById('xpndr-code');
  if (xpndrInput) {
    updateVfrButtonState(xpndrInput.value);

    xpndrInput.addEventListener('focus', () => {
      xpndrInput.select();
    });

    xpndrInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        xpndrInput.blur();
      }
    });

    xpndrInput.addEventListener('change', () => {
      let val = xpndrInput.value.replace(/[^0-7]/g, '').slice(0, 4);
      if (val.length < 4) val = val.padStart(4, '0');
      xpndrInput.value = val;
      lastValidFreqs['xpndr-code'] = val;
      updateVfrButtonState(val);
      sendSimCommand('ATC', 'XPNDR_SET', val);
    });
  }
}

function attachSwapListener(btnId, category, eventName) {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.addEventListener('click', () => {
      sendSimCommand(category, eventName, 0);
    });
  }
}

/**
 * Smart Frequency Input Controller:
 * - Prepopulates with "1" on focus
 * - Auto places decimal after 3rd digit
 * - 1-second invalid error state before reverting
 */
function attachSmartFreqListener(inputId, category, eventName, isComRadio) {
  const el = document.getElementById(inputId);
  if (!el) return;

  lastValidFreqs[inputId] = el.value;

  el.addEventListener('focus', () => {
    if (errorTimeouts[inputId]) {
      clearTimeout(errorTimeouts[inputId]);
      el.classList.remove('input-error');
    }
    el.value = '1';
  });

  el.addEventListener('input', () => {
    let rawDigits = el.value.replace(/\D/g, '');

    if (!rawDigits.startsWith('1')) {
      rawDigits = '1' + rawDigits;
    }

    const maxDigits = isComRadio ? 6 : 5;
    rawDigits = rawDigits.slice(0, maxDigits);

    if (rawDigits.length <= 3) {
      el.value = rawDigits;
    } else {
      el.value = rawDigits.slice(0, 3) + '.' + rawDigits.slice(3);
    }
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.blur();
    }
  });

  el.addEventListener('blur', () => {
    const rawVal = el.value.trim();

    if (!rawVal || rawVal === '1') {
      el.value = lastValidFreqs[inputId];
      return;
    }

    const isValid = isComRadio ? isValidComFreq(rawVal) : isValidNavFreq(rawVal);

    if (isValid) {
      const formatted = isComRadio ? formatCom(rawVal) : formatNav(rawVal);
      el.value = formatted;
      lastValidFreqs[inputId] = formatted;
      el.classList.remove('input-error');
      sendSimCommand(category, eventName, parseFloat(formatted));
    } else {
      // 1-second error highlight before reverting
      el.classList.add('input-error');
      errorTimeouts[inputId] = setTimeout(() => {
        el.classList.remove('input-error');
        el.value = lastValidFreqs[inputId];
      }, 1000);
    }
  });
}

function openPresetModal(category, index) {
  editingPresetCategory = category;
  editingPresetIndex = index;
  const current = presets[category][index] || { label: '', freq: '' };

  document.getElementById('modal-title').textContent = `Configure ${category} Preset`;
  document.getElementById('modal-label-input').value = current.label || '';
  document.getElementById('modal-freq-input').value = current.freq || '';

  const modal = document.getElementById('preset-modal');
  modal.classList.remove('hidden');
}

document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
  document.getElementById('preset-modal').classList.add('hidden');
});

document.getElementById('modal-done-btn')?.addEventListener('click', () => {
  const label = document.getElementById('modal-label-input').value.trim().toUpperCase();
  const freq = parseFloat(document.getElementById('modal-freq-input').value);

  if (!isNaN(freq)) {
    const isCom = editingPresetCategory === 'COMM';
    const formatted = isCom ? formatCom(freq) : formatNav(freq);
    presets[editingPresetCategory][editingPresetIndex] = { label: label || 'PRE', freq: formatted };
    localStorage.setItem(`msfs_${editingPresetCategory.toLowerCase()}_presets`, JSON.stringify(presets[editingPresetCategory]));
  }

  document.getElementById('preset-modal').classList.add('hidden');
  
  const content = document.getElementById('content-area');
  content.innerHTML = renderRadiosPage();
  initRadiosEvents();
});