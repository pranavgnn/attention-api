import yaml from "js-yaml";
import { SiteConfig } from "./types";

interface YamlSite {
  tokens?: number;
  drain_rate?: number;
  cooldown?: number;
  refills?: { target: string; amount: number }[];
}

interface YamlRoot {
  sites?: Record<string, YamlSite>;
}

export function parseYamlConfig(yamlStr: string): Record<string, SiteConfig> {
  const parsed = yaml.load(yamlStr) as YamlRoot;
  const config: Record<string, SiteConfig> = {};

  if (parsed && parsed.sites) {
    for (const domain in parsed.sites) {
      const site = parsed.sites[domain];
      config[domain] = {
        maxTokens: site.tokens ?? 100,
        drainRate: site.drain_rate ?? 0,
        cooldownMinutes: site.cooldown ?? 0,
        refillTargets: site.refills
          ? site.refills.map((r) => ({
              domain: r.target,
              amount: r.amount,
            }))
          : [],
      };
    }
  }

  return config;
}

export function stringifyToYaml(config: Record<string, SiteConfig>): string {
  const obj: YamlRoot = {
    sites: Object.keys(config).reduce((acc: Record<string, YamlSite>, domain) => {
      const site = config[domain];
      acc[domain] = {
        tokens: site.maxTokens,
        drain_rate: site.drainRate,
        cooldown: site.cooldownMinutes,
        refills: site.refillTargets.map((r) => ({
          target: r.domain,
          amount: r.amount,
        })),
      };
      return acc;
    }, {}),
  };
  return yaml.dump(obj);
}