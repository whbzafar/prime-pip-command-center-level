import { AccountSettings, Trade, TradingRule, TradingGoal, BackupData } from '../types';
import { getStoredUser } from './authClient';

const DB_NAME = 'PrimePipFX_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getEffectiveUserId(): string {
  try {
    const user = getStoredUser();
    if (user && user.id) return user.id;
  } catch {}
  return 'demo-user';
}

export function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('trades')) {
        const tradeStore = db.createObjectStore('trades', { keyPath: 'id' });
        tradeStore.createIndex('accountId', 'accountId', { unique: false });
        tradeStore.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains('rules')) {
        const ruleStore = db.createObjectStore('rules', { keyPath: 'id' });
        ruleStore.createIndex('accountId', 'accountId', { unique: false });
      }

      if (!db.objectStoreNames.contains('goals')) {
        const goalStore = db.createObjectStore('goals', { keyPath: 'id' });
        goalStore.createIndex('accountId', 'accountId', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

// ----------------------------------------------------
// ACCOUNTS API (Isolated by userId)
// ----------------------------------------------------
export async function getAllAccounts(specificUserId?: string): Promise<AccountSettings[]> {
  const currentUserId = specificUserId || getEffectiveUserId();
  try {
    const db = await getDB();
    const all = await new Promise<AccountSettings[]>((resolve, reject) => {
      const tx = db.transaction('accounts', 'readonly');
      const store = tx.objectStore('accounts');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    // Enforce data isolation: return only accounts belonging to this specific user
    const filtered = all.filter((a) => {
      const accountOwner = a.userId || 'demo-user';
      return accountOwner === currentUserId;
    });

    if (filtered.length > 0) {
      return filtered;
    }
  } catch (e) {
    console.warn('IDB fallback to localStorage for accounts', e);
  }

  // LocalStorage fallback namespaced by userId
  try {
    const ls = localStorage.getItem(`primepipfx_accounts_${currentUserId}`);
    if (ls) {
      return JSON.parse(ls);
    }
    // Check legacy non-namespaced fallback only if demo-user
    if (currentUserId === 'demo-user') {
      const legacy = localStorage.getItem('primepipfx_accounts');
      return legacy ? JSON.parse(legacy) : [];
    }
  } catch {}
  return [];
}

export async function saveAccount(account: AccountSettings, specificUserId?: string): Promise<void> {
  const currentUserId = specificUserId || account.userId || getEffectiveUserId();
  const isolatedAccount: AccountSettings = {
    ...account,
    userId: currentUserId,
  };

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('accounts', 'readwrite');
      const store = tx.objectStore('accounts');
      const req = store.put(isolatedAccount);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IDB saveAccount failed, using localStorage fallback', e);
  }

  // Also sync user-isolated localStorage mirror
  try {
    const lsKey = `primepipfx_accounts_${currentUserId}`;
    const existing = JSON.parse(localStorage.getItem(lsKey) || '[]');
    const filtered = existing.filter((a: AccountSettings) => a.id !== isolatedAccount.id);
    localStorage.setItem(lsKey, JSON.stringify([...filtered, isolatedAccount]));
  } catch {}
}

export async function deleteAccount(id: string, specificUserId?: string): Promise<void> {
  const currentUserId = specificUserId || getEffectiveUserId();
  try {
    const db = await getDB();
    const tx = db.transaction(['accounts', 'trades', 'rules', 'goals'], 'readwrite');
    tx.objectStore('accounts').delete(id);

    // Delete associated trades for this account and user
    const tradeStore = tx.objectStore('trades');
    const tradeIndex = tradeStore.index('accountId');
    const req = tradeIndex.getAll(id);
    req.onsuccess = () => {
      for (const trade of req.result || []) {
        if (!trade.userId || trade.userId === currentUserId) {
          tradeStore.delete(trade.id);
        }
      }
    };
  } catch (e) {
    console.warn('IDB deleteAccount failed', e);
  }
  try {
    const lsKey = `primepipfx_accounts_${currentUserId}`;
    const existing = JSON.parse(localStorage.getItem(lsKey) || '[]');
    localStorage.setItem(
      lsKey,
      JSON.stringify(existing.filter((a: AccountSettings) => a.id !== id))
    );
  } catch {}
}

// ----------------------------------------------------
// TRADES API (Isolated by userId & accountId)
// ----------------------------------------------------
export async function getTradesForAccount(accountId: string, specificUserId?: string): Promise<Trade[]> {
  const currentUserId = specificUserId || getEffectiveUserId();
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readonly');
      const store = tx.objectStore('trades');
      const index = store.index('accountId');
      const req = index.getAll(accountId);
      req.onsuccess = () => {
        const results: Trade[] = req.result || [];
        // Strict data isolation: Customer A cannot see Customer B trades
        const isolatedTrades = results.filter((t) => {
          const tradeOwner = t.userId || 'demo-user';
          return tradeOwner === currentUserId;
        });
        resolve(isolatedTrades);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IDB getTrades fallback', e);
    const ls = localStorage.getItem(`primepipfx_trades_${currentUserId}_${accountId}`);
    if (ls) return JSON.parse(ls);
    if (currentUserId === 'demo-user') {
      const legacy = localStorage.getItem(`primepipfx_trades_${accountId}`);
      return legacy ? JSON.parse(legacy) : [];
    }
    return [];
  }
}

export async function getAllTrades(specificUserId?: string): Promise<Trade[]> {
  const currentUserId = specificUserId || getEffectiveUserId();
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readonly');
      const store = tx.objectStore('trades');
      const req = store.getAll();
      req.onsuccess = () => {
        const results: Trade[] = req.result || [];
        // Strict data isolation
        const isolatedTrades = results.filter((t) => {
          const tradeOwner = t.userId || 'demo-user';
          return tradeOwner === currentUserId;
        });
        resolve(isolatedTrades);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IDB getAllTrades fallback', e);
    return [];
  }
}

export async function saveTrade(trade: Trade, specificUserId?: string): Promise<void> {
  const currentUserId = specificUserId || trade.userId || getEffectiveUserId();
  const isolatedTrade: Trade = {
    ...trade,
    userId: currentUserId,
  };

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('trades', 'readwrite');
      const store = tx.objectStore('trades');
      const req = store.put(isolatedTrade);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IDB saveTrade failed', e);
  }

  if (isolatedTrade.accountId) {
    try {
      const lsKey = `primepipfx_trades_${currentUserId}_${isolatedTrade.accountId}`;
      const existing = JSON.parse(localStorage.getItem(lsKey) || '[]');
      const filtered = existing.filter((t: Trade) => t.id !== isolatedTrade.id);
      localStorage.setItem(lsKey, JSON.stringify([...filtered, isolatedTrade]));
    } catch {}
  }
}

export async function deleteTrade(id: string, accountId?: string, specificUserId?: string): Promise<void> {
  const currentUserId = specificUserId || getEffectiveUserId();
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('trades', 'readwrite');
      const store = tx.objectStore('trades');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IDB deleteTrade failed', e);
  }
  if (accountId) {
    try {
      const lsKey = `primepipfx_trades_${currentUserId}_${accountId}`;
      const existing = JSON.parse(localStorage.getItem(lsKey) || '[]');
      localStorage.setItem(
        lsKey,
        JSON.stringify(existing.filter((t: Trade) => t.id !== id))
      );
    } catch {}
  }
}

// ----------------------------------------------------
// RULES API (Isolated by userId & accountId)
// ----------------------------------------------------
export async function getRulesForAccount(accountId: string, specificUserId?: string): Promise<TradingRule[]> {
  const currentUserId = specificUserId || getEffectiveUserId();
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('rules', 'readonly');
      const store = tx.objectStore('rules');
      const index = store.index('accountId');
      const req = index.getAll(accountId);
      req.onsuccess = () => {
        const res: TradingRule[] = req.result || [];
        const isolatedRules = res.filter((r) => {
          const ruleOwner = r.userId || 'demo-user';
          return ruleOwner === currentUserId;
        });
        resolve(isolatedRules);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    const ls = localStorage.getItem(`primepipfx_rules_${currentUserId}_${accountId}`);
    if (ls) return JSON.parse(ls);
    if (currentUserId === 'demo-user') {
      const legacy = localStorage.getItem(`primepipfx_rules_${accountId}`);
      return legacy ? JSON.parse(legacy) : [];
    }
    return [];
  }
}

export async function saveRulesForAccount(accountId: string, rules: TradingRule[], specificUserId?: string): Promise<void> {
  const currentUserId = specificUserId || getEffectiveUserId();
  const isolatedRules = rules.map((r) => ({
    ...r,
    accountId,
    userId: currentUserId,
  }));

  try {
    const db = await getDB();
    const tx = db.transaction('rules', 'readwrite');
    const store = tx.objectStore('rules');
    const index = store.index('accountId');
    const req = index.getAll(accountId);

    req.onsuccess = () => {
      const existing: TradingRule[] = req.result || [];
      for (const r of existing) {
        if (!r.userId || r.userId === currentUserId) {
          store.delete(r.id);
        }
      }
      for (const r of isolatedRules) {
        store.put(r);
      }
    };
  } catch (e) {
    console.warn('IDB saveRules failed', e);
  }
  try {
    localStorage.setItem(`primepipfx_rules_${currentUserId}_${accountId}`, JSON.stringify(isolatedRules));
  } catch {}
}

// ----------------------------------------------------
// GOALS API (Isolated by userId & accountId)
// ----------------------------------------------------
export async function getGoalsForAccount(accountId: string, specificUserId?: string): Promise<TradingGoal[]> {
  const currentUserId = specificUserId || getEffectiveUserId();
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('goals', 'readonly');
      const store = tx.objectStore('goals');
      const index = store.index('accountId');
      const req = index.getAll(accountId);
      req.onsuccess = () => {
        const res: TradingGoal[] = req.result || [];
        const isolatedGoals = res.filter((g) => {
          const goalOwner = g.userId || 'demo-user';
          return goalOwner === currentUserId;
        });
        resolve(isolatedGoals);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    const ls = localStorage.getItem(`primepipfx_goals_${currentUserId}_${accountId}`);
    if (ls) return JSON.parse(ls);
    if (currentUserId === 'demo-user') {
      const legacy = localStorage.getItem(`primepipfx_goals_${accountId}`);
      return legacy ? JSON.parse(legacy) : [];
    }
    return [];
  }
}

export async function saveGoalsForAccount(accountId: string, goals: TradingGoal[], specificUserId?: string): Promise<void> {
  const currentUserId = specificUserId || getEffectiveUserId();
  const isolatedGoals = goals.map((g) => ({
    ...g,
    accountId,
    userId: currentUserId,
  }));

  try {
    const db = await getDB();
    const tx = db.transaction('goals', 'readwrite');
    const store = tx.objectStore('goals');
    const index = store.index('accountId');
    const req = index.getAll(accountId);

    req.onsuccess = () => {
      const existing: TradingGoal[] = req.result || [];
      for (const g of existing) {
        if (!g.userId || g.userId === currentUserId) {
          store.delete(g.id);
        }
      }
      for (const g of isolatedGoals) {
        store.put(g);
      }
    };
  } catch (e) {
    console.warn('IDB saveGoals failed', e);
  }
  try {
    localStorage.setItem(`primepipfx_goals_${currentUserId}_${accountId}`, JSON.stringify(isolatedGoals));
  } catch {}
}

// ----------------------------------------------------
// SETTINGS API (Isolated by userId)
// ----------------------------------------------------
export async function getSetting<T>(key: string, fallback: T, specificUserId?: string): Promise<T> {
  const currentUserId = specificUserId || getEffectiveUserId();
  const isolatedKey = `${key}_${currentUserId}`;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(isolatedKey);
      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          const ls = localStorage.getItem(`primepipfx_setting_${isolatedKey}`);
          resolve(ls ? JSON.parse(ls) : fallback);
        }
      };
      req.onerror = () => {
        const ls = localStorage.getItem(`primepipfx_setting_${isolatedKey}`);
        resolve(ls ? JSON.parse(ls) : fallback);
      };
    });
  } catch {
    const ls = localStorage.getItem(`primepipfx_setting_${isolatedKey}`);
    return ls ? JSON.parse(ls) : fallback;
  }
}

