/**
 * Issue #1 — Pakistan Standard Time daily trade limit helpers for UI components.
 * Hard max of 2 trades per Asia/Karachi calendar day (configurable via account.maxDailyTrades).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentPakistanDate,
  getKarachiTime24,
  countTradesForPakistanDate,
  normalizeTradeDateToPakistan,
  isPakistanDailyTradeLimitReached,
} from '../utils/time';

export interface TradeDateLike {
  date?: string;
}

export function usePakistanClock() {
  const [date, setDate] = useState(() => getCurrentPakistanDate());
  const [time, setTime] = useState(() => getKarachiTime24());

  const refresh = useCallback(() => {
    setDate(getCurrentPakistanDate());
    setTime(getKarachiTime24());
  }, []);

  useEffect(() => {
    refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { date, setDate, time, setTime, refresh };
}

export function useDailyTradeLimit(
  existingTrades: TradeDateLike[] | null | undefined,
  formDate: string | undefined,
  maxDailyTrades: number = 2
) {
  const limit = maxDailyTrades > 0 ? maxDailyTrades : 2;
  const tradeEntryDate = normalizeTradeDateToPakistan(formDate || getCurrentPakistanDate());
  const todayTradesCount = countTradesForPakistanDate(existingTrades, tradeEntryDate);
  const isDailyLimitReached = isPakistanDailyTradeLimitReached(existingTrades, limit, tradeEntryDate);

  const assertCanSave = (): { ok: true; date: string } | { ok: false; error: string } => {
    const saveDate = normalizeTradeDateToPakistan(formDate || getCurrentPakistanDate());
    const currentCount = countTradesForPakistanDate(existingTrades, saveDate);
    if (currentCount >= limit) {
      return {
        ok: false,
        error: `Daily trade limit reached (${currentCount}/${limit}) for ${saveDate} PKT. Maximum ${limit} trades per Pakistan calendar day. The limit resets at 00:00 PKT.`,
      };
    }
    return { ok: true, date: saveDate };
  };

  return {
    tradeEntryDate,
    maxDailyTrades: limit,
    todayTradesCount,
    isDailyLimitReached,
    assertCanSave,
    normalizeDate: normalizeTradeDateToPakistan,
  };
}
