const B = 'https://prime-pip-command-center-level.vercel.app';
const g = async (p) => { const t = Date.now(); const r = await fetch(B + p); const j = await r.json().catch(() => null); return { s: r.status, j, ms: Date.now() - t }; };
const now = Date.now(); const age = (t) => t ? `${((now - Date.parse(t)) / 3600000).toFixed(1)}h` : '—';
await g('/api/macro/overview'); // warm
const d = await g('/api/macro/diagnostics');
for (const s of d.j?.sources || []) console.log('SRC', s.status.padEnd(8), age(s.lastSuccess).padStart(7), String(s.itemCount ?? '').padStart(4), s.id.padEnd(22), (s.lastError || '').slice(0, 110));
const keys = Object.keys(d.j || {}).filter((k) => k !== 'sources'); console.log('DIAG keys', keys.join(','));
for (const k of keys) if (typeof d.j[k] !== 'object') console.log('  ', k, d.j[k]); else if (Array.isArray(d.j[k])) console.log('  ', k, 'len', d.j[k].length, JSON.stringify(d.j[k].slice(0, 6)).slice(0, 300)); else console.log('  ', k, JSON.stringify(d.j[k]).slice(0, 300));
const ov = await g('/api/macro/overview');
const assets = ov.j?.data?.assets || ov.j?.assets || [];
console.log('OVERVIEW', ov.s, 'assets', assets.length, 'generatedAt', ov.j?.data?.generatedAt || ov.j?.generatedAt);
for (const a of assets.slice(0, 40)) {
  const comps = a.components || a.drivers || [];
  const stale = comps.filter((c) => c.asOf && (now - Date.parse(c.asOf)) > 120 * 86400000).map((c) => `${c.name || c.id}@${String(c.asOf).slice(0, 10)}`);
  console.log('ASSET', String(a.symbol).padEnd(8), String(a.score ?? a.longTerm ?? '').slice(0, 6).padStart(6), 'conf', a.confidence, 'comps', comps.length, stale.length ? 'OLD: ' + stale.join(', ') : '');
}
const cal = await g('/api/calendar/week');
const ev = cal.j?.events || cal.j?.data || [];
const past = ev.filter((e) => Date.parse(e.date || e.time || e.datetime) < now);
console.log('CAL', cal.s, 'events', ev.length, 'past', past.length, 'past with actual', past.filter((e) => e.actual !== null && e.actual !== undefined && e.actual !== '').length, 'source', cal.j?.source, cal.j?.updatedAt || cal.j?.fetchedAt);
const missing = past.filter((e) => (e.impact === 'High' || e.importance === 3 || e.importance === 'high') && (e.actual === null || e.actual === undefined || e.actual === '')).slice(0, 10);
console.log('CAL high-impact past without actual', missing.length, missing.map((e) => `${e.currency} ${e.title || e.event} ${e.date || e.time}`).join(' | ').slice(0, 600));
console.log('CAL sample', JSON.stringify(ev.slice(0, 2)).slice(0, 500));
const rk = await g('/api/macro/rankings'); console.log('RANK', rk.s, JSON.stringify(rk.j?.data?.longTerm?.bullish?.slice(0, 3)).slice(0, 400));
