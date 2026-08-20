Flight Deck is a powerful client-server companion system designed for Microsoft Flight Simulator 2024.


The application consists of two primary components: a desktop companion server (PC Bridge) and an interactive touch-screen Web App (PWA).

1. The Desktop Server: PC Bridge
The newly added PC Bridge directory contains a desktop app built on Electron and Node.js that connects directly to MSFS 2024 and acts as a telemetry and command relay:
SimConnect Integration: Utilizing the node-simconnect library, the bridge connects to the flight simulator under the connection name 'MSFSControllerBridge'. It automatically subscribes to real-time flight telemetry (such as COM/NAV active and standby frequencies, and Transponder codes) and formats them cleanly for the front-end.
Configurable Aircraft Profiles: In profileManager.js and profiles.json, the bridge implements an advanced, dynamic profile mapping system. It lets users configure custom mappings of generic web app actions to specific SimConnect events and automatically scales/transforms values (using formats like HZ_INT for Hertz conversion, BCD_HEX for transponder BCD representation, or fixed states).
Active Profile: A custom A220 aircraft profile is currently configured as active, which dynamically feeds back to the client UI.
System Tray Companion: The server runs quietly in the system tray. The tray icon is dynamically color-coded: cyan when waiting for MSFS to load, and magenta once the SimConnect connection is active. The tray menu allows users to switch active aircraft profiles on the fly, launch the configuration window (config-ui.html), or inspect connection status.

2. The Front-End Web App
The user-facing dashboard hosted on GitHub Pages is optimized for mobile tablet displays (such as an iPad mounted in a physical home cockpit)
. It is a Progressive Web App (PWA)
 featuring viewport constraints to prevent browser scrolling and gesture bounciness:
WebSocket Auto-Connection: Upon launch, app.js attempts to open a WebSocket connection (ws://) to the PC Bridge. It uses the page's current host for local debugging or prompts the user to enter their PC's local network IP address (e.g., 10.0.0.222), which is saved persistently in LocalStorage.
Dynamic Profile Badge: Once connected, the client reads the PROFILE_STATE and displays the active aircraft profile (such as "A220") as a high-visibility badge in the header.
Radios Page (pages/radios.js):
Standby/Active Tuning: Displays COM1, COM2, NAV1, and NAV2 with active swap toggles.
Frequency Inputs: Frequencies are formatted to 3 decimals for COM and 2 decimals for NAV. Tuning standby frequencies features automatic formatting (e.g., adding decimals on input) and validation guards (COM: 118.000–136.975 MHz; NAV: 108.00–117.975 MHz) with visual error feedback.
LocalStorage Presets: Features 4 COMM and 4 NAV preset chips that can be configured via an interactive modal with custom labels and smart-input styling.
Transponder: A digital squawk input that restricts input to octal characters (0-7). It includes an IDENT button that triggers the XPNDR_IDENT client event and a VFR quick-set button that snaps the squawk directly to 1200.
Autopilot Page (pages/autopilot.js):
Mode Controls: Full enunciators and buttons for Master Autopilot (AP), Auto-Throttle (AT), Flight Director (FD), Wing Leveler (LVL), Take Off/Go Around (TOGA), Yaw Damper (YD), AP Disconnect, and lateral/vertical holds (HDG, NAV, BC, APR, ALT, VNV, VS, IAS, FLC).
Garmin-Style VS Scroll Wheel: Includes a horizontal scroll wheel for adjusting Vertical Speed. Users can drag/swipe left and right to increment or decrement the VS target by 100 fpm, utilizing touch pointer-capture events.
Lights Page: Currently set up with a placeholder notice ("AIRCRAFT LIGHTING Lighting Controls Coming Soon"), indicating where physical light controls will be implemented.
PWA Offline Support & Install: Implements service worker caching (sw.js) and a custom "Install App" modal with explicit, platform-specific steps for adding the app to the iOS Home Screen via Safari
 or Chrome's app launcher.
