import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';

export interface SignalItem {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  timeframe?: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  recommendedRiskPercent?: number;
  strategyNotes?: string;
  status: 'ACTIVE' | 'TP_HIT' | 'SL_HIT' | 'BREAK_EVEN' | 'DEACTIVATE_LEVEL' | 'FINISHED' | 'CLOSED';
  closeReason?: 'TP_HIT' | 'SL_HIT' | 'BREAK_EVEN' | 'DEACTIVATE_LEVEL' | 'MANUAL_CLOSE';
  closedPrice?: number;
  pipsGained?: number;
  resultPips?: number;
  resultPercent?: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  author: string;
  imageUrl?: string;
  imageName?: string;
  imageMimeType?: string;
}

export interface InAppAnnouncement {
  id: string;
  sender: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'SIGNAL_ALERT' | 'MARKET_UPDATE' | 'IMPORTANT_ANNOUNCEMENT';
  signalId?: string;
}

const SIGNALS_FILE = 'signals_store.json';
const ANNOUNCEMENTS_FILE = 'announcements_store.json';

interface SignalsStoreData {
  activeSignals: SignalItem[];
  closedSignals: SignalItem[];
}

export function getStoredSignals(): SignalsStoreData {
  return safeReadJsonFile<SignalsStoreData>(SIGNALS_FILE, {
    activeSignals: [],
    closedSignals: [],
  });
}

export function saveStoredSignals(data: SignalsStoreData): void {
  safeWriteJsonFile(SIGNALS_FILE, data);
}

export function createSignal(signalData: Partial<SignalItem>): SignalItem {
  const store = getStoredSignals();
  const now = new Date();
  // Format Pakistan Standard Time (PKT UTC+5)
  const pktTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now) + ' PKT';

  const newSignal: SignalItem = {
    id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    pair: String(signalData.pair || 'EUR/USD').toUpperCase().trim(),
    direction: signalData.direction === 'SELL' ? 'SELL' : 'BUY',
    timeframe: signalData.timeframe || 'M15 / H1',
    entryPrice: Number(signalData.entryPrice) || 0,
    stopLoss: Number(signalData.stopLoss) || 0,
    takeProfit1: Number(signalData.takeProfit1) || 0,
    takeProfit2: signalData.takeProfit2 ? Number(signalData.takeProfit2) : undefined,
    takeProfit3: signalData.takeProfit3 ? Number(signalData.takeProfit3) : undefined,
    recommendedRiskPercent: Number(signalData.recommendedRiskPercent) || 1.0,
    strategyNotes: signalData.strategyNotes || '',
    imageUrl: signalData.imageUrl,
    imageName: signalData.imageName,
    imageMimeType: signalData.imageMimeType,
    status: 'ACTIVE',
    createdAt: pktTimeStr,
    updatedAt: pktTimeStr,
    author: signalData.author || 'Admin / Chief Analyst',
  };

  store.activeSignals.unshift(newSignal);
  saveStoredSignals(store);
  return newSignal;
}

export function updateSignalStatus(
  id: string,
  newStatus: 'TP_HIT' | 'SL_HIT' | 'BREAK_EVEN' | 'DEACTIVATE_LEVEL' | 'FINISHED' | 'CLOSED',
  details?: {
    closedPrice?: number;
    resultPips?: number;
    resultPercent?: number;
    closeReason?: 'TP_HIT' | 'SL_HIT' | 'BREAK_EVEN' | 'DEACTIVATE_LEVEL' | 'MANUAL_CLOSE';
    notes?: string;
  }
): SignalItem | null {
  const store = getStoredSignals();
  const index = store.activeSignals.findIndex((s) => s.id === id);

  if (index === -1) {
    // Might already be closed
    const closedIndex = store.closedSignals.findIndex((s) => s.id === id);
    if (closedIndex !== -1) {
      return store.closedSignals[closedIndex];
    }
    return null;
  }

  const [signal] = store.activeSignals.splice(index, 1);
  const now = new Date();
  const pktTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now) + ' PKT';

  signal.status = newStatus;
  signal.closeReason = details?.closeReason || (newStatus === 'TP_HIT' ? 'TP_HIT' : newStatus === 'SL_HIT' ? 'SL_HIT' : newStatus === 'DEACTIVATE_LEVEL' ? 'DEACTIVATE_LEVEL' : 'BREAK_EVEN');
  signal.closedPrice = details?.closedPrice ?? (newStatus === 'TP_HIT' ? signal.takeProfit1 : newStatus === 'SL_HIT' ? signal.stopLoss : signal.entryPrice);
  signal.closedAt = pktTimeStr;
  signal.updatedAt = pktTimeStr;
  
  if (details?.resultPips !== undefined) {
    signal.resultPips = details.resultPips;
  } else {
    // Calculate pips automatically (accurate across Forex standard, JPY, and Gold)
    const isGold = signal.pair.includes('XAU') || signal.pair.includes('GOLD');
    const isJpy = signal.pair.includes('JPY');
    const pipMultiplier = isGold ? 10 : isJpy ? 100 : 10000;
    const diff = (signal.closedPrice - signal.entryPrice) * (signal.direction === 'BUY' ? 1 : -1);
    signal.resultPips = newStatus === 'DEACTIVATE_LEVEL' ? 0 : Math.round(diff * pipMultiplier);
  }

  if (details?.resultPercent !== undefined) {
    signal.resultPercent = details.resultPercent;
  } else {
    signal.resultPercent = newStatus === 'TP_HIT' ? 2.0 : newStatus === 'SL_HIT' ? -1.0 : 0.0;
  }

  if (details?.notes) {
    signal.strategyNotes = `${signal.strategyNotes ? signal.strategyNotes + ' | ' : ''}${details.notes}`;
  }

  store.closedSignals.unshift(signal);
  saveStoredSignals(store);
  return signal;
}

export function deleteSignal(id: string): boolean {
  const store = getStoredSignals();
  const initialActive = store.activeSignals.length;
  const initialClosed = store.closedSignals.length;
  store.activeSignals = store.activeSignals.filter((s) => s.id !== id);
  store.closedSignals = store.closedSignals.filter((s) => s.id !== id);
  const modified = store.activeSignals.length !== initialActive || store.closedSignals.length !== initialClosed;
  if (modified) saveStoredSignals(store);
  return modified;
}

export function resetAllSignals(): void {
  saveStoredSignals({ activeSignals: [], closedSignals: [] });
}

export function getStoredAnnouncements(): InAppAnnouncement[] {
  return safeReadJsonFile<InAppAnnouncement[]>(ANNOUNCEMENTS_FILE, []);
}

export function createAnnouncement(data: Partial<InAppAnnouncement>): InAppAnnouncement {
  const list = getStoredAnnouncements();
  const now = new Date();
  const pktTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now) + ' PKT';

  const newAnn: InAppAnnouncement = {
    id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sender: data.sender || 'Admin / Owner',
    title: data.title || 'Official Announcement',
    message: data.message || '',
    timestamp: pktTimeStr,
    category: data.category || 'IMPORTANT_ANNOUNCEMENT',
    signalId: data.signalId,
  };

  list.unshift(newAnn);
  safeWriteJsonFile(ANNOUNCEMENTS_FILE, list);
  return newAnn;
}

export function deleteAnnouncement(id: string): boolean {
  const list = getStoredAnnouncements();
  const filtered = list.filter((a) => a.id !== id);
  if (filtered.length !== list.length) {
    safeWriteJsonFile(ANNOUNCEMENTS_FILE, filtered);
    return true;
  }
  return false;
}
