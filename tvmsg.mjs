import { chromium } from 'playwright';
import http from 'http';
const html = `<!doctype html><html><body style="margin:0;background:#000"><div style="width:1200px;height:700px"><iframe id="f" style="width:100%;height:100%;border:0" src="https://s.tradingview.com/widgetembed/?symbol=FX%3AEURUSD&interval=60&theme=dark&style=1&locale=en&hide_top_toolbar=false&allow_symbol_change=true&withdateranges=true"></iframe></div>
<script>window.__msgs=[];addEventListener('message',e=>{let d=e.data;try{if(typeof d==='string')d=JSON.parse(d)}catch{};window.__msgs.push({o:e.origin,d:JSON.stringify(d).slice(0,400)})});</script></body></html>`;
http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(html); }).listen(8811);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
import fs from 'fs'; fs.mkdirSync('shots', { recursive: true });
await p.goto('http://localhost:8811'); await p.waitForTimeout(12000);
const dump = async (tag) => { const m = await p.evaluate(() => { const x = window.__msgs; window.__msgs = []; return x; }); console.log('MSG', tag, m.length); for (const x of m) console.log('   ', x.o, x.d); };
await dump('load');
const f = p.frames().find((x) => /widgetembed/.test(x.url()));
console.log('FRAME', f?.url().slice(0, 80));
const t = await f.locator('body').innerText().catch(() => ''); console.log('TOOLBAR', t.replace(/\s+/g, ' ').slice(0, 200));
for (const label of ['1m', '5m', '30m', '1D', '4h']) {
  let ok = await f.getByRole('radio', { name: new RegExp('^' + label.replace('m', ' ?min').replace('h', ' ?hour').replace('D', ' ?day') + '|^' + label + '$', 'i') }).first().click({ timeout: 2500 }).then(() => true).catch(() => false);
  if (!ok) ok = await f.getByText(label, { exact: true }).first().click({ timeout: 2500 }).then(() => true).catch(() => false);
  if (!ok) { await f.locator('[data-name="date-ranges-menu"], #header-toolbar-intervals button').first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(800); ok = await f.getByText(new RegExp('^' + label + '$')).first().click({ timeout: 2500 }).then(() => true).catch(() => false); }
  await p.waitForTimeout(3500);
  const btns = await f.locator('#header-toolbar-intervals').innerText().catch(() => '?');
  console.log('CLICK', label, ok, '| interval bar now:', btns.replace(/\s+/g, ' ').slice(0, 60), '| iframe url', f.url().match(/interval=[^&]*/)?.[0]);
  await dump(label);
}
// does the frame expose anything via URL hash / title?
console.log('TITLE', await f.title().catch(() => ''));
await p.screenshot({ path: process.cwd() + '/shots/tvmsg.png' });
process.exit(0);
