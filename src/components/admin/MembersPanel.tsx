/**
 * MEMBERS & LOGINS — who signed up, when they last logged in, from which device, and a log of
 * every sign-up / login. The administrator can remove any member. Passwords are stored as
 * one-way hashes, so they can never be shown (use "reset password" in the Customers tab instead).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, LogIn, RefreshCw, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { getStoredToken } from '../../utils/authClient';

interface Member { id: string; name: string; username: string; email: string; role: string; subscriptionStatus: string; expiryDate?: string; isLifetime?: boolean; signupSource: string; createdAt: string; lastLoginAt: string | null; loginCount: number; lastLoginIp: string; lastLoginDevice: string }
interface LoginRow { at: string; userId: string; username: string; name?: string; kind: 'login' | 'signup'; ip?: string; device?: string }

const fmt = (d?: string | null) => (d ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d)) : '—');
const ago = (d?: string | null) => { if (!d) return 'never'; const m = Math.round((Date.now() - Date.parse(d)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; };
const status = (m: Member): [string, string] => {
  if (m.subscriptionStatus === 'SUSPENDED') return ['Suspended', 'bg-rose-500/15 text-rose-200'];
  if (m.subscriptionStatus === 'LIFETIME' || m.isLifetime) return ['Lifetime', 'bg-emerald-500/15 text-emerald-200'];
  if (m.subscriptionStatus === 'ACTIVE') {
    const exp = m.expiryDate ? Date.parse(m.expiryDate) : NaN;
    if (Number.isFinite(exp) && exp < Date.now() - 86400_000) return ['Expired', 'bg-rose-500/15 text-rose-200'];
    return [Number.isFinite(exp) ? `Active · to ${new Date(exp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Active', 'bg-emerald-500/15 text-emerald-200'];
  }
  if (m.subscriptionStatus === 'EXPIRED') return ['Expired', 'bg-rose-500/15 text-rose-200'];
  return ['Free trial / unpaid', 'bg-slate-700/60 text-slate-200'];
};
const device = (ua = '') => {
  if (!ua) return '';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return [br, os].filter(Boolean).join(' · ');
};

export const MembersPanel: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [storage, setStorage] = useState<{ enabled: boolean; mode?: string; lastError?: string } | null>(null);
  const [q, setQ] = useState('');
  const [onlyLogged, setOnlyLogged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const headers = useMemo(() => { const t = getStoredToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }, []);
  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/admin/members', { credentials: 'include', headers });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setMembers(j.members || []); setLogins(j.logins || []); setStorage(j.storage || null);
    } catch (e: any) { setErr(String(e?.message || e)); }
    setLoading(false);
  }, [headers]);
  useEffect(() => { load(); const t = window.setInterval(load, 30_000); return () => window.clearInterval(t); }, [load]);

  const remove = async (m: Member) => {
    if (!window.confirm(`Remove ${m.username}? Their account is deleted and they can no longer sign in. This cannot be undone.`)) return;
    const r = await fetch(`/api/admin/customers/${encodeURIComponent(m.id)}`, { method: 'DELETE', credentials: 'include', headers });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) { window.alert(j.error || 'Could not remove the member.'); return; }
    setMembers((x) => x.filter((y) => y.id !== m.id));
    window.setTimeout(load, 1500); // confirm it stays gone
  };

  const list = members.filter((m) => (!q || `${m.username} ${m.name} ${m.email}`.toLowerCase().includes(q.toLowerCase())) && (!onlyLogged || m.lastLoginAt));
  const today = members.filter((m) => m.lastLoginAt && Date.now() - Date.parse(m.lastLoginAt) < 86400_000).length;
  const newToday = members.filter((m) => Date.now() - Date.parse(m.createdAt) < 86400_000).length;

  return (
    <div className="space-y-4" data-testid="members-panel">
      {storage && !storage.enabled && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-[12.5px] text-amber-100 flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-300" />
          <div><b>Accounts are not yet saved permanently.</b> The hosting wipes its files on every restart, so new sign-ups can disappear. Connect the free database once: Vercel → your project → <b>Storage</b> → <b>Create Database</b> → <b>Upstash for Redis</b> (free) → <b>Connect</b> to this project, then redeploy. Nothing else to configure.</div>
        </div>
      )}
      {storage?.enabled && <div className="text-[11px] text-emerald-300 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" />{storage.mode === 'sealed' ? 'Accounts are saved permanently (encrypted backup store).' : 'Accounts are saved permanently in the database.'}{storage.lastError ? <span className="text-rose-300"> Last sync error: {storage.lastError}</span> : null}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[['Members', members.length, Users], ['Active subscriptions', members.filter((m) => status(m)[0].startsWith('Active') || status(m)[0] === 'Lifetime').length, Users], ['Logged in last 24h', today, LogIn], ['Signed up today', newToday, UserPlus]].map(([k, v, I]: any) => (
          <div key={k} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slate-500"><I className="w-3.5 h-3.5" />{k}</div><div className="text-2xl font-black text-slate-100 mt-1">{v}</div></div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5"><Search className="w-4 h-4 text-slate-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or name" className="flex-1 bg-transparent outline-none text-[13px] text-slate-100" /></div>
        <label className="inline-flex items-center gap-1.5 text-[12px] text-slate-300 cursor-pointer whitespace-nowrap"><input type="checkbox" checked={onlyLogged} onChange={(e) => setOnlyLogged(e.target.checked)} className="accent-amber-400" />Only members who logged in</label>
        <button type="button" onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-[12px] text-slate-200 hover:text-white cursor-pointer"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </div>
      {err && <div className="text-[12px] text-rose-300">{err}</div>}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[860px] text-[12.5px]">
          <thead className="bg-slate-900/80 text-[10.5px] uppercase tracking-wider text-slate-400"><tr>
            <th className="text-left px-3 py-2">Member</th><th className="text-left px-3 py-2">Subscription</th><th className="text-left px-3 py-2">Signed up</th><th className="text-left px-3 py-2">Last login</th><th className="text-right px-3 py-2">Logins</th><th className="text-left px-3 py-2">Last device</th><th className="text-left px-3 py-2">How</th><th className="px-3 py-2" />
          </tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="border-t border-slate-800/80 hover:bg-slate-900/40">
                <td className="px-3 py-2"><div className="font-semibold text-slate-100">{m.username}</div>{m.name && m.name !== m.username && <div className="text-[11px] text-slate-500">{m.name}</div>}</td>
                <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold whitespace-nowrap ${status(m)[1]}`}>{status(m)[0]}</span></td>
                <td className="px-3 py-2 text-slate-300">{fmt(m.createdAt)}</td>
                <td className="px-3 py-2"><span className="text-slate-200">{ago(m.lastLoginAt)}</span><div className="text-[10.5px] text-slate-500">{fmt(m.lastLoginAt)}</div></td>
                <td className="px-3 py-2 text-right font-mono text-slate-200">{m.loginCount}</td>
                <td className="px-3 py-2 text-slate-400"><div>{device(m.lastLoginDevice) || '—'}</div><div className="text-[10.5px] text-slate-600 font-mono">{m.lastLoginIp}</div></td>
                <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold ${m.signupSource === 'self' ? 'bg-amber-400/15 text-amber-200' : 'bg-cyan-500/15 text-cyan-200'}`}>{m.signupSource === 'self' ? 'signed up' : 'added by admin'}</span></td>
                <td className="px-3 py-2 text-right"><button type="button" onClick={() => remove(m)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-500/40 text-rose-200 hover:bg-rose-500/10 cursor-pointer text-[11.5px]"><Trash2 className="w-3.5 h-3.5" />Remove</button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">{loading ? 'Loading…' : 'No members yet.'}</td></tr>}
          </tbody>
        </table>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1.5">Recent sign-ups and logins</div>
        <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/80">
          {logins.slice(0, 200).map((l, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-[12px]">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.kind === 'signup' ? 'bg-amber-400/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'}`}>{l.kind === 'signup' ? 'SIGN-UP' : 'LOGIN'}</span>
              <b className="text-slate-100">{l.username}</b>
              <span className="text-slate-500">{device(l.device)}</span>
              <span className="ml-auto text-slate-400">{fmt(l.at)}</span>
            </div>
          ))}
          {!logins.length && <div className="px-3 py-4 text-center text-slate-500 text-[12px]">No activity recorded yet.</div>}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">Passwords are stored encrypted (one-way), so nobody — including the admin — can read them. To help a member who forgot theirs, reset it in the Customers tab.</p>
    </div>
  );
};

export default MembersPanel;
