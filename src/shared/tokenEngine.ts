import { getStorage, setStorage } from "./storage";

export async function tick(activeDomain: string | null): Promise<void> {
  const storage = await getStorage();
  const now = Date.now();

  for (const domain in storage.state) {
    const config = storage.config[domain];
    const state = storage.state[domain];

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

    if (domain === activeDomain) {
      state.timeSpentToday += 1;
      if (state.status === "active") {
        state.currentTokens -= config.drainRate;
        if (state.currentTokens <= 0) {
          state.currentTokens = 0;
          state.status = "throttled";
          state.throttledAt = now;
        }

        if (config.refillTargets.length > 0) {
          for (const refill of config.refillTargets) {
            const targetState = storage.state[refill.domain];
            const targetConfig = storage.config[refill.domain];
            if (targetState && targetConfig) {
              targetState.currentTokens = Math.min(
                targetConfig.maxTokens,
                targetState.currentTokens + refill.amount
              );
            }
          }
        }
      }
    }

    state.tokenHistory.push({ timestamp: now, tokens: state.currentTokens });
    if (state.tokenHistory.length > 50) {
      state.tokenHistory.shift();
    }
  }

  await setStorage(storage);
}

export async function applyOverride(domain: string, reason: string): Promise<void> {
  const storage = await getStorage();
  const state = storage.state[domain];
  if (state) {
    state.status = "active";
    state.currentTokens = 10;
    state.throttledAt = null;
    state.overrides.push({ timestamp: Date.now(), reason });
    await setStorage(storage);
  }
}