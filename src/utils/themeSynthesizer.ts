import { InterfaceTemplate } from '../data/interfaceTemplates';

// Storage key for custom / Google-fetched user themes
const CUSTOM_THEMES_STORAGE_KEY = 'primepipfx_custom_themes';

// Standard Google Brand & Material Design 3 Color Tokens
export interface GoogleColorPalette {
  name: string;
  source: 'GOOGLE_MATERIAL' | 'GOOGLE_WORKSPACE' | 'GOOGLE_EARTH' | 'SYNTHESIZED';
  primary: string;
  secondary: string;
  isBright: boolean;
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  ink: string;
  inkMuted: string;
  description: string;
}

export const GOOGLE_PRESET_PALETTES: GoogleColorPalette[] = [
  {
    name: 'Google Material You (Blueberry)',
    source: 'GOOGLE_MATERIAL',
    primary: '#1a73e8',
    secondary: '#4285f4',
    isBright: false,
    bg: '#0f141c',
    surface: '#171e2a',
    elevated: '#212a3a',
    border: '#2e3b52',
    ink: '#e8eaed',
    inkMuted: '#9aa0a6',
    description: 'Official Google Material You blueberry aesthetic with high-visibility tech cobalt.',
  },
  {
    name: 'Google Paper White (Daylight)',
    source: 'GOOGLE_WORKSPACE',
    primary: '#1a73e8',
    secondary: '#34a853',
    isBright: true,
    bg: '#ffffff',
    surface: '#f8f9fa',
    elevated: '#f1f3f4',
    border: '#dadce0',
    ink: '#202124',
    inkMuted: '#5f6368',
    description: 'Ultra-bright Google Workspace paper canvas engineered for clear daylight readability.',
  },
  {
    name: 'Google Coral Energy',
    source: 'GOOGLE_MATERIAL',
    primary: '#ea4335',
    secondary: '#fbbc04',
    isBright: true,
    bg: '#fff8f6',
    surface: '#ffffff',
    elevated: '#feebe6',
    border: '#fcdad3',
    ink: '#202124',
    inkMuted: '#5f6368',
    description: 'High-energy Google coral red with solar gold highlights on a bright daylight canvas.',
  },
  {
    name: 'Google Emerald Tech',
    source: 'GOOGLE_MATERIAL',
    primary: '#34a853',
    secondary: '#1a73e8',
    isBright: false,
    bg: '#0d1f18',
    surface: '#142921',
    elevated: '#1c382e',
    border: '#285344',
    ink: '#e8f5e9',
    inkMuted: '#a3d9a5',
    description: 'Google AI Green palette with vibrant emerald accents and deep pine depth.',
  },
  {
    name: 'Google Deep Slate',
    source: 'GOOGLE_WORKSPACE',
    primary: '#8ab4f8',
    secondary: '#c58af9',
    isBright: false,
    bg: '#12151c',
    surface: '#1b202c',
    elevated: '#252b3b',
    border: '#353e54',
    ink: '#e3e3e3',
    inkMuted: '#9aa0a6',
    description: 'Dark Google Developer console aesthetic with periwinkle and soft amethyst accents.',
  },
  {
    name: 'Google Amber Sunshine',
    source: 'GOOGLE_MATERIAL',
    primary: '#fbbc04',
    secondary: '#ea4335',
    isBright: true,
    bg: '#fffdf5',
    surface: '#ffffff',
    elevated: '#fff8e1',
    border: '#ffe082',
    ink: '#202124',
    inkMuted: '#5f6368',
    description: 'Warm Google golden sunshine with crisp charcoal contrast and amber badges.',
  },
];

// Helper to retrieve custom user themes from localStorage
export const getStoredCustomThemes = (): InterfaceTemplate[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Helper to persist a custom / Google-fetched theme
export const saveCustomTheme = (theme: InterfaceTemplate): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredCustomThemes();
    const filtered = current.filter((t) => t.id !== theme.id);
    const updated = [theme, ...filtered].slice(0, 20); // Keep up to 20 custom themes
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save custom theme', e);
  }
};

// Helper to remove a custom theme
export const deleteCustomTheme = (themeId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredCustomThemes();
    const updated = current.filter((t) => t.id !== themeId);
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete custom theme', e);
  }
};

