import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Music2, Play, Pause, Plus, Trash2, Volume2, Youtube } from 'lucide-react';

export interface PlaylistItem {
  id: string;
  title: string;
  url: string;
}

const STORAGE_KEY = 'primepipfx_psychology_nasheed_playlist';

export const DEFAULT_FOCUS_TRACKS: PlaylistItem[] = [
  {
    id: 'track-1-hubbuka',
    title: 'Hubbuka Fi Qalbi - Ikyy Pahlevii Slow Remix Arabic ( Official Lyric Video )',
    url: 'https://youtu.be/VatATQACUhE?list=RDrH9mDCe83v0',
  },
  {
    id: 'track-2-abeer',
    title: 'Abeer Nehme - Bi Saraha | عبير نعمة - بصراحة',
    url: 'https://youtu.be/rH9mDCe83v0?list=RDrH9mDCe83v0',
  },
];

export function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const trimmed = rawUrl.trim();
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = trimmed.match(regExp);
    return match && match[1].length === 11 ? match[1] : null;
  } catch {
    return null;
  }
}

const isPlayableUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export const NasheedPlaylist: React.FC = () => {
  const [items, setItems] = useState<PlaylistItem[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(stored) && stored.length > 0) {
        // Guarantee both required tracks are included
        const hasTrack1 = stored.some((t) => t.url?.includes('VatATQACUhE'));
        const hasTrack2 = stored.some((t) => t.url?.includes('rH9mDCe83v0'));
        const merged = [...stored];
        if (!hasTrack2) merged.unshift(DEFAULT_FOCUS_TRACKS[1]);
        if (!hasTrack1) merged.unshift(DEFAULT_FOCUS_TRACKS[0]);
        return merged;
      }
    } catch {}
    return DEFAULT_FOCUS_TRACKS;
  });

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<string | null>(DEFAULT_FOCUS_TRACKS[0].id);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const activeItem = items.find((item) => item.id === activeId) || null;
  const activeYouTubeId = activeItem ? extractYouTubeVideoId(activeItem.url) : null;

  const addItem = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Please provide a track link (YouTube or audio URL).');
      return;
    }
    if (!isPlayableUrl(trimmedUrl)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    const isYt = Boolean(extractYouTubeVideoId(trimmedUrl));
    const fallbackTitle = isYt ? 'YouTube Focus Audio' : 'Custom Audio Track';
    const newTrack: PlaylistItem = {
      id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim() || fallbackTitle,
      url: trimmedUrl,
    };

    setItems((current) => [...current, newTrack]);
    setActiveId(newTrack.id);
    setTitle('');
    setUrl('');
    setError('');
  };

  const playItem = (item: PlaylistItem) => {
    if (activeId === item.id) {
      // Toggle pause/stop
      setActiveId(null);
    } else {
      setActiveId(item.id);
      setError('');
    }
  };

  return (
    <section className="rounded-2xl border border-indigo-500/20 bg-[#090e1c]/90 p-4 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/10 pb-3">
        <div className="flex items-center gap-2">
          <Music2 className="h-4 w-4 text-cyan-400 animate-pulse" />
          <h2 className="font-military text-xs font-bold uppercase tracking-wider text-slate-100">
            Psychological Focus Playlist
          </h2>
        </div>
        <span className="text-[10px] font-mono-code text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
          YouTube & Audio Stream Enabled
        </span>
      </div>

      {/* Add New Track Form */}
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.6fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Track title (e.g., Focus Nasheed / Lo-Fi)"
          className="prime-input min-w-0 text-xs"
        />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://youtu.be/... or https://audio.mp3"
          inputMode="url"
          className="prime-input min-w-0 text-xs"
        />
        <button
          type="button"
          onClick={addItem}
          className="prime-btn-secondary flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-cyan-400" /> Add Track
        </button>
      </div>

      {error && <p className="mt-2 text-[11px] text-rose-400 font-mono-code">{error}</p>}

      {/* Active Track Player Engine */}
      {activeItem && (
        <div className="mt-3 p-3 rounded-xl border border-indigo-500/30 bg-slate-950/80 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Volume2 className="h-4 w-4 text-emerald-400 shrink-0 animate-pulse" />
              <span className="font-mono-code text-[11px] text-emerald-400 uppercase tracking-wider">Now Playing:</span>
              <span className="text-slate-200 font-semibold truncate text-xs">{activeItem.title}</span>
            </div>
            <button
              onClick={() => setActiveId(null)}
              className="text-[11px] text-slate-400 hover:text-rose-400 font-mono-code transition cursor-pointer"
            >
              Stop
            </button>
          </div>

          {activeYouTubeId ? (
            <div className="relative w-full rounded-lg overflow-hidden border border-slate-800 bg-black shadow-lg">
              <div className="aspect-[16/9] max-h-56 sm:max-h-64 w-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeYouTubeId}?autoplay=1&rel=0&enablejsapi=1`}
                  title={activeItem.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : (
            <audio
              ref={audioRef}
              controls
              autoPlay
              className="w-full mt-2"
              src={activeItem.url}
              onEnded={() => setActiveId(null)}
              onError={() => setError('Direct audio stream could not be loaded. Please check link format.')}
            />
          )}
        </div>
      )}

      {/* Track Queue */}
      <div className="mt-3 space-y-2">
        <div className="text-[10px] font-mono-code uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Queued Focus Audio ({items.length})</span>
          <span>Click play on any track</span>
        </div>

        {items.map((item) => {
          const isPlaying = activeId === item.id;
          const isYt = Boolean(extractYouTubeVideoId(item.url));

          return (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition ${
                isPlaying
                  ? 'border-cyan-500/60 bg-cyan-950/30 text-cyan-200'
                  : 'border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => playItem(item)}
                className={`rounded-lg p-2 transition cursor-pointer ${
                  isPlaying
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-cyan-400 hover:bg-cyan-500/20'
                }`}
                aria-label={`Play ${item.title}`}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {isYt ? (
                    <Youtube className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  ) : (
                    <Music2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  )}
                  <span className="truncate text-xs font-medium text-slate-200">{item.title}</span>
                </div>
              </div>

              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="p-1.5 text-slate-400 hover:text-cyan-400 transition"
                title="Open in new tab"
                aria-label={`Open ${item.title}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={() => {
                  if (activeId === item.id) setActiveId(null);
                  setItems((current) => current.filter((entry) => entry.id !== item.id));
                }}
                className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                title="Remove track"
                aria-label={`Remove ${item.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
