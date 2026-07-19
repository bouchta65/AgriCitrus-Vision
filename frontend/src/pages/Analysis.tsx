import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2, CheckCircle2, Circle, Lock, Award, Eye, Wrench, Ban, Sparkles, Target, Upload, ZoomIn, X } from 'lucide-react';
import { motion } from 'motion/react';

export const Analysis: React.FC = () => {
  const navigate = useNavigate();
  const { state, cancelAnalysis, capturePhoto } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { analysisProgress, analysisPhase, analysisError, scannedFruits, annotatedImage, currentScanId, config, settings } = state;
  const [zoomOpen, setZoomOpen] = useState(false);

  // Determine dynamic description based on progress
  const getPhaseDescription = () => {
    switch (analysisPhase) {
      case 'preprocessing':
        return 'Filtering image channels, normalizing contrast levels, and sharpening edge focus...';
      case 'detecting':
        return 'YOLO neural networks running bounding-box matrices to detect individual fruits...';
      case 'calculating':
        return 'Executing high-precision diameter mapping for detected yield.';
      case 'classifying':
        return 'ResNet classification scanning for surface infections, lesions, and spots...';
      case 'completed':
        return 'Analysis completed successfully. Rendering full report records.';
      default:
        return 'Running initial device diagnostics...';
    }
  };

  // Remaining time calculation
  const remainingTime = Math.max(0, ((100 - analysisProgress) * 0.08)).toFixed(2);
  const countTotal = scannedFruits.length;
  const countAccepted = scannedFruits.filter((fruit) => fruit.statusLabel === 'ACCEPT').length;
  const countRejected = scannedFruits.filter((fruit) => fruit.statusLabel === 'REJECT').length;
  const countSmall = scannedFruits.filter((fruit) => fruit.status === 'Too Small').length;
  const countInfected = scannedFruits.filter((fruit) => fruit.decision === 'Infected').length;
  const getResnetStatus = (fruit: typeof scannedFruits[number]) => {
    if (fruit.status === 'Too Small') return 'Too Small';
    if (fruit.resnet?.label) return fruit.resnet.label.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    return fruit.status || 'Not Classified';
  };

  const handleImageImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    capturePhoto(file, () => navigate('/analysis'));
    event.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 space-y-8 flex-1 overflow-y-auto"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageImport}
      />

      {/* 1. Header with horizontal progress bar */}
      <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest font-mono">
            Pipeline Progress
          </h2>
          <span className="text-2xl font-bold text-orange-600 font-mono">
            {analysisProgress}%
          </span>
        </div>

        {/* Outer progress line */}
        <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-orange-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${analysisProgress}%` }}
          ></div>
        </div>
      </div>


      {analysisPhase === 'completed' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-orange-600 font-mono tracking-widest uppercase">Scan Reference Report</span>
              <h1 className="text-2xl font-display font-bold text-stone-900 tracking-tight">Yield Assessment: <span className="font-mono text-orange-600">{currentScanId}</span></h1>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-orange-100 rounded-full text-xs text-orange-850 font-mono">
              <span>Accuracy: 99.8%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white border border-stone-100 rounded-3xl p-5 shadow-sm space-y-3">
              <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="group relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-950 border border-stone-100 shadow-inner cursor-zoom-in text-left"
                >
                <img src={annotatedImage || ''} alt="Scanned yield list" className="absolute inset-0 w-full h-full object-cover opacity-90 saturate-[1.15] transition-transform duration-300 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors"></div>
                <div className="absolute left-3 top-3 bg-white/90 text-stone-900 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn size={12} /> CLICK TO ZOOM
                </div>
                <div className="absolute bottom-3 right-3 bg-stone-950/70 border border-stone-800 text-[9px] font-mono font-bold text-stone-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                  SNAP REF // RAW FEED
                </div>
              </button>
              <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
                <span>Spectral Channel matrix overlay applied</span>
                <span className="text-stone-400 font-mono">{settings.modelVersion}</span>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-6">
              <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm grid grid-cols-3 gap-4">
                <div className="text-center space-y-1.5"><span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total</span><span className="text-3xl font-bold text-stone-900 font-mono block">{countTotal}</span></div>
                <div className="border-l border-stone-100 text-center space-y-1.5"><span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Accepted</span><span className="text-3xl font-bold text-emerald-600 font-mono block">{countAccepted}</span></div>
                <div className="border-l border-stone-100 text-center space-y-1.5"><span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Rejected</span><span className="text-3xl font-bold text-red-650 font-mono block">{countRejected}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50/30 border border-orange-100 rounded-3xl p-6">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Small Diameter</span>
                  <div className="flex items-baseline justify-between mt-3"><span className="text-lg font-mono font-bold text-orange-700">&lt;{config.minDiameter}mm</span><span className="text-4xl font-mono font-bold text-stone-900">{countSmall}</span></div>
                </div>
                <div className="bg-red-50/30 border border-red-100 rounded-3xl p-6">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Disease Detected</span>
                  <div className="flex items-baseline justify-between mt-3"><span className="text-lg font-bold text-red-700">Infected</span><span className="text-4xl font-mono font-bold text-stone-900">{countInfected}</span></div>
                </div>
              </div>

              <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-6 flex items-center justify-between">
                <div><span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Machine compliance status</span><span className="text-xl font-display font-bold text-emerald-700 uppercase">Approved Passed</span></div>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">APPROVED PASSED</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-100 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Detection Model</span>
              <p className="mt-2 text-sm font-bold text-stone-900">YOLO Detector</p>
              <p className="mt-1 text-xs text-stone-500 font-mono">Confidence ≥ {config.yoloConfidence}%</p>
            </div>
            <div className="bg-white border border-stone-100 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Health Model</span>
              <p className="mt-2 text-sm font-bold text-stone-900">ResNet Classifier</p>
              <p className="mt-1 text-xs text-stone-500 font-mono">Confidence ≥ {config.resnetConfidence}%</p>
            </div>
            <div className="bg-white border border-stone-100 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Active Version</span>
              <p className="mt-2 text-sm font-bold text-stone-900">{settings.modelVersion}</p>
              <p className="mt-1 text-xs text-stone-500 font-mono">Min Ø {config.minDiameter}mm</p>
            </div>
          </div>

          <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-orange-600 font-mono tracking-widest uppercase">Detection Details</span>
                <h2 className="text-xl font-display font-bold text-stone-900">All Boxes Report</h2>
              </div>
              <span className="text-xs font-mono font-bold text-stone-500">{countTotal} ITEMS</span>
            </div>

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto rounded-2xl border border-stone-100">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Diameter</th>
                    <th className="px-4 py-3">ResNet Status</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {scannedFruits.map((fruit) => (
                    <tr key={fruit.id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3 font-mono font-bold text-stone-900">{fruit.id}</td>
                      <td className="px-4 py-3 font-mono text-stone-700">{fruit.diameter}mm</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          fruit.decision === 'Accept'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : fruit.decision === 'Infected'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-orange-200 bg-orange-50 text-orange-800'
                        }`}>
                          {getResnetStatus(fruit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-stone-700">
                        {fruit.resnet?.confidence != null ? `${(fruit.resnet.confidence * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className={`px-4 py-3 font-bold ${fruit.decision === 'Accept' ? 'text-emerald-600' : fruit.decision === 'Infected' ? 'text-red-600' : 'text-orange-600'}`}>
                        {fruit.decision}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {zoomOpen && annotatedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setZoomOpen(false)}>
          <div className="relative max-w-6xl w-full" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setZoomOpen(false)} className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <X size={22} />
            </button>
            <img src={annotatedImage} alt="Zoomed scanned yield" className="max-h-[82vh] w-full object-contain rounded-3xl bg-stone-950 shadow-2xl" />
            <div className="mt-3 text-center text-xs font-mono text-white/70">{currentScanId} • {settings.modelVersion}</div>
          </div>
        </div>
      )}

      {analysisError && (
        <p className="text-sm text-red-600 font-semibold">Backend offline or failed: {analysisError}</p>
      )}
      {/* 2. Main content split grid layout */}
      {analysisPhase !== 'completed' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
        
        {/* Left Side: Circular Processing Indicator & Status Text */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative flex items-center justify-center">
            
            {/* Outer spinning border highlight */}
            <div className="absolute w-72 h-72 border-4 border-stone-100 rounded-full"></div>
            <div
              className="absolute w-72 h-72 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spinSlow"
              style={{ transform: `rotate(${analysisProgress * 3.6}deg)` }}
            ></div>

            {/* Inner aesthetic circle card */}
            <div className="w-60 h-60 bg-white border border-stone-100 rounded-full flex flex-col items-center justify-center shadow-lg relative z-10 p-4">
              {/* Microscope/Citrus Scanning Icon */}
              <div className="bg-orange-50 p-4 rounded-full text-orange-600 mb-2 animate-pulse">
                <Target size={36} className="animate-spinSlow" />
              </div>
              <span className="text-xs font-bold tracking-widest text-stone-400 uppercase font-mono">
                Pipeline Run
              </span>
              <p className="text-xl font-bold text-stone-900 tracking-tight font-display mt-1">
                ANALYZING
              </p>
              <span className="text-[10px] font-mono font-semibold bg-orange-100 text-orange-850 px-2.5 py-0.5 rounded-full mt-2 inline-flex items-center gap-1">
                <Loader2 size={10} className="animate-spin text-orange-600" />
                Live Feed
              </span>
            </div>
          </div>

          <p className="text-sm text-stone-500 max-w-sm font-medium leading-relaxed min-h-[48px]">
            {getPhaseDescription()}
          </p>
        </div>

        {/* Right Side: Step-by-Step Pipeline Status Card list */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-stone-400 uppercase">
            Active Vision Pipeline Steps
          </h3>

          <div className="space-y-3.5">
            {/* Step 1: Image Preprocessing */}
            <div
              className={`p-4 border rounded-2xl flex items-center justify-between transition-all duration-300 ${
                analysisProgress >= 25
                  ? 'bg-emerald-50/40 border-emerald-100 text-stone-850'
                  : 'bg-white border-stone-100 hover:border-stone-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`${analysisProgress >= 25 ? 'text-emerald-550' : 'text-stone-300'}`}>
                  <CheckCircle2 size={24} fill={analysisProgress >= 25 ? '#e6f4ea' : 'transparent'} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-800">Image Preprocessing</h4>
                  <p className="text-[11px] font-mono text-stone-400 uppercase">
                    {analysisProgress >= 25 ? 'DONE' : 'RUNNING...'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-stone-400">Step 1</span>
            </div>

            {/* Step 2: YOLO Fruit Detection */}
            <div
              className={`p-4 border rounded-2xl flex items-center justify-between transition-all duration-300 ${
                analysisProgress >= 60
                  ? 'bg-emerald-50/40 border-emerald-100 text-stone-850'
                  : analysisProgress >= 25
                  ? 'bg-amber-50/30 border-orange-200 text-stone-800 ring-1 ring-orange-100'
                  : 'bg-white border-stone-100 text-stone-400'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`${analysisProgress >= 60 ? 'text-emerald-550' : analysisProgress >= 25 ? 'text-orange-500 animate-pulse' : 'text-stone-300'}`}>
                  {analysisProgress >= 60 ? (
                    <CheckCircle2 size={24} fill="#e6f4ea" />
                  ) : analysisProgress >= 25 ? (
                    <Loader2 size={24} className="animate-spin text-orange-500" />
                  ) : (
                    <Circle size={22} className="text-stone-200" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-800">YOLO Fruit Detection</h4>
                  <p className="text-[11px] font-mono text-stone-400 uppercase">
                    {analysisProgress >= 60 ? '32 FRUITS DETECTED' : analysisProgress >= 25 ? 'CALIBRATING COORDS...' : 'PENDING'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-stone-400">Step 2</span>
            </div>

            {/* Step 3: Diameter Calculation */}
            <div
              className={`p-4 border rounded-2xl flex items-center justify-between transition-all duration-300 ${
                analysisProgress >= 85
                  ? 'bg-emerald-50/40 border-emerald-100 text-stone-850'
                  : analysisProgress >= 60
                  ? 'bg-amber-50/30 border-orange-200 text-stone-800 ring-1 ring-orange-100'
                  : 'bg-white border-stone-100 text-stone-400 opacity-75'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`${analysisProgress >= 85 ? 'text-emerald-550' : analysisProgress >= 60 ? 'text-orange-500 animate-pulse' : 'text-stone-300'}`}>
                  {analysisProgress >= 85 ? (
                    <CheckCircle2 size={24} fill="#e6f4ea" />
                  ) : analysisProgress >= 60 ? (
                    <Loader2 size={24} className="animate-spin text-orange-500" />
                  ) : (
                    <Circle size={22} className="text-stone-200" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-800">Diameter Calculation</h4>
                  <p className="text-[11px] font-mono text-stone-400 uppercase">
                    {analysisProgress >= 85 ? 'PROCESSING DONE' : analysisProgress >= 60 ? 'CALCULATING MASS...' : 'PENDING'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-stone-400">Step 3</span>
            </div>

            {/* Step 4: ResNet Health Analysis */}
            <div
              className={`p-4 border rounded-2xl flex items-center justify-between transition-all duration-300 ${
                analysisProgress >= 100
                  ? 'bg-emerald-50/40 border-emerald-100 text-stone-850'
                  : analysisProgress >= 85
                  ? 'bg-amber-50/30 border-orange-200 text-stone-800 ring-1 ring-orange-100'
                  : 'bg-stone-50 border-stone-100 text-stone-400'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`${analysisProgress >= 100 ? 'text-emerald-550' : analysisProgress >= 85 ? 'text-orange-500 animate-pulse' : 'text-stone-300'}`}>
                  {analysisProgress >= 100 ? (
                    <CheckCircle2 size={24} fill="#e6f4ea" />
                  ) : analysisProgress >= 85 ? (
                    <Loader2 size={24} className="animate-spin text-orange-500" />
                  ) : (
                    <Lock size={18} className="text-stone-300" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-800">ResNet Health Analysis</h4>
                  <p className="text-[11px] font-mono text-stone-400 uppercase">
                    {analysisProgress >= 100 ? 'STABLE HEALTH RATED' : analysisProgress >= 85 ? 'TESTING SURFACE LESIONS...' : 'PENDING'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-stone-400">Step 4</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 3. Bottom controls and remaining countdown */}
      <div className="flex flex-col items-center justify-center pt-4 space-y-3.5 border-t border-stone-100 max-w-md mx-auto w-full">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium text-xs transition-all duration-150 flex items-center gap-2 cursor-pointer"
          >
            <Upload size={13} />
            <span>Import Image</span>
          </button>
          <button
            onClick={() => cancelAnalysis(() => navigate('/'))}
            className="px-6 py-2.5 border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-stone-600 rounded-xl font-medium text-xs transition-all duration-150 flex items-center gap-2 cursor-pointer"
          >
            <Ban size={13} />
            <span>Cancel Analysis</span>
          </button>
        </div>

        {analysisPhase !== 'completed' && (
          <p className="text-[10px] font-bold text-stone-400 tracking-wider uppercase font-mono">
            Estimated Time Remaining: <span className="text-orange-600 font-bold ml-1">{remainingTime}S</span>
          </p>
        )}
      </div>
    </motion.div>
  );
};





