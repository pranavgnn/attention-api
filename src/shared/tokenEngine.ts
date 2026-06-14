import { getStorage, setStorage } from "./storage";
import { normalizeDomain } from "./configParser";

export async function tick(activeDomain: string | null): Promise<void> {
  const storage = await getStorage();
  const now = Date.now();

  for (const domain in storage.state) {
    const config = storage.config[domain];
    const state = storage.state[domain];

    if (!config || !state) continue;

    // Cooldown check
    if (state.status === "throttled" || state.status === "cooldown") {
      if (state.throttledAt) {
        const cooldownMs = config.cooldownMinutes * 60 * 1000;
        if (now - state.throttledAt > cooldownMs) {
          state.status = "active";
          state.currentTokens = Math.floor(config.maxTokens * 0.25);
          state.throttledAt = null;
        }
      }
    }

    // Active domain logic (Drain)
    if (domain === activeDomain) {
      state.timeSpentToday += 1;
      
      if (state.status === "active") {
        const drainPerSecond = config.drainRate / 60;
        state.currentTokens -= drainPerSecond;
        
        if (state.currentTokens <= 0) {
          state.currentTokens = 0;
          state.status = "throttled";
          state.throttledAt = now;
        }
      }
    } else {
      // Natural regen when site is NOT active
      const regenPerSecond = (config.regenRate || 0) / 3600;
      if (regenPerSecond > 0 && state.status === "active") {
        state.currentTokens = Math.min(
          config.maxTokens,
          state.currentTokens + regenPerSecond
        );
      }
    }

    // NEW INVERTED REFILL LOGIC: 
    // If THIS site is active, we check if ANY OTHER site has THIS site in its refillSources.
    // Wait, no. If site A is active, it should refill ANY domain B that has A in its refillSources.
    if (activeDomain) {
      // Check if THIS domain (the one we are iterating over) lists activeDomain as a source
      if (config.refillSources && config.refillSources.length > 0) {
        for (const source of config.refillSources) {
          if (normalizeDomain(source.domain) === activeDomain) {
            const refillPerSecond = source.amount / 60;
            state.currentTokens = Math.min(
              config.maxTokens,
              state.currentTokens + refillPerSecond
            );
          }
        }
      }
    }

    // Token History
    if (now % 60000 < 1000) {
      state.tokenHistory.push({ timestamp: now, tokens: state.currentTokens });
      if (state.tokenHistory.length > 50) {
        state.tokenHistory.shift();
      }
    }
  }

  await setStorage(storage);
}

export async function applyOverride(domain: string, reason: string): Promise<void> {
  const norm = normalizeDomain(domain);
  const storage = await getStorage();
  const state = storage.state[norm];
  if (state) {
    state.status = "active";
    state.currentTokens = 10;
    state.throttledAt = null;
    state.overrides.push({ timestamp: Date.now(), reason });
    await setStorage(storage);
  }
}