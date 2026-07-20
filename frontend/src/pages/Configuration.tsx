import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sliders, Wrench, RefreshCw, FileText, CheckCircle2, ChevronDown, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Configuration: React.FC = () => {
  const { state, updateConfig } = useApp();
  const { config } = state;

  // Local editing states to preserve draft settings until "Save Changes" is clicked
  const [yolo, setYolo] = useState(config.yoloConfidence);
  const [minDiam, setMinDiam] = useState(config.minDiameter);
  const [resnet, setResnet] = useState(config.resnetConfidence);
  const [pixelFactor, setPixelFactor] = useState(config.maxFlexPixelFactor);
  const [format, setFormat] = useState(config.exportFormat);

  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const handleSave = () => {
    updateConfig({
      yoloConfidence: yolo,
      minDiameter: minDiam,
      resnetConfidence: resnet,
      maxFlexPixelFactor: pixelFactor,
      exportFormat: format,
    });
    setIsSavedAlert(true);
    setTimeout(() => {
      setIsSavedAlert(false);
    }, 2500);
  };

  const handleReset = () => {
    setYolo(0.35);
    setMinDiam(35);
    setResnet(0.92);
    setPixelFactor(0.30);
    setFormat('PDF Report');
  };

  const handleRecalibrate = () => {
    setIsCalibrating(true);
    // Simulate real-time hardware alignment
    setTimeout(() => {
      setIsCalibrating(false);
      setPixelFactor(+(0.2800 + Math.random() * 0.04).toFixed(4));
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8 flex-1 overflow-y-auto"
    >
      {/* Page Title & Breadcrumb Block */}
      <div className="space-y-1.5">
        <h1 className="text-3xl font-display font-bold text-stone-900 tracking-tight">
          Configuration
        </h1>
        <p className="text-sm text-stone-500">
          Calibrate detection sensors and analysis parameters.
        </p>
      </div>

      {/* Floating Save success popup alert */}
      <AnimatePresence>
        {isSavedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center gap-3.5 shadow-lg border border-emerald-500 absolute top-24 right-12 z-50 max-w-sm"
          >
            <CheckCircle2 size={20} className="shrink-0 text-white" />
            <div>
              <p className="text-sm font-bold">Parameters Saved</p>
              <p className="text-xs opacity-90 font-medium">Sensors and YOLO pipelines successfully refreshed.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 Cards Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Detection Thresholds */}
        <div id="config-card-detection" className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 pb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Sliders size={18} />
            </div>
            <h2 className="text-sm font-bold text-stone-900 font-display">
              Detection Thresholds
            </h2>
          </div>

          <div className="space-y-5">
            {/* Field 1: YOLO Confidence slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                  YOLO Confidence
                </span>
                <span className="text-sm font-mono font-bold text-orange-600">
                  {yolo.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.99"
                step="0.01"
                value={yolo}
                onChange={(e) => setYolo(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-orange-600 transition-all focus:outline-none"
              />
              <p className="text-[10px] text-stone-400 font-medium leading-normal">
                Minimum probability required for object detection.
              </p>
            </div>

            {/* Field 2: Min diameter input. Note typo in "MIN DATE" or "MIN DIAMETER (MM)" from screenshot. */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                MIN DIAMETER (MM)
              </span>
              <div className="relative">
                <input
                  type="number"
                  value={minDiam}
                  onChange={(e) => setMinDiam(parseInt(e.target.value) || 0)}
                  className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-xl py-3 px-4 text-sm font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-orange-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-mono">
                  mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Analysis Thresholds */}
        <div id="config-card-analysis" className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[250px]">
          <div>
            <div className="flex items-center gap-2.5 pb-4">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                <Sliders size={18} />
              </div>
              <h2 className="text-sm font-bold text-stone-900 font-display">
                Analysis Thresholds
              </h2>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                  ResNet Confidence
                </span>
                <span className="text-sm font-mono font-bold text-orange-600">
                  {resnet.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.99"
                step="0.01"
                value={resnet}
                onChange={(e) => setResnet(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-orange-500 transition-all focus:outline-none"
              />
              <p className="text-[10px] text-stone-400 font-medium leading-normal">
                Confidence level for fruit classification and grading.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-orange-100/50 dark:border-stone-800 rounded-2xl">
            <span className="text-[10px] font-mono font-bold text-stone-500 block uppercase">Hardware link</span>
            <span className="text-[11px] text-stone-500 font-medium font-mono">Spectral lens model synchronized</span>
          </div>
        </div>

        {/* Card 3: Calibration metrics */}
        <div id="config-card-calibration" className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 pb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Wrench size={18} />
            </div>
            <h2 className="text-sm font-bold text-stone-900 font-display">
              Calibration
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                PIXEL TO MM FACTOR
              </span>
              <input
                type="text"
                value={pixelFactor}
                onChange={(e) => setPixelFactor(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-xl py-3 px-4 text-sm font-mono font-semibold focus:outline-none"
              />
            </div>

            <button
              onClick={handleRecalibrate}
              disabled={isCalibrating}
              className="w-full py-3 border border-stone-200 hover:border-orange-500 hover:bg-orange-50 rounded-xl text-stone-600 hover:text-orange-700 font-bold text-xs transition-all duration-150 flex items-center justify-center gap-2"
            >
              <RefreshCw size={12} className={isCalibrating ? 'animate-spin' : ''} />
              <span>{isCalibrating ? 'Calibrating Sensors...' : 'Recalibrate'}</span>
            </button>
          </div>
        </div>

        {/* Card 4: Export Settings */}
        <div id="config-card-export" className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 pb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <FileText size={18} />
            </div>
            <h2 className="text-sm font-bold text-stone-900 font-display">
              Export Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider block">
                SEFEULT FORMAT
              </span>
              
              <div className="relative">
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-xl py-3 px-4 text-sm font-semibold appearance-none focus:outline-none focus:ring-1 focus:ring-orange-100 cursor-pointer"
                >
                  <option value="PDF Report">PDF Report</option>
                  <option value="CSV Logs">CSV Logs</option>
                  <option value="Spectral Binaries">Spectral Binaries</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-stone-900">Configuration actions</p>
          <p className="text-xs text-stone-500">Reset the draft values or save the current calibration changes.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={handleReset}
            className="px-5 py-3 border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-stone-600 font-bold rounded-xl text-xs transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-3 bg-amber-800 hover:bg-amber-700 active:bg-amber-900 text-white font-bold rounded-xl text-xs transition-all duration-150 shadow-md cursor-pointer"
            id="btn-save-config"
          >
            Save Changes
          </button>
        </div>
      </div>
    </motion.div>
  );
};

