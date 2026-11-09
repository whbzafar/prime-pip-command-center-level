import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';
const B = 'http://localhost:3000';
const T = JSON.parse(fs.readFileSync('/tmp/tokens.json', 'utf8'));
const browser = await chromium.launch();
const shot = (p, n) => p.screenshot({ path: `shots/${n}.png` });
const U = 'trialuser' + Math.floor(Math.random() * 1000);

// 1) brand-new visitor: surprise announcement
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
await p.goto(B, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(7000);
console.log('TRIAL modal:', await p.locator('[data-testid="trial-modal"]').count(), 'countdown:', (await p.locator('[data-testid="trial-countdown"]').innerText().catch(() => '')).replace(/\s+/g, ' '));
console.log('INSTALL button:', await p.locator('[data-testid="install-app-btn"]').count());
await shot(p, 'w1-trial-modal');
await p.locator('[data-testid="trial-signup-btn"]').click(); await p.waitForTimeout(1500);
await shot(p, 'w2-signup');
await p.getByPlaceholder('e.g. ali_trader').fill(U);
await p.getByPlaceholder('At least 6 characters').fill('secret123');
await p.locator('[data-testid="signup-confirm"]').fill('secret123');
await p.getByRole('button', { name: /CREATE ACCOUNT & ENTER/ }).click();
await p.waitForTimeout(9000);
for (let i = 0; i < 3; i++) for (const t of ['Start Practice', 'Create Demo Account']) { await p.getByText(t).first().click({ timeout: 1200 }).catch(() => {}); await p.waitForTimeout(800); }
await p.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
console.log('SIGNED IN as:', await p.evaluate(() => JSON.parse(localStorage.getItem('primepipfx_user_profile') || '{}').username));
await shot(p, 'w3-after-signup');
// psych center unlocked?
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Psych Center/i.test(x.innerText)); b?.click(); }); await p.waitForTimeout(4000);
console.log('PSYCH locked modal:', /Subscription Required|Category Locked/.test(await p.locator('body').innerText()));
await shot(p, 'w4-psych');
// meta5 still locked
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /13\. META 5/.test(x.innerText)); b?.scrollIntoView(); b?.click(); }); await p.waitForTimeout(2000);
console.log('META5 locked:', /Category Locked|locked/i.test(await p.locator('body').innerText()));
await p.keyboard.press('Escape');
// TradingView mode tools
await p.evaluate(() => { window.dispatchEvent(new CustomEvent('ppfx:open-chart', { detail: { symbol: 'EURUSD' } })); }); await p.waitForTimeout(4000);
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'TradingView'); b?.click(); }); await p.waitForTimeout(12000);
console.log('TV tools:', await p.locator('[data-testid="tv-chart-tools"]').count(), (await p.locator('[data-testid="tv-countdown"]').innerText().catch(() => '')).replace(/\s+/g, ' '));
await p.locator('[data-testid="tv-alert-btn"]').click().catch(() => {}); await p.waitForTimeout(6000);
console.log('TV alert price prefill:', await p.locator('[data-testid="tv-alert-price"]').inputValue().catch(() => ''));
await p.locator('[data-testid="tv-alert-create"]').click().catch(() => {}); await p.waitForTimeout(800);
console.log('alerts stored:', await p.evaluate(() => (JSON.parse(localStorage.getItem('ppfx_price_alerts_v1') || '[]')).length));
await p.locator('iframe[src*="tradingview"]').first().scrollIntoViewIfNeeded().catch(() => {});
await shot(p, 'w5-tv-tools');

// 2) restart server with the local user file wiped → the new account must still sign in (from Redis)
execSync("pkill -f 'dist/server.cjs' || true; sleep 1; cd app && git checkout -- data/users.json 2>/dev/null; git -C app status --short data | head -3; (KV_REST_API_URL=http://localhost:8799 KV_REST_API_TOKEN=t PORT=3000 nohup node dist/server.cjs > /tmp/server2.log 2>&1 &) ; sleep 10", { stdio: 'inherit', shell: '/bin/bash' });
const localHas = fs.readFileSync('app/data/users.json', 'utf8').includes(U);
const r = await (await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: U, password: 'secret123' }) })).json();
console.log('AFTER RESTART local file had user before login:', localHas, '→ login ok:', r.ok, r.user?.username);
const bad = await (await fetch(B + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: U, password: 'xxxxxx1' }) })).json();
console.log('duplicate signup rejected:', !bad.ok, bad.error);

// 3) admin Members panel + remove
const A = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await A.addCookies([{ name: 'primepipfx_session', value: T.admin.token, domain: 'localhost', path: '/' }]);
await A.addInitScript(([t, u]) => { localStorage.setItem('primepipfx_session_token', t); localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('ppfx_trial_seen_open-trial-2026-11', '1'); }, [T.admin.token, T.admin.user]);
const ap = await A.newPage();
ap.on('pageerror', (e) => console.log('ADMIN PAGEERROR', e.message.slice(0, 200)));
const mem = await ap.goto(B + '/api/admin/members').then((x) => x.json()).catch(() => null);
console.log('MEMBERS api:', mem?.ok, 'count', mem?.members?.length, 'has new user', mem?.members?.some((m) => m.username === U && m.signupSource === 'self'), 'logins', mem?.logins?.length, 'storage', JSON.stringify(mem?.storage));
await ap.goto(B, { waitUntil: 'domcontentloaded' }); await ap.waitForTimeout(7000);
await ap.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
await ap.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /ADMIN/.test(x.innerText) && /PANEL|ADMIN/.test(x.innerText)); b?.scrollIntoView(); b?.click(); }); await ap.waitForTimeout(5000);
console.log('members panel visible:', await ap.locator('[data-testid="members-panel"]').count());
await shot(ap, 'w6-admin-members');
const del = await ap.evaluate(async (u) => { const t = localStorage.getItem('primepipfx_session_token'); const m = (await (await fetch('/api/admin/members', { headers: { Authorization: 'Bearer ' + t } })).json()).members.find((x) => x.username === u); const r = await fetch('/api/admin/customers/' + m.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + t } }); return r.status; }, U);
const r2 = await (await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: U, password: 'secret123' }) })).json();
console.log('REMOVE status', del, '→ removed user can login:', r2.ok);
process.exit(0);
