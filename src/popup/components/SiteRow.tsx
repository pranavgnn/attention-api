import React, { useState } from "react";
import { SiteConfig, SiteState } from "../../shared/types";
import TokenBar from "./TokenBar";

interface Props {
  domain: string;
  config: SiteConfig;
  state: SiteState;
}

const SiteRow: React.FC<Props> = ({ domain, config, state }) => {
  const [expanded, setExpanded] = useState(false);

  const statusColor = {
    active: "text-token-green",
    throttled: "text-token-red",
    cooldown: "text-token-yellow",
  }[state.status];

  const historyPoints = state.tokenHistory.map((h, i) => {
    const x = (i / (state.tokenHistory.length - 1)) * 100;
    const y = 100 - (h.tokens / config.maxTokens) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div 
      className="border border-border p-2 cursor-pointer hover:border-border-accent transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm font-bold truncate flex-1">{domain}</div>
        <div className={`text-[10px] font-bold uppercase ${statusColor}`}>
          {state.status}
        </div>
      </div>
      
      <TokenBar current={state.currentTokens} max={config.maxTokens} />
      
      <div className="flex justify-between items-center mt-1 text-[9px] opacity-60">
        <div>{state.currentTokens.toFixed(0)}/{config.maxTokens} TKN</div>
        <div>-{config.drainRate}/MIN</div>
        <div>{state.timeSpentToday} MIN</div>
      </div>

      {expanded && state.tokenHistory.length > 1 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-[9px] opacity-60 mb-1 uppercase">TOKEN_HISTORY</div>
          <svg viewBox="0 0 100 100" className="w-full h-12 stroke-token-green fill-none">
            <polyline
              points={historyPoints}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default SiteRow;