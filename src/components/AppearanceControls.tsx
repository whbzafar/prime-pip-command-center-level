import React, { useEffect, useState, useMemo } from 'react';
import { Check, Palette, Sun, X, Search, Sparkles, Sliders, RotateCcw } from 'lucide-react';
import {
  INTERFACE_TEMPLATES,
  InterfaceTemplate,
  applyInterfaceTemplate,
  getTemplateById,
} from '../data/interfaceTemplates';

const readStored = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export const AppearanceControls: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [theme, setTheme] = useState<string>(() => readStored('primepipfx_theme', 'midnight'));
  const [brightness, setBrightness] = useState<number>(() => {
    const raw = readStored('primepipfx_brightness', '104');
    const num = Number(raw);
    return !isNaN(num) && num >= 90 && num <= 110 ? num : 104;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | InterfaceTemplate['category']>('ALL');

  useEffect(() => {
    applyInterfaceTemplate(theme, brightness);
  }, [theme, brightness]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredTemplates = useMemo(() => {
    return INTERFACE_TEMPLATES.filter((tpl) => {
      if (selectedCategory !== 'ALL' && tpl.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tpl.label.toLowerCase().includes(q) ||
          tpl.description.toLowerCase().includes(q) ||
          tpl.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const currentTemplate = useMemo(() => getTemplateById(theme), [theme]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <section
        aria-label="Interface Templates & Appearance"
        className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl my-auto animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-cyan-400 border border-blue-500/30">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-military text-sm font-bold tracking-wider text-slate-100 flex items-center gap-2">
                <span>INTERFACE TEMPLATES</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {INTERFACE_TEMPLATES.length} ACTIVE TEMPLATES
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Pro-level theme switching across the entire application — including liquid glass and frosted glass visual systems.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-850 hover:text-slate-100 transition cursor-pointer border border-slate-800"
            aria-label="Close appearance controls"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {/* Active Template Showcase Banner */}
          <div
            className="p-3.5 rounded-xl border flex items-center justify-between transition"
            style={{
              backgroundColor: currentTemplate.surface,
              borderColor: currentTemplate.accent,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner"
                style={{
                  backgroundColor: currentTemplate.bg,
                  borderColor: currentTemplate.border,
                }}
              >
                <Sparkles className="w-5 h-5" style={{ color: currentTemplate.accent }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">{currentTemplate.label}</span>
                  <span
                    className="text-[9px] font-mono-code uppercase px-1.5 py-0.2 rounded font-semibold"
                    style={{
                      backgroundColor: `${currentTemplate.accent}20`,
                      color: currentTemplate.accent,
                    }}
                  >
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{currentTemplate.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTheme('midnight');
                setBrightness(106);
              }}
              className="text-[11px] font-mono-code px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Brightness Adjustment Slider */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Display Brightness</span>
              </span>
              <span className="font-mono-code text-cyan-300 font-bold">{brightness}%</span>
            </div>
            <input
              aria-label="Display Brightness"
              type="range"
              min="75"
              max="120"
              step="1"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search themes (e.g. Liquid Glass, Bloomberg, Cyber, Gold, Tokyo, Nord)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono-code">
              {(['ALL', 'FINANCIAL', 'CYBER', 'TACTICAL', 'MINIMAL', 'VIBRANT'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-500 text-slate-950 font-bold'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 20 Templates Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono-code uppercase tracking-wider text-slate-400">
                Available Templates ({filteredTemplates.length})
              </p>
              <span className="text-[10px] font-mono-code text-slate-500">
                Click any template to apply instantly
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredTemplates.map((tpl) => {
                const isSelected = theme === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTheme(tpl.id)}
                    className={`group text-left p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/20 shadow-md ring-1 ring-cyan-500/40'
                        : 'border-slate-800/90 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Swatch preview */}
                        <div
                          className="w-7 h-7 rounded-lg shrink-0 border border-white/10 flex items-center justify-center relative overflow-hidden shadow-inner"
                          style={{ backgroundColor: tpl.bg }}
                        >
                          <div
                            className="absolute bottom-0 inset-x-0 h-2.5"
                            style={{ backgroundColor: tpl.surface }}
                          />
                          <div
                            className="w-2.5 h-2.5 rounded-full z-10 shadow-sm"
                            style={{ backgroundColor: tpl.accent }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition">
                              {tpl.label}
                            </span>
                            <span className="text-[9px] font-mono-code text-slate-500 uppercase">
                              {tpl.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {tpl.description}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="p-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0 group-hover:border-slate-500 transition" />
                      )}
                    </div>

                    {/* Color palette indicator strip */}
                    <div className="mt-2.5 flex items-center gap-1">
                      <div
                        className="h-1.5 flex-1 rounded-full"
                        style={{ backgroundColor: tpl.bg }}
                        title={`Background: ${tpl.bg}`}
                      />
                      <div
                        className="h-1.5 flex-1 rounded-full"
                        style={{ backgroundColor: tpl.surface }}
                        title={`Surface: ${tpl.surface}`}
                      />
                      <div
                        className="h-1.5 flex-1 rounded-full"
                        style={{ backgroundColor: tpl.elevated }}
                        title={`Elevated: ${tpl.elevated}`}
                      />
                      <div
                        className="h-1.5 flex-2 rounded-full"
                        style={{ backgroundColor: tpl.accent }}
                        title={`Accent: ${tpl.accent}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="text-[11px] font-mono-code text-slate-400">
            Selected: <strong className="text-cyan-300">{currentTemplate.label}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-450 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </section>
    </div>
  );
};
