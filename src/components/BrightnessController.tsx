import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Zap,
  Sliders,
  Check,
} from 'lucide-react';
import { applyInterfaceTemplate, getTemplateById } from '../data/interfaceTemplates';

interface BrightnessControllerProps {
  currentBrightness: number;
  onBrightnessChange: (newBrightness: number) => void;
  currentThemeId: string;
  onThemeChange?: (newThemeId: string) => void;
  variant?: 'popover' | 'inline';
  onClose?: () => void;
}

const PRESETS = [
  { level: 75, label: 'Dim Night', icon: Moon, desc: 'Stealth low-light' },
  { level: 90, label: 'Soft', icon: Moon, desc: 'Gentle on eyes' },
  { level: 104, label: 'Balanced', icon: Sliders, desc: 'Standard baseline' },
  { level: 125, label: 'Vivid', icon: Sun, desc: 'Crisp & clear' },
  { level: 150, label: 'Daylight Max', icon: Zap, desc: 'Maximum luminance' },
];

export const BrightnessController: React.FC<BrightnessControllerProps> = ({
  currentBrightness,
  onBrightnessChange,
  currentThemeId,
  onThemeChange,
  variant = 'inline',
  onClose,
}) => {
  const [level, setLevel] = useState<number>(currentBrightness);

  useEffect(() => {
    setLevel(currentBrightness);
  }, [currentBrightness]);

  const updateLevel = (newVal: number) => {
    const clamped = Math.min(160, Math.max(60, Math.round(newVal)));
    setLevel(clamped);
    onBrightnessChange(clamped);
    applyInterfaceTemplate(currentThemeId, clamped);
  };

  const handleDecrease = (step = 5) => {
    updateLevel(level - step);
  };

  const handleIncrease = (step = 5) => {
    updateLevel(level + step);
  };

  const currentTheme = getTemplateById(currentThemeId);
  const isBrightMode = Boolean(currentTheme?.isBright);

  const getStatusLabel = (val: number) => {
    if (val <= 75) return { text: 'STEALTH DIM', color: 'text-indigo-400', bg: 'bg-indigo-500/20' };
    if (val <= 95) return { text: 'COMFORT NIGHT', color: 'text-sky-400', bg: 'bg-sky-500/20' };
    if (val <= 110) return { text: 'BALANCED STANDARD', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (val <= 135) return { text: 'VIVID LUMINOUS', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    return { text: 'ULTRA DAYLIGHT MAX', color: 'text-rose-400', bg: 'bg-rose-500/20' };
  };

  const status = getStatusLabel(level);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        variant === 'popover'
          ? 'bg-slate-950/95 backdrop-blur-xl border-slate-700 shadow-2xl p-4 w-80 sm:w-96 text-slate-100 z-[150]'
          : 'bg-slate-900/80 border-slate-800 p-4 sm:p-5 w-full text-slate-100'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-military font-bold tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>INTERFACE LUMINANCE</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono-code">
              Dynamic surface & typography intensity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] font-mono-code font-bold px-2 py-0.5 rounded-full border ${status.color} ${status.bg} border-current/30`}
          >
            {status.text}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Intensity Meter & Increase / Decrease Controls */}
      <div className="py-4 space-y-3">
        {/* Big Numeric Level & Step Buttons */}
        <div className="flex items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          {/* Step Down (-) */}
          <button
            id="brightness-step-down-btn"
            type="button"
            onClick={() => handleDecrease(5)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 border border-slate-700 font-mono-code font-bold text-xs transition cursor-pointer shadow-sm hover:border-cyan-400/50"
            title="Decrease Brightness (-5%)"
          >
            <Minus className="w-4 h-4 text-cyan-400" />
            <span>-5%</span>
          </button>

          {/* Center Digital Display */}
          <div className="text-center min-w-[120px]">
            <div className="text-2xl sm:text-3xl font-mono-code font-extrabold text-cyan-300 tracking-tight flex items-center justify-center gap-1">
              <span>{level}</span>
              <span className="text-sm font-normal text-slate-400">%</span>
            </div>
            <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-widest">
              Luminance Level
            </span>
          </div>

          {/* Step Up (+) */}
          <button
            id="brightness-step-up-btn"
            type="button"
            onClick={() => handleIncrease(5)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 border border-slate-700 font-mono-code font-bold text-xs transition cursor-pointer shadow-sm hover:border-amber-400/50"
            title="Increase Brightness (+5%)"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+5%</span>
          </button>
        </div>

        {/* Visual Intensity Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400">
            <span className="flex items-center gap-1">
              <Moon className="w-3 h-3 text-indigo-400" />
              60% Dim
            </span>
            <span className="text-slate-500">Continuous Intensity</span>
            <span className="flex items-center gap-1 text-amber-300">
              160% Max
              <Sun className="w-3 h-3" />
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              id="brightness-intensity-slider"
              type="range"
              min="60"
              max="160"
              step="1"
              value={level}
              onChange={(e) => updateLevel(Number(e.target.value))}
              className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-slate-950 border border-slate-700 accent-amber-400 focus:outline-none"
              style={{
                background: `linear-gradient(90deg, #3b82f6 0%, #10b981 40%, #f59e0b 75%, #ef4444 100%)`,
              }}
            />
          </div>
        </div>

        {/* Presets Grid */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono-code uppercase text-slate-400">
              Quick Intensity Presets
            </span>
            <button
              type="button"
              onClick={() => updateLevel(104)}
              className="text-[10px] font-mono-code text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              title="Reset to 104% default"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset (104%)
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {PRESETS.map((p) => {
              const isActive = Math.abs(level - p.level) <= 3;
              const Icon = p.icon;
              return (
                <button
                  key={p.level}
                  type="button"
                  onClick={() => updateLevel(p.level)}
                  className={`py-1.5 px-1 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    isActive
                      ? 'bg-amber-400/20 text-amber-200 border-amber-400/50 shadow-sm ring-1 ring-amber-400/30'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  title={`${p.label}: ${p.desc}`}
                >
                  <Icon className={`w-3 h-3 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="text-[10px] font-mono-code font-bold leading-none">
                    {p.level}%
                  </span>
                  <span className="text-[8px] text-slate-400 truncate w-full text-center">
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Daylight / Dark Mode Switcher */}
        {onThemeChange && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono-code text-slate-400">Mode:</span>
            <button
              type="button"
              onClick={() => {
                const next = isBrightMode ? 'linear-obsidian' : 'nordic-glacier';
                onThemeChange(next);
                applyInterfaceTemplate(next, level);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code font-bold text-slate-200 transition cursor-pointer hover:border-cyan-400/40"
            >
              {isBrightMode ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Switch to Dark Mode (Linear Titanium)</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Switch to Bright Mode (Nordic Daylight)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
