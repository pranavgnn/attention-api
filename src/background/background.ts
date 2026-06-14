import { ALARM_NAME } from "../shared/constants";
import { tick, applyOverride } from "../shared/tokenEngine";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    const activeTab = await getActiveTab();
    const domain = activeTab ? new URL(activeTab.url!).hostname.replace("www.", "") : null;
    await tick(domain);
  }
});

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