export async function setSetting<T>(key: string, value: T, specificUserId?: string): Promise<void> {
  const currentUserId = specificUserId || getEffectiveUserId();
  const isolatedKey = `${key}_${currentUserId}`;
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key: isolatedKey, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
  try {
    localStorage.setItem(`primepipfx_setting_${isolatedKey}`, JSON.stringify(value));
  } catch {}
}

// ----------------------------------------------------
// EXPORT & IMPORT BACKUP (OFFLINE JSON BACKUP)
// ----------------------------------------------------
export async function exportAllData(specificUserId?: string): Promise<BackupData> {
  const currentUserId = specificUserId || getEffectiveUserId();
  const accounts = await getAllAccounts(currentUserId);
  const trades = await getAllTrades(currentUserId);
  const activeAccountId = await getSetting<string>('activeAccountId', accounts[0]?.id || '', currentUserId);

  let rules: TradingRule[] = [];
  let goals: TradingGoal[] = [];

  for (const acc of accounts) {
    const accRules = await getRulesForAccount(acc.id, currentUserId);
    rules.push(...accRules);
    const accGoals = await getGoalsForAccount(acc.id, currentUserId);
    goals.push(...accGoals);
  }

  const backup: BackupData = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    timezone: 'Asia/Karachi (UTC+5)',
    accounts,
    activeAccountId,
    trades,
    rules,
    goals,
  };

  return backup;
}

