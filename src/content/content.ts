import { STORAGE_KEY } from "../shared/constants";
import { StorageSchema } from "../shared/types";
import { normalizeDomain } from "../shared/configParser";

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
  if (document.getElementById("attention-api-blocker")) return;

  // Hide the body to prevent the site content from showing
  document.body.style.display = 'none';

  const blocker = document.createElement("div");
  blocker.id = "attention-api-blocker";
  
  const remainingSeconds = throttledAt ? Math.max(0, Math.ceil((throttledAt + cooldown * 60 * 1000 - Date.now()) / 1000)) : 0;
  const remainingMinutes = Math.ceil(remainingSeconds / 60);

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
    font-family: 'Courier New', Courier, monospace;
    text-transform: lowercase;
    padding: 20px;
    text-align: center;
  `;

  blocker.innerHTML = `
    <h1 style="font-size: 3rem; margin-bottom: 1rem;">429 too many requests</h1>
    <p style="font-size: 1.2rem; color: #6366f1; margin-bottom: 2rem;">attention limit exceeded for ${domain}</p>
    <div style="border: 1px solid #1e1b4b; padding: 2rem; background: #0f111a;">
      <p style="margin-bottom: 0.5rem;">cooldown active: ${remainingMinutes}m remaining</p>
      <p style="color: #4ade80; margin-top: 1rem;">productive refill sources:</p>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1rem; flex-wrap: wrap;">
        ${refillSources.map(s => `
          <a href="https://${s}" style="
            background: #6366f1; 
            color: white; 
            padding: 8px 16px; 
            text-decoration: none; 
            border-radius: 4px;
            font-size: 0.9rem;
          ">go to ${s}</a>
        `).join("")}
      </div>
    </div>
  `;

  document.documentElement.appendChild(blocker);
}

function unblockPage() {
  const blocker = document.getElementById("attention-api-blocker");
  if (blocker) {
    blocker.remove();
    document.body.style.display = '';
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    checkStatus();
  }
});

// Initial check
checkStatus();