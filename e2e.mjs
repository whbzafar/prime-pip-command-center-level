import { chromium, webkit, devices } from 'playwright';
const B = 'http://localhost:3000';
const user = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'MEMBER', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID' };
const H1 = 3600000;
const setup = async (ctx) => {
  await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
  let n = 0;
  await ctx.route('**/api/sbt/scan*', (r) => { const u = new URL(r.request().url()); const bar = Number(u.searchParams.get('bar')); const t = bar - H1; n++; const sig = (dir, level) => ({ time: t, dir, level, price: 1.2345, stop: 1.2, target: 1.3, zoneTop: 1.236, zoneBottom: 1.233, bosTime: t - 10 * H1, models: ['SBT 5'] }); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, symbol: u.searchParams.get('symbol'), bar, lastCandle: t, dir: 1, level1: { top: 1.236, bottom: 1.233, modelReady: true }, level2: null, signals: n % 4 === 1 ? [sig(1, 1), sig(-1, 2)] : [], stale: false }) }); });
  const page = await ctx.newPage();
  await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, user);
  return page;
};
const enter = async (page) => { await page.getByText('Start Practice').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(800); await page.getByText('Create Demo Account').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(3000); for (let k = 0; k < 2; k++) { await page.getByText(/ENTER\s*COMMAND\s*CENTER/i).first().click({ timeout: 2500 }).catch(() => {}); for (const b of ['Maybe later', 'Start exploring', 'Got it']) await page.getByRole('button', { name: b }).first().click({ timeout: 800 }).catch(() => {}); await page.waitForTimeout(1200); } };
const open = async (page) => { await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000); await enter(page); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000); await enter(page); };
const vis = (page, sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return 'MISSING'; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (!r.width || !r.height) return `zero-size display=${cs.display}`; const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); const onTop = top && (el === top || el.contains(top)); return `box ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} vw=${innerWidth} ${onTop ? 'ON TOP' : 'COVERED by ' + (top ? top.tagName + '.' + String(top.className).slice(0, 80) : 'nothing')} opacity=${cs.opacity}`; }, sel);
const wide = async (page, label) => { const o = await page.evaluate(() => { const w = innerWidth; const bad = []; for (const el of document.querySelectorAll('main *, #root *')) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.right > w + 2 && r.left < w - 10 && getComputedStyle(el).position !== 'fixed') { let p = el.parentElement, inScroller = false; while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.getBoundingClientRect().right <= w + 2) { inScroller = true; break; } p = p.parentElement; } if (!inScroller) bad.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 3).join('.')).slice(0, 70) + '→' + Math.round(r.right)); } } return bad.slice(0, 8); }); console.log('CUT-OFF', label, o.length ? o.join(' | ') : 'none'); };
const overflow = async (page, label) => { await wide(page, label); const o = await page.evaluate(() => { const w = document.documentElement.clientWidth; const bad = []; for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.right > w + 4 && r.left < w) { let p = el.parentElement, clipped = false; while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { clipped = true; break; } p = p.parentElement; } if (!clipped && getComputedStyle(el).position !== 'fixed') bad.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 4).join('.')) + ' →' + Math.round(r.right)); } } return { w, sw: document.documentElement.scrollWidth, bad: bad.slice(0, 10) }; }); console.log('OVERFLOW', label, 'vw', o.w, 'scrollW', o.sw, o.sw > o.w + 2 ? 'OVERFLOWS' : 'fits', '|', o.bad.join(' | ')); };

