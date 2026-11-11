import { chromium, devices } from 'playwright';
const B = 'http://localhost:3000';
const log = (...a) => console.log(...a);
const member = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'MEMBER', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID' };
process.on('unhandledRejection', (e) => console.log('UNHANDLED', String(e).slice(0, 200)));
const txt = async (loc) => ((await loc.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
const cut = (page, label) => page.evaluate((label) => { const w = innerWidth; const out = []; for (const el of document.querySelectorAll('#root *')) { const r = el.getBoundingClientRect(); if (r.width && r.right > w + 2 && r.left < w - 10 && !['fixed', 'absolute'].includes(getComputedStyle(el).position)) { let p = el.parentElement, sc = false; while (p) { if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= w + 2) { sc = true; break; } p = p.parentElement; } if (!sc) out.push((el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 3).join('.')).slice(0, 60) + '→' + Math.round(r.right)); } } return label + ': ' + (out.slice(0, 6).join(' | ') || 'none'); }, label);

// 1) Account speed (server side)
{
  const t = async (label, fn) => { const s = performance.now(); const r = await fn(); log('TIME', label, Math.round(performance.now() - s) + 'ms', r); };
  const u = 'ci' + Date.now().toString(36);
  await t('register', async () => { const r = await fetch(B + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: 'Ci-pass-12345', name: 'CI Speed' }) }); return r.status; });
  for (let i = 1; i <= 3; i++) await t('login#' + i, async () => { const r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: 'Ci-pass-12345' }) }); const j = await r.json().catch(() => ({})); return r.status + ' ' + (j.ok ? 'ok' : j.error); });
  await t('wrong password', async () => (await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: 'nope-nope-1' }) })).status);
  await t('time', async () => (await fetch(B + '/api/time')).status);
}

const br = await chromium.launch();
const open = async (opts, tab) => {
  const ctx = await br.newContext(opts);
  await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: member }) }));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); localStorage.setItem('ppfx_learning_tab', 'LEARN'); } catch {} }, member);
  const s = performance.now();
  await page.goto(B, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#root')?.children.length, null, { timeout: 20000 }).catch(() => {});
  log('FIRST paint ms', Math.round(performance.now() - s));
  await page.waitForTimeout(6000);
  for (let k = 0; k < 3; k++) { await page.getByText(/ENTER\s*COMMAND\s*CENTER/i).first().click({ timeout: 2000 }).catch(() => {}); for (const b of ['Maybe later', 'Start exploring', 'Got it']) await page.getByRole('button', { name: b }).first().click({ timeout: 700 }).catch(() => {}); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(900); }
  if (tab) { await page.evaluate((tab) => window.dispatchEvent(new CustomEvent('primepipfx_navigate_tab', { detail: { tab } })), tab); await page.waitForTimeout(4000); }
  return { ctx, page, errs };
};

