import { z } from "zod";

export const RefillTargetSchema = z.object({
  domain: z.string().min(1),
  amount: z.number().min(0),
});

export const SiteConfigSchema = z.object({
  maxTokens: z.number().min(1),
  drainRate: z.number().min(0),
  cooldownMinutes: z.number().min(0),
  refillTargets: z.array(RefillTargetSchema),
});

export const StorageConfigSchema = z.record(z.string(), SiteConfigSchema);

export interface SiteConfig extends z.infer<typeof SiteConfigSchema> {}

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