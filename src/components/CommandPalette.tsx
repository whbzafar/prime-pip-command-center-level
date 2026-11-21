import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Search, Volume2, VolumeX, Sparkles, X } from 'lucide-react';
import type { MainNavTab } from './Header';
import { fetchJsonSafe } from './fundamentalAnalysis/ui';

interface Cat { id: MainNavTab; label: string }
interface Props { categories: Cat[]; onNavigate: (tab: MainNavTab) => void; onOpenSymbol?: (symbol: string) => void }

type Row = { symbol: string; display: string; longTerm: number | null; shortTerm: number | null; confidence: number };
type Rankings = { longTerm: { bullish: Row[]; bearish: Row[] }; shortTerm: { bullish: Row[]; bearish: Row[] }; all: Row[]; generatedAt?: string };

const clean = (s: string) => s.replace(/^\d+\.\s*/, '');
const say = (text: string): boolean => {
  try {
    const synth = window.speechSynthesis; if (!synth) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = 1.02; u.lang = 'en-US'; synth.speak(u); return true;
  } catch { return false; }
};
const spoken = (display: string) => display.replace(/\//g, ' ').replace(/^XAU/, 'gold ').replace(/^XAG/, 'silver ');
const fmt = (n: number | null) => (n === null ? '—' : `${n > 0 ? '+' : ''}${Math.round(n)}`);

/** Build the briefing ONLY from live endpoint data; if a section has no data it is omitted, never invented. */
export async function buildBriefing(): Promise<{ text: string; lines: string[] }> {
  const [rk, ov] = await Promise.all([
    fetchJsonSafe<any>('/api/macro/rankings').catch(() => null),
    fetchJsonSafe<any>('/api/macro/overview').catch(() => null),
  ]);
  const lines: string[] = [];
  const r: Rankings | null = rk?.data || null;
  if (r) {
    const lb = r.longTerm.bullish.slice(0, 3), lr = r.longTerm.bearish.slice(0, 3);
    if (lb.length) lines.push(`Strongest long-term bullish: ${lb.map((x) => `${x.display} (${fmt(x.longTerm)})`).join(', ')}.`);
    if (lr.length) lines.push(`Strongest long-term bearish: ${lr.map((x) => `${x.display} (${fmt(x.longTerm)})`).join(', ')}.`);
    const sb = r.shortTerm.bullish[0], sr = r.shortTerm.bearish[0];
    if (sb) lines.push(`Short-term momentum leader: ${sb.display}, score ${fmt(sb.shortTerm)}.`);
    if (sr) lines.push(`Short-term laggard: ${sr.display}, score ${fmt(sr.shortTerm)}.`);
    const conf = [...r.shortTerm.bullish, ...r.shortTerm.bearish].find((x) => x.longTerm !== null && x.shortTerm !== null && Math.sign(x.longTerm) === Math.sign(x.shortTerm) && Math.abs(x.longTerm) >= 15 && Math.abs(x.shortTerm) >= 15);
    if (conf) lines.push(`Confluence: ${conf.display} has long-term and short-term fundamentals pointing the same way.`);
  }
  const up: any[] = (ov?.data?.upcoming || []).filter((u: any) => Date.parse(u.scheduledAt) > Date.now()).sort((a: any, b: any) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const high = up.filter((u) => /high|3/i.test(String(u.importance))).slice(0, 3);
  const next = (high.length ? high : up.slice(0, 3));
  if (next.length) {
    lines.push(`Next releases: ${next.map((u) => { const m = Math.max(1, Math.round((Date.parse(u.scheduledAt) - Date.now()) / 60000)); return `${u.asset} ${u.title} in ${m >= 120 ? `${Math.round(m / 60)} hours` : `${m} minutes`}`; }).join('; ')}.`);
  }
  if (!lines.length) lines.push('Live data is still warming up. Try again in a moment.');
  return { text: `Prime Pip briefing. ${lines.join(' ')}`, lines };
}

export default function CommandPalette({ categories, onNavigate, onOpenSymbol }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [rank, setRank] = useState<Rankings | null>(null);
  const [brief, setBrief] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const recRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey); window.addEventListener('ppfx-open-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('ppfx-open-palette', onOpen); };
  }, []);
  useEffect(() => {
    if (!open) { try { recRef.current?.stop(); } catch { /* noop */ } return; }
    setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30);
    fetchJsonSafe<any>('/api/macro/rankings').then((j) => setRank(j?.data || null)).catch(() => undefined);
  }, [open]);

  const runBrief = useCallback(async () => {
    setBusy(true);
    try { const b = await buildBriefing(); setBrief(b.lines); say(b.text); } finally { setBusy(false); }
  }, []);

  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out: Array<{ key: string; label: string; hint: string; run: () => void }> = [];
    out.push({ key: 'brief', label: 'Brief me — spoken live market briefing', hint: 'AI voice', run: () => { void runBrief(); } });
    for (const c of categories) out.push({ key: `c:${c.id}`, label: clean(c.label), hint: 'Open', run: () => { onNavigate(c.id); setOpen(false); } });
    if (rank && onOpenSymbol) for (const p of rank.all) out.push({ key: `p:${p.symbol}`, label: p.display, hint: `LT ${fmt(p.longTerm)} · ST ${fmt(p.shortTerm)}`, run: () => { onOpenSymbol(p.symbol); setOpen(false); } });
    if (!t) return out.slice(0, 14);
    return out.filter((i) => i.label.toLowerCase().includes(t) || i.label.toLowerCase().replace(/[^a-z0-9]/g, '').includes(t.replace(/[^a-z0-9]/g, ''))).slice(0, 14);
  }, [q, categories, rank, onNavigate, onOpenSymbol, runBrief]);
  useEffect(() => { setSel(0); }, [q]);

  const handleVoice = useCallback((text: string) => {
    const t = text.toLowerCase().trim(); setHeard(t);
    if (/brief|summary|what.?s happening|market update/.test(t)) { void runBrief(); return; }
    if (/stop|quiet|silence/.test(t)) { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } return; }
    const cat = categories.find((c) => { const n = clean(c.label).toLowerCase(); return t.includes(n) || n.includes(t.replace(/^(open|go to|show)\s+/, '')); });
    if (cat) { onNavigate(cat.id); setOpen(false); say(`Opening ${clean(cat.label).toLowerCase()}`); return; }
    setQ(t.replace(/^(open|go to|show)\s+/, ''));
  }, [categories, onNavigate, runBrief]);

  const toggleMic = () => {
    if (!SR) return;
    if (listening) { try { recRef.current?.stop(); } catch { /* noop */ } return; }
    try {
      const r = new SR(); r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e: any) => handleVoice(String(e.results?.[0]?.[0]?.transcript || ''));
      r.onend = () => setListening(false); r.onerror = () => setListening(false);
      recRef.current = r; r.start(); setListening(true); setHeard('');
    } catch { setListening(false); }
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/70 backdrop-blur-sm p-3 pt-[8vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }} data-testid="command-palette">
      <div className="w-full max-w-xl rounded-2xl border border-cyan-400/30 bg-slate-950/95 shadow-[0_0_60px_rgba(34,211,238,0.18)] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
          <Search className="h-4 w-4 text-cyan-300 shrink-0" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump anywhere, search a pair, or say “brief me”…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none min-w-0" data-testid="palette-input"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); items[sel]?.run(); }
            }} />
          {SR && (
            <button onClick={toggleMic} title={listening ? 'Listening… tap to stop' : 'Voice command'} data-testid="palette-mic"
              className={`rounded-lg p-1.5 border ${listening ? 'border-rose-400/60 bg-rose-500/20 text-rose-200 animate-pulse' : 'border-white/10 text-slate-300 hover:text-white'}`}>
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        {heard && <div className="px-3 py-1 text-[10px] text-cyan-300/80 border-b border-white/5">Heard: “{heard}”</div>}
        {(busy || brief) && (
          <div className="px-3 py-2.5 border-b border-white/10 bg-cyan-500/5" data-testid="palette-brief">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-300 mb-1">
              <Sparkles className="h-3 w-3" /> Live briefing {busy && '· building…'}
              {brief && <button className="ml-auto text-slate-400 hover:text-white" onClick={() => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } }}><VolumeX className="h-3.5 w-3.5" /></button>}
              {brief && <button className="text-slate-400 hover:text-white" onClick={() => say(`Prime Pip briefing. ${brief.join(' ')}`)}><Volume2 className="h-3.5 w-3.5" /></button>}
            </div>
            {brief?.map((l, i) => <p key={i} className="text-[12px] leading-snug text-slate-200">{l}</p>)}
          </div>
        )}
        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {items.map((it, i) => (
            <li key={it.key}>
              <button onMouseEnter={() => setSel(i)} onClick={it.run}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] ${i === sel ? 'bg-cyan-500/15 text-white' : 'text-slate-300'}`}>
                <span className="truncate">{it.label}</span><span className="shrink-0 text-[10px] uppercase tracking-wider text-slate-500">{it.hint}</span>
              </button>
            </li>
          ))}
          {!items.length && <li className="px-3 py-4 text-center text-xs text-slate-500">No match.</li>}
        </ul>
        <div className="flex items-center justify-between border-t border-white/10 px-3 py-1.5 text-[10px] text-slate-500">
          <span>↑↓ select · Enter open · Esc close · Ctrl/⌘+K anywhere</span>
          <span>{SR ? 'Voice ready' : 'Voice not supported in this browser'}</span>
        </div>
      </div>
    </div>, document.body);
}
