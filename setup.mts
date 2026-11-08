// Creates two TEST accounts on the local CI server (never production) and writes their sessions.
import fs from 'fs';
import { createCustomer, readUsers, writeUsers, loginUser } from './app/server/authService';
const mk = (name: string, username: string, password: string) => { const r = createCustomer({ name, username, password, isLifetime: true, subscriptionStatus: 'LIFETIME' as any, paymentStatus: 'PAID' as any }); if (!r.success) console.log('create', username, r.error); };
mk('Test Admin', 'e2e-admin', 'e2e-Admin-pw-7731');
mk('Test Student', 'e2e-student', 'e2e-Student-pw-4419');
const users = readUsers();
const tmp = users.find((u) => u.username === 'e2e-admin')!;
const dev = users.find((u) => (u as any).isDeveloper || u.role === 'ADMIN')!;
// CI copy only: give the app's single admin account the test password, then drop the helper user.
(dev as any).passwordHash = (tmp as any).passwordHash; (dev as any).salt = (tmp as any).salt; (dev as any).mustChangePassword = false; (dev as any).name = 'Test Admin';
for (const u of users) if (u.username === 'e2e-student') { (u as any).mustChangePassword = false; (u as any).hasCompletedOnboarding = true; }
writeUsers(users.filter((u) => u.username !== 'e2e-admin'));
const a = loginUser(dev.username, 'e2e-Admin-pw-7731');
const s = loginUser('e2e-student', 'e2e-Student-pw-4419');
const strip = (u: any) => { const { passwordHash, salt, ...rest } = u; return rest; };
fs.writeFileSync('/tmp/tokens.json', JSON.stringify({ admin: { token: a?.token, user: strip(a?.user) }, student: { token: s?.token, user: strip(s?.user) } }));
console.log('SETUP', Boolean(a?.token), Boolean(s?.token), a?.user?.role, s?.user?.role);
// Universal passwords must no longer work.
console.log('WEAK admin/123456:', Boolean(loginUser('admin', '123456')), '| student/password:', Boolean(loginUser('e2e-student', 'password')), '| student/username:', Boolean(loginUser('e2e-student', 'e2e-student')));
