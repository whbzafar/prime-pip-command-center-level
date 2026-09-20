import React, { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Music2,
  Play,
  Pause,
  Plus,
  Trash2,
  Volume2,
  Youtube,
  Maximize2,
  Minimize2,
  Minus,
  ChevronDown,
  X,
  Radio,
} from 'lucide-react';

export interface PlaylistItem {
  id: string;
  title: string;
  url: string;
}

const STORAGE_KEY = 'primepipfx_psychology_nasheed_playlist';
const MINIMIZED_STORAGE_KEY = 'primepipfx_psychology_nasheed_minimized';

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

interface NasheedPlaylistProps {
  className?: string;
  defaultMinimized?: boolean;
}

export const NasheedPlaylist: React.FC<NasheedPlaylistProps> = ({
  className = '',
  defaultMinimized = false,
}) => {
  const [items, setItems] = useState<PlaylistItem[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(stored) && stored.length > 0) {
        // Guarantee default focus tracks exist in the list
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

  // Mobile-first: start expanded by default so playlist is completely visible
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(MINIMIZED_STORAGE_KEY);
      if (saved !== null) return saved === 'true';
    } catch {}
    return defaultMinimized;
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
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

  useEffect(() => {
    try {
      localStorage.setItem(MINIMIZED_STORAGE_KEY, String(isMinimized));
    } catch {}
  }, [isMinimized]);

  // Handle ESC key to exit fullscreen mode
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Lock body scroll when fullscreen modal is open
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  const activeItem = items.find((item) => item.id === activeId) || null;
  const activeYouTubeId = activeItem ? extractYouTubeVideoId(activeItem.url) : null;

  const addItem = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Please enter a YouTube link or audio stream URL.');
      return;
    }
    if (!isPlayableUrl(trimmedUrl)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    const isYt = Boolean(extractYouTubeVideoId(trimmedUrl));
    const fallbackTitle = isYt ? 'YouTube Focus Audio' : 'Custom Audio Stream';
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
      setActiveId(null);
    } else {
      setActiveId(item.id);
      setError('');
    }
  };

  // Reusable Track Content Renderer
  const renderTrackForm = () => (
    <div className="space-y-2 w-full max-w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Track title (e.g., Focus Nasheed / Lo-Fi)"
          className="w-full flex-1 min-w-0 px-3 py-2.5 text-xs rounded-xl bg-slate-950/90 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition min-h-[44px]"
        />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="YouTube link (https://youtu.be/...)"
          inputMode="url"
          className="w-full flex-[1.5] min-w-0 px-3 py-2.5 text-xs rounded-xl bg-slate-950/90 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition min-h-[44px]"
        />
        <button
          type="button"
          onClick={addItem}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition active:scale-95 cursor-pointer shrink-0 shadow-md shadow-cyan-500/20 min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Track</span>
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-400 font-mono-code">{error}</p>}
    </div>
  );

  const renderActivePlayer = (isTheaterMode = false) => {
    if (!activeItem) return null;

    return (
      <div className="p-3 sm:p-4 rounded-xl border border-indigo-500/30 bg-slate-950/90 space-y-3 shadow-inner">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Volume2 className="h-4 w-4 text-emerald-400 shrink-0 animate-pulse" />
            <span className="font-mono-code text-[10px] sm:text-[11px] text-emerald-400 uppercase tracking-wider shrink-0">
              Now Playing:
            </span>
            <span className="text-slate-200 font-semibold truncate text-xs min-w-0" title={activeItem.title}>
              {activeItem.title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="text-[11px] text-slate-400 hover:text-rose-400 font-mono-code px-2 py-0.5 rounded hover:bg-rose-950/40 transition cursor-pointer"
            >
              Stop
            </button>
          </div>
        </div>

        {activeYouTubeId ? (
          <div
            className={`relative w-full rounded-xl overflow-hidden border border-slate-800 bg-black shadow-2xl ${
              isTheaterMode ? 'max-w-4xl mx-auto aspect-video max-h-[60vh]' : 'aspect-video w-full'
            }`}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeYouTubeId}?autoplay=1&rel=0&enablejsapi=1`}
              title={activeItem.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0 absolute inset-0"
            />
          </div>
        ) : (
          <audio
            ref={audioRef}
            controls
            autoPlay
            className="w-full mt-1"
            src={activeItem.url}
            onEnded={() => setActiveId(null)}
            onError={() => setError('Direct audio stream could not be loaded. Please verify link format.')}
          />
        )}
      </div>
    );
  };

  const renderQueueList = () => (
    <div className="space-y-2">
      <div className="text-[10px] font-mono-code uppercase tracking-wider text-slate-400 flex items-center justify-between">
        <span>Queued Focus Audio ({items.length})</span>
        <span className="text-cyan-400/80">Tap to switch track</span>
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {items.map((item) => {
          const isPlaying = activeId === item.id;
          const isYt = Boolean(extractYouTubeVideoId(item.url));

          return (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 rounded-xl border p-2 sm:px-3 sm:py-2.5 transition ${
                isPlaying
                  ? 'border-cyan-500/60 bg-cyan-950/30 text-cyan-200 shadow-sm shadow-cyan-500/10'
                  : 'border-slate-800/90 bg-slate-950/70 text-slate-300 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => playItem(item)}
                className={`rounded-lg p-2 transition cursor-pointer shrink-0 ${
                  isPlaying
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-900 text-cyan-400 hover:bg-cyan-500/20'
                }`}
                aria-label={`Play ${item.title}`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {isYt ? (
                    <Youtube className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  ) : (
                    <Music2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  )}
                  <span className="truncate text-xs font-medium text-slate-200" title={item.title}>
                    {item.title}
                  </span>
                </div>
              </div>

              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition shrink-0"
                title="Open original link"
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
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                title="Remove track"
                aria-label={`Remove ${item.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // =========================================================================
  // 1. FULLSCREEN THEATER MODE (Maximized View)
  // =========================================================================
  if (isFullscreen) {
    return (
      <div
        id="nasheed-playlist-fullscreen"
        className="fixed inset-0 z-[9999] bg-[#060a14]/98 backdrop-blur-2xl p-3 sm:p-6 md:p-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col overflow-y-auto animate-in fade-in duration-200"
      >
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col space-y-4">
          {/* Fullscreen Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Music2 className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                    FULLSCREEN FOCUS THEATER
                  </span>
                  <span className="text-[10px] font-mono-code text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                    ESC to Exit
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-military font-bold text-slate-100 tracking-wider mt-0.5 truncate">
                  Psychological Focus Playlist
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono-code transition active:scale-95 cursor-pointer shadow-md min-h-[40px]"
                title="Minimize / Exit Fullscreen (Esc)"
                aria-label="Exit Fullscreen"
              >
                <Minimize2 className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-xs">Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Active Video Player (Theater scale) */}
          {renderActivePlayer(true)}

          {/* Controls & Queue in Fullscreen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-800/90 bg-slate-950/70 space-y-3">
              <span className="text-xs font-military font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                Add Focus Audio / YouTube Video
              </span>
              {renderTrackForm()}
            </div>

            <div className="p-4 rounded-2xl border border-slate-800/90 bg-slate-950/70">
              {renderQueueList()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. MINIMIZED VIEW (Space-Saving Compact Dock)
  // =========================================================================
  if (isMinimized) {
    return (
      <div
        id="nasheed-playlist-minimized"
        className={`w-full rounded-2xl border border-cyan-500/30 bg-[#090e1c]/95 p-3 sm:p-4 shadow-xl backdrop-blur-sm transition-all duration-200 ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Music2 className={`w-4 h-4 ${activeItem ? 'animate-pulse text-emerald-400' : ''}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                  Psychological Focus Playlist
                </span>
                <span className="text-[10px] font-mono-code text-cyan-400/90 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  {items.length} tracks
                </span>
              </div>
              {activeItem ? (
                <div className="flex items-center gap-1.5 min-w-0 text-xs text-emerald-400 truncate mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="font-mono-code text-[11px] font-semibold truncate">
                    Now Playing: {activeItem.title}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono-code block truncate">
                  Ready to play • Click expand to manage
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {activeItem && (
              <button
                type="button"
                onClick={() => playItem(activeItem)}
                className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title={activeId ? 'Pause / Stop' : 'Play'}
                aria-label={activeId ? 'Pause' : 'Play'}
              >
                {activeId ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono-code transition active:scale-95 cursor-pointer shadow-sm min-h-[40px]"
              title="Expand playlist"
              aria-label="Expand Playlist"
            >
              <ChevronDown className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold">Expand</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMinimized(false);
                setIsFullscreen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-500/40 text-xs font-mono-code transition active:scale-95 cursor-pointer shadow-sm min-h-[40px]"
              title="Maximize to Fullscreen"
              aria-label="Maximize to Fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold">Full Screen</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. NORMAL VIEW (Standard Responsive Card with Full Visibility)
  // =========================================================================
  return (
    <section
      id="nasheed-playlist-container"
      className={`w-full max-w-full rounded-2xl border border-cyan-500/30 bg-[#090e1c]/95 p-3.5 sm:p-5 shadow-2xl backdrop-blur-sm transition-all duration-200 box-border overflow-hidden ${className}`}
    >
      {/* Header with Title, Badge, and Minimize & Full Screen Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Music2 className="h-4 w-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-military text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 truncate">
                Psychological Focus Playlist
              </h2>
              <span className="text-[9px] sm:text-[10px] font-mono-code text-cyan-400/90 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 shrink-0">
                YouTube & Audio Stream
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-sans mt-0.5 truncate">
              Audio anchoring for emotional regulation, calm execution & flow state
            </p>
          </div>
        </div>

        {/* Maximize to Full Screen and Minimize Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/80 text-xs font-mono-code transition active:scale-95 cursor-pointer shadow-sm min-h-[40px]"
            title="Minimize to compact bar"
            aria-label="Minimize Playlist"
          >
            <Minus className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold">Minimize</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs font-mono-code transition active:scale-95 cursor-pointer shadow-sm min-h-[40px]"
            title="Maximize to Full Screen"
            aria-label="Maximize to Full Screen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold">Full Screen</span>
          </button>
        </div>
      </div>

      {/* Add New Track Form */}
      <div className="mt-3.5">
        {renderTrackForm()}
      </div>

      {/* Active Track Player */}
      {activeItem && (
        <div className="mt-3.5">
          {renderActivePlayer(false)}
        </div>
      )}

      {/* Track Queue */}
      <div className="mt-3.5">
        {renderQueueList()}
      </div>
    </section>
  );
};
