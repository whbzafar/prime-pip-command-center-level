import React, { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';

/**
 * Background watcher: checks the Quant Edge setup every 15 minutes while the app is open and alerts
 * (in-app toast + system notification when allowed) the moment a market gets a new buy/sell signal.
 */
const KEY = 'ppfx_quantedge_watch_v1';
const WORDS: Record<string, string> = { BUY_NEXT_OPEN: 'BUY signal', SELL_NEXT_OPEN: 'SELL signal', LONG: 'entered a BUY', SHORT: 'entered a SELL' };
export interface EdgeAlert { id: string; symbol: string; text: string }

export function diffSignals(prev: Record<string, string>, rows: Array<{ symbol: string; status: string; watch: string; label?: string }>): EdgeAlert[] {
  const out: EdgeAlert[] = [];
  for (const r of rows) {
    const was = prev[r.symbol];
    if (!r.status || was === undefined || was === r.status) continue;
    const isNewTrade = (r.status === 'BUY_NEXT_OPEN' || r.status === 'SELL_NEXT_OPEN') || ((r.status === 'LONG' || r.status === 'SHORT') && !['BUY_NEXT_OPEN', 'SELL_NEXT_OPEN'].includes(was));
    if (isNewTrade) out.push({ id: `${r.symbol}-${r.status}-${Date.now()}`, symbol: r.symbol, text: `${r.label || r.symbol}: Quant Edge ${WORDS[r.status]}. ${r.watch}` });
    else if ((was === 'LONG' || was === 'SHORT') && r.status === 'FLAT') out.push({ id: `${r.symbol}-exit-${Date.now()}`, symbol: r.symbol, text: `${r.label || r.symbol}: the Quant Edge trade has closed.` });
  }
  return out;
}

export const QuantEdgeWatcher: React.FC<{ onOpen?: () => void }> = ({ onOpen }) => {
  const [alerts, setAlerts] = useState<EdgeAlert[]>([]);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const j = await fetch('/api/quant-edge').then((r) => r.json()).catch(() => null);
      if (!alive || !j?.ok) return;
      let prev: Record<string, string> = {};
      try { prev = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* ignore */ }
      const rows = (j.rows || []).filter((r: any) => !r.error);
      const fresh = diffSignals(prev, rows);
      try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(rows.map((r: any) => [r.symbol, r.status])))); } catch { /* ignore */ }
      if (!fresh.length) return;
      setAlerts((a) => [...fresh, ...a].slice(0, 4));
      try {
        if ('Notification' in window && Notification.permission === 'granted') for (const f of fresh) new Notification('Prime Pip Quant Edge', { body: f.text, tag: f.symbol });
      } catch { /* notifications optional */ }
    };
    const first = window.setTimeout(check, 20_000);
    const t = window.setInterval(check, 15 * 60_000);
    return () => { alive = false; window.clearTimeout(first); window.clearInterval(t); };
  }, []);
  if (!alerts.length) return null;
  return (
    <div className="fixed top-20 right-3 z-[2147483200] w-[min(380px,92vw)] space-y-2" data-testid="quant-edge-alerts">
      {alerts.map((a) => (
        <div key={a.id} className="rounded-xl border border-cyan-400/50 shadow-2xl p-3 flex gap-2" style={{ backgroundColor: '#04121c' }}>
          <BellRing className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
          <button type="button" onClick={() => { onOpen?.(); setAlerts((x) => x.filter((y) => y.id !== a.id)); }} className="text-left text-xs text-cyan-50 flex-1 cursor-pointer">{a.text}</button>
          <button type="button" onClick={() => setAlerts((x) => x.filter((y) => y.id !== a.id))} className="text-slate-400 hover:text-white cursor-pointer" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
};
