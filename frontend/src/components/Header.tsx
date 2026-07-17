import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogOut, RotateCw, Bell, Wifi } from 'lucide-react';

export const Header: React.FC = () => {
  const { state, triggerSync, logout } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const isDarkMode = state.settings.darkMode;

  const handleSyncClick = () => {
    setIsSyncing(true);
    triggerSync();
    setTimeout(() => setIsSyncing(false), 1000);
  };

  return (
    <header className={`h-16 border-b px-8 flex items-center justify-between select-none shrink-0 z-10 transition-colors duration-300 ${
      isDarkMode ? 'border-stone-800 bg-stone-950/80 text-white backdrop-blur-md' : 'border-stone-100 bg-white/80 text-stone-900 backdrop-blur-md'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-full ${isDarkMode ? 'bg-orange-950/30 border-orange-500/20' : 'bg-amber-50/70 border-orange-100'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
          <span className={`text-[11px] font-semibold font-mono tracking-wider ${isDarkMode ? 'text-orange-400' : 'text-orange-850'}`}>CITRUS_AI_ACTIVE</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-stone-450 text-xs">
          <Wifi size={13} className="text-emerald-500" />
          <span>{state.authUser?.role.toUpperCase()} session</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleSyncClick} className={`p-2 rounded-lg transition-all duration-200 cursor-pointer relative ${isDarkMode ? 'text-stone-400 hover:text-orange-450 hover:bg-stone-900' : 'text-stone-500 hover:text-orange-600 hover:bg-orange-50'}`} title="Manual sync">
          <RotateCw size={18} className={`${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing && <span className="absolute -top-1 -right-1 bg-orange-600 w-2 h-2 rounded-full"></span>}
        </button>

        <button className={`p-2 rounded-lg transition-all duration-200 relative cursor-pointer ${isDarkMode ? 'text-stone-400 hover:text-orange-450 hover:bg-stone-900' : 'text-stone-500 hover:text-orange-600 hover:bg-orange-50'}`}>
          <Bell size={18} />
          {state.settings.emailAlerts && <span className="absolute top-1.5 right-1.5 bg-emerald-500 w-1.5 h-1.5 rounded-full"></span>}
        </button>

        <button onClick={logout} className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${isDarkMode ? 'text-stone-400 hover:text-white hover:bg-stone-900' : 'text-stone-500 hover:text-red-600 hover:bg-red-50'}`} title="Logout">
          <LogOut size={18} />
        </button>

        <div className={`w-px h-6 ${isDarkMode ? 'bg-stone-850' : 'bg-stone-105'}`}></div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex flex-col text-right">
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-stone-205' : 'text-stone-800'}`}>{state.settings.accountName}</span>
            <span className={`text-[9px] font-mono ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>{state.authUser?.role.toUpperCase()} • {state.settings.accountEmail}</span>
          </div>
          <div className="relative group cursor-pointer">
            <img src={state.settings.accountAvatar} referrerPolicy="no-referrer" alt="User profile" className={`w-9 h-9 rounded-full object-cover border-2 shadow-sm transition-all duration-300 ${isDarkMode ? 'border-orange-950 hover:border-orange-500' : 'border-orange-100 hover:border-orange-500'}`} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
        </div>
      </div>
    </header>
  );
};
