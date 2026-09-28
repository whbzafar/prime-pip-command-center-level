import { SignalItem } from '../types';

export interface InAppAnnouncement {
  id: string;
  sender: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'SIGNAL_ALERT' | 'MARKET_UPDATE' | 'IMPORTANT_ANNOUNCEMENT';
  signalId?: string;
}

const STORAGE_ACTIVE_SIGNALS = 'primepipfx_active_signals_v3';
const STORAGE_CLOSED_SIGNALS = 'primepipfx_closed_signals_v3';
const STORAGE_ANNOUNCEMENTS = 'primepipfx_announcements_v3';

export async function fetchSignalsFromServer(): Promise<{ activeSignals: SignalItem[]; closedSignals: SignalItem[] }> {
  try {
    const res = await fetch('/api/signals');
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        const active = Array.isArray(data.activeSignals) ? data.activeSignals : [];
        const closed = Array.isArray(data.closedSignals) ? data.closedSignals : [];
        try {
          localStorage.setItem(STORAGE_ACTIVE_SIGNALS, JSON.stringify(active));
          localStorage.setItem(STORAGE_CLOSED_SIGNALS, JSON.stringify(closed));
        } catch {}
        return { activeSignals: active, closedSignals: closed };
      }
    }
  } catch (err) {
    console.warn('[SIGNALS] Fetch failed, using local cache:', err);
  }

  // Fallback to local storage
  try {
    const cachedActive = localStorage.getItem(STORAGE_ACTIVE_SIGNALS);
    const cachedClosed = localStorage.getItem(STORAGE_CLOSED_SIGNALS);
    return {
      activeSignals: cachedActive ? JSON.parse(cachedActive) : [],
      closedSignals: cachedClosed ? JSON.parse(cachedClosed) : [],
    };
  } catch {
    return { activeSignals: [], closedSignals: [] };
  }
}

export async function createSignalServer(signalData: {
  pair: string;
  direction: 'BUY' | 'SELL';
  timeframe?: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  strategyNotes?: string;
  recommendedRiskPercent?: number;
}): Promise<SignalItem> {
  try {
    const res = await fetch('/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signalData),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.signal) {
        return data.signal;
      }
    }
  } catch (err) {
    console.warn('[SIGNALS] Server create failed, saving locally:', err);
  }

  // Local fallback
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

  const newSignal: SignalItem = {
    id: `sig_local_${Date.now()}`,
    pair: signalData.pair.toUpperCase().trim(),
    direction: signalData.direction,
    timeframe: signalData.timeframe || 'H1',
    entryPrice: signalData.entryPrice,
    stopLoss: signalData.stopLoss,
    takeProfit1: signalData.takeProfit1,
    takeProfit2: signalData.takeProfit2,
    takeProfit3: signalData.takeProfit3,
    strategyNotes: signalData.strategyNotes || '',
    recommendedRiskPercent: signalData.recommendedRiskPercent || 1.0,
    status: 'ACTIVE',
    createdAt: pktTimeStr,
    updatedAt: pktTimeStr,
    author: 'Admin / Chief Analyst',
  };

  try {
    const cached = localStorage.getItem(STORAGE_ACTIVE_SIGNALS);
    const list: SignalItem[] = cached ? JSON.parse(cached) : [];
    list.unshift(newSignal);
    localStorage.setItem(STORAGE_ACTIVE_SIGNALS, JSON.stringify(list));
  } catch {}

  return newSignal;
}

