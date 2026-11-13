import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Globe2, MapPin, Monitor, RefreshCw, Smartphone, Tablet, Users } from 'lucide-react';
import { getStoredToken } from '../../utils/authClient';

interface Data {
  storage: 'redis' | 'memory'; days: number; generatedAt: number;
  live: { count: number; byTab: [string, number][]; byCountry: [string, number][]; visitors: { tab: string; cls: string; user: string; device: string; country: string; region: string; city: string; since: number; last: number }[] };
  sessions: number; uniqueVisitors: number; classes: [string, number][]; devices: [string, number][];
  topTabs: [string, number][]; countries: [string, number][];
  regions: { country: string; region: string; n: number }[]; cities: { country: string; region: string; city: string; n: number }[];
  perDay: { day: string; sessions: number }[];
}

const LABELS: Record<string, string> = {
  LOGIN: 'Login screen', DASHBOARD: 'Dashboard', JOURNAL: 'Trade Journal', SBT_MODELS: 'SBT Models', LOT_SIZE: 'Lot Size', RISK: 'Risk Management', PRE_TRADE_PLAN: 'Pre-Trade Plan',
  FUNDAMENTAL_CALENDAR: 'Live News Calendar', FUNDAMENTAL_INDICATORS: 'Fundamentals', SIGNALS: 'Premium Signals', PRO_TRADING: 'Premium TradingView', BACKTESTING: 'Backtesting', BACKTEST_REPLAY: 'Bar Replay',
  CHART_ANALYSIS: 'Chart Analysis', META5_PREMIUM: 'Meta 5', COMPOUNDING: 'Compounding', PERFORMANCE: 'Performance', REPORTS: 'Reports', DAILY_DEV: 'Daily Development', PSYCHOLOGY: 'Psychological Center',
  CALMING_TOOLS: 'Trading Tool Suite', RESEARCH: 'Research', FREEHAND_WORKSPACE: 'Freehand Canvas', SITUATION_SAVER: 'Situation Saver', PAIR_SAVER: 'Pair Saver', PRO_LEARNING: 'Pro Trading Learning',
  COMMUNITY: 'Community', BOOK_SESSION: 'Book a Session', SETTINGS: 'Data Export & Backup', ADMIN: 'Admin Panel', ACCOUNTS: 'Accounts', EVOLUTION: 'Evolution',
};
const label = (t: string) => LABELS[t] || t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const CLS: Record<string, string> = { guest: 'bg-slate-700/60 text-slate-200', demo: 'bg-amber-500/20 text-amber-300', subscriber: 'bg-emerald-500/20 text-emerald-300', admin: 'bg-cyan-500/20 text-cyan-300' };
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐');
const countryName = (cc: string) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc; } catch { return cc; } };
const ago = (t: number) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`; };

const Bars: React.FC<{ rows: { k: string; n: number; sub?: string }[]; empty?: string }> = ({ rows, empty = 'No data yet' }) => {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <div className="py-4 text-center text-[11px] text-slate-500">{empty}</div>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.k + (r.sub || '')} className="text-[11.5px]">
          <div className="flex items-center justify-between gap-2"><span className="truncate text-slate-200">{r.k}{r.sub && <span className="ml-1.5 text-slate-500">{r.sub}</span>}</span><span className="font-bold tabular-nums text-cyan-300">{r.n}</span></div>
          <div className="mt-0.5 h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${(r.n / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
};
const Card: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 ${className}`}>
    <h3 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300">{icon}{title}</h3>{children}
  </section>
);

