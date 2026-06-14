import { SiteConfig } from "./types";

export const DEFAULT_CONFIG: Record<string, SiteConfig> = {
  "twitter.com": {
    maxTokens: 100,
    drainRate: 10,
    regenRate: 0,
    cooldownMinutes: 30,
    refillTargets: [],
  },
  "reddit.com": {
    maxTokens: 100,
    drainRate: 8,
    regenRate: 0,
    cooldownMinutes: 30,
    refillTargets: [],
  },
  "instagram.com": {
    maxTokens: 100,
    drainRate: 10,
    regenRate: 0,
    cooldownMinutes: 30,
    refillTargets: [],
  },
  "youtube.com": {
    maxTokens: 150,
    drainRate: 6,
    regenRate: 0,
    cooldownMinutes: 20,
    refillTargets: [],
  },
  "read.amazon.com": {
    maxTokens: 200,
    drainRate: 0,
    regenRate: 0,
    cooldownMinutes: 0,
    refillTargets: [
      { domain: "twitter.com", amount: 20 },
      { domain: "reddit.com", amount: 20 },
    ],
  },
  "duolingo.com": {
    maxTokens: 200,
    drainRate: 0,
    regenRate: 0,
    cooldownMinutes: 0,
    refillTargets: [
      { domain: "twitter.com", amount: 15 },
      { domain: "instagram.com", amount: 15 },
    ],
  },
  "github.com": {
    maxTokens: 300,
    drainRate: 1,
    regenRate: 0,
    cooldownMinutes: 10,
    refillTargets: [],
  },
};

export const ALARM_NAME = "token-drain-alarm";
export const POLL_INTERVAL_MS = 5000;
export const STORAGE_KEY = "attention_api_data";