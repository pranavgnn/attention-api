import { StorageSchema, SiteState, SiteConfig } from "./types";
import { DEFAULT_CONFIG, STORAGE_KEY } from "./constants";
import { normalizeDomain } from "./configParser";

const INITIAL_STATE: SiteState = {
  currentTokens: 100,
  status: "active",
  throttledAt: null,
  timeSpentToday: 0,
  tokenHistory: [],
  overrides: [],
};

function normalizeStorage(data: any): StorageSchema {
  const config: Record<string, SiteConfig> = {};
  const state: Record<string, SiteState> = {};
  
  if (data.config) {
    Object.keys(data.config).forEach(d => {
      const norm = normalizeDomain(d);
      config[norm] = data.config[d];
      if (config[norm].refillTargets) {
        config[norm].refillTargets = config[norm].refillTargets.map((t: any) => ({
          ...t,
          domain: normalizeDomain(t.domain || "")
        }));
      }
    });
  }

  if (data.state) {
    Object.keys(data.state).forEach(d => {
      state[normalizeDomain(d)] = data.state[d];
    });
  }

  return {
    config: Object.keys(config).length ? config : DEFAULT_CONFIG,
    state,
    lastReset: data.lastReset || Date.now()
  };
}

export async function getStorage(): Promise<StorageSchema> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const raw = data[STORAGE_KEY];
  
  if (!raw) {
    const initialState: StorageSchema = {
      config: DEFAULT_CONFIG,
      state: Object.keys(DEFAULT_CONFIG).reduce((acc, domain) => {
        const norm = normalizeDomain(domain);
        acc[norm] = { ...INITIAL_STATE, currentTokens: DEFAULT_CONFIG[norm].maxTokens };
        return acc;
      }, {} as Record<string, SiteState>),
      lastReset: Date.now(),
    };
    await setStorage(initialState);
    return initialState;
  }
  
  return normalizeStorage(raw);
}

export async function setStorage(data: StorageSchema): Promise<void> {
  // Always normalize before saving to be absolutely sure
  const normalized = normalizeStorage(data);
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
}

export async function updateSiteState(domain: string, stateUpdate: Partial<SiteState>): Promise<void> {
  const norm = normalizeDomain(domain);
  const storage = await getStorage();
  if (storage.state[norm]) {
    storage.state[norm] = { ...storage.state[norm], ...stateUpdate };
    await setStorage(storage);
  }
}

export async function addTokenHistory(domain: string, tokens: number): Promise<void> {
  const norm = normalizeDomain(domain);
  const storage = await getStorage();
  if (storage.state[norm]) {
    storage.state[norm].tokenHistory.push({ timestamp: Date.now(), tokens });
    if (storage.state[norm].tokenHistory.length > 50) {
      storage.state[norm].tokenHistory.shift();
    }
    await setStorage(storage);
  }
}