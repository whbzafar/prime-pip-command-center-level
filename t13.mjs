import { chromium, devices } from 'playwright';
const B = 'http://localhost:3000';
const log = (...a) => console.log(...a);
process.on('uncaughtException', (e) => console.log('UNCAUGHT', String(e).slice(0, 200)));
const txt = async (loc) => ((await loc.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
const jsClick = (loc) => loc.evaluate((el) => { el.scrollIntoView({ block: 'center' }); el.click(); }, null, { timeout: 5000 }).then(() => true).catch(() => false);
const u = 'ci' + Date.now().toString(36);
log('register', (await fetch(B + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: 'Ci-pass-12345', name: 'CI Demo' }) })).status);

// A) new fundamental drivers have live data
await fetch(B + '/api/macro/overview').catch(() => {}); await new Promise((r) => setTimeout(r, 45000));
for (const [sym, want] of [['JPY', ['US 10-Year', 'Tokyo', 'Crude Oil']], ['AUD', ['Iron Ore', 'Copper', 'China Retail']], ['NZD', ['Dairy']], ['CAD', ['ISM']], ['EUR', ['German Industrial', 'Natural Gas']], ['CHF', ['US 10-Year']], ['USD', ['US 10-Year']], ['UK100', ['Pound', 'Copper']], ['GER40', ['Euro (inverse)']], ['AUS200', ['Iron Ore']], ['US500', ['Consumer']]]) {
  const j = await (await fetch(B + '/api/macro/asset/' + sym)).json().catch(() => ({}));
  const a = j.asset || j; const inds = (a.pillars || []).flatMap((p) => [{ name: p.name, score: p.score, hasData: p.hasData ?? (p.score !== null && p.score !== undefined), pillar: true }, ...(p.indicators || []).map((i) => ({ name: i.name, score: i.score, hasData: i.hasData ?? (i.score !== null && i.score !== undefined), stale: i.stale, detail: i.reasoning }))]);
  for (const w of want) { const m = inds.filter((i) => i.name.includes(w)); log('MACRO', sym, w, '→', m.length ? m.map((i) => `${i.name}: score ${i.score} data ${i.hasData}${i.detail ? ' | ' + String(i.detail).slice(0, 90) : ''}`).join(' ;; ') : 'NOT FOUND'); }
  log('MACRO', sym, 'total score', a.score, 'bias', a.bias, 'coverage', a.coverage ?? a.dataCoverage);
}
log('REFERRAL', JSON.stringify(await (await fetch(B + '/api/referral/check/primepopfx')).json()), JSON.stringify(await (await fetch(B + '/api/referral/check/nope')).json()));
log('INDICATOR order', JSON.stringify(await (await fetch(B + '/api/bot/reservations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'CI Test', contact: 'ci@example.com', tier: 'indicator' }) })).json()).slice(0, 120));

const br = await chromium.launch();
// B) Demo → Login
for (const [name, opts] of [['desk', { viewport: { width: 1500, height: 950 } }], ['phone', { ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true }]]) for (const path of ['app', 'setup']) {
  const ctx = await br.newContext(opts); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  const T = `${name}/${path}`;
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
  await jsClick(page.locator('[data-testid="trial-modal"] button[aria-label="Close"]'));
  await page.waitForTimeout(600);
  log(T, 'explore', await jsClick(page.getByRole('button', { name: /EXPLORE WITHOUT AN ACCOUNT/i }).first())); await page.waitForTimeout(2500);
  await jsClick(page.getByRole('button', { name: /Continue in Demo Mode/i }).first()); await page.waitForTimeout(2500);
  if (path === 'setup') log(T, 'setup sign-in link', await jsClick(page.getByRole('button', { name: /Sign in to existing account/i }).first()));
  else {
    log(T, 'wizard explore', await jsClick(page.getByRole('button', { name: /Explore in demo preview mode/i }).first())); await page.waitForTimeout(3500);
    for (const b of ['Maybe later', 'Start exploring', 'Got it', 'Skip', 'Not now']) await jsClick(page.getByRole('button', { name: b }).first());
    await jsClick(page.locator('[data-testid="trial-modal"] button[aria-label="Close"]'));
    await page.mouse.wheel(0, 700).catch(() => {}); await page.waitForTimeout(800);
    await page.screenshot({ path: `shots/${name}-demo.png` });
    const logins = page.getByRole('button', { name: /^\s*log\s*in\s*$/i }); log(T, 'LOGIN buttons', await logins.count());
    log(T, 'LOGIN click', await jsClick(logins.first()));
  }
  await page.waitForTimeout(2500);
  const field = page.locator('input[type="password"]').first();
  const inView = await field.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { y: Math.round(r.top), vh: innerHeight, onTop: top === el || el.contains(top) ? 'yes' : (top ? top.tagName + '.' + String(top.className).slice(0, 70) : 'none') }; }).catch(() => null);
  log(T, 'login form', JSON.stringify(inView));
  await page.screenshot({ path: `shots/${name}-${path}-login.png` });
  await page.locator('input[type="text"], input[autocomplete="username"]').first().fill(u, { timeout: 5000 }).catch((e) => log(T, 'fill failed', e.message.slice(0, 120)));
  await field.fill('Ci-pass-12345', { timeout: 5000 }).catch(() => {});
  const resp = page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 9000 }).then((r) => r.status()).catch(() => 'NO REQUEST');
  const submit = page.locator('form button[type="submit"]').first();
  log(T, 'submit', (await txt(submit)).slice(0, 40), '| real tap:', await submit.click({ timeout: 2500, trial: true }).then(() => 'ok').catch((e) => e.message.replace(/\s+/g, ' ').slice(0, 260)));
  await jsClick(submit);
  log(T, 'login request →', await resp); await page.waitForTimeout(5000);
  await page.screenshot({ path: `shots/${name}-${path}-after.png` });
  log(T, 'after: demo flag', await page.evaluate(() => localStorage.getItem('primepipfx_demo_mode')), '| user', await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('primepipfx_user_profile') || 'null')?.username; } catch { return '?'; } }), '| login form still shown', await field.isVisible().catch(() => false), '| ERRORS', errs.length, errs.slice(0, 2).join(' || '));
  await ctx.close();
}

