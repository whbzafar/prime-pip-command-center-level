import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const user = { id: 'dev-owner-master', name: 'PrimePipFX Developer / Owner', username: 'primepipfx-admin', role: 'ADMIN', isDeveloper: true, subscriptionStatus: 'LIFETIME', isLifetime: true, paymentStatus: 'PAID', hasCompletedOnboarding: true };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
await ctx.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); } catch {} }, user);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200), (e.stack || '').split('\n').slice(1, 4).join(' | ').slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error' && /null|undefined|reading/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 400)); });
await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000);
for (let i = 0; i < 3; i++) { for (const t of ['ENTER COMMAND CENTER', 'Start Practice', 'Create Demo Account']) await page.getByText(t).first().click({ timeout: 1200 }).catch(() => {}); await page.waitForTimeout(800); }
await page.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
await page.evaluate(() => window.dispatchEvent(new CustomEvent('ppfx:open-chart', { detail: { symbol: 'EURUSD' } }))); await page.waitForTimeout(9000);
const cats = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter((t) => /^(Forex|Indices|Commodities|Top Stocks|Top Crypto|.*Fundamentals)\b/.test(t) && t.length < 40));
console.log('CATS', JSON.stringify(cats));
for (const c of cats) {
  await page.getByRole('button', { name: c, exact: true }).first().click({ timeout: 3000 }).catch((e) => console.log('noclick', c));
  await page.waitForTimeout(2500);
  const t = (await page.locator('body').innerText());
  console.log('CAT', c, '->', /PREMIUM TRADINGVIEW NOTICE/.test(t) ? 'CRASH: ' + (t.match(/NOTICE\s*\n([^\n]+)/) || [])[1] : 'ok');
  if (/NOTICE/.test(t)) { await page.getByText('Reset & Reload Terminal').click().catch(() => {}); await page.waitForTimeout(4000); }
}
// announcements important
await page.getByRole('button', { name: 'Announcements' }).click().catch(() => {}); await page.waitForTimeout(2000);
await page.getByText(/^Important/).first().click().catch(() => {}); await page.waitForTimeout(2000);
console.log('ANN important body len', (await page.locator('body').innerText()).length);
process.exit(0);
