import React from 'react';
import type { Bias } from './types';

/**
 * fetch + JSON with human-readable errors. Hosting platforms return HTML/text error pages
 * (e.g. "A server error has occurred") on crashes or timeouts — never surface those raw.
 */
export async function fetchJsonSafe<T = any>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', ...init });
  } catch {
    throw new Error(typeof navigator !== 'undefined' && !navigator.onLine ? 'You are offline — the data will update as soon as the connection returns.' : 'Could not reach the server — retrying automatically.');
  }
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch {
    // Show the hosting platform's exact error code (e.g. Vercel's x-vercel-error) so failures are diagnosable.
    const code = res.headers.get('x-vercel-error') || (text.match(/\b[A-Z_]{12,}\b/) || [])[0] || '';
    const id = res.headers.get('x-vercel-id') || '';
    throw new Error(`Server error — HTTP ${res.status}${code ? ` · ${code}` : ''}${id ? ` · id ${id}` : ''}. Retrying automatically…`);
  }
  if (!res.ok || json?.ok === false) throw new Error(json?.error || `Server returned HTTP ${res.status} — retrying automatically…`);
  return json as T;
}

export const fmtScore = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`);

export function fmtNum(v: number | null | undefined, unit = ''): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const s = abs >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : abs >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : abs >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : String(Math.round(v * 1000) / 1000);
  if (!unit) return s;
  if (unit.endsWith('%') && !unit.includes(' ')) return `${s}${unit}`;
  return `${s} ${unit}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 0) {
    const f = -s;
    if (f < 3600) return `in ${Math.round(f / 60)}m`;
    if (f < 86400) return `in ${Math.round(f / 3600)}h`;
    return `in ${Math.round(f / 86400)}d`;
  }
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function fmtPkt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' PKT';
}

export function biasText(b: Bias): string {
  return b.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scoreColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'text-slate-500';
  if (v >= 30) return 'text-emerald-400';
  if (v >= 10) return 'text-emerald-300';
  if (v > -10) return 'text-slate-300';
  if (v > -30) return 'text-rose-300';
  return 'text-rose-400';
}

export const BiasPill: React.FC<{ bias: Bias; score: number | null }> = ({ bias, score }) => {
  const tone =
    score === null ? 'bg-slate-800 text-slate-400 border-slate-700'
    : score >= 30 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
    : score >= 10 ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25'
    : score > -10 ? 'bg-slate-700/40 text-slate-300 border-slate-600'
    : score > -30 ? 'bg-rose-500/10 text-rose-200 border-rose-500/25'
    : 'bg-rose-500/15 text-rose-300 border-rose-500/40';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-mono-code font-bold uppercase tracking-wide ${tone}`}>
      {score === null ? 'No data' : biasText(bias)}
    </span>
  );
};

/** Split bar: bullish share (green) vs bearish share (red). */
export const BullBearBar: React.FC<{ bullishPct: number | null; height?: string }> = ({ bullishPct, height = 'h-2' }) => (
  <div className={`w-full ${height} rounded-full bg-slate-800 overflow-hidden flex`} role="img" aria-label={bullishPct === null ? 'No data' : `${bullishPct}% bullish`}>
    {bullishPct !== null && (
      <>
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700" style={{ width: `${bullishPct}%` }} />
        <div className="bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-700" style={{ width: `${100 - bullishPct}%` }} />
      </>
    )}
  </div>
);

/** Centered score bar −100 … +100. */
export const CenterBar: React.FC<{ score: number | null }> = ({ score }) => {
  const w = score === null ? 0 : Math.min(50, Math.abs(score) / 2);
  return (
    <div className="relative w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600" />
      {score !== null && (
        <div
          className={`absolute top-0 bottom-0 transition-all duration-700 ${score >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
          style={score >= 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
        />
      )}
    </div>
  );
};

export const Gauge: React.FC<{ score: number | null; size?: number }> = ({ score, size = 148 }) => {
  const pct = score === null ? 50 : (score + 100) / 2;
  const angle = -90 + (pct / 100) * 180;
  const r = 60;
  const arc = (from: number, to: number) => {
    const a1 = ((from - 180) * Math.PI) / 180, a2 = ((to - 180) * Math.PI) / 180;
    return `M ${70 + r * Math.cos(a1)} ${70 + r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${70 + r * Math.cos(a2)} ${70 + r * Math.sin(a2)}`;
  };
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 140 86" aria-label={`Fundamental score ${fmtScore(score)}`}>
      <path d={arc(0, 54)} stroke="#f43f5e" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d={arc(54, 81)} stroke="#fda4af" strokeWidth="10" fill="none" opacity="0.6" />
      <path d={arc(81, 99)} stroke="#64748b" strokeWidth="10" fill="none" opacity="0.6" />
      <path d={arc(99, 126)} stroke="#6ee7b7" strokeWidth="10" fill="none" opacity="0.6" />
      <path d={arc(126, 180)} stroke="#10b981" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.85" />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '70px 70px', transition: 'transform 0.9s cubic-bezier(.2,.8,.2,1)' }}>
        <line x1="70" y1="70" x2="70" y2="20" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="70" cy="70" r="5" fill="#e2e8f0" />
    </svg>
  );
};

export const StatusDot: React.FC<{ status: 'live' | 'stale' | 'missing' | 'ok' | 'degraded' | 'down' | 'not_configured' }> = ({ status }) => {
  const c = status === 'live' || status === 'ok' ? 'bg-emerald-400' : status === 'stale' || status === 'degraded' || status === 'not_configured' ? 'bg-amber-400' : 'bg-slate-600';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${c} ${status === 'live' || status === 'ok' ? 'animate-pulse' : ''}`} />;
};
