import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Radar, RefreshCw, Lightbulb, AlertOctagon, AlertTriangle, Info, Copy, Check, Plus, ExternalLink, HeartPulse, Trash2, Wrench } from 'lucide-react';
import { getStoredToken } from '../../utils/authClient';

interface Finding { id: string; severity: 'critical' | 'warning' | 'info'; area: string; title: string; detail: string; evidence?: string[]; fix: string }
interface Idea { id: string; text: string; status: 'new' | 'queued' | 'done' | 'dismissed'; by: string; at: number; source: string }
interface RadarItem { id: string; title: string; url: string; source: string; points: number; at: number; topic: string }
interface LogEntry { at: number; kind: string; text: string }
interface St { lastScan: number; lastResearch: number; findings: Finding[]; radar: RadarItem[]; ideas: Idea[]; log: LogEntry[]; scans: number }

const sev = { critical: { Icon: AlertOctagon, cls: 'border-rose-500/50 bg-rose-500/10 text-rose-200', tag: 'bg-rose-500 text-white' }, warning: { Icon: AlertTriangle, cls: 'border-amber-500/40 bg-amber-500/10 text-amber-100', tag: 'bg-amber-400 text-amber-950' }, info: { Icon: Info, cls: 'border-sky-500/30 bg-sky-500/5 text-sky-100', tag: 'bg-sky-400 text-sky-950' } } as const;
const ago = (t: number) => { if (!t) return 'never'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const pkt = (t: number) => new Date(t).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const CommandCenter: React.FC = () => {
  const [st, setSt] = useState<St | null>(null);
  const [mode, setMode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const headers = useCallback((): Record<string, string> => { const t = getStoredToken(); return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }; }, []);
  const call = useCallback(async (path: string, method = 'GET', body?: unknown) => {
    try {
      const r = await fetch(`/api/admin/command-center${path}`, { method, credentials: 'include', headers: headers(), body: body ? JSON.stringify(body) : undefined });
      const j = await r.json().catch(() => null);
      if (!j?.ok) { setErr(j?.error || `Server error ${r.status}`); return null; }
      setErr(''); if (j.state) setSt(j.state); if (j.storage) setMode(j.storage.mode); return j;
    } catch { setErr('Could not reach the server.'); return null; }
  }, [headers]);
  useEffect(() => { void call(''); const t = setInterval(() => void call(''), 60_000); return () => clearInterval(t); }, [call]);

  const scan = async () => { setBusy(true); await call('/scan', 'POST'); setBusy(false); };
  const addIdea = async (t: string, source = 'admin') => { if (t.trim().length < 4) return; await call('/ideas', 'POST', { text: t.trim(), source }); };

  const brief = useMemo(() => {
    if (!st) return '';
    const open = st.ideas.filter((i) => i.status === 'new' || i.status === 'queued');
    return [
      '# Prime Pip — build brief (from the Evolution Command Center)', `Generated ${pkt(Date.now())} PKT`, '',
      '## Gaps found by the live scan', ...(st.findings.length ? st.findings.map((f) => `- [${f.severity.toUpperCase()}] ${f.area}: ${f.title}. ${f.detail} Suggested fix: ${f.fix}${f.evidence?.length ? ` (evidence: ${f.evidence.slice(0, 4).join('; ')})` : ''}`) : ['- none']), '',
      '## Admin ideas', ...(open.length ? open.map((i) => `- (${i.status}) ${i.text}`) : ['- none']), '',
      '## Outside signals (real links)', ...st.radar.slice(0, 8).map((r) => `- ${r.title} — ${r.url}`), '',
      'Rules: real data only, no fake or dummy values; free tools only; test, then deploy.',
    ].join('\n');
  }, [st]);
  const copy = async () => { try { await navigator.clipboard.writeText(brief); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };

  const crit = st?.findings.filter((f) => f.severity === 'critical').length || 0;
  return (
    <div className="space-y-5" data-testid="command-center">
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-slate-950 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-cyan-400 text-slate-950"><HeartPulse className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="font-military font-bold text-lg text-white tracking-wide">Evolution Command Center</div>
            <div className="text-[12px] text-slate-400"><span className="inline-flex items-center gap-1 text-emerald-300 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Autonomous</span> · scans every 30 min while online · last scan {ago(st?.lastScan || 0)} · {st?.scans ?? 0} scans so far</div>
          </div>
          <button type="button" onClick={scan} disabled={busy} data-testid="cc-scan" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-400 text-slate-950 text-[12.5px] font-black cursor-pointer disabled:opacity-60"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Scanning…' : 'Scan & research now'}</button>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[['Critical gaps', crit, crit ? 'text-rose-300' : 'text-emerald-300'], ['All gaps', st?.findings.length ?? 0, 'text-amber-200'], ['Open ideas', st?.ideas.filter((i) => i.status === 'new' || i.status === 'queued').length ?? 0, 'text-cyan-200'], ['Radar signals', st?.radar.length ?? 0, 'text-fuchsia-200']].map(([l, v, c]) => (
            <div key={l as string} className="rounded-xl border border-slate-800 bg-slate-900/60 py-2"><div className={`text-xl font-black ${c}`}>{v as number}</div><div className="text-[10.5px] uppercase tracking-wider text-slate-400">{l as string}</div></div>))}
        </div>
        {mode === 'temporary' && <div className="mt-3 text-[11.5px] text-rose-200">Storage is temporary: the Center’s memory and member changes reset when the server restarts.</div>}
      </div>
      {err && <div className="text-[12px] text-rose-300 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">{err}</div>}

      <section className="space-y-2">
        <div className="text-[11px] uppercase tracking-widest font-bold text-slate-400">Gaps found in the app right now</div>
        {st && !st.findings.length && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[12.5px] text-emerald-200">{st.lastScan ? 'No gaps detected: every data source, feed and engine measured is healthy.' : 'No scan has run yet — press “Scan & research now”.'}</div>}
        {st?.findings.map((f) => { const S = sev[f.severity]; return (
          <div key={f.id} className={`rounded-2xl border p-3 ${S.cls}`}>
            <div className="flex items-center gap-2 flex-wrap"><S.Icon className="w-4 h-4" /><span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase ${S.tag}`}>{f.severity}</span><span className="text-[10.5px] uppercase tracking-wider opacity-70">{f.area}</span><span className="font-bold text-[13px] text-white">{f.title}</span></div>
            <div className="text-[12px] mt-1 opacity-90">{f.detail}</div>
            {f.evidence && <ul className="mt-1 text-[11.5px] opacity-80 list-disc pl-5">{f.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11.5px]"><Wrench className="w-3 h-3" /><span className="opacity-90">{f.fix}</span>
              <button type="button" onClick={() => void addIdea(`Fix: ${f.title} — ${f.fix}`, 'scanner')} className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-white/20 hover:bg-white/10 cursor-pointer"><Plus className="w-3 h-3" />Add to ideas</button></div>
          </div>); })}
      </section>

      <section className="space-y-2">
        <div className="text-[11px] uppercase tracking-widest font-bold text-slate-400">Your ideas &amp; instructions</div>
        <div className="flex gap-2"><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { void addIdea(text); setText(''); } }} placeholder="Describe a feature, category or change you want…" className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-white" data-testid="cc-idea-input" />
          <button type="button" onClick={() => { void addIdea(text); setText(''); }} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-400 text-slate-950 text-[12.5px] font-black cursor-pointer"><Lightbulb className="w-4 h-4" />Add</button></div>
        {st?.ideas.map((i) => (
          <div key={i.id} className={`flex items-start gap-2 rounded-xl border p-2.5 ${i.status === 'dismissed' || i.status === 'done' ? 'border-slate-800 bg-slate-900/30 opacity-60' : 'border-slate-700 bg-slate-900/60'}`}>
            <div className="min-w-0 flex-1"><div className="text-[12.5px] text-white">{i.text}</div><div className="text-[10.5px] text-slate-500">{i.source} · {i.by} · {pkt(i.at)} PKT · <b className="text-slate-300">{i.status}</b></div></div>
            {(['queued', 'done', 'dismissed'] as const).map((s) => <button key={s} type="button" onClick={() => void call(`/ideas/${i.id}`, 'PATCH', { status: s })} className={`px-2 py-0.5 rounded-lg border text-[10.5px] cursor-pointer ${i.status === s ? 'border-cyan-400 text-cyan-200' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{s}</button>)}
            <button type="button" aria-label="Delete idea" onClick={() => void call(`/ideas/${i.id}`, 'DELETE')} className="p-1 text-slate-500 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>))}
        {st && !st.ideas.length && <div className="text-[12px] text-slate-500">No ideas yet.</div>}
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-400/50 bg-cyan-500/10 text-cyan-100 text-[12.5px] font-bold cursor-pointer" data-testid="cc-brief">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied' : 'Copy build brief (gaps + ideas + radar)'}</button>
        <div className="text-[11px] text-slate-500">Paste the brief to Claude to have everything built, tested and deployed. The Center never changes the app’s code by itself unattended.</div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-slate-400"><Radar className="w-3.5 h-3.5 text-fuchsia-300" />Global research radar <span className="normal-case tracking-normal text-slate-500">· Hacker News &amp; GitHub, last 2–4 weeks · updated {ago(st?.lastResearch || 0)}</span></div>
        {st?.radar.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
            <div className="min-w-0 flex-1"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-white hover:text-cyan-300 inline-flex items-center gap-1">{r.title}<ExternalLink className="w-3 h-3 shrink-0" /></a><div className="text-[10.5px] text-slate-500">{r.topic} · {r.source} · {r.points} {r.source.startsWith('GitHub') ? '★' : 'points'}</div></div>
            <button type="button" onClick={() => void addIdea(`Explore: ${r.title.slice(0, 120)}`, 'radar')} className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10.5px] text-slate-300 hover:text-white cursor-pointer">Add to ideas</button>
          </div>))}
        {st && !st.radar.length && <div className="text-[12px] text-slate-500">No radar data yet — press “Scan &amp; research now”.</div>}
      </section>

      <section className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-widest font-bold text-slate-400">Activity &amp; self-healing log</div>
        {st?.log.slice(0, 15).map((l, i) => <div key={i} className="text-[11.5px] text-slate-300 flex gap-2"><span className="text-slate-500 shrink-0">{pkt(l.at)}</span><span className={l.kind === 'heal' ? 'text-emerald-300' : ''}>{l.text}</span></div>)}
        {st && !st.log.length && <div className="text-[12px] text-slate-500">Nothing logged yet.</div>}
      </section>
    </div>
  );
};
