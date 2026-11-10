import { chromium } from 'playwright';
const cands = ['FOREXCOM:EURUSD', 'FOREXCOM:XAUUSD', 'FOREXCOM:XAGUSD', 'FOREXCOM:US30', 'FOREXCOM:DJI', 'FOREXCOM:NAS100', 'FOREXCOM:NSXUSD', 'FOREXCOM:SPX500', 'FOREXCOM:SPXUSD', 'FOREXCOM:GER40', 'FOREXCOM:GRXEUR', 'FOREXCOM:UK100', 'FOREXCOM:UKXGBP', 'FOREXCOM:JP225', 'FOREXCOM:JPXJPY', 'FOREXCOM:AUS200', 'FOREXCOM:AUXAUD', 'FOREXCOM:USOIL', 'FOREXCOM:USOUSD', 'FOREXCOM:UKOIL', 'FOREXCOM:UKOUSD', 'FOREXCOM:NATGAS', 'FOREXCOM:NGUSD', 'FOREXCOM:COPPER', 'FOREXCOM:XCUUSD', 'FOREXCOM:XPTUSD', 'FOREXCOM:DXY', 'FOREXCOM:USDOLLAR', 'BINANCE:BTCUSDT', 'TVC:DXY', 'CAPITALCOM:US30', 'FOREXCOM:VIX'];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 600 } });
for (const s of cands) {
  await p.setContent(`<iframe style="width:980px;height:560px;border:0" src="https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(s)}&interval=60&theme=dark"></iframe>`);
  await p.waitForTimeout(7000);
  const f = p.frames().find((x) => /widgetembed/.test(x.url()));
  const t = (await f.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const bad = /doesn.t exist|Invalid symbol|only available on TradingView|No data here/i.test(t);
  console.log('SYM', s.padEnd(20), bad ? 'MISSING' : 'ok', '|', t.slice(0, 90));
}
process.exit(0);
