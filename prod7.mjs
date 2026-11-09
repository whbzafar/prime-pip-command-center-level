import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const user = { id: 'probe-user', name: 'Probe Trader', username: 'probe', role: 'CUSTOMER', subscriptionStatus: 'LIFETIME', isLifetime: true, paymentStatus: 'PAID', hasCompletedOnboarding: true };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
await ctx.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); } catch {} }, user);
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
await p.goto(B, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(7000);
for (let i = 0; i < 3; i++) { for (const t of ['ENTER COMMAND CENTER', 'Start Practice', 'Create Demo Account']) await p.getByText(t).first().click({ timeout: 1200 }).catch(() => {}); await p.waitForTimeout(800); }
await p.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
const nav = async (l) => { await p.keyboard.press('Escape').catch(() => {}); const ok = await p.evaluate((l) => { const el = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim().toUpperCase().startsWith(l)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, l); if (!ok) console.log('NAV miss', l); await p.waitForTimeout(600); };
await p.waitForTimeout(120000); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
await p.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
await nav('10. PREMIUM TRADINGVIEW'); await p.waitForTimeout(16000);
const ov = p.locator('[data-testid="price-alert-overlay"]').first();
console.log('PROD pro chart overlay:', await ov.count());
await ov.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(2000);
await p.screenshot({ path: 'shots/p-premium.png' });
for (const s of ['GBPJPY', 'XAUUSD', 'BTCUSDT']) {
  await p.evaluate((s) => window.dispatchEvent(new CustomEvent('ppfx:open-chart', { detail: { symbol: s } })), s); await p.waitForTimeout(14000);
  console.log('PROD', s, 'loading text:', /Loading [A-Z]+ chart/.test(await p.locator('body').innerText()));
  await ov.scrollIntoViewIfNeeded().catch(() => {});
  await p.screenshot({ path: `shots/p-${s}.png` });
}
const n = await p.evaluate(async () => { const j = await (await fetch('/api/news/breaking')).json(); return (j.items || []).filter((x) => /&lt;|<a /.test(x.summary)).length + ' html of ' + (j.items || []).length; });
console.log('PROD news summaries with html:', n);
process.exit(0);
