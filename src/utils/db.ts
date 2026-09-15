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
