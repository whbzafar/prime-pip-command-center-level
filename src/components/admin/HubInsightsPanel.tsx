import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Bug, Lightbulb, BarChart3, RefreshCw, MessageCircle } from 'lucide-react';
import { getStoredToken } from '../../utils/authClient';
import { BOT_TIERS } from '../../data/learningHub';

/** Owner view: SBT bot reservations, what users say is missing, automatic error reports, most-used sections. */
export const HubInsightsPanel: React.FC = () => {
  const headers = useMemo(() => { const t = getStoredToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }, []);
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    setErr('');
    try { const r = await fetch('/api/admin/hub', { headers, cache: 'no-store' }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || `server ${r.status}`); setD(j); } catch (e: any) { setErr(e.message || 'Could not load'); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);
  const usage = useMemo(() => {
    const tot: Record<string, number> = {};
    for (const row of d?.usage || []) for (const [k, n] of Object.entries(row.sections || {})) tot[k] = (tot[k] || 0) + Number(n);
    return Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [d]);
  const max = usage[0]?.[1] || 1;
  const fee = (id: string) => BOT_TIERS.find((t) => t.id === id);
  const card = 'rounded-2xl border border-slate-800 bg-slate-950/70 p-4';
  return (
    <div className="space-y-4" data-testid="hub-insights">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Bot reservations · feedback · errors · usage</h3>
        <button type="button" onClick={load} className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white cursor-pointer"><RefreshCw className="w-3.5 h-3.5" />Refresh</button>
      </div>
      {err && <div className="text-xs text-rose-300">{err}</div>}
      {d && !d.available && <div className="text-xs text-amber-300">Some lists could not be read right now (storage busy). Refresh in a minute.</div>}
      <section className={card}>
        <div className="flex items-center gap-2 mb-2"><Bot className="w-4 h-4 text-emerald-300" /><b className="text-emerald-200">SBT bot reservations ({d?.reservations?.length ?? 0})</b>
          {d?.reservations?.length > 0 && <span className="text-[11px] text-slate-400">· {BOT_TIERS.map((t) => `${t.name}: ${d.reservations.filter((r: any) => r.tier === t.id).length}`).join(' · ')}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-slate-500 text-left"><tr><th className="py-1 pr-3">When</th><th className="pr-3">ID</th><th className="pr-3">Name</th><th className="pr-3">Contact</th><th className="pr-3">Plan</th><th className="pr-3">Country</th><th className="pr-3">Capital</th><th>Note</th></tr></thead>
            <tbody>
              {(d?.reservations || []).map((r: any) => (
                <tr key={r.id} className="border-t border-slate-800 text-slate-200 align-top">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-slate-400">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="pr-3 font-mono-code text-emerald-200">{r.id}</td>
                  <td className="pr-3">{r.name}{r.username ? <span className="text-slate-500"> @{r.username}</span> : null}</td>
                  <td className="pr-3">{/^\+?\d[\d\s-]{6,}$/.test(r.contact) ? <a className="text-cyan-300 inline-flex items-center gap-1" href={`https://wa.me/${r.contact.replace(/\D/g, '').replace(/^0/, '92')}`} target="_blank" rel="noreferrer"><MessageCircle className="w-3 h-3" />{r.contact}</a> : r.contact}</td>
                  <td className="pr-3 whitespace-nowrap">{fee(r.tier)?.name} · ${fee(r.tier)?.fee.toLocaleString()}</td>
                  <td className="pr-3">{r.country}</td><td className="pr-3">{r.capital}</td><td className="text-slate-400 max-w-[260px]">{r.note}</td>
                </tr>
              ))}
              {!d?.reservations?.length && <tr><td colSpan={8} className="py-2 text-slate-500">No reservations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid lg:grid-cols-2 gap-4">
        <section className={card}>
          <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-fuchsia-300" /><b className="text-fuchsia-200">What users say ({d?.feedback?.length ?? 0})</b></div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(d?.feedback || []).map((f: any) => (
              <div key={f.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                <div className="text-[10.5px] text-slate-500">{new Date(f.at).toLocaleString()} · <b className="text-fuchsia-200">{f.kind}</b>{f.username ? ` · @${f.username}` : ''}</div>
                <div className="text-[12.5px] text-slate-200 whitespace-pre-wrap">{f.text}</div>
              </div>
            ))}
            {!d?.feedback?.length && <div className="text-[12px] text-slate-500">Nothing yet.</div>}
          </div>
        </section>
        <section className={card}>
          <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-cyan-300" /><b className="text-cyan-200">Most used sections (last 60 days)</b></div>
          <div className="space-y-1.5">
            {usage.map(([k, n]) => (
              <div key={k} className="flex items-center gap-2 text-[12px]"><span className="w-40 truncate text-slate-300">{k}</span><div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${(n / max) * 100}%` }} /></div><span className="w-12 text-right tabular-nums text-slate-400">{n}</span></div>
            ))}
            {!usage.length && <div className="text-[12px] text-slate-500">No data yet.</div>}
          </div>
        </section>
      </div>
      <section className={card}>
        <div className="flex items-center gap-2 mb-2"><Bug className="w-4 h-4 text-rose-300" /><b className="text-rose-200">Errors seen on users’ screens ({d?.errors?.length ?? 0})</b></div>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {(d?.errors || []).map((e: any) => (
            <details key={e.key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
              <summary className="cursor-pointer text-[12.5px] text-slate-200"><b className="text-rose-200">{e.count}×</b> {e.message} <span className="text-slate-500">· last {new Date(e.lastAt).toLocaleString()}</span></summary>
              <div className="mt-1 text-[11px] text-slate-400">{e.where} · {e.ua}</div>
              {e.stack && <pre className="mt-1 text-[10.5px] text-slate-500 whitespace-pre-wrap">{e.stack}</pre>}
            </details>
          ))}
          {!d?.errors?.length && <div className="text-[12px] text-slate-500">No errors reported.</div>}
        </div>
      </section>
    </div>
  );
};
