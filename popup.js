document.addEventListener('DOMContentLoaded', async () => {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const intervalInput = document.getElementById('interval-input');
    const configSection = document.getElementById('config-section');
    const statusSection = document.getElementById('status-section');
    const refreshCountDisplay = document.getElementById('refresh-count');
    const countdownDisplay = document.getElementById('countdown');

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

    function updateUI(state, isInitialLoad = false) {
        if (state.isRunning) {
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
});
