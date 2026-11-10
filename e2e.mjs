import { chromium, devices } from 'playwright';
const B = 'http://localhost:3000';
const user = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'MEMBER', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID' };
const browser = await chromium.launch();
const H1 = 3600000;
const setup = async (ctx) => {
  await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
  let n = 0;
  await ctx.route('**/api/sbt/scan*', (r) => { const u = new URL(r.request().url()); const bar = Number(u.searchParams.get('bar')); const t = bar - H1; n++; const sig = (dir, level) => ({ time: t, dir, level, price: 1.2345, stop: 1.2, target: 1.3, zoneTop: 1.236, zoneBottom: 1.233, bosTime: t - 10 * H1, models: ['SBT 5'] }); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, symbol: u.searchParams.get('symbol'), bar, lastCandle: t, dir: 1, level1: { top: 1.236, bottom: 1.233, modelReady: true }, level2: null, signals: n % 4 === 0 ? [sig(1, 1), sig(-1, 2)] : [], stale: false }) }); });
  const page = await ctx.newPage();
  await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, user);
  return page;
};
const enter = async (page) => { await page.getByText('Start Practice').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(800); await page.getByText('Create Demo Account').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(3000); for (let k = 0; k < 2; k++) { await page.getByText(/ENTER\s*COMMAND\s*CENTER/i).first().click({ timeout: 2500 }).catch(() => {}); for (const b of ['Maybe later', 'Start exploring', 'Got it']) await page.getByRole('button', { name: b }).first().click({ timeout: 800 }).catch(() => {}); await page.waitForTimeout(1200); } };
const open = async (page) => { await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000); await enter(page); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000); await enter(page); };

// ───────── desktop
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await setup(ctx); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await open(page);
  const shot = (n) => page.screenshot({ path: `shots/${n}.png` });
  console.log('HEADER news btn', await page.locator('#header-news-calendar-btn').count(), '| psych btn', await page.locator('#header-psychological-center-btn').count());
  await page.locator('#header-news-calendar-btn').click().catch(() => console.log('no news btn')); await page.waitForTimeout(6000);
  console.log('NEWS page', ((await page.locator('body').innerText()).match(/LIVE NEWS CALENDAR|Economic Calendar/i) || [''])[0]); await shot('d1-news');
  await page.getByText('PREMIUM TRADINGVIEW').first().click().catch(() => console.log('no premium nav')); await page.waitForTimeout(14000);
  console.log('OLD watchlist panel', await page.locator('[data-testid="premium-watchlist"]').count(), '| dock watchlist', await page.locator('[data-testid="watchlist-body"]').count());
  await page.waitForTimeout(20000);
  const rows = await page.locator('[data-testid="watchlist-row"]').allInnerTexts();
  console.log('WATCH rows', rows.length, '|', rows.slice(0, 14).map((t) => t.replace(/\s+/g, ' ')).join(' ;; '));
  await page.locator('[data-testid="watchlist-add"]').fill('gbpjpy'); await page.locator('[data-testid="watchlist-add"]').press('Enter'); await page.waitForTimeout(8000);
  console.log('WATCH after add', (await page.locator('[data-testid="watchlist-row"]').allInnerTexts()).slice(-1).map((t) => t.replace(/\s+/g, ' ')).join(''));
  await page.locator('[data-testid="watchlist-body"]').scrollIntoViewIfNeeded(); await shot('d2-watchlist-pro');
  await page.locator('[data-testid="broker-select"]').selectOption('FX'); await page.waitForTimeout(10000);
  console.log('TV chip', await page.locator('[data-testid="tv-scale-chip"]').count(), (await page.locator('[data-testid="tv-scale-chip"]').innerText().catch(() => '')).replace(/\s+/g, ' '));
  await page.locator('[data-testid="tv-scale-plus"]').click().catch(() => console.log('no plus')); await page.waitForTimeout(2500);
  console.log('TV alert panel', await page.locator('[data-testid="tv-alert-panel"]').count());
  await page.locator('[data-testid="tv-scale-chip"]').scrollIntoViewIfNeeded(); await shot('d3-tv-chart');
  console.log('ERRORS desktop', errs.length, errs.slice(0, 4).join(' || '));
  await ctx.close();
}
// ───────── phone
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await setup(ctx); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await open(page);
  const shot = (n, full = false) => page.screenshot({ path: `shots/${n}.png`, fullPage: full });
  const overflow = async (label) => { const o = await page.evaluate(() => { const w = document.documentElement.clientWidth; const bad = []; for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.right > w + 6 && r.left < w && getComputedStyle(el).position !== 'fixed') { let p = el.parentElement, clipped = false; while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { clipped = true; break; } p = p.parentElement; } if (!clipped) bad.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 3).join('.')) + ' →' + Math.round(r.right)); } } return { w, sw: document.documentElement.scrollWidth, bad: bad.slice(0, 8) }; }); console.log('MOBILE', label, 'viewport', o.w, 'scrollWidth', o.sw, o.sw > o.w + 2 ? 'OVERFLOWS' : 'fits', o.bad.join(' | ')); };
  await overflow('home'); await shot('m1-home'); await shot('m1-home-full', true);
  await page.locator('[aria-label="Announcements"]').first().click({ timeout: 5000 }).catch(() => console.log('no megaphone (mobile)')); await page.waitForTimeout(1500); await shot('m2-announcements'); await overflow('announcements');
  await page.locator('[aria-label="Close"]').first().click().catch(() => {});
  await page.locator('#header-fundamentals-btn, #header-fundamentals-guest-btn').first().click().catch(() => console.log('no fundamentals btn (mobile)')); await page.waitForTimeout(9000); await overflow('fundamentals'); await shot('m3-fundamentals');
  await page.getByText(/Top Bullish\s*\/\s*Bearish/i).first().click({ timeout: 6000 }).catch(() => {}); await page.waitForTimeout(5000); await overflow('rankings'); await shot('m4-rankings');
  await page.locator('#header-news-calendar-btn, #header-news-calendar-guest-btn').first().click().catch(() => console.log('no news btn (mobile)')); await page.waitForTimeout(8000); await overflow('news'); await shot('m5-news');
  await page.getByText('PREMIUM TRADINGVIEW').first().click({ timeout: 6000 }).catch(() => console.log('no premium nav (mobile)')); await page.waitForTimeout(14000); await overflow('premium'); await shot('m6-premium');
  await page.evaluate(() => window.scrollBy(0, 700)); await page.waitForTimeout(1500); await shot('m7-premium-chart');
  console.log('ERRORS mobile', errs.length, errs.slice(0, 4).join(' || '));
  await ctx.close();
}
process.exit(0);
