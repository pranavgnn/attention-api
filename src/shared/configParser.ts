import { SiteConfig, StorageConfigSchema } from "./types";

export function parseJsonConfig(jsonStr: string): Record<string, SiteConfig> {
  const parsed = JSON.parse(jsonStr);
  return StorageConfigSchema.parse(parsed);
}

export function stringifyToJson(config: Record<string, SiteConfig>): string {
  return JSON.stringify(config, null, 2);
}