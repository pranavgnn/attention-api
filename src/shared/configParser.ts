import { SiteConfig, StorageConfigSchema } from "./types";

export function normalizeDomain(domain: string): string {
  if (!domain) return "";
  return domain.toLowerCase().replace(/^www\./, "").trim();
}

export function parseJsonConfig(jsonStr: string): Record<string, SiteConfig> {
  const parsed = JSON.parse(jsonStr);
  
  // Normalize all keys (domains) and targets in the config object
  const normalizedConfig: Record<string, SiteConfig> = {};
  for (const domain in parsed) {
    const normKey = normalizeDomain(domain);
    const config = parsed[domain];
    
    if (config.refillTargets) {
      config.refillTargets = config.refillTargets.map((t: any) => ({
        ...t,
        domain: normalizeDomain(t.domain || t.origin || "")
      }));
    }
    
    normalizedConfig[normKey] = config;
  }

  return StorageConfigSchema.parse(normalizedConfig);
}

export function stringifyToJson(config: Record<string, SiteConfig>): string {
  return JSON.stringify(config, null, 2);
}