export async function importAllData(backup: BackupData, specificUserId?: string): Promise<void> {
  if (!backup || !Array.isArray(backup.accounts)) {
    throw new Error('Invalid backup file format. Expected valid PrimePipFX backup data.');
  }

  const currentUserId = specificUserId || getEffectiveUserId();

  // Restore accounts stamped with current user ID
  for (const acc of backup.accounts) {
    await saveAccount({ ...acc, userId: currentUserId }, currentUserId);
  }

  // Restore trades stamped with current user ID
  if (Array.isArray(backup.trades)) {
    for (const t of backup.trades) {
      await saveTrade({ ...t, userId: currentUserId }, currentUserId);
    }
  }

  // Restore rules
  if (Array.isArray(backup.rules)) {
    for (const r of backup.rules) {
      if (r.accountId) {
        await saveRulesForAccount(r.accountId, [r], currentUserId);
      }
    }
  }

  // Restore goals
  if (Array.isArray(backup.goals)) {
    for (const g of backup.goals) {
      if (g.accountId) {
        await saveGoalsForAccount(g.accountId, [g], currentUserId);
      }
    }
  }

  if (backup.activeAccountId) {
    await setSetting('activeAccountId', backup.activeAccountId, currentUserId);
  }
}

// ----------------------------------------------------
// SERVER CLOUD SYNC HELPERS (Isolated per userId)
// ----------------------------------------------------
export async function syncUserDataFromServer(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/customer/data', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.ok && json.data) {
      const { accounts, trades, rules, goals } = json.data;
      const user = getStoredUser();
      const userId = user?.id || 'demo-user';

      if (Array.isArray(accounts) && accounts.length > 0) {
        for (const acc of accounts) {
          await saveAccount({ ...acc, userId }, userId);
        }
      }
      if (Array.isArray(trades) && trades.length > 0) {
        for (const tr of trades) {
          await saveTrade({ ...tr, userId }, userId);
        }
      }
      if (Array.isArray(rules) && rules.length > 0) {
        for (const r of rules) {
          if (r.accountId) await saveRulesForAccount(r.accountId, [{ ...r, userId }], userId);
        }
      }
      if (Array.isArray(goals) && goals.length > 0) {
        for (const g of goals) {
          if (g.accountId) await saveGoalsForAccount(g.accountId, [{ ...g, userId }], userId);
        }
      }
      return true;
    }
  } catch (err) {
    console.warn('Sync from server error:', err);
  }
  return false;
}

