export interface SiteConfig {
  maxTokens: number;
  drainRate: number;
  cooldownMinutes: number;
  refillTargets: { domain: string; amount: number }[];
}

export interface SiteState {
  currentTokens: number;
  status: "active" | "throttled" | "cooldown";
  throttledAt: number | null;
  timeSpentToday: number;
  tokenHistory: { timestamp: number; tokens: number }[];
  overrides: { timestamp: number; reason: string }[];
}

export interface StorageSchema {
  config: Record<string, SiteConfig>;
  state: Record<string, SiteState>;
  lastReset: number;
}