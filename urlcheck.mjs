import fs from 'fs';
const urls = fs.readFileSync('urls.txt', 'utf8').trim().split('\n');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
for (const u of urls) {
  try { const r = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(20000) }); const t = (await r.text()).slice(0, 200000); const title = (t.match(/<title[^>]*>([^<]*)/i) || [])[1] || ''; console.log('URL', r.status, r.url === u ? '' : '→ ' + r.url, '|', u, '|', title.trim().slice(0, 80)); }
  catch (e) { console.log('URL ERR', u, e.message); }
}
