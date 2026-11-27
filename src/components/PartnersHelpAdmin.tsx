import React, { useCallback, useEffect, useState } from 'react';
import { getStoredToken } from '../utils/authClient';

const api = async (url: string, method = 'GET', body?: unknown) => {
  const t = getStoredToken(); const r = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j;
};
const btn = 'rounded-md border px-2 py-1 text-[11px] font-bold cursor-pointer';

export const PartnersAdmin: React.FC = () => {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState('');
  const load = useCallback(() => api('/api/admin/partners').then(setD).catch((e) => setErr(e.message)), []);
  useEffect(() => { void load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  const act = async (url: string, body?: unknown) => { try { await api(url, 'POST', body); await load(); } catch (e: any) { setErr(e.message); } };
  if (!d) return <div className="p-4 text-sm text-slate-400">{err || 'Loading partners…'}</div>;
  const P = d.program; const dueTotal = d.partners.reduce((a: number, p: any) => a + p.due, 0);
  const byCode: Record<string, any> = Object.fromEntries(d.partners.map((p: any) => [p.code, p]));
  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-slate-200">
      <div className="flex flex-wrap items-center gap-3 text-sm"><b>Partner program</b><span className="text-slate-400">Fee ${P.fee} · partner ${P.partnerShare} · you ${P.adminShare} · starts {P.startsOn}</span><span className="ml-auto rounded bg-amber-500/15 px-2 py-1 text-amber-200">You owe partners: ${dueTotal}</span></div>
      {err && <div className="text-xs text-rose-300">{err}</div>}
      <div className="overflow-x-auto"><table className="w-full text-left text-[12px]"><thead className="text-slate-400"><tr><th className="p-1">When</th><th>Buyer</th><th>Partner</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {d.sales.map((s: any) => { const p = byCode[s.code]; return (
          <tr key={s.id} className="border-t border-slate-800 align-top"><td className="p-1">{new Date(s.at).toLocaleString()}</td><td>{s.buyer}<div className="text-slate-500">{s.contact}</div></td>
            <td>{p?.name || s.code}<div className="text-slate-500">{p?.contact}</div><div className="text-slate-500">Pay to: {p?.payoutDetails}</div></td>
            <td>{s.status === 'pending' ? 'Waiting for fee' : s.status === 'rejected' ? 'Rejected' : s.payout === 'paid' ? `Paid${s.paidRef ? ' · ' + s.paidRef : ''}` : `Fee received · $${P.partnerShare} due`}</td>
            <td className="space-x-1 whitespace-nowrap">
              {s.status === 'pending' && <><button className={`${btn} border-emerald-500 text-emerald-300`} onClick={() => { if (confirm(`Confirm you received the full $${P.fee} fee from ${s.buyer}?`)) void act(`/api/admin/partners/sale/${s.id}/received`); }}>Fee received</button><button className={`${btn} border-rose-500 text-rose-300`} onClick={() => act(`/api/admin/partners/sale/${s.id}/rejected`)}>Reject</button></>}
              {s.status === 'received' && s.payout === 'due' && <button className={`${btn} border-amber-400 text-amber-200`} onClick={() => { const ref = prompt(`Paid $${P.partnerShare} to ${p?.name}? Enter the transfer reference (optional):`); if (ref !== null) void act(`/api/admin/partners/sale/${s.id}/paid`, { ref }); }}>Mark ${P.partnerShare} paid</button>}
            </td></tr>); })}
        {!d.sales.length && <tr><td colSpan={5} className="p-3 text-slate-500">No applications through partner links yet.</td></tr>}
      </tbody></table></div>
      <div><div className="mb-1 text-sm font-bold">Partners ({d.partners.length})</div><ul className="space-y-1 text-[12px]">{d.partners.map((p: any) => <li key={p.code} className="flex flex-wrap items-center gap-2 rounded bg-slate-900 px-2 py-1"><b>{p.name}</b><span className="text-slate-400">{p.contact} · {p.code}</span><span>{p.sales} sales · due ${p.due} · paid ${p.paid}</span><button className={`${btn} ml-auto ${p.status === 'blocked' ? 'border-emerald-500 text-emerald-300' : 'border-rose-500 text-rose-300'}`} onClick={() => act(`/api/admin/partners/${p.code}/status`, { status: p.status === 'blocked' ? 'active' : 'blocked' })}>{p.status === 'blocked' ? 'Unblock' : 'Block'}</button></li>)}</ul></div>
    </div>
  );
};

export const HelpInboxAdmin: React.FC = () => {
  const [items, setItems] = useState<any[] | null>(null); const [err, setErr] = useState('');
  const load = useCallback(() => api('/api/admin/help').then((j) => setItems(j.items)).catch((e) => setErr(e.message)), []);
  useEffect(() => { void load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  if (!items) return <div className="p-4 text-sm text-slate-400">{err || 'Loading messages…'}</div>;
  return (
    <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-slate-200">
      <div className="text-sm font-bold">Help messages ({items.filter((i) => i.status === 'open').length} open)</div>
      {!items.length && <div className="text-sm text-slate-500">No help messages yet.</div>}
      {items.map((h) => (
        <div key={h.id} className={`rounded-lg border p-3 text-[13px] ${h.status === 'open' ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-slate-800 opacity-60'}`}>
          <div className="flex flex-wrap items-center gap-2"><b>{h.name || 'Anonymous'}</b><a className="text-cyan-300 underline" href={h.contact.includes('@') ? `mailto:${h.contact}` : `https://wa.me/${h.contact.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{h.contact}</a><span className="text-slate-500">{new Date(h.at).toLocaleString()}</span>
            <button className={`${btn} ml-auto ${h.status === 'open' ? 'border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-300'}`} onClick={() => api(`/api/admin/help/${h.id}/done`, 'POST', { status: h.status === 'open' ? 'done' : 'open' }).then(load)}>{h.status === 'open' ? 'Mark done' : 'Reopen'}</button></div>
          <p className="mt-1 whitespace-pre-wrap">{h.message}</p>
        </div>))}
    </div>
  );
};
