import React, { useState } from 'react';
import { Share2, Check, Link2 } from 'lucide-react';

/** "Share layout" — publishes a snapshot of the chart and gives back a link anyone can open read-only. */
export const ShareChartButton: React.FC<{
  symbol: string; interval: string; engine: 'pro' | 'tv';
  capture?: () => Promise<{ state?: unknown; image?: string | null }>; className?: string; compact?: boolean;
}> = ({ symbol, interval, engine, capture, className = '', compact }) => {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState(''); const [hasImage, setHasImage] = useState(false);
  const share = async () => {
    setState('busy'); setMsg('');
    try {
      let state: unknown = null; let image: string | null = null;
      try { const c = capture ? await capture() : null; state = c?.state ?? null; image = c?.image ?? null; } catch { /* link still works without the picture */ }
      const r = await fetch('/api/charts/share', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, interval, engine, state, image }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) throw new Error(j.error || 'Could not create the link');
      const url = `${location.origin}/?chart=${j.id}`;
      setLink(url); setState('done'); setHasImage(!!image);
      try { await navigator.clipboard.writeText(url); setMsg('Link copied'); } catch { setMsg('Copy the link below'); }
    } catch (e: any) { setState('error'); setMsg(String(e?.message || 'Could not create the link')); }
  };
  return (
    <span className={`relative inline-flex ${className}`}>
      <button type="button" data-testid="share-chart" onClick={share} disabled={state === 'busy'}
        title="Share this chart by link (drawings and indicators included on the Pro chart)"
        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:border-cyan-400 hover:text-white cursor-pointer disabled:opacity-60">
        {state === 'done' ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-cyan-300" />}
        {!compact && <span className="hidden sm:inline">{state === 'busy' ? 'Creating link…' : 'Share'}</span>}
      </button>
      {(state === 'done' || state === 'error') && (
        <div className="absolute right-0 top-full z-[70] mt-1 w-[300px] rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-[11px] text-slate-200 shadow-xl">
          {state === 'error' ? <span className="text-rose-300">{msg}</span> : (
            <>
              <div className="mb-1 flex items-center gap-1 font-bold text-emerald-300"><Link2 className="w-3.5 h-3.5" /> {msg}</div>
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-white" />
              <div className="mt-1 text-slate-400">{hasImage ? 'Anyone with this link sees your chart exactly as it is now, with every indicator and drawing (read-only).' : 'The picture could not be taken (screen capture was declined or is not supported here), so the link only reopens this pair and timeframe. Click Share again and allow “this tab” to include your markings.'}</div>
            </>
          )}
          <button type="button" onClick={() => setState('idle')} className="mt-1.5 text-slate-400 hover:text-white cursor-pointer">Close</button>
        </div>
      )}
    </span>
  );
};
export default ShareChartButton;