export async function updateSignalStatusServer(
  id: string,
  status: 'TP_HIT' | 'SL_HIT' | 'BREAK_EVEN' | 'FINISHED' | 'CLOSED',
  details?: {
    closedPrice?: number;
    resultPips?: number;
    resultPercent?: number;
    closeReason?: 'TP_HIT' | 'SL_HIT' | 'BREAK_EVEN' | 'MANUAL_CLOSE';
    notes?: string;
  }
): Promise<SignalItem | null> {
  try {
    const res = await fetch(`/api/signals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...details }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.signal) {
        return data.signal;
      }
    }
  } catch (err) {
    console.warn('[SIGNALS] Server update failed, applying locally:', err);
  }

  // Local fallback
  try {
    const cachedActive = localStorage.getItem(STORAGE_ACTIVE_SIGNALS);
    const cachedClosed = localStorage.getItem(STORAGE_CLOSED_SIGNALS);
    let activeList: SignalItem[] = cachedActive ? JSON.parse(cachedActive) : [];
    let closedList: SignalItem[] = cachedClosed ? JSON.parse(cachedClosed) : [];

    const found = activeList.find((s) => s.id === id);
    if (found) {
      activeList = activeList.filter((s) => s.id !== id);
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

      found.status = (status === 'TP_HIT' ? 'HIT_TP' : status === 'SL_HIT' ? 'HIT_SL' : status === 'BREAK_EVEN' ? 'BREAK_EVEN' : status) as any;
      found.closeReason = details?.closeReason || (status === 'TP_HIT' ? 'TP_HIT' : status === 'SL_HIT' ? 'SL_HIT' : 'BREAK_EVEN');
      found.closedPrice = details?.closedPrice ?? (status === 'TP_HIT' ? found.takeProfit1 : status === 'SL_HIT' ? found.stopLoss : found.entryPrice);
      found.closedAt = pktTimeStr;
      found.updatedAt = pktTimeStr;
      found.resultPercent = details?.resultPercent ?? (status === 'TP_HIT' ? 2.0 : status === 'SL_HIT' ? -1.0 : 0.0);
      if (details?.notes) found.strategyNotes = `${found.strategyNotes ? found.strategyNotes + ' | ' : ''}${details.notes}`;

      closedList.unshift(found);
      localStorage.setItem(STORAGE_ACTIVE_SIGNALS, JSON.stringify(activeList));
      localStorage.setItem(STORAGE_CLOSED_SIGNALS, JSON.stringify(closedList));
      return found;
    }
  } catch {}

  return null;
}

export async function fetchAnnouncementsServer(): Promise<InAppAnnouncement[]> {
  try {
    const res = await fetch('/api/announcements');
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.announcements)) {
        try {
          localStorage.setItem(STORAGE_ANNOUNCEMENTS, JSON.stringify(data.announcements));
        } catch {}
        return data.announcements;
      }
    }
  } catch (err) {
    console.warn('[ANNOUNCEMENTS] Fetch failed, using local cache:', err);
  }

  try {
    const cached = localStorage.getItem(STORAGE_ANNOUNCEMENTS);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

export async function postAnnouncementServer(data: {
  title: string;
  message: string;
  category?: 'SIGNAL_ALERT' | 'MARKET_UPDATE' | 'IMPORTANT_ANNOUNCEMENT';
  signalId?: string;
  sender?: string;
}): Promise<InAppAnnouncement> {
  try {
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const resData = await res.json();
      if (resData.ok && resData.announcement) {
        return resData.announcement;
      }
    }
  } catch (err) {
    console.warn('[ANNOUNCEMENTS] Post failed, saving locally:', err);
  }

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
    id: `ann_local_${Date.now()}`,
    sender: data.sender || 'Admin / Owner',
    title: data.title || 'Official Announcement',
    message: data.message,
    timestamp: pktTimeStr,
    category: data.category || 'IMPORTANT_ANNOUNCEMENT',
    signalId: data.signalId,
  };

  try {
    const cached = localStorage.getItem(STORAGE_ANNOUNCEMENTS);
    const list: InAppAnnouncement[] = cached ? JSON.parse(cached) : [];
    list.unshift(newAnn);
    localStorage.setItem(STORAGE_ANNOUNCEMENTS, JSON.stringify(list));
  } catch {}

  return newAnn;
}
