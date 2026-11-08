import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const user = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'ADMIN', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID', isDeveloper: true };
const ctx = await (await chromium.launch()).newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
await page.addInitScript((u) => {
  try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {}
  window.__tvmsgs = [];
  window.addEventListener('message', (e) => { if (String(e.origin).includes('tradingview')) window.__tvmsgs.push(typeof e.data === 'string' ? e.data.slice(0, 400) : JSON.stringify(e.data).slice(0, 400)); });
}, user);
await page.goto(B, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
await page.getByText('Start Practice').first().click().catch(() => {}); await page.waitForTimeout(800); await page.getByText('Create Demo Account').first().click().catch(() => {}); await page.waitForTimeout(3000);
await page.getByText('PREMIUM TRADINGVIEW').first().click(); await page.waitForTimeout(15000);
console.log('MSGS before:', JSON.stringify(await page.evaluate(() => window.__tvmsgs.slice(0, 15))));
await page.evaluate(() => { window.__tvmsgs = []; });
const fr = page.frameLocator('iframe[title*="TradingView"]');
await fr.getByText('30m', { exact: true }).first().click({ timeout: 10000 }).catch((e) => console.log('click30 fail', e.message.slice(0, 80)));
await page.waitForTimeout(4000);
console.log('MSGS after 30m click:', JSON.stringify(await page.evaluate(() => window.__tvmsgs.slice(0, 15))));
await page.evaluate(() => { window.__tvmsgs = []; });
await fr.getByText('1m', { exact: true }).first().click({ timeout: 10000 }).catch((e) => console.log('click1m fail', e.message.slice(0, 80)));
await page.waitForTimeout(4000);
console.log('MSGS after 1m click:', JSON.stringify(await page.evaluate(() => window.__tvmsgs.slice(0, 15))));
process.exit(0);
