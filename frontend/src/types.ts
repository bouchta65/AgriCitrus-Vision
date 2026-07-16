export interface RecentScan {
  id: string;
  timestamp: string;
  detectedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING';
}

export interface FruitReportItem {
  id: string;
  bbox?: number[];
  diameter: number;
  status?: string;
  decision: 'Accept' | 'Reject' | 'Infected';
  passCount: number;
  failCount: number;
  statusLabel: 'ACCEPT' | 'REJECT';
  yolo_confidence?: number;
  resnet?: {
    label: string;
    confidence: number;
  } | null;
}

export interface ScanReport {
  id: string;
  timestamp: string;
  imageName: string;
  annotatedImage: string;
  items: FruitReportItem[];
  source: 'backend' | 'offline';
  model?: Record<string, unknown>;
}

export type UserRole = 'admin' | 'technician';

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
}

export interface AppConfig {
  yoloConfidence: number;
  minDiameter: number;
  resnetConfidence: number;
  maxFlexPixelFactor: number;
  exportFormat: string;
}

export interface AppSettings {
  accountName: string;
  accountEmail: string;
  accountAvatar: string;
  emailAlerts: boolean;
  scanCompletionAlerts: boolean;
  errorAlerts: boolean;
  darkMode: boolean;
  modelVersion: string;
  apiEndpoint: string;
  storageLocation: string;
}

export interface AppState {
  authUser: AuthUser | null;
  recentScans: RecentScan[];
  scanReports: ScanReport[];
  config: AppConfig;
  settings: AppSettings;
  currentScanId: string | null;
  analysisProgress: number;
  analysisPhase: 'idle' | 'preprocessing' | 'detecting' | 'calculating' | 'classifying' | 'completed';
  detectedFruitsCount: number;
  scannedFruits: FruitReportItem[];
  annotatedImage: string | null;
  analysisError: string | null;
}
