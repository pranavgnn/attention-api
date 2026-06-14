import { STORAGE_KEY } from "../shared/constants";
import { StorageSchema } from "../shared/types";
import { normalizeDomain } from "../shared/configParser";

let countdownInterval: number | null = null;
let isCurrentlyBlocked = false;
let originalHTML = "";

async function checkStatus() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as StorageSchema;
  if (!storage) return;

  const domain = normalizeDomain(window.location.hostname);
  const state = storage.state[domain];
  const config = storage.config[domain];

  const shouldBeBlocked = state && state.status === "throttled";

  if (shouldBeBlocked && !isCurrentlyBlocked) {
    const refillSources = Object.keys(storage.config).filter(d => 
      storage.config[d].refillTargets && 
      storage.config[d].refillTargets.some(t => normalizeDomain(t.domain) === domain)
    );
    blockPage(domain, state.throttledAt, config.cooldownMinutes, refillSources);
  } else if (!shouldBeBlocked && isCurrentlyBlocked) {
    unblockPage();
  } else if (shouldBeBlocked && isCurrentlyBlocked) {
    // Just update countdown if already blocked
    updateCountdown(state.throttledAt, config.cooldownMinutes);
  }
}

function blockPage(domain: string, throttledAt: number | null, cooldown: number, refillSources: string[]) {
  isCurrentlyBlocked = true;
  originalHTML = document.documentElement.innerHTML;

  const remainingSeconds = throttledAt ? Math.max(0, Math.ceil((throttledAt + cooldown * 60 * 1000 - Date.now()) / 1000)) : 0;
  const initialM = Math.floor(remainingSeconds / 60);
  const initialS = remainingSeconds % 60;

  const html = `
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>429 too many requests</title>
      <style>
        :root { --bg: #0a0b10; --surface: #0f111a; --border: #1e1b4b; --accent: #6366f1; --red: #ef4444; --green: #4ade80; --text: #94a3b8; --text-bright: #f8fafc; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', 'JetBrains Mono', monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-transform: lowercase; overflow: hidden; }
        .container { max-width: 440px; width: 90%; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .meta { color: var(--accent); font-size: 10px; font-weight: 700; letter-spacing: 0.2em; margin-bottom: 16px; opacity: 0.8; }
        h1 { color: var(--text-bright); font-size: 20px; font-weight: 500; margin-bottom: 8px; letter-spacing: -0.01em; }
        .desc { font-size: 13px; color: #64748b; margin-bottom: 40px; }
        .domain { color: var(--accent); font-weight: 600; }
        .card { background: var(--surface); border: 1px solid var(--border); padding: 32px; border-radius: 4px; margin-bottom: 40px; position: relative; }
        .card::before { content: ''; position: absolute; top: -1px; left: 20px; right: 20px; height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: 0.3; }
        .label { color: var(--red); font-size: 10px; font-weight: 700; letter-spacing: 0.15em; margin-bottom: 12px; }
        #timer { color: var(--text-bright); font-size: 40px; font-weight: 300; font-family: 'JetBrains Mono', monospace; tabular-nums: true; }
        .refill-section { text-align: left; }
        .refill-label { color: var(--green); font-size: 10px; font-weight: 700; letter-spacing: 0.15em; margin-bottom: 16px; }
        .refill-list { display: flex; flex-direction: column; gap: 8px; }
        .refill-item { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--border); padding: 12px 16px; color: var(--text); text-decoration: none; border-radius: 4px; font-size: 12px; transition: all 0.2s ease; }
        .refill-item:hover { border-color: var(--accent); color: var(--text-bright); transform: translateX(4px); }
        .refill-item span:last-child { color: var(--accent); font-size: 10px; font-weight: 600; }
        .empty { color: #475569; font-size: 11px; font-style: italic; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="meta">[system.interrupt]</div>
        <h1>429: too many requests</h1>
        <p class="desc">attention reserve depleted for <span class="domain">${domain}</span></p>
        
        <div class="card">
          <div class="label">cooldown.active</div>
          <div id="timer">${initialM.toString().padStart(2, '0')}:${initialS.toString().padStart(2, '0')}</div>
        </div>

        <div class="refill-section">
          <div class="refill-label">refill.sources</div>
          <div class="refill-list">
            ${refillSources.length > 0 ? refillSources.map(s => `
              <a href="https://${s}" class="refill-item">
                <span>${s}</span>
                <span>→ protocol</span>
              </a>
            `).join("") : `<div class="empty">no active refill sources configured.</div>`}
          </div>
        </div>
      </div>
    </body>
  `;

  document.documentElement.innerHTML = html;
  startCountdown(throttledAt, cooldown);
}

function startCountdown(throttledAt: number | null, cooldown: number) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const update = () => {
    const timerEl = document.getElementById("timer");
    if (!timerEl || !throttledAt) return;

    const expiry = throttledAt + (cooldown * 60 * 1000);
    const diff = expiry - Date.now();
    
    if (diff <= 0) {
      timerEl.innerText = "00:00";
      clearInterval(countdownInterval!);
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

function updateCountdown(throttledAt: number | null, cooldown: number) {
  // If timer element missing but we should be blocked, re-run checkStatus
  if (!document.getElementById("timer") && isCurrentlyBlocked) {
    isCurrentlyBlocked = false; // Force re-block
    checkStatus();
    return;
  }
}

function unblockPage() {
  isCurrentlyBlocked = false;
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  window.location.reload(); // Hard reload is safest after replacing entire innerHTML
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    checkStatus();
  }
});

checkStatus();