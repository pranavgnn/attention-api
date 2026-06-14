import { tick, applyOverride } from "../shared/tokenEngine";

// MV3 Service worker can be killed anytime. 
// We use a 1s interval for real-time tracking while active.
setInterval(async () => {
  const activeTab = await getActiveTab();
  const domain = activeTab ? new URL(activeTab.url!).hostname.replace("www.", "") : null;
  await tick(domain);
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