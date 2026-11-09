import http from 'http';
const h = new Map(); const l = new Map();
http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    let a; try { a = JSON.parse(b); } catch { res.end('{"error":"bad"}'); return; }
    const [c, k, ...r] = a; let out = null;
    const hm = h.get(k) || new Map(); const ls = l.get(k) || [];
    if (c === 'HGETALL') out = [...hm].flat();
    else if (c === 'HSET') { for (let i = 0; i < r.length; i += 2) hm.set(r[i], r[i + 1]); h.set(k, hm); out = r.length / 2; }
    else if (c === 'HDEL') { r.forEach((x) => hm.delete(x)); out = r.length; }
    else if (c === 'LPUSH') { ls.unshift(...r); l.set(k, ls); out = ls.length; }
    else if (c === 'LTRIM') { l.set(k, ls.slice(+r[0], +r[1] + 1)); out = 'OK'; }
    else if (c === 'LRANGE') out = ls.slice(+r[0], +r[1] + 1);
    console.log(c, k, c === 'HSET' ? r.filter((_, i) => i % 2 === 0).join(',') : '');
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ result: out }));
  });
}).listen(8799);
