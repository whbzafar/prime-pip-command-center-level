import { useEffect, useRef, useState } from 'react';
import { Mic, Play, Square, Trash2 } from 'lucide-react';
import { PACKS, OVERVIEW_LINE, OUTRO_LINE } from '../../data/urduPack';
import { deleteClip, hasClips, loadClipBlob, saveClip } from '../../utils/voiceClips';

/** Record the narration lines with a real voice (a Pakistani girl reading the Roman Urdu text). Used automatically in every video. */
export function VoiceClips({ category, title }: { category: string; title: string }) {
  const pack = PACKS[category];
  const lines: { roman: string; urdu: string; label: string }[] = pack ? [
    { label: 'Hook', roman: pack.hook[0], urdu: pack.hook[1] },
    { label: 'Overview', roman: OVERVIEW_LINE[0], urdu: OVERVIEW_LINE[1] },
    ...pack.parts.map((p) => ({ label: p[0], roman: p[1], urdu: p[2] })),
    { label: 'Ending', roman: OUTRO_LINE[0], urdu: OUTRO_LINE[1] },
  ] : [];
  const [have, setHave] = useState<boolean[]>([]); const [rec, setRec] = useState(-1); const [msg, setMsg] = useState('');
  const mr = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]);
  const refresh = () => { void hasClips(lines.map((l) => l.urdu)).then(setHave); };
  useEffect(refresh, [category]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pack) return null;
  const start = async (i: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const r = new MediaRecorder(stream); chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = async () => { stream.getTracks().forEach((t) => t.stop()); await saveClip(lines[i].urdu, new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })); setRec(-1); setMsg(`Line ${i + 1} saved`); refresh(); };
      mr.current = r; r.start(); setRec(i); setMsg('Recording… speak the line, then press stop.');
    } catch { setMsg('Microphone not allowed. Allow the mic in the browser address bar and try again.'); }
  };
  const stop = () => { try { mr.current?.stop(); } catch { /* ignore */ } };
  const play = async (i: number) => { const b = await loadClipBlob(lines[i].urdu); if (b) { const a = new Audio(URL.createObjectURL(b)); void a.play(); } };
  const done = have.filter(Boolean).length;
  return (
    <details className="rounded-xl border border-fuchsia-500/30 bg-slate-950/70 p-3" data-testid="voice-clips">
      <summary className="cursor-pointer text-sm font-semibold text-fuchsia-200">🎙️ Real voice for “{title}” — {done}/{lines.length} lines recorded {done === lines.length ? '(videos use your real voice)' : '(missing lines use the AI voice)'}</summary>
      <p className="mt-2 text-xs text-slate-400">Have a Pakistani girl read each Roman Urdu line naturally, in one go. The clips stay in this browser and every video of this category uses them instead of the AI voice. Quiet room, phone or laptop mic, normal speaking pace.</p>
      <div className="mt-2 space-y-1.5">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-2 py-1.5">
            <span className="w-5 text-center text-[11px] text-slate-500">{i + 1}</span>
            <div className="min-w-0 flex-1"><div className="text-[10px] uppercase tracking-wide text-slate-500">{l.label}</div><div className="text-sm text-slate-100">{l.roman}</div></div>
            {rec === i ? <button type="button" onClick={stop} className="rounded bg-rose-600 px-2 py-1 text-xs text-white"><Square className="inline h-3 w-3" /> Stop</button>
              : <button type="button" onClick={() => void start(i)} disabled={rec >= 0} className="rounded bg-fuchsia-600/80 px-2 py-1 text-xs text-white"><Mic className="inline h-3 w-3" /> {have[i] ? 'Redo' : 'Record'}</button>}
            {have[i] && <><button type="button" onClick={() => void play(i)} className="rounded bg-slate-700 px-2 py-1 text-xs text-white"><Play className="inline h-3 w-3" /></button>
              <button type="button" onClick={() => void deleteClip(l.urdu).then(refresh)} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300"><Trash2 className="inline h-3 w-3" /></button></>}
          </div>
        ))}
      </div>
      {msg && <div className="mt-2 text-xs text-fuchsia-200">{msg}</div>}
    </details>
  );
}
