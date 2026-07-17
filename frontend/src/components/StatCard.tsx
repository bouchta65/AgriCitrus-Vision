import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'green' | 'red' | 'gray';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  badgeColor = 'green'
}) => {
  const getBadgeColors = () => {
    switch (badgeColor) {
      case 'green':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'red':
        return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400';
      default:
        return 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300';
    }
  };

  return (
    <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all duration-200 hover:border-orange-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-stone-400">
          {title}
        </h3>
        {badge && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getBadgeColors()}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-3xl font-semibold text-stone-900 font-mono tracking-tight block">
          {value}
        </span>
        {subtitle && (
          <span className="text-xs text-stone-450 font-medium block">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
