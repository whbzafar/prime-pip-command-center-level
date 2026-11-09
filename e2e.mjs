import { chromium } from 'playwright';
import fs from 'fs';
const B = 'http://localhost:3000';
const T = JSON.parse(fs.readFileSync('/tmp/tokens.json', 'utf8'));
const SRC = `//@version=5
strategy("PPFX Once Test", overlay=true)
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
async function ctxFor(who) {
  const { token, user } = T[who];
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await ctx.addCookies([{ name: 'primepipfx_session', value: token, domain: 'localhost', path: '/' }]);
  await ctx.addInitScript(([t, u]) => { try { localStorage.setItem('primepipfx_session_token', t); localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); } catch {} }, [token, user]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${who}] PAGEERROR`, e.message.slice(0, 200)));
  return { ctx, page };
}
const shot = (p, n) => p.screenshot({ path: `shots/${n}.png` });
async function enter(p) {
  await p.goto(B, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) {
    for (const t of ['ENTER COMMAND CENTER', 'Start Practice', 'Create Demo Account']) { await p.getByText(t).first().click({ timeout: 1200 }).catch(() => {}); await p.waitForTimeout(600); }
  }
  await p.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
}
async function openPremium(p) {
  await p.evaluate(() => { sessionStorage.setItem('ppfx_pending_chart', 'EURUSD'); window.dispatchEvent(new CustomEvent('ppfx:open-chart', { detail: { symbol: 'EURUSD' } })); });
  await p.waitForTimeout(4000);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Pro chart'); b?.click(); });
  await p.waitForTimeout(14000);
}
const legendCount = (p, name) => p.evaluate((n) => (document.body.innerText.match(new RegExp(n, 'g')) || []).length, name);

// ADMIN publishes the script through the API
const A = await ctxFor('admin');
await enter(A.page);
const pub = await A.page.evaluate(async (src) => { const t = localStorage.getItem('primepipfx_session_token'); const r = await fetch('/api/pine/scripts', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ source: src, published: true }) }); return r.status + ' ' + (await r.text()).slice(0, 120); }, SRC);
console.log('PUBLISH', pub);
await openPremium(A.page);
await A.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.title === 'Click to apply on the chart' && /PPFX Once Test/.test(x.innerText)); b?.click(); });
await A.page.waitForTimeout(20000);
console.log('ADMIN legend count (chip):', await legendCount(A.page, 'PPFX Once Test'));
await A.page.locator('[data-testid="price-alert-overlay"]').first().scrollIntoViewIfNeeded().catch(() => {});
await shot(A.page, 'z1-admin-indicator');

// STUDENT: click the chip twice-on, off, on; must be exactly one instance
const S = await ctxFor('student');
await enter(S.page);
await openPremium(S.page);
const chip = () => S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /PPFX Once Test/.test(x.innerText)); b?.click(); return Boolean(b); });
console.log('STUDENT chip found:', await chip()); await S.page.waitForTimeout(15000);
await chip(); await S.page.waitForTimeout(3000); await chip(); await S.page.waitForTimeout(15000);
const overlay = S.page.locator('[data-testid="price-alert-overlay"]').first();
await overlay.scrollIntoViewIfNeeded().catch(() => {});
await S.page.waitForTimeout(1500);
const inds = await S.page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /PPFX Once Test/.test(e.textContent || '')).length);
console.log('STUDENT legend elements with the name:', inds);
await shot(S.page, 'z2-student-indicator');

// PRICE ALERT via "+" on the price scale
const box = await overlay.boundingBox();
console.log('OVERLAY box', JSON.stringify(box));
let plus = 0;
for (let x = box.x + box.width - 5; x > box.x + box.width - 260 && !plus; x -= 6) {
  await S.page.mouse.move(x, box.y + box.height * 0.35);
  await S.page.waitForTimeout(60);
  plus = await S.page.locator('[data-testid="price-scale-plus"]').count();
  if (plus) console.log('PLUS appears at x offset', Math.round(box.x + box.width - x));
}
console.log('PLUS visible:', plus);
await shot(S.page, 'z3-plus');
if (plus) {
  await S.page.locator('[data-testid="price-scale-plus"]').click();
  await S.page.waitForTimeout(500);
  await shot(S.page, 'z4-plus-menu');
  await S.page.getByText(/^Add alert on EURUSD at/).click();
  await S.page.waitForTimeout(1200);
}
const labels = S.page.locator('[data-testid="price-alert-label"]');
console.log('ALERT labels:', await labels.count(), 'text:', (await labels.first().innerText().catch(() => '')).replace(/\s+/g, ' '));
const lb = await labels.first().boundingBox().catch(() => null);
if (lb) {
  await S.page.mouse.move(lb.x + 30, lb.y + lb.height / 2); await S.page.mouse.down(); await S.page.mouse.move(lb.x + 30, lb.y - 60, { steps: 8 }); await S.page.mouse.up();
  await S.page.waitForTimeout(800);
  console.log('ALERT after drag:', (await labels.first().innerText().catch(() => '')).replace(/\s+/g, ' '), 'stored:', await S.page.evaluate(() => localStorage.getItem('ppfx_price_alerts_v1')));
  const lb2 = await labels.first().boundingBox();
  await S.page.mouse.click(lb2.x + 30, lb2.y + lb2.height / 2); await S.page.waitForTimeout(600);
  await shot(S.page, 'z5-alert-edit');
  await S.page.keyboard.press('Escape');
  await S.page.getByRole('button', { name: 'Close' }).first().click().catch(() => {});
}

