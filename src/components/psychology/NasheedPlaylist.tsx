import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Music2, Play, Plus, Trash2 } from 'lucide-react';

interface PlaylistItem {
  id: string;
  title: string;
  url: string;
}

const STORAGE_KEY = 'primepipfx_psychology_nasheed_playlist';
const isSafeAudioUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export const NasheedPlaylist: React.FC = () => {
  const [items, setItems] = useState<PlaylistItem[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addItem = () => {
    const trimmedUrl = url.trim();
    if (!isSafeAudioUrl(trimmedUrl)) {
      setError('Use a direct http(s) audio URL from a source you trust.');
      return;
    }
    setItems((current) => [...current, { id: `${Date.now()}`, title: title.trim() || 'Untitled nasheed', url: trimmedUrl }]);
    setTitle('');
    setUrl('');
    setError('');
  };

  const playItem = (item: PlaylistItem) => {
    setActiveId(item.id);
    window.setTimeout(() => audioRef.current?.play().catch(() => setError('This source does not allow browser playback.')), 0);
  };

  return (
    <section className="rounded-2xl border border-indigo-500/20 bg-[#090e1c]/80 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Music2 className="h-4 w-4 text-indigo-300" />
          <h2 className="font-military text-xs font-bold uppercase tracking-wider text-slate-200">Focus playlist</h2>
        </div>
        <span className="text-[10px] font-mono-code text-slate-500">Remote URLs only · no audio bundled</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Track name" className="prime-input min-w-0" />
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://trusted-source.example/audio.mp3" inputMode="url" className="prime-input min-w-0" />
        <button type="button" onClick={addItem} className="prime-btn-secondary flex items-center justify-center gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
      {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}
      {activeId && <audio ref={audioRef} controls className="mt-3 w-full" src={items.find((item) => item.id === activeId)?.url} onEnded={() => setActiveId(null)} />}
      <div className="mt-3 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-[11px] text-slate-500">Add a licensed or personally hosted track to build your calming queue.</p>
        ) : items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-2">
            <button type="button" onClick={() => playItem(item)} className="rounded-lg p-1.5 text-cyan-300 hover:bg-cyan-400/10" aria-label={`Play ${item.title}`}><Play className="h-3.5 w-3.5" /></button>
            <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{item.title}</span>
            <a href={item.url} target="_blank" rel="noreferrer noopener" className="text-slate-500 hover:text-cyan-300" aria-label={`Open ${item.title}`}><ExternalLink className="h-3.5 w-3.5" /></a>
            <button type="button" onClick={() => { if (activeId === item.id) setActiveId(null); setItems((current) => current.filter((entry) => entry.id !== item.id)); }} className="text-slate-500 hover:text-rose-300" aria-label={`Remove ${item.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </section>
  );
};
