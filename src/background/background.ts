import { tick, applyOverride } from "../shared/tokenEngine";
import { normalizeDomain } from "../shared/configParser";
import { ALARM_NAME } from "../shared/constants";

// Wake up logic
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    const activeTab = await getActiveTab();
    await processTick(activeTab);
  }
});

async function processTick(tab: chrome.tabs.Tab | null) {
  let domain = null;
  if (tab?.url && tab.url.startsWith("http")) {
    try {
      domain = normalizeDomain(new URL(tab.url).hostname);
    } catch (e) {
      // Invalid URL
    }
  }
  await tick(domain);
}

// MV3 Service worker can be killed anytime. 
// We use a 1s interval for real-time tracking while active.
setInterval(async () => {
  const activeTab = await getActiveTab();
  await processTick(activeTab);
}, 1000);

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs[0] || null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OVERRIDE") {
    applyOverride(message.domain, message.reason).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});