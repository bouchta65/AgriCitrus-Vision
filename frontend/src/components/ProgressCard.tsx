import React from 'react';

interface ProgressCardProps {
  title: string;
  value: number;
  label: string;
  color?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  value,
  label,
  color = 'bg-orange-500'
}) => {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-wider font-mono">
          {title}
        </span>
        <span className="text-sm font-bold text-orange-600 font-mono">
          {value}%
        </span>
      </div>
      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
      <p className="text-[10px] text-stone-400 font-medium">
        {label}
      </p>
    </div>
  );
};
