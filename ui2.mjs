import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const user = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'ADMIN', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID', isDeveloper: true };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, user);
await page.goto(B, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000);
const txt = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
async function click(label) { const l = page.getByText(label, { exact: false }).first(); if (await l.count()) { await l.click({ timeout: 8000 }); console.log('clicked', label); return true; } console.log('not found', label); return false; }
await page.screenshot({ path: 'shots/a0.png' });
await click('UNLIMITED CHART ANALYSIS'); await page.waitForTimeout(20000);
await page.screenshot({ path: 'shots/a1-charts.png' });
const t1 = await txt(); const i = t1.search(/Dukascopy|Binance|Yahoo|error|Error/); console.log('CHART STATUS:', t1.slice(Math.max(0, i - 200), i + 400));
// Bar Replay
await click('BACKTESTING'); await page.waitForTimeout(20000);
await page.screenshot({ path: 'shots/a2-backtest.png' });
const t2 = await txt(); const k = t2.search(/Replay/); console.log('BACKTEST:', t2.slice(Math.max(0, k - 100), k + 600));
console.log('CONSOLE ERRORS', errors.length); errors.slice(0, 25).forEach((e) => console.log('  ', e));
await browser.close();
