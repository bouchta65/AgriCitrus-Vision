import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, RecentScan, FruitReportItem, AppConfig, AppSettings, ScanReport, AuthUser, UserRole } from '../types';

interface AppContextProps {
  state: AppState;
  updateConfig: (config: Partial<AppConfig>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  startNewScan: (navigateFn: () => void) => void;
  triggerSync: () => void;
  capturePhoto: (file: File, navigateFn: () => void) => void;
  cancelAnalysis: (navigateFn: () => void) => void;
  deleteScanReport: (id: string) => void;
  login: (role: UserRole, email: string) => void;
  logout: () => void;
}

const defaultRecentScans: RecentScan[] = [
  { id: 'SCAN_09042', timestamp: '2026-06-21 14:32', detectedCount: 48, acceptedCount: 40, rejectedCount: 8, status: 'COMPLETED' }
];

const defaultScannedFruits: FruitReportItem[] = [
  { id: '#001', diameter: 52, status: 'Healthy', decision: 'Accept', passCount: 45, failCount: 3, statusLabel: 'ACCEPT' },
  { id: '#002', diameter: 48, status: 'Too Small', decision: 'Reject', passCount: 10, failCount: 1, statusLabel: 'REJECT' },
  { id: '#003', diameter: 54, status: 'Black Spot', decision: 'Infected', passCount: 1, failCount: 1, statusLabel: 'REJECT' }
];

const AppContext = createContext<AppContextProps | undefined>(undefined);
const makeScanId = () => `SCAN_0${Math.floor(10000 + Math.random() * 90000)}`;
const asTimestamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
const readFileDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Could not read image'));
  reader.readAsDataURL(file);
});

