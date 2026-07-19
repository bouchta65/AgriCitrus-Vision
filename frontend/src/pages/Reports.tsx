import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrainCircuit, Download, Eye, Trash2, X, ZoomIn } from 'lucide-react';
import { motion } from 'motion/react';
import { ScanReport } from '../types';

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (reports: ScanReport[]) => {
  const header = [
    'report_id',
    'timestamp',
    'image_name',
    'source',
    'fruit_id',
    'diameter_mm',
    'status',
    'decision',
    'pass_count',
    'fail_count',
  ];
  const rows = reports.flatMap((report) =>
    report.items.map((item) => [
      report.id,
      report.timestamp,
      report.imageName,
      report.source,
      item.id,
      item.diameter,
      item.status,
      item.decision,
      item.passCount,
      item.failCount,
    ])
  );
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `agricitrus-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const Reports: React.FC = () => {
  const { state, deleteScanReport } = useApp();
  const { scanReports, config, settings } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = scanReports.find((report) => report.id === selectedId) || null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="p-8 space-y-6 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-orange-600 font-mono tracking-widest uppercase">Reports</span>
          <h1 className="text-2xl font-display font-bold text-stone-900 tracking-tight">Imported Images History</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-stone-400">{scanReports.length} imports</span>
          <button
            type="button"
            onClick={() => downloadCsv(scanReports)}
            disabled={scanReports.length === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {scanReports.length === 0 ? (
        <div className="bg-white border border-stone-100 rounded-3xl p-10 text-center text-stone-500 shadow-sm">
          No imported images yet. Use Import Image in Dashboard or Analysis.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {scanReports.map((report) => {
            const accepted = report.items.filter((fruit) => fruit.statusLabel === 'ACCEPT').length;
            return (
              <div key={report.id} className="bg-white border border-stone-100 rounded-3xl overflow-hidden shadow-sm">
                <button type="button" onClick={() => setSelectedId(report.id)} className="group relative w-full aspect-video bg-stone-950 cursor-zoom-in overflow-hidden">
                  <img src={report.annotatedImage} alt={report.imageName} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <span className="absolute right-3 top-3 bg-white/90 text-stone-900 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn size={12} /> ZOOM</span>
                </button>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-orange-600">{report.id}</span>
                    <span className="text-[10px] uppercase font-bold text-stone-400">{report.source}</span>
                  </div>
                  <p className="text-xs text-stone-500 truncate">{report.imageName}</p>
                  <p className="text-xs font-mono text-stone-700">Total {report.items.length} / Accept {accepted} / Reject {report.items.length - accepted}</p>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setSelectedId(report.id)} className="flex-1 px-3 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                      <Eye size={13} /> Detail
                    </button>
                    <button onClick={() => deleteScanReport(report.id)} className="px-3 py-2 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-bold flex items-center gap-2">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setSelectedId(null)}>
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-stone-900">{selected.id}</h2>
                <p className="text-xs text-stone-500">{selected.timestamp} • {selected.imageName}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 rounded-full hover:bg-stone-100"><X size={18} /></button>
            </div>
            <img src={selected.annotatedImage} alt={selected.imageName} className="w-full max-h-[58vh] object-contain rounded-2xl bg-stone-950" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <BrainCircuit size={18} className="text-orange-600" />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Model Version</p>
                <p className="text-sm font-bold text-stone-900">{settings.modelVersion}</p>
              </div>
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">YOLO Threshold</p>
                <p className="mt-2 text-lg font-mono font-bold text-stone-900">{config.yoloConfidence}%</p>
                <p className="text-xs text-stone-500">Detection confidence</p>
              </div>
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">ResNet Threshold</p>
                <p className="mt-2 text-lg font-mono font-bold text-stone-900">{config.resnetConfidence}%</p>
                <p className="text-xs text-stone-500">Health confidence</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase text-stone-400 border-b"><tr><th className="py-2">ID</th><th>Diameter</th><th>Status</th><th>Decision</th></tr></thead>
                <tbody>
                  {selected.items.map((item) => (
                    <tr key={item.id} className="border-b border-stone-50"><td className="py-3 font-mono font-bold">{item.id}</td><td>{item.diameter}mm</td><td>{item.status}</td><td>{item.decision}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