// 2) Learning hub — desktop and phone
for (const [name, opts] of [['desk', { viewport: { width: 1500, height: 950 } }], ['phone', { ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true }]]) {
  const { ctx, page, errs } = await open(opts, 'PRO_LEARNING');
  log(name, 'HUB', await page.locator('[data-testid="learning-hub"]').count(), '| tabs:', (await page.getByRole('tab').allInnerTexts()).join(' / '));
  log(name, 'classic academy present?', await page.getByText('Classic Academy').count());
  log(name, 'bot banner', await txt(page.locator('[data-testid="bot-banner"]')));
  await page.screenshot({ path: `shots/${name}-hub.png` });
  await page.locator('[data-testid="bot-banner"]').click().catch(() => {}); await page.waitForTimeout(1200);
  log(name, 'after banner → countdown', await txt(page.locator('[data-testid="bot-countdown"]')));
  await page.locator('[data-testid="learn-tab-LIBRARY"]').click().catch(() => {}); await page.waitForTimeout(1200);
  log(name, 'LIBRARY head', (await txt(page.locator('[data-testid="advanced-library"]'))).slice(0, 220));
  log(name, 'division chips', await page.locator('[data-testid="library-divisions"] button').count(), '| sections', await page.locator('[data-testid^="division-"]').count());
  await page.screenshot({ path: `shots/${name}-library.png` });
  await page.locator('[data-testid="library-search"]').fill('gamma'); await page.waitForTimeout(600);
  log(name, 'search gamma →', (await page.locator('[data-testid="advanced-library"] article').allInnerTexts()).map((s) => s.split('\n')[1] || s).slice(0, 8).join(' | '));
  await page.locator('[data-testid="advanced-library"] article button').first().click().catch(() => {}); await page.waitForTimeout(500);
  const links = await page.locator('[data-testid="advanced-library"] article a').evaluateAll((as) => as.map((a) => a.href));
  log(name, 'read-more links', links.join(' , '));
  await page.screenshot({ path: `shots/${name}-library-search.png` });
  // Urdu
  await page.locator('[data-testid="library-search"]').fill(''); await page.getByRole('button', { name: 'اردو' }).click().catch(() => log('no urdu button')); await page.waitForTimeout(1500);
  log(name, 'URDU dir', await page.locator('[data-testid="advanced-library"]').getAttribute('dir'), '| font', await page.evaluate(() => document.fonts.check("16px 'Noto Nastaliq Urdu'", 'ابت')));
  log(name, 'URDU text', (await txt(page.locator('[data-testid="advanced-library"]'))).slice(0, 160));
  await page.locator('[data-testid="advanced-library"] article button').first().click().catch(() => {}); await page.waitForTimeout(700);
  await page.screenshot({ path: `shots/${name}-library-urdu.png` });
  if (name === 'phone') log('CUT', await cut(page, 'library urdu'));
  await page.locator('[data-testid="learn-tab-LEARN"]').click().catch(() => {}); await page.waitForTimeout(800);
  log(name, 'URDU course', (await txt(page.locator('[data-testid="learning-hub"] article').first())).slice(0, 160));
  await page.screenshot({ path: `shots/${name}-course-urdu.png` });
  await page.locator('[data-testid="learn-tab-BOT"]').click().catch(() => {}); await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/${name}-bot-urdu.png` });
  if (name === 'phone') log('CUT', await cut(page, 'bot urdu'));
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(6000);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('primepipfx_navigate_tab', { detail: { tab: 'PRO_LEARNING' } }))); await page.waitForTimeout(2500);
  log(name, 'lang remembered after reload', await page.locator('[data-testid="learning-hub"]').getAttribute('lang'));
  await page.getByRole('button', { name: 'English' }).click().catch(() => {});
  log(name, 'ERRORS', errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

// 3) Backtesting indicator search
{
  const { ctx, page, errs } = await open({ viewport: { width: 1500, height: 950 } }, 'BACKTESTING');
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: /\+ Add indicator/ }).first().click({ timeout: 8000 }).then(() => log('BT add clicked')).catch((e) => log('BT add missing', e.message.slice(0, 100)));
  await page.waitForTimeout(600);
  await page.locator('[data-testid="bt-indicator-search"]').fill('rsi').catch(() => log('no bt search'));
  await page.waitForTimeout(500); await page.screenshot({ path: 'shots/bt-search.png' });
  const items = await page.locator('[data-testid="bt-indicator-search"] >> xpath=ancestor::div[2]//button').allInnerTexts().catch(() => []);
  log('BT results', items.map((s) => s.replace(/\s+/g, ' ')).slice(0, 8).join(' | '));
  await page.locator('[data-testid="bt-indicator-search"]').fill('boll'); await page.waitForTimeout(400);
  await page.locator('[data-testid="bt-indicator-search"] >> xpath=ancestor::div[2]//button').filter({ hasText: /Bollinger|BOLL/ }).first().click().then(() => log('BT applied BOLL')).catch((e) => log('BT apply failed', e.message.slice(0, 100)));
  await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/bt-applied.png' });
  log('BT ERRORS', errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

// 4) Level alert banner: deep touch vs edge touch
{
  const { ctx, page, errs } = await open({ ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ppfx:level-alert', { detail: [{ id: 'e1', symbol: 'GBPCAD', display: 'GBP/CAD', side: 1, level: 1, price: 1.8312, zoneTop: 1.8320, zoneBottom: 1.8290, models: ['SBT 5'], time: Date.now(), score: 21, depthPips: 0.6 }] })));
  await page.waitForTimeout(800); log('BANNER edge', (await txt(page.locator('[data-testid="level-alert-banner"]'))).slice(0, 260));
  await page.screenshot({ path: 'shots/alert-edge.png' });
  log('ALERT ERRORS', errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

// 5) Fundamentals → pair → event risk
{
  const { ctx, page, errs } = await open({ viewport: { width: 1500, height: 950 } }, 'FUNDAMENTAL_INDICATORS');
  await page.waitForTimeout(20000);
  await page.getByRole('button', { name: /^Pairs$/ }).first().click({ timeout: 8000 }).catch(() => log('no Pairs tab'));
  await page.waitForTimeout(2500); await page.getByText('EUR/USD', { exact: true }).first().click({ timeout: 8000 }).catch(() => log('no EUR/USD row'));
  await page.waitForTimeout(5000);
  log('EVENT RISK', (await txt(page.locator('[data-testid="pair-event-risk"]'))).slice(0, 300));
  await page.screenshot({ path: 'shots/pair-event-risk.png' });
  log('FUND ERRORS', errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}
await br.close();
