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
async function open(labels, shot, wait = 9000) {
  for (const l of labels) {
    const loc = page.getByText(l, { exact: true }).first();
    if (await loc.count()) { try { await loc.click({ timeout: 5000 }); console.log('clicked', l); break; } catch (e) { console.log('click fail', l, e.message.slice(0, 80)); } }
    else console.log('not found', l);
  }
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `shots/${shot}.png` });
  console.log(shot, 'text sample:', (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400));
}
await open(['Fundamental Indicators', 'Fundamentals', 'Fundamental Analysis'], '1-fundamentals', 12000);
await open(['Institutional Positions', 'Institutional'], '1b-institutional', 4000);
await open(['Chart Analysis', 'Unlimited Charts'], '2-charts', 15000);
await open(['Backtesting'], '3-backtesting', 12000);
console.log('CONSOLE ERRORS', errors.length); errors.slice(0, 25).forEach((e) => console.log('  ', e));
await browser.close();
