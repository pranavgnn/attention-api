import { STORAGE_KEY } from "../shared/constants";
import { StorageSchema } from "../shared/types";

async function checkStatus() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as StorageSchema;
  if (!storage) return;

  const domain = window.location.hostname.replace("www.", "");
  const state = storage.state[domain];
  const config = storage.config[domain];

  if (state && state.status === "throttled") {
    blockPage(domain, state.throttledAt, config.cooldownMinutes);
  } else {
    unblockPage();
  }
}

function blockPage(domain: string, throttledAt: number | null, cooldownMinutes: number) {
  if (document.getElementById("attention-api-blocker")) return;

  const blocker = document.createElement("div");
  blocker.id = "attention-api-blocker";
  blocker.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #0a0b10;
    color: #ef4444;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    text-transform: lowercase;
    padding: 40px;
    text-align: center;
  `;

  const cooldownMs = cooldownMinutes * 60 * 1000;
  const updateTimer = () => {
    if (!throttledAt) return "00:00";
    const remaining = cooldownMs - (Date.now() - throttledAt);
    if (remaining <= 0) return "00:00";
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  blocker.innerHTML = `
    <div style="font-size: 120px; font-weight: 800; margin-bottom: 20px; letter-spacing: -0.05em;">429</div>
    <div style="font-size: 24px; font-weight: 600; color: #f8fafc; margin-bottom: 40px;">attention limit exceeded</div>
    
    <div style="max-width: 500px; width: 100%; border: 1px solid #1f2232; padding: 30px; background: #12141c; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #94a3b8;">
        <span>node: ${domain}</span>
        <span>cooldown: <span id="blocker-timer" style="color: #f59e0b; font-weight: bold;">${updateTimer()}</span></span>
      </div>
      
      <div style="text-align: left; border-top: 1px solid #1f2232; pt: 20px;">
        <div style="font-size: 10px; color: #94a3b8; margin: 20px 0 10px;">refill strategy</div>
        <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
          to restore tokens: visit your configured <span style="color: #6366f1;">refill sources</span> (e.g. github, technical documentation). your reserve will automatically transfer to this domain once the cooldown expires.
        </div>
      </div>
    </div>
  `;

  document.documentElement.appendChild(blocker);
  document.documentElement.style.overflow = "hidden";

  const timerInt = setInterval(() => {
    const el = document.getElementById("blocker-timer");
    if (el) {
      const time = updateTimer();
      el.innerText = time;
      if (time === "00:00") clearInterval(timerInt);
    } else {
      clearInterval(timerInt);
    }
  }, 1000);
}

function unblockPage() {
  const blocker = document.getElementById("attention-api-blocker");
  if (blocker) {
    blocker.remove();
    document.documentElement.style.overflow = "";
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    checkStatus();
  }
});

checkStatus();