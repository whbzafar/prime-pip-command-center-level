import { chromium } from 'playwright';
import fs from 'fs';
const B = 'http://localhost:3000';
const T = JSON.parse(fs.readFileSync('/tmp/tokens.json', 'utf8'));
const SECRET = 'mySecretFactor';
const SRC = `//@version=5
indicator("PPFX Private Trend", overlay=true)
${SECRET} = 1.0
fast = ta.ema(close, 9) * ${SECRET}
slow = ta.ema(close, 21)
plot(fast, "Fast", color.aqua, 2)
plot(slow, "Slow", color.orange, 2)
plotshape(ta.crossover(fast, slow), "Buy", shape.triangleup, location.belowbar, color.lime, size=size.small)
`;
const browser = await chromium.launch();
const leaks = [];
async function ctxFor(who) {
  const { token, user } = T[who];
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addCookies([{ name: 'primepipfx_session', value: token, domain: 'localhost', path: '/' }]);
  await ctx.addInitScript(([t, u]) => { try { localStorage.setItem('primepipfx_session_token', t); localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); } catch {} }, [token, user]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${who}] PAGEERROR`, e.message.slice(0, 200)));
  if (who === 'student') page.on('response', async (r) => { if (!r.url().includes('/api/')) return; try { const b = await r.text(); if (b.includes(SECRET)) leaks.push(r.url()); } catch {} });
  return { ctx, page };
}
const txt = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
const shot = (p, n) => p.screenshot({ path: `shots/${n}.png` });
async function clickNav(p, label) {
  const ok = await p.evaluate((l) => { const el = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').toUpperCase().includes(l)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, label);
  if (!ok) console.log('NAV not found', label);
}
async function openPremium(p) {
  await p.goto(B, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) {
    await p.getByText('ENTER COMMAND CENTER').first().click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(800);
    await p.getByText('Start Practice').first().click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(600);
    await p.getByText('Create Demo Account').first().click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(1200);
  }
  await p.evaluate(() => document.getElementById('onboarding-welcome-modal')?.remove());
  await p.evaluate(() => { sessionStorage.setItem('ppfx_pending_chart', 'EURUSD'); window.dispatchEvent(new CustomEvent('ppfx:open-chart', { detail: { symbol: 'EURUSD' } })); });
  await p.waitForTimeout(9000);
  await shot(p, 'premium-' + Date.now());
}

// ── ADMIN: publish a script and apply it on the main chart
const A = await ctxFor('admin');
await openPremium(A.page);
console.log('ADMIN lib fetch:', await A.page.evaluate(async () => { const t = localStorage.getItem('primepipfx_session_token'); const r = await fetch('/api/pine/scripts', { credentials: 'include', headers: t ? { Authorization: 'Bearer ' + t } : {} }); return r.status + ' ' + (await r.text()).slice(0, 200) + ' | tokenKey=' + Boolean(t); }));
const indBtnNextToHistory = await A.page.getByRole('button', { name: /^Indicators \(\d+\)$/ }).count();
console.log('OLD "Indicators (n)" button next to Trade History present:', indBtnNextToHistory > 0);
await A.page.getByRole('button', { name: /Pine Editor/ }).first().click(); await A.page.waitForTimeout(5000);
console.log('ADMIN editor visible:', await A.page.locator('[aria-label="Pine Script editor"]').count() > 0);
await A.page.locator('[aria-label="Pine Script editor"]').fill(SRC);
await A.page.getByRole('button', { name: /Save & publish/ }).click(); await A.page.waitForTimeout(4000);
console.log('ADMIN publish msg:', ((await txt(A.page)).match(/Published “[^”]+”[^.]*\.|Storage warning[^.]*\./) || ['(none)'])[0]);
await A.page.getByRole('button', { name: /^Show$/ }).first().click(); await A.page.waitForTimeout(20000);
let t = await txt(A.page);
console.log('ADMIN strip:', (t.match(/\d+ indicators? on the chart/) || ['(no strip)'])[0], '| status:', (t.match(/“PPFX Private Trend” is on the chart\.|Line \d+:[^|]{0,120}/) || ['(no status)'])[0]);
await A.page.locator('text=indicator on the chart').first().scrollIntoViewIfNeeded().catch(() => {}); await shot(A.page, 'admin-main-chart');
await A.page.getByRole('button', { name: /^GBP\/USD/ }).first().click().catch(() => console.log('no GBP chip')); await A.page.waitForTimeout(15000);
t = await txt(A.page); console.log('ADMIN after pair switch:', (t.match(/\d+ indicators? on the chart/) || ['(no strip)'])[0], (t.match(/“PPFX Private Trend” is on the chart\./) || ['(status gone)'])[0]);
await shot(A.page, 'admin-after-switch');
// Hub post from admin
await clickNav(A.page, 'TRADER COMMUNITY FEED'); await A.page.waitForTimeout(4000);
await A.page.getByPlaceholder(/announcement/).fill('Welcome to the Hub — E2E admin post'); await A.page.getByText('Pin to top').click().catch(() => {});
await A.page.getByRole('button', { name: /^Post$/ }).click(); await A.page.waitForTimeout(3000);

// ── STUDENT: Show/Hide only, code never received
const S = await ctxFor('student');
await openPremium(S.page);
await S.page.getByRole('button', { name: /^Indicators$/ }).first().click(); await S.page.waitForTimeout(4000);
console.log('STUDENT editor visible:', await S.page.locator('[aria-label="Pine Script editor"]').count() > 0, '| Open .pine visible:', await S.page.getByText('Open .pine').count() > 0);
t = await txt(S.page); console.log('STUDENT list:', (t.match(/Indicators Show applies[^|]{0,40}|PPFX Private Trend[^|]{0,60}/) || ['(empty)'])[0]);
await S.page.getByRole('button', { name: /^Show$/ }).first().click(); await S.page.waitForTimeout(25000);
t = await txt(S.page); console.log('STUDENT strip:', (t.match(/\d+ indicators? on the chart/) || ['(no strip)'])[0], '| status:', (t.match(/“PPFX Private Trend” is on the chart\.|The indicator[^|]{0,120}|Could not[^|]{0,120}/) || ['(no status)'])[0]);
await shot(S.page, 'student-main-chart');
const put = await S.page.evaluate(async (src) => (await fetch('/api/pine/scripts', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: src }) })).status, SRC);
const list = await S.page.evaluate(async () => (await fetch('/api/pine/scripts', { credentials: 'include' })).text());
console.log('STUDENT PUT status:', put, '| list contains source:', list.includes('ta.ema'));
await S.page.reload(); await S.page.waitForTimeout(6000);
await S.page.evaluate(() => window.dispatchEvent(new CustomEvent('ppfx:open-chart', { detail: { symbol: 'EURUSD' } }))); await S.page.waitForTimeout(20000);
t = await txt(S.page); console.log('STUDENT after reload:', (t.match(/\d+ indicators? on the chart/) || ['(no strip)'])[0]);
await S.page.getByRole('button', { name: /^Hide all$/ }).first().click().catch(() => {}); await S.page.waitForTimeout(3000);
t = await txt(S.page); console.log('STUDENT after Hide all strip present:', /indicators? on the chart/.test(t), '| TradingView iframe:', await S.page.locator('iframe[title*="TradingView"]').count());
// Hub as student
await clickNav(S.page, 'TRADER COMMUNITY FEED'); await S.page.waitForTimeout(5000);
t = await txt(S.page); console.log('STUDENT sees admin post:', t.includes('Welcome to the Hub — E2E admin post'), '| admin badge:', /Test Admin\s*Admin/.test(t), '| pinned:', t.includes('Pinned'));
await S.page.getByPlaceholder(/Share an idea/).fill('Hello from a student (E2E)'); await S.page.getByRole('button', { name: /^Post$/ }).click(); await S.page.waitForTimeout(2500);
await shot(S.page, 'student-hub');
await A.page.waitForTimeout(4000); t = await txt(A.page); console.log('ADMIN sees student post (auto-refresh):', t.includes('Hello from a student (E2E)'), '| with name:', t.includes('Test Student'));
await shot(A.page, 'admin-hub');
// Friends + private messages (API level)
const ids = { a: T.admin.user.id, s: T.student.user.id };
const fr = await S.page.evaluate(async (rid) => { const r = await fetch('/api/friends/request', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: rid }) }); return r.status + ' ' + (await r.text()).slice(0, 160); }, ids.a);
console.log('FRIEND request:', fr);
const reqs = await A.page.evaluate(async () => (await fetch('/api/friends/list', { credentials: 'include' })).text());
console.log('ADMIN friends/list:', reqs.slice(0, 300));
console.log('LEAKS of source to the student browser:', leaks.length ? leaks : 'none');
await browser.close();
