import { chromium, devices } from 'playwright';
const B = 'http://localhost:3000';
const log = (...a) => console.log(...a);
process.on('uncaughtException', (e) => console.log('UNCAUGHT', String(e).slice(0, 200)));
const txt = async (loc) => ((await loc.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
const jsClick = (loc) => loc.evaluate((el) => { el.scrollIntoView({ block: 'center' }); el.click(); }, null, { timeout: 5000 }).then(() => true).catch(() => false);

// A) server accepts PRIME (and still the old codes)
for (const c of ['PRIME', 'prime', 'PrimePopFX', 'nope']) {
  const r = await (await fetch(B + '/api/referral/check/' + c)).json();
  log('REFERRAL', c, '→ valid:', r.valid, 'price:', r.price, 'orig:', r.originalPrice);
}

const br = await chromium.launch();
async function openFresh(opts) {
  const ctx = await br.newContext(opts); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await page.goto(B, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(6000);
  return { ctx, page, errs };
}

// B) Subscription page: no Free tier, Standard $200, coupon PRIME → Congratulations
for (const [name, opts] of [['desk', { viewport: { width: 1400, height: 950 } }], ['phone', { ...devices['iPhone 14 Pro Max'], isMobile: true, hasTouch: true }]]) {
  const { ctx, page, errs } = await openFresh(opts);
  await jsClick(page.locator('[data-testid="trial-modal"] button[aria-label="Close"]'));
  await jsClick(page.getByRole('button', { name: /SUBSCRIBE \/ GET ACCESS/i }).first());
  await page.waitForTimeout(2500);
  const body = await txt(page.locator('body'));
  log(name, 'prices:', [...new Set(body.match(/\$\d[\d,]*/g) || [])].slice(0, 10).join(' '));
  log(name, 'FREE tier present?', /FREE TIER|FREE FOREVER|ACTIVATE FREE TIER/i.test(body), '| $0 present?', /\$0\b/.test(body));
  log(name, 'Standard Access present?', /STANDARD ACCESS/i.test(body), '| Coupon label?', /COUPON CODE/i.test(body));
  await page.screenshot({ path: `shots/sub-${name}.png`, fullPage: true });
  const inp = page.locator("input[placeholder*='PRIME' i]").first();
  await inp.fill('PRIME', { timeout: 4000 }).catch(() => log(name, 'no coupon input'));
  await jsClick(page.getByRole('button', { name: /^APPLY$/i }).first());
  await page.waitForTimeout(1500);
  const after = await txt(page.locator('body'));
  log(name, 'after PRIME → congrats?', /Congratulations/i.test(after), '| msg:', (after.match(/Congratulations[^.!]*[.!]/i) || ['(none)'])[0]);
  await page.screenshot({ path: `shots/sub-${name}-applied.png`, fullPage: true });
  log(name, 'ERRORS', errs.length, errs.slice(0, 2).join(' || '));
  await ctx.close();
}

// C) Demo link text on first-open screen
{
  const { ctx, page } = await openFresh({ viewport: { width: 1400, height: 950 } });
  const body = await txt(page.locator('body'));
  log('DEMO LINK text present?', /CONTINUE EXPLORING WITHOUT AN ACCOUNT \/ DEMO/i.test(body));
  log('DEMO LINK snippet:', (body.match(/CONTINUE EXPLORING[^\n]{0,60}/i) || ['(not found)'])[0]);
  await ctx.close();
}

// D) Voice announcement text uses "This pair has arrived" (check the built module output)
{
  const { ctx, page, errs } = await openFresh({ viewport: { width: 1400, height: 950 } });
  // hook speechSynthesis to capture spoken text
  await page.evaluate(() => { window.__spoken = []; const orig = window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak = (u) => { try { window.__spoken.push(u.text); } catch {} try { return orig(u); } catch {} }; });
  // enter demo and fire a test level alert
  await jsClick(page.locator('[data-testid="trial-modal"] button[aria-label="Close"]'));
  await jsClick(page.getByRole('button', { name: /EXPLORE WITHOUT AN ACCOUNT|CONTINUE EXPLORING/i }).first());
  await page.waitForTimeout(1500);
  await jsClick(page.getByRole('button', { name: /Explore in demo preview mode/i }).first());
  await page.waitForTimeout(3000);
  // call the test alert through the app event if present, else dispatch
  const spoken = await page.evaluate(async () => {
    try { window.dispatchEvent(new CustomEvent('ppfx:test-level-alert')); } catch {}
    // also directly trigger via the known module if exposed
    await new Promise(r => setTimeout(r, 2500));
    return window.__spoken || [];
  });
  log('VOICE spoken captured:', JSON.stringify(spoken).slice(0, 200));
  const voices = await page.evaluate(() => (window.speechSynthesis.getVoices() || []).map(v => v.name).slice(0, 8));
  log('VOICE voices available in CI:', JSON.stringify(voices));
  log('VOICE ERRORS', errs.length);
  await ctx.close();
}
await br.close();
