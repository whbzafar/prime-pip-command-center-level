/**
 * Design Tokens & Semantic Scoring Helpers for Pro Fundamentals Module
 * Supports both dark (default) and light themes via CSS variables & token classes.
 */

import { BiasLabel } from '../types';

export type ProThemeMode = 'dark' | 'light';

export const PRO_TOKENS = {
  dark: {
    bg: '#070B14',
    bgCard: '#0D1424',
    bgCardElevated: '#131D33',
    bgInput: '#0A0F1D',
    border: '#1B2742',
    borderSubtle: '#152038',
    borderHover: '#2A3C64',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    accent: '#00E5FF',
    accentSubtle: 'rgba(0, 229, 255, 0.12)',
    accentBorder: 'rgba(0, 229, 255, 0.35)',
    bullish: '#10B981',
    bullishBg: 'rgba(16, 185, 129, 0.12)',
    bullishBorder: 'rgba(16, 185, 129, 0.35)',
    bearish: '#F43F5E',
    bearishBg: 'rgba(244, 63, 94, 0.12)',
    bearishBorder: 'rgba(244, 63, 94, 0.35)',
    neutral: '#F59E0B',
    neutralBg: 'rgba(245, 158, 11, 0.12)',
    neutralBorder: 'rgba(245, 158, 11, 0.35)',
    shadowCard: '0 8px 30px rgba(0, 0, 0, 0.45)',
  },
  light: {
    bg: '#F8FAFC',
    bgCard: '#FFFFFF',
    bgCardElevated: '#F1F5F9',
    bgInput: '#EDF2F7',
    border: '#E2E8F0',
    borderSubtle: '#CBD5E1',
    borderHover: '#94A3B8',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    accent: '#0284C7',
    accentSubtle: 'rgba(2, 132, 199, 0.12)',
    accentBorder: 'rgba(2, 132, 199, 0.35)',
    bullish: '#059669',
    bullishBg: 'rgba(5, 150, 105, 0.12)',
    bullishBorder: 'rgba(5, 150, 105, 0.35)',
    bearish: '#E11D48',
    bearishBg: 'rgba(225, 29, 72, 0.12)',
    bearishBorder: 'rgba(225, 29, 72, 0.35)',
    neutral: '#D97706',
    neutralBg: 'rgba(217, 119, 6, 0.12)',
    neutralBorder: 'rgba(217, 119, 6, 0.35)',
    shadowCard: '0 8px 24px rgba(15, 23, 42, 0.08)',
  },
};

/**
 * Convert score (-100..+100) to Bullish % (0..100%)
 * Formula required: Bullish % = (score + 100) / 2
 */
export function scoreToBullishPct(score: number): number {
  const clamped = Math.max(-100, Math.min(100, score));
  return Math.round(((clamped + 100) / 2) * 10) / 10;
}

/**
 * Thresholds on score -100..+100:
 * >= 60: Strong Bullish
 * 20 to 60: Bullish
 * -20 to 20: Neutral
 * -60 to -20: Bearish
 * <= -60: Strong Bearish
 */
export function scoreToBiasLabel(score: number): BiasLabel {
  if (score >= 60) return 'Strong Bullish';
  if (score > 20) return 'Bullish';
  if (score >= -20) return 'Neutral';
  if (score > -60) return 'Bearish';
  return 'Strong Bearish';
}

export function getSemanticStyle(
  labelOrScore: BiasLabel | number,
  mode: ProThemeMode | string = 'dark'
): {
  color: string;
  bg: string;
  border: string;
  label: BiasLabel;
  bullishPct: number;
} {
  const score = typeof labelOrScore === 'number' ? labelOrScore : 0;
  const label = typeof labelOrScore === 'string' ? labelOrScore : scoreToBiasLabel(score);
  const bullishPct = typeof labelOrScore === 'number' ? scoreToBullishPct(score) : 50;

  const resolvedMode: ProThemeMode = mode === 'light' ? 'light' : 'dark';
  const t = PRO_TOKENS[resolvedMode];

  switch (label) {
    case 'Strong Bullish':
    case 'Bullish':
      return {
        color: t.bullish,
        bg: t.bullishBg,
        border: t.bullishBorder,
        label,
        bullishPct,
      };
    case 'Strong Bearish':
    case 'Bearish':
      return {
        color: t.bearish,
        bg: t.bearishBg,
        border: t.bearishBorder,
        label,
        bullishPct,
      };
    case 'Neutral':
    default:
      return {
        color: t.neutral,
        bg: t.neutralBg,
        border: t.neutralBorder,
        label,
        bullishPct,
      };
  }
}
