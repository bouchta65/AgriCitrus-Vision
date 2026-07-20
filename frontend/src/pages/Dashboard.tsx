import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Upload, TrendingUp, CheckCircle, AlertTriangle, ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { state, capturePhoto } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute stats based on the state list or defaults
  const totalScans = state.recentScans;
  const importedTotals = state.scanReports.reduce(
    (acc, report) => {
      acc.detected += report.items.length;
      acc.accepted += report.items.filter((fruit) => fruit.statusLabel === 'ACCEPT').length;
      acc.rejected += report.items.filter((fruit) => fruit.statusLabel === 'REJECT').length;
      return acc;
    },
    { detected: 0, accepted: 0, rejected: 0 }
  );
  const computedTotal = state.scanReports.length > 0 ? importedTotals : { detected: 1240, accepted: 1150, rejected: 90 };

  const acceptanceRate = (computedTotal.accepted / computedTotal.detected) * 100;

  const handleImageImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    capturePhoto(file, () => navigate('/analysis'));
    event.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="p-8 space-y-8 flex-1 overflow-y-auto"
    >
      {/* Upper Welcome Banner Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Today's Harvest Dashboard Welcome Banner */}
        <div className="lg:col-span-7 bg-amber-50/45 border border-orange-100 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm shadow-sm md:min-h-[220px]">
          {/* Subtle design element backdrops */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-orange-200/15 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          
          <div className="space-y-3 relative z-10">
            <span className="text-[10px] font-bold text-orange-800 font-mono tracking-widest uppercase">
              Quality Control System
            </span>
            <h1 className="text-3xl font-display font-bold text-stone-900 tracking-tight">
              Today's Harvest Dashboard
            </h1>
            <p className="text-sm text-stone-500 max-w-lg leading-relaxed">
              Deploy AI-powered vision to detect defects, size variances, and laboratory sorting precision automatically.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageImport}
          />

          <div className="mt-6 relative z-10">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-medium px-6 py-3 rounded-xl transition-all duration-150 transform hover:-translate-y-0.5 shadow-md hover:shadow-orange-200 flex items-center justify-center gap-3.5 cursor-pointer text-sm"
              id="cta-start-new-scan"
            >
              <Upload size={15} />
              <span>Import Image</span>
            </button>
          </div>
        </div>

        {/* Right Side: Today's Total Statistics Card */}
        <div className="lg:col-span-5 bg-white border border-stone-100 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-display text-lg font-bold flex items-center gap-2"
              style={{ color: state.settings.darkMode ? '#f5f5f4' : '#000000' }}
            >
              Today's Total
            </h2>
            <span className="bg-red-100 text-black dark:bg-red-950/40 dark:text-red-200 border border-red-200 dark:border-red-900/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
              LIVE
            </span>
          </div>

          {/* Key Metric Blocks */}
          <div className="grid grid-cols-3 gap-4 py-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Detected
              </span>
              <span className="text-2xl font-semibold text-stone-900 font-mono tracking-tight block">
                {computedTotal.detected.toLocaleString()}
              </span>
            </div>
            
            <div className="border-l border-stone-100 pl-4 space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                Accepted
              </span>
              <span className="text-2xl font-semibold text-emerald-600 font-mono tracking-tight block">
                {computedTotal.accepted.toLocaleString()}
              </span>
            </div>

            <div className="border-l border-stone-100 pl-4 space-y-1">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                Rejected
              </span>
              <span className="text-2xl font-semibold text-red-600 font-mono tracking-tight block">
                {computedTotal.rejected.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Progress bar container */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-stone-500">
              <span>Acceptance Rate</span>
              <span className="text-emerald-600 font-mono">{acceptanceRate.toFixed(1)}%</span>
            </div>
            {/* Real Progress Bar */}
            <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${acceptanceRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans Table Section */}
      <div className="bg-white border border-stone-100 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-stone-900 text-lg font-bold">
            Recent Scans
          </h2>
          <button
            onClick={() => navigate('/reports')}
            className="text-orange-600 hover:text-orange-700 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>VIEW ALL</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Customized exact high-fidelity table display */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3">
                <th className="pb-3 font-semibold">Scan</th>
                <th className="pb-3 font-semibold">Detected</th>
                <th className="pb-3 font-semibold">Accepted</th>
                <th className="pb-3 font-semibold">Rejected</th>
                <th className="pb-3 font-semibold">Rejected</th>
                <th className="pb-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50 text-sm">
              
              {/* Row 1 â€” SCAN_09042 */}
              <tr className="group hover:bg-stone-50/50 transition-colors duration-150">
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3.5">
                    {/* Orange Fruit Thumbnail */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-inner border border-amber-100 bg-amber-50 shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1582979512210-99b6a53386f9?q=80&w=150&auto=format&fit=crop"
                        alt="Fruit scan thumbnail"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                    <div>
                      <span className="font-mono font-bold text-stone-950 block">SCAN_09042</span>
                      <span className="text-xs text-stone-400 font-medium">48 Fruits</span>
                    </div>
                  </div>
                </td>
                <td className="py-4">
                  <div className="space-y-1">
                    <p className="font-mono font-semibold text-stone-800">48 Fruits</p>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse shrink-0"></span>
                      40 PASS
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <div className="space-y-1">
                    <p className="font-mono font-semibold text-stone-800">11,150</p>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0"></span>
                      ACCEPTED
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <div className="space-y-1">
                    <p className="font-mono font-semibold text-stone-500">Rejected</p>
                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-700 shrink-0"></span>
                      3 FAIL
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <div className="space-y-1">
                    <p className="font-mono font-semibold text-stone-500">90</p>
                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-700 shrink-0"></span>
                      3 FAIL
                    </span>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <button
                    onClick={() => navigate('/reports')}
                    className="p-1 px-2.5 bg-stone-100 dark:bg-stone-900 group-hover:bg-orange-100 dark:group-hover:bg-orange-950/40 group-hover:text-orange-700 dark:group-hover:text-orange-400 text-stone-400 rounded-lg transition-all duration-150 cursor-pointer"
                  >
                    <ChevronRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </td>
              </tr>

              {/* Dynamic user simulations appended row if any */}
              {state.recentScans.filter((scan) => scan.id !== 'SCAN_09042').map((scan) => (
                <tr key={scan.id} className="group hover:bg-stone-50/50 transition-colors duration-150 animate-fadeIn">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center font-bold">
                        AI
                      </div>
                      <div>
                        <span className="font-mono font-bold text-stone-950 block">{scan.id}</span>
                        <span className="text-xs text-stone-400 font-medium">Dynamic Scan</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-1">
                      <p className="font-mono font-semibold text-stone-800">{scan.detectedCount} Fruits</p>
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse shrink-0"></span>
                        {scan.acceptedCount} PASS
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-1">
                      <p className="font-mono font-semibold text-stone-800">{scan.acceptedCount}</p>
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0"></span>
                        ACCEPTED
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-1">
                      <p className="font-mono font-semibold text-stone-500">Rejected</p>
                      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-700 shrink-0"></span>
                        {scan.rejectedCount} FAIL
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-1">
                      <p className="font-mono font-semibold text-stone-500">90</p>
                      <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                        Dynamic
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => navigate('/reports')}
                      className="p-1 px-2.5 bg-stone-100 dark:bg-stone-900 group-hover:bg-orange-100 dark:group-hover:bg-orange-950/40 group-hover:text-orange-700 dark:group-hover:text-orange-400 text-stone-400 rounded-lg transition-all duration-150 cursor-pointer"
                    >
                      <ChevronRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

