import http from 'http';
const m = new Map();
http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    if (req.method === 'PUT' || req.method === 'POST') { m.set(req.url, b); console.log('PUT', req.url, b.length, b.slice(0, 60)); res.end('ok'); return; }
    if (req.method === 'DELETE') { m.delete(req.url); res.end('ok'); return; }
    if (!m.has(req.url)) { res.statusCode = 404; res.end('not found'); return; }
    res.end(m.get(req.url));
  });
}).listen(8798);
