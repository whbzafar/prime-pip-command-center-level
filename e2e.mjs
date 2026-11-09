import fs from 'fs';
import { execSync } from 'child_process';
const T = JSON.parse(fs.readFileSync('/tmp/tokens.json', 'utf8'));
const H = { Authorization: 'Bearer ' + T.admin.token, 'content-type': 'application/json' };
const B = 'http://localhost:3000';
const list = async () => { const j = await (await fetch(`${B}/api/admin/customers`, { headers: H })).json(); return (j.customers || []); };
const names = async () => (await list()).map((c) => c.username);
const restart = (dir, log) => { try { execSync("kill $(lsof -t -iTCP:3000 -sTCP:LISTEN) 2>/dev/null; sleep 2", { shell: '/bin/bash' }); } catch {} execSync(`cd ${dir} && (PPFX_SHARED_KV_URL=http://localhost:8798/b nohup node dist/server.cjs > ${log} 2>&1 < /dev/null &); sleep 14`, { stdio: 'ignore', shell: '/bin/bash' }); };
let n = await names();
console.log('A count', n.length, 'has pro/wahab/ms', n.includes('pro'), n.includes('wahab'), n.includes('ms'));
for (const u of ['pro', 'wahab', 'ms']) {
  const c = (await list()).find((x) => x.username === u);
  if (!c) { console.log('not found', u); continue; }
  const r = await (await fetch(`${B}/api/admin/customers/${c.id}`, { method: 'DELETE', headers: H })).json();
  console.log('DELETE', u, JSON.stringify(r));
}
await new Promise((r) => setTimeout(r, 20000)); // legacy-registry re-sync window
n = await names();
console.log('AFTER 20s on A: count', n.length, 'has pro/wahab/ms', n.includes('pro'), n.includes('wahab'), n.includes('ms'));
restart('app2', '/tmp/serverB.log'); // brand-new instance, original bundled files
n = await names();
console.log('NEW INSTANCE B: count', n.length, 'has pro/wahab/ms', n.includes('pro'), n.includes('wahab'), n.includes('ms'));
const login = await (await fetch(`${B}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'pro', password: 'x' }) })).json();
console.log('removed user can log in on B:', login.ok);
const mem = await (await fetch(`${B}/api/admin/members`, { headers: H })).json();
console.log('members', mem.ok, mem.members?.length, 'sample', JSON.stringify(mem.members?.[0])?.slice(0, 220));
const re = await (await fetch(`${B}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'ms', password: 'secret12' }) })).json();
console.log('re-register removed username ms:', re.ok);
console.log('kv log:', fs.readFileSync('/tmp/kv.log', 'utf8').split('\n').filter((l) => l.includes('removed')).slice(-1)[0]);
process.exit(0);
