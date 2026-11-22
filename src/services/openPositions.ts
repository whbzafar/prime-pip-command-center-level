/** Open journal trades, mirrored from the app so alert code can tell when you are already in a pair. */
import type { Trade } from '../types';

let open: Array<{ key: string; side: 1 | -1; display: string }> = [];
const norm = (s: string) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/USDT$/, 'USD');

export function setOpenTrades(trades: Trade[] | undefined | null) {
  open = (trades || []).filter((t) => t.status === 'OPEN').map((t) => ({ key: norm(t.instrument), side: t.direction === 'BUY' ? 1 : -1, display: String(t.instrument) }));
}

/** What a new level alert means for a trader who may already hold that pair. */
export function alertContext(symbol: string, side: 1 | -1, display: string): null | { kind: 'same' | 'opposite'; title: string; text: string } {
  const mine = open.filter((o) => o.key === norm(symbol));
  if (!mine.length) return null;
  if (mine.some((o) => o.side === side)) return { kind: 'same', title: `You're already in ${display}`, text: `A ${side > 0 ? 'buy' : 'sell'} level was reached, but you already have an open ${side > 0 ? 'buy' : 'sell'} on ${display}. Treat this as confirmation, not a new entry — adding more doubles your risk.` };
  return { kind: 'opposite', title: `Signal against your open ${display} trade`, text: `A ${side > 0 ? 'buy' : 'sell'} level was reached while you hold a ${side > 0 ? 'sell' : 'buy'} on ${display}. Review your stop and plan; do not flip impulsively.` };
}
