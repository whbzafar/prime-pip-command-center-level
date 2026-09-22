import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RotateCcw,
  Check,
  Palette,
  Sliders,
  Play,
  Layers,
  Smartphone,
  Eye,
  Activity,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import {
  LiquidGlassConfig,
  LiquidGlassPreset,
  LiquidGlassAnimation,
  GlossIntensity,
  getLiquidGlassConfig,
  applyLiquidGlassConfig,
  resetLiquidGlassConfig,
  restoreDefaultLiquidGlass,
  PRESET_CONFIGS,
} from '../utils/liquidGlassConfig';

interface LiquidGlassControlsProps {
  onClose?: () => void;
}

const PRESET_OPTIONS: { id: LiquidGlassPreset; label: string; desc: string; sampleColor: string }[] = [
  {
    id: 'liquid-glass-obsidian',
    label: 'Obsidian Glass (Showcase "Start Project")',
    desc: 'Deep crystalline obsidian with electric cyan & violet caustic bloom',
    sampleColor: '#00f0ff',
  },
  {
    id: 'liquid-glass-sunset',
    label: 'Sunset Glow (Showcase "Secondary")',
    desc: 'Warm radiant magenta glass with golden solar underglow',
    sampleColor: '#f43f5e',
  },
  {
    id: 'liquid-glass-emerald',
    label: 'Emerald Mint (Showcase "Select")',
    desc: 'Luminous matrix emerald glass with teal refraction',
    sampleColor: '#10b981',
  },
  {
    id: 'liquid-glass-neon-cyber',
    label: 'Neon Cyberpunk',
    desc: 'Hyper-voltage ultraviolet glass with dual cyan-pink glow',
    sampleColor: '#d946ef',
  },
  {
    id: 'liquid-glass-ice',
    label: 'Arctic Ice (Showcase "Text Field")',
    desc: 'Frosted diamond ice with white-hot specular highlights',
    sampleColor: '#e0f2fe',
  },
  {
    id: 'classic',
    label: 'Original Interface Style (Classic)',
    desc: 'Clean, flat standard buttons without liquid glass caustics',
    sampleColor: '#475569',
  },
];

const COLOR_PALETTES = [
  { name: 'Cyan Caustic', color: '#00f0ff' },
  { name: 'Sunset Rose', color: '#f43f5e' },
  { name: 'Matrix Emerald', color: '#10b981' },
  { name: 'Solar Amber', color: '#f59e0b' },
  { name: 'Electric Violet', color: '#a855f7' },
  { name: 'Arctic Diamond', color: '#e0f2fe' },
  { name: 'Royal Sapphire', color: '#3b82f6' },
];

