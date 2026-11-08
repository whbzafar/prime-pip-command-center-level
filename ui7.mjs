import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await page.goto('https://example.com');
await page.evaluate(() => {
  window.__m = [];
  window.addEventListener('message', (e) => window.__m.push(typeof e.data === 'string' ? e.data.slice(0, 500) : JSON.stringify(e.data).slice(0, 500)));
  document.body.innerHTML = '';
  const f = document.createElement('iframe');
  f.id = 'tvtest'; f.style.cssText = 'width:1300px;height:800px;border:0';
  f.src = 'https://s.tradingview.com/widgetembed/?frameElementId=tvtest&symbol=FX%3AEURUSD&interval=60&theme=dark&style=1&locale=en&hide_side_toolbar=0&allow_symbol_change=1&save_image=1&withdateranges=1';
  document.body.appendChild(f);
});
await page.waitForTimeout(12000);
console.log('LOAD MSGS:', JSON.stringify(await page.evaluate(() => window.__m)));
await page.evaluate(() => { window.__m = []; });
const fr = page.frameLocator('#tvtest');
const btns = await fr.locator('button, [role=button], div[data-value]').allInnerTexts().catch(() => []);
console.log('FRAME BUTTONS:', btns.map((x) => x.trim()).filter(Boolean).slice(0, 40).join(' | '));
for (const label of ['30m', '1m', '4h', 'D']) {
  const el = fr.getByText(label, { exact: true }).first();
  const ok = await el.click({ timeout: 5000, force: true }).then(() => true).catch(() => false);
  await page.waitForTimeout(3500);
  console.log(`CLICK ${label} ok=${ok} →`, JSON.stringify(await page.evaluate(() => { const m = window.__m; window.__m = []; return m; })));
}
// try asking the widget via postMessage
await page.evaluate(() => { const f = document.getElementById('tvtest'); f.contentWindow.postMessage(JSON.stringify({ name: 'set-interval', data: '15' }), '*'); });
await page.waitForTimeout(3000);
console.log('AFTER set-interval:', JSON.stringify(await page.evaluate(() => window.__m)));
await page.screenshot({ path: 'shots/tv.png' });
process.exit(0);
