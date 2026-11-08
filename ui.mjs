import { chromium } from 'playwright';
const B = 'https://prime-pip-command-center-level.vercel.app';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
await page.addInitScript(() => { try { localStorage.setItem('primepipfx_demo_mode', 'true'); } catch {} });
await page.goto(B, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'shots/0-home.png' });
console.log('HOME TEXT:', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1500));
console.log('BUTTONS:', (await page.locator('button').allInnerTexts()).map((t) => t.trim()).filter(Boolean).slice(0, 80).join(' | '));
try { await page.getByText('Explore in demo preview mode').first().click({ timeout: 8000 }); await page.waitForTimeout(5000); } catch (e) { console.log('demo click failed', e.message.slice(0, 80)); }
try { await page.getByText('CONTINUE IN DEMO MODE', { exact: false }).first().click({ timeout: 8000 }); await page.waitForTimeout(6000); } catch (e) { console.log('continue click failed', e.message.slice(0, 80)); }
await page.screenshot({ path: 'shots/0b-demo.png' });
console.log('DEMO TEXT:', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1200));
console.log('DEMO BUTTONS:', (await page.locator('button, a, [role=button]').allInnerTexts()).map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 120).join(' | '));
async function open(labels, shot, wait = 9000) {
  for (const l of labels) {
    const loc = page.getByText(l, { exact: false }).first();
    if (await loc.count()) { try { await loc.click({ timeout: 5000 }); console.log('clicked', l); break; } catch (e) { console.log('click fail', l, e.message.slice(0, 80)); } }
    else console.log('not found', l);
  }
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `shots/${shot}.png` });
  console.log(shot, 'text sample:', (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400));
}
await open(['08. FUNDAMENTAL INDICATORS'], '1-fundamentals', 15000);
await page.mouse.wheel(0, 900); await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/1a-fundamentals-scroll.png' });
await open(['Institutional Positions', 'Institutional'], '1b-institutional', 5000);
await page.mouse.wheel(0, 900); await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/1c-institutional-scroll.png' });
await open(['EUR'], '1d-eur', 8000);
await page.mouse.wheel(0, 1400); await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/1e-eur-scroll.png' });
console.log('CONSOLE ERRORS', errors.length); errors.slice(0, 25).forEach((e) => console.log('  ', e));
await browser.close();
