// Autopilot Page Module
const AutopilotPage = (function () {
    function render() {
        return `
        <div class="autopilot-page page-content">
            <div class="ap-master-panel card">
                <div class="ap-main-switches">
                    <button class="btn btn-ap" id="btn-ap-master" onclick="sendEvent('AP_MASTER')">
                        <span class="indicator"></span>
                        <span class="label">AP MASTER</span>
                    </button>
                    <button class="btn btn-ap" id="btn-ap-fd" onclick="sendEvent('TOGGLE_FLIGHT_DIRECTOR')">
                        <span class="indicator"></span>
                        <span class="label">FLIGHT DIR</span>
                    </button>
                    <button class="btn btn-ap" id="btn-ap-yd" onclick="sendEvent('YAW_DAMPER_TOGGLE')">
                        <span class="indicator"></span>
                        <span class="label">YAW DAMPER</span>
                    </button>
                    <button class="btn btn-ap" id="btn-ap-athr" onclick="sendEvent('AUTO_THROTTLE_ARM')">
                        <span class="indicator"></span>
                        <span class="label">A/THR ARM</span>
                    </button>
                </div>
            </div>

            <div class="ap-modes-grid">
                <!-- Lateral Modes -->
                <div class="card ap-mode-card">
                    <div class="card-header">LATERAL MODES</div>
                    <div class="mode-buttons">
                        <button class="btn btn-mode" id="btn-ap-hdg" onclick="sendEvent('AP_HDG_HOLD')">
                            <span class="indicator"></span> HDG HOLD
                        </button>
                        <button class="btn btn-mode" id="btn-ap-nav" onclick="sendEvent('AP_NAV1_HOLD')">
                            <span class="indicator"></span> NAV
                        </button>
                        <button class="btn btn-mode" id="btn-ap-apr" onclick="sendEvent('AP_APR_HOLD')">
                            <span class="indicator"></span> APPR
                        </button>
                        <button class="btn btn-mode" id="btn-ap-bc" onclick="sendEvent('AP_BC_HOLD')">
                            <span class="indicator"></span> B/C
                        </button>
                    </div>
                </div>

                <!-- Vertical Modes -->
                <div class="card ap-mode-card">
                    <div class="card-header">VERTICAL MODES</div>
                    <div class="mode-buttons">
                        <button class="btn btn-mode" id="btn-ap-alt" onclick="sendEvent('AP_ALT_HOLD')">
                            <span class="indicator"></span> ALT HOLD
                        </button>
                        <button class="btn btn-mode" id="btn-ap-vs" onclick="sendEvent('AP_VS_HOLD')">
                            <span class="indicator"></span> VS HOLD
                        </button>
                        <button class="btn btn-mode" id="btn-ap-flc" onclick="sendEvent('FLIGHT_LEVEL_CHANGE')">
                            <span class="indicator"></span> FLC
                        </button>
                        <button class="btn btn-mode" id="btn-ap-glid" onclick="sendEvent('AP_PANEL_GLIDEPATH_HOLD')">
                            <span class="indicator"></span> GLIDESLOPE
                        </button>
                    </div>
                </div>
            </div>

            <!-- AP Targets & Adjusters -->
            <div class="ap-values-grid">
                <!-- Heading -->
                <div class="card val-control-card">
                    <div class="val-header">HEADING</div>
                    <div class="val-display" id="disp-ap-hdg">000°</div>
                    <div class="val-actions">
                        <button class="btn btn-step" onclick="sendEvent('HEADING_BUG_DEC')">-1</button>
                        <button class="btn btn-step" onclick="sendEvent('HEADING_BUG_DEC_FAST')">-10</button>
                        <button class="btn btn-sync" onclick="sendEvent('HEADING_BUG_SYNC')">SYNC</button>
                        <button class="btn btn-step" onclick="sendEvent('HEADING_BUG_INC_FAST')">+10</button>
                        <button class="btn btn-step" onclick="sendEvent('HEADING_BUG_INC')">+1</button>
                    </div>
                </div>

                <!-- Altitude -->
                <div class="card val-control-card">
                    <div class="val-header">ALTITUDE</div>
                    <div class="val-display" id="disp-ap-alt">00000</div>
                    <div class="val-actions">
                        <button class="btn btn-step" onclick="sendEvent('AP_ALT_VAR_DEC_FAST')">-1000</button>
                        <button class="btn btn-step" onclick="sendEvent('AP_ALT_VAR_DEC')">-100</button>
                        <button class="btn btn-step" onclick="sendEvent('AP_ALT_VAR_INC')">+100</button>
                        <button class="btn btn-step" onclick="sendEvent('AP_ALT_VAR_INC_FAST')">+1000</button>
                    </div>
                </div>

                <!-- Vertical Speed -->
                <div class="card val-control-card">
                    <div class="val-header">VERTICAL SPEED</div>
                    <div class="val-display" id="disp-ap-vs">+0000</div>
                    <div class="val-actions">
                        <button class="btn btn-step" onclick="sendEvent('AP_VS_VAR_DEC_FAST')">-500</button>
                        <button class="btn btn-step" onclick="sendEvent('AP_VS_VAR_DEC')">-100</button>
                        <button class="btn btn-step" onclick="sendEvent('AP_VS_VAR_INC')">+100</button>
                        <button class="btn btn-step" onclick="sendEvent('AP_VS_VAR_INC_FAST')">+500</button>
                    </div>
                </div>

                <!-- Airspeed / Mach -->
                <div class="card val-control-card">
                    <div class="val-header">AIRSPEED / FLC</div>
                    <div class="val-display" id="disp-ap-spd">000 KT</div>
                    <div class="val-actions">
                        <button class="btn btn-step" onclick="sendEvent('AP_SPD_VAR_DEC_FAST')">-10</button>
                        <button class="btn btn-step" onclick="sendEvent('AP_SPD_VAR_DEC')">-1</button>
                        <button class="btn btn-step" onclick="sendEvent('AP_SPD_VAR_INC')">+1</button>
                        <button class="btn btn-step" onclick="sendEvent('AP_SPD_VAR_INC_FAST')">+10</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function init() {}
    function destroy() {}

    function getVal(state, keys) {
        if (!state) return undefined;
        for (const k of keys) {
            if (state[k] !== undefined) return state[k];
            const upperUnderscore = k.toUpperCase().replace(/\s+/g, '_');
            if (state[upperUnderscore] !== undefined) return state[upperUnderscore];
            const upperSpace = k.toUpperCase().replace(/_/g, ' ');
            if (state[upperSpace] !== undefined) return state[upperSpace];
        }
        return undefined;
    }

    function isTrue(val) {
        return val === true || val === 1 || val === '1' || val === 'true';
    }

    function updateBtn(id, active) {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (active) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    function update(state) {
        if (!state) return;

        // AP Master & Main Switches
        const apMaster = getVal(state, ['AUTOPILOT_MASTER', 'AUTOPILOT MASTER', 'AP_MASTER']);
        if (apMaster !== undefined) updateBtn('btn-ap-master', isTrue(apMaster));

        const fd = getVal(state, ['AUTOPILOT_FLIGHT_DIRECTOR_ACTIVE', 'AUTOPILOT FLIGHT DIRECTOR ACTIVE', 'FLIGHT_DIRECTOR', 'AUTOPILOT_FD']);
        if (fd !== undefined) updateBtn('btn-ap-fd', isTrue(fd));

        const yd = getVal(state, ['AUTOPILOT_YAW_DAMPER', 'AUTOPILOT YAW DAMPER', 'YAW_DAMPER']);
        if (yd !== undefined) updateBtn('btn-ap-yd', isTrue(yd));

        const athr = getVal(state, ['AUTOPILOT_THROTTLE_ARM', 'AUTOPILOT THROTTLE ARM', 'AUTO_THROTTLE_ARM']);
        if (athr !== undefined) updateBtn('btn-ap-athr', isTrue(athr));

        // Lateral Modes
        const hdgHold = getVal(state, ['AUTOPILOT_HEADING_LOCK', 'AUTOPILOT HEADING LOCK', 'AP_HDG_HOLD']);
        if (hdgHold !== undefined) updateBtn('btn-ap-hdg', isTrue(hdgHold));

        const navHold = getVal(state, ['AUTOPILOT_NAV1_LOCK', 'AUTOPILOT NAV1 LOCK', 'AP_NAV1_HOLD']);
        if (navHold !== undefined) updateBtn('btn-ap-nav', isTrue(navHold));

        const aprHold = getVal(state, ['AUTOPILOT_APPROACH_HOLD', 'AUTOPILOT APPROACH HOLD', 'AP_APR_HOLD']);
        if (aprHold !== undefined) updateBtn('btn-ap-apr', isTrue(aprHold));

        const bcHold = getVal(state, ['AUTOPILOT_BACKCOURSE_HOLD', 'AUTOPILOT BACKCOURSE HOLD', 'AP_BC_HOLD']);
        if (bcHold !== undefined) updateBtn('btn-ap-bc', isTrue(bcHold));

        // Vertical Modes
        const altHold = getVal(state, ['AUTOPILOT_ALTITUDE_LOCK', 'AUTOPILOT ALTITUDE LOCK', 'AP_ALT_HOLD']);
        if (altHold !== undefined) updateBtn('btn-ap-alt', isTrue(altHold));

        const vsHold = getVal(state, ['AUTOPILOT_VERTICAL_HOLD', 'AUTOPILOT VERTICAL HOLD', 'AP_VS_HOLD']);
        if (vsHold !== undefined) updateBtn('btn-ap-vs', isTrue(vsHold));

        const flcHold = getVal(state, ['AUTOPILOT_FLIGHT_LEVEL_CHANGE', 'AUTOPILOT FLIGHT LEVEL CHANGE', 'FLIGHT_LEVEL_CHANGE']);
        if (flcHold !== undefined) updateBtn('btn-ap-flc', isTrue(flcHold));

        const gsHold = getVal(state, ['AUTOPILOT_GLIDESLOPE_HOLD', 'AUTOPILOT GLIDESLOPE HOLD', 'AUTOPILOT_GLIDEPATH_HOLD']);
        if (gsHold !== undefined) updateBtn('btn-ap-glid', isTrue(gsHold));

        // Targets & Values
        const hdgVal = getVal(state, ['AUTOPILOT_HEADING_LOCK_DIR', 'AUTOPILOT HEADING LOCK DIR', 'HEADING_BUG']);
        if (hdgVal !== undefined) {
            const el = document.getElementById('disp-ap-hdg');
            if (el) {
                const deg = Math.round(Number(hdgVal)) || 0;
                el.innerText = `${deg.toString().padStart(3, '0')}°`;
            }
        }

        const altVal = getVal(state, ['AUTOPILOT_ALTITUDE_LOCK_VAR', 'AUTOPILOT ALTITUDE LOCK VAR', 'AP_ALTITUDE_TARGET']);
        if (altVal !== undefined) {
            const el = document.getElementById('disp-ap-alt');
            if (el) {
                const alt = Math.round(Number(altVal)) || 0;
                el.innerText = alt.toString().padStart(5, '0');
            }
        }

        const vsVal = getVal(state, ['AUTOPILOT_VERTICAL_HOLD_VAR', 'AUTOPILOT VERTICAL HOLD VAR', 'AP_VS_TARGET']);
        if (vsVal !== undefined) {
            const el = document.getElementById('disp-ap-vs');
            if (el) {
                const vs = Math.round(Number(vsVal)) || 0;
                const sign = vs >= 0 ? '+' : '';
                el.innerText = `${sign}${vs}`;
            }
        }

        const spdVal = getVal(state, ['AUTOPILOT_AIRSPEED_HOLD_VAR', 'AUTOPILOT AIRSPEED HOLD VAR', 'AP_SPD_TARGET']);
        if (spdVal !== undefined) {
            const el = document.getElementById('disp-ap-spd');
            if (el) {
                const spd = Math.round(Number(spdVal)) || 0;
                el.innerText = `${spd} KT`;
            }
        }
    }

    return {
        render,
        init,
        destroy,
        update
    };
})();