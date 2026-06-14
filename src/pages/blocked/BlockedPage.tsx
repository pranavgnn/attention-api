import React, { useState, useEffect } from "react";
import { getStorage } from "../../shared/storage";
import { StorageSchema } from "../../shared/types";

const BlockedPage: React.FC = () => {
  const [domain, setDomain] = useState("");
  const [tokens, setTokens] = useState(0);
  const [reason, setReason] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("00:00");
  const [logs, setLogs] = useState<{ timestamp: number; message: string }[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "INIT") {
        setDomain(event.data.domain);
        setTokens(event.data.tokens);
        fetchData(event.data.domain);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const fetchData = async (d: string) => {
    const storage = await getStorage();
    const state = storage.state[d];
    const config = storage.config[d];

    if (state && config && state.throttledAt) {
      const cooldownMs = config.cooldownMinutes * 60 * 1000;
      const interval = setInterval(() => {
        const remaining = cooldownMs - (Date.now() - state.throttledAt!);
        if (remaining <= 0) {
          clearInterval(interval);
          setTimeLeft("00:00");
        } else {
          const m = Math.floor(remaining / 60000);
          const s = Math.floor((remaining % 60000) / 1000);
          setTimeLeft(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
        }
      }, 1000);

      const recentLogs = state.tokenHistory.slice(-5).map(h => ({
        timestamp: h.timestamp,
        message: `TOKEN_DIP: ${h.tokens.toFixed(2)} remaining`
      }));
      setLogs(recentLogs);

      return () => clearInterval(interval);
    }
  };

  const handleOverride = async () => {
    if (!reason.trim()) return;
    chrome.runtime.sendMessage({ type: "OVERRIDE", domain, reason }, (res) => {
      if (res?.success) {
        window.parent.postMessage({ type: "RELOAD" }, "*");
      }
    });
  };

  return (
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-center p-8 space-y-8 select-none">
      <div className="text-9xl font-bold text-token-red animate-pulse">429</div>
      <div className="text-3xl font-bold tracking-widest uppercase">Too Many Requests</div>
      
      <div className="w-full max-w-2xl border border-border p-6 space-y-4">
        <div className="flex justify-between text-sm opacity-60">
          <span>DOMAIN: {domain}</span>
          <span>TOKENS_BURNED: {tokens}</span>
        </div>
        
        <div className="text-center text-5xl font-mono text-token-yellow">
          COOLDOWN: {timeLeft}
        </div>

        <div className="bg-surface p-4 text-xs font-mono h-32 overflow-y-auto border border-border-accent space-y-1">
          {logs.map((log, i) => (
            <div key={i}>
              [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase opacity-60">State your reason to override</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex-1 bg-surface border border-border p-2 focus:outline-none focus:border-token-green text-sm"
              placeholder="Enter reason..."
            />
            <button
              onClick={handleOverride}
              className="bg-token-green text-background px-6 py-2 font-bold uppercase hover:bg-opacity-80 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedPage;