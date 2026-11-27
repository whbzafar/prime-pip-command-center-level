import React, { useEffect, useState } from 'react';
import { X, Copy, Check, LifeBuoy, Handshake } from 'lucide-react';

const SITE = () => location.origin;
const LS_PARTNER = 'ppfx_partner_v1';
const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.'); return j;
};
const Shell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" onClick={onClose}>
    <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-950 p-5 text-slate-200 shadow-2xl">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-bold text-white">{title}</h3><button type="button" aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button></div>
      {children}
    </div>
  </div>
);
const inp = 'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400';

const HelpForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [f, setF] = useState({ name: '', contact: '', message: '' }); const [st, setSt] = useState<'idle' | 'busy' | 'done'>('idle'); const [err, setErr] = useState('');
  const send = async (e: React.FormEvent) => { e.preventDefault(); setSt('busy'); setErr(''); try { await post('/api/public/help', f); setSt('done'); } catch (x: any) { setErr(x.message); setSt('idle'); } };
  return (
    <Shell title="Need help?" onClose={onClose}>
      {st === 'done' ? (<div className="py-6 text-center"><Check className="mx-auto mb-2 w-9 h-9 text-emerald-400" /><p className="text-sm">Thank you. Your message reached the admin and we will contact you on the details you gave.</p><button type="button" onClick={onClose} className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 cursor-pointer">Close</button></div>) : (
        <form onSubmit={send} className="space-y-3">
          <p className="text-xs text-slate-400">Tell us the problem and how to reach you. The admin sees it straight away.</p>
          <input className={inp} placeholder="Your name (optional)" value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inp} placeholder="Phone, WhatsApp number or email" value={f.contact} maxLength={80} required onChange={(e) => setF({ ...f, contact: e.target.value })} />
          <textarea className={inp} rows={4} placeholder="What problem are you facing?" value={f.message} maxLength={1500} required onChange={(e) => setF({ ...f, message: e.target.value })} />
          {err && <p className="text-xs text-rose-300">{err}</p>}
          <button disabled={st === 'busy'} className="w-full rounded-lg bg-cyan-500 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60 cursor-pointer">{st === 'busy' ? 'Sending…' : 'Send to admin'}</button>
        </form>)}
    </Shell>
  );
};

type Dash = { name: string; code: string; pending: number; due: number; paid: number; rows: { buyer: string; at: number; status: string; payout: string }[]; program: { fee: number; partnerShare: number } };
const PartnerForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [prog, setProg] = useState<any>(null); const [mine, setMine] = useState<{ code: string; key: string } | null>(() => { try { return JSON.parse(localStorage.getItem(LS_PARTNER) || 'null'); } catch { return null; } });
  const [f, setF] = useState({ name: '', contact: '', payoutDetails: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [dash, setDash] = useState<Dash | null>(null); const [copied, setCopied] = useState(false);
  const [login, setLogin] = useState({ code: '', key: '' }); const [showLogin, setShowLogin] = useState(false);
  useEffect(() => { fetch('/api/public/partner/program').then((r) => r.json()).then(setProg).catch(() => {}); }, []);
  const load = async (c: { code: string; key: string }) => { try { const r = await fetch(`/api/public/partner/me?code=${encodeURIComponent(c.code)}`, { headers: { 'x-partner-key': c.key } }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setDash(j); } catch (x: any) { setErr(x.message || 'Could not load'); } };
  useEffect(() => { if (mine) void load(mine); }, [mine]);
  const join = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); try { const j = await post('/api/public/partner/join', f); const m = { code: j.code, key: j.key }; localStorage.setItem(LS_PARTNER, JSON.stringify(m)); setMine(m); } catch (x: any) { setErr(x.message); } setBusy(false); };
  const link = mine ? `${SITE()}/?partner=${mine.code}` : '';
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* manual copy */ } };
  const P = prog || { fee: 100, monthly: 10, partnerShare: 50, adminShare: 50, startsOn: '2026-12-01' };
  return (
    <Shell title="Partner Program" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-[13px] leading-relaxed">
          From <b>1 December 2026</b> the application costs <b>${P.fee}</b> plus about <b>${P.monthly}/month</b>. Promote Prime Pip FX in any way you like. For every person who joins through your link, <b>you receive ${P.partnerShare}</b> of that ${P.fee} fee.
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-[12.5px] text-slate-300">
          <li>Join below and get your personal link.</li>
          <li>Share it anywhere: social media, WhatsApp, friends, your own content.</li>
          <li>Your buyer pays the ${P.fee} fee to the admin first.</li>
          <li>Once the admin has received it, your ${P.partnerShare} is marked <b>due</b> and the admin pays you.</li>
        </ol>
        <p className="text-[11.5px] text-slate-400">Each buyer counts once, for the first partner whose link they used. You cannot refer yourself. Amounts are fixed by the system and nothing is owed until the admin confirms the fee was received.</p>
        {!mine ? (
          <>
            <form onSubmit={join} className="space-y-2 pt-1">
              <input className={inp} placeholder="Your name" required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <input className={inp} placeholder="Phone, WhatsApp number or email" required maxLength={80} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />
              <input className={inp} placeholder="Where should we send your share? (Easypaisa / JazzCash / bank / PayPal details)" required maxLength={160} value={f.payoutDetails} onChange={(e) => setF({ ...f, payoutDetails: e.target.value })} />
              {err && <p className="text-xs text-rose-300">{err}</p>}
              <button disabled={busy} className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60 cursor-pointer">{busy ? 'Creating…' : 'Join the Partner Program'}</button>
            </form>
            <button type="button" onClick={() => setShowLogin((v) => !v)} className="text-xs text-cyan-300 hover:underline cursor-pointer">Already a partner? Open my dashboard</button>
            {showLogin && (<div className="space-y-2"><input className={inp} placeholder="Your partner code" value={login.code} onChange={(e) => setLogin({ ...login, code: e.target.value.toUpperCase() })} /><input className={inp} type="password" placeholder="Your private key" value={login.key} onChange={(e) => setLogin({ ...login, key: e.target.value })} /><button type="button" onClick={async () => { setErr(''); const c = { code: login.code.trim(), key: login.key.trim() }; try { const r = await fetch(`/api/public/partner/me?code=${encodeURIComponent(c.code)}`, { headers: { 'x-partner-key': c.key } }); if (!r.ok) throw new Error('Wrong code or key.'); localStorage.setItem(LS_PARTNER, JSON.stringify(c)); setMine(c); } catch (x: any) { setErr(x.message); } }} className="w-full rounded-lg bg-cyan-500 py-2 text-sm font-bold text-slate-950 cursor-pointer">Open dashboard</button>{err && <p className="text-xs text-rose-300">{err}</p>}</div>)}
          </>
        ) : (
          <div className="space-y-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="text-[11px] text-slate-400">Your personal link</div>
              <div className="mt-1 flex items-center gap-2"><input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className={inp} /><button type="button" onClick={() => copy(link)} className="rounded-lg border border-slate-600 p-2 cursor-pointer" aria-label="Copy link">{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}</button></div>
              <div className="mt-2 text-[11px] text-amber-200">Your private key (save it now; it is shown only on this device): <b className="select-all break-all">{mine.key}</b></div>
            </div>
            {dash && (<><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-slate-900 p-2"><div className="text-lg font-black">{dash.pending}</div><div className="text-[10px] text-slate-400">Awaiting fee</div></div><div className="rounded-lg bg-slate-900 p-2"><div className="text-lg font-black text-amber-300">${dash.due}</div><div className="text-[10px] text-slate-400">Due to you</div></div><div className="rounded-lg bg-slate-900 p-2"><div className="text-lg font-black text-emerald-300">${dash.paid}</div><div className="text-[10px] text-slate-400">Paid</div></div></div>
              {dash.rows.length > 0 && <ul className="max-h-40 overflow-y-auto space-y-1 text-[12px]">{dash.rows.map((r, i) => <li key={i} className="flex justify-between rounded bg-slate-900 px-2 py-1"><span>{r.buyer} · {new Date(r.at).toLocaleDateString()}</span><span className={r.payout === 'paid' ? 'text-emerald-300' : r.payout === 'due' ? 'text-amber-300' : r.status === 'rejected' ? 'text-rose-300' : 'text-slate-400'}>{r.payout === 'paid' ? 'Paid' : r.payout === 'due' ? 'Due' : r.status === 'rejected' ? 'Rejected' : 'Waiting for fee'}</span></li>)}</ul>}</>)}
            {err && <p className="text-xs text-rose-300">{err}</p>}
          </div>
        )}
      </div>
    </Shell>
  );
};

export const LoginHelpLinks: React.FC = () => {
  const [open, setOpen] = useState<'' | 'help' | 'partner'>('');
  return (
    <>
      <div className="mt-4 flex items-center justify-center gap-5 text-[12px] relative z-10">
        <button type="button" data-testid="login-partner-link" onClick={() => setOpen('partner')} className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 underline-offset-2 hover:underline cursor-pointer"><Handshake className="w-3.5 h-3.5" /> Earn $50 · Partner Program</button>
        <button type="button" data-testid="login-help-link" onClick={() => setOpen('help')} className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 underline-offset-2 hover:underline cursor-pointer"><LifeBuoy className="w-3.5 h-3.5" /> Help</button>
      </div>
      {open === 'help' && <HelpForm onClose={() => setOpen('')} />}
      {open === 'partner' && <PartnerForm onClose={() => setOpen('')} />}
    </>
  );
};
export default LoginHelpLinks;
