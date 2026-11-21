/**
 * EVOLUTION COMMAND CENTER — an honest self-watching loop for the app.
 *
 * Every run (automatically every 30 minutes while the server is awake, or on demand) it:
 *  1. SCANS the live app for real gaps: failing or stale data sources, assets without enough live data, calendar
 *     events the scoring engine does not understand yet, a stale level-alert engine, non-durable account storage.
 *  2. RESEARCHES the outside world with free public sources (Hacker News, GitHub): what traders / fintech builders
 *     are talking about and building right now — real links, no invented trends.
 *  3. SELF-HEALS what it safely can (re-pulls the data sources when they are stale or degraded) and logs it.
 * Administrators add ideas; every finding / idea / radar item can be turned into a build brief. The engine never
 * rewrites its own code unattended: code changes go through the brief and are built and reviewed, then deployed.
 */
import { Router, type RequestHandler } from 'express';
import { getShared, setShared, durableStatus, durableEnabled } from '../durableStore.js';
import { getSnapshot, refreshAndCompute, unmatchedCalendarTitles } from '../macro/macroService.js';
import { getSourceHealth } from '../macro/sources/http.js';

export type Severity = 'critical' | 'warning' | 'info';
export interface Finding { id: string; severity: Severity; area: string; title: string; detail: string; evidence?: string[]; fix: string }
export interface Idea { id: string; text: string; status: 'new' | 'queued' | 'done' | 'dismissed'; by: string; at: number; source: 'admin' | 'scanner' | 'radar' }
export interface RadarItem { id: string; title: string; url: string; source: string; points: number; at: number; topic: string }
export interface LogEntry { at: number; kind: 'scan' | 'research' | 'heal' | 'idea'; text: string }
export interface CcState { lastScan: number; lastResearch: number; findings: Finding[]; radar: RadarItem[]; ideas: Idea[]; log: LogEntry[]; scans: number }

const KEY = 'cc_state';
const EMPTY: CcState = { lastScan: 0, lastResearch: 0, findings: [], radar: [], ideas: [], log: [], scans: 0 };
const REPO = process.env.GITHUB_REPOSITORY || 'whbzafar/prime-pip-command-center-level';
let running: Promise<CcState> | null = null;
let lastHeal = 0;

export const loadState = async (): Promise<CcState> => ({ ...EMPTY, ...(await getShared<CcState>(KEY, EMPTY, 0)) });
const save = async (s: CcState) => { s.log = s.log.slice(0, 80); s.ideas = s.ideas.slice(0, 200); await setShared(KEY, s); };

const ageMin = (iso?: string | number) => { const t = typeof iso === 'number' ? iso : Date.parse(String(iso || '')); return Number.isFinite(t) ? Math.round((Date.now() - t) / 60_000) : null; };

