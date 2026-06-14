import { STORAGE_KEY } from "../shared/constants";
import { StorageSchema } from "../shared/types";
import { normalizeDomain } from "../shared/configParser";

let countdownInterval: number | null = null;

async function checkStatus() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as StorageSchema;
  if (!storage) return;

  const domain = normalizeDomain(window.location.hostname);
  const state = storage.state[domain];
  const config = storage.config[domain];

  if (state && state.status === "throttled") {
    const refillSources = Object.keys(storage.config).filter(d => 
      storage.config[d].refillTargets.some(t => normalizeDomain(t.domain) === domain)
    );
    blockPage(domain, state.throttledAt, config.cooldownMinutes, refillSources);
  } else {
    unblockPage();
  }
}

function blockPage(domain: string, throttledAt: number | null, cooldown: number, refillSources: string[]) {
  if (document.getElementById("attention-api-blocker")) {
    updateCountdown(throttledAt, cooldown);
    return;
  }

  document.body.style.display = 'none';
  const blocker = document.createElement("div");
  blocker.id = "attention-api-blocker";
  
  blocker.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: #0a0b10; color: #94a3b8; display: flex; flex-direction: column;
    align-items: center; justify-content: center; z-index: 2147483647;
    font-family: 'Inter', 'Menlo', monospace; text-transform: lowercase;
    padding: 40px; text-align: center; overflow: hidden;
  `;

  blocker.innerHTML = `
    <div style="max-width: 500px; width: 100%; animation: fadeIn 0.8s ease-out;">
      <div style="color: #6366f1; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; margin-bottom: 24px;">[system.interrupt]</div>
      <h1 style="color: #f8fafc; font-size: 24px; font-weight: 500; margin-bottom: 8px; letter-spacing: -0.02em;">429: too many requests</h1>
      <p style="color: #64748b; font-size: 13px; margin-bottom: 48px;">attention reserve depleted for <span style="color: #6366f1;">${domain}</span></p>
      
      <div style="background: #0f172a; border: 1px solid #1e293b; padding: 32px; border-radius: 4px; margin-bottom: 48px;">
        <div id="countdown-label" style="color: #ef4444; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 8px;">cooldown.active</div>
        <div id="countdown-timer" style="color: #f8fafc; font-size: 32px; font-weight: 400; font-family: 'JetBrains Mono', 'Courier New', monospace;">00:00</div>
      </div>

      <div style="text-align: left;">
        <div style="color: #4ade80; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 16px;">refill.available</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${refillSources.length > 0 ? refillSources.map(s => `
            <a href="https://${s}" style="
              display: flex; justify-content: space-between; align-items: center;
              background: #0f172a; border: 1px solid #1e293b; padding: 12px 16px;
              color: #94a3b8; text-decoration: none; border-radius: 4px; font-size: 13px;
              transition: all 0.2s ease;
            " onmouseover="this.style.borderColor='#6366f1'; this.style.color='#f8fafc'" onmouseout="this.style.borderColor='#1e293b'; this.style.color='#94a3b8'">
              <span>${s}</span>
              <span style="color: #6366f1; font-size: 10px;">→ refill</span>
            </a>
          `).join("") : `<div style="color: #475569; font-size: 12px; font-style: italic;">no active refill sources configured.</div>`}
        </div>
      </div>
    </div>
    <style>
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      body { overflow: hidden !important; }
    </style>
  `;

  document.documentElement.appendChild(blocker);
  startCountdown(throttledAt, cooldown);
}

function startCountdown(throttledAt: number | null, cooldown: number) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const update = () => {
    const timerEl = document.getElementById("countdown-timer");
    if (!timerEl || !throttledAt) return;

    const expiry = throttledAt + (cooldown * 60 * 1000);
    const diff = expiry - Date.now();
    
    if (diff <= 0) {
      timerEl.innerText = "00:00";
      clearInterval(countdownInterval!);
      checkStatus(); // Re-check to unblock
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
  // Restart interval with new data if needed
  startCountdown(throttledAt, cooldown);
}

function unblockPage() {
  const blocker = document.getElementById("attention-api-blocker");
  if (blocker) {
    blocker.remove();
    document.body.style.display = '';
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    checkStatus();
  }
});

checkStatus();