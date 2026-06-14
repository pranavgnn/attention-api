import React, { useState, useEffect } from "react";
import { getStorage, setStorage } from "../../shared/storage";
import { StorageSchema, SiteConfig, StorageConfigSchema } from "../../shared/types";
import { parseJsonConfig, stringifyToJson, normalizeDomain } from "../../shared/configParser";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
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
  const [jsonConfig, setJsonConfig] = useState("");
  const [activeTab, setActiveTab] = useState<"ui" | "json">("ui");
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const storage = await getStorage();
    setData(storage);
    setJsonConfig(stringifyToJson(storage.config));
  };

  const save = async (config: Record<string, SiteConfig>, showToast = true) => {
    if (!data) return;
    
    // Normalize all keys in config
    const normalizedConfig: Record<string, SiteConfig> = {};
    Object.keys(config).forEach(d => {
      normalizedConfig[normalizeDomain(d)] = config[d];
    });

    const result = StorageConfigSchema.safeParse(normalizedConfig);
    if (!result.success) {
      if (showToast) {
        const firstError = result.error.issues[0];
        toast.error(`${firstError.path.join(".")}: ${firstError.message}`);
      }
      return;
    }

    const state = { ...data.state };
    Object.keys(result.data).forEach(d => {
      if (!state[d]) state[d] = { currentTokens: result.data[d].maxTokens, status: "active", throttledAt: null, timeSpentToday: 0, tokenHistory: [], overrides: [] };
    });
    
    const updated: StorageSchema = { ...data, config: result.data, state };
    await setStorage(updated);
    setData(updated);
    setJsonConfig(stringifyToJson(result.data));
    if (showToast) toast.success("configuration saved");
  };

  const debouncedSave = (config: Record<string, SiteConfig>) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = window.setTimeout(() => {
      save(config);
    }, 500);
    setDebounceTimer(timer);
  };

  const updateField = (domain: string, field: keyof SiteConfig, rawVal: string) => {
    if (!data) return;
    
    const isNum = ["maxTokens", "drainRate", "cooldownMinutes", "regenRate"].includes(field);
    const val = isNum ? (rawVal === "" ? "" : parseInt(rawVal)) : rawVal;

    const config = { ...data.config, [domain]: { ...data.config[domain], [field]: val } };
    setData({ ...data, config: config as any });

    if (val !== "" && (!isNum || !isNaN(val as number))) {
      debouncedSave(config as any);
    }
  };

  const handleApplyJson = () => {
    try {
      const config = parseJsonConfig(jsonConfig);
      save(config);
      setError(null);
    } catch (e: any) { 
      setError(e.message);
      toast.error("invalid json configuration");
    }
  };

  const addRefillSource = (domain: string) => {
    if (!data) return;
    const site = data.config[domain];
    const sources = [...(site.refillSources || []), { domain: "new-site.com", amount: 20 }];
    const config = { ...data.config, [domain]: { ...site, refillSources: sources } };
    save(config);
  };

  const removeRefillSource = (domain: string, index: number) => {
    if (!data) return;
    const sources = data.config[domain].refillSources.filter((_, i) => i !== index);
    const config = { ...data.config, [domain]: { ...data.config[domain], refillSources: sources } };
    save(config);
  };

  const updateRefillSource = (domain: string, index: number, field: "domain" | "amount", rawVal: string) => {
    if (!data) return;
    
    const val = field === "amount" ? (rawVal === "" ? "" : parseInt(rawVal)) : rawVal;
    const sources = [...data.config[domain].refillSources];
    const source = sources[index];
    if (field === "domain") source.domain = normalizeDomain(rawVal);
    else if (field === "amount") source.amount = val as number;

    const config = { ...data.config, [domain]: { ...data.config[domain], refillSources: sources } };
    setData({ ...data, config: config as any });

    if (val !== "" && (field !== "amount" || !isNaN(val as number))) {
      debouncedSave(config as any);
    }
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
        <button onClick={() => setActiveTab("json")} className={`tab-btn ${activeTab === "json" ? "tab-btn-active" : ""}`}>raw json</button>
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

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <div className="t-label text-[11px]">tokens <Tooltip text="Max reserve. Site blocks when zero." /></div>
                      <input type="number" className="t-input w-full p-2" value={site.maxTokens} onChange={e => updateField(domain, "maxTokens", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="t-label text-[11px]">drain <Tooltip text="Loss per 60s of active use." /></div>
                      <input type="number" className="t-input w-full p-2" value={site.drainRate} onChange={e => updateField(domain, "drainRate", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="t-label text-[11px]">regen <Tooltip text="Automatic recovery per hour when NOT in use." /></div>
                      <input type="number" className="t-input w-full p-2" value={site.regenRate ?? 0} onChange={e => updateField(domain, "regenRate", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="t-label text-[11px]">cooldown <Tooltip text="Minutes to unlock after block." /></div>
                      <input type="number" className="t-input w-full p-2" value={site.cooldownMinutes} onChange={e => updateField(domain, "cooldownMinutes", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="t-label text-[11px]">refill sources <Tooltip text="Visiting these sites adds tokens to THIS site." /></div>
                      <button onClick={() => addRefillSource(domain)} className="text-[10px] text-accent hover:underline">+ add</button>
                    </div>
                    <div className="space-y-2.5">
                      {site.refillSources?.map((source, idx) => (
                        <div key={idx} className="flex items-center space-x-3 bg-background/50 p-3 rounded border border-border/50">
                          <input type="text" className="t-input flex-1 !bg-transparent !border-none p-0 text-sm" value={source.domain} onChange={e => updateRefillSource(domain, idx, "domain", e.target.value)} />
                          <input type="number" className="t-input w-16 !bg-transparent !border-none p-0 text-right text-green text-sm" value={source.amount} onChange={e => updateRefillSource(domain, idx, "amount", e.target.value)} />
                          <button onClick={() => removeRefillSource(domain, idx)} className="text-red/60 hover:text-red px-2 text-lg">×</button>
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
                if (d) {
                  const norm = normalizeDomain(d);
                  const config = { ...data.config, [norm]: { maxTokens: 100, drainRate: 10, regenRate: 0, cooldownMinutes: 30, refillSources: [] } };
                  save(config);
                }
              }}
              className="border-2 border-dashed border-border rounded-lg p-6 flex items-center justify-center text-text-dim hover:border-accent hover:text-accent transition-all text-sm font-medium"
            >
              + add new node
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border border-border rounded-lg overflow-hidden">
              <CodeMirror value={jsonConfig} height="550px" theme={vscodeDark} extensions={[json()]} onChange={setJsonConfig} basicSetup={{ lineNumbers: true, foldGutter: false }} />
            </div>
            {error && <div className="text-red text-xs lowercase whitespace-pre-wrap">{error}</div>}
            <button onClick={handleApplyJson} className="t-btn text-accent border-accent/20 font-bold px-6 py-3">apply json configuration</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default OptionsPage;