for (const [engine, bt] of [['chromium', chromium]]) {
  const browser = await bt.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true });
  const page = await setup(ctx); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await open(page);
  const shot = (n, full = false) => page.screenshot({ path: `shots/m-${n}.png`, fullPage: full });
  await page.locator('[aria-label="More Categories"], [title="More Categories"]').first().click({ timeout: 4000 }).catch(() => console.log('no More'));
  await page.waitForTimeout(1200); console.log('MORE logout', await vis(page, '[data-testid="mobile-logout"]')); await shot('0-more');
  await page.locator('[data-testid="mobile-logout"]').click({ timeout: 3000 }).then(() => console.log('LOGOUT clicked')).catch(() => console.log('LOGOUT not clickable'));
  await page.waitForTimeout(3000); console.log('AFTER logout token', await page.evaluate(() => localStorage.getItem('primepipfx_session_token'))); await shot('0b-after-logout');
  await open(page);
  await page.locator('#header-fundamentals-btn').click({ timeout: 6000 }).catch((e) => console.log('no fundamentals btn', e.message.slice(0, 100)));
  await page.waitForTimeout(10000); await shot('1-fund'); await overflow(page, 'fund forex');
  // tap a currency / asset in Forex
  await page.getByRole('tab', { name: /Pairs/ }).click({ timeout: 5000 }).catch(() => console.log('no Pairs tab'));
  await page.waitForTimeout(6000); await shot('2-pairs'); await overflow(page, 'pairs list');
  await page.locator('button:has-text("EUR/USD")').first().click({ timeout: 5000 }).catch(() => console.log('no EUR/USD'));
  await page.waitForTimeout(8000); await shot('3-pair', false); await shot('3-pair-full', true); await overflow(page, 'pair detail');
  await page.getByRole('button', { name: /Open chart|chart/i }).first().click({ timeout: 4000 }).catch(() => console.log('no open chart'));
  await page.waitForTimeout(14000); await shot('4-chart'); await overflow(page, 'chart from pair');
  await page.evaluate(() => window.scrollBy(0, 500)); await page.waitForTimeout(1500); await shot('5-chart-scrolled');
  const ifr = await page.evaluate(() => { const f = [...document.querySelectorAll('iframe')].find((x) => /tradingview/.test(x.src)); if (!f) return 'no iframe'; const r = f.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} vw ${innerWidth} vh ${innerHeight}`; });
  console.log('CHART iframe', ifr);
  console.log('ERRORS', engine, errs.length, errs.slice(0, 4).join(' || '));
  await browser.close();
}
process.exit(0);
// desktop TradingView timeframe + countdown
{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await setup(ctx);
  await open(page);
  await page.getByText('PREMIUM TRADINGVIEW').first().click().catch(() => console.log('no premium nav')); await page.waitForTimeout(12000);
  await page.locator('[data-testid="broker-select"]').selectOption('FX'); await page.waitForTimeout(10000);
  const frameIv = () => page.frames().map((f) => f.url()).filter((u) => /widgetembed/.test(u)).map((u) => u.match(/[?&]interval=([^&]*)/)?.[1]).join(',');
  const tvBtns = async () => { const f = page.frames().find((x) => /widgetembed/.test(x.url())); return f ? await f.locator('#header-toolbar-intervals').count() : -1; };
  console.log('TV own interval buttons (0 expected)', await tvBtns());
  for (const l of ['1m', '5m', '15m', '1h', '4h', '1D']) {
    await page.locator(`[data-testid="tv-tf-${l}"]`).click().catch(() => console.log('no btn', l)); await page.waitForTimeout(5000);
    const a = await page.locator('[data-testid="tv-scale-chip"]').innerText().catch(() => '');
    await page.waitForTimeout(2000);
    const b2 = await page.locator('[data-testid="tv-scale-chip"]').innerText().catch(() => '');
    const now = new Date(); console.log('TF', l, '| iframe interval', frameIv(), '| chip', a.replace(/\s+/g, ' ').slice(0, 30), '→ 2s later', b2.replace(/\s+/g, ' ').slice(0, 30), '| UTC', now.toISOString().slice(11, 19));
    if (l === '1m') await page.screenshot({ path: 'shots/desk-tv-1m.png' });
  }
  const off = await page.evaluate(() => fetch('/api/time').then((r) => r.json()).then((j) => j.now - Date.now()));
  console.log('CLOCK server-device ms', off);
  await page.locator('[aria-label="Announcements"]').first().click().catch(() => {}); await page.waitForTimeout(25000);
  await page.locator('[aria-label="Announcements"]').first().click().catch(() => {}); await page.waitForTimeout(400); await page.locator('[aria-label="Announcements"]').first().click().catch(() => {}); await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/desk-announcements.png' });
  await browser.close();
}
process.exit(0);
