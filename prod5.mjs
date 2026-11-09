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
const txt = async () => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
const api = await p.evaluate(async () => { const a = await (await fetch('/api/announcements')).json(); const w = await fetch('/api/announcements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'probe' }) }); return { count: a.announcements?.length, titles: (a.announcements || []).map((x) => x.title), postStatus: w.status }; });
console.log('API announcements:', JSON.stringify(api));
await p.getByRole('button', { name: 'Announcements' }).click().catch(() => {}); await p.waitForTimeout(2000);
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().startsWith('Important')); b?.click(); }); await p.waitForTimeout(2000);
console.log('ANN has VIP SIGNAL text:', /VIP SIGNAL/.test(await txt())); await p.screenshot({ path: 'shots/x-ann-important.png' });
await p.keyboard.press('Escape'); await p.mouse.click(5, 5);
await nav('10. PREMIUM TRADINGVIEW'); await p.waitForTimeout(12000);
for (const tf of [0, 1]) {
  const cd = p.locator('[data-testid="candle-countdown"]');
  console.log('COUNTDOWN', tf, await cd.count(), (await cd.first().innerText().catch(() => '')).replace(/\s+/g, ' '));
  await p.waitForTimeout(2200);
  console.log('COUNTDOWN later', tf, (await cd.first().innerText().catch(() => '')).replace(/\s+/g, ' '));
}
await p.screenshot({ path: 'shots/x-premium-countdown.png' });
const box = await p.locator('[data-testid="candle-countdown"]').first().boundingBox().catch(() => null);
if (box) await p.screenshot({ path: 'shots/x-countdown-zoom.png', clip: { x: Math.max(0, box.x - 500), y: Math.max(0, box.y - 200), width: 560, height: 420 } });
process.exit(0);
