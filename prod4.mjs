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
// 1 announcements
await p.getByRole('button', { name: 'Announcements' }).click().catch(() => {}); await p.waitForTimeout(2000);
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().startsWith('Important')); b?.click(); }); await p.waitForTimeout(2000);
console.log('ANN important ok:', (await txt()).length > 200); await p.screenshot({ path: 'shots/w-ann-important.png' });
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().startsWith('Alerts')); b?.click(); }); await p.waitForTimeout(1000);
console.log('ANN interval select:', await p.locator('select').filter({ hasText: '3 hours' }).count()); await p.screenshot({ path: 'shots/w-ann-alerts.png' });
await p.getByRole('button', { name: 'Announcements' }).click().catch(() => {});
// 2 premium
await p.evaluate(() => window.dispatchEvent(new CustomEvent('ppfx:open-chart', { detail: { symbol: 'EURUSD' } }))); await p.waitForTimeout(9000);
let t = await txt();
console.log('PREMIUM removed — balance:', !/ACCOUNT BALANCE/i.test(t), '| buy/sell:', !/SELL \d/.test(t), '| lots:', !/LOTS:/.test(t), '| projection:', !/Projection Lines/.test(t), '| FX feed:', !/Official Direct Feed/.test(t), '| fund badge:', !/Fundamentals:\s*(MILD|STRONG|NEUTRAL)/i.test(t));
const cats = await p.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText.trim().split('\n')[0]).filter((x) => /^(Forex|Indices|Commodities|Top Stocks|Top Crypto|⚡ Fundamentals)/.test(x)));
for (const c of cats) { await p.evaluate((c) => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().split('\n')[0] === c); b?.click(); }, c); await p.waitForTimeout(1800); const tt = await txt(); console.log('CAT', c, /PREMIUM TRADINGVIEW NOTICE/.test(tt) ? 'CRASH ' + (tt.match(/NOTICE (.{0,80})/) || [])[1] : 'ok'); }
await p.screenshot({ path: 'shots/w-premium.png' });
// 3 psychology
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Psych Center/.test(x.innerText)); b?.click(); }); await p.waitForTimeout(4000);
t = await txt(); console.log('PSY check-in:', /How do you feel right now/.test(t), '| calm60:', /Calm in 60 seconds/.test(t));
await p.screenshot({ path: 'shots/w-psych.png' });
await p.getByText('Scared to enter or hold').first().click().catch(() => {}); await p.waitForTimeout(2500);
t = await txt(); console.log('PSY guide:', /Mind guide/i.test(t), /Do this now/i.test(t));
await p.screenshot({ path: 'shots/w-psych-fear.png' });
await p.getByRole('button', { name: /Expert & science/ }).click().catch(() => {}); await p.waitForTimeout(800); await p.screenshot({ path: 'shots/w-psych-expert.png' });
await p.getByRole('button', { name: /Start guided session/ }).click().catch(() => {}); await p.waitForTimeout(1000);
await p.getByRole('button', { name: /^Begin/ }).click().catch(() => {}); await p.waitForTimeout(3500); await p.screenshot({ path: 'shots/w-psych-session.png' });
await p.keyboard.press('Escape'); await p.getByRole('button', { name: 'Close' }).first().click().catch(() => {});
// 4 compounding, community, backtest
await nav('12. COMPOUNDING'); await p.waitForTimeout(3000); await p.screenshot({ path: 'shots/w-comp.png' });
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /REAL DATA COMPARISON/i.test(x.innerText)); b?.click(); }); await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/w-comp-real.png' });
await nav('20. TRADER COMMUNITY'); await p.waitForTimeout(1500); console.log('COMMUNITY locked:', /Coming soon/i.test(await txt())); await p.screenshot({ path: 'shots/w-community.png' });
await nav('11. BACKTESTING'); await p.waitForTimeout(5000);
await p.getByRole('button', { name: /Start replay/ }).first().click().catch(() => {}); await p.waitForTimeout(9000);
await p.getByRole('button', { name: /^BUY \(B\)/ }).first().click().catch(() => {}); await p.waitForTimeout(2500);
console.log('BT back-to-now btn:', await p.getByRole('button', { name: 'Back to the latest bar' }).count());
await p.locator('canvas').first().scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: 'shots/w-backtest.png' });
process.exit(0);
