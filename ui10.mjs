import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const user = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'ADMIN', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID', isDeveloper: true };
const ctx = await (await chromium.launch()).newContext({ viewport: { width: 1700, height: 1050 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 220)));
page.on('console', (m) => { if (m.type() === 'error' && !/401|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) }));
await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, user);
await page.goto(B, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
await page.getByText('Start Practice').first().click().catch(() => {}); await page.waitForTimeout(800); await page.getByText('Create Demo Account').first().click().catch(() => {}); await page.waitForTimeout(3000);
const txt = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const shot = (n) => page.screenshot({ path: `shots/${n}.png` });
await page.getByText('PREMIUM TRADINGVIEW').first().click(); await page.waitForTimeout(12000);
for (const cat of ['Forex', 'Indices', 'Commodities', 'Top Stocks', 'Top Crypto']) {
  await page.getByRole('button', { name: new RegExp('^' + cat) }).first().click().catch(() => console.log('nocat', cat)); await page.waitForTimeout(1500);
  const t = await txt(); const chips = t.match(/[A-Z0-9/]{3,9} [▲▼●] (Bullish|Bearish|Neutral) \d+%/g) || [];
  console.log('CAT', cat, chips.length, chips.slice(0, 6).join(' | '), t.includes('… live score') ? '(some pending)' : '');
}
console.log('deep-dive present:', (await txt()).includes('Deep-Dive Modal'), '| Fundamental Intelligence:', (await txt()).includes('Fundamental Intelligence'));
await page.getByRole('button', { name: /^Forex/ }).first().click(); await page.waitForTimeout(800);
await page.getByRole('button', { name: /^GBP\/USD/ }).first().click().catch(() => {}); await page.waitForTimeout(3000);
for (const [label, name] of [['Pair Widget', 'widget'], ['Market Sentiment', 'sentiment'], ['Monthly Seasonality', 'seasonality'], ['Pair-Specific News', 'news'], ['Live News Calendar', 'calendar']]) {
  const b = page.locator(`[title*="${label}"]`).first();
  if (!(await b.count())) { console.log('NO TOOL', label); continue; }
  await b.click(); await page.waitForTimeout(label.includes('News') || label.includes('Calendar') ? 9000 : 6000);
  await shot('dock-' + name);
  const t = await txt(); const i = Math.max(t.indexOf('GBPUSD ·'), t.indexOf('GBPUSD Sentiment'), t.indexOf('GBPUSD Seasonality'), t.indexOf('GBPUSD Market News'), t.indexOf('Live News Calendar'));
  console.log('DOCK', name, '→', t.slice(i, i + 380));
  await b.click(); await page.waitForTimeout(500);
}
// Pine editor
await page.getByRole('button', { name: /Pine Editor/ }).first().click(); await page.waitForTimeout(12000);
await page.getByRole('button', { name: /Add to chart/ }).click(); await page.waitForTimeout(12000);
let t = await txt(); console.log('PINE indicator:', (t.match(/(“[^”]+” is running[^.]*\.|Line \d+:[^|]{0,160}|is running[^.]*)/) || ['(no status)'])[0]);
await page.locator('[aria-label="Pine Editor"]').scrollIntoViewIfNeeded(); await shot('pine-indicator');
const strat = `//@version=5
strategy("EMA cross strategy", overlay=true, initial_capital=10000)
f = ta.ema(close, 12)
s = ta.ema(close, 26)
plot(f, color=color.aqua)
plot(s, color=color.orange)
if ta.crossover(f, s)
    strategy.entry("L", strategy.long)
if ta.crossunder(f, s)
    strategy.close("L")
`;
await page.locator('[aria-label="Pine Script editor"]').fill(strat);
await page.getByRole('button', { name: /Add to chart/ }).click(); await page.waitForTimeout(15000);
t = await txt(); console.log('PINE strategy:', (t.match(/(“[^”]+” is running[^|]{0,200}|Line \d+:[^|]{0,200})/) || ['(no status)'])[0]);
await shot('pine-strategy');
await page.locator('[aria-label="Pine Script editor"]').fill('//@version=5\nindicator("bad")\nplot(ta.nosuch(close))\n');
await page.getByRole('button', { name: /Add to chart/ }).click(); await page.waitForTimeout(8000);
t = await txt(); console.log('PINE error case:', (t.match(/(Line \d+:[^|]{0,160}|is running[^.]*\.)/) || [(t.match(/ta\.nosuch[^|]{0,120}/) || ['(no status)'])[0]])[0]);
await page.getByLabel('Close Pine Editor').click().catch(() => {});
// countdown on a live market
await page.getByRole('button', { name: /^Top Crypto/ }).first().click(); await page.waitForTimeout(800);
await page.getByRole('button', { name: /^BTC/ }).first().click().catch(() => {}); await page.waitForTimeout(14000);
await page.locator('iframe[title*="TradingView"]').first().scrollIntoViewIfNeeded(); await shot('btc-countdown');
// Backtesting
await page.getByText('BACKTESTING').first().click(); await page.waitForTimeout(9000);
const bal = page.getByLabel('Start balance'); await bal.fill('500'); await page.waitForTimeout(300);
t = await txt(); console.log('BALANCE field:', await bal.inputValue(), '| shows:', (t.match(/BALANCE [0-9,.]+ USD/i) || [''])[0]);
await page.getByRole('button', { name: 'Start replay' }).waitFor({ timeout: 60000 });
await page.getByRole('button', { name: /^BUY$/ }).first().click(); await page.waitForTimeout(600);
await page.getByTitle(/^Full screen$/).first().click(); await page.waitForTimeout(2000); await shot('bt-fullscreen');
console.log('FULLSCREEN active:', await page.evaluate(() => !!document.fullscreenElement), '| speeds:', (await page.locator('select[aria-label="Replay speed"]').first().locator('option').allInnerTexts()).join(','));
console.log('ERRORS', errs.slice(0, 15));
process.exit(0);
