import React, { useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AppRoutes } from './routes';

const AppContent: React.FC = () => {
  const { state } = useApp();
  const isDarkMode = state.settings.darkMode;

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  if (!state.authUser) return <AppRoutes />;

  return (
    <div className={`flex w-screen h-screen overflow-hidden transition-colors duration-300 ${
      isDarkMode ? 'bg-stone-950 text-stone-100 dark' : 'bg-stone-55/30 text-stone-900'
    }`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header />
        <main className={`flex-1 min-h-0 flex flex-col relative transition-colors duration-300 ${isDarkMode ? 'bg-stone-950' : 'bg-stone-50/20'}`}>
          <AppRoutes />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}