export const LiveAnalyticsPanel: React.FC = () => {
  const [days, setDays] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [, tick] = useState(0);
  const load = useCallback(async () => {
    try {
      const token = getStoredToken();
      const r = await fetch(`/api/admin/analytics?days=${days}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json()); setErr('');
    } catch (e: any) { setErr(e?.message || 'Could not load analytics'); }
  }, [days]);
  useEffect(() => { void load(); const t = window.setInterval(() => { void load(); tick((x) => x + 1); }, 5000); return () => window.clearInterval(t); }, [load]);

  const pk = (data?.regions || []).filter((r) => r.country === 'PK');
  const pkCities = (data?.cities || []).filter((r) => r.country === 'PK');
  const classTotal = (data?.classes || []).reduce((a, [, n]) => a + n, 0) || 1;
  return (
    <div className="space-y-3.5" data-testid="live-analytics">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />LIVE · updates every 5 s</span>
        <div className="ml-auto flex gap-1">
          {[[1, 'Today'], [7, '7 days'], [30, '30 days']].map(([d, l]) => (
            <button key={d} type="button" onClick={() => setDays(d as number)} className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${days === d ? 'border-cyan-400 bg-cyan-400/15 text-cyan-300' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{l}</button>
          ))}
          <button type="button" onClick={() => void load()} aria-label="Refresh" className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white"><RefreshCw className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {err && <div className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">Could not load analytics: {err}</div>}
      {data?.storage === 'memory' && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
          Analytics is running in temporary memory (Redis is not connected). The "online now" list is only partly accurate and totals reset when the server restarts. Connect Upstash Redis in Vercel → Storage to make this permanent and complete.
        </div>
      )}
      {!data ? <div className="py-10 text-center text-xs text-slate-500">Loading…</div> : (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[['Online now', data.live.count, <Activity key="a" className="h-4 w-4 text-emerald-400" />], [days === 1 ? 'Visits today' : `Visits (${days}d)`, data.sessions, <Users key="b" className="h-4 w-4 text-cyan-400" />], ['Unique visitors', data.uniqueVisitors, <Globe2 key="c" className="h-4 w-4 text-violet-400" />], ['Countries', data.countries.length, <MapPin key="d" className="h-4 w-4 text-amber-400" />]].map(([t, n, i]) => (
              <div key={t as string} className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-3"><div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400">{i}{t as string}</div><div className="mt-1 text-3xl font-black tabular-nums text-white">{n as number}</div></div>
            ))}
          </div>

          <div className="grid gap-3.5 lg:grid-cols-2">
            <Card title={`Viewing right now (${data.live.count})`} icon={<Activity className="h-3.5 w-3.5 text-emerald-400" />}>
              <Bars rows={data.live.byTab.map(([k, n]) => ({ k: label(k), n }))} empty="Nobody online right now" />
              <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400"><tr><th className="px-2 py-1.5">Viewing</th><th className="px-2">Type</th><th className="px-2">From</th><th className="px-2">Dev</th><th className="px-2 text-right">Seen</th></tr></thead>
                  <tbody>{data.live.visitors.map((v, i) => (
                    <tr key={i} className="border-t border-slate-800/70"><td className="px-2 py-1.5 text-slate-100">{label(v.tab)}{v.user && <span className="ml-1 text-slate-500">@{v.user}</span>}</td>
                      <td className="px-2"><span className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase ${CLS[v.cls] || CLS.guest}`}>{v.cls}</span></td>
                      <td className="px-2 text-slate-300">{flag(v.country)} {v.city !== 'Unknown' ? `${v.city}, ` : ''}{v.region !== 'Unknown' ? v.region : countryName(v.country)}</td>
                      <td className="px-2 text-slate-400">{v.device === 'mobile' ? <Smartphone className="h-3.5 w-3.5" /> : v.device === 'tablet' ? <Tablet className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}</td>
                      <td className="px-2 text-right text-slate-500">{ago(v.last)}</td></tr>))}
                    {!data.live.visitors.length && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-500">No active visitors</td></tr>}</tbody>
                </table>
              </div>
            </Card>

            <Card title={`Most viewed categories (${days === 1 ? 'today' : `${days} days`})`} icon={<Activity className="h-3.5 w-3.5 text-cyan-400" />}>
              <Bars rows={data.topTabs.slice(0, 20).map(([k, n]) => ({ k: label(k), n }))} />
            </Card>
          </div>

          <div className="grid gap-3.5 lg:grid-cols-3">
            <Card title="Countries" icon={<Globe2 className="h-3.5 w-3.5 text-violet-400" />}><Bars rows={data.countries.slice(0, 15).map(([k, n]) => ({ k: `${flag(k)} ${countryName(k)}`, n }))} /></Card>
            <Card title="Pakistan — provinces / regions" icon={<MapPin className="h-3.5 w-3.5 text-emerald-400" />}><Bars rows={pk.map((r) => ({ k: r.region, n: r.n }))} empty="No visitors from Pakistan yet" /></Card>
            <Card title="Cities" icon={<MapPin className="h-3.5 w-3.5 text-amber-400" />}>
              <Bars rows={(pkCities.length ? pkCities : data.cities).slice(0, 15).map((r) => ({ k: `${flag(r.country)} ${r.city}`, sub: r.region !== 'Unknown' ? r.region : '', n: r.n }))} />
            </Card>
          </div>

          <div className="grid gap-3.5 lg:grid-cols-3">
            <Card title="Visitor type">
              <ul className="space-y-1.5 text-[11.5px]">{data.classes.map(([k, n]) => (<li key={k} className="flex items-center justify-between"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${CLS[k] || CLS.guest}`}>{k}</span><span className="tabular-nums text-slate-200">{n} <span className="text-slate-500">({Math.round((n / classTotal) * 100)}%)</span></span></li>))}</ul>
              <p className="mt-2 text-[10px] text-slate-500">guest = not signed in · demo = unpaid / demo · subscriber = full access</p>
            </Card>
            <Card title="Devices"><Bars rows={data.devices.map(([k, n]) => ({ k, n }))} /></Card>
            <Card title="Visits per day"><Bars rows={data.perDay.slice(-14).map((d) => ({ k: `${d.day.slice(6)}/${d.day.slice(4, 6)}`, n: d.sessions }))} /></Card>
          </div>
        </>
      )}
    </div>
  );
};
