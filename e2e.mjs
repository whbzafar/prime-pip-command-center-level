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
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3000);
  console.log('LOGIN', name, 'surprise modal at 3s:', await page.locator('[data-testid="trial-modal"]').count());
  await page.screenshot({ path: `shots/login-${name}-3s.png` });
  await page.waitForTimeout(6000); console.log('LOGIN', name, 'surprise modal at 9s:', await page.locator('[data-testid="trial-modal"]').count());
  await page.locator('[data-testid="trial-modal"] button[aria-label="Close"], [data-testid="trial-modal"] button').first().click({ timeout: 2000 }).catch(() => {}); await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  console.log('LOGIN', name, 'modal after close:', await page.locator('[data-testid="trial-modal"]').count());
  const hero = page.locator('[data-testid="login-hero"] img');
  const ok = await hero.evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false);
  console.log('LOGIN', name, 'hero present', await hero.count(), 'image loaded', ok, 'scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth), 'of', await page.evaluate(() => document.documentElement.clientWidth));
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500); await page.screenshot({ path: `shots/login-${name}.png` });
  await page.screenshot({ path: `shots/login-${name}-full.png`, fullPage: true });
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await setup(ctx); await open(page);
  await page.screenshot({ path: 'shots/d-home.png' });
  await page.getByText('PREMIUM TRADINGVIEW').first().click().catch(() => {}); await page.waitForTimeout(12000);
  await page.screenshot({ path: 'shots/d-premium.png' });
  await page.locator('[aria-label="Announcements"]').first().click().catch(() => {}); await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/d-announce.png' });
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
