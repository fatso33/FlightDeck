// Radios Page Module
const RadiosPage = (function () {
    let container = null;

    function render() {
        return `
        <div class="radios-page page-content">
            <!-- COM 1 -->
            <div class="card radio-card">
                <div class="radio-header">
                    <span class="radio-title">COM 1</span>
                    <button class="btn btn-swap" onclick="sendEvent('COM_STBY_RADIO_SWAP')">SWAP ⇄</button>
                </div>
                <div class="radio-freq-row">
                    <div class="freq-box active-freq">
                        <span class="freq-label">ACTIVE</span>
                        <span class="freq-value" id="disp-com1-active">118.000</span>
                    </div>
                    <div class="freq-box stby-freq">
                        <span class="freq-label">STBY</span>
                        <span class="freq-value" id="disp-com1-stby">122.800</span>
                    </div>
                </div>
                <div class="freq-controls">
                    <div class="control-group">
                        <span class="control-label">MHz</span>
                        <button class="btn btn-step" onclick="sendEvent('COM_RADIO_WHOLE_DEC')">-1</button>
                        <button class="btn btn-step" onclick="sendEvent('COM_RADIO_WHOLE_INC')">+1</button>
                    </div>
                    <div class="control-group">
                        <span class="control-label">kHz</span>
                        <button class="btn btn-step" onclick="sendEvent('COM_RADIO_FRACT_DEC')">-.025</button>
                        <button class="btn btn-step" onclick="sendEvent('COM_RADIO_FRACT_INC')">+.025</button>
                    </div>
                </div>
            </div>

            <!-- COM 2 -->
            <div class="card radio-card">
                <div class="radio-header">
                    <span class="radio-title">COM 2</span>
                    <button class="btn btn-swap" onclick="sendEvent('COM2_RADIO_SWAP')">SWAP ⇄</button>
                </div>
                <div class="radio-freq-row">
                    <div class="freq-box active-freq">
                        <span class="freq-label">ACTIVE</span>
                        <span class="freq-value" id="disp-com2-active">119.100</span>
                    </div>
                    <div class="freq-box stby-freq">
                        <span class="freq-label">STBY</span>
                        <span class="freq-value" id="disp-com2-stby">121.500</span>
                    </div>
                </div>
                <div class="freq-controls">
                    <div class="control-group">
                        <span class="control-label">MHz</span>
                        <button class="btn btn-step" onclick="sendEvent('COM2_RADIO_WHOLE_DEC')">-1</button>
                        <button class="btn btn-step" onclick="sendEvent('COM2_RADIO_WHOLE_INC')">+1</button>
                    </div>
                    <div class="control-group">
                        <span class="control-label">kHz</span>
                        <button class="btn btn-step" onclick="sendEvent('COM2_RADIO_FRACT_DEC')">-.025</button>
                        <button class="btn btn-step" onclick="sendEvent('COM2_RADIO_FRACT_INC')">+.025</button>
                    </div>
                </div>
            </div>

            <!-- NAV 1 -->
            <div class="card radio-card">
                <div class="radio-header">
                    <span class="radio-title">NAV 1</span>
                    <button class="btn btn-swap" onclick="sendEvent('NAV1_RADIO_SWAP')">SWAP ⇄</button>
                </div>
                <div class="radio-freq-row">
                    <div class="freq-box active-freq">
                        <span class="freq-label">ACTIVE</span>
                        <span class="freq-value" id="disp-nav1-active">110.30</span>
                    </div>
                    <div class="freq-box stby-freq">
                        <span class="freq-label">STBY</span>
                        <span class="freq-value" id="disp-nav1-stby">113.70</span>
                    </div>
                </div>
                <div class="freq-controls">
                    <div class="control-group">
                        <span class="control-label">MHz</span>
                        <button class="btn btn-step" onclick="sendEvent('NAV1_RADIO_WHOLE_DEC')">-1</button>
                        <button class="btn btn-step" onclick="sendEvent('NAV1_RADIO_WHOLE_INC')">+1</button>
                    </div>
                    <div class="control-group">
                        <span class="control-label">kHz</span>
                        <button class="btn btn-step" onclick="sendEvent('NAV1_RADIO_FRACT_DEC')">-.05</button>
                        <button class="btn btn-step" onclick="sendEvent('NAV1_RADIO_FRACT_INC')">+.05</button>
                    </div>
                </div>
            </div>

            <!-- NAV 2 -->
            <div class="card radio-card">
                <div class="radio-header">
                    <span class="radio-title">NAV 2</span>
                    <button class="btn btn-swap" onclick="sendEvent('NAV2_RADIO_SWAP')">SWAP ⇄</button>
                </div>
                <div class="radio-freq-row">
                    <div class="freq-box active-freq">
                        <span class="freq-label">ACTIVE</span>
                        <span class="freq-value" id="disp-nav2-active">111.10</span>
                    </div>
                    <div class="freq-box stby-freq">
                        <span class="freq-label">STBY</span>
                        <span class="freq-value" id="disp-nav2-stby">117.00</span>
                    </div>
                </div>
                <div class="freq-controls">
                    <div class="control-group">
                        <span class="control-label">MHz</span>
                        <button class="btn btn-step" onclick="sendEvent('NAV2_RADIO_WHOLE_DEC')">-1</button>
                        <button class="btn btn-step" onclick="sendEvent('NAV2_RADIO_WHOLE_INC')">+1</button>
                    </div>
                    <div class="control-group">
                        <span class="control-label">kHz</span>
                        <button class="btn btn-step" onclick="sendEvent('NAV2_RADIO_FRACT_DEC')">-.05</button>
                        <button class="btn btn-step" onclick="sendEvent('NAV2_RADIO_FRACT_INC')">+.05</button>
                    </div>
                </div>
            </div>

            <!-- Transponder & Baro -->
            <div class="card xpndr-card">
                <div class="xpndr-section">
                    <div class="control-label">TRANSPONDER</div>
                    <div class="val-display" id="disp-xpndr">1200</div>
                    <div class="xpndr-actions">
                        <button class="btn btn-step" onclick="sendEvent('XPNDR_1200')">VFR</button>
                        <button class="btn btn-step" onclick="sendEvent('XPNDR_IDENT')">IDENT</button>
                    </div>
                </div>
                <div class="baro-section">
                    <div class="control-label">ALTIMETER / BARO</div>
                    <div class="val-display" id="disp-baro">29.92</div>
                    <div class="baro-actions">
                        <button class="btn btn-step" onclick="sendEvent('KOHLSMAN_DEC')">-</button>
                        <button class="btn btn-step" onclick="sendEvent('BAROMETRIC')">STD</button>
                        <button class="btn btn-step" onclick="sendEvent('KOHLSMAN_INC')">+</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function init() {
        container = document.querySelector('.radios-page');
    }

    function destroy() {
        container = null;
    }

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

    function formatFreq(val, decimals) {
        const num = parseFloat(val);
        if (isNaN(num)) return val || '';
        return num.toFixed(decimals);
    }

    function update(state) {
        if (!state) return;

        // COM1
        const com1Act = getVal(state, ['COM_ACTIVE_FREQUENCY:1', 'COM ACTIVE FREQUENCY:1', 'COM1_ACTIVE']);
        if (com1Act !== undefined) {
            const el = document.getElementById('disp-com1-active');
            if (el) el.innerText = formatFreq(com1Act, 3);
        }
        const com1Stby = getVal(state, ['COM_STANDBY_FREQUENCY:1', 'COM STANDBY FREQUENCY:1', 'COM1_STBY']);
        if (com1Stby !== undefined) {
            const el = document.getElementById('disp-com1-stby');
            if (el) el.innerText = formatFreq(com1Stby, 3);
        }

        // COM2
        const com2Act = getVal(state, ['COM_ACTIVE_FREQUENCY:2', 'COM ACTIVE FREQUENCY:2', 'COM2_ACTIVE']);
        if (com2Act !== undefined) {
            const el = document.getElementById('disp-com2-active');
            if (el) el.innerText = formatFreq(com2Act, 3);
        }
        const com2Stby = getVal(state, ['COM_STANDBY_FREQUENCY:2', 'COM STANDBY FREQUENCY:2', 'COM2_STBY']);
        if (com2Stby !== undefined) {
            const el = document.getElementById('disp-com2-stby');
            if (el) el.innerText = formatFreq(com2Stby, 3);
        }

        // NAV1
        const nav1Act = getVal(state, ['NAV_ACTIVE_FREQUENCY:1', 'NAV ACTIVE FREQUENCY:1', 'NAV1_ACTIVE']);
        if (nav1Act !== undefined) {
            const el = document.getElementById('disp-nav1-active');
            if (el) el.innerText = formatFreq(nav1Act, 2);
        }
        const nav1Stby = getVal(state, ['NAV_STANDBY_FREQUENCY:1', 'NAV STANDBY FREQUENCY:1', 'NAV1_STBY']);
        if (nav1Stby !== undefined) {
            const el = document.getElementById('disp-nav1-stby');
            if (el) el.innerText = formatFreq(nav1Stby, 2);
        }

        // NAV2
        const nav2Act = getVal(state, ['NAV_ACTIVE_FREQUENCY:2', 'NAV ACTIVE FREQUENCY:2', 'NAV2_ACTIVE']);
        if (nav2Act !== undefined) {
            const el = document.getElementById('disp-nav2-active');
            if (el) el.innerText = formatFreq(nav2Act, 2);
        }
        const nav2Stby = getVal(state, ['NAV_STANDBY_FREQUENCY:2', 'NAV STANDBY FREQUENCY:2', 'NAV2_STBY']);
        if (nav2Stby !== undefined) {
            const el = document.getElementById('disp-nav2-stby');
            if (el) el.innerText = formatFreq(nav2Stby, 2);
        }

        // Transponder
        const xpndr = getVal(state, ['TRANSPONDER_CODE:1', 'TRANSPONDER CODE:1', 'XPNDR_CODE']);
        if (xpndr !== undefined) {
            const el = document.getElementById('disp-xpndr');
            if (el) el.innerText = xpndr.toString().padStart(4, '0');
        }

        // Baro
        const baro = getVal(state, ['KOHLSMAN_SETTING_HG', 'KOHLSMAN SETTING HG', 'BARO']);
        if (baro !== undefined) {
            const el = document.getElementById('disp-baro');
            if (el) el.innerText = formatFreq(baro, 2);
        }
    }

    return {
        render,
        init,
        destroy,
        update
    };
})();