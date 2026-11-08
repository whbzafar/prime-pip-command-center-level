import { chromium } from 'playwright';
import fs from 'fs';
const B = 'https://prime-pip-command-center-level.vercel.app';
const OLD_SW = fs.readFileSync('old_sw.js', 'utf8');
const user = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'ADMIN', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID', isDeveloper: true };
const ctx = await (await chromium.launch()).newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, user);
// 1) Simulate a returning visitor who has the OLD cache-first worker installed with an old cached page.
await ctx.route('**/sw.js', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: OLD_SW }));
await page.goto(B, { waitUntil: 'networkidle' }); await page.waitForTimeout(4000);
await page.evaluate(async () => { const c = await caches.open('primepipfx-v1'); await c.put('/', new Response('<html><body><h1>OLD CACHED APP</h1></body></html>', { headers: { 'content-type': 'text/html' } })); });
await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
console.log('STEP1 with old worker:', (await page.locator('body').innerText()).slice(0, 60).replace(/\s+/g, ' '));
// 2) The new deployment's worker becomes available (real /sw.js).
await ctx.unroute('**/sw.js');
const t0 = Date.now();
let ok = false;
for (let i = 0; i < 6 && !ok; i++) {
  await page.reload({ waitUntil: 'load' }).catch(() => {}); await page.waitForTimeout(5000);
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  ok = !body.includes('OLD CACHED APP') && body.length > 200;
  console.log(`reload ${i + 1}:`, ok ? 'NEW APP ✓' : body.slice(0, 50));
}
console.log('caches now:', await page.evaluate(() => caches.keys()), 'sw:', await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL));
console.log('version.json:', await page.evaluate(async () => (await fetch('/version.json', { cache: 'no-store' })).text()));
await page.getByText('Start Practice').first().click().catch(() => {}); await page.waitForTimeout(800); await page.getByText('Create Demo Account').first().click().catch(() => {}); await page.waitForTimeout(3000);
await page.getByText('BACKTESTING').first().click(); await page.waitForTimeout(8000);
const bt = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
console.log('BACKTEST shows new Bar Replay:', bt.includes('Start replay'), '| old simulator present:', bt.includes('Strategy Execution Simulator') || bt.includes('Twelve Data API'));
await page.getByText('PREMIUM TRADINGVIEW').first().click(); await page.waitForTimeout(12000);
const pt = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
console.log('PREMIUM live bias strip:', /LIVE FUNDAMENTAL BIAS/i.test(pt), '| old ECB text present:', pt.includes('ECB 2.75%'), '| market closed label:', /CLOSED · opens/.test(pt));
await page.getByText('FUNDAMENTAL INDICATORS').first().click(); await page.waitForTimeout(6000);
await page.getByText('Contrarian crowd positioning').first().click(); await page.waitForTimeout(8000);
const st = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
console.log('SENTIMENT new board:', st.includes('Live trader sentiment'), '| old Myfxbook status present:', st.includes('Myfxbook):'));
await page.screenshot({ path: 'shots/z-sentiment.png' });
process.exit(0);
