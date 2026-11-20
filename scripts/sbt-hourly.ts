/**
 * HOURLY H1 LEVEL ENGINE (GitHub Actions, every hour): runs the owner's private SBT strategy on every
 * pair with a fundamental bias, turns the change since the previous hour into events
 * (Level activated / ready / deactivated, trade closed, market open / closed), publishes the result as
 * the release asset sbt-levels/levels.json and asks the live site to deliver phone / PC push alerts.
 * The strategy source is fetched from the live site with a GitHub OIDC token (proof that this is the
 * repository's own sbt-levels workflow on main — no shared secret) and only kept in the runner's memory
 * and temp workspace. Only levels / events (what the app already shows) are published.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { scanSymbol, currentBar } from '../server/sbt/sbtScanner';
import { diffEvents, marketEvents, toState, type LevelEvent, type PairState } from '../server/sbt/levelEvents';

const SITE = process.env.PPFX_SITE || 'https://primepipfx.site';
const REPO = process.env.GITHUB_REPOSITORY || 'whbzafar/prime-pip-command-center-level';
const TAG = 'sbt-levels';
const MIN_SCORE = 10;
// Rankings symbol → chart-feed ticker (crypto trades against USDT on the feed; copper has its own name).
const TICKER: Record<string, string> = { XCUUSD: 'COPPER', BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', XRPUSD: 'XRPUSDT', BNBUSD: 'BNBUSDT', DOGEUSD: 'DOGEUSDT', ADAUSD: 'ADAUSDT' };
const marketOf = (s: string) => (/USDT$/.test(s) ? 'crypto' : /^X(AU|AG|PT|PD)/.test(s) ? 'metals' : /OIL|GAS|COPPER/.test(s) ? 'energy' : /^(US|GER|UK|JP)\d/.test(s) ? 'indices' : 'forex');

async function loadStrategy(attempt = 1): Promise<void> {
  try { await loadStrategyOnce(); } catch (e) {
    if (attempt >= 5) throw e;
    console.warn(`strategy fetch failed (${(e as Error).message}) — the site may be waking or redeploying; retrying in 45 s`);
    await new Promise((r) => setTimeout(r, 45_000));
    return loadStrategy(attempt + 1);
  }
}
async function loadStrategyOnce() {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, tok = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !tok) throw new Error('No GitHub OIDC token available (id-token: write permission missing?)');
  const oidc = await fetch(`${url}&audience=primepipfx-sbt`, { headers: { Authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(30_000) }).then((r) => r.json());
  const r = await fetch(`${SITE}/api/sbt/source`, { method: 'POST', headers: { Authorization: `Bearer ${oidc.value}` }, signal: AbortSignal.timeout(90_000) }).then((x) => x.json());
  if (!r?.ok || !r.source) throw new Error(`Strategy not available: ${r?.error || 'unknown'}`);
  // The scanner reads its script from the local private-script store when no cloud store is configured.
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/pine_private_scripts.json', JSON.stringify([{ id: 'ppfx_sbt_levels', name: 'Prime Pip SBT (hourly job)', source: r.source, published: false, updatedAt: Date.now() }]));
}

async function main() {
  const t0 = Date.now();
  await loadStrategy();
  const rk = await fetch(`${SITE}/api/macro/rankings`).then((r) => r.json());
  const all: any[] = rk?.data?.all || [];
  const universe = all.filter((p) => Math.abs(Number(p.longTerm)) >= MIN_SCORE).map((p) => {
    const ticker = TICKER[p.symbol] || p.symbol;
    return { symbol: ticker, display: String(p.display || p.symbol), market: marketOf(ticker), side: (Number(p.longTerm) > 0 ? 1 : -1) as 1 | -1, score: Number(p.longTerm) };
  });
  let prev: any = null;
  try { prev = await fetch(`https://github.com/${REPO}/releases/download/${TAG}/levels.json`, { redirect: 'follow' }).then((r) => (r.ok ? r.json() : null)); } catch { /* first run */ }
  const prevMap: Record<string, PairState> = Object.fromEntries((prev?.pairs || []).map((p: PairState) => [p.symbol, p]));

  const bar = currentBar();
  const states: PairState[] = [];
  const queue = [...universe];
  await Promise.all(Array.from({ length: 3 }, async () => {
    for (let m = queue.shift(); m; m = queue.shift()) {
      const t = Date.now();
      let scan: any;
      try { scan = await scanSymbol(m.symbol, bar); } catch (e: any) { scan = { ok: false, error: String(e?.message || e) }; }
      const st = toState(m, scan);
      states.push(st);
      console.log(`${m.symbol.padEnd(8)} ${String(Date.now() - t).padStart(6)}ms ${st.ok ? `dir ${st.dir} L1 ${st.level1 ? 'y' : '-'} L2 ${st.level2 ? 'y' : '-'} trade ${st.inTrade ? 'y' : '-'} hit ${st.hit ? `L${st.hit.level}` : '-'}${st.stale ? ' STALE' : ''}` : `ERR ${st.error}`}`);
    }
  }));
  // Keep a pair's last good state when its scan failed this hour (no false "deactivated" from a data gap).
  const finalStates = states.map((s) => (s.ok ? s : prevMap[s.symbol]?.ok ? { ...prevMap[s.symbol], score: s.score, side: s.side, error: s.error } : s));
  const events: LevelEvent[] = diffEvents(prevMap, states);
  const mk = marketEvents(prev?.marketOpen, Date.now());
  events.push(...mk.events);
  const seen = new Set((prev?.events || []).map((e: LevelEvent) => e.id));
  const fresh = events.filter((e) => !seen.has(e.id));
  const log = [...fresh, ...(prev?.events || [])].filter((e: LevelEvent) => Date.now() - e.time < 7 * 24 * 3_600_000).slice(0, 300);
  const out = { version: 2, generatedAt: new Date().toISOString(), bar, marketOpen: mk.open, ms: Date.now() - t0, pairs: finalStates.sort((a, b) => Math.abs(b.score) - Math.abs(a.score)), fresh: fresh.map((e) => e.id), events: log };
  fs.writeFileSync('levels.json', JSON.stringify(out));
  console.log(`\n${finalStates.length} pairs · ${fresh.length} new events: ${fresh.map((e) => `${e.kind} ${e.symbol}${e.level ? ` L${e.level}` : ''}`).join(', ') || 'none'} · ${Math.round((Date.now() - t0) / 1000)}s`);
  try { execFileSync('gh', ['release', 'view', TAG, '-R', REPO], { stdio: 'ignore' }); } catch { execFileSync('gh', ['release', 'create', TAG, '-R', REPO, '--title', 'SBT H1 levels (hourly, generated)', '--notes', 'Generated every hour by .github/workflows/sbt-levels.yml. Levels and events only — no strategy code.', '--latest=false'], { stdio: 'inherit' }); }
  execFileSync('gh', ['release', 'upload', TAG, 'levels.json', '--clobber', '-R', REPO], { stdio: 'inherit' });
  const ping = await fetch(`${SITE}/api/sbt/ingest`, { method: 'POST' }).then((r) => r.text()).catch((e) => String(e));
  console.log('ingest:', ping.slice(0, 300));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
