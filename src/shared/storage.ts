import { StorageSchema, SiteState } from "./types";
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

export async function getStorage(): Promise<StorageSchema> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  if (!data[STORAGE_KEY]) {
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
  return data[STORAGE_KEY] as StorageSchema;
}

export async function setStorage(data: StorageSchema): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
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