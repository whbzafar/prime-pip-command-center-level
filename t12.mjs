import { chromium, devices } from 'playwright';
const B = 'http://localhost:3000';
const log = (...a) => console.log(...a);
process.on('uncaughtException', (e) => console.log('UNCAUGHT', String(e).slice(0, 200)));
const u = 'ci' + Date.now().toString(36);
log('register', (await fetch(B + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: 'Ci-pass-12345', name: 'CI Demo' }) })).status);
const br = await chromium.launch();
for (const [name, opts] of [['desk', { viewport: { width: 1500, height: 950 } }], ['phone', { ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true }]]) {
  const ctx = await br.newContext(opts); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
  await page.screenshot({ path: `shots/${name}-d0.png` });
  log(name, 'buttons on first screen:', (await page.getByRole('button').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30).join(' | '));
  // go into demo the way a visitor does
  const cover = (loc) => loc.evaluate((el) => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return top && !el.contains(top) && top !== el ? 'COVERED BY ' + top.tagName + '.' + String(top.className).slice(0, 120) : 'clear'; }).catch((e) => 'n/a ' + e.message.slice(0, 80));
  const tap = async (loc, label) => { log(name, label, await cover(loc)); await loc.click({ timeout: 3000 }).then(() => log(name, label, 'clicked normally')).catch(async (e) => { log(name, label, 'normal click failed:', e.message.replace(/\s+/g, ' ').slice(0, 420)); await loc.evaluate((el) => el.click()).catch(() => {}); }); };
  await tap(page.getByRole('button', { name: /EXPLORE WITHOUT AN ACCOUNT/i }).first(), 'explore');
  await page.waitForTimeout(1500);
  await tap(page.getByRole('button', { name: /Continue in Demo Mode/i }).first(), 'continue-demo');
  await page.waitForTimeout(3500);
  log(name, 'after demo: buttons', (await page.getByRole('button').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 25).join(' | ').slice(0, 900));
  await page.screenshot({ path: `shots/${name}-d05.png` });
  if (process.env.VIA_SETUP) {
    await page.getByRole('button', { name: /Sign in to existing account/i }).first().click({ timeout: 4000 }).then(() => log(name, 'clicked setup sign-in')).catch(() => log(name, 'no setup sign-in link'));
  } else {
    for (const t of [/explore.*demo/i, /skip/i, /quick/i, 'Start Practice', 'Create Demo Account']) { await page.getByRole('button', { name: t }).first().click({ timeout: 1500 }).then(() => log(name, 'clicked', String(t))).catch(() => {}); await page.waitForTimeout(1500); }
    for (let k = 0; k < 2; k++) { await page.getByText(/ENTER\s*COMMAND\s*CENTER/i).first().click({ timeout: 1500 }).catch(() => {}); for (const b of ['Maybe later', 'Start exploring', 'Got it', 'Skip']) await page.getByRole('button', { name: b }).first().click({ timeout: 700 }).catch(() => {}); await page.waitForTimeout(1000); }
    await page.mouse.wheel(0, 900).catch(() => {}); await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/${name}-d1.png` });
  log(name, 'demo flag', await page.evaluate(() => localStorage.getItem('primepipfx_demo_mode')));
  const logins = process.env.VIA_SETUP ? page.locator('form button[type="submit"]').locator('xpath=ancestor::form').first().locator('xpath=..').locator('button:has-text("zzz-none")') : page.getByRole('button', { name: /^\s*log\s*in\s*$/i });
  const n = await logins.count(); log(name, 'login buttons', n);
  for (let i = 0; i < n; i++) {
    const b = logins.nth(i); const vis = await b.isVisible().catch(() => false);
    const info = await b.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), covered: top && !el.contains(top) && top !== el ? (top.tagName + '.' + String(top.className).slice(0, 80)) : null }; }).catch(() => null);
    log(name, 'login#' + i, 'visible', vis, JSON.stringify(info));
    if (!vis) continue;
    await tap(b, 'LOGIN button');
    await page.waitForTimeout(1500);
    const field = page.locator('input[type="password"]').first();
    log(name, 'after click → password field visible', await field.isVisible().catch(() => false));
    await page.screenshot({ path: `shots/${name}-d2-${i}.png` });
    if (await field.isVisible().catch(() => false)) {
      const user = page.locator('input[type="text"], input[autocomplete="username"]').first();
      await user.fill(u).catch((e) => log('fill user failed', e.message.split('\n')[0])); await field.fill('Ci-pass-12345').catch(() => {});
      const submit = page.locator('form button[type="submit"]').first();
      log(name, 'submit text', (await submit.innerText().catch(() => '?')).replace(/\s+/g, ' '), 'enabled', await submit.isEnabled().catch(() => '?'));
      const cov = await submit.evaluate((el) => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return top && !el.contains(top) && top !== el ? (top.tagName + '.' + String(top.className).slice(0, 90)) : null; }).catch(() => 'n/a');
      log(name, 'submit covered by', cov);
      const resp = page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 8000 }).then((r) => r.status()).catch(() => 'no request');
      await tap(submit, 'submit');
      log(name, 'login request →', await resp);
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `shots/${name}-d3.png` });
      log(name, 'after sign-in: demo flag', await page.evaluate(() => localStorage.getItem('primepipfx_demo_mode')), '| modal still open', await field.isVisible().catch(() => false), '| page says', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200));
      break;
    }
  }
  if (process.env.VIA_SETUP) {
    const field = page.locator('input[type="password"]').first();
    log(name, 'setup path → password field visible', await field.isVisible().catch(() => false));
    await page.locator('input[type="text"], input[autocomplete="username"]').first().fill(u).catch(() => {}); await field.fill('Ci-pass-12345').catch(() => {});
    const resp = page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 8000 }).then((r) => r.status()).catch(() => 'no request');
    await tap(page.locator('form button[type="submit"]').first(), 'setup submit');
    log(name, 'setup path login request →', await resp); await page.waitForTimeout(4000);
    await page.screenshot({ path: `shots/${name}-d4.png` });
    log(name, 'setup path after: ', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 160));
  }
  log(name, 'ERRORS', errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}
await br.close();
