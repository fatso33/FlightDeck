// FlightDeck Web App Controller
let socket = null;
let currentPage = null;
let currentProfile = null;
let profiles = [];
let appState = {};
let reconnectInterval = null;

// Page registry
const pages = {
    radios: typeof RadiosPage !== 'undefined' ? RadiosPage : null,
    autopilot: typeof AutopilotPage !== 'undefined' ? AutopilotPage : null
};

// Initialize Application on DOM Ready
function init() {
    setupDrawer();
    setupNavigation();
    setupProfileSelector();
    connectWebSocket();
    loadPage('radios'); // Default page
}

// Side Drawer (Menu) Toggle
function setupDrawer() {
    const menuBtn = document.getElementById('menu-btn');
    const drawer = document.getElementById('nav-drawer');
    const overlay = document.getElementById('menu-overlay');

    function toggleDrawer(open) {
        if (!drawer || !overlay) return;
        const isOpen = open !== undefined ? open : !drawer.classList.contains('open');
        if (isOpen) {
            drawer.classList.add('open');
            overlay.classList.add('active');
        } else {
            drawer.classList.remove('open');
            overlay.classList.remove('active');
        }
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleDrawer();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => toggleDrawer(false));
    }

    window.closeDrawer = () => toggleDrawer(false);
}

// Navigation Handler
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = item.getAttribute('data-page');

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            if (window.closeDrawer) {
                window.closeDrawer();
            }

            loadPage(pageName);
        });
    });
}

// Load dynamic page content
function loadPage(pageName) {
    const pageContainer = document.getElementById('page-container');
    if (!pageContainer) return;

    if (currentPage && pages[currentPage] && typeof pages[currentPage].destroy === 'function') {
        pages[currentPage].destroy();
    }

    currentPage = pageName;
    const pageModule = pages[pageName];

    if (pageModule) {
        pageContainer.innerHTML = pageModule.render();
        if (typeof pageModule.init === 'function') {
            pageModule.init();
        }
        // Immediately sync state with newly rendered template
        if (typeof pageModule.update === 'function') {
            pageModule.update(appState);
        }
    } else {
        pageContainer.innerHTML = `<div class="p-4 text-center">Page "${pageName}" not found.</div>`;
    }
}

// Profile Selector Handler
function setupProfileSelector() {
    const profileSelect = document.getElementById('profile-select');
    if (profileSelect) {
        profileSelect.addEventListener('change', (e) => {
            const profileId = e.target.value;
            setProfile(profileId);
        });
    }
}

function setProfile(profileId) {
    currentProfile = profileId;
    sendEvent('SET_PROFILE', { profileId: profileId });
}

// WebSocket Connection Manager
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = window.location.port || '3000';
    const wsUrl = `${protocol}//${host}:${port}/ws`;

    updateConnectionStatus('connecting', 'Connecting...');

    try {
        socket = new WebSocket(wsUrl);
    } catch (e) {
        console.error('WebSocket Init Error:', e);
        scheduleReconnect();
        return;
    }

    socket.onopen = () => {
        updateConnectionStatus('connected', 'Connected');
        clearInterval(reconnectInterval);
        reconnectInterval = null;
        sendEvent('GET_PROFILES', {});
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleIncomingMessage(data);
        } catch (err) {
            console.error('Error parsing incoming message:', err);
        }
    };

    socket.onclose = () => {
        updateConnectionStatus('disconnected', 'Disconnected');
        scheduleReconnect();
    };

    socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
        socket.close();
    };
}

function scheduleReconnect() {
    if (!reconnectInterval) {
        reconnectInterval = setInterval(connectWebSocket, 3000);
    }
}

// Update Header Connection Status Display
function updateConnectionStatus(status, text) {
    const connectionStatus = document.getElementById('connection-status');
    const statusText = document.getElementById('status-text');

    if (connectionStatus) {
        connectionStatus.className = 'status-indicator ' + status;
    }
    if (statusText) {
        statusText.innerText = text;
    }
}

// Message Dispatcher
function handleIncomingMessage(msg) {
    if (!msg) return;

    switch (msg.type) {
        case 'PROFILES_LIST':
            if (msg.data) {
                populateProfiles(msg.data.profiles, msg.data.activeProfile);
            }
            break;

        case 'STATE_UPDATE':
            if (msg.data) {
                appState = { ...appState, ...msg.data };
                if (currentPage && pages[currentPage] && typeof pages[currentPage].update === 'function') {
                    pages[currentPage].update(appState);
                }
            }
            break;

        case 'SIM_STATUS':
            if (msg.data && msg.data.connected) {
                updateConnectionStatus('connected', 'Sim Connected');
            } else {
                updateConnectionStatus('connecting', 'Sim Disconnected');
            }
            break;

        default:
            if (msg.data) {
                appState = { ...appState, ...msg.data };
                if (currentPage && pages[currentPage] && typeof pages[currentPage].update === 'function') {
                    pages[currentPage].update(appState);
                }
            }
            break;
    }
}

// Populate the profile drop-down list
function populateProfiles(profileList, activeId) {
    const profileSelect = document.getElementById('profile-select');
    if (!profileSelect) return;

    profiles = profileList || [];
    profileSelect.innerHTML = '';

    profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = p.name;
        if (p.id === activeId) {
            opt.selected = true;
            currentProfile = p.id;
        }
        profileSelect.appendChild(opt);
    });
}

// Global Send Event function to trigger SimConnect actions
window.sendEvent = function(eventName, value) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const payload = {
            type: 'COMMAND',
            event: eventName,
            value: value !== undefined ? value : null
        };
        socket.send(JSON.stringify(payload));
    } else {
        console.warn('Socket not open. Failed to send event:', eventName, value);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);