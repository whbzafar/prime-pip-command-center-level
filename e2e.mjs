import { chromium } from 'playwright';
import fs from 'fs';
const B = 'http://localhost:3000';
const T = JSON.parse(fs.readFileSync('/tmp/tokens.json', 'utf8'));
const SRC = `//@version=5
strategy("PPFX Speed Test", overlay=true)
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
plot(fast, "Fast", color.aqua, 2)
plot(slow, "Slow", color.orange, 2)
if ta.crossover(fast, slow)
    strategy.entry("L", strategy.long)
if ta.crossunder(fast, slow)
    strategy.close("L")
`;
const browser = await chromium.launch();
async function ctxFor(who, extra = {}) {
  const { token, user } = T[who];
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  await ctx.addCookies([{ name: 'primepipfx_session', value: token, domain: 'localhost', path: '/' }]);
  await ctx.addInitScript(([t, u, ex]) => { try { if (location.hostname !== 'localhost') return; localStorage.setItem('primepipfx_session_token', t); localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); for (const [k, v] of Object.entries(ex)) if (!localStorage.getItem(k + '_set')) { localStorage.setItem(k, v); localStorage.setItem(k + '_set', '1'); } } catch {} }, [token, user, extra]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${who}] PAGEERROR`, e.message.slice(0, 200)));
  return { ctx, page };
}
const shot = (p, n) => p.screenshot({ path: `shots/${n}.png` });
async function enter(p) {
  await p.goto(B, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) for (const t of ['ENTER COMMAND CENTER', 'Start Practice', 'Create Demo Account']) { await p.getByText(t).first().click({ timeout: 1200 }).catch(() => {}); await p.waitForTimeout(600); }
  await p.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
}
const nav = (p, l) => p.evaluate((l) => { const el = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim().toUpperCase().startsWith(l)); el?.scrollIntoView(); el?.click(); }, l);
async function openPremium(p, sym = 'EURUSD') {
  await p.evaluate((s) => { sessionStorage.setItem('ppfx_pending_chart', s); window.dispatchEvent(new CustomEvent('ppfx:open-chart', { detail: { symbol: s } })); }, sym);
  await p.waitForTimeout(3000);
}
const waitFor = async (p, fn, max = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if (await p.evaluate(fn).catch(() => false)) return Date.now() - t0; await p.waitForTimeout(250); } return -1; };
const legend = () => [...document.querySelectorAll('*')].some((e) => e.children.length === 0 && /PPFX Speed Test/.test(e.textContent || '') && !e.closest('button'));

// ADMIN publishes + editor "Add to chart" timing
const A = await ctxFor('admin');
await enter(A.page);
console.log('PUBLISH', await A.page.evaluate(async (src) => { const t = localStorage.getItem('primepipfx_session_token'); const r = await fetch('/api/pine/scripts', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ source: src, published: true }) }); return r.status; }, SRC));
const t0 = Date.now();
await openPremium(A.page);
const chartReady = await waitFor(A.page, () => !!document.querySelector('[data-testid="price-alert-overlay"]'));
console.log('ADMIN chart ready ms:', chartReady, 'source label:', await A.page.evaluate(() => (document.body.innerText.match(/EURUSD\s*·\s*[A-Za-z]+/) || [''])[0]));
await A.page.getByRole('button', { name: /Pine Editor/ }).first().click(); await A.page.waitForTimeout(4000);
await A.page.locator('[aria-label="Pine Script editor"]').fill(SRC.replace('PPFX Speed Test', 'PPFX Draft Test'));
const t1 = Date.now();
await A.page.getByRole('button', { name: /Add to chart/ }).click();
const draftMs = await waitFor(A.page, () => [...document.querySelectorAll('*')].some((e) => e.children.length === 0 && /PPFX Draft Test/.test(e.textContent || '') && !e.closest('[aria-label="Pine Script editor"]') && !e.closest('button')));
console.log('ADMIN editor Add-to-chart -> on chart ms:', draftMs);
await A.page.locator('[aria-label="Pine Script editor"]').fill(SRC.replace('PPFX Speed Test', 'PPFX Draft Test').replace('ema(close, 21)', 'ema(close, 34)'));
await A.page.getByRole('button', { name: /Add to chart/ }).click();
await A.page.waitForTimeout(400);
const t2 = Date.now();
const upd = await waitFor(A.page, () => /updated on the chart|is on the chart/.test(document.body.innerText), 60000);
console.log('ADMIN edit re-apply ms:', upd);
await shot(A.page, 'u1-admin-draft');

// STUDENT chip timing
const S = await ctxFor('student', { ppfx_premium_engine: 'pro' });
await enter(S.page);
await openPremium(S.page);
console.log('STUDENT chart ready ms:', await waitFor(S.page, () => !!document.querySelector('[data-testid="price-alert-overlay"]')));
await S.page.waitForTimeout(1500);
const c0 = Date.now();
await S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /PPFX Speed Test/.test(x.innerText)); b?.click(); });
console.log('STUDENT chip -> indicator on chart ms:', await waitFor(S.page, legend));
await S.page.locator('[data-testid="price-alert-overlay"]').first().scrollIntoViewIfNeeded().catch(() => {});
await shot(S.page, 'u2-student');
// crypto label
await openPremium(S.page, 'BTCUSDT'); await S.page.waitForTimeout(12000);
console.log('BTC label:', await S.page.evaluate(() => (document.body.innerText.match(/BTCUSDT\s*·\s*[A-Za-z]+/) || [''])[0]));

// TradingView mode: hint + countdown setting persists after reload
await openPremium(S.page, 'EURUSD');
await S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'TradingView'); b?.click(); }); await S.page.waitForTimeout(12000);
console.log('TV hint:', await S.page.locator('[data-testid="tv-countdown-hint"]').count());
const ifr = S.page.locator('iframe[src*="tradingview"]').first();
await ifr.scrollIntoViewIfNeeded().catch(() => {}); await S.page.waitForTimeout(1000);
const b = await ifr.boundingBox().catch(() => null);
const fr = () => S.page.frames().find((f) => /tradingview/.test(f.url()));
if (b && fr()) {
  await S.page.mouse.click(b.x + b.width - 30, b.y + b.height * 0.4, { button: 'right' }); await S.page.waitForTimeout(1200);
  await fr().getByText(/^Labels$/).first().hover(); await S.page.waitForTimeout(1000);
  await fr().getByText(/Countdown to bar close/).first().click().catch((e) => console.log('cd click', e.message.slice(0, 60)));
  await S.page.waitForTimeout(2500);
  await shot(S.page, 'u3-tv-countdown-on');
  await S.page.reload({ waitUntil: 'domcontentloaded' }); await S.page.waitForTimeout(7000); await openPremium(S.page, 'EURUSD'); await S.page.waitForTimeout(12000);
  await S.page.locator('iframe[src*="tradingview"]').first().scrollIntoViewIfNeeded().catch(() => {}); await S.page.waitForTimeout(1500);
  await shot(S.page, 'u4-tv-after-reload');
  const b2 = await S.page.locator('iframe[src*="tradingview"]').first().boundingBox();
  await S.page.mouse.click(b2.x + b2.width - 30, b2.y + b2.height * 0.4, { button: 'right' }); await S.page.waitForTimeout(1200);
  await fr().getByText(/^Labels$/).first().hover(); await S.page.waitForTimeout(1000);
  await shot(S.page, 'u5-tv-labels-after-reload');
  await S.page.keyboard.press('Escape');
}
// fullscreen TV header (no fx button)
await S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Full-Screen/.test(x.innerText)); b?.click(); }); await S.page.waitForTimeout(5000);
console.log('TV FS fx button:', await S.page.locator('button[title="Technical Indicators (fx)"]').count());
await shot(S.page, 'u6-tv-fs');
await S.page.keyboard.press('Escape'); await S.page.waitForTimeout(2000);
await S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Pro chart'); b?.click(); });

// FUNDAMENTALS exports
await S.page.evaluate(() => window.scrollTo(0, 0));
await shot(S.page, 'u7-header');
await S.page.locator('#header-fundamentals-btn').click().catch(() => {}); await S.page.waitForTimeout(8000);
await S.page.evaluate(() => { const b = [...document.querySelectorAll('[role="tab"],button')].find((x) => /^Rankings|^Top pairs|RANKINGS/i.test(x.innerText.trim())); b?.click(); }); await S.page.waitForTimeout(8000);
for (const [sel, name] of [['[data-testid="export-rankings-pdf"]', 'rankings']]) {
  const dl = S.page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
  await S.page.locator(sel).first().click().catch((e) => console.log('click', name, e.message.slice(0, 60)));
  const d = await dl; if (d) { const f = `shots/${name}.pdf`; await d.saveAs(f); console.log('PDF', name, d.suggestedFilename(), fs.statSync(f).size); } else console.log('PDF', name, 'no download');
}
await shot(S.page, 'u8-rankings');
await S.page.evaluate(() => { const b = [...document.querySelectorAll('[role="tab"],button')].find((x) => /^Pairs/i.test(x.innerText.trim())); b?.click(); }); await S.page.waitForTimeout(5000);
await S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^EUR\s*\/?\s*USD/.test(x.innerText.trim())); b?.click(); }); await S.page.waitForTimeout(8000);
{ const dl = S.page.waitForEvent('download', { timeout: 30000 }).catch(() => null); await S.page.locator('[data-testid="export-pair-pdf"]').first().click().catch((e) => console.log('pair click', e.message.slice(0, 60))); const d = await dl; if (d) { await d.saveAs('shots/pair.pdf'); console.log('PDF pair', d.suggestedFilename(), fs.statSync('shots/pair.pdf').size); } else console.log('PDF pair no download'); }
await shot(S.page, 'u9-pair');
// announcements stories toggle
await S.page.evaluate(() => window.scrollTo(0, 0));
await S.page.getByRole('button', { name: 'Announcements' }).click().catch(() => {}); await S.page.waitForTimeout(3000);
await S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().startsWith('Important')); b?.click(); }); await S.page.waitForTimeout(2000);
await S.page.locator('[data-testid="stories-sound-toggle"]').click().catch(() => {}); await S.page.waitForTimeout(500);
console.log('stories sound setting:', await S.page.evaluate(() => localStorage.getItem('ppfx_lt_alert_settings_v1')));
await shot(S.page, 'u10-important');
process.exit(0);
