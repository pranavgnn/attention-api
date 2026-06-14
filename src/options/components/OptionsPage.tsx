import React, { useState, useEffect } from "react";
import { getStorage, setStorage } from "../../shared/storage";
import { StorageSchema, SiteConfig } from "../../shared/types";
import { parseYamlConfig, stringifyToYaml } from "../../shared/configParser";
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-1">
    <span className="cursor-help text-accent opacity-60 hover:opacity-100">[?]</span>
    <div className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded bg-surface border border-border p-2 text-[10px] text-slate-300 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 z-50 shadow-2xl">
      {text}
      <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-border" />
    </div>
  </div>
);

const OptionsPage: React.FC = () => {
  const [data, setData] = useState<StorageSchema | null>(null);
  const [yamlConfig, setYamlConfig] = useState("");
  const [activeTab, setActiveTab] = useState<"ui" | "yaml">("ui");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const storage = await getStorage();
    setData(storage);
    setYamlConfig(stringifyToYaml(storage.config));
  };

  const save = async (config: Record<string, SiteConfig>) => {
    if (!data) return;
    const state = { ...data.state };
    Object.keys(config).forEach(d => {
      if (!state[d]) state[d] = { currentTokens: config[d].maxTokens, status: "active", throttledAt: null, timeSpentToday: 0, tokenHistory: [], overrides: [] };
    });
    const updated = { ...data, config, state };
    await setStorage(updated);
    setData(updated);
    setYamlConfig(stringifyToYaml(config));
  };

  const updateField = (domain: string, field: keyof SiteConfig, val: any) => {
    if (!data) return;
    const config = { ...data.config, [domain]: { ...data.config[domain], [field]: val } };
    save(config);
  };

  const addRefillTarget = (domain: string) => {
    if (!data) return;
    const site = data.config[domain];
    const targets = [...site.refillTargets, { domain: "new-site.com", amount: 20 }];
    updateField(domain, "refillTargets", targets);
  };

  const removeRefillTarget = (domain: string, index: number) => {
    if (!data) return;
    const targets = data.config[domain].refillTargets.filter((_, i) => i !== index);
    updateField(domain, "refillTargets", targets);
  };

  const updateRefillTarget = (domain: string, index: number, field: "domain" | "amount", val: any) => {
    if (!data) return;
    const targets = [...data.config[domain].refillTargets];
    targets[index] = { ...targets[index], [field]: val };
    updateField(domain, "refillTargets", targets);
  };

  if (!data) return <div className="p-12 text-xs lowercase opacity-40">loading system...</div>;

  return (
    <div className="min-h-screen bg-background text-slate-200 p-8 max-w-5xl mx-auto space-y-8 font-mono">
      <header className="flex justify-between items-end border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight lowercase">attention.config</h1>
          <p className="text-[10px] text-text-dim lowercase mt-1">configure human attention rate limits</p>
        </div>
      </header>

      <nav className="flex space-x-2 border-b border-border">
        <button onClick={() => setActiveTab("ui")} className={`tab-btn ${activeTab === "ui" ? "tab-btn-active" : ""}`}>visual</button>
        <button onClick={() => setActiveTab("yaml")} className={`tab-btn ${activeTab === "yaml" ? "tab-btn-active" : ""}`}>yaml</button>
      </nav>

      <main>
        {activeTab === "ui" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(data.config).map(domain => {
              const site = data.config[domain];
              return (
                <div key={domain} className="bg-surface/50 border border-border rounded p-4 space-y-4 relative group">
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-bold truncate pr-8">{domain}</div>
                    <button 
                      onClick={() => {
                        const updated = { ...data.config };
                        delete updated[domain];
                        save(updated);
                      }}
                      className="text-[10px] text-red opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity absolute top-4 right-4"
                    >
                      delete
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="t-label">tokens <Tooltip text="Max reserve. Site blocks when zero." /></div>
                      <input type="number" className="t-input w-full" value={site.maxTokens} onChange={e => updateField(domain, "maxTokens", parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <div className="t-label">drain <Tooltip text="Loss per 60s of active use." /></div>
                      <input type="number" className="t-input w-full" value={site.drainRate} onChange={e => updateField(domain, "drainRate", parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <div className="t-label">cooldown <Tooltip text="Minutes to unlock after block." /></div>
                      <input type="number" className="t-input w-full" value={site.cooldownMinutes} onChange={e => updateField(domain, "cooldownMinutes", parseInt(e.target.value))} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="t-label">refill targets <Tooltip text="Visiting this site adds tokens to these targets." /></div>
                      <button onClick={() => addRefillTarget(domain)} className="text-[9px] text-accent hover:underline">+ add</button>
                    </div>
                    <div className="space-y-2">
                      {site.refillTargets.map((target, idx) => (
                        <div key={idx} className="flex items-center space-x-2 bg-background/50 p-2 rounded border border-border/50">
                          <input type="text" className="t-input flex-1 !bg-transparent !border-none p-0" value={target.domain} onChange={e => updateRefillTarget(domain, idx, "domain", e.target.value)} />
                          <input type="number" className="t-input w-12 !bg-transparent !border-none p-0 text-right text-green" value={target.amount} onChange={e => updateRefillTarget(domain, idx, "amount", parseInt(e.target.value))} />
                          <button onClick={() => removeRefillTarget(domain, idx)} className="text-red/60 hover:text-red px-1">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <button 
              onClick={() => {
                const d = prompt("domain:");
                if (d) updateField(d, "maxTokens", 100);
              }}
              className="border-2 border-dashed border-border rounded p-4 flex items-center justify-center text-text-dim hover:border-accent hover:text-accent transition-all text-xs"
            >
              + add new node
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-border rounded overflow-hidden">
              <CodeMirror value={yamlConfig} height="500px" theme={vscodeDark} extensions={[yaml()]} onChange={setYamlConfig} basicSetup={{ lineNumbers: true, foldGutter: false }} />
            </div>
            {error && <div className="text-red text-[10px] lowercase">{error}</div>}
            <button onClick={() => { try { save(parseYamlConfig(yamlConfig)); setError(null); } catch(e: any) { setError(e.message); } }} className="t-btn text-accent border-accent/20 font-bold">apply configuration</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default OptionsPage;