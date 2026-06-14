import { STORAGE_KEY } from "../shared/constants";
import { StorageSchema } from "../shared/types";

let overlay: HTMLIFrameElement | null = null;

async function checkStatus() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as StorageSchema;
  if (!storage) return;

  const domain = window.location.hostname.replace("www.", "");
  const state = storage.state[domain];

  if (state && state.status === "throttled") {
    showOverlay(domain, state.currentTokens);
  } else {
    removeOverlay();
  }
}

function showOverlay(domain: string, tokens: number) {
  if (overlay) return;

  overlay = document.createElement("iframe");
  overlay.src = chrome.runtime.getURL("src/pages/blocked/index.html");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = "2147483647";
  overlay.style.border = "none";
  overlay.style.backgroundColor = "black";

  overlay.onload = () => {
    overlay?.contentWindow?.postMessage({ type: "INIT", domain, tokens }, "*");
  };

  document.documentElement.appendChild(overlay);
}

function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    checkStatus();
  }
});

checkStatus();