// DRAWINGS auto-save + undo
await S.page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.5);
await S.page.keyboard.press('Alt+h'); await S.page.waitForTimeout(2600);
const doc1 = await S.page.evaluate(() => localStorage.getItem('ppfx_drawings_v1:EURUSD') || '');
console.log('DRAWINGS after Alt+H:', (doc1.match(/"type"/g) || []).length, doc1.slice(0, 120));
await S.page.keyboard.press('Control+z'); await S.page.waitForTimeout(2600);
const doc2 = await S.page.evaluate(() => localStorage.getItem('ppfx_drawings_v1:EURUSD') || '');
console.log('DRAWINGS after Ctrl+Z:', (doc2.match(/"type"/g) || []).length);
await S.page.keyboard.press('Control+y'); await S.page.waitForTimeout(2600);
const doc3 = await S.page.evaluate(() => localStorage.getItem('ppfx_drawings_v1:EURUSD') || '');
console.log('DRAWINGS after Ctrl+Y:', (doc3.match(/"type"/g) || []).length);
await shot(S.page, 'z6-drawing');

// RELOAD: alerts + drawings come back
await S.page.reload({ waitUntil: 'domcontentloaded' }); await S.page.waitForTimeout(6000);
await openPremium(S.page);
await S.page.locator('[data-testid="price-alert-overlay"]').first().scrollIntoViewIfNeeded().catch(() => {}); await S.page.waitForTimeout(1500);
console.log('AFTER RELOAD alert labels:', await S.page.locator('[data-testid="price-alert-label"]').count());
await shot(S.page, 'z7-reload');

// FULL SCREEN
await S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Full-Screen/.test(x.innerText)); b?.click(); }); await S.page.waitForTimeout(12000);
await S.page.locator('[data-testid="price-alert-overlay"]').first().boundingBox().then(async (b) => { await S.page.mouse.click(b.x + 200, b.y + 300); }).catch(() => {});
await S.page.getByRole('button', { name: 'Indicators' }).last().click().catch((e) => console.log('ind btn', e.message.slice(0, 80)));
await S.page.waitForTimeout(1500);
console.log('FS indicator menu open:', await S.page.locator('[data-testid="ppfx-indicator-menu"]').count(), (await S.page.locator('[data-testid="ppfx-indicator-menu"]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300));
await shot(S.page, 'z8b-fs-indicators');
await S.page.keyboard.press('Escape'); await S.page.waitForTimeout(500);
console.log('FS top-left element:', await S.page.evaluate(() => document.elementsFromPoint(60, 12).slice(0, 3).map((e) => e.tagName + '.' + String(e.className).slice(0, 50)).join(' | ')));
console.log('FS global float visible:', await S.page.evaluate(() => { const e = document.querySelector('.ppfx-global-float'); return e ? getComputedStyle(e).display : 'none-el'; }));
await shot(S.page, 'z8-fullscreen');
const ob = await S.page.locator('[data-testid="price-alert-overlay"]').first().boundingBox().catch(() => null);
if (ob) await S.page.screenshot({ path: 'shots/z9-axis-zoom.png', clip: { x: ob.x + ob.width - 420, y: ob.y, width: 420, height: Math.min(500, ob.height) } });
await S.page.keyboard.press('Escape'); await S.page.waitForTimeout(3000);

// COMPOUNDING + ANNOUNCEMENTS
const nav = async (l) => S.page.evaluate((l) => { const el = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim().toUpperCase().startsWith(l)); el?.scrollIntoView(); el?.click(); }, l);
await nav('12. COMPOUNDING'); await S.page.waitForTimeout(4000);
await S.page.getByText(/How the gain builds up/).first().scrollIntoViewIfNeeded().catch(() => {});
await shot(S.page, 'z10-compounding');
await S.page.evaluate(() => window.scrollTo(0, 0)); await S.page.waitForTimeout(500);
await S.page.getByRole('button', { name: 'Announcements' }).click().catch(() => {}); await S.page.waitForTimeout(4000);
await S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().startsWith('Important')); b?.click(); }); await S.page.waitForTimeout(3000);
await shot(S.page, 'z11-important');
await S.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().startsWith('Alerts')); b?.click(); }); await S.page.waitForTimeout(1000);
await shot(S.page, 'z12-sounds');
process.exit(0);
