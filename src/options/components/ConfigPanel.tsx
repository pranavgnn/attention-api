import React from "react";
import { StorageSchema, SiteConfig, SiteState } from "../../shared/types";
import { setStorage } from "../../shared/storage";

interface Props {
  data: StorageSchema;
  onUpdate: (data: StorageSchema) => void;
}

const ConfigPanel: React.FC<Props> = ({ data, onUpdate }) => {
  const handleChange = (domain: string, field: keyof SiteConfig, value: any) => {
    const updated = { ...data };
    (updated.config[domain] as any)[field] = value;
    onUpdate({ ...updated });
  };

  const handleRefillChange = (domain: string, val: string) => {
    const targets = val.split(",").map(s => s.trim()).filter(s => s).map(d => ({ domain: d, amount: 20 }));
    handleChange(domain, "refillTargets", targets);
  };

  const handleSave = async () => {
    await setStorage(data);
    alert("CONFIG_SAVED");
  };

  const handleAdd = () => {
    const domain = prompt("Enter domain (e.g. facebook.com)");
    if (domain && !data.config[domain]) {
      const newConfig: SiteConfig = {
        maxTokens: 100,
        drainRate: 10,
        cooldownMinutes: 30,
        refillTargets: [],
      };
      const newState: SiteState = {
        currentTokens: 100,
        status: "active",
        throttledAt: null,
        timeSpentToday: 0,
        tokenHistory: [],
        overrides: [],
      };
      const updated = {
        ...data,
        config: { ...data.config, [domain]: newConfig },
        state: { ...data.state, [domain]: newState },
      };
      onUpdate(updated);
    }
  };

  const handleDelete = (domain: string) => {
    const updated = { ...data };
    delete updated.config[domain];
    delete updated.state[domain];
    onUpdate({ ...updated });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-[10px] uppercase opacity-60">
            <tr>
              <th className="p-4 border-b border-border">Domain</th>
              <th className="p-4 border-b border-border">Max Tokens</th>
              <th className="p-4 border-b border-border">Drain Rate</th>
              <th className="p-4 border-b border-border">Cooldown (M)</th>
              <th className="p-4 border-b border-border">Refill Targets</th>
              <th className="p-4 border-b border-border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(data.config).map((domain) => (
              <tr key={domain} className="border-b border-border hover:bg-surface transition-colors">
                <td className="p-4 font-bold">{domain}</td>
                <td className="p-4">
                  <input
                    type="number"
                    value={data.config[domain].maxTokens}
                    onChange={(e) => handleChange(domain, "maxTokens", parseInt(e.target.value))}
                    className="bg-background border border-border-accent p-1 w-20 focus:outline-none focus:border-token-green"
                  />
                </td>
                <td className="p-4">
                  <input
                    type="number"
                    value={data.config[domain].drainRate}
                    onChange={(e) => handleChange(domain, "drainRate", parseInt(e.target.value))}
                    className="bg-background border border-border-accent p-1 w-20 focus:outline-none focus:border-token-green"
                  />
                </td>
                <td className="p-4">
                  <input
                    type="number"
                    value={data.config[domain].cooldownMinutes}
                    onChange={(e) => handleChange(domain, "cooldownMinutes", parseInt(e.target.value))}
                    className="bg-background border border-border-accent p-1 w-20 focus:outline-none focus:border-token-green"
                  />
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    value={data.config[domain].refillTargets.map(r => r.domain).join(", ")}
                    onChange={(e) => handleRefillChange(domain, e.target.value)}
                    placeholder="site1, site2"
                    className="bg-background border border-border-accent p-1 w-40 focus:outline-none focus:border-token-green text-[10px]"
                  />
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleDelete(domain)}
                    className="text-token-red hover:underline uppercase text-[10px] font-bold"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={handleAdd}
          className="border border-token-green text-token-green px-6 py-2 font-bold uppercase hover:bg-token-green hover:text-background transition-all"
        >
          Add Site
        </button>
        <button
          onClick={handleSave}
          className="bg-token-green text-background px-6 py-2 font-bold uppercase hover:bg-opacity-80 transition-colors"
        >
          Save All Changes
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;