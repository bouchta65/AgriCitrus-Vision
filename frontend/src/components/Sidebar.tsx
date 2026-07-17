import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Cpu,
  FileBarChart2,
  Sliders,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { CitrusLogo } from './CitrusLogo';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateSettings } = useApp();
  const currentPath = location.pathname;

  // Persistent sidebar collapsed preference
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);
  const isCurrentlyCollapsed = isCollapsed;
  const isDarkMode = state.settings.darkMode;

  const baseMenuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Analysis', path: '/analysis', icon: Cpu },
    { name: 'Reports', path: '/reports', icon: FileBarChart2 },
    { name: 'Configuration', path: '/configuration', icon: Sliders },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];
  const menuItems = state.authUser?.role === 'admin'
    ? baseMenuItems
    : baseMenuItems.filter((item) => ['Dashboard', 'Analysis', 'Settings'].includes(item.name));

  // Render collapsible compact sidebar (matching the high-fidelity design from Live Scan)
  if (isCurrentlyCollapsed) {
    return (
      <aside className={`w-16 h-screen flex flex-col items-center py-4 justify-between select-none shrink-0 transition-all duration-300 border-r ${
        isDarkMode
          ? 'bg-stone-950 border-stone-800 text-stone-200'
          : 'bg-white border-orange-100/50 text-stone-700'
      }`}>
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Logo element compact */}
          <div
            onClick={() => navigate('/')}
            className={`cursor-pointer rounded-2xl p-2 shadow-sm ${
              isDarkMode ? '' : 'bg-stone-950'
            }`}
          >
            <CitrusLogo size={32} showText={false} />
          </div>

          {/* Vertical items list */}
          <nav className="flex flex-col gap-4 w-full items-center">
            {menuItems.map((item) => {
              const isActive = currentPath === item.path;
              const IconComponent = item.icon;

              return (
                <button
                  key={item.path}
                  id={`sidebar-item-dark-compact-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => navigate(item.path)}
                  className={`group relative p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? isDarkMode
                        ? 'bg-amber-600/20 text-orange-500 border border-orange-500/30'
                        : 'bg-orange-100/70 text-orange-600 border border-orange-200'
                      : isDarkMode
                        ? 'text-stone-400 hover:text-white hover:bg-stone-900'
                        : 'text-stone-500 hover:text-orange-600 hover:bg-stone-50'
                  }`}
                  title={item.name}
                >
                  <IconComponent size={19} />
                  
                  {/* Tooltip helper */}
                  <span className={`absolute left-16 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all duration-150 origin-left border text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-50 shadow-xl font-medium ${
                    isDarkMode
                      ? 'bg-stone-900 border-stone-800 text-stone-100'
                      : 'bg-white border-stone-100 text-stone-800'
                  }`}>
                    {item.name}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Compact Bottom Controls: Theme Toggle & Expand Button */}
        <div className="flex flex-col items-center gap-4 w-full px-2">
          {/* Theme Switcher Compact Button */}
          <button
            onClick={() => updateSettings({ darkMode: !state.settings.darkMode })}
            className={`group relative p-3 rounded-xl transition-all duration-200 cursor-pointer ${
              isDarkMode
                ? 'text-stone-400 hover:text-amber-400 hover:bg-stone-900'
                : 'text-stone-500 hover:text-orange-600 hover:bg-stone-50'
            }`}
          >
            {state.settings.darkMode ? (
              <Sun size={18} className="text-amber-500" />
            ) : (
              <Moon size={18} className="text-stone-500" />
            )}
            <span className={`absolute left-16 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all duration-150 origin-left border text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-50 shadow-xl font-medium ${
              isDarkMode
                ? 'bg-stone-900 border-stone-800 text-stone-100'
                : 'bg-white border-stone-100 text-stone-800'
            }`}>
              {state.settings.darkMode ? 'Light Theme' : 'Dark Theme'}
            </span>
          </button>

          {/* Expand Trigger Button (Do not show contextually in Live Scan to preserve immersive layout) */}
          {true && (
            <button
              onClick={() => setIsCollapsed(false)}
              className={`group relative p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isDarkMode
                  ? 'text-stone-400 hover:text-white hover:bg-stone-900'
                  : 'text-stone-500 hover:text-orange-600 hover:bg-stone-50'
              }`}
              title="Expand Sidebar"
            >
              <ChevronRight size={18} />
              <span className={`absolute left-16 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all duration-150 origin-left border text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-50 shadow-xl font-medium ${
                isDarkMode
                  ? 'bg-stone-900 border-stone-800 text-stone-100'
                  : 'bg-white border-stone-100 text-stone-800'
              }`}>
                Expand Sidebar
              </span>
            </button>
          )}

          {/* Quick home fallback close */}
          {false && (
            <button 
              className="text-stone-500 hover:text-stone-300 cursor-pointer p-2 rounded-lg" 
              onClick={() => navigate('/')}
              title="Exit Live Scan"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Render expanded standard sidebar
  return (
    <aside className={`w-60 h-screen flex flex-col justify-between shrink-0 select-none transition-all duration-300 border-r ${
      isDarkMode
        ? 'bg-stone-950 border-stone-900 text-stone-100'
        : 'bg-white border-orange-100/50 text-stone-800'
    }`}>
      <div className="p-6">
        {/* Branding header inside sidebar */}
        <div
          onClick={() => navigate('/')}
          className={`cursor-pointer mb-8 inline-flex rounded-2xl px-3 py-2 shadow-sm ${
            isDarkMode ? '' : 'bg-stone-950'
          }`}
        >
          <CitrusLogo size={36} showText={true} darkText={false} />
        </div>

        {/* Primary Page List */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            const IconComponent = item.icon;

            return (
              <button
                key={item.path}
                id={`sidebar-item-expanded-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? isDarkMode
                      ? 'bg-amber-600/20 text-orange-400 border border-orange-500/20 shadow-sm font-semibold'
                      : 'bg-orange-100/70 text-amber-950 font-semibold shadow-sm'
                    : isDarkMode
                      ? 'text-stone-400 hover:text-white hover:bg-stone-900'
                      : 'text-stone-500 hover:text-stone-950 hover:bg-stone-50'
                }`}
              >
                <IconComponent
                  size={18}
                  className={`transition-colors ${
                    isActive
                      ? isDarkMode ? 'text-orange-400 stroke-[2.2px]' : 'text-orange-600 stroke-[2.5px]'
                      : 'text-stone-400 stroke-[1.8px]'
                  }`}
                />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Expanded bottom settings row, includes Theme select & Collapse actions */}
      <div className="flex flex-col gap-1.5 p-4 border-t border-stone-100/10">
        {/* Theme Switcher Button */}
        <button
          onClick={() => updateSettings({ darkMode: !state.settings.darkMode })}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
            isDarkMode
              ? 'text-stone-400 hover:text-white hover:bg-stone-900/60'
              : 'text-stone-500 hover:text-stone-950 hover:bg-stone-50'
          }`}
        >
          {state.settings.darkMode ? (
            <>
              <Sun size={18} className="text-amber-500" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={18} className="text-indigo-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Collapse Sidebar Button */}
        <button
          onClick={() => setIsCollapsed(true)}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
            isDarkMode
              ? 'text-stone-400 hover:text-white hover:bg-stone-900/60'
              : 'text-stone-500 hover:text-stone-950 hover:bg-stone-50'
          }`}
        >
          <ChevronLeft size={18} className="text-stone-400" />
          <span>Collapse Sidebar</span>
        </button>

        {/* Corporate footer metadata */}
        <div className="mt-4">
          <div className={`rounded-xl p-3 text-center border ${
            isDarkMode
              ? 'bg-stone-900/40 border-stone-900 text-stone-300'
              : 'bg-stone-50 border-stone-100/70 text-stone-700'
          }`}>
            <p className="text-xs font-semibold font-mono">SYSTEM READY</p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-stone-500 font-medium">Node active (3000)</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};


