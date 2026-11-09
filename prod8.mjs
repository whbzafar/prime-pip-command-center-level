import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const user = { id: 'probe-user', name: 'Probe Trader', username: 'probe', role: 'CUSTOMER', subscriptionStatus: 'LIFETIME', isLifetime: true, paymentStatus: 'PAID', hasCompletedOnboarding: true };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
await ctx.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('ppfx_premium_engine', 'tv'); } catch {} }, user);
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
await p.goto(B, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(7000);
for (let i = 0; i < 3; i++) { for (const t of ['ENTER COMMAND CENTER', 'Start Practice', 'Create Demo Account']) await p.getByText(t).first().click({ timeout: 1200 }).catch(() => {}); await p.waitForTimeout(800); }
await p.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
const nav = async (l) => { await p.keyboard.press('Escape').catch(() => {}); const ok = await p.evaluate((l) => { const el = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim().toUpperCase().startsWith(l)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, l); if (!ok) console.log('NAV miss', l); await p.waitForTimeout(600); };
await nav('10. PREMIUM TRADINGVIEW'); await p.waitForTimeout(15000);
const fr = p.frames().find((f) => /tradingview/.test(f.url()));
console.log('TV frame:', fr ? fr.url().slice(0, 120) : 'none');
const ifr = p.locator('iframe[src*="tradingview"]').first();
await ifr.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
const b = await ifr.boundingBox();
console.log('iframe box', JSON.stringify(b));
await p.mouse.click(b.x + b.width - 30, b.y + b.height * 0.4, { button: 'right' }); await p.waitForTimeout(1500);
await p.screenshot({ path: 'shots/t1-scale-menu.png' });
const items = fr ? await fr.evaluate(() => [...document.querySelectorAll('[class*="menu"] [class*="label"], [data-name="menu-inner"] *')].map((e) => e.textContent?.trim()).filter((t) => t && t.length < 50).slice(0, 60)) : [];
console.log('MENU', JSON.stringify([...new Set(items)]));
const cd = fr ? await fr.getByText(/Countdown/i).count() : -1;
console.log('countdown entries:', cd);
if (cd > 0) { await fr.getByText(/Countdown/i).first().click().catch((e) => console.log('click', e.message.slice(0, 80))); await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/t2-after.png' }); }
// try labels submenu
const lab = fr ? await fr.getByText(/^Labels$/).count() : 0;
console.log('labels entries:', lab);
if (lab) { await fr.getByText(/^Labels$/).first().hover(); await p.waitForTimeout(1200); await p.screenshot({ path: 'shots/t3-labels.png' }); console.log('countdown after labels:', await fr.getByText(/Countdown/i).count()); }
console.log('frame ls keys:', fr ? await fr.evaluate(() => { try { return Object.keys(localStorage).join(','); } catch (e) { return 'err ' + e; } }) : '');
process.exit(0);
