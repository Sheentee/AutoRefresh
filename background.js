// Store state in memory (Service Worker memory is volatile, but for this simple extension
// active usage usually keeps it alive, or we can persist to storage if needed.
// For robustness, we'll use chrome.storage.local to back up the config, 
// but run-state might need to be reconstructed).
// Actually, for a reliable MV3 refresher, we should rely on Alarms and Storage.

const STATE_KEY = 'tab_states';

// Helper to get state
async function getTabState(tabId) {
    const data = await chrome.storage.local.get(STATE_KEY);
    const states = data[STATE_KEY] || {};
    return states[tabId] || { isRunning: false, count: 0, interval: 30 };
}

// Helper to set state
async function setTabState(tabId, state) {
    const data = await chrome.storage.local.get(STATE_KEY);
    const states = data[STATE_KEY] || {};
    states[tabId] = state;
    await chrome.storage.local.set({ [STATE_KEY]: states });
}

// Helper to remove state
async function removeTabState(tabId) {
    const data = await chrome.storage.local.get(STATE_KEY);
    const states = data[STATE_KEY] || {};
    delete states[tabId];
    await chrome.storage.local.set({ [STATE_KEY]: states });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_REFRESH') {
        handleStart(request.tabId, request.interval).then(() => sendResponse({ success: true }));
        return true; // Keep channel open
    } else if (request.action === 'STOP_REFRESH') {
        handleStop(request.tabId).then(() => sendResponse({ success: true }));
        return true;
    } else if (request.action === 'GET_STATUS') {
        getTabState(request.tabId).then(state => sendResponse(state));
        return true;
    }
});

async function handleStart(tabId, interval) {
    const state = {
        isRunning: true,
        interval: interval,
        count: 0,
        nextRefresh: Date.now() + (interval * 1000)
    };
    await setTabState(tabId, state);

    // Set active icon
    await chrome.action.setIcon({
        path: "icons/active_128.png",
        tabId: tabId
    });

    // Create alarm
    chrome.alarms.create(`refresh-${tabId}`, {
        when: Date.now() + (interval * 1000)
    });
}

async function handleStop(tabId) {
    await chrome.alarms.clear(`refresh-${tabId}`);
    const state = await getTabState(tabId);
    state.isRunning = false;
    state.nextRefresh = null;
    await setTabState(tabId, state);

    // Set inactive icon
    await chrome.action.setIcon({
        path: "icons/inactive_128.png",
        tabId: tabId
    });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name.startsWith('refresh-')) {
        const tabId = parseInt(alarm.name.split('-')[1], 10);
        const state = await getTabState(tabId);

        if (state && state.isRunning) {
            // Check if tab still exists
            try {
                await chrome.tabs.get(tabId);

                // Ensure icon is active (in case of browser restart/state loss)
                chrome.action.setIcon({
                    path: "icons/active_128.png",
                    tabId: tabId
                });

                // Reload tab
                await chrome.tabs.reload(tabId);

                // Update state
                state.count++;
                state.nextRefresh = Date.now() + (state.interval * 1000);
                await setTabState(tabId, state);

                // Schedule next alarm
                chrome.alarms.create(`refresh-${tabId}`, {
                    when: Date.now() + (state.interval * 1000)
                });
            } catch (e) {
                // Tab likely closed, cleanup
                console.log(`Tab ${tabId} not found, stopping refresh.`);
                handleStop(tabId);
                removeTabState(tabId);
            }
        }
    }
});

// Cleanup on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.alarms.clear(`refresh-${tabId}`);
    removeTabState(tabId);
});

// Re-apply icon on tab update (reload resets the icon)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        const state = await getTabState(tabId);
        if (state && state.isRunning) {
            chrome.action.setIcon({
                path: "icons/active_128.png",
                tabId: tabId
            });
        }
    }
});
