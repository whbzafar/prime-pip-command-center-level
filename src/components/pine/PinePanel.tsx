/**
 * PINE EDITOR / INDICATORS panel of the Premium terminal.
 *
 * Administrator: full editor (paste, open .pine, edit, save to the private server library,
 * publish to students, try on the main chart).
 * Everyone else: the published indicators with Show / Hide only. Students never receive the
 * code — their indicators run on the server and only the drawn result reaches the browser —
 * and the panel blocks copy, cut, paste and the context menu.
 *
 * Indicators are applied directly on the terminal's main chart (see PineMainChart) and stay
 * applied across pairs, timeframes and reloads.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Code2, Eye, EyeOff, FilePlus2, Loader2, Lock, Play, Save, Send, Trash2, Upload, X } from 'lucide-react';
import { titleOf } from './pineData';
import {
  DRAFT_ID, clearDraft, deleteScript, hideIndicator, indicatorStatus, loadLibrary, pineLib, saveScript, setDraft, showIndicator,
  type LibraryScript,
} from './pineLibrary';

const TEMPLATE = `//@version=6
indicator("My indicator", overlay=true)
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
plot(fast, "EMA 9", color.new(color.aqua, 0), 2)
plot(slow, "EMA 21", color.new(color.orange, 0), 2)
plotshape(ta.crossover(fast, slow), "Buy", shape.triangleup, location.belowbar, color.lime, size=size.small)
plotshape(ta.crossunder(fast, slow), "Sell", shape.triangledown, location.abovebar, color.red, size=size.small)
`;
const LEGACY_STORE = 'ppfx_pine_scripts_v1';

const useLib = () => {
  const [s, setS] = useState(() => ({ ...pineLib.get() }));
  useEffect(() => pineLib.subscribe(() => setS({ ...pineLib.get() })), []);
  return s;
};

const StatusLine: React.FC<{ id: string }> = ({ id }) => {
  useLib();
  const st = indicatorStatus(id);
  if (!st) return null;
  return (
    <div className={`text-[10.5px] mt-0.5 flex items-start gap-1 ${st.kind === 'error' ? 'text-rose-300' : st.kind === 'ok' ? 'text-emerald-300' : 'text-slate-400'}`}>
      {st.kind === 'busy' ? <Loader2 className="w-3 h-3 animate-spin mt-0.5 shrink-0" /> : st.kind === 'ok' ? <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />}
      <span className="break-words">{st.kind === 'error' && st.line ? `Line ${st.line}: ` : ''}{st.text}</span>
    </div>
  );
};

const ShowHide: React.FC<{ id: string; shown: boolean }> = ({ id, shown }) => (
  <button type="button" onClick={() => (shown ? hideIndicator(id) : showIndicator(id))} aria-pressed={shown}
    title={shown ? 'On the chart — click to hide' : 'Click to apply on the chart'}
    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-[11px] font-bold shrink-0 cursor-pointer ${shown ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200' : 'border-slate-700 text-slate-300 hover:text-white'}`}>
    {shown ? <><EyeOff className="w-3.5 h-3.5" />Hide</> : <><Eye className="w-3.5 h-3.5" />Show</>}
  </button>
);

const block = (e: React.SyntheticEvent) => e.preventDefault();

// ───────────────────────────── editor with line numbers
const CodeEditor: React.FC<{ value: string; onChange: (v: string) => void; onRun: () => void; onSave: () => void; errorLine?: number | null }> = ({ value, onChange, onRun, onSave, errorLine }) => {
  const ta = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const lines = value.split('\n').length;
  return (
    <div className="relative flex h-full font-mono text-[12.5px] leading-[19px] bg-[#0b0f17]">
      <div ref={gutter} className="select-none text-right pr-2 pl-2 pt-2 text-slate-600 overflow-hidden bg-[#090c12] border-r border-slate-800" aria-hidden>
        {Array.from({ length: lines }, (_, i) => <div key={i} className={errorLine === i + 1 ? 'text-rose-400 font-bold' : ''}>{i + 1}</div>)}
      </div>
      <textarea ref={ta} value={value} spellCheck={false} aria-label="Pine Script editor"
        onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop; }}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(); return; }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); onSave(); return; }
          if (e.key === 'Tab') {
            e.preventDefault();
            const el = e.currentTarget; const a = el.selectionStart, b = el.selectionEnd;
            const next = value.slice(0, a) + '    ' + value.slice(b);
            onChange(next);
            requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 4; });
          }
        }}
        className="flex-1 resize-none bg-transparent text-slate-100 caret-cyan-300 outline-none p-2 whitespace-pre overflow-auto" />
    </div>
  );
};

// ───────────────────────────── panel
export const PinePanel: React.FC<{ symbol: string; interval: string; onClose: () => void; isAdminHint?: boolean }> = ({ symbol, interval, onClose, isAdminHint }) => {
  const lib = useLib();
  useEffect(() => { loadLibrary(true); }, []);

  if (!lib.loaded) {
    return <div className="rounded-2xl border border-slate-800 bg-[#0b0f17] p-4 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading indicators…</div>;
  }
  return lib.isAdmin || isAdminHint ? <AdminEditor symbol={symbol} interval={interval} onClose={onClose} /> : <StudentIndicators onClose={onClose} />;
};

// ───────────────────────────── students: Show / Hide only
const StudentIndicators: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const lib = useLib();
  const list = lib.scripts;
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0b0f17] overflow-hidden shadow-2xl select-none"
      onCopy={block} onCut={block} onPaste={block} onContextMenu={block} onDragStart={block}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-gradient-to-r from-[#0d1424] to-[#0b0f17]">
        <Code2 className="w-4 h-4 text-cyan-400" />
        <span className="text-[12px] font-bold text-slate-100 tracking-wide">Indicators</span>
        <span className="text-[10.5px] text-slate-500 hidden md:inline">Show applies an indicator on the main chart · it stays on for every pair and timeframe</span>
        <button type="button" onClick={onClose} aria-label="Close" className="ml-auto p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      {lib.error && <div className="px-3 py-2 text-[11.5px] text-rose-300 border-b border-slate-800">{/sign in/i.test(lib.error) ? 'Please sign in to use the indicators.' : `Indicators are unavailable right now (${lib.error}).`}</div>}
      {!lib.error && list.length === 0 && <div className="px-3 py-4 text-[12px] text-slate-400">No indicators have been published yet.</div>}
      <div className="divide-y divide-slate-800/70">
        {list.map((s) => (
          <div key={s.id} className="px-3 py-2.5 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-slate-100 truncate">{s.name}</div>
              <div className="text-[10.5px] text-slate-500">{s.overlay ? 'On the price chart' : 'In its own pane'} · updated {new Date(s.updatedAt).toLocaleDateString()}</div>
              <StatusLine id={s.id} />
            </div>
            <ShowHide id={s.id} shown={lib.shown.includes(s.id)} />
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] text-slate-500 flex items-center gap-1.5"><Lock className="w-3 h-3" />Indicator code is private to PrimePipFX and runs on our server.</div>
    </div>
  );
};

// ───────────────────────────── administrator: full editor
const AdminEditor: React.FC<{ symbol: string; interval: string; onClose: () => void }> = ({ symbol, interval, onClose }) => {
  const lib = useLib();
  const scripts = lib.scripts as LibraryScript[];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [code, setCode] = useState<string>(TEMPLATE);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'idle' | 'ok' | 'error'; text: string }>({ kind: 'idle', text: 'Paste or open a Pine Script® (v5/v6). “Add to chart” tries it on the main chart; “Save & publish” makes it available to students.' });
  const current = scripts.find((s) => s.id === activeId) || null;
  const legacy = useMemo(() => { try { return (JSON.parse(localStorage.getItem(LEGACY_STORE) || '[]') as any[]).filter((s) => s?.source); } catch { return []; } }, []);
  const [legacyLeft, setLegacyLeft] = useState(legacy.length);

  // Open the first script once the library arrives.
  useEffect(() => {
    if (activeId === null && scripts[0]?.source) { setActiveId(scripts[0].id); setCode(scripts[0].source); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts.length]);

  const unchanged = Boolean(current && current.source === code);
  const addToChart = () => {
    if (unchanged && current) { clearDraft(); showIndicator(current.id); }
    else setDraft(code, titleOf(code));
    setMsg({ kind: 'ok', text: `“${titleOf(code)}” applied on the main chart (${symbol}, ${interval}).` });
  };
  const save = async (publish?: boolean) => {
    setBusy(true);
    try {
      const rec = await saveScript({ id: current?.id, source: code, published: publish ? true : current?.published ?? false });
      setActiveId(rec.id);
      if (pineLib.get().shown.includes(DRAFT_ID)) { clearDraft(); showIndicator(rec.id); }
      setMsg({ kind: 'ok', text: publish ? `Published “${rec.name}” — students can now Show/Hide it (the code stays private).` : `Saved “${rec.name}” to the private library.` });
    } catch (e: any) { setMsg({ kind: 'error', text: e.message }); }
    finally { setBusy(false); }
  };
  const togglePublish = async (s: LibraryScript) => {
    setBusy(true);
    try { await saveScript({ id: s.id, source: s.source || '', published: !s.published }); setMsg({ kind: 'ok', text: `${s.published ? 'Unpublished' : 'Published'} “${s.name}”.` }); }
    catch (e: any) { setMsg({ kind: 'error', text: e.message }); }
    finally { setBusy(false); }
  };
  const remove = async (s: LibraryScript) => {
    if (!window.confirm(`Delete “${s.name}” for everyone? This cannot be undone.`)) return;
    setBusy(true);
    try { await deleteScript(s.id); if (activeId === s.id) { setActiveId(null); setCode(TEMPLATE); } setMsg({ kind: 'ok', text: `Deleted “${s.name}”.` }); }
    catch (e: any) { setMsg({ kind: 'error', text: e.message }); }
    finally { setBusy(false); }
  };
  const uploadLegacy = async () => {
    setBusy(true);
    try {
      for (const s of legacy) await saveScript({ source: s.source, published: false });
      localStorage.removeItem(LEGACY_STORE); setLegacyLeft(0);
      setMsg({ kind: 'ok', text: `Moved ${legacy.length} script(s) from this browser to the private library (unpublished).` });
    } catch (e: any) { setMsg({ kind: 'error', text: e.message }); }
    finally { setBusy(false); }
  };
  const importFile = (f: File) => f.text().then((t) => { setActiveId(null); setCode(t); setMsg({ kind: 'idle', text: `Loaded ${f.name} — “Add to chart” to try it, “Save & publish” to share it.` }); });
  const draftStatus = (pineLib.get().shown.includes(DRAFT_ID) ? indicatorStatus(DRAFT_ID) : null) || (current ? indicatorStatus(current.id) : null);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0b0f17] overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-gradient-to-r from-[#0d1424] to-[#0b0f17] flex-wrap">
        <Code2 className="w-4 h-4 text-cyan-400" />
        <span className="text-[12px] font-bold text-slate-100 tracking-wide">Pine Editor</span>
        <span className="text-[9.5px] uppercase px-1.5 py-0.5 rounded border border-amber-400/40 text-amber-200">Admin</span>
        <span className="text-[10.5px] text-slate-500 hidden lg:inline">Pine Script® v5/v6 · applied on the main chart · {symbol} {interval}</span>
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          <button type="button" onClick={() => { setActiveId(null); setCode(TEMPLATE); }} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 text-[11px] text-slate-300 hover:text-white cursor-pointer"><FilePlus2 className="w-3.5 h-3.5" />New</button>
          <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 text-[11px] text-slate-300 hover:text-white cursor-pointer"><Upload className="w-3.5 h-3.5" />Open .pine<input type="file" accept=".pine,.txt,.pinescript" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} /></label>
          <button type="button" disabled={busy} onClick={() => save(false)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 text-[11px] text-slate-300 hover:text-white cursor-pointer disabled:opacity-50"><Save className="w-3.5 h-3.5" />Save</button>
          <button type="button" disabled={busy} onClick={() => save(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-500/20 border border-violet-400/50 text-[11px] text-violet-100 font-semibold hover:bg-violet-500/30 cursor-pointer disabled:opacity-50"><Send className="w-3.5 h-3.5" />Save &amp; publish</button>
          <button type="button" onClick={addToChart} className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-sky-500 text-[11.5px] font-bold text-slate-950 cursor-pointer" title="Ctrl/Cmd + Enter"><Play className="w-3.5 h-3.5" />Add to chart</button>
          <button type="button" onClick={onClose} aria-label="Close Pine Editor" className="p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className={`px-3 py-1.5 text-[11.5px] border-b flex items-start gap-2 ${msg.kind === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : msg.kind === 'ok' ? 'bg-emerald-500/[0.07] border-emerald-500/20 text-emerald-200' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
        {busy ? <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin shrink-0" /> : msg.kind === 'error' ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : msg.kind === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : null}
        <span className="whitespace-pre-wrap break-words">{msg.text}</span>
      </div>
      {draftStatus && (pineLib.get().shown.includes(DRAFT_ID) || current) && <div className="px-3 py-1 border-b border-slate-800"><StatusLine id={pineLib.get().shown.includes(DRAFT_ID) ? DRAFT_ID : current!.id} /></div>}
      {lib.error && <div className="px-3 py-1.5 text-[11px] text-rose-300 border-b border-slate-800">Library: {lib.error}</div>}
      {lib.backend.startsWith('temporary') && <div className="px-3 py-1.5 text-[11px] text-amber-200 bg-amber-500/10 border-b border-amber-500/30">Scripts are not saved permanently yet ({lib.backend}). Connect the free database once — Vercel → your project → Storage → Upstash for Redis → Connect, then redeploy — and published scripts will stay in your library.</div>}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[460px] min-w-0 border-r border-slate-800">
          <CodeEditor value={code} onChange={setCode} onRun={addToChart} onSave={() => save(false)} errorLine={(draftStatus?.kind === 'error' && draftStatus.line) || null} />
        </div>
        <div className="flex flex-col h-[460px]">
          <div className="px-3 py-1.5 text-[10px] font-mono-code uppercase tracking-[0.14em] text-slate-500 border-b border-slate-800">Private library ({scripts.length})</div>
          {legacyLeft > 0 && (
            <button type="button" disabled={busy} onClick={uploadLegacy} className="mx-3 my-2 px-2 py-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-[11px] text-cyan-100 cursor-pointer text-left">Move {legacyLeft} script(s) saved in this browser to the private library</button>
          )}
          <div className="flex-1 overflow-y-auto">
            {scripts.length === 0 && <div className="px-3 py-2 text-[11px] text-slate-500">Saved scripts appear here. Publish one to let students Show/Hide it.</div>}
            {scripts.map((s) => (
              <div key={s.id} className={`px-3 py-2 border-b border-slate-800/60 ${s.id === activeId ? 'bg-cyan-500/10' : 'hover:bg-slate-900'}`}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setActiveId(s.id); setCode(s.source || ''); }} className="flex-1 min-w-0 text-left truncate text-[12px] text-slate-100 cursor-pointer" title="Open in the editor">{s.name}</button>
                  <button type="button" disabled={busy} onClick={() => togglePublish(s)} className={`text-[9.5px] uppercase px-1.5 py-0.5 rounded border cursor-pointer ${s.published ? 'border-violet-400/50 text-violet-200 bg-violet-500/15' : 'border-slate-600 text-slate-400'}`} title={s.published ? 'Students can Show/Hide this — click to unpublish' : 'Only you can see this — click to publish to students'}>{s.published ? 'Published' : 'Private'}</button>
                  <button type="button" disabled={busy} onClick={() => remove(s)} title="Delete" className="text-slate-500 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">{new Date(s.updatedAt).toLocaleString()}</span>
                  <ShowHide id={s.id} shown={lib.shown.includes(s.id)} />
                </div>
                <StatusLine id={s.id} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">
        Only administrators see this editor and the code. Students see published indicators with Show / Hide; their indicators run on the server, so the code never reaches their browser. Scripts run through PineTS (open-source Pine runtime); a feature it does not support yet is reported with its line.
      </div>
    </div>
  );
};

export default PinePanel;
