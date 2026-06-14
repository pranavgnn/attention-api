import React, { useState, useEffect } from "react";
import { getStorage, setStorage } from "../../shared/storage";
import { StorageSchema, SiteConfig } from "../../shared/types";
import { parseYamlConfig, stringifyToYaml } from "../../shared/configParser";
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { Toaster, toast } from "sonner";

const Tooltip: React.FC<{ text: string }> = ({ text }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <span 
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="cursor-help text-accent opacity-60 hover:opacity-100 font-bold"
      >
        [?]
      </span>
      {visible && (
        <div className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded bg-surface border border-border p-3 text-[11px] text-slate-300 z-50 shadow-2xl">
          {text}
          <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-border" />
        </div>
      )}
    </div>
  );
};

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
    toast.success("configuration saved");
  };

  const handleApplyYaml = () => {
    try {
      const config = parseYamlConfig(yamlConfig);
      save(config);
      setError(null);
    } catch (e: any) { 
      setError(e.message);
      toast.error("invalid configuration");
    }
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

  if (!data) return <div className="p-12 text-xs lowercase opacity-40 font-mono">loading system...</div>;

  return (
    <div className="min-h-screen bg-background text-slate-200 p-10 max-w-6xl mx-auto space-y-10 font-mono text-sm">
      <Toaster theme="dark" position="bottom-right" richColors />
      <header className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight lowercase">attention.config</h1>
          <p className="text-xs text-text-dim lowercase mt-1">configure human attention rate limits</p>
        </div>
      </header>

      <nav className="flex space-x-4 border-b border-border">
        <button onClick={() => setActiveTab("ui")} className={`tab-btn ${activeTab === "ui" ? "tab-btn-active" : ""}`}>visual editor</button>
        <button onClick={() => setActiveTab("yaml")} className={`tab-btn ${activeTab === "yaml" ? "tab-btn-active" : ""}`}>raw yaml</button>
      </nav>

      <main>
        {activeTab === "ui" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.keys(data.config).map(domain => {
              const site = data.config[domain];
              return (
                <div key={domain} className="bg-surface/50 border border-border rounded-lg p-6 space-y-5 relative group">
                  <div className="flex justify-between items-start">
                    <div className="text-base font-bold truncate pr-10">{domain}</div>
                    <button 
                      onClick={() => {
                        const updated = { ...data.config };
                        delete updated[domain];
                        save(updated);
                      }}
                      className="text-xs text-red opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity absolute top-6 right-6"
                    >
                      delete
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <div className="t-label text-[11px]">tokens <Tooltip text="Max reserve. Site blocks when zero." /></div>
                      <input type="number" className="t-input w-full p-2" value={site.maxTokens} onChange={e => updateField(domain, "maxTokens", parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="t-label text-[11px]">drain <Tooltip text="Loss per 60s of active use." /></div>
                      <input type="number" className="t-input w-full p-2" value={site.drainRate} onChange={e => updateField(domain, "drainRate", parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="t-label text-[11px]">cooldown <Tooltip text="Minutes to unlock after block." /></div>
                      <input type="number" className="t-input w-full p-2" value={site.cooldownMinutes} onChange={e => updateField(domain, "cooldownMinutes", parseInt(e.target.value))} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="t-label text-[11px]">refill targets <Tooltip text="Visiting this site adds tokens to these targets." /></div>
                      <button onClick={() => addRefillTarget(domain)} className="text-[10px] text-accent hover:underline">+ add</button>
                    </div>
                    <div className="space-y-2.5">
                      {site.refillTargets.map((target, idx) => (
                        <div key={idx} className="flex items-center space-x-3 bg-background/50 p-3 rounded border border-border/50">
                          <input type="text" className="t-input flex-1 !bg-transparent !border-none p-0 text-sm" value={target.domain} onChange={e => updateRefillTarget(domain, idx, "domain", e.target.value)} />
                          <input type="number" className="t-input w-16 !bg-transparent !border-none p-0 text-right text-green text-sm" value={target.amount} onChange={e => updateRefillTarget(domain, idx, "amount", parseInt(e.target.value))} />
                          <button onClick={() => removeRefillTarget(domain, idx)} className="text-red/60 hover:text-red px-2 text-lg">×</button>
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
              className="border-2 border-dashed border-border rounded-lg p-6 flex items-center justify-center text-text-dim hover:border-accent hover:text-accent transition-all text-sm font-medium"
            >
              + add new node
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border border-border rounded-lg overflow-hidden">
              <CodeMirror value={yamlConfig} height="550px" theme={vscodeDark} extensions={[yaml()]} onChange={setYamlConfig} basicSetup={{ lineNumbers: true, foldGutter: false }} />
            </div>
            {error && <div className="text-red text-xs lowercase">{error}</div>}
            <button onClick={handleApplyYaml} className="t-btn text-accent border-accent/20 font-bold px-6 py-3">apply configuration</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default OptionsPage;