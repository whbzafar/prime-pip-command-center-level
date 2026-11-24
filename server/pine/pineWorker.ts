/** Worker thread: runs Pine scripts off the main event loop so the rest of the server stays responsive. */
import { parentPort } from 'worker_threads';
import { runScriptInProcess } from './pineRunner';

parentPort?.on('message', async (msg: { id: number; input: any }) => {
  let out: any;
  try { out = await runScriptInProcess(msg.input); } catch (err: any) { out = { ok: false, error: String(err?.message || err), ms: 0 }; }
  parentPort!.postMessage({ id: msg.id, out });
});
