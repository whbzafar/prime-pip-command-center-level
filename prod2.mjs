import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const user = { id: 'probe-user', name: 'Probe Trader', username: 'probe', role: 'CUSTOMER', subscriptionStatus: 'LIFETIME', isLifetime: true, paymentStatus: 'PAID', hasCompletedOnboarding: true };
const browser = await chromium.launch();
async function session(vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
  await ctx.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); } catch {} }, user);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000);
  for (let i = 0; i < 3; i++) { for (const t of ['ENTER COMMAND CENTER', 'Start Practice', 'Create Demo Account']) await page.getByText(t).first().click({ timeout: 1200 }).catch(() => {}); await page.waitForTimeout(800); }
  await page.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
  return page;
}
const nav = async (p, l) => { await p.keyboard.press('Escape').catch(() => {}); const ok = await p.evaluate((l) => { const bs = [...document.querySelectorAll('button')]; const el = bs.find((b) => (b.innerText || '').trim().toUpperCase().startsWith(l)) || bs.find((b) => (b.innerText || '').trim().toUpperCase().replace(/^\d+\.\s*/, '').startsWith(l.replace(/^\d+\.\s*/, ''))); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, l); if (!ok) console.log('NAV miss', l); await p.waitForTimeout(500); await p.evaluate(() => { const c = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim() === 'Close'); if (c && document.body.innerText.includes('Explore All Categories')) c.click(); }); };
const txt = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
const p = await session({ width: 1440, height: 1000 });
await nav(p, '01. DASHBOARD'); await p.waitForTimeout(6000);
await p.screenshot({ path: 'shots/v-dashboard.png' });
let t = await txt(p); console.log('DASH coach:', /Next trade · risk coach/i.test(t), '| longterm live:', /Long-Term \(live Fundamentals ranking\)|Top Long-Term/i.test(t));
await p.getByRole('button', { name: 'Announcements' }).click({ timeout: 8000 }).catch((e) => console.log('noann', e.message.slice(0, 60))); await p.waitForTimeout(2500);
await p.screenshot({ path: 'shots/v-announce.png' });
console.log('ANN:', ((await txt(p)).match(/Long-term bullish[^|]{0,120}/) || ['none'])[0]);
await p.getByRole('button', { name: 'Announcements' }).click({ timeout: 3000 }).catch(() => {});
await nav(p, 'LIVE NEWS CALENDAR'); await p.waitForTimeout(9000);
await p.screenshot({ path: 'shots/v-calendar.png' });
await p.getByText('Breaking News').first().click(); await p.waitForTimeout(6000);
await p.screenshot({ path: 'shots/v-breaking.png' });
await p.locator('button:has-text("HIGH")').first().click().catch(() => {}); await p.waitForTimeout(1500);
await p.screenshot({ path: 'shots/v-breaking-open.png' });
await p.keyboard.press('Escape'); await p.mouse.click(10, 10);
await nav(p, 'COMPOUNDING'); await p.waitForTimeout(4000);
t = await txt(p); console.log('COMP recovery present:', /LOSS RECOVERY/i.test(t), '| reality check:', /Reality check/i.test(t));
await p.locator('text=Reality check').first().scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: 'shots/v-compounding.png' });
await nav(p, '05. RISK MANAGEMENT'); await p.waitForTimeout(3000);
t = await txt(p); console.log('RISK instant calc present:', /Instant Position|POSITION & LOT SIZE CALCULATOR/i.test(t), '| ladder:', /Risk ladder/i.test(t));
await p.locator('text=Risk ladder').first().scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: 'shots/v-risk.png' });
await nav(p, '11. BACKTESTING'); await p.waitForTimeout(6000);
await p.getByRole('button', { name: /Start replay|Load replay/ }).first().click().catch(() => {}); await p.waitForTimeout(9000);
await p.getByRole('button', { name: /^BUY \(B\)/ }).first().click().catch((e) => console.log('nobuy', e.message.slice(0, 80))); await p.waitForTimeout(2500);
await p.locator('canvas').first().scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: 'shots/v-backtest.png' });
// mobile
const m = await session({ width: 390, height: 844 });
await nav(m, '01. DASHBOARD'); await m.waitForTimeout(6000);
await m.screenshot({ path: 'shots/v-mobile-dash.png', fullPage: false });
await m.evaluate(() => window.scrollBy(0, 700)); await m.waitForTimeout(800); await m.screenshot({ path: 'shots/v-mobile-dash2.png' });
process.exit(0);
