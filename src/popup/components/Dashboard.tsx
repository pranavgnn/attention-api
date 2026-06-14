import React, { useEffect, useState, useMemo } from "react";
import { useStore } from "../store";
import { setStorage } from "../../shared/storage";
import { StorageSchema, SiteConfig, SiteState } from "../../shared/types";
import { normalizeDomain } from "../../shared/configParser";

const Dashboard: React.FC = () => {
  const { data, fetchData } = useStore();
  const [domain, setDomain] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000);
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        try { setDomain(normalizeDomain(new URL(tabs[0].url).hostname)); } 
        catch (e) {}
      }
    });

    return () => clearInterval(interval);
  }, []);

  const handleTrack = async () => {
    if (!domain || !data) return;
    
    const norm = normalizeDomain(domain);
    const newConfig: SiteConfig = { 
      maxTokens: 100, 
      drainRate: 10, 
      regenRate: 0,
      cooldownMinutes: 30, 
      refillSources: [] 
    };
    const newState: SiteState = { 
      currentTokens: 100, 
      status: "active", 
      throttledAt: null, 
      timeSpentToday: 0, 
      tokenHistory: [], 
      overrides: [] 
    };

    const updated: StorageSchema = {
      ...data,
      config: { ...data.config, [norm]: newConfig },
      state: { ...data.state, [norm]: newState },
    };
    await setStorage(updated);
    fetchData();
  };

  const refillImpact = useMemo(() => {
    if (!domain || !data) return [];
    return Object.keys(data.config).filter(d => 
      data.config[d].refillSources?.some(s => normalizeDomain(s.domain) === domain)
    );
  }, [domain, data]);

  if (!data) return <div className="p-10 text-[10px] lowercase opacity-40 font-mono">system.initializing...</div>;

  const state = domain ? data.state[domain] : null;
  const config = domain ? data.config[domain] : null;

  return (
    <div className="w-[360px] bg-[#05060a] text-slate-300 p-0 font-mono text-xs selection:bg-indigo-500/30">
      <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
          <span className="font-bold tracking-tight text-slate-100">attention_api</span>
        </div>
        <span className="text-[10px] opacity-30">v1.1.0</span>
      </header>

      <div className="p-6 space-y-8">
        <section className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest">Active_Node</span>
            <span className="text-[10px] text-slate-500 italic">real_time_tracking</span>
          </div>
          <div className="p-4 bg-white/[0.03] border border-white/5 rounded-sm">
            <div className="text-sm font-medium text-slate-200 truncate">{domain || "null.pointer"}</div>
          </div>
        </section>

        {state && config ? (
          <>
            <section className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Focus_Reserve</span>
                <span className="text-slate-100">{state.currentTokens.toFixed(1)}<span className="opacity-30">/{config.maxTokens}</span></span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ease-out ${state.status === 'throttled' ? 'bg-rose-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(100, (state.currentTokens / config.maxTokens) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] opacity-40 lowercase">
                <span>drain: {config.drainRate}/min</span>
                <span>session: {Math.floor(state.timeSpentToday / 60)}m {state.timeSpentToday % 60}s</span>
              </div>
            </section>

            <section className="space-y-3">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Relationship_Map</span>
              <div className="grid grid-cols-1 gap-2">
                {/* UPSTREAM: Where tokens come FROM */}
                {config.refillSources && config.refillSources.length > 0 && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-sm space-y-2">
                    <p className="text-[10px] text-slate-500 lowercase">restored by (upstream):</p>
                    <div className="flex flex-wrap gap-2">
                      {config.refillSources.map(s => (
                        <span key={s.domain} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-sm text-[10px]">
                          {s.domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* DOWNSTREAM: Where tokens go TO */}
                {refillImpact.length > 0 ? (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-sm space-y-2">
                    <p className="text-[10px] text-emerald-400/70 lowercase">refills (downstream):</p>
                    <div className="flex flex-wrap gap-2">
                      {refillImpact.map(d => (
                        <span key={d} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-sm text-[10px]">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : !config.refillSources?.length && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-sm text-[10px] text-slate-500 italic">
                    no active refill relationships.
                  </div>
                )}
              </div>
            </section>
          </>
        ) : domain ? (
          <button 
            onClick={handleTrack}
            className="w-full py-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all rounded-sm font-bold uppercase tracking-tighter"
          >
            init_tracking_sequence
          </button>
        ) : null}

        <footer className="pt-4 border-t border-white/5 flex gap-3">
          <button 
            onClick={() => chrome.runtime.openOptionsPage()} 
            className="flex-1 py-2 bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all rounded-sm text-[10px] uppercase font-bold tracking-widest text-slate-400"
          >
            terminal_config
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;