/** Pure: turn the app's measured state into findings. Exported for tests. */
export function detectGaps(input: {
  sources: Array<{ id: string; name: string; status: string; lastError: string | null; lastSuccess: string | null }>;
  assets: Array<{ symbol: string; name: string; assetClass: string; score: number | null; confidence: number }>;
  snapshotAgeMin: number | null;
  unmatched: Record<string, string[]>;
  levelsAgeMin: number | null;
  storageMode: string;
}): Finding[] {
  const out: Finding[] = [];
  const bad = input.sources.filter((s) => s.status === 'down' || s.status === 'degraded');
  if (bad.length) out.push({ id: 'sources', severity: bad.some((s) => s.status === 'down') ? 'critical' : 'warning', area: 'Data', title: `${bad.length} data source${bad.length > 1 ? 's' : ''} failing`, detail: 'These feeds feed the fundamental scores. While they fail, scores rely on older readings.', evidence: bad.map((s) => `${s.name}: ${s.status}${s.lastError ? ` — ${s.lastError.slice(0, 90)}` : ''}`), fix: 'Re-pull the sources (the Center does this automatically); if one keeps failing, add a backup source for it.' });
  if (input.snapshotAgeMin !== null && input.snapshotAgeMin > 360) out.push({ id: 'snapshot', severity: 'warning', area: 'Data', title: 'Fundamental scores are stale', detail: `The last full recompute was ${Math.round(input.snapshotAgeMin / 60)} h ago.`, fix: 'Refresh the sources and recompute.' });
  const thin = input.assets.filter((a) => a.assetClass !== 'STOCKS' && (a.score === null || a.confidence < 50));
  if (thin.length) out.push({ id: 'coverage', severity: thin.some((a) => a.score === null) ? 'warning' : 'info', area: 'Coverage', title: `${thin.length} market${thin.length > 1 ? 's have' : ' has'} thin live data`, detail: 'Below 50% data coverage a score is shown with low confidence; below 25% it is withheld.', evidence: thin.slice(0, 12).map((a) => `${a.name} (${a.symbol}): ${a.score === null ? 'no score' : `confidence ${a.confidence}%`}`), fix: 'Add or repair the indicators these markets are missing.' });
  const countries = Object.entries(input.unmatched).filter(([, t]) => t.length);
  const total = countries.reduce((s, [, t]) => s + t.length, 0);
  if (total) out.push({ id: 'unmatched', severity: 'info', area: 'Engine', title: `${total} economic releases are not scored yet`, detail: 'The calendar publishes these, but no indicator in the fundamental engine reads them — potential new indicators.', evidence: countries.slice(0, 6).map(([c, t]) => `${c}: ${t.slice(0, 4).join(', ')}${t.length > 4 ? ` (+${t.length - 4})` : ''}`), fix: 'Review the list and add the ones that move markets as new indicators.' });
  if (input.levelsAgeMin === null) out.push({ id: 'levels-missing', severity: 'warning', area: 'Alerts', title: 'Level-alert engine output not found', detail: 'The hourly Level 1 / Level 2 file could not be read.', fix: 'Check the “sbt-levels” GitHub Action.' });
  else if (input.levelsAgeMin > 150) out.push({ id: 'levels-stale', severity: 'critical', area: 'Alerts', title: 'Level alerts are stale', detail: `The hourly engine last published ${Math.round(input.levelsAgeMin / 60 * 10) / 10} h ago (expected every hour).`, fix: 'Check the “sbt-levels” GitHub Action run log; weekends/market closure can also cause this.' });
  if (input.storageMode === 'temporary') out.push({ id: 'storage', severity: 'critical', area: 'Accounts', title: 'Member accounts are not stored durably', detail: 'Without a database or session secret, sign-ups, edits and deletions are lost when the server restarts.', fix: 'Connect the free Upstash Redis database (KV_REST_API_URL / KV_REST_API_TOKEN) on Render.' });
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

async function levelsAge(): Promise<number | null> {
  try {
    const r = await fetch(`https://github.com/${REPO}/releases/download/sbt-levels/levels.json`, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const j: any = await r.json();
    return ageMin(j?.generatedAt);
  } catch { return null; }
}

const TOPICS: Array<{ q: string; topic: string }> = [
  { q: 'trading platform', topic: 'Trading platforms' }, { q: 'forex', topic: 'Forex' }, { q: 'fintech AI agent', topic: 'AI in finance' },
  { q: 'market data API', topic: 'Market data' }, { q: 'prediction market', topic: 'Prediction markets' },
];
async function research(): Promise<RadarItem[]> {
  const since = Math.floor(Date.now() / 1000) - 14 * 86400;
  const out: RadarItem[] = [];
  await Promise.all(TOPICS.map(async ({ q, topic }) => {
    try {
      const r = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${since},points>30&hitsPerPage=4`, { signal: AbortSignal.timeout(8000) });
      const j: any = await r.json();
      for (const h of j?.hits || []) out.push({ id: `hn-${h.objectID}`, title: String(h.title), url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, source: 'Hacker News', points: Number(h.points) || 0, at: Date.parse(h.created_at), topic });
    } catch { /* source unreachable this run */ }
  }));
  try {
    const d = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(`trading OR forex OR quant created:>${d}`)}&sort=stars&order=desc&per_page=6`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'primepipfx-command-center' }, signal: AbortSignal.timeout(8000) });
    const j: any = await r.json();
    for (const h of j?.items || []) out.push({ id: `gh-${h.id}`, title: `${h.full_name} — ${String(h.description || '').slice(0, 110)}`, url: h.html_url, source: 'GitHub (new this month)', points: Number(h.stargazers_count) || 0, at: Date.parse(h.created_at), topic: 'Open-source trading' });
  } catch { /* ignore */ }
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).sort((a, b) => b.points - a.points).slice(0, 24);
}

/** One full cycle: scan → self-heal if safe → (at most hourly) research → save. */
export function runCycle(opts: { research?: boolean } = {}): Promise<CcState> {
  if (running) return running;
  running = (async () => {
    const st = await loadState();
    const log = (kind: LogEntry['kind'], text: string) => st.log.unshift({ at: Date.now(), kind, text });
    try {
      let snap = await getSnapshot().catch(() => null);
      const measure = async () => detectGaps({
        sources: getSourceHealth().map((s) => ({ id: s.id, name: s.name, status: s.status, lastError: s.lastError, lastSuccess: s.lastSuccess })),
        assets: (snap?.assets || []).map((a) => ({ symbol: a.symbol, name: a.name, assetClass: a.assetClass, score: a.score, confidence: a.confidence })),
        snapshotAgeMin: snap ? ageMin(snap.generatedAt) : null, unmatched: unmatchedCalendarTitles(), levelsAgeMin: await levelsAge(), storageMode: durableStatus().mode,
      });
      let findings = await measure();
      // Self-heal: stale or failing data → re-pull once (never more than every 20 minutes).
      if (findings.some((f) => f.id === 'sources' || f.id === 'snapshot') && Date.now() - lastHeal > 20 * 60_000) {
        lastHeal = Date.now();
        try { snap = await refreshAndCompute(true); log('heal', 'Data sources were failing or stale — re-pulled every source and recomputed the scores.'); findings = await measure(); } catch (e: any) { log('heal', `Re-pull attempted but failed: ${String(e?.message || e).slice(0, 100)}`); }
      }
      st.findings = findings; st.lastScan = Date.now(); st.scans += 1;
      log('scan', findings.length ? `Scan found ${findings.length} gap${findings.length > 1 ? 's' : ''} (${findings.filter((f) => f.severity === 'critical').length} critical).` : 'Scan found no gaps — everything measured is healthy.');
      if (opts.research || Date.now() - st.lastResearch > 3 * 3600_000) {
        const radar = await research();
        if (radar.length) { st.radar = radar; st.lastResearch = Date.now(); log('research', `Radar updated: ${radar.length} live signals from Hacker News and GitHub.`); }
        else log('research', 'Radar sources were unreachable this run; keeping the previous list.');
      }
    } catch (e: any) { log('scan', `Cycle error: ${String(e?.message || e).slice(0, 120)}`); }
    await save(st);
    return st;
  })().finally(() => { running = null; });
  return running;
}

let timer: NodeJS.Timeout | null = null;
/** Start the autonomous loop (idempotent). First run shortly after boot, then every 30 minutes. */
export function startCommandCenter() {
  if (timer) return;
  setTimeout(() => void runCycle().catch(() => undefined), 60_000);
  timer = setInterval(() => void runCycle().catch(() => undefined), 30 * 60_000);
  timer.unref?.();
}

const id = () => Math.random().toString(36).slice(2, 10);
export function commandCenterRouter(guard: RequestHandler) {
  const r = Router();
  r.use(guard);
  r.get('/', async (_q, res) => { res.set('Cache-Control', 'no-store'); const s = await loadState(); res.json({ ok: true, state: s, storage: { durable: durableEnabled || durableStatus().enabled, mode: durableStatus().mode }, running: Boolean(running) }); });
  r.post('/scan', async (_q, res) => { res.set('Cache-Control', 'no-store'); res.json({ ok: true, state: await runCycle({ research: true }) }); });
  r.post('/ideas', async (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 600);
    if (text.length < 4) return res.status(400).json({ ok: false, error: 'Write the idea in a few words.' });
    const s = await loadState();
    s.ideas.unshift({ id: id(), text, status: 'new', by: (req as any).currentUser?.username || 'admin', at: Date.now(), source: req.body?.source === 'scanner' || req.body?.source === 'radar' ? req.body.source : 'admin' });
    s.log.unshift({ at: Date.now(), kind: 'idea', text: `Idea added: ${text.slice(0, 80)}` });
    await save(s); res.json({ ok: true, state: s });
  });
  r.patch('/ideas/:id', async (req, res) => {
    const s = await loadState(); const it = s.ideas.find((x) => x.id === req.params.id);
    if (!it) return res.status(404).json({ ok: false, error: 'Idea not found' });
    if (['new', 'queued', 'done', 'dismissed'].includes(req.body?.status)) it.status = req.body.status;
    await save(s); res.json({ ok: true, state: s });
  });
  r.delete('/ideas/:id', async (req, res) => { const s = await loadState(); s.ideas = s.ideas.filter((x) => x.id !== req.params.id); await save(s); res.json({ ok: true, state: s }); });
  return r;
}