export async function syncUserDataToServer(token: string): Promise<boolean> {
  try {
    const user = getStoredUser();
    if (!user || user.role === 'DEVELOPER') return false;
    const accounts = await getAllAccounts(user.id);
    const trades = await getAllTrades(user.id);

    let allRules: TradingRule[] = [];
    let allGoals: TradingGoal[] = [];
    for (const acc of accounts) {
      const r = await getRulesForAccount(acc.id, user.id);
      allRules.push(...r);
      const g = await getGoalsForAccount(acc.id, user.id);
      allGoals.push(...g);
    }

    const data = {
      accounts,
      trades,
      rules: allRules,
      goals: allGoals,
    };

    const res = await fetch('/api/customer/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Sync to server error:', err);
    return false;
  }
}

// ----------------------------------------------------
// ATOMIC TRADINGVIEW SCREENSHOT-TO-JOURNAL PERSISTENCE
// ----------------------------------------------------
let clientTradeSaveMutex: Promise<any> = Promise.resolve();

function withClientTradeLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = clientTradeSaveMutex.then(fn, fn);
  clientTradeSaveMutex = next.catch(() => {});
  return next;
}

function generateClientUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function allocateNextUniqueTradeId(
  accountId: string,
  specificUserId?: string
): Promise<{ tradeId: string; tradeNumber: number; dbUuid: string }> {
  const currentUserId = specificUserId || getEffectiveUserId();
  const allUserTrades = await getAllTrades(currentUserId);
  const accountTrades = allUserTrades.filter((t) => t.accountId === accountId);

  const seqKey = `primepipfx_trade_seq_${currentUserId}`;
  let storedSeq = 109;
  try {
    const rawSeq = localStorage.getItem(seqKey);
    if (rawSeq) {
      const parsed = parseInt(rawSeq, 10);
      if (Number.isFinite(parsed) && parsed > storedSeq) {
        storedSeq = parsed;
      }
    }
  } catch {}

  const existingIds = new Set<string>();
  for (const t of allUserTrades) {
    if (t && typeof t.id === 'string') {
      existingIds.add(t.id.trim().toUpperCase());
      const m = t.id.trim().match(/^TRD-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > storedSeq) {
          storedSeq = n;
        }
      }
    }
  }

  let nextNum = Math.max(110, storedSeq + 1);
  let candidateId = `TRD-${nextNum}`;
  while (existingIds.has(candidateId.toUpperCase())) {
    nextNum++;
    candidateId = `TRD-${nextNum}`;
  }

  try {
    localStorage.setItem(seqKey, String(nextNum));
  } catch {}

  return {
    tradeId: candidateId,
    tradeNumber: accountTrades.length + 1,
    dbUuid: generateClientUuid(),
  };
}

