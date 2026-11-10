import { chromium, devices } from 'playwright';
const B = 'http://localhost:3000';
const log = (...a) => console.log(...a);
const member = { id: 'ui-test', name: 'UI Test', username: 'uitest', role: 'MEMBER', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0, isLifetime: true, paymentStatus: 'PAID' };
const br = await chromium.launch();
const enterFor = (page) => async () => { await page.getByText('Start Practice').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(800); await page.getByText('Create Demo Account').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(3000); for (let k = 0; k < 2; k++) { await page.getByText(/ENTER\s*COMMAND\s*CENTER/i).first().click({ timeout: 2500 }).catch(() => {}); for (const b of ['Maybe later', 'Start exploring', 'Got it']) await page.getByRole('button', { name: b }).first().click({ timeout: 800 }).catch(() => {}); await page.waitForTimeout(1200); } };
const cut = (page, label) => page.evaluate((label) => { const w = innerWidth; const out = []; for (const el of document.querySelectorAll('#root *')) { const r = el.getBoundingClientRect(); if (r.width && r.right > w + 2 && r.left < w - 10 && !['fixed', 'absolute'].includes(getComputedStyle(el).position)) { let p = el.parentElement, sc = false; while (p) { if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= w + 2) { sc = true; break; } p = p.parentElement; } if (!sc) out.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 3).join('.')).slice(0, 60) + '→' + Math.round(r.right)); } } return label + ': ' + (out.slice(0, 6).join(' | ') || 'none'); }, label);

