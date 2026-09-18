import React, { useEffect, useState } from 'react';
import { Check, Palette, Sun, X } from 'lucide-react';

export const APP_THEMES = [
  { id: 'midnight', label: 'Midnight Command', accent: '#38bdf8', surface: '#0b0f19' },
  { id: 'forest', label: 'Forest Terminal', accent: '#34d399', surface: '#071512' },
  { id: 'violet', label: 'Violet Focus', accent: '#a78bfa', surface: '#100d1d' },
  { id: 'sand', label: 'Warm Sand', accent: '#fbbf24', surface: '#17120b' },
] as const;

type ThemeId = (typeof APP_THEMES)[number]['id'];

const readStored = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export const AppearanceControls: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [theme, setTheme] = useState<ThemeId>(() => readStored('primepipfx_theme', 'midnight') as ThemeId);
  const [brightness, setBrightness] = useState(() => Number(readStored('primepipfx_brightness', '100')));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--prime-brightness', `${brightness}%`);
    try {
      localStorage.setItem('primepipfx_theme', theme);
      localStorage.setItem('primepipfx_brightness', String(brightness));
    } catch {}
  }, [theme, brightness]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-end bg-slate-950/50 p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <section
        aria-label="Appearance controls"
        className="prime-card-elevated w-full max-w-sm rounded-2xl p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-cyan-400" />
            <h2 className="font-military text-sm font-bold tracking-wider text-slate-100">APPEARANCE</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100" aria-label="Close appearance controls">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-300">
          <span className="flex items-center gap-2"><Sun className="h-4 w-4 text-amber-300" /> Brightness</span>
          <span className="font-mono-code text-cyan-300">{brightness}%</span>
        </label>
        <input
          aria-label="Brightness"
          type="range"
          min="75"
          max="115"
          step="1"
          value={brightness}
          onChange={(event) => setBrightness(Number(event.target.value))}
          className="mt-2 w-full accent-cyan-400"
        />

        <div className="mt-5">
          <p className="mb-2 text-[10px] font-mono-code uppercase tracking-wider text-slate-500">Template</p>
          <div className="grid grid-cols-2 gap-2">
            {APP_THEMES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition ${
                  theme === option.id ? 'border-cyan-400/70 bg-cyan-400/10 text-slate-100' : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="h-6 w-6 shrink-0 rounded-lg border border-white/10" style={{ background: option.surface, boxShadow: `inset 0 -3px ${option.accent}` }} />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {theme === option.id && <Check className="h-3.5 w-3.5 text-cyan-300" />}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
