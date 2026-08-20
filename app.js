/**
 * FlightDeck Web App Controller
 * Manages WebSocket connectivity, global simulator state,
 * dynamic page loading, and automatic UI state synchronization on page activation.
 */

// Global FlightDeck Application Namespace
window.FlightDeck = window.FlightDeck || {};

(function () {
    'use strict';

    // Master Cache of all simulator variables received from the PC Bridge
    const simState = {};

    // Page Registry and State Tracking
    const pages = {};
    let activePageId = null;
    let ws = null;
    let reconnectTimer = null;

    // DOM Elements
    let pageContainer = null;
    let navButtons = [];
    let statusIndicator = null;

    /**
     * Initialize Application
     */
    function init() {
        pageContainer = document.getElementById('page-content') || document.getElementById('app') || document.body;
        navButtons = document.querySelectorAll('[data-page], .nav-btn, .nav-item');
        statusIndicator = document.getElementById('connection-status') || document.getElementById('status');

        setupNavigation();
        connectWebSocket();

        // Determine default page
        const defaultNav = document.querySelector('[data-page].active, .nav-btn.active') || navButtons[0];
        const defaultPageId = defaultNav ? (defaultNav.getAttribute('data-page') || defaultNav.dataset.page) : 'autopilot';

        if (defaultPageId) {
            switchPage(defaultPageId);
        }
    }

    /**
     * Register a page module into the FlightDeck framework
     * @param {string} id - Page identifier (e.g., 'autopilot', 'radios')
     * @param {object} pageModule - Object containing render(), init(), update()
     */
    function registerPage(id, pageModule) {
        pages[id] = pageModule;

        // If the newly registered page is the active one, render and sync immediately
        if (activePageId === id) {
            activatePage(id);
        }
    }

    /**
     * Setup navigation event listeners
     */
    function setupNavigation() {
        navButtons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const pageId = this.getAttribute('data-page') || this.dataset.page;
                if (pageId && pageId !== activePageId) {
                    switchPage(pageId);
                }
            });
        });
    }

    /**
     * Switch to a specific page
     * @param {string} pageId 
     */
    function switchPage(pageId) {
        activePageId = pageId;

        // Update navigation button active classes
        navButtons.forEach(btn => {
            const target = btn.getAttribute('data-page') || btn.dataset.page;
            if (target === pageId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Activate page if already loaded/registered
        if (pages[pageId]) {
            activatePage(pageId);
        } else {
            // Lazy load page script if not present
            loadPageScript(pageId);
        }
    }

    /**
     * Activate, render, and synchronize the active page with current simulator values
     * @param {string} pageId 
     */
    function activatePage(pageId) {
        const page = pages[pageId];
        if (!page) return;

        // 1. Render page structure if render method exists
        if (typeof page.render === 'function' && pageContainer) {
            pageContainer.innerHTML = page.render();
        }

        // 2. Initialize page event listeners / DOM controls
        if (typeof page.init === 'function') {
            page.init();
        }

        // 3. IMMEDIATELY sync page with master state cache
        // Passes both master state and helper references
        if (typeof page.update === 'function') {
            try {
                page.update(simState, simState);
            } catch (err) {
                console.error(`[FlightDeck] Error updating page '${pageId}' on activation:`, err);
            }
        }
    }

    /**
     * Dynamically loads a page module script if needed
     * @param {string} pageId 
     */
    function loadPageScript(pageId) {
        const scriptId = `page-script-${pageId}`;
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `pages/${pageId}.js`;
            script.onload = () => {
                if (pages[pageId]) {
                    activatePage(pageId);
                }
            };
            script.onerror = () => {
                console.error(`[FlightDeck] Failed to load page script: pages/${pageId}.js`);
            };
            document.head.appendChild(script);
        }
    }

    /**
     * WebSocket Connection & Reconnection Management
     */
    function connectWebSocket() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const host = window.location.hostname || 'localhost';
        const port = window.location.port || '8080';
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${host}:${port}`;

        updateStatus('connecting');

        try {
            ws = new WebSocket(wsUrl);

            ws.onopen = function () {
                console.log('[FlightDeck] Connected to PC Bridge');
                updateStatus('connected');
                clearTimeout(reconnectTimer);

                // Request initial full state sync from server if supported
                send({ type: 'request_all' });
            };

            ws.onmessage = function (event) {
                try {
                    const message = JSON.parse(event.data);
                    handleIncomingData(message);
                } catch (e) {
                    console.warn('[FlightDeck] Non-JSON or malformed WebSocket message received:', event.data);
                }
            };

            ws.onclose = function () {
                console.warn('[FlightDeck] WebSocket disconnected. Reconnecting in 2 seconds...');
                updateStatus('disconnected');
                scheduleReconnect();
            };

            ws.onerror = function (err) {
                console.error('[FlightDeck] WebSocket Error:', err);
                ws.close();
            };
        } catch (e) {
            console.error('[FlightDeck] Connection failed:', e);
            scheduleReconnect();
        }
    }

    function scheduleReconnect() {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWebSocket, 2000);
    }

    /**
     * Handle incoming data from the PC Bridge:
     * 1. Updates global simState cache
     * 2. Pushes updates to the currently active page
     */
    function handleIncomingData(data) {
        if (!data || typeof data !== 'object') return;

        // Normalize data payloads
        let payload = data;
        if (data.type === 'data' && data.payload) {
            payload = data.payload;
        } else if (data.data) {
            payload = data.data;
        }

        // Merge incoming values into master cache
        for (const [key, value] of Object.entries(payload)) {
            if (key !== 'type') {
                simState[key] = value;
            }
        }

        // Live-update active page
        if (activePageId && pages[activePageId]) {
            const activePage = pages[activePageId];
            if (typeof activePage.update === 'function') {
                try {
                    activePage.update(payload, simState);
                } catch (err) {
                    console.error(`[FlightDeck] Error live-updating active page '${activePageId}':`, err);
                }
            }
        }
    }

    /**
     * Send command/event to PC Bridge
     * @param {object|string} data 
     */
    function send(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const msg = typeof data === 'string' ? data : JSON.stringify(data);
            ws.send(msg);
        } else {
            console.warn('[FlightDeck] Cannot send command; WebSocket not connected.', data);
        }
    }

    /**
     * Helper to send simulator key events / SimConnect events
     * @param {string} eventName 
     * @param {number} [value=0] 
     */
    function triggerEvent(eventName, value = 0) {
        send({
            type: 'event',
            event: eventName,
            value: value
        });
    }

    /**
     * Update visual connection status indicator
     */
    function updateStatus(status) {
        if (!statusIndicator) return;
        statusIndicator.className = `status-${status}`;
        statusIndicator.textContent = status.toUpperCase();
    }

    // Expose Public API
    window.FlightDeck.registerPage = registerPage;
    window.FlightDeck.switchPage = switchPage;
    window.FlightDeck.send = send;
    window.FlightDeck.triggerEvent = triggerEvent;
    window.FlightDeck.getState = (key) => key ? simState[key] : { ...simState };
    window.FlightDeck.pages = pages;

    // Initialize on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();