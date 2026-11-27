import { useCallback, useEffect, useState } from 'react';
import { ChannelStatus, chApi, fetchChannels } from '../../utils/publishClient';

const inp = 'mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white';
const btn = 'rounded bg-slate-700 px-2 py-1 text-xs font-bold text-white disabled:opacity-50';
/** One-time sign-in for YouTube and Pinterest. The server keeps the long-lived keys (admin only) and posts by itself afterwards. */
export default function ChannelsPanel() {
  const [st, setSt] = useState<ChannelStatus | null>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const [yid, setYid] = useState(''); const [ysec, setYsec] = useState(''); const [pid, setPid] = useState(''); const [psec, setPsec] = useState('');
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]); const [nb, setNb] = useState('Prime Pip FX');
  const load = useCallback(async () => setSt(await fetchChannels()), []);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 8000); return () => clearInterval(t); }, [load]);
  const run = async (f: () => Promise<void>) => { setBusy(true); setMsg(''); try { await f(); } catch (e: any) { setMsg(`❌ ${String(e?.message || e)}`); } finally { setBusy(false); } };
  const connect = (path: string, save: Record<string, string>) => run(async () => { await chApi('/channels', 'PUT', save); const j = await chApi(path); window.open(j.url, '_blank', 'noopener'); setMsg('A sign-in window opened. Approve it, then return here: this page updates by itself.'); });
  useEffect(() => { if (st?.pinterest.connected) void chApi('/pin/boards').then((j) => setBoards(j.boards || [])).catch(() => undefined); }, [st?.pinterest.connected]);
  if (!st) return null;
  const yt = st.youtube, pin = st.pinterest; const redirect = (p: string) => `${location.origin}/api/public/oauth/${p}`;
  return (
    <details className="rounded-xl border border-sky-500/30 bg-slate-950/70 p-3" open={!yt.connected || !pin.connected} data-testid="channels-panel">
      <summary className="cursor-pointer text-sm font-semibold text-sky-200">🔗 Channels — YouTube {yt.connected ? '✅' : '⚪'} · Pinterest {pin.connected && pin.board ? '✅' : '⚪'}</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-lg bg-slate-900/60 p-2 text-[11px] text-slate-300">
          <div className="text-xs font-bold text-slate-100">YouTube Shorts</div>
          {yt.connected ? <div>✅ Connected{yt.channel ? `: ${yt.channel}` : ''}. Every recording is uploaded automatically.</div> : <>
            <div>In Google Cloud (console.cloud.google.com): enable “YouTube Data API v3”, create an OAuth client of type <b>Web application</b>, and add this redirect URI: <code className="break-all text-amber-200">{redirect('youtube')}</code></div>
            <input className={inp} placeholder="Client ID" value={yid} onChange={(e) => setYid(e.target.value.trim())} />
            <input className={inp} type="password" placeholder="Client secret" value={ysec} onChange={(e) => setYsec(e.target.value.trim())} />
            <button type="button" className={btn} disabled={busy || !yid || (!ysec && !yt.clientSet)} onClick={() => void connect('/yt/auth-url', { ytClientId: yid, ...(ysec ? { ytClientSecret: ysec } : {}) })}>Connect YouTube</button></>}
          {yt.connected && <button type="button" className={btn} disabled={busy} onClick={() => void run(async () => { await chApi('/channels/disconnect', 'POST', { which: 'youtube' }); await load(); })}>Disconnect</button>}
        </div>
        <div className="space-y-2 rounded-lg bg-slate-900/60 p-2 text-[11px] text-slate-300">
          <div className="text-xs font-bold text-slate-100">Pinterest</div>
          {!pin.connected ? <>
            <div>At developers.pinterest.com create an app, then add this redirect URI: <code className="break-all text-amber-200">{redirect('pinterest')}</code></div>
            <input className={inp} placeholder="App ID" value={pid} onChange={(e) => setPid(e.target.value.trim())} />
            <input className={inp} type="password" placeholder="App secret" value={psec} onChange={(e) => setPsec(e.target.value.trim())} />
            <button type="button" className={btn} disabled={busy || !pid || (!psec && !pin.appSet)} onClick={() => void connect('/pin/auth-url', { pinAppId: pid, ...(psec ? { pinAppSecret: psec } : {}) })}>Connect Pinterest</button></> : <>
            <div>✅ Connected{pin.user ? `: ${pin.user}` : ''}. Board: <b>{pin.boardName || 'not chosen yet'}</b></div>
            {pin.sandbox && <div className="text-amber-200">Trial access: pins are saved privately until Pinterest approves Standard access.</div>}
            <select className={inp} value={pin.board} onChange={(e) => { const b = boards.find((x) => x.id === e.target.value); if (b) void run(async () => { await chApi('/channels', 'PUT', { pinBoard: b.id, pinBoardName: b.name }); await load(); }); }}><option value="">Choose a board…</option>{boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <div className="flex gap-1"><input className={inp} value={nb} onChange={(e) => setNb(e.target.value)} /><button type="button" className={btn} disabled={busy} onClick={() => void run(async () => { await chApi('/pin/board', 'POST', { name: nb }); await load(); })}>New board</button></div>
            <button type="button" className={btn} disabled={busy} onClick={() => void run(async () => { await chApi('/channels/disconnect', 'POST', { which: 'pinterest' }); await load(); })}>Disconnect</button></>}
        </div>
      </div>
      {msg && <div className="mt-2 text-xs text-amber-100" role="status">{msg}</div>}
    </details>
  );
}
