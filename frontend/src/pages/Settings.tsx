import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Bell, Eye, EyeOff, Monitor, Server, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Settings: React.FC = () => {
  const { state, updateSettings } = useApp();
  const { settings } = state;

  // Local draft states
  const [name, setName] = useState(settings.accountName);
  const [email, setEmail] = useState(settings.accountEmail);
  const [avatar, setAvatar] = useState(settings.accountAvatar);
  const [emailAlerts, setEmailAlerts] = useState(settings.emailAlerts);
  const [completionAlerts, setCompletionAlerts] = useState(settings.scanCompletionAlerts);
  const [errorAlerts, setErrorAlerts] = useState(settings.errorAlerts);
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [modelVersion, setModelVersion] = useState(settings.modelVersion);
  const [apiEndpoint, setApiEndpoint] = useState(settings.apiEndpoint);
  const [storageLocation, setStorageLocation] = useState(settings.storageLocation);

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateSettings({
      accountName: name,
      accountEmail: email,
      accountAvatar: avatar,
      emailAlerts,
      scanCompletionAlerts: completionAlerts,
      errorAlerts,
      darkMode,
      modelVersion,
      apiEndpoint,
      storageLocation,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2500);
  };

  const handleReset = () => {
    setName('Hamaina Admin');
    setEmail('hamaina30@gmail.com');
    setAvatar('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200');
    setEmailAlerts(true);
    setCompletionAlerts(true);
    setErrorAlerts(false);
    setDarkMode(false);
    setModelVersion('YOLOv8s + ResNet50-CV fold_4 best');
    setApiEndpoint('/api');
    setStorageLocation('SQLite Backend + Offline Preview');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8 flex-1 overflow-y-auto"
    >
      {/* Settings Title block */}
      <div className="space-y-1.5 animate-fadeIn">
        <h1 className="text-3xl font-display font-bold text-stone-900 tracking-tight">
          System Settings
        </h1>
        <p className="text-sm text-stone-500">
          Configure profile details, alert endpoints, and user mode parameters.
        </p>
      </div>

      {/* Save Toast notification feedback */}
      <AnimatePresence>
        {isSaved && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center gap-3.5 shadow-lg border border-emerald-500 absolute top-24 right-12 z-50 max-w-sm"
          >
            <CheckCircle2 size={20} className="shrink-0" />
            <div>
              <p className="text-sm font-bold">Settings Saved</p>
              <p className="text-xs opacity-90">Your profile coordinates and API keys were successfully modified.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: User Account Coordinates */}
        <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-stone-50">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <User size={18} />
            </div>
            <h2 className="text-sm font-bold text-stone-900 font-display">
              User Account Profiles
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-stone-400 uppercase">
                Profile Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-stone-400 uppercase">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-stone-400 uppercase">
                Avatar Image URL
              </label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-xl py-2.5 px-4 text-xs font-mono focus:outline-none"
              />
              <p className="text-[9px] text-stone-400 font-medium">
                Unsplash or external https portrait link.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Automation Alert Core Settings */}
        <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-stone-50">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Bell size={18} />
            </div>
            <h2 className="text-sm font-bold text-stone-900 font-display">
              Notifications & Alerts
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-2 hover:bg-stone-50/50 rounded-xl transition-colors">
              <div>
                <h4 className="text-xs font-bold text-stone-800">Email Alerts</h4>
                <p className="text-[10px] text-stone-450 font-medium font-mono">Send CSV daily logs to admin inbox</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 bg-stone-100 border-stone-300 focus:ring-orange-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2 hover:bg-stone-50/50 rounded-xl transition-colors">
              <div>
                <h4 className="text-xs font-bold text-stone-800">Scan Completion Alerts</h4>
                <p className="text-[10px] text-stone-450 font-medium font-mono">Push browser popups when conveyor yields scan</p>
              </div>
              <input
                type="checkbox"
                checked={completionAlerts}
                onChange={(e) => setCompletionAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 bg-stone-100 border-stone-300 focus:ring-orange-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2 hover:bg-stone-50/50 rounded-xl transition-colors">
              <div>
                <h4 className="text-xs font-bold text-stone-800">Error & Calibration alerts</h4>
                <p className="text-[10px] text-stone-450 font-medium font-mono">Urgent notify when camera alignment shifts</p>
              </div>
              <input
                type="checkbox"
                checked={errorAlerts}
                onChange={(e) => setErrorAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 bg-stone-100 border-stone-300 focus:ring-orange-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Visual Theme Selection */}
        <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-stone-50">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Monitor size={18} />
            </div>
            <h2 className="text-sm font-bold text-stone-900 font-display">
              Appearance Modes
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-stone-800">Forced Light Mode</p>
                <p className="text-[10px] text-stone-400">Keep the orange citrus daylight theme</p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-850 font-bold font-mono text-[10px] rounded-lg border border-orange-200 transition-colors cursor-pointer"
              >
                {darkMode ? 'DARK PRESENCE' : 'LIGHT PRESENCE'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: System and telemetry Endpoint Nodes */}
        <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-stone-50">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Server size={18} />
            </div>
            <h2 className="text-sm font-bold text-stone-900 font-display">
              System Telemetry Nodes
            </h2>
          </div>

          <div className="space-y-4 font-mono">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-stone-400 block">MODEL VERSION</span>
              <input
                type="text"
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold text-stone-400 block">API CONTROLLER ENDPOINT</span>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold text-stone-400 block">CLOUD TELEMETRY TARGET BUCKET</span>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-stone-900">Settings actions</p>
          <p className="text-xs text-stone-500">Reset the draft values or save the updated account and system settings.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={handleReset}
            className="px-5 py-3 border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-stone-600 font-bold rounded-xl text-xs transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>Reset Settings</span>
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            id="btn-save-settings"
          >
            <Save size={13} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

    </motion.div>
  );
};



