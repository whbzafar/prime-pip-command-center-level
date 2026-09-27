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
  Palette,
} from 'lucide-react';
import { applyInterfaceTemplate, getTemplateById, applyInterfaceColorComposition } from '../data/interfaceTemplates';

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

const ACCENT_COLOR_PRESETS = [
  { name: 'Neon Cyan', color: '#00f0ff', desc: 'Tactical Cyber' },
  { name: 'Electric Sky', color: '#38bdf8', desc: 'SMC Blue' },
  { name: 'Emerald', color: '#10b981', desc: 'Institutional Profit' },
  { name: 'Amber Gold', color: '#f59e0b', desc: 'XAU Bullion' },
  { name: 'Violet Alpha', color: '#a855f7', desc: 'High Alpha' },
  { name: 'Crimson Edge', color: '#f43f5e', desc: 'Volatility Risk' },
];

const BUTTON_ANIMATIONS: Array<{ id: 'NONE' | 'PULSE' | 'GLOW' | 'SHIMMER' | 'BOUNCE'; label: string; desc: string }> = [
  { id: 'NONE', label: 'Solid Standard', desc: 'Clean static profile' },
  { id: 'PULSE', label: 'Breathing Pulse', desc: 'Soft rhythmic pulsing' },
  { id: 'GLOW', label: 'Neon Glow Wave', desc: 'Dynamic luminous aura' },
  { id: 'SHIMMER', label: 'Light Shimmer', desc: 'Continuous glossy sweep' },
  { id: 'BOUNCE', label: 'Tactile Lift', desc: 'Interactive hover spring' },
];

