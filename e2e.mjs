import { chromium } from 'playwright';
const B = 'http://localhost:3000';
const user = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'MEMBER', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID' };
const ctx = await (await chromium.launch()).newContext({ viewport: { width: 1600, height: 1000 }, permissions: ['notifications'] });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 220)));
await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
const H1 = 3600000; let scans = 0; const asked = [];
// Simulated scanner answer: the pair closed its last H1 candle on a level, on BOTH sides, so the
// client must show only the side that agrees with the fundamentals.
await ctx.route('**/api/sbt/scan*', (r) => {
  const u = new URL(r.request().url()); const symbol = u.searchParams.get('symbol'); const bar = Number(u.searchParams.get('bar'));
  scans++; asked.push(symbol);
  const t = bar - H1;
  const sig = (dir, level, time) => ({ time, dir, level, price: 1.2345, stop: 1.2, target: 1.3, zoneTop: 1.236, zoneBottom: 1.233, bosTime: time - 10 * H1, models: [dir > 0 ? 'SBT 5' : 'SBT 2'] });
  const quiet = scans % 3 === 0; // every third pair: no level reached
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, symbol, bar, lastCandle: t, bars: 2500, trend: 1, armed: true, dir: 1, level1: { top: 1.236, bottom: 1.233, modelReady: true }, level2: { top: 1.23, bottom: 1.228, modelReady: false }, level1Done: false, htfWait: false, inTrade: false, signals: quiet ? [sig(1, 1, t - 40 * H1)] : [sig(1, 1, t), sig(-1, 2, t)], ms: 1, source: 'bundled', guarded: false, stale: false }) });
});
await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, user);
await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
const txt = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const shot = (n) => page.screenshot({ path: `shots/${n}.png` });
for (const b of ['Maybe later', 'Start exploring', 'Got it', 'Close']) await page.getByRole('button', { name: b }).first().click({ timeout: 1500 }).catch(() => {});
const rk = await page.evaluate(() => fetch('/api/macro/rankings').then((r) => r.json()).then((j) => ({ bull: j.data.longTerm.bullish.slice(0, 6).map((p) => p.symbol), bear: j.data.longTerm.bearish.slice(0, 6).map((p) => p.symbol) })).catch((e) => String(e)));
console.log('RANKINGS', JSON.stringify(rk));
await page.waitForTimeout(25000);
console.log('SCANS asked', scans, asked.join(','));
const st = await page.evaluate(() => ({ seen: JSON.parse(localStorage.getItem('ppfx_level_alerts_seen_v1') || '[]'), log: JSON.parse(localStorage.getItem('ppfx_level_alerts_log_v1') || '[]').map((a) => `${a.symbol} ${a.side > 0 ? 'BUY' : 'SELL'} L${a.level}`) }));
console.log('ALERTS logged', st.log.length, st.log.join(' | '));
const wrong = st.log.filter((l) => { const [s, side] = l.split(' '); return (side === 'BUY') !== (rk.bull || []).includes(s); });
console.log('ALIGNMENT wrong-side alerts:', wrong.length, wrong.join(' | '));
await shot('01-home');
await page.locator('[aria-label="Announcements"]').first().click(); await page.waitForTimeout(1500);
let t = await txt(); console.log('ANNOUNCE panel:', t.includes('Market at key levels'), '| hits rows', await page.locator('[data-testid="level-hit"]').count(), '|', (t.match(/[A-Z/]{3,9} (Buy|Sell) Level \d reached/g) || []).slice(0, 6).join(' ; '));
await shot('02-announcements');
await page.locator('[aria-label="Close"]').first().click().catch(() => {});
// second cycle must not alert again
const before = st.log.length;
await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(30000);
const after = await page.evaluate(() => JSON.parse(localStorage.getItem('ppfx_level_alerts_log_v1') || '[]').length);
console.log('DEDUPE after reload: alerts', before, '→', after);
for (const b of ['Maybe later', 'Start exploring', 'Got it']) await page.getByRole('button', { name: b }).first().click({ timeout: 1000 }).catch(() => {});
// Fundamentals → rankings
await page.getByText(/^FUNDAMENTALS$/i).first().click().catch(async () => { await page.getByRole('button', { name: /Fundamentals/i }).first().click().catch(() => console.log('no fundamentals button')); });
await page.waitForTimeout(6000);
await page.getByRole('button', { name: /Rankings|Top pairs/i }).first().click().catch(() => console.log('no rankings tab')); await page.waitForTimeout(5000);
t = await txt(); console.log('FUNDAMENTALS panel:', t.includes('Market at key levels'), '| hit rows', await page.locator('[data-testid="level-hit"]').count());
await page.locator('[data-testid="level-alerts"]').first().scrollIntoViewIfNeeded().catch(() => {}); await shot('03-fundamentals');
// Premium TradingView: watchlist + brokers
await page.getByText('PREMIUM TRADINGVIEW').first().click().catch(() => console.log('no premium nav')); await page.waitForTimeout(12000);
const wl = page.locator('[data-testid="premium-watchlist"]');
console.log('WATCHLIST present', await wl.count(), '|', ((await wl.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 420));
await wl.locator('input').fill('gbpjpy'); await wl.locator('input').press('Enter'); await page.waitForTimeout(600);
await wl.locator('input').fill('NAS100'); await wl.locator('input').press('Enter'); await page.waitForTimeout(600);
console.log('MY PAIRS saved', await page.evaluate(() => localStorage.getItem('ppfx_watchlist_v1')));
await wl.getByRole('button', { name: /Open GBP/ }).first().click().catch(() => console.log('cannot open my pair')); await page.waitForTimeout(6000);
await wl.scrollIntoViewIfNeeded(); await shot('04-watchlist');
const sel = page.locator('[data-testid="broker-select"]');
console.log('BROKERS', (await sel.locator('option').allInnerTexts()).join(', '));
for (const b of ['FOREXCOM', 'OANDA', 'PEPPERSTONE']) {
  await sel.selectOption(b); await page.waitForTimeout(9000);
  const frames = page.frames().map((f) => f.url()).filter((u) => /tradingview/.test(u));
  const m = frames.map((u) => decodeURIComponent(u).match(/symbol"?[=:]"?([A-Z_]+:[A-Z0-9]+)/)?.[1]).filter(Boolean);
  const ft = (await Promise.all(page.frames().filter((f) => /tradingview/.test(f.url())).map((f) => f.locator('body').innerText().catch(() => '')))).join(' ').replace(/\s+/g, ' ');
  console.log('BROKER', b, '→ widget symbol', m[0] || '(none)', '| invalid:', /Invalid symbol|only available on TradingView|symbol doesn.t exist/i.test(ft), '|', ft.slice(0, 90));
  await sel.scrollIntoViewIfNeeded(); await shot('05-broker-' + b);
}
await sel.selectOption(''); await page.waitForTimeout(6000); await shot('06-pro-again');
console.log('ERRORS', errs.length, errs.slice(0, 5).join(' || '));
process.exit(0);
