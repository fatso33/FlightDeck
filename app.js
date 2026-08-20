import { autopilot } from './pages/autopilot.js';
import { radios } from './pages/radios.js';

// Page registry
const pages = {
    autopilot,
    radios
};

// Global simulator state cache (accumulates all received telemetry)
const simState = {};

let activePage = 'autopilot';
let ws = null;
let reconnectInterval = null;

// DOM Elements
const content = document.getElementById('content');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const navButtons = document.querySelectorAll('.nav-btn');

/**
 * Send command/event payload to the PC Bridge
 * @param {object|string} data 
 */
export function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        ws.send(payload);
    } else {
        console.warn('[FlightDeck] Cannot send message, WebSocket not connected:', data);
    }
}

/**
 * Helper to trigger SimConnect events
 * @param {string} event 
 * @param {number} [value=0] 
 */
export function sendEvent(event, value = 0) {
    send({
        type: 'event',
        event,
        value
    });
}

/**
 * Switch active page, render DOM, attach events, and immediately sync simulator state
 * @param {string} pageName 
 */
export function setPage(pageName) {
    if (!pages[pageName]) {
        console.error(`[FlightDeck] Page "${pageName}" not found.`);
        return;
    }

    activePage = pageName;

    // Update navigation bar button states
    navButtons.forEach((btn) => {
        if (btn.dataset.page === pageName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const page = pages[pageName];

    // 1. Render page HTML into content container
    if (content && typeof page.render === 'function') {
        content.innerHTML = page.render();
    }

    // 2. Attach page event listeners
    if (typeof page.init === 'function') {
        page.init(send);
    }

    // 3. Immediately synchronize newly active page with the accumulated state cache
    if (typeof page.update === 'function') {
        try {
            page.update(simState);
        } catch (err) {
            console.error(`[FlightDeck] Error updating page "${pageName}" on activation:`, err);
        }
    }
}

/**
 * Process incoming WebSocket data: update global cache and active page
 * @param {object} data 
 */
function handleData(data) {
    if (!data || typeof data !== 'object') return;

    // Merge incoming values into master cache
    for (const [key, value] of Object.entries(data)) {
        if (key !== 'type') {
            simState[key] = value;
        }
    }

    // Forward live delta update to the active page
    if (pages[activePage] && typeof pages[activePage].update === 'function') {
        try {
            pages[activePage].update(data);
        } catch (err) {
            console.error(`[FlightDeck] Error updating active page "${activePage}":`, err);
        }
    }
}

/**
 * Establish WebSocket connection to PC Bridge on Port 3000
 */
function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const host = window.location.hostname || 'localhost';
    const wsUrl = `ws://${host}:3000`;

    updateStatus('connecting');

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[FlightDeck] Connected to PC Bridge on port 3000');
            updateStatus('connected');
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleData(message);
            } catch (err) {
                console.warn('[FlightDeck] Non-JSON message received:', event.data);
            }
        };

        ws.onclose = () => {
            updateStatus('disconnected');
            if (!reconnectInterval) {
                reconnectInterval = setInterval(connectWebSocket, 2000);
            }
        };

        ws.onerror = (err) => {
            console.error('[FlightDeck] WebSocket error:', err);
            ws.close();
        };
    } catch (err) {
        console.error('[FlightDeck] Connection failed:', err);
        if (!reconnectInterval) {
            reconnectInterval = setInterval(connectWebSocket, 2000);
        }
    }
}

/**
 * Update UI connection status indicator
 * @param {'connected'|'connecting'|'disconnected'} status 
 */
function updateStatus(status) {
    if (statusDot) {
        statusDot.className = `status-dot ${status}`;
    }
    if (statusText) {
        statusText.textContent = status.toUpperCase();
    }
}

/**
 * Setup navigation listeners
 */
function setupNav() {
    navButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetPage = btn.dataset.page;
            if (targetPage && targetPage !== activePage) {
                setPage(targetPage);
            }
        });
    });
}

/**
 * App initialization
 */
function init() {
    // Register service worker for offline/PWA support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
            console.warn('[FlightDeck] Service worker registration failed:', err);
        });
    }

    setupNav();
    connectWebSocket();
    setPage(activePage);
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}