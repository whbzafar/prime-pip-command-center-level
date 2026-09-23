import { applyInterfaceTemplate, getTemplateById } from '../data/interfaceTemplates';
import {
  applyLiquidGlassConfig,
  resetLiquidGlassConfig,
  DEFAULT_LIQUID_GLASS_CONFIG,
} from './liquidGlassConfig';

export const RESTORE_THEME_STORAGE_KEY = 'primepipfx_restore_theme';
export const LIQUID_GLASS_THEME_ID = 'liquid-glass-ui-kit';

/**
 * Checks if the active application theme is currently the Liquid Glass UI Kit
 */
export function isLiquidGlassThemeActive(): boolean {
  if (typeof document === 'undefined') return false;
  const current = document.documentElement.dataset.theme;
  return current === LIQUID_GLASS_THEME_ID || current === 'liquid-glass-neon';
}

/**
 * Gets the previously saved theme to restore back to
 */
export function getStoredRestoreTheme(): string {
  try {
    const saved = localStorage.getItem(RESTORE_THEME_STORAGE_KEY);
    if (saved && saved !== LIQUID_GLASS_THEME_ID && saved !== 'liquid-glass-neon') {
      return saved;
    }
  } catch {}
  return 'midnight';
}

/**
 * Generates and immediately applies the complete Liquid Glass UI Kit theme
 * across the entire application interface (all 22 categories, buttons, cards, tabs, and modals).
 * Stores the previous theme so the user can click 'Restore' at any time.
 */
export function generateLiquidGlassTheme(): { themeId: string; previousThemeId: string } {
  if (typeof document === 'undefined') {
    return { themeId: LIQUID_GLASS_THEME_ID, previousThemeId: 'midnight' };
  }

  const currentTheme = document.documentElement.dataset.theme || 'midnight';
  let previousThemeId = currentTheme;

  // Only remember previous if it wasn't already liquid glass
  if (currentTheme !== LIQUID_GLASS_THEME_ID && currentTheme !== 'liquid-glass-neon') {
    try {
      localStorage.setItem(RESTORE_THEME_STORAGE_KEY, currentTheme);
      previousThemeId = currentTheme;
    } catch {}
  } else {
    previousThemeId = getStoredRestoreTheme();
  }

  // 1. Apply Flagship Liquid Glass UI Kit template
  applyInterfaceTemplate(LIQUID_GLASS_THEME_ID, 104);

  // 2. Enable hyper-gloss 3D liquid glass buttons & caustics
  applyLiquidGlassConfig(DEFAULT_LIQUID_GLASS_CONFIG);

  // 3. Dispatch global sync event
  window.dispatchEvent(
    new CustomEvent('primepipfx_theme_generated', {
      detail: {
        themeId: LIQUID_GLASS_THEME_ID,
        previousThemeId,
      },
    })
  );

  return { themeId: LIQUID_GLASS_THEME_ID, previousThemeId };
}

/**
 * Restores the application to the previous theme prior to generating Liquid Glass UI
 */
export function restorePreviousTheme(): { restoredThemeId: string } {
  if (typeof document === 'undefined') return { restoredThemeId: 'midnight' };

  const targetTheme = getStoredRestoreTheme();

  // 1. Apply the restored interface template
  applyInterfaceTemplate(targetTheme, 104);

  // 2. If restored theme is not glass, reset button caustics to match
  const tpl = getTemplateById(targetTheme);
  if (!tpl?.isGlass) {
    resetLiquidGlassConfig();
  }

  // 3. Dispatch global sync event
  window.dispatchEvent(
    new CustomEvent('primepipfx_theme_restored', {
      detail: {
        restoredThemeId: targetTheme,
      },
    })
  );

  return { restoredThemeId: targetTheme };
}
