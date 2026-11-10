import { chromium } from 'playwright';
import fs from 'fs'; fs.mkdirSync('shots', { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
const base = 'https://s.tradingview.com/widgetembed/?symbol=FX%3AEURUSD&interval=1&theme=dark&style=1&locale=en&hide_top_toolbar=false&allow_symbol_change=true&timezone=Asia%2FKarachi';
const variants = {
  plain: '',
  df_json: '&disabled_features=' + encodeURIComponent(JSON.stringify(['header_resolutions', 'show_interval_dialog_on_key_press', 'timeframes_toolbar'])),
  df_json_ranges: '&withdateranges=true&disabled_features=' + encodeURIComponent(JSON.stringify(['header_resolutions', 'timeframes_toolbar'])),
  df_csv: '&disabled_features=header_resolutions,timeframes_toolbar',
};
for (const [k, v] of Object.entries(variants)) {
  await p.setContent(`<body style="margin:0"><iframe id="f" style="width:1200px;height:700px;border:0" src="${base + v}"></iframe></body>`);
  await p.waitForTimeout(11000);
  const f = p.frames().find((x) => /widgetembed/.test(x.url()));
  const t = (await f.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  console.log('VAR', k, '| intervals btns:', await f.locator('#header-toolbar-intervals').count(), '|', t.slice(0, 160));
  // keyboard interval change
  await f.locator('canvas').first().click({ position: { x: 300, y: 300 } }).catch(() => {});
  await p.keyboard.type('5'); await p.waitForTimeout(700); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  const t2 = (await f.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  console.log('    after typing 5:', (t2.match(/Dollar · ?\S+|Dollar \S+ \S+/) || [''])[0], '| legend', t2.slice(t2.indexOf('Euro'), t2.indexOf('Euro') + 40));
  await p.screenshot({ path: `shots/tv-${k}.png` });
}
process.exit(0);
