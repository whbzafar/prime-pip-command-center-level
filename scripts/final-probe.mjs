import http from 'http'; import path from 'path';
process.env.VERCEL = '1';
const realFetch = globalThis.fetch;
// Simulate Vercel's situation: Dukascopy refuses this server.
globalThis.fetch = (url, opts) => (String(url).includes('dukascopy.com') ? Promise.resolve(new Response('blocked', { status: 403 })) : realFetch(url, opts));
const dir = path.resolve('.vercel/output/functions/api/index.func'); process.chdir(dir);
const mod = await import(path.join(dir, 'api/index.js')); const handler = mod.default?.default || mod.default;
http.createServer((req, res) => { const u = new URL(req.url, 'http://x'); req.query = Object.fromEntries(u.searchParams); res.status = (c) => { res.statusCode = c; return res; }; res.json = (o) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); return res; }; handler(req, res); }).listen(4999, async () => {
  const iso = (t) => new Date(t).toISOString().slice(0, 16);
  const get = (r) => realFetch('http://localhost:4999/api/index?__route=' + r).then((x) => x.json());
  const now = Date.now();
  for (const [label, qs] of [['EURUSD m1', 'src=duka&id=eurusd&tf=m1&alt=EURUSD%3DX'], ['EURUSD 30m', 'src=duka&id=eurusd&tf=m30&alt=EURUSD%3DX'], ['XAUUSD 1h', 'src=duka&id=xauusd&tf=h1&alt=GC%3DF'], ['EURUSD d1', 'src=duka&id=eurusd&tf=d1&alt=EURUSD%3DX'], ['US500 m5', 'src=duka&id=usa500idxusd&tf=m5&alt=%5EGSPC'], ['AAPL h4', 'src=duka&id=aaplususd&tf=h4&alt=AAPL']]) {
    const j = await get(`/history/candles&${qs}&before=${now}&count=500`);
    const c = j.candles || [];
    console.log(`FP hist ${label}: ok=${j.ok} src=${j.src} fallback=${j.fallback} n=${c.length} first=${c[0] && iso(c[0].timestamp)} last=${c.at(-1) && iso(c.at(-1).timestamp) + ' ' + c.at(-1).close} ${j.error || ''}`);
  }
  await get('/macro/overview'); await new Promise((r) => setTimeout(r, 15000));
  for (const a of ['EUR', 'USD', 'XAU', 'JP225', 'XRP', 'BTC', 'NZD', 'GER40']) {
    const j = await get('/macro/asset/' + a);
    const i = j.institutional || {};
    console.log(`FP inst ${a}: available=${i.available} ${i.available ? `${i.market} asof=${i.reportDate} rel=${i.releasedAt} next=${i.nextReleaseAt} OI=${i.openInterest}(${i.openInterestChange}) spec L/S/N=${i.speculators.long}/${i.speculators.short}/${i.speculators.net} Δ${i.speculators.netChange} long%=${i.speculators.longPct} idx26/52/3y=${i.speculators.cotIndex26w}/${i.speculators.cotIndex52w}/${i.speculators.cotIndex3y} z=${i.speculators.zScore52w} comm N=${i.commercials.net} small=${i.smallTraders?.net} weeks=${i.weeks} hist=${i.history?.length} extremes=${(i.extremes||[]).length}` : i.reason}`);
  }
  const p = await get('/macro/pair/EURUSD'); console.log(`FP pair inst base=${p.institutional?.base?.available} quote=${p.institutional?.quote?.available}`);
  process.exit(0);
});
