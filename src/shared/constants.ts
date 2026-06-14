import { SiteConfig } from "./types";

export const DEFAULT_CONFIG: Record<string, SiteConfig> = {
  "twitter.com": {
    maxTokens: 100,
    drainRate: 10,
    regenRate: 0,
    cooldownMinutes: 30,
    refillSources: [
      { domain: "read.amazon.com", amount: 20 },
      { domain: "duolingo.com", amount: 15 }
    ],
  },
  "reddit.com": {
    maxTokens: 100,
    drainRate: 8,
    regenRate: 0,
    cooldownMinutes: 30,
    refillSources: [
      { domain: "read.amazon.com", amount: 20 }
    ],
  },
  "instagram.com": {
    maxTokens: 100,
    drainRate: 10,
    regenRate: 0,
    cooldownMinutes: 30,
    refillSources: [
      { domain: "duolingo.com", amount: 15 }
    ],
  },
  "youtube.com": {
    maxTokens: 150,
    drainRate: 6,
    regenRate: 0,
    cooldownMinutes: 20,
    refillSources: [],
  },
  "read.amazon.com": {
    maxTokens: 200,
    drainRate: 0,
    regenRate: 0,
    cooldownMinutes: 0,
    refillSources: [],
  },
  "duolingo.com": {
    maxTokens: 200,
    drainRate: 0,
    regenRate: 0,
    cooldownMinutes: 0,
    refillSources: [],
  },
  "github.com": {
    maxTokens: 300,
    drainRate: 1,
    regenRate: 0,
    cooldownMinutes: 10,
    refillSources: [],
  },
};

export const ALARM_NAME = "token-drain-alarm";
export const POLL_INTERVAL_MS = 5000;
export const STORAGE_KEY = "attention_api_data";