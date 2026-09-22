/**
 * Liquid Glass Button & Mobile Footer Navigation Configuration Engine
 * Inspired by the hyper-glossy, translucent 3D liquid glass UI Kit showcase.
 * Provides custom color palettes, dynamic light sheen animations, caustic underglows,
 * and one-click reset to original styling.
 */

export type LiquidGlassPreset =
  | 'liquid-glass-obsidian'
  | 'liquid-glass-sunset'
  | 'liquid-glass-emerald'
  | 'liquid-glass-neon-cyber'
  | 'liquid-glass-ice'
  | 'classic';

export type LiquidGlassAnimation =
  | 'dynamic-sheen'
  | 'caustic-pulse'
  | 'dynamic-cascade'
  | 'none';

export type GlossIntensity = 'subtle' | 'vivid' | 'hyper-gloss';

export interface LiquidGlassConfig {
  enabled: boolean;
  preset: LiquidGlassPreset;
  primaryGlowColor: string;     // Primary caustic light refraction color
  secondaryGlowColor: string;   // Secondary rim/ambient highlight color
  glossIntensity: GlossIntensity;
  animation: LiquidGlassAnimation;
  applyToMobileFooter: boolean;
  applyToCategoryTabs: boolean;
  applyToModalCategories: boolean;
}

export const DEFAULT_LIQUID_GLASS_CONFIG: LiquidGlassConfig = {
  enabled: true,
  preset: 'liquid-glass-obsidian',
  primaryGlowColor: '#00f0ff',
  secondaryGlowColor: '#8b5cf6',
  glossIntensity: 'hyper-gloss',
  animation: 'dynamic-sheen',
  applyToMobileFooter: true,
  applyToCategoryTabs: true,
  applyToModalCategories: true,
};

export const ORIGINAL_CLASSIC_CONFIG: LiquidGlassConfig = {
  enabled: false,
  preset: 'classic',
  primaryGlowColor: '#38bdf8',
  secondaryGlowColor: '#64748b',
  glossIntensity: 'subtle',
  animation: 'none',
  applyToMobileFooter: false,
  applyToCategoryTabs: false,
  applyToModalCategories: false,
};

export const PRESET_CONFIGS: Record<LiquidGlassPreset, Partial<LiquidGlassConfig>> = {
  'liquid-glass-obsidian': {
    enabled: true,
    preset: 'liquid-glass-obsidian',
    primaryGlowColor: '#00f0ff',
    secondaryGlowColor: '#8b5cf6',
    glossIntensity: 'hyper-gloss',
    animation: 'dynamic-sheen',
  },
  'liquid-glass-sunset': {
    enabled: true,
    preset: 'liquid-glass-sunset',
    primaryGlowColor: '#f43f5e',
    secondaryGlowColor: '#f59e0b',
    glossIntensity: 'hyper-gloss',
    animation: 'dynamic-sheen',
  },
  'liquid-glass-emerald': {
    enabled: true,
    preset: 'liquid-glass-emerald',
    primaryGlowColor: '#10b981',
    secondaryGlowColor: '#06b6d4',
    glossIntensity: 'vivid',
    animation: 'dynamic-sheen',
  },
  'liquid-glass-neon-cyber': {
    enabled: true,
    preset: 'liquid-glass-neon-cyber',
    primaryGlowColor: '#d946ef',
    secondaryGlowColor: '#00f0ff',
    glossIntensity: 'hyper-gloss',
    animation: 'caustic-pulse',
  },
  'liquid-glass-ice': {
    enabled: true,
    preset: 'liquid-glass-ice',
    primaryGlowColor: '#e0f2fe',
    secondaryGlowColor: '#93c5fd',
    glossIntensity: 'vivid',
    animation: 'dynamic-sheen',
  },
  'classic': {
    enabled: false,
    preset: 'classic',
    primaryGlowColor: '#38bdf8',
    secondaryGlowColor: '#64748b',
    glossIntensity: 'subtle',
    animation: 'none',
  },
};

const STORAGE_KEY = 'primepipfx_liquid_glass_config';

/**
 * Read stored Liquid Glass configuration with graceful fallback
 */
export function getLiquidGlassConfig(): LiquidGlassConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LIQUID_GLASS_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_LIQUID_GLASS_CONFIG,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_LIQUID_GLASS_CONFIG };
  }
}

/**
 * Apply configuration into CSS variables on :root and dispatch synchronization event
 */
export function applyLiquidGlassConfig(config: LiquidGlassConfig): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (!config.enabled || config.preset === 'classic') {
    root.dataset.liquidGlassButtons = 'false';
    root.style.removeProperty('--lgb-primary-glow');
    root.style.removeProperty('--lgb-secondary-glow');
    root.style.removeProperty('--lgb-specular-opacity');
    root.style.removeProperty('--lgb-caustic-blur');
    root.style.removeProperty('--lgb-animation-mode');
  } else {
    root.dataset.liquidGlassButtons = 'true';
    root.dataset.liquidGlassPreset = config.preset;

    // Specular highlight opacity by gloss intensity
    const specularOpacity =
      config.glossIntensity === 'hyper-gloss'
        ? '0.85'
        : config.glossIntensity === 'vivid'
        ? '0.65'
        : '0.40';

    const causticSpread =
      config.glossIntensity === 'hyper-gloss'
        ? '26px'
        : config.glossIntensity === 'vivid'
        ? '18px'
        : '10px';

    root.style.setProperty('--lgb-primary-glow', config.primaryGlowColor);
    root.style.setProperty('--lgb-secondary-glow', config.secondaryGlowColor);
    root.style.setProperty('--lgb-specular-opacity', specularOpacity);
    root.style.setProperty('--lgb-caustic-spread', causticSpread);
    root.style.setProperty('--lgb-animation-mode', config.animation);
  }

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to persist liquid glass config:', err);
  }

  // Emit event for real-time reactive re-renders across components
  window.dispatchEvent(
    new CustomEvent('primepipfx_button_style_changed', { detail: config })
  );
}

/**
 * Reset button styling back to the original interface style
 */
export function resetLiquidGlassConfig(): LiquidGlassConfig {
  const original = { ...ORIGINAL_CLASSIC_CONFIG };
  applyLiquidGlassConfig(original);
  return original;
}

/**
 * Reset to the default Liquid Glass showcase style from the photo
 */
export function restoreDefaultLiquidGlass(): LiquidGlassConfig {
  const defaults = { ...DEFAULT_LIQUID_GLASS_CONFIG };
  applyLiquidGlassConfig(defaults);
  return defaults;
}
