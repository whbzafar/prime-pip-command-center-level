import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SRC = `//@version=5
indicator("Secret SBT", overlay=true)
mySecretFactor = 0.777
plot(ta.sma(close, 10) * mySecretFactor / mySecretFactor)`;

let base = '';
let server: any;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pine-'));

beforeAll(async () => {
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.chdir(tmp);
  const { createPineRouter } = await import('../routes/pineRoutes');
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use('/api/pine', createPineRouter(async (req) => {
    const who = req.headers['x-test-user'];
    if (who === 'admin') return { id: 'a1', username: 'boss', role: 'ADMIN' };
    if (who === 'student') return { id: 's1', username: 'kid', role: 'CUSTOMER' };
    return null;
  }));
  await new Promise<void>((r) => { server = app.listen(0, () => r()); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server?.close());

const call = (who: string, method: string, url: string, body?: any) =>
  fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(who ? { 'x-test-user': who } : {}) }, body: body ? JSON.stringify(body) : undefined });

describe('private Pine indicators', () => {
  let id = '';
  const bars = Array.from({ length: 300 }, (_, i) => ({ time: 1.7e12 + i * 36e5, open: 1, high: 1.1, low: 0.9, close: 1 + Math.sin(i / 9) / 50 }));

  it('requires sign-in', async () => {
    expect((await call('', 'GET', '/api/pine/scripts')).status).toBe(401);
  });
  it('only the admin can save', async () => {
    expect((await call('student', 'PUT', '/api/pine/scripts', { source: SRC, published: true })).status).toBe(403);
    const r = await call('admin', 'PUT', '/api/pine/scripts', { source: SRC, published: true });
    const j = await r.json(); expect(j.ok).toBe(true); id = j.script.id;
  });
  it('students list published scripts without source', async () => {
    const text = await (await call('student', 'GET', '/api/pine/scripts')).text();
    expect(text).toContain('Secret SBT');
    expect(text).not.toContain('mySecretFactor');
    expect(text).not.toContain('ta.sma');
  });
  it('admin gets the source', async () => {
    expect(await (await call('admin', 'GET', '/api/pine/scripts')).text()).toContain('mySecretFactor');
  });
  it('prepare and run return output only', async () => {
    const p = await (await call('student', 'POST', '/api/pine/prepare', { id })).text();
    expect(p).not.toContain('mySecretFactor');
    const r = await call('student', 'POST', '/api/pine/run', { id, market: { symbol: 'EURUSD', timeframe: '60' }, bars });
    const t = await r.text();
    if (r.status !== 200) console.log('RUN BODY', t.slice(0, 400));
    expect(r.status).toBe(200);
    expect(t).not.toContain('mySecretFactor');
    expect(JSON.parse(t).model.series.length).toBeGreaterThan(0);
  });
  it('unpublished scripts are invisible to students', async () => {
    await call('admin', 'PUT', '/api/pine/scripts', { id, source: SRC, published: false });
    const j = await (await call('student', 'GET', '/api/pine/scripts')).json();
    expect(j.scripts.length).toBe(0);
    expect((await call('student', 'POST', '/api/pine/run', { id, market: { symbol: 'EURUSD', timeframe: '60' }, bars })).status).toBe(404);
  });
});
