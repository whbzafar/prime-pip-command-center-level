import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Archive,
  HardDrive,
  Sparkles,
  ArrowRight,
  Shield,
  Volume2,
  VolumeX,
  Volume1,
  Bell,
  BellOff,
  Radio,
  SlidersHorizontal,
  Play,
  Check,
  ShieldAlert,
  Info,
  Cloud,
  CloudOff,
  FolderCheck,
  RefreshCw,
  LogOut,
  Key,
  Link2,
  Copy,
  Save,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { exportAllData, importAllData } from '../utils/db';
import { BackupData, AccountSettings, Trade, UserAccount } from '../types';
import { exportToExcel, exportToPDF, exportToCSV, exportToZIP } from '../utils/exportCenter';
import {
  getAlertSettings,
  saveAlertSettings,
  playDisciplineAlert,
  AlertSettings,
  AlertSoundType,
  requestNotificationPermission,
} from '../utils/audioAlerts';
import {
  googleDriveService,
  DRIVE_FOLDER_HIERARCHY,
  DriveStatusInfo,
  DriveBackupFile,
} from '../services/googleDriveService';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
  accountsCount: number;
  tradesCount: number;
  activeAccount?: AccountSettings;
  trades?: Trade[];
  initialTab?: 'SOUND' | 'EXPORT' | 'RESTORE' | 'DRIVE';
  currentUser?: UserAccount | null;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  accountsCount,
  tradesCount,
  activeAccount,
  trades = [],
  initialTab = 'SOUND',
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'SOUND' | 'EXPORT' | 'RESTORE' | 'DRIVE'>(initialTab);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync isolated user ID with Google Drive service
  useEffect(() => {
    googleDriveService.setCurrentUserId(currentUser?.id);
    setDriveStatus(googleDriveService.getStatus());
    setCustomClientId(googleDriveService.getClientId());
  }, [currentUser?.id]);

  // Google Drive Integration State
  const [driveStatus, setDriveStatus] = useState<DriveStatusInfo>(() => {
    if (currentUser?.id) {
      googleDriveService.setCurrentUserId(currentUser.id);
    }
    return googleDriveService.getStatus();
  });
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveSyncSuccess, setDriveSyncSuccess] = useState<string | null>(null);
  const [driveSyncError, setDriveSyncError] = useState<string | null>(null);
  const [customClientId, setCustomClientId] = useState(() => googleDriveService.getClientId());
  const [showClientIdInput, setShowClientIdInput] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveBackupFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [restoringFileId, setRestoringFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(() => googleDriveService.isAutoSaveEnabled());

  // Free Cloud Email Vault State (Zero hosting required)
  const [emailVaultAddress, setEmailVaultAddress] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('primepip_cloud_vault_email');
      if (saved) return saved;
    } catch {}
    return (currentUser?.username && currentUser.username.includes('@')) ? currentUser.username : '';
  });
  const [isEmailVaultSaving, setIsEmailVaultSaving] = useState(false);
  const [isEmailVaultRestoring, setIsEmailVaultRestoring] = useState(false);
  const [emailVaultSuccess, setEmailVaultSuccess] = useState<string | null>(null);
  const [emailVaultError, setEmailVaultError] = useState<string | null>(null);
  const [isEmailVaultAutoSync, setIsEmailVaultAutoSync] = useState<boolean>(() => {
    try {
      return localStorage.getItem('primepip_cloud_vault_autosync') === 'true';
    } catch {}
    return false;
  });
  const [emailVaultStatus, setEmailVaultStatus] = useState<{ exists: boolean; savedAt?: string; tradesCount?: number; accountsCount?: number } | null>(null);

  const checkEmailVaultStatus = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) return;
    try {
      const res = await fetch(`/api/cloud-vault/status?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      if (res.ok) {
        const data = await res.json();
        setEmailVaultStatus(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (emailVaultAddress && emailVaultAddress.includes('@')) {
      checkEmailVaultStatus(emailVaultAddress);
    }
  }, [emailVaultAddress, checkEmailVaultStatus]);

  const handleSaveToEmailVault = async () => {
    if (!emailVaultAddress || !emailVaultAddress.includes('@')) {
      setEmailVaultError('Please enter a valid email address to save your cloud vault.');
      return;
    }
    setIsEmailVaultSaving(true);
    setEmailVaultError(null);
    setEmailVaultSuccess(null);
    try {
      localStorage.setItem('primepip_cloud_vault_email', emailVaultAddress.trim().toLowerCase());
      const backupData = await exportAllData(currentUser?.id);
      const res = await fetch('/api/cloud-vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: emailVaultAddress.trim().toLowerCase(),
          data: backupData,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to save cloud vault.');
      }
      setEmailVaultSuccess(`✓ All data backed up to cloud vault for ${emailVaultAddress}! (${json.tradesCount} trades, ${json.accountsCount} accounts)`);
      checkEmailVaultStatus(emailVaultAddress);
      setTimeout(() => setEmailVaultSuccess(null), 5000);
    } catch (err: any) {
      setEmailVaultError(err?.message || 'Failed to save to cloud vault.');
    } finally {
      setIsEmailVaultSaving(false);
    }
  };

  const handleRestoreFromEmailVault = async () => {
    if (!emailVaultAddress || !emailVaultAddress.includes('@')) {
      setEmailVaultError('Please enter a valid email address to restore your cloud vault.');
      return;
    }
    if (!window.confirm(`Restore data from cloud vault for ${emailVaultAddress}? This will restore all your saved accounts, trades, and journal entries.`)) {
      return;
    }
    setIsEmailVaultRestoring(true);
    setEmailVaultError(null);
    setEmailVaultSuccess(null);
    try {
      const res = await fetch(`/api/cloud-vault/load?email=${encodeURIComponent(emailVaultAddress.trim().toLowerCase())}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'No cloud vault found for this email address.');
      }
      await importAllData(json.data, currentUser?.id);
      setEmailVaultSuccess(`✓ Successfully restored ${json.tradesCount} trades and ${json.accountsCount} accounts from Cloud Vault!`);
      if (onDataRestored) onDataRestored();
      setTimeout(() => setEmailVaultSuccess(null), 5000);
    } catch (err: any) {
      setEmailVaultError(err?.message || 'Failed to restore from cloud vault.');
    } finally {
      setIsEmailVaultRestoring(false);
    }
  };

  const handleToggleEmailAutoSync = () => {
    const next = !isEmailVaultAutoSync;
    setIsEmailVaultAutoSync(next);
    try {
      localStorage.setItem('primepip_cloud_vault_autosync', String(next));
    } catch {}
    if (next) {
      setEmailVaultSuccess('Auto-sync enabled: Your trade journal and records will periodically save to your email cloud vault.');
      setTimeout(() => setEmailVaultSuccess(null), 4000);
      if (emailVaultAddress) handleSaveToEmailVault();
    }
  };

  useEffect(() => {
    const unsub = googleDriveService.onStatusChange((newStatus) => {
      setDriveStatus(newStatus);
    });
    return () => unsub();
  }, []);

  const refreshDriveFiles = useCallback(async () => {
    if (driveStatus.state !== 'CONNECTED') return;
    setIsLoadingDriveFiles(true);
    try {
      const files = await googleDriveService.listAllDriveFiles();
      setDriveFiles(files);
    } catch (err: any) {
      console.warn('Failed to list drive files:', err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  }, [driveStatus.state]);

  useEffect(() => {
    if (activeTab === 'DRIVE' && driveStatus.state === 'CONNECTED') {
      refreshDriveFiles();
    }
  }, [activeTab, driveStatus.state, refreshDriveFiles]);

  const handleBackupToDrive = async () => {
    if (driveStatus.state !== 'CONNECTED') {
      googleDriveService.connect();
      return;
    }

    try {
      setIsDriveSyncing(true);
      setDriveSyncError(null);
      setDriveSyncSuccess(null);

      const allData = await exportAllData();
      const result = await googleDriveService.backupCommandCenter(allData);

      if (result.success) {
        setDriveSyncSuccess('Successfully backed up all command center data into your personal Google Drive /Backups folder!');
        refreshDriveFiles();
      } else {
        setDriveSyncError(result.error || 'Failed to complete Google Drive backup');
      }
    } catch (err: any) {
      setDriveSyncError(err.message || 'Error occurred during drive backup');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleDownloadDriveFile = async (file: DriveBackupFile) => {
    setDownloadingFileId(file.id);
    setDriveSyncError(null);
    try {
      const success = await googleDriveService.downloadFile(file.id, file.name);
      if (success) {
        setDriveSyncSuccess(`Downloaded "${file.name}" to your local machine.`);
        setTimeout(() => setDriveSyncSuccess(null), 4000);
      } else {
        setDriveSyncError(`Could not download "${file.name}".`);
      }
    } catch (err: any) {
      setDriveSyncError(err?.message || 'Download failed');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleRestoreFromDrive = async (file: DriveBackupFile) => {
    if (!window.confirm(`Restore data from "${file.name}"? This will update your accounts, trades, and configuration settings.`)) {
      return;
    }
    setRestoringFileId(file.id);
    setDriveSyncError(null);
    setDriveSyncSuccess(null);
    try {
      const content = await googleDriveService.fetchFileContent(file.id);
      if (!content) {
        throw new Error('Could not retrieve file content from Google Drive.');
      }
      const parsedData: BackupData = JSON.parse(content);
      await importAllData(parsedData, currentUser?.id);
      const tradesCount = Array.isArray(parsedData.trades) ? parsedData.trades.length : 0;
      const accountsCount = Array.isArray(parsedData.accounts) ? parsedData.accounts.length : 0;
      setDriveSyncSuccess(`Successfully restored ${tradesCount} trades and ${accountsCount} accounts from Google Drive!`);
      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      setDriveSyncError(err?.message || 'Failed to restore file from Google Drive.');
    } finally {
      setRestoringFileId(null);
    }
  };

  const handleDeleteDriveFile = async (file: DriveBackupFile) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}" from your Google Drive?`)) {
      return;
    }
    setDeletingFileId(file.id);
    setDriveSyncError(null);
    try {
      const ok = await googleDriveService.deleteDriveFile(file.id);
      if (ok) {
        setDriveSyncSuccess(`Deleted "${file.name}" from Google Drive.`);
        refreshDriveFiles();
      } else {
        setDriveSyncError(`Could not delete "${file.name}".`);
      }
    } catch (err: any) {
      setDriveSyncError(err?.message || 'Delete operation failed.');
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleToggleAutoSave = (enabled: boolean) => {
    googleDriveService.setAutoSaveEnabled(enabled);
    setIsAutoSaveEnabled(enabled);
    if (enabled) {
      setDriveSyncSuccess('Automatic background saving to Google Drive is now enabled!');
    } else {
      setDriveSyncSuccess('Automatic background saving to Google Drive is paused.');
    }
    setTimeout(() => setDriveSyncSuccess(null), 3500);
  };

  const handleSaveClientId = () => {
    if (customClientId.trim()) {
      googleDriveService.setClientId(customClientId.trim());
      setShowClientIdInput(false);
      setDriveSyncSuccess('Custom Google OAuth Client ID saved successfully.');
    }
  };

  // Sound Settings State
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => getAlertSettings());
  const [playingTestSound, setPlayingTestSound] = useState<AlertSoundType | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<AlertSettings>;
      if (customEvent.detail) {
        setAlertSettings(customEvent.detail);
      } else {
        setAlertSettings(getAlertSettings());
      }
    };
    window.addEventListener('primepipfx_alert_settings_changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('primepipfx_alert_settings_changed', handleSettingsChanged);
    };
  }, []);

  const handleToggleMasterSound = () => {
    const newSoundEnabled = !alertSettings.soundEnabled;
    const updated = saveAlertSettings({ soundEnabled: newSoundEnabled });
    setAlertSettings(updated);
    if (newSoundEnabled) {
      playDisciplineAlert('CHIME');
    }
  };

  const handleUpdateVolume = (newVol: number) => {
    const updated = saveAlertSettings({ volume: newVol });
    setAlertSettings(updated);
  };

  const handleToggleAlertSetting = (key: keyof AlertSettings) => {
    const updated = saveAlertSettings({ [key]: !alertSettings[key] });
    setAlertSettings(updated);
  };

  const handleTestSound = (type: AlertSoundType) => {
    if (!alertSettings.soundEnabled) {
      const updated = saveAlertSettings({ soundEnabled: true });
      setAlertSettings(updated);
    }
    setPlayingTestSound(type);
    playDisciplineAlert(type);
    setTimeout(() => {
      setPlayingTestSound(null);
    }, 700);
  };

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    setAlertSettings(getAlertSettings());
  };

  if (!isOpen) return null;

  const currentAccount: AccountSettings = activeAccount || {
    id: 'default',
    traderName: 'Prime Trader',
    accountName: 'Trading Account',
    accountType: 'PERSONAL_LIVE',
    broker: 'Live Broker',
    initialBalance: 100000,
    currentBalance: 100000,
    currentEquity: 100000,
    currency: 'USD',
    maxDailyLossPercent: 3,
    maxDrawdownPercent: 6,
    maxDailyTrades: 3,
    maxRiskPerTradePercent: 1,
  };

  const handleExportJSON = async () => {
    try {
      setStatus('PROCESSING');
      setStatusMessage('Compiling full IndexedDB database into offline JSON vault...');

      const data = await exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `primepipfx-database-vault.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('SUCCESS');
      setStatusMessage(`Full database vault downloaded with ${data.accounts.length} accounts and ${data.trades.length} trades.`);
    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setStatusMessage(`Export failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleExportExcel = async () => {
    try {
      setStatus('PROCESSING');
      setStatusMessage('Formatting trade journal, performance KPIs, and strategy matrix into Excel (.xlsx)...');
      await exportToExcel({
        account: currentAccount,
        trades,
        scope: 'ACTIVE_ACCOUNT',
      });
      setStatus('SUCCESS');
      setStatusMessage(`Excel spreadsheet generated successfully with ${trades.length} trades.`);
    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setStatusMessage(`Excel export failed: ${err.message}`);
    }
  };

  const handleExportPDF = () => {
    try {
      setStatus('PROCESSING');
      setStatusMessage('Composing official PDF Trading Performance Audit Report with 12-hour PKT timestamps...');
      exportToPDF({
        account: currentAccount,
        trades,
        scope: 'ACTIVE_ACCOUNT',
      });
      setStatus('SUCCESS');
      setStatusMessage('PDF Performance Audit Report downloaded successfully.');
    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setStatusMessage(`PDF generation failed: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    try {
      setStatus('PROCESSING');
      setStatusMessage('Converting trade journal to standard CSV format...');
      exportToCSV({
        account: currentAccount,
        trades,
        scope: 'ACTIVE_ACCOUNT',
      });
      setStatus('SUCCESS');
      setStatusMessage(`CSV file with ${trades.length} trade records downloaded.`);
    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setStatusMessage(`CSV export failed: ${err.message}`);
    }
  };

  const handleExportZIP = async () => {
    try {
      setStatus('PROCESSING');
      setStatusMessage('Compressing Excel, PDF report, CSV, JSON vault, and trade screenshots into ZIP archive...');
      await exportToZIP({
        account: currentAccount,
        trades,
        scope: 'ACTIVE_ACCOUNT',
      });
      setStatus('SUCCESS');
      setStatusMessage('Complete ZIP archive package compiled and downloaded.');
    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setStatusMessage(`ZIP generation failed: ${err.message}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('PROCESSING');
      setStatusMessage('Reading and verifying backup JSON file integrity...');

      const text = await file.text();
      const parsed: BackupData = JSON.parse(text);

      if (!parsed || !Array.isArray(parsed.accounts)) {
        throw new Error('Invalid file structure. Ensure this is a valid PrimePipFX backup JSON.');
      }

      await importAllData(parsed);

      setStatus('SUCCESS');
      setStatusMessage(`Restored successfully! Loaded ${parsed.accounts.length} accounts and ${parsed.trades?.length || 0} trades into local IndexedDB.`);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onDataRestored();
    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setStatusMessage(`Import failed: ${err.message || 'Malformed JSON file'}`);
    }
  };

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-military font-bold tracking-wide text-slate-100 flex items-center gap-2">
                <span>SYSTEM SETTINGS & DATA CENTER</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono-code">
                GLOBAL SOUND CONTROLS • OFFLINE PERSISTENCE • EXPORT VAULT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-4 sm:px-6 overflow-x-auto no-scrollbar">
          <button
            id="modal-tab-sound"
            onClick={() => {
              setActiveTab('SOUND');
              setStatus('IDLE');
              setStatusMessage('');
            }}
            className={`py-3 px-3 sm:px-4 text-xs font-military font-bold tracking-wider border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'SOUND'
                ? 'border-cyan-400 text-cyan-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {alertSettings.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>SOUND SETTINGS</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono-code font-bold ${
                alertSettings.soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {alertSettings.soundEnabled ? 'ON' : 'MUTED'}
            </span>
          </button>
          <button
            id="modal-tab-export"
            onClick={() => {
              setActiveTab('EXPORT');
              setStatus('IDLE');
              setStatusMessage('');
            }}
            className={`py-3 px-3 sm:px-4 text-xs font-military font-bold tracking-wider border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'EXPORT'
                ? 'border-cyan-400 text-cyan-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT & DOWNLOAD</span>
          </button>
          <button
            id="modal-tab-restore"
            onClick={() => {
              setActiveTab('RESTORE');
              setStatus('IDLE');
              setStatusMessage('');
            }}
            className={`py-3 px-3 sm:px-4 text-xs font-military font-bold tracking-wider border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'RESTORE'
                ? 'border-cyan-400 text-cyan-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>RESTORE VAULT</span>
          </button>
          <button
            id="modal-tab-drive"
            onClick={() => {
              setActiveTab('DRIVE');
              setStatus('IDLE');
              setStatusMessage('');
              setDriveSyncSuccess(null);
              setDriveSyncError(null);
            }}
            className={`py-3 px-3 sm:px-4 text-xs font-military font-bold tracking-wider border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'DRIVE'
                ? 'border-cyan-400 text-cyan-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>GOOGLE DRIVE SYNC</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono-code font-bold ${
                driveStatus.state === 'CONNECTED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {driveStatus.state === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Storage & Global Audio Status Snapshot */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs font-mono-code text-slate-200 block font-semibold">
                  ACTIVE ACCOUNT: {currentAccount.accountName}
                </span>
                <span className="text-[11px] font-mono-code text-slate-400">
                  {trades.length} Account Trades • {accountsCount} Total Accounts in IndexedDB
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="modal-quick-sound-toggle-btn"
                type="button"
                onClick={handleToggleMasterSound}
                title="Toggle Tactical Audio Alerts On/Off"
                className={`flex items-center gap-1.5 text-[11px] font-mono-code px-2.5 py-1 rounded-lg border transition font-bold ${
                  alertSettings.soundEnabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                }`}
              >
                {alertSettings.soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>AUDIO: ON ({Math.round(alertSettings.volume * 100)}%)</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>AUDIO: MUTED</span>
                  </>
                )}
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 text-[11px] font-mono-code bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                <Shield className="w-3 h-3" />
                <span>OFFLINE READY</span>
              </div>
            </div>
          </div>

          {/* Feedback Status Alert */}
          {status !== 'IDLE' && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-mono-code flex items-start gap-2.5 ${
                status === 'SUCCESS'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : status === 'ERROR'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-blue-500/10 border-blue-500/30 text-amber-300'
              }`}
            >
              {status === 'SUCCESS' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : status === 'ERROR' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5 animate-spin" />
              )}
              <div className="flex-1">{statusMessage}</div>
            </div>
          )}

          {/* TAB 0: SOUND SETTINGS */}
          {activeTab === 'SOUND' && (
            <div className="space-y-5">
              {/* Master Global Sound Toggle Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  alertSettings.soundEnabled
                    ? 'bg-slate-950/80 border-blue-500/50 shadow-lg shadow-blue-500/5'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition ${
                        alertSettings.soundEnabled
                          ? 'bg-blue-500/15 border-blue-500/40 text-cyan-400 shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-500'
                      }`}
                    >
                      {alertSettings.soundEnabled ? (
                        <Volume2 className="w-6 h-6 animate-pulse" />
                      ) : (
                        <VolumeX className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-military font-bold text-slate-100 tracking-wide">
                          GLOBAL TACTICAL AUDIO ALERTS
                        </h3>
                        <span
                          className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full border ${
                            alertSettings.soundEnabled
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {alertSettings.soundEnabled ? '● ACTIVE (SOUND ENABLED)' : '○ MUTED (SOUND DISABLED)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-sans leading-relaxed">
                        Master switch controlling all acoustic synthesized warnings, daily limit buzzers, danger sirens, and confirmation chimes across the application.
                      </p>
                    </div>
                  </div>

                  {/* Master Toggle Switch */}
                  <button
                    id="global-sound-toggle-btn"
                    type="button"
                    role="switch"
                    aria-checked={alertSettings.soundEnabled}
                    onClick={handleToggleMasterSound}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                      alertSettings.soundEnabled
                        ? 'bg-blue-500 border-cyan-400'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                        alertSettings.soundEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Master Volume Slider */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs font-mono-code text-slate-300 font-bold">
                      MASTER VOLUME: {Math.round(alertSettings.volume * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-64">
                    <Volume1 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <input
                      id="global-sound-volume-slider"
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={alertSettings.volume}
                      disabled={!alertSettings.soundEnabled}
                      onChange={(e) => handleUpdateVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <button
                      type="button"
                      onClick={() => handleTestSound('CHIME')}
                      disabled={!alertSettings.soundEnabled}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-mono-code text-amber-300 border border-slate-700 shrink-0 transition"
                      title="Test current volume"
                    >
                      TEST
                    </button>
                  </div>
                </div>
              </div>

              {/* Sound Categories Matrix */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono-code text-slate-400 font-semibold tracking-wider">
                    TACTICAL ALERT ACOUSTIC PROFILES & PREVIEWS:
                  </span>
                  {!alertSettings.soundEnabled && (
                    <span className="text-[11px] font-mono-code text-cyan-400/90 italic">
                      (Enable master switch above to activate alarms)
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {/* 1. Daily Trade Limit Reached Alarm */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-military font-bold text-slate-200">
                            DAILY TRADE LIMIT REACHED ALARM
                          </h4>
                          <span className="text-[9px] font-mono-code bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.2 rounded">
                            SAWTOOTH BUZZER (440Hz → 293Hz)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                          Emitted immediately when your daily execution limit (e.g., 2/2 trades) is reached to enforce strict stop rules and halt emotional overtrading.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        id="test-limit-reached-btn"
                        type="button"
                        onClick={() => handleTestSound('LIMIT_REACHED')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono-code flex items-center gap-1.5 transition ${
                          playingTestSound === 'LIMIT_REACHED'
                            ? 'bg-rose-500 text-slate-950 border-rose-400 font-bold animate-pulse'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        <span>PREVIEW</span>
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={alertSettings.tradeLimitAlert}
                        onClick={() => handleToggleAlertSetting('tradeLimitAlert')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                          alertSettings.tradeLimitAlert && alertSettings.soundEnabled
                            ? 'bg-rose-500 border-rose-400'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                            alertSettings.tradeLimitAlert && alertSettings.soundEnabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 2. Capital Protection & Drawdown Siren */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-military font-bold text-slate-200">
                            DRAWDOWN & DAILY LOSS DEFENSE SIREN
                          </h4>
                          <span className="text-[9px] font-mono-code bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.2 rounded">
                            URGENT SIREN
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                          Multi-frequency acoustic alert sounded if daily loss limits or maximum drawdown thresholds are approached.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        id="test-danger-siren-btn"
                        type="button"
                        onClick={() => handleTestSound('DANGER')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono-code flex items-center gap-1.5 transition ${
                          playingTestSound === 'DANGER'
                            ? 'bg-rose-500 text-slate-950 border-rose-400 font-bold animate-pulse'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        <span>PREVIEW</span>
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={alertSettings.drawdownAlert}
                        onClick={() => handleToggleAlertSetting('drawdownAlert')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                          alertSettings.drawdownAlert && alertSettings.soundEnabled
                            ? 'bg-rose-500 border-rose-400'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                            alertSettings.drawdownAlert && alertSettings.soundEnabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 3. Consecutive Loss Caution Tone */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-military font-bold text-slate-200">
                            CONSECUTIVE LOSS CAUTION TONE
                          </h4>
                          <span className="text-[9px] font-mono-code bg-blue-500/10 text-cyan-400 border border-blue-500/20 px-1.5 py-0.2 rounded">
                            SQUARE PULSE (330Hz → 311Hz)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                          Double caution tone after 2+ consecutive losses to cool emotional arousal and prompt immediate cognitive reset.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        id="test-consecutive-loss-btn"
                        type="button"
                        onClick={() => handleTestSound('CONSECUTIVE_LOSS')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono-code flex items-center gap-1.5 transition ${
                          playingTestSound === 'CONSECUTIVE_LOSS'
                            ? 'bg-cyan-400 text-slate-950 border-amber-300 font-bold animate-pulse'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-blue-500/30'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        <span>PREVIEW</span>
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={alertSettings.consecutiveLossAlert}
                        onClick={() => handleToggleAlertSetting('consecutiveLossAlert')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                          alertSettings.consecutiveLossAlert && alertSettings.soundEnabled
                            ? 'bg-blue-500 border-cyan-400'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                            alertSettings.consecutiveLossAlert && alertSettings.soundEnabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 4. Risk Protocol & Overleverage Warning */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-military font-bold text-slate-200">
                            RISK & OVERLEVERAGE WARNING CHIME
                          </h4>
                          <span className="text-[9px] font-mono-code bg-blue-500/10 text-cyan-400 border border-blue-500/20 px-1.5 py-0.2 rounded">
                            TRIANGLE ATTENTION (587Hz → 440Hz)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                          Acoustic prompt emitted when trade lot size exceeds tactical thresholds or risk per trade breaches 1%.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        id="test-warning-btn"
                        type="button"
                        onClick={() => handleTestSound('WARNING')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono-code flex items-center gap-1.5 transition ${
                          playingTestSound === 'WARNING'
                            ? 'bg-cyan-400 text-slate-950 border-amber-300 font-bold animate-pulse'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-blue-500/30'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        <span>PREVIEW</span>
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={alertSettings.riskAlert}
                        onClick={() => handleToggleAlertSetting('riskAlert')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                          alertSettings.riskAlert && alertSettings.soundEnabled
                            ? 'bg-blue-500 border-cyan-400'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                            alertSettings.riskAlert && alertSettings.soundEnabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 5. Positive Discipline & Target Chimes */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-military font-bold text-slate-200">
                            POSITIVE EXECUTION & TARGET CHIMES
                          </h4>
                          <span className="text-[9px] font-mono-code bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                            SINE TRIAD (C5 → E5 → G5)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                          Harmonious triad tones played upon disciplined trade entry, journal logging, and achievement of target milestones.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        id="test-chime-btn"
                        type="button"
                        onClick={() => handleTestSound('CHIME')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono-code flex items-center gap-1.5 transition ${
                          playingTestSound === 'CHIME'
                            ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold animate-pulse'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        <span>PREVIEW</span>
                      </button>
                      <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono-code text-emerald-400 font-semibold">
                        ACTIVE
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Browser Notifications Option */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-military font-bold text-slate-200">
                        DESKTOP SYSTEM NOTIFICATIONS
                      </h4>
                      <span className="text-[9px] font-mono-code uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {permissionStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                      Display OS notifications when risk limits are breached, even if you are viewing other charts or windows.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <button
                    id="request-notification-btn"
                    type="button"
                    onClick={handleRequestNotifications}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 text-xs font-mono-code transition"
                  >
                    {permissionStatus === 'granted' ? 'NOTIFICATIONS ENABLED' : 'ENABLE NOTIFICATIONS'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: EXPORT OPTIONS */}
          {activeTab === 'EXPORT' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-mono-code">
                SELECT EXPORT FORMAT (ALL TIMESTAMPS AUTOMATICALLY CONVERTED TO ASIA/KARACHI 12-HOUR AM/PM):
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Excel Export */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <span className="text-[10px] font-mono-code text-slate-500">.XLSX</span>
                    </div>
                    <h4 className="text-sm font-military font-bold text-slate-200">EXCEL SPREADSHEET</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans">
                      Worksheets with complete trade log, performance KPIs, and strategy matrix.
                    </p>
                  </div>
                  <button
                    id="export-excel-btn"
                    onClick={handleExportExcel}
                    className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono-code font-bold flex items-center justify-center gap-2 border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>DOWNLOAD EXCEL</span>
                  </button>
                </div>

                {/* PDF Audit Report */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <span className="text-[10px] font-mono-code text-slate-500">.PDF</span>
                    </div>
                    <h4 className="text-sm font-military font-bold text-slate-200">PERFORMANCE AUDIT</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans">
                      Formatted official trading audit report with metrics and latest executions.
                    </p>
                  </div>
                  <button
                    id="export-pdf-btn"
                    onClick={handleExportPDF}
                    className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono-code font-bold flex items-center justify-center gap-2 border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>DOWNLOAD PDF</span>
                  </button>
                </div>

                {/* CSV Export */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-5 h-5 text-sky-400" />
                      <span className="text-[10px] font-mono-code text-slate-500">.CSV</span>
                    </div>
                    <h4 className="text-sm font-military font-bold text-slate-200">CSV DATA TABLE</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans">
                      Clean comma-separated values for import into Google Sheets, Notion, or Python.
                    </p>
                  </div>
                  <button
                    id="export-csv-btn"
                    onClick={handleExportCSV}
                    className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono-code font-bold flex items-center justify-center gap-2 border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>DOWNLOAD CSV</span>
                  </button>
                </div>

                {/* Full ZIP Package */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Archive className="w-5 h-5 text-violet-400" />
                      <span className="text-[10px] font-mono-code text-slate-500">.ZIP</span>
                    </div>
                    <h4 className="text-sm font-military font-bold text-slate-200">COMPLETE ARCHIVE</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans">
                      All files combined: XLSX, PDF, CSV, JSON vault, readme manifest, and images.
                    </p>
                  </div>
                  <button
                    id="export-zip-btn"
                    onClick={handleExportZIP}
                    className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono-code font-bold flex items-center justify-center gap-2 border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-violet-400" />
                    <span>DOWNLOAD ZIP</span>
                  </button>
                </div>
              </div>

              {/* Offline JSON Vault Direct Download */}
              <div className="pt-2">
                <button
                  id="export-json-vault-btn"
                  onClick={handleExportJSON}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-amber-300 text-xs font-mono-code font-bold flex items-center justify-center gap-2 transition"
                >
                  <Database className="w-4 h-4" />
                  <span>EXPORT COMPLETE DATABASE VAULT (ALL ACCOUNTS & RULES IN .JSON)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE VAULT */}
          {activeTab === 'RESTORE' && (
            <div className="space-y-4">
              <div className="p-6 border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-xl bg-slate-950/40 text-center transition flex flex-col items-center justify-center">
                <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                <h4 className="text-sm font-military font-bold text-slate-200">
                  IMPORT PRIMPIPFX BACKUP FILE
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Select your previously exported <code className="text-cyan-400 font-mono-code">.json</code> file to restore all accounts, trade journals, and risk protocols.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                  id="restore-file-input"
                />

                <label
                  htmlFor="restore-file-input"
                  className="mt-4 px-5 py-2 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider cursor-pointer transition shadow"
                >
                  SELECT BACKUP JSON
                </label>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono-code text-slate-400 space-y-1">
                <div className="text-slate-300 font-bold">SAFETY PROTOCOL:</div>
                <p>• Restoring merges or updates records without wiping unrelated device caches.</p>
                <p>• Timestamps are preserved accurately in Asia/Karachi (UTC+5).</p>
              </div>
            </div>
          )}

          {/* Tab 4: CLOUD VAULT & GOOGLE DRIVE SYNC */}
          {activeTab === 'DRIVE' && (
            <div className="space-y-5">
              {/* PRIMARY OPTION: Free Cloud Email Vault (Zero Hosting Required) */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/60 to-slate-950 border border-cyan-500/40 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-military font-bold text-cyan-300">
                          FREE CLOUD EMAIL VAULT
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono-code font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          RECOMMENDED • ZERO HOSTING SETUP
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                        Free persistent storage for your journals, trades, and chat history. Simply enter your email to save or restore anytime.
                      </p>
                    </div>
                  </div>

                  {emailVaultStatus?.exists && (
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-emerald-400 font-mono-code font-bold block">
                        ✓ CLOUD VAULT FOUND
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-code">
                        {emailVaultStatus.tradesCount ?? 0} trades • {emailVaultStatus.accountsCount ?? 0} accounts
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-6">
                    <label className="text-[10px] text-slate-400 uppercase font-mono-code block mb-1">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      value={emailVaultAddress}
                      onChange={(e) => setEmailVaultAddress(e.target.value)}
                      placeholder="e.g. trader@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono-code focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-6 flex items-center gap-2 pt-5">
                    <button
                      type="button"
                      disabled={isEmailVaultSaving}
                      onClick={handleSaveToEmailVault}
                      className="flex-1 py-2 px-3 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-military font-bold text-xs tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-cyan-400/20 disabled:opacity-50"
                    >
                      {isEmailVaultSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>SAVE TO CLOUD</span>
                    </button>

                    <button
                      type="button"
                      disabled={isEmailVaultRestoring}
                      onClick={handleRestoreFromEmailVault}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-military font-bold text-xs tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isEmailVaultRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>RESTORE</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80 flex-wrap">
                  <button
                    type="button"
                    onClick={handleToggleEmailAutoSync}
                    className="flex items-center gap-2 text-xs font-mono-code cursor-pointer text-slate-300 hover:text-slate-100"
                  >
                    <div
                      className={`w-8 h-4 rounded-full transition-colors relative ${
                        isEmailVaultAutoSync ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.25 transition-transform ${
                          isEmailVaultAutoSync ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </div>
                    <span>Auto-Sync to Cloud Vault (On Changes)</span>
                  </button>

                  {emailVaultStatus?.savedAt && (
                    <span className="text-[11px] font-mono-code text-slate-500">
                      Last Saved: {new Date(emailVaultStatus.savedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {emailVaultSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono-code text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{emailVaultSuccess}</span>
                  </div>
                )}

                {emailVaultError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-mono-code text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{emailVaultError}</span>
                  </div>
                )}
              </div>

              {/* SECONDARY OPTION: Google Drive Direct Integration */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      driveStatus.state === 'CONNECTED'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {driveStatus.state === 'CONNECTED' ? (
                      <Cloud className="w-6 h-6" />
                    ) : (
                      <CloudOff className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-military font-bold text-slate-100">
                        STUDENT GOOGLE DRIVE STORAGE
                      </h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono-code font-bold ${
                          driveStatus.state === 'CONNECTED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {driveStatus.state === 'CONNECTED' ? 'CONNECTED (OAUTH 2.0)' : 'DISCONNECTED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                      {driveStatus.state === 'CONNECTED' && driveStatus.userEmail
                        ? `Account: ${driveStatus.userName || 'Student'} (${driveStatus.userEmail})`
                        : 'Connect your personal Google Drive to isolate your trading data in your own cloud.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  {driveStatus.state === 'CONNECTED' ? (
                    <button
                      type="button"
                      onClick={() => googleDriveService.disconnect()}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 font-military font-bold text-xs tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>DISCONNECT DRIVE</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => googleDriveService.connect()}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-military font-bold text-xs tracking-wider transition cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>CONNECT GOOGLE DRIVE</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status or Alert messages */}
              {driveSyncSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono-code text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{driveSyncSuccess}</span>
                </div>
              )}
              {driveSyncError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-mono-code text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{driveSyncError}</span>
                </div>
              )}

              {/* Actions & Sync Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* One-Click Backup to Student Drive */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-military font-bold text-cyan-400">
                    <Database className="w-4 h-4" />
                    <span>COMMAND CENTER CLOUD SYNC</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono-code leading-relaxed">
                    Back up all current account profiles, journal entries, diagnostic interrogation audits, and risk configurations directly to your personal Google Drive <code className="text-amber-300 font-bold">/Backups</code> directory.
                  </p>
                  <button
                    type="button"
                    disabled={isDriveSyncing || driveStatus.state !== 'CONNECTED'}
                    onClick={handleBackupToDrive}
                    className={`w-full py-2.5 px-4 rounded-lg font-military font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 ${
                      driveStatus.state !== 'CONNECTED'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : isDriveSyncing
                        ? 'bg-blue-500/20 text-amber-300 border border-blue-500/40 cursor-wait'
                        : 'bg-blue-500 hover:bg-cyan-400 text-slate-950 shadow cursor-pointer'
                    }`}
                  >
                    {isDriveSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>SYNCING DATA TO DRIVE...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4" />
                        <span>BACKUP TO MY GOOGLE DRIVE</span>
                      </>
                    )}
                  </button>
                  {driveStatus.lastBackupTime && (
                    <div className="text-[11px] text-slate-500 font-mono-code text-center">
                      Last backup: {new Date(driveStatus.lastBackupTime).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* OAuth Client ID Settings */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-military font-bold text-sky-400">
                      <Key className="w-4 h-4" />
                      <span>OAUTH CLIENT ID</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowClientIdInput(!showClientIdInput)}
                      className="text-[11px] text-slate-400 hover:text-cyan-400 underline font-mono-code cursor-pointer"
                    >
                      {showClientIdInput ? 'Hide' : 'Configure Client ID'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 font-mono-code leading-relaxed">
                    Uses Google Identity Services (GSI). Administrators or students can specify a custom Google Cloud OAuth 2.0 Web Client ID.
                  </p>
                  {/* Origin Diagnostics for Google OAuth 2.0 Configuration */}
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1.5 text-[11px] font-mono-code">
                    <div className="flex items-center justify-between text-slate-300 font-bold">
                      <span>AUTHORIZED JAVASCRIPT ORIGIN:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(window.location.origin);
                            setDriveSyncSuccess('Origin copied to clipboard! Paste into Google Cloud Console.');
                            setTimeout(() => setDriveSyncSuccess(null), 4000);
                          }
                        }}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 cursor-pointer transition"
                      >
                        <Copy className="w-3 h-3" />
                        <span>COPY ORIGIN</span>
                      </button>
                    </div>
                    <div className="p-1.5 rounded bg-slate-950 text-amber-300 font-bold break-all select-all">
                      {typeof window !== 'undefined' ? window.location.origin : 'Current Web Origin'}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      To resolve <strong>"Access Blocked: Authorization Error"</strong>, add this exact URL to <em>Authorized JavaScript origins</em> in Google Cloud Console.
                    </p>
                  </div>
                </div>
              </div>

              {/* Automatic Cloud Sync Configuration */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-military font-bold text-emerald-400">
                    <Cloud className="w-4 h-4" />
                    <span>AUTOMATIC BACKGROUND SYNC TO GOOGLE DRIVE</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAutoSave(!isAutoSaveEnabled)}
                    disabled={driveStatus.state !== 'CONNECTED'}
                    className={`px-3 py-1 rounded-full text-xs font-mono-code font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      isAutoSaveEnabled && driveStatus.state === 'CONNECTED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isAutoSaveEnabled && driveStatus.state === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{isAutoSaveEnabled && driveStatus.state === 'CONNECTED' ? 'AUTO-SAVE ACTIVE' : 'AUTO-SAVE OFF'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 font-mono-code leading-relaxed">
                  When active, changes to trade records, risk profiles, and accounts are automatically synchronized to your personal Google Drive <code className="text-emerald-300 font-bold">PFX Command Center/Backups</code> directory without requiring manual backup.
                </p>
              </div>

              {/* Stored Cloud Files & Direct Download Manager */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-military font-bold text-cyan-400">
                    <Archive className="w-4 h-4" />
                    <span>STORED GOOGLE DRIVE FILES ({driveFiles.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={refreshDriveFiles}
                      disabled={isLoadingDriveFiles || driveStatus.state !== 'CONNECTED'}
                      className="flex items-center gap-1 text-[11px] font-mono-code text-slate-400 hover:text-cyan-400 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingDriveFiles ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>REFRESH LIST</span>
                    </button>
                  </div>
                </div>

                {driveStatus.state !== 'CONNECTED' ? (
                  <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 text-center text-xs font-mono-code text-slate-500">
                    Connect your Google Account above to view, download, and restore your stored cloud data.
                  </div>
                ) : isLoadingDriveFiles ? (
                  <div className="p-6 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center gap-2 text-xs font-mono-code text-cyan-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Fetching stored files from your Google Drive...</span>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="p-5 rounded-lg bg-slate-950/80 border border-slate-800 text-center space-y-1">
                    <p className="text-xs font-mono-code text-slate-400">
                      No backup files found in your Google Drive <code className="text-emerald-300">PFX Command Center</code> yet.
                    </p>
                    <p className="text-[11px] font-mono-code text-slate-500">
                      Click "BACKUP TO MY GOOGLE DRIVE" above to save your first snapshot, or enable Auto-Save.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {driveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-mono-code font-bold text-slate-200 truncate flex items-center gap-2">
                              <span className="truncate">{file.name}</span>
                              {file.name.includes('AutoSave') && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                                  AUTO-SAVE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono-code text-slate-400 flex items-center gap-3 mt-0.5">
                              <span>{file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Dynamic Size'}</span>
                              {file.createdTime && (
                                <span>{new Date(file.createdTime).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={downloadingFileId === file.id}
                            onClick={() => handleDownloadDriveFile(file)}
                            title="Download file to your local computer"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 text-xs font-mono-code transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {downloadingFileId === file.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>DOWNLOAD</span>
                          </button>

                          {file.name.endsWith('.json') && (
                            <button
                              type="button"
                              disabled={restoringFileId === file.id}
                              onClick={() => handleRestoreFromDrive(file)}
                              title="Restore this backup into the application"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono-code transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {restoringFileId === file.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              <span>RESTORE</span>
                            </button>
                          )}

                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Open directly in Google Drive"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={deletingFileId === file.id}
                            onClick={() => handleDeleteDriveFile(file)}
                            title="Delete from Google Drive"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition cursor-pointer disabled:opacity-50"
                          >
                            {deletingFileId === file.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 9 Isolated Folder Hierarchy Visualizer */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-military font-bold text-emerald-400">
                  <div className="flex items-center gap-2">
                    <FolderCheck className="w-4 h-4" />
                    <span>ISOLATED DRIVE FOLDER HIERARCHY (PFX COMMAND CENTER)</span>
                  </div>
                  <span className="font-mono-code text-[11px] text-slate-400">
                    9 DEDICATED CATEGORIES
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono-code">
                  Each student's Google Drive automatically organizes artifacts into dedicated subfolders inside the root <code className="text-emerald-400 font-bold">PFX Command Center</code> directory:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DRIVE_FOLDER_HIERARCHY.map((folder) => (
                    <div
                      key={folder}
                      className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs font-mono-code text-slate-300"
                    >
                      <FolderCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{folder}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy & Safety Protocol */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono-code text-slate-400 space-y-1">
                <div className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>STUDENT PRIVACY & ISOLATION GUARANTEE:</span>
                </div>
                <p>• Only files created by PFX Command Center are accessed using the narrow <code className="text-slate-300">drive.file</code> scope.</p>
                <p>• Your personal Google Drive cannot be accessed by other students or external servers.</p>
                <p>• Data backups are client-to-cloud direct encrypted transmissions.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono-code text-slate-500 shrink-0">
          <span className="text-[11px] sm:text-xs">TIMEZONE: Asia/Karachi (PKT UTC+5)</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-xs font-bold"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
