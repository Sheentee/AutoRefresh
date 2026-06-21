document.addEventListener('DOMContentLoaded', async () => {
    // Check if running in extension context
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest;

    let isRefreshing = false;

    // Dynamic version title
    if (isExtension) {
        const manifestData = chrome.runtime.getManifest();
        const titleEl = document.getElementById('extension-title');
        if (titleEl) {
            titleEl.textContent = `${manifestData.name} v${manifestData.version}`;
        }
    } else {
        const titleEl = document.getElementById('extension-title');
        if (titleEl) {
            titleEl.textContent = "AutoRefresh v1.2";
        }
    }

    // Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const intervalInput = document.getElementById('interval-input');
    const configSection = document.getElementById('config-section');
    const statusSection = document.getElementById('status-section');
    const refreshCountDisplay = document.getElementById('refresh-count');
    const countdownDisplay = document.getElementById('countdown');

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isRefreshing) return;
            const targetTab = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active-content'));

            btn.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active-content');
            }
        });
    });

    function updateUI(state, isInitialLoad = false) {
        isRefreshing = state.isRunning;

        // Enable/Disable non-refresh tabs
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') !== 'refresh-tab') {
                if (isRefreshing) {
                    btn.classList.add('disabled');
                    btn.setAttribute('title', 'Locked while auto-refresh is active');
                } else {
                    btn.classList.remove('disabled');
                    btn.removeAttribute('title');
                }
            }
        });

        if (state.isRunning) {
            // Force active tab to refresh-tab if it's running
            const refreshTabBtn = document.querySelector('[data-tab="refresh-tab"]');
            if (refreshTabBtn && !refreshTabBtn.classList.contains('active')) {
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active-content'));
                refreshTabBtn.classList.add('active');
                const refreshTabContent = document.getElementById('refresh-tab');
                if (refreshTabContent) {
                    refreshTabContent.classList.add('active-content');
                }
            }

            configSection.classList.add('hidden');
            statusSection.classList.remove('hidden');
            refreshCountDisplay.textContent = state.count;

            // Update countdown
            if (state.nextRefresh) {
                const now = Date.now();
                const diff = Math.max(0, Math.ceil((state.nextRefresh - now) / 1000));
                countdownDisplay.textContent = diff;
            }
        } else {
            configSection.classList.remove('hidden');
            statusSection.classList.add('hidden');
            if (isInitialLoad && state.interval) {
                intervalInput.value = state.interval;
            }
        }
    }

    if (!isExtension) {
        console.warn('Chrome Extension APIs not available. Running in standalone test mode.');

        // Mock state & handlers for testing
        const mockState = { isRunning: false, count: 0, interval: 30, nextRefresh: null };
        let mockTimer;

        const updateMockUI = () => {
            updateUI(mockState);
        };

        startBtn.addEventListener('click', () => {
            const seconds = parseInt(intervalInput.value, 10);
            if (isNaN(seconds) || seconds < 1) {
                alert('Please enter a valid number of seconds (minimum 1).');
                return;
            }
            mockState.isRunning = true;
            mockState.interval = seconds;
            mockState.nextRefresh = Date.now() + (seconds * 1000);
            updateMockUI();

            mockTimer = setInterval(() => {
                if (mockState.nextRefresh) {
                    const diff = Math.max(0, Math.ceil((mockState.nextRefresh - Date.now()) / 1000));
                    if (diff === 0) {
                        mockState.count++;
                        mockState.nextRefresh = Date.now() + (mockState.interval * 1000);
                    }
                    updateMockUI();
                }
            }, 1000);
        });

        stopBtn.addEventListener('click', () => {
            mockState.isRunning = false;
            mockState.nextRefresh = null;
            clearInterval(mockTimer);
            updateMockUI();
        });

        return;
    }

    let countdownInterval;

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) return;

    // Check status on load
    checkStatus(true);

    // Poll status every second to update countdown and count
    setInterval(() => checkStatus(false), 1000);

    startBtn.addEventListener('click', () => {
        const seconds = parseInt(intervalInput.value, 10);
        if (isNaN(seconds) || seconds < 1) {
            alert('Please enter a valid number of seconds (minimum 1).');
            return;
        }

        chrome.runtime.sendMessage({
            action: 'START_REFRESH',
            tabId: tab.id,
            interval: seconds
        }, (response) => {
            if (response && response.success) {
                checkStatus();
            }
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'STOP_REFRESH',
            tabId: tab.id
        }, (response) => {
            if (response && response.success) {
                checkStatus();
            }
        });
    });

    function checkStatus(isInitialLoad = false) {
        chrome.runtime.sendMessage({
            action: 'GET_STATUS',
            tabId: tab.id
        }, (response) => {
            if (response) {
                updateUI(response, isInitialLoad);
            }
        });
    }
});