// C) New screens (signed-in member, mocked profile)
const member = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'MEMBER', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID' };
for (const [name, opts] of [['desk', { viewport: { width: 1500, height: 950 } }], ['phone', { ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true }], ['tablet', { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }]]) {
  const ctx = await br.newContext(opts);
  await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: member }) }));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await page.addInitScript((m) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(m)); localStorage.setItem('primepipfx_session_token', 'ui-test'); localStorage.setItem('ppfx_learning_tab', 'LEARN'); } catch {} }, member);
  const enter = async () => { await jsClick(page.locator('[data-testid="trial-modal"] button[aria-label="Close"]')); await jsClick(page.getByText('Start Practice').first()); await page.waitForTimeout(800); await jsClick(page.getByText('Create Demo Account').first()); await page.waitForTimeout(3000); for (const b of ['Maybe later', 'Start exploring', 'Got it']) await jsClick(page.getByRole('button', { name: b }).first()); };
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000); await enter(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000); await enter();
  await page.waitForTimeout(5000);
  log(name, 'ALERT PROMPT', (await txt(page.locator('[data-testid="level-enable-prompt"]'))).slice(0, 200) || 'not shown');
  await page.screenshot({ path: `shots/${name}-prompt.png` });
  await jsClick(page.getByRole('button', { name: 'Not now' }).first());
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('primepipfx_navigate_tab', { detail: { tab: 'PRO_LEARNING' } }))); await page.waitForTimeout(3500);
  const overflow = () => page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth }));
  log(name, 'HUB tabs', (await page.getByRole('tab').allInnerTexts()).join(' / '), '| stats', (await txt(page.locator('[data-testid="learning-hub"] header'))).slice(0, 260), '| overflow', JSON.stringify(await overflow()));
  await page.screenshot({ path: `shots/${name}-hub2.png` });
  await page.locator('[data-testid="curriculum"]').scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(700); await page.screenshot({ path: `shots/${name}-course2.png` });
  await jsClick(page.locator('[data-testid^="done-"]').first()); await page.waitForTimeout(500);
  log(name, 'progress after marking one', await txt(page.locator('[data-testid="hub-progress"]')));
  await jsClick(page.locator('[data-testid="chapter-m3"]')); await page.waitForTimeout(600);
  await jsClick(page.locator('[data-testid="indicator-banner"]')); await page.waitForTimeout(1200);
  log(name, 'INDICATOR', (await txt(page.locator('[data-testid="indicator-section"]'))).slice(0, 330), '| overflow', JSON.stringify(await overflow()));
  await page.screenshot({ path: `shots/${name}-indicator.png` });
  await jsClick(page.locator('[data-testid="learn-tab-BOT"]')); await page.waitForTimeout(1000);
  log(name, 'BOT fees', ((await txt(page.locator('[data-testid="learning-hub"]'))).match(/\$[\d,]+/g) || []).slice(0, 8).join(' '));
  await jsClick(page.getByRole('button', { name: 'اردو' })); await page.waitForTimeout(1200); await jsClick(page.locator('[data-testid="learn-tab-INDICATOR"]')); await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/${name}-indicator-ur.png` }); await jsClick(page.getByRole('button', { name: 'English' }));
  log(name, 'ERRORS', errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}
// D) Subscription page for a visitor
{
  const ctx = await br.newContext({ ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true }); const page = await ctx.newPage();
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000);
  await jsClick(page.locator('[data-testid="trial-modal"] button[aria-label="Close"]'));
  log('SUBSCRIBE click', await jsClick(page.getByRole('button', { name: /SUBSCRIBE \/ GET ACCESS/i }).first())); await page.waitForTimeout(2500);
  const body = await txt(page.locator('body'));
  log('SUB prices seen', [...new Set(body.match(/\$\d[\d,]*/g) || [])].slice(0, 12).join(' '), '| mentions code', /PrimePopFX/i.test(body));
  await page.screenshot({ path: 'shots/phone-subscribe.png' });
  const inp = page.locator('input[placeholder*="PRIMEPOPFX" i]').first();
  await inp.fill('PrimePopFX', { timeout: 4000 }).catch(() => log('no code input'));
  await jsClick(page.getByRole('button', { name: /apply|verify/i }).first()); await page.waitForTimeout(1500);
  log('SUB after code', (await txt(page.locator('body'))).match(/Code verified[^.]*\.[^.]*\./)?.[0] || 'no confirmation text');
  await ctx.close();
}
await br.close();
