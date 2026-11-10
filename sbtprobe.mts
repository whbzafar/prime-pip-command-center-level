// Live-data check for the level scanner: are the newest closed H1 candles really current?
const S = await import(process.cwd() + '/server/sbt/sbtScanner.ts');
const F = await import(process.cwd() + '/src/components/chartAnalysis/fullHistoryDatafeed.ts');
const bar = S.currentBar();
console.log('now', new Date().toISOString(), 'bar', new Date(bar).toISOString());
for (const sym of ['EURUSD', 'GBPJPY', 'XAUUSD', 'USOIL', 'US500', 'NAS100', 'BTCUSDT']) {
  const e = F.CATALOG.find((c: any) => c.ticker === sym);
  if (!e) { console.log('DATA', sym, 'not in catalog'); continue; }
  const t0 = Date.now();
  try {
    const [h, d, w] = await Promise.all([S.loadBars(e, 'h1', bar, 2500), S.loadBars(e, 'd1', bar, 600).catch(() => []), S.loadBars(e, 'w1', bar, 300).catch(() => [])]);
    const last = h[h.length - 1];
    console.log('DATA', sym, 'h1', h.length, 'last', last ? new Date(last.time).toISOString() : '-', 'gapH', last ? ((bar - 3600000 - last.time) / 3600000).toFixed(1) : '-', 'close', last?.close, 'd1', d.length, d.length ? new Date(d[d.length - 1].time).toISOString().slice(0, 10) : '', 'w1', w.length, (Date.now() - t0) + 'ms');
  } catch (err: any) { console.log('DATA', sym, 'ERR', err?.message); }
}
const r = await S.scanSymbol('EURUSD');
console.log('SCAN without key →', r.ok ? 'ok?!' : r.code);
process.exit(0);
