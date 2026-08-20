// FlightDeck Web App Controller
let socket = null;
let currentPage = null;
let currentProfile = null;
let profiles = [];
let appState = {};
let reconnectInterval = null;

// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');
const profileSelect = document.getElementById('profile-select');
const pageContainer = document.getElementById('page-container');
const navItems = document.querySelectorAll('.nav-item');

// Page registry
const pages = {
    radios: RadiosPage,
    autopilot: AutopilotPage
};

// Initialize the Application
function init() {
    setupNavigation();
    setupProfileSelector();
    connectWebSocket();
    loadPage('radios'); // Default page
}

// Navigation Handler
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = item.getAttribute('data-page');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            loadPage(pageName);
        });
    });
}

// Load dynamic page content
function loadPage(pageName) {
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
        // Immediately sync the newly rendered page with the current simulator state
        if (typeof pageModule.update === 'function') {
            pageModule.update(appState);
        }
    } else {
        pageContainer.innerHTML = `<div class="p-4 text-center">Page "${pageName}" not found.</div>`;
    }
}

// Profile Selector Handler
function setupProfileSelector() {
    profileSelect.addEventListener('change', (e) => {
        const profileId = e.target.value;
        setProfile(profileId);
    });
}

// Set active profile and inform PC Bridge
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

    socket = new WebSocket(wsUrl);

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
        if (!reconnectInterval) {
            reconnectInterval = setInterval(connectWebSocket, 3000);
        }
    };

    socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
        socket.close();
    };
}

// Update Header Connection Status Display
function updateConnectionStatus(status, text) {
    connectionStatus.className = 'status-indicator ' + status;
    statusText.innerText = text;
}

// Message Dispatcher
function handleIncomingMessage(msg) {
    switch (msg.type) {
        case 'PROFILES_LIST':
            populateProfiles(msg.data.profiles, msg.data.activeProfile);
            break;
            
        case 'STATE_UPDATE':
            appState = { ...appState, ...msg.data };
            if (currentPage && pages[currentPage] && typeof pages[currentPage].update === 'function') {
                pages[currentPage].update(appState);
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