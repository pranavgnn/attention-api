import React from "react";

interface Props {
  current: number;
  max: number;
}

const TokenBar: React.FC<Props> = ({ current, max }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  
  let colorClass = "bg-token-green";
  if (percentage < 30) colorClass = "bg-token-red";
  else if (percentage < 60) colorClass = "bg-token-yellow";

  return (
    <div className="w-full bg-border-accent h-1.5 overflow-hidden">
      <div 
        className={`h-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default TokenBar;