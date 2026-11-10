import { chromium, devices } from 'playwright';
const B = 'http://localhost:3000';
const user = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'MEMBER', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID' };
const browser = await chromium.launch();
const setup = async (ctx) => {
  await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
  const page = await ctx.newPage();
  await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, user);
  return page;
};
const enter = async (page) => { await page.getByText('Start Practice').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(800); await page.getByText('Create Demo Account').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(3000); for (let k = 0; k < 2; k++) { await page.getByText(/ENTER\s*COMMAND\s*CENTER/i).first().click({ timeout: 2500 }).catch(() => {}); for (const b of ['Maybe later', 'Start exploring', 'Got it']) await page.getByRole('button', { name: b }).first().click({ timeout: 800 }).catch(() => {}); await page.waitForTimeout(1200); } };
const open = async (page) => { await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000); await enter(page); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000); await enter(page); };

// ───────── sign-in screen (no account), desktop + phone
for (const [name, opt] of [['desktop', { viewport: { width: 1600, height: 1000 } }], ['phone', { ...devices['iPhone 13'] }], ['tablet', { viewport: { width: 820, height: 1180 } }]]) {
  const ctx = await browser.newContext(opt); const page = await ctx.newPage();
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
  for (const b of ['Maybe later', 'Start exploring', 'Got it']) await page.getByRole('button', { name: b }).first().click({ timeout: 800 }).catch(() => {});
  const hero = page.locator('[data-testid="login-hero"] img');
  const ok = await hero.evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false);
  console.log('LOGIN', name, 'hero present', await hero.count(), 'image loaded', ok, 'scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth), 'of', await page.evaluate(() => document.documentElement.clientWidth));
  await hero.scrollIntoViewIfNeeded().catch(() => {}); await page.screenshot({ path: `shots/login-${name}.png` });
  await page.screenshot({ path: `shots/login-${name}-full.png`, fullPage: true });
  await ctx.close();
}
// ───────── desktop app
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await setup(ctx); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await open(page);
  const shot = (n) => page.screenshot({ path: `shots/${n}.png` });
  await page.getByText('PREMIUM TRADINGVIEW').first().click().catch(() => console.log('no premium nav')); await page.waitForTimeout(12000);
  await page.locator('[data-testid="broker-select"]').selectOption('FX'); await page.waitForTimeout(10000);
  await page.evaluate(() => { window.__msgs = []; window.addEventListener('message', (e) => { try { window.__msgs.push((e.origin || '') + ' ' + (typeof e.data === 'string' ? e.data : JSON.stringify(e.data)).slice(0, 300)); } catch {} }); });
  const chip = page.locator('[data-testid="tv-scale-chip"]');
  const read = async () => (await chip.innerText().catch(() => '')).replace(/\s+/g, ' ');
  console.log('CHIP 1h', await read());
  for (const [v, l] of [['1', '1m'], ['5', '5m'], ['240', '4h']]) {
    await page.locator('[data-testid="tv-scale-tf"]').click(); await page.waitForTimeout(400);
    await page.locator('[data-testid="tv-scale-tf-menu"] button', { hasText: new RegExp('^' + l + '$') }).click(); await page.waitForTimeout(7000);
    const a = await read(); await page.waitForTimeout(3000); const b = await read();
    const fr = page.frames().map((f) => f.url()).filter((u) => /tradingview/.test(u)).map((u) => decodeURIComponent(u).match(/interval=([^&]+)/)?.[1]);
    console.log('CHIP', l, '|', a, '→', b, '| ticking', a !== b, '| widget interval', fr.join(','));
  }
  // does TradingView tell the page when the timeframe is changed inside its own toolbar?
  const tvf = page.frames().find((f) => /tradingview/.test(f.url()));
  await tvf?.locator('button:has-text("30m")').first().click({ timeout: 6000 }).catch((e) => console.log('cannot click 30m in widget', String(e).slice(0, 80)));
  await page.waitForTimeout(5000);
  const msgs = await page.evaluate(() => window.__msgs);
  console.log('TVMSG count', msgs.length); for (const m of msgs.slice(-12)) console.log('TVMSG', m);
  await chip.scrollIntoViewIfNeeded(); await shot('d-tv-chip');
  for (const [tab, key] of [['BACKTESTING', 'backtest'], ['UNLIMITED CHART ANALYSIS', 'charts']]) {
    await page.getByText(new RegExp(tab)).first().click({ timeout: 8000 }).catch(() => console.log('no nav', tab)); await page.waitForTimeout(7000);
    const ws = page.locator(`[data-testid="pine-workspace-${key}"]`);
    console.log('PINEWS', key, 'present', await ws.count());
    await ws.locator('button').first().click().catch(() => {}); await page.waitForTimeout(15000);
    console.log('PINEWS', key, 'chart canvases', await ws.locator('canvas').count(), '| panel:', ((await ws.innerText().catch(() => '')).replace(/\s+/g, ' ').match(/Indicators[^.]{0,120}/) || [''])[0], '| search', await ws.locator('[data-testid="indicator-search"]').count());
    await ws.scrollIntoViewIfNeeded(); await shot('d-pinews-' + key);
  }
  console.log('ERRORS desktop', errs.length, errs.slice(0, 4).join(' || '));
  await ctx.close();
}
// ───────── phone: calendar
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await setup(ctx); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await open(page);
  await page.locator('#header-news-calendar-btn, #header-news-calendar-guest-btn').first().click().catch(() => console.log('no news btn (mobile)')); await page.waitForTimeout(12000);
  const figs = page.locator('[data-testid="cal-mobile-figures"]');
  const n = await figs.count();
  const vis = n ? await figs.first().isVisible() : false;
  console.log('CAL mobile rows with figures', n, 'visible', vis, '| sample:', (await figs.nth(Math.min(3, Math.max(0, n - 1))).innerText().catch(() => '')).replace(/\s+/g, ' '));
  console.log('CAL mobile scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth), 'table width', await page.locator('table').first().evaluate((t) => Math.round(t.getBoundingClientRect().width)).catch(() => 0));
  await figs.first().scrollIntoViewIfNeeded().catch(() => {}); await page.screenshot({ path: 'shots/m-calendar.png' });
  console.log('ERRORS mobile', errs.length, errs.slice(0, 4).join(' || '));
  await ctx.close();
}
process.exit(0);
