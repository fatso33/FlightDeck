import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROFILES_FILE = path.join(__dirname, 'profiles.json');

export const DEFAULT_PROFILE = {
  id: 'default_ga',
  name: 'Default (Generic GA / MSFS 2024)',
  mappings: {
    // Radios
    COM1_SWAP: { event: 'COM_STBY_RADIO_SWAP', valueFormat: 'FIXED_0' },
    COM2_SWAP: { event: 'COM2_RADIO_SWAP', valueFormat: 'FIXED_0' },
    NAV1_SWAP: { event: 'NAV1_RADIO_SWAP', valueFormat: 'FIXED_0' },
    NAV2_SWAP: { event: 'NAV2_RADIO_SWAP', valueFormat: 'FIXED_0' },
    COM1_SET: { event: 'COM_STBY_RADIO_SET_HZ', valueFormat: 'HZ_INT' },
    COM2_SET: { event: 'COM2_STBY_RADIO_SET_HZ', valueFormat: 'HZ_INT' },
    NAV1_SET: { event: 'NAV1_RADIO_SET_HZ', valueFormat: 'HZ_INT' },
    NAV2_SET: { event: 'NAV2_RADIO_SET_HZ', valueFormat: 'HZ_INT' },
    XPNDR_SET: { event: 'XPNDR_SET', valueFormat: 'BCD_HEX' },
    XPNDR_IDENT: { event: 'XPNDR_IDENT_ON', valueFormat: 'FIXED_1' },

    // Autopilot
    AP_MASTER_TOGGLE: { event: 'AP_MASTER', valueFormat: 'FIXED_0' },
    AP_FD_TOGGLE: { event: 'TOGGLE_FLIGHT_DIRECTOR', valueFormat: 'FIXED_0' },
    AP_HDG_HOLD_TOGGLE: { event: 'AP_PANEL_HEADING_HOLD', valueFormat: 'FIXED_0' },
    AP_HDG_SET: { event: 'HEADING_BUG_SET', valueFormat: 'RAW_INT' },
    AP_NAV_TOGGLE: { event: 'AP_NAV1_HOLD', valueFormat: 'FIXED_0' },
    AP_APR_TOGGLE: { event: 'AP_APR_HOLD', valueFormat: 'FIXED_0' },
    AP_BC_TOGGLE: { event: 'AP_BC_HOLD', valueFormat: 'FIXED_0' },
    AP_ALT_HOLD_TOGGLE: { event: 'AP_PANEL_ALTITUDE_HOLD', valueFormat: 'FIXED_0' },
    AP_ALT_SET: { event: 'AP_ALT_VAR_SET_ENGLISH', valueFormat: 'RAW_INT' },
    AP_VS_HOLD_TOGGLE: { event: 'AP_PANEL_VS_HOLD', valueFormat: 'FIXED_0' },
    AP_VS_SET: { event: 'AP_VS_VAR_SET_ENGLISH', valueFormat: 'RAW_INT' },
    AP_FLC_TOGGLE: { event: 'FLIGHT_LEVEL_CHANGE', valueFormat: 'FIXED_0' },
    AP_SPD_SET: { event: 'AP_SPD_VAR_SET', valueFormat: 'RAW_INT' }
  }
};

class ProfileManager {
  constructor() {
    this.profiles = [];
    this.activeProfileId = 'default_ga';
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(PROFILES_FILE)) {
        const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.profiles = data.profiles || [];
        this.activeProfileId = data.activeProfileId || 'default_ga';
      } else {
        this.profiles = [JSON.parse(JSON.stringify(DEFAULT_PROFILE))];
        this.activeProfileId = 'default_ga';
        this.save();
      }
    } catch (err) {
      console.error('[ProfileManager] Error loading profiles:', err);
      this.profiles = [JSON.parse(JSON.stringify(DEFAULT_PROFILE))];
      this.activeProfileId = 'default_ga';
    }

    const defIdx = this.profiles.findIndex(p => p.id === 'default_ga');
    if (defIdx === -1) {
      this.profiles.unshift(JSON.parse(JSON.stringify(DEFAULT_PROFILE)));
    } else {
      this.profiles[defIdx] = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    }
  }

  save() {
    try {
      const data = {
        activeProfileId: this.activeProfileId,
        profiles: this.profiles
      };
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ProfileManager] Error saving profiles:', err);
    }
  }

  getActiveProfile() {
    return this.profiles.find(p => p.id === this.activeProfileId) || DEFAULT_PROFILE;
  }

  setActiveProfile(id) {
    if (this.profiles.some(p => p.id === id)) {
      this.activeProfileId = id;
      this.save();
      return true;
    }
    return false;
  }

  saveProfile(profile) {
    if (profile.id === 'default_ga') return false;
    const idx = this.profiles.findIndex(p => p.id === profile.id);
    if (idx >= 0) {
      this.profiles[idx] = profile;
    } else {
      this.profiles.push(profile);
    }
    this.save();
    return true;
  }

  deleteProfile(id) {
    if (id === 'default_ga') return false;
    this.profiles = this.profiles.filter(p => p.id !== id);
    if (this.activeProfileId === id) {
      this.activeProfileId = 'default_ga';
    }
    this.save();
    return true;
  }

  transformValue(format, rawValue) {
    const num = parseFloat(rawValue);

    switch (format) {
      case 'HZ_INT':
        if (!isNaN(num) && num < 1000) return Math.round(num * 1000000);
        return isNaN(num) ? 0 : Math.round(num);

      case 'KHZ_INT':
        if (!isNaN(num) && num < 1000) return Math.round(num * 1000);
        return isNaN(num) ? 0 : Math.round(num);

      case 'MHZ_FLOAT':
        return isNaN(num) ? 0 : num;

      case 'BCD_HEX':
        return parseInt(String(rawValue), 16) || 0x1200;

      case 'RAW_INT':
        return parseInt(String(rawValue), 10) || 0;

      case 'FIXED_0':
        return 0;

      case 'FIXED_1':
        return 1;

      default:
        return isNaN(num) ? 0 : num;
    }
  }
}

export const profileManager = new ProfileManager();