export const BrightnessController: React.FC<BrightnessControllerProps> = ({
  currentBrightness,
  onBrightnessChange,
  currentThemeId,
  onThemeChange,
  variant = 'inline',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'BRIGHTNESS' | 'COLOR_COMPOSITION'>('BRIGHTNESS');
  const [level, setLevel] = useState<number>(currentBrightness);
  const [saturation, setSaturation] = useState<number>(() => {
    try {
      const s = localStorage.getItem('primepipfx_saturation');
      return s ? Number(s) : 100;
    } catch {
      return 100;
    }
  });
  const [contrast, setContrast] = useState<number>(() => {
    try {
      const c = localStorage.getItem('primepipfx_contrast');
      return c ? Number(c) : 100;
    } catch {
      return 100;
    }
  });
  const [customAccent, setCustomAccent] = useState<string>(() => {
    try {
      return localStorage.getItem('primepipfx_custom_accent') || '#00f0ff';
    } catch {
      return '#00f0ff';
    }
  });
  const [customSecondary, setCustomSecondary] = useState<string>(() => {
    try {
      return localStorage.getItem('primepipfx_custom_accent_secondary') || '#38bdf8';
    } catch {
      return '#38bdf8';
    }
  });
  const [buttonAnimation, setButtonAnimation] = useState<'NONE' | 'PULSE' | 'GLOW' | 'SHIMMER' | 'BOUNCE'>(() => {
    try {
      return (localStorage.getItem('primepipfx_btn_anim') as any) || 'NONE';
    } catch {
      return 'NONE';
    }
  });
  const [testClickCount, setTestClickCount] = useState<number>(0);

  useEffect(() => {
    setLevel(currentBrightness);
  }, [currentBrightness]);

  const updateLevel = (newVal: number) => {
    const clamped = Math.min(160, Math.max(60, Math.round(newVal)));
    setLevel(clamped);
    onBrightnessChange(clamped);
    applyInterfaceTemplate(currentThemeId, clamped);
    applyInterfaceColorComposition({ brightness: clamped });
  };

  const handleDecrease = (step = 5) => {
    updateLevel(level - step);
  };

  const handleIncrease = (step = 5) => {
    updateLevel(level + step);
  };

  const handleSaturationChange = (val: number) => {
    setSaturation(val);
    applyInterfaceColorComposition({ saturation: val });
  };

  const handleContrastChange = (val: number) => {
    setContrast(val);
    applyInterfaceColorComposition({ contrast: val });
  };

  const handleAccentChange = (hex: string) => {
    setCustomAccent(hex);
    applyInterfaceColorComposition({ accent: hex });
  };

  const handleSecondaryChange = (hex: string) => {
    setCustomSecondary(hex);
    applyInterfaceColorComposition({ secondaryAccent: hex });
  };

  const handleAnimationChange = (anim: 'NONE' | 'PULSE' | 'GLOW' | 'SHIMMER' | 'BOUNCE') => {
    setButtonAnimation(anim);
    applyInterfaceColorComposition({ buttonAnimation: anim });
  };

  const handleResetComposition = () => {
    setSaturation(100);
    setContrast(100);
    setCustomAccent('#00f0ff');
    setCustomSecondary('#38bdf8');
    setButtonAnimation('NONE');
    applyInterfaceColorComposition({
      saturation: 100,
      contrast: 100,
      accent: '#00f0ff',
      secondaryAccent: '#38bdf8',
      buttonAnimation: 'NONE',
    });
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
      {/* Top Header with Mode Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30">
            {activeTab === 'BRIGHTNESS' ? <Sun className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-xs font-military font-bold tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>{activeTab === 'BRIGHTNESS' ? 'INTERFACE LUMINANCE' : 'COLOR COMPOSITION'}</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono-code">
              {activeTab === 'BRIGHTNESS' ? 'Surface & typography intensity' : 'Tone balance, saturation & button colors'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono-code">
            <button
              type="button"
              onClick={() => setActiveTab('BRIGHTNESS')}
              className={`px-2 py-0.5 rounded transition ${activeTab === 'BRIGHTNESS' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Luminance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('COLOR_COMPOSITION')}
              className={`px-2 py-0.5 rounded transition ${activeTab === 'COLOR_COMPOSITION' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Colors
            </button>
          </div>
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

      {activeTab === 'BRIGHTNESS' ? (
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
              <span className="text-slate-500">Live Viewport Intensity</span>
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
      ) : (
        /* COLOR COMPOSITION PANEL */
        <div className="py-4 space-y-4">
          {/* Saturation / Color Intensity Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <span className="text-slate-300 font-bold uppercase text-[11px]">Color Intensity (Saturation)</span>
              <span className="text-cyan-400 font-bold">{saturation}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              value={saturation}
              onChange={(e) => handleSaturationChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-950 border border-slate-700 accent-cyan-400"
            />
            <div className="flex justify-between text-[9px] font-mono-code text-slate-500">
              <span>Muted (50%)</span>
              <span>Default (100%)</span>
              <span>Ultra Vivid (200%)</span>
            </div>
          </div>

          {/* Contrast Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <span className="text-slate-300 font-bold uppercase text-[11px]">Dynamic Contrast</span>
              <span className="text-amber-400 font-bold">{contrast}%</span>
            </div>
            <input
              type="range"
              min="70"
              max="140"
              step="5"
              value={contrast}
              onChange={(e) => handleContrastChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-950 border border-slate-700 accent-amber-400"
            />
            <div className="flex justify-between text-[9px] font-mono-code text-slate-500">
              <span>Soft (70%)</span>
              <span>Balanced (100%)</span>
              <span>High Contrast (140%)</span>
            </div>
          </div>

          {/* Button & Accent Color Override */}
          <div className="space-y-3 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-code font-bold uppercase text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                Primary Button & Accent Color
              </span>
              <button
                type="button"
                onClick={handleResetComposition}
                className="text-[10px] font-mono-code text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset Defaults
              </button>
            </div>

            {/* Custom Primary Color Picker Input */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <label className="relative cursor-pointer flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-lg border-2 border-white/40 shadow-inner flex items-center justify-center shrink-0"
                  style={{ backgroundColor: customAccent }}
                />
                <input
                  type="color"
                  value={customAccent}
                  onChange={(e) => handleAccentChange(e.target.value)}
                  className="sr-only"
                  aria-label="Custom primary color"
                />
              </label>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-200">Custom Accent Picker</div>
                <div className="text-[9px] font-mono-code text-slate-400">Selected Hex: <span className="text-cyan-300">{customAccent.toUpperCase()}</span></div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono-code text-slate-300">
                Click color box
              </span>
            </div>

            {/* Quick Accent Presets */}
            <div className="grid grid-cols-3 gap-1.5">
              {ACCENT_COLOR_PRESETS.map((preset) => {
                const isSelected = customAccent.toLowerCase() === preset.color.toLowerCase();
                return (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => handleAccentChange(preset.color)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-400 shadow-sm shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: preset.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-200 truncate">{preset.name}</div>
                      <div className="text-[8px] font-mono-code text-slate-400 truncate">{preset.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Secondary Accent Color */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-mono-code font-bold uppercase text-slate-300">
                Secondary Accent / Glow Color
              </span>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <label className="relative cursor-pointer flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-lg border border-white/30 shadow-inner flex items-center justify-center shrink-0"
                    style={{ backgroundColor: customSecondary }}
                  />
                  <input
                    type="color"
                    value={customSecondary}
                    onChange={(e) => handleSecondaryChange(e.target.value)}
                    className="sr-only"
                    aria-label="Custom secondary color"
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-200">Secondary / Border Hue</div>
                  <div className="text-[9px] font-mono-code text-slate-400">{customSecondary.toUpperCase()}</div>
                </div>
              </div>
            </div>

            {/* Button Animation Styles */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-code font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Button Motion &amp; Animation
                </span>
                <span className="text-[9px] font-mono-code text-cyan-400 font-bold">
                  {buttonAnimation}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {BUTTON_ANIMATIONS.map((anim) => {
                  const isSelected = buttonAnimation === anim.id;
                  return (
                    <button
                      key={anim.id}
                      type="button"
                      onClick={() => handleAnimationChange(anim.id)}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400/10 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/30'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-bold truncate flex items-center justify-between">
                        <span>{anim.label}</span>
                        {isSelected && <Check className="w-2.5 h-2.5 text-amber-400" />}
                      </div>
                      <div className="text-[8px] font-mono-code text-slate-400 truncate mt-0.5">
                        {anim.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Interactive Button Preview Playground */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono-code uppercase font-bold text-slate-400">
                  Live Dynamic Preview Playground
                </span>
                <span className="text-[9px] font-mono-code text-emerald-400">Interactive</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setTestClickCount((c) => c + 1)}
                  style={{
                    backgroundColor: customAccent,
                    color: '#030712',
                    boxShadow: `0 0 16px ${customAccent}55`,
                  }}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer select-none active:scale-95 ${
                    buttonAnimation === 'PULSE'
                      ? 'animate-pulse'
                      : buttonAnimation === 'BOUNCE'
                      ? 'hover:scale-105'
                      : ''
                  }`}
                >
                  <span>⚡ Primary Button Preview ({testClickCount > 0 ? `Clicked ${testClickCount}x` : 'Test Click'})</span>
                </button>
                <div className="flex items-center gap-2 w-full justify-center text-[9px] font-mono-code text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: customAccent }} />
                  <span>Primary: {customAccent}</span>
                  <span className="text-slate-600">|</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: customSecondary }} />
                  <span>Secondary: {customSecondary}</span>
                  <span className="text-slate-600">|</span>
                  <span>Motion: {buttonAnimation}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
