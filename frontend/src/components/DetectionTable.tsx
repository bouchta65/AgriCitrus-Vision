import React from 'react';
import { FruitReportItem } from '../types';
import { Check } from 'lucide-react';

interface DetectionTableProps {
  items: FruitReportItem[];
}

export const DetectionTable: React.FC<DetectionTableProps> = ({ items }) => {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3">
            <th className="pb-3 font-semibold">Fruit Id</th>
            <th className="pb-3 font-semibold">Detected</th>
            <th className="pb-3 font-semibold">Accepted</th>
            <th className="pb-3 font-semibold">Rejected</th>
            <th className="pb-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
          {items.map((fruit) => (
            <tr key={fruit.id} className="hover:bg-stone-50/30 transition-colors">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-full ${
                    fruit.statusLabel === 'ACCEPT'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400'
                  }`}>
                    <Check size={12} className={fruit.statusLabel === 'ACCEPT' ? '' : 'rotate-45'} />
                  </div>
                  <span className="font-mono font-bold text-stone-900">
                    {fruit.id}
                  </span>
                </div>
              </td>
              <td className="py-3 font-mono text-stone-700">
                {fruit.diameter}mm
              </td>
              <td className="py-3 text-xs font-semibold text-stone-500">
                {fruit.status}
              </td>
              <td className="py-3 font-bold text-xs">
                {fruit.decision}
              </td>
              <td className="py-3">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                  fruit.statusLabel === 'ACCEPT'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30'
                    : 'bg-red-50 text-red-800 border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/30'
                }`}>
                  {fruit.statusLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
