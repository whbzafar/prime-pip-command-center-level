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
const h = await p.evaluate(async () => { const t0 = Date.now(); try { const r = await fetch('/api/history/candles?src=duka&id=gbpjpy&tf=h1&before=' + Date.now() + '&count=300'); const j = await r.json(); return { ms: Date.now() - t0, status: r.status, n: (j.candles || j.bars || j.data || []).length, keys: Object.keys(j).join(',') }; } catch (e) { return { err: String(e) }; } });
console.log('GBPJPY history:', JSON.stringify(h));
await nav('10. PREMIUM TRADINGVIEW'); await p.waitForTimeout(9000);
// apply first indicator chip if any
const chips = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.title === 'Click to apply on the chart').map((b) => b.innerText.trim()));
console.log('CHIPS', JSON.stringify(chips));
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((b) => b.title === 'Click to apply on the chart'); b?.click(); });
await p.waitForTimeout(20000);
await p.screenshot({ path: 'shots/y-premium-ind.png' });
const legend = await p.evaluate(() => document.body.innerText.match(/Prime Pip[^\n]*/g));
console.log('LEGEND', JSON.stringify(legend));
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Full-Screen/.test(x.innerText)); b?.click(); }); await p.waitForTimeout(6000);
await p.screenshot({ path: 'shots/y-fullscreen.png' });
const top = await p.evaluate(() => { const els = document.elementsFromPoint(window.innerWidth - 60, 20); return els.slice(0, 5).map((e) => e.tagName + '.' + String(e.className).slice(0, 60)); });
console.log('TOPRIGHT', JSON.stringify(top));
process.exit(0);
