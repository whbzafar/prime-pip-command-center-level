import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Check,
  Palette,
  Sun,
  Moon,
  X,
  Search,
  Sparkles,
  RotateCcw,
  Globe,
  Trash2,
  Compass,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  INTERFACE_TEMPLATES,
  InterfaceTemplate,
  applyInterfaceTemplate,
  getTemplateById,
} from '../data/interfaceTemplates';
import {
  getStoredCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  synthesizeThemeFromQuery,
} from '../utils/themeSynthesizer';
import { BrightnessController } from './BrightnessController';

const readStored = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

// Lightweight CSS Mini UI Preview component simulating the dashboard theme aesthetic
const ThemeMiniPreview: React.FC<{ template: InterfaceTemplate; isSelected: boolean }> = ({
  template,
  isSelected,
}) => {
  const isLiquidGlass = template.id === 'liquid-glass';
  const isNeonGlass = template.id === 'liquid-glass-neon';
  const isGlass = Boolean(template.isGlass);
  const isBright = Boolean(template.isBright);

  // Background styling with radiant ambient glows for glass themes
  const previewBg = isLiquidGlass
    ? '#eef2f6'
    : isNeonGlass
    ? '#070a13'
    : isBright
    ? template.bg
    : template.bg;

  const previewGradient = isLiquidGlass
    ? 'radial-gradient(circle at 15% 20%, rgba(139, 92, 246, 0.20) 0%, transparent 55%), radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.22) 0%, transparent 55%), radial-gradient(circle at 50% 90%, rgba(236, 72, 153, 0.12) 0%, transparent 60%)'
    : isNeonGlass
    ? 'radial-gradient(circle at 15% 20%, rgba(0, 240, 255, 0.24) 0%, transparent 55%), radial-gradient(circle at 85% 80%, rgba(217, 70, 239, 0.22) 0%, transparent 55%)'
    : undefined;

  return (
    <div
      className="w-full h-15 rounded-lg border relative p-1.5 flex flex-col justify-between select-none overflow-hidden my-2 shadow-xs group-hover:shadow-md transition-all duration-200"
      style={{
        backgroundColor: previewBg,
        backgroundImage: previewGradient,
        borderColor: isSelected
          ? template.accent
          : isGlass
          ? isNeonGlass
            ? 'rgba(56, 189, 248, 0.35)'
            : 'rgba(203, 213, 225, 0.9)'
          : `${template.border}99`,
        boxShadow: isNeonGlass
          ? '0 0 14px -2px rgba(0, 240, 255, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
          : isLiquidGlass
          ? '0 4px 14px rgba(31, 38, 135, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95)'
          : 'inset 0 1px 2px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Specular reflection line for liquid glass styles */}
      {isGlass && (
        <div
          className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none"
          style={{
            background: isNeonGlass
              ? 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.6) 50%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.9) 50%, transparent 100%)',
          }}
        />
      )}

      {/* Mini Header / Navigation Bar */}
      <div
        className="w-full h-3 rounded px-1.5 flex items-center justify-between border"
        style={{
          backgroundColor: isGlass
            ? isNeonGlass
              ? 'rgba(13, 19, 36, 0.85)'
              : 'rgba(255, 255, 255, 0.85)'
            : template.surface,
          borderColor: isGlass
            ? isNeonGlass
              ? 'rgba(56, 189, 248, 0.35)'
              : 'rgba(203, 213, 225, 0.8)'
            : template.border,
        }}
      >
        <div className="flex items-center gap-1">
          <div
            className="w-1.5 h-1.5 rounded-full shadow-xs"
            style={{
              backgroundColor: template.accent,
              boxShadow: isNeonGlass ? `0 0 4px ${template.accent}` : undefined,
            }}
          />
          <div
            className="w-8 h-1 rounded-full opacity-70"
            style={{ backgroundColor: template.ink }}
          />
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-1 rounded-full opacity-60"
            style={{ backgroundColor: template.inkMuted }}
          />
          <div
            className="w-2.5 h-1 rounded-full"
            style={{
              backgroundColor: template.accent,
              boxShadow: isNeonGlass ? `0 0 4px ${template.accent}` : undefined,
            }}
          />
        </div>
      </div>

      {/* Mini Content Panels (simulating terminal cards and sparkline) */}
      <div className="grid grid-cols-4 gap-1 h-7">
        {/* Left Metric Card */}
        <div
          className="col-span-3 rounded p-1 flex flex-col justify-between border relative overflow-hidden"
          style={{
            backgroundColor: isGlass
              ? isNeonGlass
                ? 'rgba(13, 19, 36, 0.78)'
                : 'rgba(255, 255, 255, 0.78)'
              : template.surface,
            borderColor: isGlass
              ? isNeonGlass
                ? 'rgba(56, 189, 248, 0.3)'
                : 'rgba(203, 213, 225, 0.8)'
              : template.border,
            boxShadow: isNeonGlass ? '0 0 8px rgba(0, 240, 255, 0.12)' : undefined,
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className="w-10 h-1 rounded-full opacity-60"
              style={{ backgroundColor: template.inkMuted }}
            />
            <div
              className="w-3 h-1 rounded-full"
              style={{ backgroundColor: template.accent }}
            />
          </div>
          <div className="flex items-baseline gap-1">
            <div
              className="w-5 h-1.5 rounded-full opacity-90"
              style={{ backgroundColor: template.ink }}
            />
            <div
              className="w-3 h-1 rounded-full"
              style={{ backgroundColor: template.accentSecondary }}
            />
          </div>
        </div>

        {/* Right Mini Graph / Indicator Card */}
        <div
          className="col-span-1 rounded p-1 flex flex-col items-center justify-between border"
          style={{
            backgroundColor: isGlass
              ? isNeonGlass
                ? 'rgba(23, 34, 58, 0.85)'
                : 'rgba(255, 255, 255, 0.92)'
              : template.elevated,
            borderColor: isGlass
              ? isNeonGlass
                ? 'rgba(217, 70, 239, 0.35)'
                : 'rgba(203, 213, 225, 0.8)'
              : template.border,
          }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full flex items-center justify-center text-[6px] font-bold"
            style={{
              backgroundColor: `${template.accent}25`,
              color: template.accent,
            }}
          >
            ●
          </div>
          <div
            className="w-full h-1.5 rounded-full shadow-xs"
            style={{
              backgroundColor: template.accent,
              boxShadow: isNeonGlass ? `0 0 6px ${template.accent}` : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const AppearanceControls: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [theme, setTheme] = useState<string>(() => readStored('primepipfx_theme', 'midnight'));
  const initialThemeApply = useRef(true);
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null);
  const [customThemes, setCustomThemes] = useState<InterfaceTemplate[]>(() => getStoredCustomThemes());
  const [brightness, setBrightness] = useState<number>(() => {
    const raw = readStored('primepipfx_brightness', '104');
    const num = Number(raw);
    return !isNaN(num) && num >= 60 && num <= 160 ? num : 104;
  });
  const [isBrightnessExpanded, setIsBrightnessExpanded] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | InterfaceTemplate['category']>('ALL');

  // Reload custom themes from localStorage on open
  useEffect(() => {
    if (isOpen) {
      setCustomThemes(getStoredCustomThemes());
    }
  }, [isOpen]);

  // Combine built-in templates with custom-fetched themes
  const allTemplates = useMemo(() => {
    const map = new Map<string, InterfaceTemplate>();
    INTERFACE_TEMPLATES.forEach((t) => map.set(t.id, t));
    customThemes.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [customThemes]);

  useEffect(() => {
    applyInterfaceTemplate(theme, brightness);
    if (initialThemeApply.current) {
      initialThemeApply.current = false;
      return;
    }
    try {
      localStorage.setItem('primepipfx_visual_style', 'restored');
    } catch {}
    delete document.documentElement.dataset.visualStyle;
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

  // Real-time query synthesis for Google & Web searches
  const synthesizedPreview = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return null;
    return synthesizeThemeFromQuery(q);
  }, [searchQuery]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((tpl) => {
      if (selectedCategory !== 'ALL' && tpl.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tpl.label.toLowerCase().includes(q) ||
          tpl.description.toLowerCase().includes(q) ||
          tpl.category.toLowerCase().includes(q) ||
          (tpl.badge && tpl.badge.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allTemplates, selectedCategory, searchQuery]);

  // Active or currently hovered template for live comparison
  const selectedTemplate = useMemo(() => getTemplateById(theme), [theme]);
  const displayTemplate = useMemo(
    () => getTemplateById(hoveredThemeId || theme),
    [hoveredThemeId, theme]
  );
  const isPreviewingHover = Boolean(hoveredThemeId && hoveredThemeId !== theme);

  // Quick bright/dark toggle helper
  const isCurrentThemeBright = Boolean(selectedTemplate.isBright);
  const handleToggleBrightMode = () => {
    if (isCurrentThemeBright) {
      setTheme('midnight');
    } else {
      setTheme('daylight');
    }
  };

  const handleApplySynthesizedTheme = (synthTheme: InterfaceTemplate) => {
    saveCustomTheme(synthTheme);
    setCustomThemes(getStoredCustomThemes());
    setTheme(synthTheme.id);
  };

  const handleDeleteCustom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCustomTheme(id);
    setCustomThemes(getStoredCustomThemes());
    if (theme === id) {
      setTheme('midnight');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <section
        aria-label="Interface Themes & Appearance Studio"
        className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl my-auto animate-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/15 text-cyan-400 border border-blue-500/30 shadow-lg shadow-cyan-500/10">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-military text-sm sm:text-base font-bold tracking-wider text-slate-100 flex items-center gap-2 flex-wrap">
                <span>THEME & PALETTE STUDIO</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {allTemplates.length} THEMES
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  GOOGLE DISCOVERY
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Instant search, Google Material palettes, and one-click bright daylight modes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick 1-Click Daylight / Midnight Toggle */}
            <button
              type="button"
              onClick={handleToggleBrightMode}
              title={isCurrentThemeBright ? 'Switch to Dark Mode (Midnight)' : 'Switch to Bright Mode (Daylight)'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono-code font-bold transition cursor-pointer ${
                isCurrentThemeBright
                  ? 'bg-amber-400/20 text-amber-200 border-amber-400/40 hover:bg-amber-400/30'
                  : 'bg-slate-900 text-sky-300 border-slate-800 hover:bg-slate-850 hover:border-sky-500/50'
              }`}
            >
              {isCurrentThemeBright ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">DARK MODE</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">BRIGHT MODE</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-850 hover:text-slate-100 transition cursor-pointer border border-slate-800"
              aria-label="Close appearance controls"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {/* Active / Hovered Template Showcase Banner */}
          <div
            className="p-3.5 rounded-xl border flex items-center justify-between transition-all duration-200 shadow-md relative overflow-hidden"
            style={{
              backgroundColor: displayTemplate.surface,
              borderColor: displayTemplate.accent,
            }}
          >
            {displayTemplate.isGlass && (
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            )}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner relative overflow-hidden shrink-0"
                style={{
                  backgroundColor: displayTemplate.bg,
                  borderColor: displayTemplate.border,
                }}
              >
                {displayTemplate.isGlass && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/20 via-transparent to-pink-400/20" />
                )}
                <Sparkles className="w-5 h-5 relative z-10" style={{ color: displayTemplate.accent }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-100">{displayTemplate.label}</span>
                  {isPreviewingHover ? (
                    <span
                      className="text-[9px] font-mono-code uppercase px-2 py-0.5 rounded font-bold animate-pulse"
                      style={{
                        backgroundColor: `${displayTemplate.accent}30`,
                        color: displayTemplate.accent,
                        border: `1px solid ${displayTemplate.accent}60`,
                      }}
                    >
                      PREVIEWING • CLICK TO APPLY
                    </span>
                  ) : (
                    <span
                      className="text-[9px] font-mono-code uppercase px-1.5 py-0.2 rounded font-semibold"
                      style={{
                        backgroundColor: `${displayTemplate.accent}25`,
                        color: displayTemplate.accent,
                      }}
                    >
                      CURRENTLY ACTIVE
                    </span>
                  )}
                  {displayTemplate.isBright && (
                    <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ☀️ BRIGHT DAYLIGHT
                    </span>
                  )}
                  {displayTemplate.badge && (
                    <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {displayTemplate.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{displayTemplate.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTheme('liquid-glass-neon');
                setBrightness(104);
              }}
              className="text-[11px] font-mono-code px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer shrink-0 ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Restore Command Center</span>
            </button>
          </div>

          {/* Search Bar with Google Discovery prompt */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="text"
                placeholder="Search themes or fetch live from Google (e.g. Google Paper, Bright Sun, Liquid Glass, Ferrari, Matrix)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/70 rounded-xl pl-10 pr-24 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Inspiration Search Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono-code scrollbar-none">
              <span className="text-slate-500 uppercase flex items-center gap-1 shrink-0">
                <Compass className="w-3 h-3 text-cyan-400" />
                Try:
              </span>
              {[
                'Google Paper',
                'Google Coral',
                'Google Emerald',
                'Liquid Glass',
                'Solar Daylight',
                'Swiss Precision',
                'Nordic Glacier',
                'Gold Bullion',
                'Tokyo Sakura',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSearchQuery(chip)}
                  className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition shrink-0 cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono-code scrollbar-none pt-1">
              {(
                [
                  { id: 'ALL', label: `ALL (${allTemplates.length})` },
                  { id: 'GOOGLE', label: '🌐 GOOGLE THEMES' },
                  { id: 'BRIGHT', label: '☀️ BRIGHT MODES' },
                  { id: 'GLASS', label: '✨ LIQUID GLASS' },
                  { id: 'FINANCIAL', label: '🏛️ FINANCIAL' },
                  { id: 'CYBER', label: '⚡ CYBER' },
                  { id: 'TACTICAL', label: '🎯 TACTICAL' },
                  { id: 'MINIMAL', label: '📐 MINIMAL' },
                  { id: 'VIBRANT', label: '🌈 VIBRANT' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-500 text-slate-950 font-bold shadow-md shadow-blue-500/20'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Google & Web Theme Fetch Card (Appears whenever user types a custom search) */}
          {synthesizedPreview && (
            <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900/60 shadow-lg relative overflow-hidden animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl border flex items-center justify-center shadow-inner relative overflow-hidden shrink-0"
                    style={{
                      backgroundColor: synthesizedPreview.bg,
                      borderColor: synthesizedPreview.border,
                    }}
                  >
                    <Globe className="w-5 h-5" style={{ color: synthesizedPreview.accent }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-100">{synthesizedPreview.label}</span>
                      <span className="text-[9px] font-mono-code px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        GOOGLE & WEB DISCOVERY
                      </span>
                      {synthesizedPreview.isBright && (
                        <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ☀️ BRIGHT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">{synthesizedPreview.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplySynthesizedTheme(synthesizedPreview)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/25 transition cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fetch & Apply Theme</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Swatch Strip */}
              <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-mono-code text-slate-400">Palette:</span>
                <div
                  className="w-5 h-4 rounded border border-white/20"
                  style={{ backgroundColor: synthesizedPreview.bg }}
                  title={`Canvas: ${synthesizedPreview.bg}`}
                />
                <div
                  className="w-5 h-4 rounded border border-white/20"
                  style={{ backgroundColor: synthesizedPreview.surface }}
                  title={`Surface: ${synthesizedPreview.surface}`}
                />
                <div
                  className="w-5 h-4 rounded border border-white/20"
                  style={{ backgroundColor: synthesizedPreview.accent }}
                  title={`Primary: ${synthesizedPreview.accent}`}
                />
                <div
                  className="w-5 h-4 rounded border border-white/20"
                  style={{ backgroundColor: synthesizedPreview.accentSecondary }}
                  title={`Secondary: ${synthesizedPreview.accentSecondary}`}
                />
              </div>
            </div>
          )}

          {/* Display Brightness & Luminance Intensity Section */}
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xs">
            <button
              id="appearance-brightness-toggle-btn"
              type="button"
              onClick={() => setIsBrightnessExpanded((prev) => !prev)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-850 transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  <Sun className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">
                      Interface Brightness & Intensity Controls
                    </span>
                    <span className="text-[9px] font-mono-code font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      CLICK TO {isBrightnessExpanded ? 'COLLAPSE' : 'ADJUST'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono-code">
                    Dedicated controls to increase/decrease luminance intensity (+/-)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono-code text-cyan-300 font-extrabold text-xs px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700/80">
                  {brightness}%
                </span>
                {isBrightnessExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {isBrightnessExpanded && (
              <div className="p-3 pt-0 border-t border-slate-800/80">
                <BrightnessController
                  variant="inline"
                  currentBrightness={brightness}
                  onBrightnessChange={(newB) => setBrightness(newB)}
                  currentThemeId={theme}
                  onThemeChange={(newTheme) => setTheme(newTheme)}
                />
              </div>
            )}
          </div>

          {/* Themes Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono-code uppercase tracking-wider text-slate-400">
                Matching Themes ({filteredTemplates.length})
              </p>
              <span className="text-[10px] font-mono-code text-slate-500">
                Click any theme to apply immediately
              </span>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
                <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium">No built-in theme matches "{searchQuery}"</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Use the Google & Web Discovery card above to synthesize and apply a custom palette!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredTemplates.map((tpl) => {
                  const isSelected = theme === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setTheme(tpl.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setTheme(tpl.id);
                        }
                      }}
                      onMouseEnter={() => setHoveredThemeId(tpl.id)}
                      onMouseLeave={() => setHoveredThemeId(null)}
                      className={`group text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/25 shadow-lg ring-2 ring-cyan-500/50 shadow-cyan-500/15'
                          : 'border-slate-800/90 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700'
                      } ${tpl.isGlass ? 'backdrop-blur-md' : ''}`}
                    >
                      {/* Top glass reflection line for glass themes */}
                      {tpl.isGlass && (
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Swatch preview with liquid glass reflection styling */}
                          <div
                            className="w-8 h-8 rounded-lg shrink-0 border border-white/10 flex items-center justify-center relative overflow-hidden shadow-inner"
                            style={{ backgroundColor: tpl.bg }}
                          >
                            {tpl.isGlass && (
                              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/30 via-transparent to-pink-400/30" />
                            )}
                            <div
                              className="absolute bottom-0 inset-x-0 h-3"
                              style={{ backgroundColor: tpl.surface }}
                            />
                            <div
                              className="w-3 h-3 rounded-full z-10 shadow-sm border border-white/20"
                              style={{ backgroundColor: tpl.accent }}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition">
                                {tpl.label}
                              </span>
                              {tpl.badge && (
                                <span className="text-[8px] font-mono-code font-bold uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  {tpl.badge}
                                </span>
                              )}
                              {tpl.isBright && (
                                <span className="text-[8px] font-mono-code font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  ☀️ BRIGHT
                                </span>
                              )}
                              <span className="text-[9px] font-mono-code text-slate-500 uppercase">
                                {tpl.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {tpl.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {tpl.isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustom(e, tpl.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Delete saved theme"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {isSelected ? (
                            <div className="p-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/30">
                              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-700 group-hover:border-slate-500 transition" />
                          )}
                        </div>
                      </div>

                      {/* Small lightweight CSS preview of the theme */}
                      <ThemeMiniPreview template={tpl} isSelected={isSelected} />

                      {/* Color palette indicator strip */}
                      <div className="mt-1 flex items-center gap-1">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="text-[11px] font-mono-code text-slate-400">
            Selected: <strong className="text-cyan-300">{selectedTemplate.label}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shadow-blue-500/20"
          >
            Apply & Close
          </button>
        </div>
      </section>
    </div>
  );
};
