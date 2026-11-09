const B = 'https://kvdb.io/2ST3F4wjgBy2qEaTquQPuU';
const r = await fetch(B + '/primepipfx_students_v1', { cache: 'no-store' });
console.log('KV read status', r.status);
const t = await r.text();
try { const a = JSON.parse(t); console.log('KV count', a.length, 'users:', a.map((x) => x.username).join(',')); } catch { console.log('KV body', t.slice(0, 200)); }
const w = await fetch(B + '/ppfx_probe_write_test', { method: 'PUT', body: String(Date.now()) });
console.log('KV write test status', w.status, (await w.text()).slice(0, 100));
const back = await fetch(B + '/ppfx_probe_write_test'); console.log('KV readback', back.status, (await back.text()).slice(0, 40));
const r2 = await fetch('https://prime-pip-command-center-level.vercel.app/api/auth/students-count'); console.log('prod students-count', await r2.text());
