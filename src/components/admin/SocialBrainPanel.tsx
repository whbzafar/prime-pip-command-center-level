import React, { useEffect, useState } from 'react';
import { BrainCircuit, CalendarDays, ClipboardCheck, Inbox, LibraryBig, LineChart, Megaphone, Save } from 'lucide-react';
import { getStoredToken } from '../../utils/authClient';
import { getTopics } from '../../utils/topicContent';

const call = async (path: string, method = 'GET', body?: unknown): Promise<any> => {
  const t = getStoredToken();
  const r = await fetch(`/api/admin/social-brain${path}`, { method, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || `Request failed (${r.status})`); return j;
};
const box = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';
const btn = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60';
const Sec: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4"><h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">{icon}{title}</h4>{children}</section>
);

export const SocialBrainPanel: React.FC = () => {
  const [brand, setBrand] = useState<any>({ name: '', site: '', founder: '', logoUrl: '', colors: '', typography: '', voice: '', slogans: '', audience: '', products: '', allowedFigures: '', guidelines: '' });
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const [perf, setPerf] = useState<any>({ platform: 'instagram', contentType: 'educational-video', views: '', saves: '', shares: '', comments: '', completion: '', profileVisits: '', followerGain: '', postId: '' });
  const [report, setReport] = useState<any>(null); const [plan, setPlan] = useState<any>(null);
  const [qc, setQc] = useState<any>(null); const [qcIn, setQcIn] = useState({ platform: 'instagram', title: '', caption: '', hashtags: '', cta: '' });
  const [comments, setComments] = useState(''); const [triage, setTriage] = useState<any[] | null>(null);
  const [sentence, setSentence] = useState(''); const [camp, setCamp] = useState<any>(null);
  const [lib, setLib] = useState<any[]>([]);
  const loadLib = async () => { try { setLib((await call('/library')).items); } catch (e) { /* shown elsewhere */ } };
  useEffect(() => { void loadLib(); }, []);
  const setStatus = async (id: string, status: string) => { try { await call(`/library/${id}/status`, 'POST', { status }); await loadLib(); } catch (e) { fail(e); } };
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };
  const fail = (e: any) => flash(String(e?.message || e));
  const load = async () => { try { const j = await call(''); const b = j.brand; setBrand({ ...b, colors: b.colors.join('\n'), slogans: b.slogans.join('\n'), products: b.products.join('\n'), allowedFigures: b.allowedFigures.join('\n'), guidelines: b.guidelines.join('\n') }); } catch (e) { fail(e); } };
  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-4" data-testid="social-brain">
      <div className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-emerald-300" /><h3 className="text-base font-bold text-white">Social Brain — memory, quality gate, results, calendar</h3></div>
      {msg && <p className="text-xs text-emerald-300" role="status">{msg}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Sec icon={<Save className="h-4 w-4 text-emerald-300" />} title="Brand memory (the only source of facts the agent may use)">
          <div className="grid gap-2">
            {(['name', 'site', 'founder', 'logoUrl', 'typography', 'voice', 'audience'] as const).map((k) => <label key={k} className="text-[11px] text-slate-400">{k}<input className={box} value={brand[k] || ''} onChange={(e) => setBrand({ ...brand, [k]: e.target.value })} /></label>)}
            {(['colors', 'slogans', 'products', 'allowedFigures', 'guidelines'] as const).map((k) => <label key={k} className="text-[11px] text-slate-400">{k} (one per line)<textarea rows={3} className={box} value={brand[k] || ''} onChange={(e) => setBrand({ ...brand, [k]: e.target.value })} /></label>)}
            <p className="text-[11px] text-amber-300/90">Put only true numbers under allowedFigures (for example “31 pairs”). Any other figure in a post is blocked.</p>
            <button type="button" className={`${btn} bg-emerald-500 text-slate-950`} disabled={busy} onClick={async () => { setBusy(true); try { await call('/brand', 'PUT', brand); flash('Brand memory saved'); } catch (e) { fail(e); } finally { setBusy(false); } }}><Save className="h-4 w-4" />Save brand memory</button>
          </div>
        </Sec>

        <Sec icon={<ClipboardCheck className="h-4 w-4 text-sky-300" />} title="Quality gate (runs before anything is scheduled)">
          <div className="grid gap-2">
            <select className={box} value={qcIn.platform} onChange={(e) => setQcIn({ ...qcIn, platform: e.target.value })}>{['instagram', 'facebook', 'tiktok', 'youtube'].map((p) => <option key={p}>{p}</option>)}</select>
            <input className={box} placeholder="Title" value={qcIn.title} onChange={(e) => setQcIn({ ...qcIn, title: e.target.value })} />
            <textarea rows={4} className={box} placeholder="Caption" value={qcIn.caption} onChange={(e) => setQcIn({ ...qcIn, caption: e.target.value })} />
            <input className={box} placeholder="Hashtags, comma separated" value={qcIn.hashtags} onChange={(e) => setQcIn({ ...qcIn, hashtags: e.target.value })} />
            <button type="button" className={`${btn} bg-sky-500 text-slate-950`} onClick={async () => { try { const j = await call('/quality', 'POST', { ...qcIn, hashtags: qcIn.hashtags.split(',').map((h) => h.trim().replace(/^#/, '')).filter(Boolean) }); setQc(j.qc); } catch (e) { fail(e); } }}>Check post</button>
            {qc && <div className="rounded-lg border border-slate-700 p-2 text-[12px]">
              <div className={qc.pass ? 'font-bold text-emerald-300' : 'font-bold text-rose-300'}>{qc.pass ? 'Passes the gate' : 'Blocked'}</div>
              {qc.blockers.map((b: string, i: number) => <div key={`b${i}`} className="text-rose-200">✗ {b}</div>)}
              {qc.warnings.map((w: string, i: number) => <div key={`w${i}`} className="text-amber-200">! {w}</div>)}
            </div>}
          </div>
        </Sec>

        <Sec icon={<LineChart className="h-4 w-4 text-violet-300" />} title="Log a post's results (copy numbers from the platform)">
          <div className="grid grid-cols-2 gap-2">
            <select className={box} value={perf.platform} onChange={(e) => setPerf({ ...perf, platform: e.target.value })}>{['instagram', 'facebook', 'tiktok', 'youtube'].map((p) => <option key={p}>{p}</option>)}</select>
            <select className={box} value={perf.contentType} onChange={(e) => setPerf({ ...perf, contentType: e.target.value })}>{['educational-video', 'promotional-poster', 'interesting-facts', 'short-form-video', 'community-engagement', 'brand-advertisement', 'weekly-highlights'].map((p) => <option key={p}>{p}</option>)}</select>
            {(['views', 'saves', 'shares', 'comments', 'completion', 'profileVisits', 'followerGain'] as const).map((k) => <input key={k} className={box} placeholder={k} inputMode="numeric" value={perf[k]} onChange={(e) => setPerf({ ...perf, [k]: e.target.value })} />)}
            <button type="button" className={`${btn} col-span-2 bg-violet-500 text-white`} onClick={async () => { try { await call('/perf', 'POST', perf); flash('Results logged'); } catch (e) { fail(e); } }}>Log results</button>
          </div>
        </Sec>

        <Sec icon={<CalendarDays className="h-4 w-4 text-amber-300" />} title="Weekly calendar and report">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${btn} bg-amber-400 text-slate-900`} onClick={async () => { try { setPlan((await call('/plan')).plan); } catch (e) { fail(e); } }}>Build this week's plan</button>
            <button type="button" className={`${btn} bg-emerald-500/30 text-emerald-100`} data-testid="queue-week" onClick={async () => { try { const topics = getTopics().map((t) => ({ id: t.id, title: t.title, short: t.short, features: t.features })); const r = (await call('/calendar/queue', 'POST', { topics })).result; flash(`${r.added} drafts added to review${r.skipped.length ? `, ${r.skipped.length} days already queued` : ''}. ${r.note}`); await loadLib(); } catch (e) { fail(e); } }}>Send this week to review</button>
            <button type="button" className={`${btn} bg-slate-700 text-slate-100`} onClick={async () => { try { setReport((await call('/report')).report); } catch (e) { fail(e); } }}>Weekly report</button>
          </div>
          {plan && <div className="mt-2 text-[12px] text-slate-300"><div className="mb-1 text-slate-400">{plan.note}</div>{plan.days.map((d: any) => <div key={d.day}>{d.day}: <span className={d.changed ? 'text-amber-200' : ''}>{d.contentType}</span></div>)}</div>}
          {report && <div className="mt-2 space-y-1 text-[12px] text-slate-300">{report.enough ? <>{report.lines.map((l: string, i: number) => <div key={i}>• {l}</div>)}<div className="text-[11px] text-slate-500">{report.formula}</div></> : <div className="text-amber-200">{report.message}</div>}</div>}
        </Sec>

        <Sec icon={<Inbox className="h-4 w-4 text-rose-300" />} title="Community triage (drafts only, a human approves)">
          <textarea rows={4} className={box} placeholder="One comment per line" value={comments} onChange={(e) => setComments(e.target.value)} />
          <button type="button" className={`${btn} mt-2 bg-rose-500/80 text-white`} onClick={async () => { try { setTriage((await call('/community', 'POST', { comments: comments.split('\n').filter(Boolean) })).items); } catch (e) { fail(e); } }}>Classify comments</button>
          {triage && <div className="mt-2 space-y-2 text-[12px]">{triage.map((t, i) => <div key={i} className="rounded-lg border border-slate-700 p-2"><div className="text-slate-200">{t.text}</div><div className="text-[11px] text-slate-400">{t.category}{t.needsHuman ? ' · needs a human' : ''}{t.flags.length ? ` · ${t.flags.join('; ')}` : ''}</div>{t.reply && <div className="mt-1 text-emerald-200">Draft: {t.reply}</div>}</div>)}</div>}
        </Sec>

        <Sec icon={<Megaphone className="h-4 w-4 text-fuchsia-300" />} title="Campaign planner from one sentence">
          <input className={box} placeholder="e.g. Introduce PrimePipFX to new students" value={sentence} onChange={(e) => setSentence(e.target.value)} />
          <button type="button" className={`${btn} mt-2 bg-fuchsia-500 text-white`} onClick={async () => { try { const topics = getTopics().map((t) => ({ id: t.id, title: t.title, short: t.short, features: t.features })); setCamp((await call('/campaign', 'POST', { sentence, topics })).campaign); } catch (e) { fail(e); } }}>Plan 7-day campaign</button>
          {camp && <div className="mt-2 space-y-1 text-[12px] text-slate-300">
            <div className="text-slate-400">Audience: {camp.audience}</div>
            {camp.strategy.map((s: string, i: number) => <div key={i}>• {s}</div>)}
            {camp.calendar.map((d: any) => <div key={d.day} className="text-slate-300">{d.day} · {d.contentType} · {d.platform} · {d.qc.pass ? 'passes gate' : 'blocked: ' + d.qc.blockers[0]}</div>)}
            <div className="text-slate-400">{camp.performanceTargets}</div>
          </div>}
        </Sec>
        <Sec icon={<LibraryBig className="h-4 w-4 text-violet-300" />} title={`Content library and approval queue (${lib.length})`}>
          {lib.length === 0 && <p className="text-[12px] text-slate-400">Nothing saved yet. Use “Save to library” in the Content Studio.</p>}
          <div className="max-h-96 space-y-2 overflow-auto text-[12px]">
            {lib.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-700 p-2" data-testid={`asset-${a.status}`}>
                <div className="flex flex-wrap items-center gap-2"><b className="text-slate-100">{a.title}</b><span className="text-[11px] text-slate-400">{a.platform}</span><span className={`rounded px-1.5 text-[11px] ${a.status === 'approved' ? 'bg-emerald-500/20 text-emerald-200' : a.status === 'blocked' ? 'bg-rose-500/20 text-rose-200' : 'bg-slate-700 text-slate-200'}`}>{a.status}</span></div>
                <div className="mt-1 line-clamp-2 text-slate-300">{a.text}</div>
                {a.qc.blockers.map((b: string, i: number) => <div key={i} className="text-rose-200">✗ {b}</div>)}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(a.status === 'draft') && <button type="button" className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-bold text-slate-950" onClick={() => setStatus(a.id, 'approved')}>Approve</button>}
                  {(a.status === 'approved') && <button type="button" className="rounded bg-sky-500 px-2 py-1 text-[11px] font-bold text-slate-950" onClick={() => setStatus(a.id, 'published')} title="Mark only after you have posted it yourself">Mark as posted</button>}
                  {(a.status === 'draft' || a.status === 'approved' || a.status === 'blocked') && <button type="button" className="rounded bg-slate-700 px-2 py-1 text-[11px] text-slate-100" onClick={() => setStatus(a.id, 'rejected')}>Reject</button>}
                  {a.status === 'rejected' && <button type="button" className="rounded bg-slate-700 px-2 py-1 text-[11px] text-slate-100" onClick={() => setStatus(a.id, 'draft')}>Restore</button>}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Approval never posts anything. “Mark as posted” only records what you posted yourself.</p>
        </Sec>
      </div>
      <p className="text-[11px] text-slate-500"><BrainCircuit className="mr-1 inline h-3 w-3" />Trend discovery is not included: TikTok and Instagram do not offer free public trend data, so the agent does not guess trends. You can add trends you observe to the calendar yourself.</p>
    </div>
  );
};
