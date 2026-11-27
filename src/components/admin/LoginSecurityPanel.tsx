import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, MapPin, RefreshCw, ShieldAlert, ShieldCheck, Send } from 'lucide-react';
import { getStoredToken } from '../../utils/authClient';

interface UserRow { userId: string; username: string; name: string; lastAt: string; lastPlace: string; lastIp: string; logins7d: number; countries7d: number; networks7d: number; places: { place: string; lat: number | null; lon: number | null; n: number; last: string }[]; flags: string[]; risk: number; warnings: number; lastWarnedAt: string | null; lastLat: number | null; lastLon: number | null; lastIsp: string; lastCountry: string; lastHosting: boolean; presence: 'active' | 'idle' | 'offline'; seenAt: number | null }
interface Ev { id: string; at: string; username: string; place: string; ip: string; device: string; isp: string; lat: number | null; lon: number | null; flags: string[]; risk: number; countryCode: string }
interface Data { users: UserRow[]; events: Ev[]; flagText: Record<string, string>; stored: boolean }

const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐');
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' PKT';
const riskCls = (r: number) => r >= 50 ? 'bg-red-500/20 text-red-300 border-red-500/40' : r >= 15 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

type Pt = { lat: number; lon: number; label: string; state: 'active' | 'idle' | 'offline'; key: string };
const STYLE = { active: { color: '#22c55e', fill: '#22c55e', r: 10, op: 0.9, w: 3 }, idle: { color: '#64748b', fill: '#64748b', r: 7, op: 0.55, w: 2 }, offline: { color: '#475569', fill: '#334155', r: 4, op: 0.35, w: 1 } } as const;
const MapView: React.FC<{ points: Pt[]; fitKey: string }> = ({ points, fitKey }) => {
  const ref = useRef<HTMLDivElement>(null);
  const st = useRef<{ L: any; map: any; layer: any; fit: string } | null>(null);
  const ptsRef = useRef(points); ptsRef.current = points;
  const draw = () => {
    const x = st.current; if (!x) return; x.layer.clearLayers(); const b: [number, number][] = [];
    // quiet ones first so the green ones are always on top
    [...ptsRef.current].sort((a, c) => ({ offline: 0, idle: 1, active: 2 })[a.state] - ({ offline: 0, idle: 1, active: 2 })[c.state]).forEach((p) => {
      const sy = STYLE[p.state]; x.L.circleMarker([p.lat, p.lon], { radius: sy.r, color: sy.color, fillColor: sy.fill, fillOpacity: sy.op, weight: sy.w, className: p.state === 'active' ? 'ppfx-pulse' : '' }).addTo(x.layer).bindPopup(p.label); b.push([p.lat, p.lon]);
    });
    if (x.fit !== fitKey && b.length) { x.map.fitBounds(b, { padding: [30, 30], maxZoom: 6 }); x.fit = fitKey; }
  };
  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import('leaflet')).default; await import('leaflet/dist/leaflet.css');
      if (dead || !ref.current) return;
      const map = L.map(ref.current, { worldCopyJump: true, scrollWheelZoom: false }).setView([25, 40], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 12 }).addTo(map);
      st.current = { L, map, layer: L.layerGroup().addTo(map), fit: '' }; draw();
    })();
    return () => { dead = true; st.current?.map.remove(); st.current = null; };
  }, []);
  useEffect(() => { draw(); }, [points, fitKey]);
  return (
    <div className="relative">
      <style>{'@keyframes ppfxPulse{0%{stroke-opacity:.9;stroke-width:3}100%{stroke-opacity:0;stroke-width:14}} .ppfx-pulse{animation:ppfxPulse 1.8s ease-out infinite}'}</style>
      <div ref={ref} className="h-72 w-full overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900" />
      <div className="pointer-events-none absolute bottom-2 left-2 z-[500] flex gap-3 rounded-lg bg-slate-950/85 px-2.5 py-1.5 text-[10.5px] text-slate-200">
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Active now</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-slate-500" />Idle (signed in)</span>
        <span className="flex items-center gap-1"><i className="inline-block h-1.5 w-1.5 rounded-full bg-slate-600" />Offline</span>
      </div>
    </div>
  );
};

const presLabel = (p: string) => (p === 'active' ? 'Active now' : p === 'idle' ? 'Idle' : 'Offline');
const presCls = (p: string) => (p === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : p === 'idle' ? 'bg-slate-700/40 text-slate-300 border-slate-600' : 'bg-slate-800/40 text-slate-500 border-slate-700');