const offlineItems = (minDiameter: number): FruitReportItem[] => {
  const diameters = [minDiameter + 7, minDiameter - 8, minDiameter + 3];
  return diameters.map((diameter, index) => {
    const healthy = index === 0;
    const small = diameter < minDiameter;
    return {
      id: `#${String(index + 1).padStart(3, '0')}`,
      bbox: [40 + index * 90, 55 + index * 35, 130 + index * 90, 145 + index * 35],
      diameter,
      status: small ? 'Too Small' : healthy ? 'Healthy' : 'Black Spot',
      decision: small ? 'Reject' : healthy ? 'Accept' : 'Infected',
      passCount: healthy ? 1 : 0,
      failCount: healthy ? 0 : 1,
      statusLabel: healthy ? 'ACCEPT' : 'REJECT',
    };
  });
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('agricitrus_auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [recentScans, setRecentScans] = useState<RecentScan[]>(defaultRecentScans);
  const [scanReports, setScanReports] = useState<ScanReport[]>([]);
  const [config, setConfig] = useState<AppConfig>({ yoloConfidence: 0.35, minDiameter: 35, resnetConfidence: 0.92, maxFlexPixelFactor: 0.30, exportFormat: 'PDF Report' });
  const [settings, setSettings] = useState<AppSettings>({
    accountName: 'Hamaina Admin',
    accountEmail: 'hamaina30@gmail.com',
    accountAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200',
    emailAlerts: true,
    scanCompletionAlerts: true,
    errorAlerts: false,
    darkMode: false,
    modelVersion: 'YOLOv8s + ResNet50-CV fold_4 best',
    apiEndpoint: '/api',
    storageLocation: 'SQLite Backend + Offline Preview'
  });
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisPhase, setAnalysisPhase] = useState<AppState['analysisPhase']>('idle');
  const [detectedFruitsCount, setDetectedFruitsCount] = useState<number>(0);
  const [scannedFruits, setScannedFruits] = useState<FruitReportItem[]>(defaultScannedFruits);
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [syncTrigger, setSyncTrigger] = useState<number>(0);

  const apiBase = () => settings.apiEndpoint.trim().replace(/\/+$/, '') || '/api';
  const updateConfig = (newConfig: Partial<AppConfig>) => setConfig((prev) => ({ ...prev, ...newConfig }));
  const updateSettings = (newSettings: Partial<AppSettings>) => setSettings((prev) => ({ ...prev, ...newSettings }));
  const triggerSync = () => setSyncTrigger((prev) => prev + 1);

  useEffect(() => {
    if (!authUser) return;
    fetch(`${apiBase()}/reports`)
      .then((response) => (response.ok ? response.json() : []))
      .then((reports: ScanReport[]) => setScanReports(reports))
      .catch(() => undefined);
  }, [authUser, settings.apiEndpoint, syncTrigger]);

  const login = (role: UserRole, email: string) => {
    const user = { role, email, name: role === 'admin' ? 'Hamaina Admin' : 'Citrus Technician' };
    localStorage.setItem('agricitrus_auth', JSON.stringify(user));
    setAuthUser(user);
    updateSettings({ accountName: user.name, accountEmail: user.email });
  };

  const logout = () => {
    localStorage.removeItem('agricitrus_auth');
    setAuthUser(null);
  };

  const completeScan = (id: string, imageName: string, imageUrl: string, items: FruitReportItem[], source: 'backend' | 'offline', model?: Record<string, unknown>) => {
    const acceptedCount = items.filter((fruit) => fruit.statusLabel === 'ACCEPT').length;
    const timestamp = asTimestamp();
    const report = { id, timestamp, imageName, annotatedImage: imageUrl, items, source, model };
    setScannedFruits(items);
    setDetectedFruitsCount(items.length);
    setAnnotatedImage(imageUrl);
    setScanReports((prev) => [report, ...prev]);
    setRecentScans((prev) => [{ id, timestamp, detectedCount: items.length, acceptedCount, rejectedCount: items.length - acceptedCount, status: 'COMPLETED' }, ...prev]);
    setAnalysisProgress(100);
    setAnalysisPhase('completed');
    fetch(`${apiBase()}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    }).catch(() => undefined);
  };

  const startNewScan = (navigateFn: () => void) => {
    setCurrentScanId(makeScanId());
    setAnalysisProgress(0);
    setAnalysisPhase('idle');
    setDetectedFruitsCount(0);
    setAnnotatedImage(null);
    setAnalysisError(null);
    navigateFn();
  };

  const capturePhoto = async (file: File, navigateFn: () => void) => {
    const id = makeScanId();
    setCurrentScanId(id);
    setAnalysisProgress(0);
    setAnalysisPhase('preprocessing');
    setAnalysisError(null);
    navigateFn();

    const originalImage = await readFileDataUrl(file);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('pixel_to_mm', String(config.maxFlexPixelFactor));
      formData.append('min_diameter_mm', String(config.minDiameter));
      formData.append('yolo_conf', String(config.yoloConfidence));
      formData.append('resnet_conf', String(config.resnetConfidence));

      setAnalysisProgress(25);
      setAnalysisPhase('detecting');
      const response = await fetch(`${apiBase()}/analyze`, { method: 'POST', body: formData });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Backend failed (${response.status}): ${details || response.statusText}`);
      }

      setAnalysisProgress(75);
      setAnalysisPhase('classifying');
      const data = await response.json();
      completeScan(id, file.name, data.annotatedImage || originalImage, data.items || [], 'backend', data.models);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setAnalysisError(`${message}. Using browser preview mode. Check API endpoint: /api`);
      setAnalysisProgress(75);
      setAnalysisPhase('classifying');
      setTimeout(() => completeScan(id, file.name, originalImage, offlineItems(config.minDiameter), 'offline'), 450);
    }
  };

  const cancelAnalysis = (navigateFn: () => void) => {
    setAnalysisProgress(0);
    setAnalysisPhase('idle');
    navigateFn();
  };

  const deleteScanReport = (id: string) => {
    setScanReports((prev) => prev.filter((report) => report.id !== id));
    setRecentScans((prev) => prev.filter((scan) => scan.id !== id));
    fetch(`${apiBase()}/reports/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined);
    if (currentScanId === id) {
      setCurrentScanId(null);
      setAnnotatedImage(null);
      setScannedFruits(defaultScannedFruits);
      setDetectedFruitsCount(0);
    }
  };

  return (
    <AppContext.Provider value={{
      state: { authUser, recentScans, scanReports, config, settings, currentScanId, analysisProgress, analysisPhase, detectedFruitsCount, scannedFruits, annotatedImage, analysisError },
      updateConfig,
      updateSettings,
      startNewScan,
      triggerSync,
      capturePhoto,
      cancelAnalysis,
      deleteScanReport,
      login,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
