/**
 * HUB — the community post board. The admin posts (and can pin) announcements; students post
 * too. Every post shows the author's name; admin posts carry an ADMIN badge. Refreshes every
 * 3 seconds (and instantly after you post).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pin, PinOff, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { getStoredToken } from '../../utils/authClient';

interface HubPost { id: string; userId: string; username: string; displayName: string; role: 'ADMIN' | 'STUDENT'; text: string; pinned: boolean; createdAt: number }

const init = (extra: RequestInit = {}): RequestInit => {
  const token = getStoredToken();
  return { credentials: 'include', cache: 'no-store', ...extra, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(extra.headers || {}) } };
};
const when = (t: number) => {
  const d = new Date(t);
  const sameDay = new Date().toDateString() === d.toDateString();
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', ...(sameDay ? {} : { month: 'short', day: 'numeric' }), hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
};
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export const HubBoard: React.FC = () => {
  const [posts, setPosts] = useState<HubPost[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [pin, setPin] = useState(false);
  const [sending, setSending] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/community/hub', init());
      const j = await r.json().catch(() => ({}));
      if (!alive.current) return;
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setPosts(j.posts || []); setIsAdmin(Boolean(j.isAdmin)); setMe(j.me || ''); setError(null);
    } catch (e: any) { if (alive.current) setError(e.message); }
    finally { if (alive.current) setLoading(false); }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    const t = window.setInterval(() => { if (!document.hidden) load(); }, 3000);
    return () => { alive.current = false; window.clearInterval(t); };
  }, [load]);

  const post = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const r = await fetch('/api/community/hub', init({ method: 'POST', body: JSON.stringify({ text: body, pinned: isAdmin && pin }) }));
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setText(''); setPin(false); setError(null);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSending(false); }
  };
  const act = async (url: string, opts: RequestInit) => {
    try { const r = await fetch(url, init(opts)); const j = await r.json().catch(() => ({})); if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`); await load(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={4000}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); post(); } }}
          placeholder={isAdmin ? 'Post an announcement, analysis or update for every student…' : 'Share an idea, a question or a trade review with the community…'}
          className="w-full resize-none bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none" />
        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/70">
          {isAdmin && (
            <label className="inline-flex items-center gap-1.5 text-[11px] text-amber-200 cursor-pointer select-none">
              <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} className="accent-amber-400" /> Pin to top
            </label>
          )}
          <span className="text-[10px] text-slate-500 ml-auto">{text.length}/4000 · Ctrl+Enter to post</span>
          <button type="button" onClick={post} disabled={!text.trim() || sending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-[12px] font-bold disabled:opacity-40 cursor-pointer">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}Post
          </button>
        </div>
      </div>
      {error && <div className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[11.5px] text-rose-200">{error}</div>}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {loading && <div className="text-[12px] text-slate-400 flex items-center gap-2 p-3"><Loader2 className="w-4 h-4 animate-spin" />Loading the Hub…</div>}
        {!loading && !error && posts.length === 0 && <div className="text-[12px] text-slate-500 p-3">No posts yet — be the first to post.</div>}
        {posts.map((p) => (
          <article key={p.id} className={`rounded-xl border p-3 ${p.pinned ? 'border-amber-400/40 bg-amber-500/[0.06]' : p.role === 'ADMIN' ? 'border-cyan-500/30 bg-cyan-500/[0.04]' : 'border-slate-800 bg-slate-950/60'}`}>
            <header className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${p.role === 'ADMIN' ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}>{initials(p.displayName)}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-bold text-slate-100 truncate">{p.displayName}</span>
                  {p.role === 'ADMIN' && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/40"><ShieldCheck className="w-3 h-3" />Admin</span>}
                  {p.pinned && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-amber-300"><Pin className="w-3 h-3" />Pinned</span>}
                </div>
                <div className="text-[10.5px] text-slate-500">@{p.username} · {when(p.createdAt)}</div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {isAdmin && (
                  <button type="button" onClick={() => act(`/api/community/hub/${p.id}/pin`, { method: 'POST', body: JSON.stringify({ pinned: !p.pinned }) })} title={p.pinned ? 'Unpin' : 'Pin to top'} className="p-1 text-slate-500 hover:text-amber-300 cursor-pointer">
                    {p.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                )}
                {(isAdmin || p.userId === me) && (
                  <button type="button" onClick={() => { if (window.confirm('Delete this post?')) act(`/api/community/hub/${p.id}`, { method: 'DELETE' }); }} title="Delete post" className="p-1 text-slate-500 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </header>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words">{p.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default HubBoard;
