import React, { useState, useEffect } from 'react';
import { Sparkles, RotateCcw, Check, Layers, Sliders } from 'lucide-react';
import {
  generateLiquidGlassTheme,
  restorePreviousTheme,
  isLiquidGlassThemeActive,
  getStoredRestoreTheme,
  LIQUID_GLASS_THEME_ID,
} from '../utils/themeGenerator';
import { getTemplateById } from '../data/interfaceTemplates';

interface LiquidGlassThemeToggleProps {
  variant?: 'header' | 'card' | 'compact';
  className?: string;
  onOpenAppearance?: () => void;
}

export const LiquidGlassThemeToggle: React.FC<LiquidGlassThemeToggleProps> = ({
  variant = 'header',
  className = '',
  onOpenAppearance,
}) => {
  const [isActive, setIsActive] = useState<boolean>(() => isLiquidGlassThemeActive());
  const [previousTheme, setPreviousTheme] = useState<string>(() => getStoredRestoreTheme());
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleCheck = () => {
      setIsActive(isLiquidGlassThemeActive());
      setPreviousTheme(getStoredRestoreTheme());
    };

    window.addEventListener('primepipfx_theme_generated', handleCheck);
    window.addEventListener('primepipfx_theme_restored', handleCheck);
    window.addEventListener('primepipfx_brightness_changed', handleCheck);

    const observer = new MutationObserver(handleCheck);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      window.removeEventListener('primepipfx_theme_generated', handleCheck);
      window.removeEventListener('primepipfx_theme_restored', handleCheck);
      window.removeEventListener('primepipfx_brightness_changed', handleCheck);
      observer.disconnect();
    };
  }, []);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleGenerate = () => {
    const { themeId, previousThemeId } = generateLiquidGlassTheme();
    setIsActive(true);
    setPreviousTheme(previousThemeId);
    showFeedback('✨ Liquid Glass UI Kit Generated & Applied Across Application');
  };

  const handleRestore = () => {
    const { restoredThemeId } = restorePreviousTheme();
    setIsActive(false);
    const label = getTemplateById(restoredThemeId)?.label || restoredThemeId;
    showFeedback(`↺ Restored to "${label}"`);
  };

  const previousTemplate = getTemplateById(previousTheme);

  // Variant: Header (compact top-bar controls for mobile & desktop)
  if (variant === 'header' || variant === 'compact') {
    return (
      <div className={`relative flex items-center gap-1 ${className}`}>
        {/* Generate / Active Liquid Glass Pill */}
        <button
          id="liquid-glass-generate-btn"
          type="button"
          onClick={handleGenerate}
          title="Click 'Generate' to transform the complete application interface into the vibrant Liquid Glass UI Kit"
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold transition-all duration-200 cursor-pointer select-none active:scale-95 ${
            isActive
              ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.55)] border border-white/60 ring-1 ring-cyan-400/40'
              : 'bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-fuchsia-500/20 text-cyan-300 hover:text-white border border-cyan-400/40 hover:border-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.15)] hover:shadow-[0_0_16px_rgba(0,240,255,0.3)]'
          }`}
        >
          <Sparkles className={`w-3 h-3 ${isActive ? 'text-slate-950 animate-spin' : 'text-cyan-400'}`} />
          <span>{isActive ? 'LIQUID GLASS' : 'GENERATE'}</span>
          {isActive && (
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-950 shadow-xs" />
          )}
        </button>

        {/* Restore Previous Theme Button */}
        <button
          id="liquid-glass-restore-btn"
          type="button"
          onClick={handleRestore}
          title={`Click 'Restore' to revert back to your previous theme (${previousTemplate?.label || 'Midnight'})`}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono-code text-slate-300 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-xs"
        >
          <RotateCcw className="w-2.5 h-2.5 text-slate-400 group-hover:text-cyan-400" />
          <span className="hidden md:inline">RESTORE</span>
          <span className="md:hidden">RST</span>
        </button>

        {/* Transient feedback toast */}
        {feedback && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-950/95 border border-cyan-400/60 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(0,240,255,0.3)] text-[11px] font-medium text-cyan-200 whitespace-nowrap z-[300] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            {feedback}
          </div>
        )}
      </div>
    );
  }

  // Variant: Card (Showcase for Appearance Studio with interactive preview chips)
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 border border-cyan-400/35 bg-gradient-to-br from-[#0c152a]/90 via-[#0a0f22]/90 to-[#18112c]/90 shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(0,240,255,0.12)] backdrop-blur-xl ${className}`}
    >
      {/* Top specular edge refraction reflection */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Branding & Overview */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-400 to-fuchsia-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Sparkles className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Liquid Glass UI Kit Flagship Interface
                {isActive && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 font-mono-code font-semibold">
                    CURRENTLY ACTIVE
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">
                Luminous translucent glass cards, neon cyan & magenta glow grading, specular edge reflections, and tactile pill controls.
              </p>
            </div>
          </div>

          {/* Mini preview chips matching the uploaded design */}
          <div className="flex items-center gap-2 pt-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-950 bg-gradient-to-r from-[#00f5ff] to-[#00b4d8] shadow-[0_0_12px_rgba(0,240,255,0.4)] border border-white/50">
              Primary Pill
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium text-fuchsia-200 bg-[#20183b]/80 border border-fuchsia-500/50 shadow-[0_0_10px_rgba(217,70,239,0.3)]">
              Secondary Pill
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-sky-400 via-purple-500 to-rose-500 shadow-[0_0_12px_rgba(217,70,239,0.35)] border border-white/40">
              Upgrade Plan
            </span>
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 via-violet-500 to-fuchsia-500 p-[2px] shadow-[0_0_10px_rgba(0,240,255,0.4)]">
              <div className="w-full h-full rounded-full bg-slate-950" />
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono-code text-xs font-bold bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400 hover:from-cyan-300 hover:to-fuchsia-300 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.45)] border border-white/60 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>GENERATE THEME</span>
          </button>

          <button
            type="button"
            onClick={handleRestore}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono-code text-xs font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-500 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>RESTORE ({previousTemplate?.label || 'Midnight'})</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="mt-3 px-3 py-2 rounded-xl bg-cyan-950/80 border border-cyan-400/50 text-xs text-cyan-200 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