export const LiquidGlassControls: React.FC<LiquidGlassControlsProps> = () => {
  const [config, setConfig] = useState<LiquidGlassConfig>(() => getLiquidGlassConfig());
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const ce = e as CustomEvent<LiquidGlassConfig>;
      if (ce.detail) {
        setConfig(ce.detail);
      }
    };
    window.addEventListener('primepipfx_button_style_changed', handleSync);
    return () => window.removeEventListener('primepipfx_button_style_changed', handleSync);
  }, []);

  const updateConfig = (updates: Partial<LiquidGlassConfig>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    applyLiquidGlassConfig(next);
  };

  const handleSelectPreset = (preset: LiquidGlassPreset) => {
    const presetOverrides = PRESET_CONFIGS[preset] || {};
    const next = {
      ...config,
      ...presetOverrides,
      preset,
      enabled: preset !== 'classic',
    };
    setConfig(next as LiquidGlassConfig);
    applyLiquidGlassConfig(next as LiquidGlassConfig);
  };

  const handleResetToOriginal = () => {
    const original = resetLiquidGlassConfig();
    setConfig(original);
    setCopiedNotification('Reverted to original interface button style!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const handleRestoreLiquidGlass = () => {
    const defaults = restoreDefaultLiquidGlass();
    setConfig(defaults);
    setCopiedNotification('Restored 3D Liquid Glass Showcase style!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const isEnabled = config.enabled && config.preset !== 'classic';

  return (
    <div className="space-y-4">
      {/* Toast notification banner */}
      {copiedNotification && (
        <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-mono-code flex items-center justify-between animate-fade-in">
          <span>✓ {copiedNotification}</span>
        </div>
      )}

      {/* Live Interactive Button Showcase directly matching the photo */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-800 shadow-xl overflow-hidden relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">
              Live Liquid Glass Preview
            </span>
          </div>
          <span className="text-[10px] font-mono-code text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
            {config.preset.toUpperCase()}
          </span>
        </div>

        {/* The Live Interactive Pills rendered with real Liquid Glass styling */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-wrap items-center justify-center gap-3">
          {/* 1. Start Project Pill */}
          <div
            className={`px-4 py-2 rounded-full font-mono-code text-xs font-bold cursor-pointer transition-all ${
              isEnabled ? 'liquid-glass-pill liquid-glass-sheen' : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
            style={
              isEnabled
                ? ({
                    '--lgb-primary-glow': config.primaryGlowColor,
                    '--lgb-secondary-glow': config.secondaryGlowColor,
                  } as React.CSSProperties)
                : undefined
            }
          >
            Start project
          </div>

          {/* 2. Secondary Pill (Sunset Pink / Amber) */}
          <div
            className={`px-4 py-2 rounded-full font-mono-code text-xs font-bold cursor-pointer transition-all ${
              isEnabled ? 'liquid-glass-pill liquid-glass-sheen' : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
            style={
              isEnabled
                ? ({
                    '--lgb-primary-glow': config.secondaryGlowColor || '#f43f5e',
                    '--lgb-secondary-glow': config.primaryGlowColor,
                  } as React.CSSProperties)
                : undefined
            }
          >
            Secondary
          </div>

          {/* 3. Icon Button (Dashboard preview) */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono-code text-xs font-bold cursor-pointer transition-all ${
              isEnabled ? 'liquid-glass-pill liquid-glass-active' : 'bg-blue-600 text-white'
            }`}
            style={
              isEnabled
                ? ({
                    '--lgb-primary-glow': config.primaryGlowColor,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <Activity className="w-3.5 h-3.5 text-cyan-300" />
            <span>Dashboard</span>
          </div>

          {/* 4. Pre-Trade Plan Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono-code text-xs font-medium cursor-pointer transition-all ${
              isEnabled ? 'liquid-glass-pill' : 'bg-slate-800 text-slate-400'
            }`}
            style={
              isEnabled
                ? ({
                    '--lgb-primary-glow': config.primaryGlowColor,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Pre-Plan</span>
          </div>

          {/* 5. Center Action Button (Day Trade / Trade) */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold cursor-pointer transition-all ${
              isEnabled ? 'liquid-glass-pill liquid-glass-sheen' : 'bg-cyan-500 text-slate-950'
            }`}
            style={
              isEnabled
                ? ({
                    '--lgb-primary-glow': config.primaryGlowColor,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <Plus className="w-4 h-4 stroke-[3] text-cyan-300" />
          </div>

          {/* 6. Select [✓] Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono-code text-xs font-bold cursor-pointer transition-all ${
              isEnabled ? 'liquid-glass-pill' : 'bg-emerald-900/60 text-emerald-300'
            }`}
            style={
              isEnabled
                ? ({
                    '--lgb-primary-glow': '#10b981',
                  } as React.CSSProperties)
                : undefined
            }
          >
            <span>Select</span>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Preset Styles Grid */}
      <div>
        <label className="block text-xs font-bold text-slate-300 mb-2">
          Liquid Glass Style Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESET_OPTIONS.map((opt) => {
            const isSelected = config.preset === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectPreset(opt.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-400 text-slate-100 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full mt-0.5 shrink-0 shadow-xs border border-white/30"
                  style={{ backgroundColor: opt.sampleColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold leading-tight truncate">
                      {opt.label}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono-code mt-0.5 line-clamp-2">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Customization (Primary & Secondary Caustic Underglows) */}
      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Caustic Underglow & Refraction Color</span>
          </span>
          <span className="text-[10px] font-mono-code text-cyan-300 font-bold">
            {config.primaryGlowColor}
          </span>
        </div>

        {/* Swatches */}
        <div className="flex items-center gap-2 flex-wrap">
          {COLOR_PALETTES.map((p) => {
            const isMatch = config.primaryGlowColor.toLowerCase() === p.color.toLowerCase();
            return (
              <button
                key={p.color}
                type="button"
                onClick={() => updateConfig({ primaryGlowColor: p.color, enabled: true })}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-mono-code transition cursor-pointer ${
                  isMatch
                    ? 'border-cyan-400 bg-slate-800 text-white shadow-xs'
                    : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full border border-white/20"
                  style={{ backgroundColor: p.color }}
                />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Hex Inputs */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
          <div>
            <label className="text-[10px] font-mono-code text-slate-400 block mb-1">
              Primary Glow (Hex):
            </label>
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <input
                type="color"
                value={config.primaryGlowColor}
                onChange={(e) => updateConfig({ primaryGlowColor: e.target.value, enabled: true })}
                className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={config.primaryGlowColor}
                onChange={(e) => updateConfig({ primaryGlowColor: e.target.value, enabled: true })}
                className="w-full bg-transparent text-xs font-mono-code text-slate-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono-code text-slate-400 block mb-1">
              Secondary Rim (Hex):
            </label>
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <input
                type="color"
                value={config.secondaryGlowColor}
                onChange={(e) => updateConfig({ secondaryGlowColor: e.target.value, enabled: true })}
                className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={config.secondaryGlowColor}
                onChange={(e) => updateConfig({ secondaryGlowColor: e.target.value, enabled: true })}
                className="w-full bg-transparent text-xs font-mono-code text-slate-200 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Animations Settings */}
      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dynamic Liquid Glass Animations</span>
          </span>
          <span className="text-[10px] font-mono-code text-slate-400">
            Active: {config.animation.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {[
            { id: 'dynamic-sheen' as LiquidGlassAnimation, label: 'Dynamic Sheen', desc: 'Light sweep' },
            { id: 'caustic-pulse' as LiquidGlassAnimation, label: 'Caustic Pulse', desc: 'Breathing glow' },
            { id: 'dynamic-cascade' as LiquidGlassAnimation, label: 'Spring Cascade', desc: 'Fluid entry' },
            { id: 'none' as LiquidGlassAnimation, label: 'Static Glass', desc: 'No animation' },
          ].map((anim) => {
            const isSelected = config.animation === anim.id;
            return (
              <button
                key={anim.id}
                type="button"
                onClick={() => updateConfig({ animation: anim.id, enabled: true })}
                className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-medium">{anim.label}</div>
                <div className="text-[9px] font-mono-code text-slate-500">{anim.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gloss Intensity & Specular Highlights */}
      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Gloss & Specular Reflection Level</span>
          </span>
          <span className="text-[10px] font-mono-code text-purple-300 font-bold uppercase">
            {config.glossIntensity}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(['subtle', 'vivid', 'hyper-gloss'] as GlossIntensity[]).map((level) => {
            const isSelected = config.glossIntensity === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => updateConfig({ glossIntensity: level, enabled: true })}
                className={`py-1.5 px-2 rounded-lg border text-center text-xs font-mono-code transition cursor-pointer ${
                  isSelected
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {level === 'subtle' ? 'Subtle' : level === 'vivid' ? 'Vivid 3D' : 'Hyper-Gloss 3D'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Application Toggles (Mobile footer & Category tabs) */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-xs font-medium text-slate-200">
              Apply to Mobile Footer Navigation
            </span>
            <p className="text-[10px] text-slate-400 font-mono-code">
              Styles "Dashboard", "Pre-Plan", and "Day Trade" items
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => updateConfig({ applyToMobileFooter: !config.applyToMobileFooter })}
          className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            config.applyToMobileFooter ? 'bg-cyan-500' : 'bg-slate-700'
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
              config.applyToMobileFooter ? 'left-5' : 'left-1'
            }`}
          />
        </button>
      </div>

      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <div>
            <span className="text-xs font-medium text-slate-200">
              Apply to Category Navigation Tabs
            </span>
            <p className="text-[10px] text-slate-400 font-mono-code">
              Styles top category tabs & exploration cards
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => updateConfig({ applyToCategoryTabs: !config.applyToCategoryTabs })}
          className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            config.applyToCategoryTabs ? 'bg-purple-500' : 'bg-slate-700'
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
              config.applyToCategoryTabs ? 'left-5' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Action Buttons: Reset to Original Style & Restore Showcase */}
      <div className="flex items-center gap-2 pt-2">
        <button
          id="liquid-glass-reset-original-btn"
          type="button"
          onClick={handleResetToOriginal}
          className="flex-1 py-2 px-3 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-mono-code text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset to Original Style</span>
        </button>

        <button
          id="liquid-glass-restore-showcase-btn"
          type="button"
          onClick={handleRestoreLiquidGlass}
          className="flex-1 py-2 px-3 rounded-xl border border-cyan-400/50 hover:border-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-white font-mono-code text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-cyan-500/20"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Restore 3D Liquid Glass</span>
        </button>
      </div>
    </div>
  );
};