// Algorithmic color synthesizer to turn any search term into a harmonized Material 3 palette
export const synthesizeThemeFromQuery = (query: string): InterfaceTemplate => {
  const clean = query.trim();
  const lower = clean.toLowerCase();

  // Detect if user is asking for bright or light themes
  const brightKeywords = [
    'light', 'bright', 'white', 'paper', 'day', 'cream', 'soft', 'morning',
    'sun', 'pastel', 'ivory', 'blossom', 'snow', 'pearl', 'clear', 'clean',
    'daylight', 'fresh', 'frost', 'sakura', 'minimal', 'solar',
  ];
  const isBright = brightKeywords.some((w) => lower.includes(w));

  // Detect if user mentions glass
  const isGlass = lower.includes('glass') || lower.includes('liquid') || lower.includes('crystal') || lower.includes('frosted');

  // Compute a deterministic hue from the query
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  }
  const baseHue = Math.abs(hash) % 360;

  // Keyword-specific color overrides for recognizable branded / organic tones
  let primaryAccent = '';
  let secondaryAccent = '';

  if (lower.includes('google')) {
    primaryAccent = '#1a73e8';
    secondaryAccent = '#34a853';
  } else if (lower.includes('coral') || lower.includes('red') || lower.includes('crimson') || lower.includes('ferrari')) {
    primaryAccent = '#ea4335';
    secondaryAccent = '#f97316';
  } else if (lower.includes('emerald') || lower.includes('mint') || lower.includes('green') || lower.includes('forest') || lower.includes('sage')) {
    primaryAccent = '#10b981';
    secondaryAccent = '#06b6d4';
  } else if (lower.includes('gold') || lower.includes('amber') || lower.includes('yellow') || lower.includes('honey')) {
    primaryAccent = '#f59e0b';
    secondaryAccent = '#fbbf24';
  } else if (lower.includes('purple') || lower.includes('violet') || lower.includes('lavender') || lower.includes('amethyst')) {
    primaryAccent = '#8b5cf6';
    secondaryAccent = '#ec4899';
  } else if (lower.includes('pink') || lower.includes('rose') || lower.includes('blush')) {
    primaryAccent = '#ec4899';
    secondaryAccent = '#f43f5e';
  } else if (lower.includes('cyan') || lower.includes('blue') || lower.includes('ocean') || lower.includes('sky') || lower.includes('azure')) {
    primaryAccent = '#0284c7';
    secondaryAccent = '#00f0ff';
  } else if (lower.includes('orange') || lower.includes('sunset') || lower.includes('peach')) {
    primaryAccent = '#f97316';
    secondaryAccent = '#ea580c';
  } else {
    // Generate harmonious HSL colors
    primaryAccent = `hsl(${baseHue}, 85%, 52%)`;
    secondaryAccent = `hsl(${(baseHue + 40) % 360}, 80%, 58%)`;
  }

  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `custom-${slug || 'theme'}-${Math.abs(hash).toString(36).slice(0, 4)}`;

  const label = clean.length > 28
    ? clean.slice(0, 26) + '...'
    : clean.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (isBright) {
    return {
      id,
      label: label.startsWith('Google') ? label : `Google • ${label}`,
      category: 'BRIGHT',
      badge: 'GOOGLE & WEB FETCHED',
      description: `Bright high-contrast palette generated for "${clean}" with daylight visibility and Google Material spacing.`,
      accent: primaryAccent,
      accentSecondary: secondaryAccent,
      bg: isGlass ? '#f0f4f9' : '#f8fafc',
      surface: isGlass ? 'rgba(255, 255, 255, 0.82)' : '#ffffff',
      elevated: isGlass ? 'rgba(255, 255, 255, 0.94)' : '#f1f5f9',
      border: isGlass ? 'rgba(203, 213, 225, 0.85)' : '#cbd5e1',
      ink: '#0f172a',
      inkMuted: '#334155',
      isBright: true,
      isGlass,
      isCustom: true,
      glowColor: primaryAccent,
    };
  }

  // Dark / Nocturnal Palette
  return {
    id,
    label: label.startsWith('Google') ? label : `Google • ${label}`,
    category: isGlass ? 'GLASS' : 'CYBER',
    badge: 'GOOGLE & WEB FETCHED',
    description: `Calibrated dark palette synthesized for "${clean}" with specular accents and ocular comfort.`,
    accent: primaryAccent,
    accentSecondary: secondaryAccent,
    bg: isGlass ? '#080d18' : '#080d1a',
    surface: isGlass ? 'rgba(14, 22, 40, 0.78)' : '#0e1628',
    elevated: isGlass ? 'rgba(21, 34, 58, 0.88)' : '#152238',
    border: isGlass ? 'rgba(56, 189, 248, 0.35)' : '#1e3052',
    ink: '#f8fafc',
    inkMuted: '#94a3b8',
    isBright: false,
    isGlass,
    isCustom: true,
    glowColor: primaryAccent,
  };
};
