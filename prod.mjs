import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const user = { id: 'dev-owner-master', name: 'Probe', username: 'probe', role: 'CUSTOMER', subscriptionStatus: 'LIFETIME', isLifetime: true, paymentStatus: 'PAID', hasCompletedOnboarding: true };
const ctx = await (await chromium.launch()).newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addCookies([{ name: 'primepipfx_session', value: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', domain: 'prime-pip-command-center-level.vercel.app', path: '/', secure: true }]);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));

page.on('requestfailed', (r) => console.log('REQFAIL', r.url().slice(0, 160), r.failure()?.errorText));
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('tradingview')) console.log('HTTP', r.status(), r.url().slice(0, 160)); });
await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'probe'); } catch {} }, user);
await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000);
for (let i = 0; i < 3; i++) { for (const t of ['ENTER COMMAND CENTER', 'Start Practice', 'Create Demo Account']) await page.getByText(t).first().click({ timeout: 1200 }).catch(() => {}); await page.waitForTimeout(800); }
await page.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
const nav = async (l) => page.evaluate((l) => { const el = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').toUpperCase().includes(l)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, l);
const txt = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
for (const [label, name] of [['UNLIMITED CHART ANALYSIS', 'charts'], ['BACKTESTING', 'backtest'], ['FUNDAMENTAL INDICATORS', 'fundamentals'], ['LIVE NEWS CALENDAR', 'calendar'], ['TRADER COMMUNITY FEED', 'community'], ['PREMIUM TRADINGVIEW', 'premium']]) {
  console.log('==== OPEN', label, await nav(label));
  await page.waitForTimeout(15000);
  const t = await txt();
  const loading = (t.match(/[^.]{0,40}(Loading|loading)[^.]{0,60}/g) || []).slice(0, 4);
  console.log('STATE', name, '| loading texts:', JSON.stringify(loading), '| errors:', JSON.stringify((t.match(/[^.]{0,30}(error|Error|failed|unavailable)[^.]{0,60}/g) || []).slice(0, 4)));
  await page.screenshot({ path: `shots/prod-${name}.png` });
}
process.exit(0);