export const LoginSecurityPanel: React.FC = () => {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const hdr = () => { const t = getStoredToken(); return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }; };
  const load = useCallback(async () => {
    try { const r = await fetch('/api/admin/login-security', { headers: hdr(), credentials: 'include' }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Failed'); setD(j); setErr(''); } catch (e: any) { setErr(e?.message || 'Could not load'); }
  }, []);
  useEffect(() => { void load(); const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 10000); return () => clearInterval(t); }, [load]);

  const warn = async (u: UserRow) => {
    if (!confirm(`Send a security warning to ${u.name || u.username}? They must acknowledge it on their next screen.`)) return;
    setBusy(true);
    try { const r = await fetch('/api/admin/login-security/warn', { method: 'POST', headers: hdr(), credentials: 'include', body: JSON.stringify({ userId: u.userId }) }); const j = await r.json(); setMsg(j.ok ? `Warning sent to ${u.username}` : j.error || 'Failed'); void load(); } catch { setMsg('Failed to send'); }
    setBusy(false); setTimeout(() => setMsg(''), 5000);
  };
  const users = d?.users || [];
  const chosen = users.find((u) => u.userId === sel);
  const pts: Pt[] = (chosen
    ? chosen.places.filter((p) => p.lat !== null && p.lon !== null).map((p) => ({ key: `${chosen.userId}|${p.place}`, lat: p.lat as number, lon: p.lon as number, state: (p.place === chosen.lastPlace ? chosen.presence : 'offline') as Pt['state'], label: `${chosen.username} — ${p.place} (${p.n}× in 7 days)${p.place === chosen.lastPlace ? ` · latest sign-in, ${presLabel(chosen.presence)}` : ''}` }))
    : users.filter((u) => u.lastLat !== null && u.lastLon !== null).map((u) => ({ key: u.userId, lat: u.lastLat as number, lon: u.lastLon as number, state: u.presence, label: `${u.name || u.username} (@${u.username}) — ${u.lastPlace}<br/>${presLabel(u.presence)} · last sign-in ${when(u.lastAt)}${u.lastIsp ? `<br/>Network: ${u.lastIsp}` : ''}${u.lastHosting ? '<br/>VPN / data-centre network: the real place may differ' : ''}` })));
  const events = (d?.events || []).filter((e) => !sel || users.find((u) => u.userId === sel)?.username === e.username).slice(0, 40);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="flex items-center gap-2 text-lg font-bold text-white"><ShieldAlert className="h-5 w-5 text-cyan-400" />Login Security</h3>
          <p className="text-xs text-slate-400">Where each account signs in from. Location comes from the IP address, so it shows where the ISP/mobile network is registered, often a hub city rather than the person's exact town. Mobile data, VPNs, proxies and browsers with a built-in VPN (e.g. Opera) can show a different city or country. Green = active now (using the app), grey = signed in but idle, dim = offline. Newest login first. Red = likely shared password.</p></div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
      </div>
      {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">{err}</div>}
      {msg && <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 text-xs text-cyan-200">{msg}</div>}
      {d && !d.stored && <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-xs text-slate-300">No sign-ins recorded yet. Each new login from now on appears here with its city and country. (Needs Redis or SEAL_SECRET on the server for private storage.)</div>}
      <MapView points={pts} fitKey={sel || 'all'} />
      {sel && <button onClick={() => setSel(null)} className="text-xs text-cyan-300 underline">Show all users on map</button>}
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.userId} className={`rounded-xl border p-3 ${sel === u.userId ? 'border-cyan-400/60 bg-slate-800/80' : 'border-slate-700/60 bg-slate-900/60'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button onClick={() => setSel(u.userId === sel ? null : u.userId)} className="text-left">
                <div className="flex items-center gap-2"><span className="font-bold text-white">{u.name || u.username}</span><span className="text-xs text-slate-500">@{u.username}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${presCls(u.presence)}`}>{u.presence === 'active' ? '● ' : ''}{presLabel(u.presence)}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskCls(u.risk)}`}>{u.risk >= 50 ? 'HIGH RISK' : u.risk >= 15 ? 'CHECK' : 'NORMAL'} · {u.risk}</span></div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-300"><MapPin className="h-3 w-3 text-cyan-400" />Last: {u.lastPlace} · {when(u.lastAt)}</div>
              </button>
              <button disabled={busy} onClick={() => warn(u)} className="flex items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"><Send className="h-3.5 w-3.5" />Send warning{u.warnings ? ` (${u.warnings})` : ''}</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-300">
              <span className="rounded bg-slate-800 px-2 py-0.5">{u.logins7d} logins / 7d</span><span className="rounded bg-slate-800 px-2 py-0.5">{u.countries7d} countr{u.countries7d === 1 ? 'y' : 'ies'}</span><span className="rounded bg-slate-800 px-2 py-0.5">{u.networks7d} networks</span>
              {u.places.slice(0, 4).map((p) => <span key={p.place} className="rounded bg-slate-800 px-2 py-0.5">{p.place} ×{p.n}</span>)}
            </div>
            {u.flags.length > 0 && <ul className="mt-2 space-y-0.5 text-[11px] text-amber-300">{u.flags.map((f) => <li key={f} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{d?.flagText[f] || f}</li>)}</ul>}
          </div>
        ))}
        {d && users.length === 0 && d.stored && <div className="py-6 text-center text-xs text-slate-500">No accounts yet</div>}
      </div>
      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-200"><ShieldCheck className="h-4 w-4 text-emerald-400" />Recent sign-ins{sel ? ' (selected user)' : ''}</h4>
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full text-left text-[11px] text-slate-300"><thead className="bg-slate-800/70 text-slate-400"><tr><th className="p-2">When</th><th>User</th><th>Place</th><th>Network</th><th>Device</th><th>Risk</th></tr></thead>
            <tbody>{events.map((e) => <tr key={e.id} className="border-t border-slate-800"><td className="p-2 whitespace-nowrap">{when(e.at)}</td><td>{e.username}</td><td>{flag(e.countryCode)} {e.place}</td><td className="max-w-[160px] truncate">{e.isp || e.ip}</td><td className="max-w-[140px] truncate">{e.device.split(' — ')[0]}</td><td><span className={`rounded-full border px-1.5 py-0.5 ${riskCls(e.risk)}`}>{e.risk}</span></td></tr>)}</tbody></table>
        </div>
      </div>
    </div>
  );
};
