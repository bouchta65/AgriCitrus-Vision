import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Analysis } from './pages/Analysis';
import { Reports } from './pages/Reports';
import { Configuration } from './pages/Configuration';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { useApp } from './context/AppContext';
import { UserRole } from './types';

const Protected: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { state } = useApp();
  if (!state.authUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(state.authUser.role)) return <Navigate to="/analysis" replace />;
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/analysis" element={<Protected><Analysis /></Protected>} />
      <Route path="/reports" element={<Protected roles={["admin"]}><Reports /></Protected>} />
      <Route path="/configuration" element={<Protected roles={["admin"]}><Configuration /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
