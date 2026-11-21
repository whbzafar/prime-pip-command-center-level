import { useEffect, useMemo, useState } from 'react';
import type { Trade } from '../types';
import { computeRiskDna, type Account, type RiskDna } from './riskDna';
import { getBaseline, getHeart, subscribeHeart } from './heartRate';

export function useHeart() {
  const [, bump] = useState(0);
  useEffect(() => subscribeHeart(() => bump((n) => n + 1)), []);
  return getHeart();
}
/** Live risk-DNA state; re-evaluated every 5 s so cooldowns expire on their own. */
export function useRiskDna(trades: Trade[], acct: Account | null | undefined): RiskDna {
  const heart = useHeart();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 5000); return () => window.clearInterval(t); }, []);
  const base = getBaseline();
  return useMemo(() => computeRiskDna(trades, acct || {}, now, heart.bio, base), [trades, acct, now, heart.bio, base]);
}