// 1) Logged out: sign-in hero + Wahab (desktop + phone)
for (const [name, opts] of [['desk', { viewport: { width: 1440, height: 900 } }], ['phone', { ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true }]]) {
  const ctx = await br.newContext(opts); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 150)));
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000);
  log('LOGIN', name, 'hero motion layer', await page.locator('[data-testid="hero-motion"]').count(), '| wahab teaser', await page.locator('[data-testid="wahab-teaser"]').count());
  await page.locator('[data-testid="login-hero"]').scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `shots/${name}-login-a.png` }); await page.waitForTimeout(2200); await page.screenshot({ path: `shots/${name}-login-b.png` });
  await page.locator('[data-testid="wahab-teaser"]').click().catch((e) => log('teaser click', e.message.slice(0, 80)));
  await page.waitForTimeout(3500); await page.screenshot({ path: `shots/${name}-wahab-1.png` });
  await page.waitForTimeout(10000); log('WAHAB', name, 'winter intro', await page.locator('[data-testid="winter-intro"]').count()); await page.screenshot({ path: `shots/${name}-wahab-2.png` });
  log('ERRORS login', name, errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

// 2) Member on phone
{
  const ctx = await br.newContext({ ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true });
  await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: member }) }));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 150)));
  await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, member);
  const enter = enterFor(page);
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000); await enter(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000); await enter();
  log('PHONE tools toggle', await page.locator('[data-testid="header-tools-toggle"]').isVisible().catch(() => false));
  await page.screenshot({ path: 'shots/phone-home.png' });
  // level alert banner (simulated event) + controls
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ppfx:level-alert', { detail: [{ id: 'x1', symbol: 'GBPCAD', display: 'GBP/CAD', side: 1, level: 1, price: 1.8312, zoneTop: 1.8320, zoneBottom: 1.8290, models: ['SBT 5'], time: Date.now(), score: 21 }] })));
  await page.waitForTimeout(800); log('BANNER', ((await page.locator('[data-testid="level-alert-banner"]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 200));
  await page.screenshot({ path: 'shots/phone-banner.png' });
  await page.locator('[data-testid="level-alert-banner"] [aria-label="Dismiss"]').click().catch(() => {});
  await page.locator('[aria-label="Announcements"]').click().catch(() => {}); await page.waitForTimeout(2500);
  log('ALERT controls', await page.locator('[data-testid="level-alert-controls"]').count(), ((await page.locator('[data-testid="level-alert-controls"]').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 160));
  await page.screenshot({ path: 'shots/phone-ann.png' });
  await page.locator('[aria-label="Announcements"]').click().catch(() => {}); await page.waitForTimeout(600);
  // premium tradingview
  await page.locator('[title="More Categories"]').first().click().catch(() => {}); await page.waitForTimeout(1000);
  await page.getByText(/Premium TradingView/i).first().click().catch(() => log('no premium in More')); await page.waitForTimeout(14000);
  log('CUT', await cut(page, 'premium'));
  const fs = page.getByRole('button', { name: /Full-Screen|Fullscreen/i }).first();
  await fs.scrollIntoViewIfNeeded().catch(() => {}); await page.screenshot({ path: 'shots/phone-premium-toolbar.png' });
  await fs.click({ timeout: 5000 }).then(() => log('FS clicked')).catch((e) => log('FS click failed', e.message.slice(0, 80)));
  await page.waitForTimeout(4000);
  log('FS state', await page.evaluate(() => { const c = !!document.querySelector('.tv-fullscreen-active'); const big = [...document.querySelectorAll('canvas, iframe')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 200).sort((a, b) => b.width * b.height - a.width * a.height)[0]; return `class=${c} vw=${innerWidth}x${innerHeight} biggest chart=${big ? Math.round(big.width) + 'x' + Math.round(big.height) + ' @' + Math.round(big.top) : 'none'}`; }));
  await page.screenshot({ path: 'shots/phone-fullscreen.png' });
  await page.getByRole('button', { name: /Exit Fullscreen/i }).first().click({ timeout: 3000 }).catch(() => log('no exit fs button'));
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /Pine Editor/i }).first().click({ timeout: 5000 }).then(() => log('PINE clicked')).catch((e) => log('PINE click failed', e.message.slice(0, 80)));
  await page.waitForTimeout(4000); log('CUT', await cut(page, 'pine')); await page.screenshot({ path: 'shots/phone-pine.png' });
  // learning hub
  await page.locator('[title="More Categories"]').first().click().catch(() => {}); await page.waitForTimeout(1000);
  await page.getByText(/Pro Trading Learning/i).first().click().catch(() => log('no learning in More')); await page.waitForTimeout(5000);
  log('HUB present', await page.locator('[data-testid="learning-hub"]').count()); log('CUT', await cut(page, 'learning')); await page.screenshot({ path: 'shots/phone-learn.png' });
  await page.getByRole('tab', { name: /Trading Bot Automation/ }).click().catch(() => {}); await page.waitForTimeout(1500);
  log('BOT countdown', ((await page.locator('[data-testid="bot-countdown"]').innerText().catch(() => '')) || '').replace(/\s+/g, ' '));
  await page.screenshot({ path: 'shots/phone-bot.png' });
  await page.getByLabel('Full name').fill('CI Tester'); await page.getByLabel('WhatsApp number or email').fill('+92 300 0000000');
  await page.getByRole('button', { name: /Reserve my place/ }).click(); await page.waitForTimeout(4000);
  log('BOT reserve result', ((await page.locator('[data-testid="bot-reserve"]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 160));
  await page.screenshot({ path: 'shots/phone-bot-done.png' });
  await page.getByRole('tab', { name: /Feelings/ }).click().catch(() => {}); await page.waitForTimeout(800);
  await page.getByLabel('Your message').fill('CI test: I wish the app had a weekly performance report.'); await page.getByRole('button', { name: /^Send$/ }).click(); await page.waitForTimeout(3000);
  log('VOICE', ((await page.locator('[data-testid="voice-form"]').innerText().catch(() => '')) || '').includes('reached the team'));
  await page.getByRole('tab', { name: /Institutional/ }).click().catch(() => {}); await page.waitForTimeout(800); await page.screenshot({ path: 'shots/phone-inst.png' });
  log('ERRORS phone', errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

// 3) Desktop: Forex.com default + Unlimited charts search + indicator categories
{
  const ctx = await br.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: member }) }));
  const page = await ctx.newPage();
  await page.addInitScript((u) => { try { localStorage.setItem('primepipfx_user_profile', JSON.stringify(u)); localStorage.setItem('primepipfx_session_token', 'ui-test'); } catch {} }, member);
  const enter = enterFor(page);
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000); await enter(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000); await enter();
  await page.getByText('PREMIUM TRADINGVIEW').first().click().catch(() => log('no premium nav')); await page.waitForTimeout(10000);
  log('BROKER default select value', await page.locator('[data-testid="broker-select"]').inputValue().catch(() => '?'));
  await page.locator('[data-testid="broker-select"]').selectOption('FOREXCOM').catch(() => {}); await page.waitForTimeout(9000);
  log('TV symbol', page.frames().map((f) => f.url()).filter((u) => /widgetembed/.test(u)).map((u) => decodeURIComponent(u.match(/symbol=([^&]*)/)?.[1] || '')).join(','));
  await page.getByText(/UNLIMITED CHART/i).first().click().catch(() => log('no unlimited nav')); await page.waitForTimeout(9000);
  await page.locator('[data-testid="instrument-search"]').fill('gold'); await page.waitForTimeout(800);
  log('SEARCH gold', ((await page.locator('[data-testid="instrument-picker"]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 160));
  await page.locator('[data-testid="instrument-picker"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'shots/desk-unlimited.png' });
  await page.locator('[data-testid="instrument-search"]').fill('');
  await page.getByText(/^Indicator$/).first().click().catch(() => log('no Indicator button')); await page.waitForTimeout(2000);
  log('IND menu', ((await page.locator('[data-testid="ppfx-indicator-menu"]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 260));
  await page.screenshot({ path: 'shots/desk-indicators.png' });
  await ctx.close();
}
// 4) admin hub API
const login = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'primepipfx-admin', password: process.env.PRIMEPIPFX_BOOTSTRAP_ADMIN_PASSWORD }) }).then((r) => r.json());
const hub = await fetch(B + '/api/admin/hub', { headers: { Authorization: 'Bearer ' + login.token } }).then((r) => r.json());
log('ADMIN hub', hub.ok, 'reservations', hub.reservations?.length, hub.reservations?.[0]?.name, '| feedback', hub.feedback?.length, '| usage days', hub.usage?.length, '| errors', hub.errors?.length);
const anon = await fetch(B + '/api/admin/hub'); log('ADMIN hub without login →', anon.status);
process.exit(0);