export async function saveScreenshotTradeGuaranteed(
  tradePayload: Trade,
  options?: {
    accountId?: string;
    allowDuplicateOverride?: boolean;
    token?: string | null;
    canPersistToServer?: boolean;
  }
): Promise<{
  ok: boolean;
  saved: boolean;
  duplicate?: boolean;
  existingTradeId?: string;
  error?: string;
  trade?: Trade;
}> {
  return withClientTradeLock(async () => {
    const currentUserId = tradePayload.userId || getEffectiveUserId();
    const accountId = options?.accountId || tradePayload.accountId || 'acc-default';
    const allowDuplicateOverride = Boolean(options?.allowDuplicateOverride);

    // 1. Inspect existing trades in IndexedDB to prevent duplicate imports & never overwrite existing IDs
    const existingTrades = await getAllTrades(currentUserId);

    if (!allowDuplicateOverride) {
      for (const existing of existingTrades) {
        if (!existing) continue;
        if (
          tradePayload.idempotencyKey &&
          existing.idempotencyKey &&
          existing.idempotencyKey === tradePayload.idempotencyKey
        ) {
          return {
            ok: false,
            saved: false,
            duplicate: true,
            existingTradeId: existing.id,
            error: `This screenshot was already imported as Trade ${existing.id}.`,
          };
        }

        if (
          tradePayload.screenshotHash &&
          existing.screenshotHash &&
          existing.screenshotHash === tradePayload.screenshotHash &&
          (existing.accountId || accountId) === accountId &&
          existing.instrument === tradePayload.instrument &&
          existing.direction === tradePayload.direction &&
          Number(existing.entryPrice) === Number(tradePayload.entryPrice) &&
          Number(existing.stopLoss) === Number(tradePayload.stopLoss)
        ) {
          return {
            ok: false,
            saved: false,
            duplicate: true,
            existingTradeId: existing.id,
            error: `Duplicate screenshot import detected: an identical ${tradePayload.instrument} ${tradePayload.direction} setup from this screenshot is already saved as ${existing.id}.`,
          };
        }
      }
    }

    let finalizedTrade: Trade = {
      ...tradePayload,
      userId: currentUserId,
      accountId,
    };

    // 2. If authenticated with server persistence rights, commit atomically to server DB first
    if (options?.token && options?.canPersistToServer) {
      try {
        const res = await fetch('/api/journal/save-screenshot-trade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.token}`,
          },
          body: JSON.stringify({
            accountId,
            trade: finalizedTrade,
            allowDuplicateOverride,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok || !data.saved || !data.trade) {
          return {
            ok: false,
            saved: false,
            duplicate: Boolean(data.duplicate),
            existingTradeId: data.existingTradeId,
            error: data.error || 'Server database rejected or failed to confirm trade save.',
          };
        }
        finalizedTrade = {
          ...finalizedTrade,
          ...data.trade,
          userId: currentUserId,
          accountId,
        };
      } catch (err: any) {
        return {
          ok: false,
          saved: false,
          error: err?.message || 'Network error while confirming trade save with database.',
        };
      }
    } else {
      // Allocate guaranteed-unique TRD-xxx ID locally
      const allocated = await allocateNextUniqueTradeId(accountId, currentUserId);
      finalizedTrade = {
        ...finalizedTrade,
        id: allocated.tradeId,
        tradeNumber: allocated.tradeNumber,
        dbUuid: allocated.dbUuid,
        journalCreatedAt: finalizedTrade.journalCreatedAt || new Date().toISOString(),
      };
    }

    // 3. Strictly insert into IndexedDB without overwriting any existing record, waiting for transaction commit
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('trades', 'readwrite');
        const store = tx.objectStore('trades');

        // Verify the ID does not already exist so we never silently overwrite an existing journal record
        const checkReq = store.get(finalizedTrade.id);
        checkReq.onsuccess = () => {
          if (checkReq.result) {
            // Allocate a fresh non-colliding ID if key already exists in IDB
            const fallbackId = `${finalizedTrade.id}-${ String(Date.now()).slice(-3) }`;
            finalizedTrade = { ...finalizedTrade, id: fallbackId };
          }
          const addReq = store.add(finalizedTrade);
          addReq.onerror = () => reject(addReq.error || new Error('IndexedDB failed to insert new trade record.'));
        };
        checkReq.onerror = () => reject(checkReq.error);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
      });
    } catch (idbErr: any) {
      return {
        ok: false,
        saved: false,
        error: idbErr?.message || 'Local database failed to confirm trade persistence.',
      };
    }

    // 4. Mirror to localStorage backup without overwriting other records
    try {
      const lsKey = `primepipfx_trades_${currentUserId}_${accountId}`;
      const existing: Trade[] = JSON.parse(localStorage.getItem(lsKey) || '[]');
      const withoutSameId = existing.filter((t) => t.id !== finalizedTrade.id);
      localStorage.setItem(lsKey, JSON.stringify([finalizedTrade, ...withoutSameId]));
    } catch {}

    return {
      ok: true,
      saved: true,
      trade: finalizedTrade,
    };
  });
}

