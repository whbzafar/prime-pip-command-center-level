import fs from 'fs';
import { execFileSync, execSync } from 'child_process';
const T = JSON.parse(fs.readFileSync('/tmp/tokens.json', 'utf8'));
const H = { Authorization: 'Bearer ' + T.admin.token, 'content-type': 'application/json' };
const list = async (port) => { const j = await (await fetch(`http://localhost:${port}/api/admin/customers`, { headers: H })).json(); return (j.customers || []).map((c) => c.username); };
const find = async (port, u) => { const j = await (await fetch(`http://localhost:${port}/api/admin/customers`, { headers: H })).json(); return (j.customers || []).find((c) => c.username === u); };
console.log('A count', (await list(3000)).length, 'B count', (await list(3001)).length);
console.log('A has wahab (legacy registry):', (await list(3000)).includes('wahab'));
for (const u of ['pro', 'wahab', 'ms']) {
  const c = await find(3000, u);
  const r = await (await fetch(`http://localhost:3000/api/admin/customers/${c.id}`, { method: 'DELETE', headers: H })).json();
  console.log('DELETE on A', u, JSON.stringify(r));
}
await new Promise((r) => setTimeout(r, 9000));
const a = await list(3000), b = await list(3001);
console.log('AFTER: A count', a.length, 'has pro/wahab/ms', a.includes('pro'), a.includes('wahab'), a.includes('ms'));
console.log('AFTER: B (other instance) count', b.length, 'has pro/wahab/ms', b.includes('pro'), b.includes('wahab'), b.includes('ms'));
// removed user cannot log in on B
const login = await (await fetch('http://localhost:3001/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'wahab', password: 'anything' }) })).json();
console.log('removed user login on B ok?', login.ok);
// restart A from scratch (fresh copy of the bundled file)
try { execFileSync('pkill', ['-f', 'PORT=3000']); } catch {}
try { execSync("kill $(lsof -t -iTCP:3000 -sTCP:LISTEN) 2>/dev/null || true", { shell: '/bin/bash' }); } catch {}
await new Promise((r) => setTimeout(r, 2000));
execSync("cd app && git checkout -- data 2>/dev/null; (PPFX_SHARED_KV_URL=http://localhost:8798/b PORT=3000 nohup node dist/server.cjs > /tmp/server3.log 2>&1 < /dev/null &); sleep 12", { stdio: 'ignore', shell: '/bin/bash' });
const a2 = await list(3000);
console.log('AFTER RESTART A count', a2.length, 'has pro/wahab/ms', a2.includes('pro'), a2.includes('wahab'), a2.includes('ms'));
// members endpoint
const mem = await (await fetch('http://localhost:3000/api/admin/members', { headers: H })).json();
console.log('members', mem.ok, mem.members?.length, 'first', JSON.stringify(mem.members?.[0])?.slice(0, 200));
// re-sign-up with a removed username is allowed
const re = await (await fetch('http://localhost:3000/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'ms', password: 'secret12' }) })).json();
console.log('re-register removed username ms:', re.ok);
console.log('shared store:', fs.existsSync('/tmp/kv.log') ? fs.readFileSync('/tmp/kv.log', 'utf8').split('\n').filter((l) => l.includes('removed')).slice(-1)[0] : '');
process.exit(0);
