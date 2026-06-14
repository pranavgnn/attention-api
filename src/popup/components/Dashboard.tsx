import React, { useEffect, useState } from "react";
import { useStore } from "../store";
import { setStorage } from "../../shared/storage";
import { StorageSchema, SiteConfig, SiteState } from "../../shared/types";

const Dashboard: React.FC = () => {
  const { data, fetchData } = useStore();
  const [domain, setDomain] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        try { setDomain(new URL(tabs[0].url).hostname.replace("www.", "")); } 
        catch (e) {}
      }
    });
  }, []);

  const handleTrack = async () => {
    if (!domain || !data) return;
    
    const newConfig: SiteConfig = { 
      maxTokens: 100, 
      drainRate: 10, 
      cooldownMinutes: 30, 
      refillTargets: [] 
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
      config: { ...data.config, [domain]: newConfig },
      state: { ...data.state, [domain]: newState },
    };
    await setStorage(updated);
    fetchData();
  };

  if (!data) return <div className="p-4 text-xs text-text-dim lowercase">init...</div>;

  const state = domain ? data.state[domain] : null;
  const config = domain ? data.config[domain] : null;

  return (
    <div className="w-[300px] bg-background p-4 flex flex-col space-y-4">
      <header className="flex justify-between items-center border-b border-border pb-2">
        <span className="text-xs font-bold tracking-tight lowercase">attention.api</span>
        <span className="text-[9px] text-text-dim">1.0.0</span>
      </header>

      <div className="space-y-3">
        <div className="space-y-0.5">
          <label className="t-label">active.domain</label>
          <div className="text-[11px] font-medium truncate lowercase">{domain || "none"}</div>
        </div>

        {state && config ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between t-label">
                <span>token.reserve</span>
                <span>{state.currentTokens.toFixed(0)}/{config.maxTokens}</span>
              </div>
              <div className="h-1 bg-border overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${state.status === 'throttled' ? 'bg-red' : 'bg-green'}`}
                  style={{ width: `${(state.currentTokens / config.maxTokens) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="t-label">refill.protocol</label>
              <p className="text-[10px] text-slate-400 leading-normal lowercase">
                current site drains tokens. to refill: visit sites configured as <span className="text-accent">refill.sources</span> (e.g. documentation, tools) to transfer tokens to your restricted list.
              </p>
            </div>
          </div>
        ) : domain ? (
          <button onClick={handleTrack} className="w-full t-btn text-accent border-accent/20 hover:bg-accent/10 py-2">
            begin tracking
          </button>
        ) : null}
      </div>

      <button 
        onClick={() => chrome.runtime.openOptionsPage()} 
        className="w-full t-btn text-[10px] py-1.5"
      >
        settings
      </button>
    </div>
  );
};

export default Dashboard;