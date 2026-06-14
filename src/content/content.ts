import { STORAGE_KEY } from "../shared/constants";
import { StorageSchema } from "../shared/types";
import { normalizeDomain } from "../shared/configParser";

let countdownInterval: number | null = null;
let isCurrentlyBlocked = false;
let currentThrottledAt: number | null = null;
let currentCooldown: number = 0;

async function checkStatus() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as StorageSchema;
  if (!storage) return;

  const domain = normalizeDomain(window.location.hostname);
  const state = storage.state[domain];
  const config = storage.config[domain];

  const shouldBeBlocked = state && state.status === "throttled";

  if (shouldBeBlocked) {
    if (!isCurrentlyBlocked) {
      const refillSources = config.refillSources?.map(s => normalizeDomain(s.domain)) || [];
      currentThrottledAt = state.throttledAt;
      currentCooldown = config.cooldownMinutes;
      blockPage(domain, refillSources);
    } else {
      currentThrottledAt = state.throttledAt;
      currentCooldown = config.cooldownMinutes;
    }
  } else if (isCurrentlyBlocked) {
    unblockPage();
  }
}

function blockPage(domain: string, refillSources: string[]) {
  isCurrentlyBlocked = true;
  
  const html = `
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>system.interrupt | 429</title>
      <style>
        :root { --bg: #05060a; --surface: #0a0c14; --border: #1a1d2e; --accent: #6366f1; --red: #f43f5e; --green: #10b981; --text: #818cf8; --text-dim: #475569; --text-bright: #e2e8f0; }
        * { margin: 0; padding: 0; box-sizing: border-box; outline: none; }
        body { background: var(--bg); color: var(--text-bright); font-family: 'JetBrains Mono', 'Menlo', monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-transform: lowercase; overflow: hidden; }
        .terminal { max-width: 480px; width: 90%; border: 1px solid var(--border); background: var(--surface); border-radius: 6px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); position: relative; overflow: hidden; animation: slideIn 0.4s ease-out; }
        .terminal-header { background: #111425; padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; gap: 6px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); }
        .content { padding: 40px; }
        .meta { color: var(--accent); font-size: 11px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
        .meta::before { content: ''; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 10px var(--accent); }
        h1 { font-size: 20px; font-weight: 500; margin-bottom: 12px; color: var(--text-bright); }
        .desc { font-size: 13px; color: var(--text-dim); margin-bottom: 40px; line-height: 1.6; }
        .domain { color: var(--accent); border-bottom: 1px dashed var(--accent); }
        .timer-box { margin-bottom: 40px; }
        .label { font-size: 10px; color: var(--red); font-weight: 700; letter-spacing: 0.1em; margin-bottom: 8px; }
        #timer { font-size: 48px; color: var(--text-bright); letter-spacing: -0.02em; }
        .refill-label { font-size: 10px; color: var(--green); font-weight: 700; letter-spacing: 0.1em; margin-bottom: 16px; }
        .list { display: flex; flex-direction: column; gap: 10px; }
        .item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 1px solid var(--border); border-radius: 4px; text-decoration: none; color: var(--text-dim); font-size: 13px; transition: all 0.2s; }
        .item:hover { border-color: var(--accent); background: #111425; color: var(--text-bright); transform: scale(1.02); }
        .arrow { color: var(--accent); font-weight: bold; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </head>
    <body>
      <div class="terminal">
        <div class="terminal-header"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <div class="content">
          <div class="meta">attention_api // signal.interrupted</div>
          <h1>rate limit exceeded</h1>
          <p class="desc">resource <span class="domain">${domain}</span> is locked. focus reserve depleted.</p>
          
          <div class="timer-box">
            <div class="label">cooldown_active</div>
            <div id="timer">--:--</div>
          </div>

          <div class="refill-section">
            <div class="refill-label">unlock_pathways</div>
            <div class="list">
              ${refillSources.length > 0 ? refillSources.map(s => `
                <a href="https://${s}" class="item">
                  <span>${s}</span>
                  <span class="arrow">GO_REFILL</span>
                </a>
              `).join("") : `<div style="color: var(--text-dim); font-size: 11px; font-style: italic;">no refill sources configured for this node.</div>`}
            </div>
          </div>
        </div>
      </div>
    </body>
  `;

  document.documentElement.innerHTML = html;
  startCountdown();
}

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const update = () => {
    const timerEl = document.getElementById("timer");
    if (!timerEl || !currentThrottledAt) return;

    const expiry = currentThrottledAt + (currentCooldown * 60 * 1000);
    const diff = expiry - Date.now();
    
    if (diff <= 0) {
      timerEl.innerText = "00:00";
      clearInterval(countdownInterval!);
      countdownInterval = null;
      checkStatus();
      return;
    }

    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    timerEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  update();
  countdownInterval = window.setInterval(update, 1000);
}

function unblockPage() {
  isCurrentlyBlocked = false;
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  window.location.reload();
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    checkStatus();
  }
});

checkStatus();