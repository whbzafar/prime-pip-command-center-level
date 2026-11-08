import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const user = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'ADMIN', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID', isDeveloper: true };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/401/.test(m.text())) errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, user);
await page.goto(B, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
const click = async (label, exact = false) => { const l = page.getByText(label, { exact }).first(); if (await l.count()) { await l.click({ timeout: 8000 }).catch((e) => console.log('clickfail', label, e.message.slice(0, 60))); console.log('clicked', label); return true; } console.log('NOT FOUND', label); return false; };
const shot = async (n) => { await page.screenshot({ path: `shots/${n}.png` }); };
const txt = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
await click('Start Practice'); await page.waitForTimeout(1200); await click('Create Demo Account'); await page.waitForTimeout(3000);
// close any notice popups
for (const d of await page.getByText('Dismiss', { exact: true }).all()) await d.click().catch(() => {});

// Fundamentals → Sentiment, Rankings
await click('FUNDAMENTAL INDICATORS'); await page.waitForTimeout(9000);
await click('Top Bullish / Bearish', true); await page.waitForTimeout(6000); await shot('f1-rankings');
await page.mouse.wheel(0, 1200); await page.waitForTimeout(800); await shot('f2-matrix');
await page.mouse.wheel(0, -3000);
await click('Sentiment', true); await page.waitForTimeout(8000); await shot('f3-sentiment');
let t = await txt(); let i = t.indexOf('Live trader sentiment'); console.log('SENT:', t.slice(i, i + 700));

// Premium TradingView
await click('PREMIUM TRADINGVIEW'); await page.waitForTimeout(12000); await shot('p1-premium');
t = await txt(); i = t.indexOf('Live fundamental bias'); console.log('BIAS:', t.slice(i, i + 400));
const m = t.match(/MARKET:? [^|]{0,60}/); console.log('COUNTDOWN:', m ? m[0] : t.match(/CANDLE:? [^ ]+ ?[^ ]*/)?.[0]);

// Backtesting
await click('BACKTESTING'); await page.waitForTimeout(8000);
await page.getByRole('button', { name: /XAUUSD/ }).first().click(); await page.waitForTimeout(500);
await page.getByPlaceholder('Search symbol or name…').fill('gbp'); await page.waitForTimeout(500); await shot('b1-picker');
console.log('PICKER:', (await page.getByRole('listbox').innerText()).replace(/\s+/g, ' ').slice(0, 300));
await page.getByRole('option').first().click(); await page.waitForTimeout(6000);
await page.locator('select').first().selectOption('1H');
await page.locator('input[type=datetime-local]').fill('2015-03-10T08:00'); await page.waitForTimeout(300);
await click('Start replay', true); await page.waitForTimeout(12000); await shot('b2-replay-2015');
t = await txt(); i = t.indexOf('Bar time'); console.log('REPLAY:', t.slice(i, i + 160)); const er = t.match(/(No .{0,160}|Minute-level.{0,120})/); if (er) console.log('REPLAY MSG:', er[0]);
await page.getByRole('button', { name: /BUY \(B\)/ }).click(); await page.waitForTimeout(500);
for (let k = 0; k < 3; k++) { await page.getByTitle('Forward 10 bars').click(); await page.waitForTimeout(400); }
await click('Trend line', true); await page.waitForTimeout(300);
const box = await page.locator('canvas').first().boundingBox();
await page.mouse.click(box.x + 300, box.y + 200); await page.mouse.click(box.x + 500, box.y + 140); await page.waitForTimeout(500);
await click('EMA', true); await click('RSI', true); await page.waitForTimeout(800); await shot('b3-trade-draw');
t = await txt(); i = t.indexOf('ORDER TICKET'); console.log('TICKET:', t.slice(i, i + 500));
console.log('CLEAR BTN:', (await page.getByText(/Clear all \(\d+\)/).first().innerText().catch(() => 'n/a')));
await click('Clear all', false); await click('RSI', true); await page.waitForTimeout(500); await shot('b4-cleared');
console.log('CLEAR BTN AFTER:', (await page.getByText(/Clear all \(\d+\)/).first().innerText().catch(() => 'n/a')));
// calendar sentiment
await click('FUNDAMENTAL CALENDAR').catch(() => {}); await page.waitForTimeout(5000);
console.log('CONSOLE ERRORS', errors.length); errors.slice(0, 15).forEach((e) => console.log('  ', e));
await browser.close();
