export interface InterfaceTemplate {
  id: string;
  label: string;
  category: 'GLASS' | 'BRIGHT' | 'GOOGLE' | 'FINANCIAL' | 'CYBER' | 'TACTICAL' | 'MINIMAL' | 'VIBRANT' | 'CUSTOM';
  description: string;
  accent: string;
  accentSecondary: string;
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  ink: string;
  inkMuted: string;
  badge?: string;
  isGlass?: boolean;
  isBright?: boolean;
  glassStyle?: 'PRISMATIC_LIGHT' | 'NEON_DARK';
  glowColor?: string;
  isCustom?: boolean;
}

export const INTERFACE_TEMPLATES: InterfaceTemplate[] = [
  // ── BRAND NEW: LIQUID GLASS (REF: IMAGE 1) ──────────────────────────
  {
    id: 'liquid-glass',
    label: 'Liquid Glass',
    category: 'GLASS',
    badge: 'NEW • LIQUID GLASS',
    description: 'Luminous liquid glass with pastel rainbow refraction, specular edge highlights, and high-visibility contrast.',
    accent: '#06b6d4',
    accentSecondary: '#8b5cf6',
    bg: '#eef2f6',
    surface: 'rgba(255, 255, 255, 0.72)',
    elevated: 'rgba(255, 255, 255, 0.90)',
    border: 'rgba(203, 213, 225, 0.85)',
    ink: '#0f172a',
    inkMuted: '#334155',
    isGlass: true,
    isBright: true,
    glassStyle: 'PRISMATIC_LIGHT',
    glowColor: 'rgba(6, 182, 212, 0.3)',
  },
  // ── BRAND NEW: LIQUID GLASS NEON (REF: IMAGE 2) ─────────────────────
  {
    id: 'liquid-glass-neon',
    label: 'Liquid Glass Neon',
    category: 'GLASS',
    badge: 'NEW • LIQUID GLASS NEON',
    description: 'Dark futuristic onyx glass with glowing cyan & magenta neon illumination, specular reflections, and nocturnal depth.',
    accent: '#00f0ff',
    accentSecondary: '#d946ef',
    bg: '#070a13',
    surface: 'rgba(13, 19, 36, 0.74)',
    elevated: 'rgba(23, 34, 58, 0.85)',
    border: 'rgba(56, 189, 248, 0.35)',
    ink: '#f8fafc',
    inkMuted: '#94a3b8',
    isGlass: true,
    isBright: false,
    glassStyle: 'NEON_DARK',
    glowColor: 'rgba(0, 240, 255, 0.4)',
  },
  // ── FROSTED OPAL GLASS ──────────────────────────────────────────────
  {
    id: 'frosted-opal',
    label: 'Frosted Opal Glass',
    category: 'GLASS',
    badge: 'PEARLESCENT GLASS',
    description: 'Frosted pearlescent glass with iridescent reflections, crisp contrast, and translucent light elegance.',
    accent: '#8b5cf6',
    accentSecondary: '#06b6d4',
    bg: '#f1f5f9',
    surface: 'rgba(255, 255, 255, 0.78)',
    elevated: 'rgba(255, 255, 255, 0.92)',
    border: 'rgba(226, 232, 240, 0.85)',
    ink: '#0f172a',
    inkMuted: '#334155',
    isGlass: true,
    isBright: true,
    glowColor: 'rgba(139, 92, 246, 0.3)',
  },
  // ── ARCTIC QUARTZ GLASS ─────────────────────────────────────────────
  {
    id: 'arctic-quartz',
    label: 'Arctic Quartz Glass',
    category: 'GLASS',
    badge: 'SUB-ZERO GLASS',
    description: 'Sub-zero crystal obsidian glass with glacial cyan edge highlights and nocturnal depth.',
    accent: '#38bdf8',
    accentSecondary: '#818cf8',
    bg: '#0a121e',
    surface: 'rgba(16, 28, 48, 0.75)',
    elevated: 'rgba(24, 42, 70, 0.85)',
    border: 'rgba(56, 189, 248, 0.38)',
    ink: '#f0f9ff',
    inkMuted: '#94a3b8',
    isGlass: true,
    isBright: false,
    glowColor: 'rgba(56, 189, 248, 0.35)',
  },
  // ── ROSE QUARTZ GLASS ───────────────────────────────────────────────
  {
    id: 'rose-quartz-glass',
    label: 'Rose Quartz Glass',
    category: 'GLASS',
    badge: 'FROSTED BLUSH',
    description: 'Translucent blush quartz glass with ruby accents and soft ambient illumination.',
    accent: '#f43f5e',
    accentSecondary: '#fb7185',
    bg: '#fff5f7',
    surface: 'rgba(255, 255, 255, 0.80)',
    elevated: 'rgba(255, 255, 255, 0.94)',
    border: 'rgba(254, 205, 211, 0.85)',
    ink: '#1f1e24',
    inkMuted: '#4b5563',
    isGlass: true,
    isBright: true,
    glowColor: 'rgba(244, 63, 94, 0.25)',
  },
  // ── GOOGLE THEMES COLLECTION ────────────────────────────────────────
  {
    id: 'google-material-blue',
    label: 'Google Material You',
    category: 'GOOGLE',
    badge: 'GOOGLE OFFICIAL',
    description: 'Official Google Material Design 3 Blueberry palette with high-visibility tech cobalt.',
    accent: '#1a73e8',
    accentSecondary: '#4285f4',
    bg: '#0f141c',
    surface: '#171e2a',
    elevated: '#212a3a',
    border: '#2e3b52',
    ink: '#e8eaed',
    inkMuted: '#9aa0a6',
    glowColor: '#1a73e8',
  },
  {
    id: 'google-paper',
    label: 'Google Paper White',
    category: 'GOOGLE',
    badge: 'ULTRA BRIGHT',
    description: 'Ultra-bright Google Workspace paper canvas engineered for clear daylight readability with zero glare.',
    accent: '#1a73e8',
    accentSecondary: '#34a853',
    bg: '#ffffff',
    surface: '#f8f9fa',
    elevated: '#f1f3f4',
    border: '#dadce0',
    ink: '#202124',
    inkMuted: '#5f6368',
    isBright: true,
    glowColor: '#1a73e8',
  },
  {
    id: 'google-coral',
    label: 'Google Coral Energy',
    category: 'GOOGLE',
    badge: 'GOOGLE VIBRANT',
    description: 'High-energy Google coral red with solar gold highlights on a bright daylight canvas.',
    accent: '#ea4335',
    accentSecondary: '#fbbc04',
    bg: '#fff8f6',
    surface: '#ffffff',
    elevated: '#feebe6',
    border: '#fcdad3',
    ink: '#202124',
    inkMuted: '#5f6368',
    isBright: true,
    glowColor: '#ea4335',
  },
  {
    id: 'google-emerald',
    label: 'Google Emerald Tech',
    category: 'GOOGLE',
    badge: 'GOOGLE AI',
    description: 'Google AI Green palette with vibrant emerald accents and deep pine depth.',
    accent: '#34a853',
    accentSecondary: '#1a73e8',
    bg: '#0d1f18',
    surface: '#142921',
    elevated: '#1c382e',
    border: '#285344',
    ink: '#e8f5e9',
    inkMuted: '#a3d9a5',
    glowColor: '#34a853',
  },
  {
    id: 'google-slate',
    label: 'Google Deep Slate',
    category: 'GOOGLE',
    badge: 'GOOGLE CLOUD',
    description: 'Dark Google Developer console aesthetic with periwinkle and soft amethyst accents.',
    accent: '#8ab4f8',
    accentSecondary: '#c58af9',
    bg: '#12151c',
    surface: '#1b202c',
    elevated: '#252b3b',
    border: '#353e54',
    ink: '#e3e3e3',
    inkMuted: '#9aa0a6',
    glowColor: '#8ab4f8',
  },
  {
    id: 'google-amber',
    label: 'Google Amber Sunshine',
    category: 'GOOGLE',
    badge: 'GOOGLE WARM',
    description: 'Warm Google golden sunshine with crisp charcoal contrast and amber badges.',
    accent: '#fbbc04',
    accentSecondary: '#ea4335',
    bg: '#fffdf5',
    surface: '#ffffff',
    elevated: '#fff8e1',
    border: '#ffe082',
    ink: '#202124',
    inkMuted: '#5f6368',
    isBright: true,
    glowColor: '#fbbc04',
  },
  // ── BRIGHT MODE OPTIONS (SOLVING "TOO DARK") ────────────────────────
  {
    id: 'daylight',
    label: 'Solar Daylight (Bright Mode)',
    category: 'BRIGHT',
    badge: 'HIGH VISIBILITY',
    description: 'Ultra-crisp high contrast bright daylight palette designed for bright rooms and zero eye strain.',
    accent: '#0284c7',
    accentSecondary: '#0d9488',
    bg: '#f8fafc',
    surface: '#ffffff',
    elevated: '#f1f5f9',
    border: '#cbd5e1',
    ink: '#0f172a',
    inkMuted: '#334155',
    isBright: true,
  },
  {
    id: 'swiss-light',
    label: 'Swiss Precision Light',
    category: 'BRIGHT',
    badge: 'HIGH CONTRAST',
    description: 'Ultra-clean Swiss editorial light mode with high-contrast typography, scarlet red accent, and pure clarity.',
    accent: '#dc2626',
    accentSecondary: '#0284c7',
    bg: '#f4f4f6',
    surface: '#ffffff',
    elevated: '#eaecef',
    border: '#d1d5db',
    ink: '#111827',
    inkMuted: '#374151',
    isBright: true,
  },
  {
    id: 'nordic-light',
    label: 'Nordic Glacier Light',
    category: 'BRIGHT',
    badge: 'ARCTIC FRESH',
    description: 'Arctic fresh daylight palette with crisp icy blue highlights and deep maritime text contrast.',
    accent: '#0284c7',
    accentSecondary: '#06b6d4',
    bg: '#f0f7fa',
    surface: '#ffffff',
    elevated: '#e1eff5',
    border: '#bcdbe8',
    ink: '#0f2937',
    inkMuted: '#334e68',
    isBright: true,
  },
  {
    id: 'tokyo-sakura-light',
    label: 'Tokyo Sakura Bright',
    category: 'BRIGHT',
    badge: 'WARM IVORY',
    description: 'Warm ivory daylight canvas with delicate cherry blossom magenta accents and soft warmth.',
    accent: '#db2777',
    accentSecondary: '#f43f5e',
    bg: '#fffbfa',
    surface: '#ffffff',
    elevated: '#fdf2f4',
    border: '#fbcfe8',
    ink: '#1f1e24',
    inkMuted: '#4b5563',
    isBright: true,
  },
  {
    id: 'cyber-mint-light',
    label: 'Cyber Mint Daylight',
    category: 'BRIGHT',
    badge: 'MINT CLEAN',
    description: 'Crisp botanical mint daylight mode with high-contrast forest ink and emerald energy.',
    accent: '#059669',
    accentSecondary: '#0284c7',
    bg: '#f0fdf9',
    surface: '#ffffff',
    elevated: '#e6f9f3',
    border: '#bbf7d0',
    ink: '#064e3b',
    inkMuted: '#065f46',
    isBright: true,
  },
  {
    id: 'gold-prestige',
    label: 'Gold Bullion Reserve',
    category: 'FINANCIAL',
    badge: 'VIP LUXURY',
    description: 'Ultra-luxurious dark titanium with polished bullion gold and high-net-worth institutional sheen.',
    accent: '#fbbf24',
    accentSecondary: '#f59e0b',
    bg: '#0a0907',
    surface: '#14120e',
    elevated: '#1f1c16',
    border: '#3d3728',
    ink: '#fffbeb',
    inkMuted: '#d4af37',
  },
  // ── ALL 20 EXISTING THEMES (100% PRESERVED) ──────────────────────────
  {
    id: 'midnight',
    label: 'Midnight Command',
    category: 'CYBER',
    description: 'Classic institutional deep cyber navy with electric cyan highlights and pro contrast.',
    accent: '#00f0ff',
    accentSecondary: '#38bdf8',
    bg: '#080d1a',
    surface: '#0e1628',
    elevated: '#152238',
    border: '#1e3052',
    ink: '#f8fafc',
    inkMuted: '#cbd5e1',
  },
  {
    id: 'bloomberg',
    label: 'Bloomberg Terminal',
    category: 'FINANCIAL',
    description: 'High-contrast Wall Street amber and orange terminal on deep onyx.',
    accent: '#F59E0B',
    accentSecondary: '#FB923C',
    bg: '#080808',
    surface: '#121212',
    elevated: '#1C1C1C',
    border: '#2E2E2E',
    ink: '#F3F4F6',
    inkMuted: '#9CA3AF',
  },
  {
    id: 'forest',
    label: 'Forest Citadel',
    category: 'TACTICAL',
    description: 'Deep pine tactical dark with crisp institutional emerald green.',
    accent: '#10B981',
    accentSecondary: '#34D399',
    bg: '#05110E',
    surface: '#0A1C18',
    elevated: '#102A24',
    border: '#153E35',
    ink: '#F0FDF4',
    inkMuted: '#86EFAC',
  },
  {
    id: 'violet',
    label: 'Violet Focus',
    category: 'CYBER',
    description: 'Nocturnal deep amethyst dark with vibrant lavender neon.',
    accent: '#A855F7',
    accentSecondary: '#C084FC',
    bg: '#0D0A18',
    surface: '#151126',
    elevated: '#1F1938',
    border: '#33275A',
    ink: '#FAF5FF',
    inkMuted: '#D8B4FE',
  },
  {
    id: 'sand',
    label: 'Warm Sandstone',
    category: 'MINIMAL',
    description: 'Desert tactical warm charcoal paired with rich golden amber.',
    accent: '#F59E0B',
    accentSecondary: '#FBBF24',
    bg: '#120F0C',
    surface: '#1C1713',
    elevated: '#28211B',
    border: '#3D3229',
    ink: '#FEF3C7',
    inkMuted: '#D97706',
  },
  {
    id: 'tokyo',
    label: 'Tokyo Neon Cyber',
    category: 'CYBER',
    description: 'Futuristic Shinjuku night palette with neon magenta and cyan.',
    accent: '#EC4899',
    accentSecondary: '#06B6D4',
    bg: '#0B0914',
    surface: '#131024',
    elevated: '#1D1936',
    border: '#382E60',
    ink: '#FDF2F8',
    inkMuted: '#F472B6',
  },
  {
    id: 'obsidian',
    label: 'Obsidian Prestige',
    category: 'FINANCIAL',
    description: 'Ultra-luxurious matte obsidian with championship pure gold accents.',
    accent: '#EAB308',
    accentSecondary: '#CA8A04',
    bg: '#08090A',
    surface: '#101317',
    elevated: '#191D24',
    border: '#2C333F',
    ink: '#FEF08A',
    inkMuted: '#A1A1AA',
  },
  {
    id: 'matrix',
    label: 'Matrix Terminal',
    category: 'TACTICAL',
    description: 'High-frequency phosphor green terminal code monitor.',
    accent: '#22C55E',
    accentSecondary: '#4ADE80',
    bg: '#020D06',
    surface: '#06170B',
    elevated: '#0B2412',
    border: '#154120',
    ink: '#DCFCE7',
    inkMuted: '#86EFAC',
  },
  {
    id: 'dracula',
    label: 'Dracula Dark',
    category: 'CYBER',
    description: 'Iconic developer purple with vivid coral and soft pastel teal.',
    accent: '#BD93F9',
    accentSecondary: '#FF79C6',
    bg: '#181926',
    surface: '#212234',
    elevated: '#282A36',
    border: '#44475A',
    ink: '#F8F8F2',
    inkMuted: '#6272A4',
  },
  {
    id: 'nord',
    label: 'Nordic Glacier',
    category: 'MINIMAL',
    description: 'Arctic cold slate and frost blues engineered for zero eye fatigue.',
    accent: '#88C0D0',
    accentSecondary: '#81A1C1',
    bg: '#1A1D24',
    surface: '#242933',
    elevated: '#2E3440',
    border: '#434C5E',
    ink: '#ECEFF4',
    inkMuted: '#D8DEE9',
  },
  {
    id: 'monokai',
    label: 'Monokai Pro',
    category: 'CYBER',
    description: 'Classic code editor contrast with sun yellow, bright orange and mint.',
    accent: '#FFD866',
    accentSecondary: '#FC9867',
    bg: '#19181A',
    surface: '#221F22',
    elevated: '#2D2A2E',
    border: '#403E41',
    ink: '#FCFCFA',
    inkMuted: '#939293',
  },
  {
    id: 'carbon',
    label: 'Carbon Tactical',
    category: 'TACTICAL',
    description: 'Matte carbon fiber gunmetal with tactical high-contrast stark white.',
    accent: '#E2E8F0',
    accentSecondary: '#94A3B8',
    bg: '#0F1115',
    surface: '#171A21',
    elevated: '#212630',
    border: '#333B4B',
    ink: '#FFFFFF',
    inkMuted: '#94A3B8',
  },
  {
    id: 'solarized',
    label: 'Solarized Deep',
    category: 'FINANCIAL',
    description: 'Precision academic solarized dark with cyan and seafoam depths.',
    accent: '#2AA198',
    accentSecondary: '#268BD2',
    bg: '#001E26',
    surface: '#002B36',
    elevated: '#073642',
    border: '#1B4E5B',
    ink: '#93A1A1',
    inkMuted: '#657B83',
  },
  {
    id: 'rose',
    label: 'Rose Gold VIP',
    category: 'VIBRANT',
    description: 'High-end velvet noir paired with polished blush rose gold.',
    accent: '#FB7185',
    accentSecondary: '#F43F5E',
    bg: '#130A0E',
    surface: '#1D1117',
    elevated: '#2A1822',
    border: '#482537',
    ink: '#FFE4E6',
    inkMuted: '#FDA4AF',
  },
  {
    id: 'swiss',
    label: 'Swiss Minimalist',
    category: 'MINIMAL',
    description: 'Ultra-crisp international typographic clarity on pure neutral dark.',
    accent: '#F8FAFC',
    accentSecondary: '#CBD5E1',
    bg: '#0A0A0A',
    surface: '#141414',
    elevated: '#1F1F1F',
    border: '#333333',
    ink: '#FFFFFF',
    inkMuted: '#A3A3A3',
  },
  {
    id: 'ocean',
    label: 'Abyssal Ocean',
    category: 'TACTICAL',
    description: 'Maritime abyss navy with bio-luminescent aqua highlights.',
    accent: '#06B6D4',
    accentSecondary: '#0EA5E9',
    bg: '#040E17',
    surface: '#081827',
    elevated: '#0E2337',
    border: '#153857',
    ink: '#E0F2FE',
    inkMuted: '#7DD3FC',
  },
  {
    id: 'sunset',
    label: 'Sunset Horizon',
    category: 'VIBRANT',
    description: 'Warm dusk gradient aesthetic blending deep crimson with coral.',
    accent: '#F97316',
    accentSecondary: '#EF4444',
    bg: '#140A0C',
    surface: '#1F1014',
    elevated: '#2D171E',
    border: '#4B222E',
    ink: '#FFEDD5',
    inkMuted: '#FCA5A5',
  },
  {
    id: 'stealth',
    label: 'Stealth Ghost',
    category: 'MINIMAL',
    description: 'Subdued nighttime black-box terminal with muted monochrome details.',
    accent: '#A1A1AA',
    accentSecondary: '#71717A',
    bg: '#09090B',
    surface: '#121215',
    elevated: '#18181B',
    border: '#27272A',
    ink: '#FAFAFA',
    inkMuted: '#71717A',
  },
  {
    id: 'vapor',
    label: 'Vaporwave 80s',
    category: 'VIBRANT',
    description: 'Outrun retro-synth aesthetics with vivid cyan and electric violet.',
    accent: '#00F0FF',
    accentSecondary: '#FF007F',
    bg: '#0E0720',
    surface: '#180E34',
    elevated: '#24154E',
    border: '#46247F',
    ink: '#F5EEFF',
    inkMuted: '#D4B8FF',
  },
  {
    id: 'citadel',
    label: 'Citadel Quant',
    category: 'FINANCIAL',
    description: 'Proprietary algorithmic hedge fund styling with institutional royal cobalt.',
    accent: '#3B82F6',
    accentSecondary: '#60A5FA',
    bg: '#060B18',
    surface: '#0B132B',
    elevated: '#111C3D',
    border: '#1C2F65',
    ink: '#EFF6FF',
    inkMuted: '#93C5FD',
  },
  // ── THE MASTERPIECE COLLECTION (WORLD-CLASS THEMES) ───────────────
  {
    id: 'linear-obsidian',
    label: 'Linear Titanium Obsidian',
    category: 'TACTICAL',
    badge: 'FLAGSHIP • PRO',
    description: 'Signature Linear dark mode with ultra-deep pitch black (#08090a), laser-sharp micro-borders, and electric indigo highlights.',
    accent: '#5e6ad2',
    accentSecondary: '#828fff',
    bg: '#08090a',
    surface: '#111215',
    elevated: '#18191d',
    border: '#222326',
    ink: '#f7f8f8',
    inkMuted: '#8a8f98',
    glowColor: '#5e6ad2',
  },
  {
    id: 'vercel-pure',
    label: 'Vercel High-Contrast Pure',
    category: 'MINIMAL',
    badge: 'ARCHITECTURAL',
    description: 'True pitch black (#000000) minimalism with razor-sharp geometric borders and hyper-cyan neon accents.',
    accent: '#00dfd8',
    accentSecondary: '#0070f3',
    bg: '#000000',
    surface: '#0a0a0a',
    elevated: '#141414',
    border: '#262626',
    ink: '#ffffff',
    inkMuted: '#a1a1aa',
    glowColor: '#00dfd8',
  },
  {
    id: 'stripe-indigo',
    label: 'Stripe Financial Sapphire',
    category: 'FINANCIAL',
    badge: 'EXECUTIVE FINTECH',
    description: 'Iconic Stripe executive financial dashboard with deep royal sapphire (#0a0e27) and electric iris violet.',
    accent: '#635bff',
    accentSecondary: '#00d4ff',
    bg: '#0a0e27',
    surface: '#13193a',
    elevated: '#1e2652',
    border: '#2b3668',
    ink: '#f8fafc',
    inkMuted: '#94a3b8',
    glowColor: '#635bff',
  },
  {
    id: 'apple-cupertino',
    label: 'Apple Cupertino Daylight',
    category: 'BRIGHT',
    badge: 'RETINA LIGHT',
    description: 'Apple macOS retina design system with pristine white canvas, system card elevations, and vibrant SF blue.',
    accent: '#0071e3',
    accentSecondary: '#34c759',
    bg: '#ffffff',
    surface: '#f5f5f7',
    elevated: '#ffffff',
    border: '#d2d2d7',
    ink: '#1d1d1f',
    inkMuted: '#6e6e73',
    isBright: true,
    glowColor: '#0071e3',
  },
  {
    id: 'nordic-glacier-pro',
    label: 'Nordic Glacier Precision',
    category: 'BRIGHT',
    badge: 'HIGH-CONTRAST LIGHT',
    description: 'Pristine Scandinavian daylight canvas with crisp high-contrast cards, royal azure accents, and zero glare.',
    accent: '#0284c7',
    accentSecondary: '#0d9488',
    bg: '#f8fafc',
    surface: '#ffffff',
    elevated: '#f1f5f9',
    border: '#cbd5e1',
    ink: '#0f172a',
    inkMuted: '#334155',
    isBright: true,
    glowColor: '#0284c7',
  },
  {
    id: 'bloomberg-terminal-pro',
    label: 'Bloomberg Institutional Terminal',
    category: 'FINANCIAL',
    badge: 'WALL STREET',
    description: 'Wall Street institutional trading station with high-contrast amber bullion (#f59e0b) and market-depth navy (#030712).',
    accent: '#f59e0b',
    accentSecondary: '#38bdf8',
    bg: '#030712',
    surface: '#0b1120',
    elevated: '#111827',
    border: '#1f2937',
    ink: '#f9fafb',
    inkMuted: '#9ca3af',
    glowColor: '#f59e0b',
  },
  {
    id: 'tokyo-ghost',
    label: 'Tokyo Ghost Shinjuku',
    category: 'CYBER',
    badge: 'NEO-SHINJUKU',
    description: 'Nocturnal Neo-Tokyo cyber aesthetic with deep indigo canvas (#13141f), cherry blossom pink (#f7768e), and laser cyan.',
    accent: '#f7768e',
    accentSecondary: '#7dcfff',
    bg: '#13141f',
    surface: '#1a1b26',
    elevated: '#24283b',
    border: '#2f3549',
    ink: '#c0caf5',
    inkMuted: '#7a88cf',
    glowColor: '#f7768e',
  },
  {
    id: 'emerald-capital-pro',
    label: 'Emerald Hedge Fund Capital',
    category: 'FINANCIAL',
    badge: 'WEALTH DESK',
    description: 'Institutional wealth desk with deep alpine forest obsidian (#030f0a), mint emerald (#10b981), and 24K gold borders.',
    accent: '#10b981',
    accentSecondary: '#fbbf24',
    bg: '#030f0a',
    surface: '#061a12',
    elevated: '#0b281d',
    border: '#133829',
    ink: '#ecfdf5',
    inkMuted: '#6ee7b7',
    glowColor: '#10b981',
  },
  {
    id: 'cyberpunk-night',
    label: 'Cyberpunk 2077 Night City',
    category: 'CYBER',
    badge: 'NEON CHROME',
    description: 'Blinding cybernetic neon yellow (#fcee0a) and electric cyan on high-contrast matte carbon (#0d0d12).',
    accent: '#fcee0a',
    accentSecondary: '#00f0ff',
    bg: '#0d0d12',
    surface: '#15151c',
    elevated: '#1d1e27',
    border: '#2d2f3d',
    ink: '#ffffff',
    inkMuted: '#a6a8b6',
    glowColor: '#fcee0a',
  },
  {
    id: 'swiss-arch-light',
    label: 'Swiss Architectural Light',
    category: 'BRIGHT',
    badge: 'HELVETICA STYLE',
    description: 'International Typographic Style: warm white parchment (#fcfbf9), structural architectural borders, and Swiss international orange.',
    accent: '#ea580c',
    accentSecondary: '#2563eb',
    bg: '#fcfbf9',
    surface: '#ffffff',
    elevated: '#f5f4f0',
    border: '#292524',
    ink: '#0c0a09',
    inkMuted: '#44403c',
    isBright: true,
    glowColor: '#ea580c',
  },
  {
    id: 'monaco-gold-luxe',
    label: 'Monaco Grand Prix Gold',
    category: 'FINANCIAL',
    badge: 'YACHT CLUB',
    description: 'High-roller yacht club luxury with deep imperial sapphire (#040814), brushed bullion gold (#f59e0b), and platinum accents.',
    accent: '#f59e0b',
    accentSecondary: '#38bdf8',
    bg: '#040814',
    surface: '#0a1124',
    elevated: '#101c38',
    border: '#1d2c52',
    ink: '#f8fafc',
    inkMuted: '#94a3b8',
    glowColor: '#f59e0b',
  },
  {
    id: 'arc-neon',
    label: 'Arc Neon Dream',
    category: 'VIBRANT',
    badge: 'SURREAL VIOLET',
    description: 'Arc browser inspired surreal twilight with deep violet obsidian (#0d0e17), radiant sunset coral (#ff6b6b), and violet (#a855f7).',
    accent: '#ff6b6b',
    accentSecondary: '#a855f7',
    bg: '#0d0e17',
    surface: '#151624',
    elevated: '#1f2136',
    border: '#2c2e47',
    ink: '#f8fafc',
    inkMuted: '#a5a9c5',
    glowColor: '#ff6b6b',
  },
];

export const getTemplateById = (idOrTemplate: string | InterfaceTemplate): InterfaceTemplate => {
  if (typeof idOrTemplate === 'object' && idOrTemplate !== null && 'id' in idOrTemplate) {
    return idOrTemplate;
  }
  const id = typeof idOrTemplate === 'string' ? idOrTemplate : '';
  const found = INTERFACE_TEMPLATES.find((t) => t.id === id);
  if (found) return found;

  // Check stored custom themes from Google / Web search
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('primepipfx_custom_themes');
      if (raw) {
        const customs: InterfaceTemplate[] = JSON.parse(raw);
        const customMatch = customs.find((c) => c.id === id);
        if (customMatch) return customMatch;
      }
    } catch {}
  }

  return INTERFACE_TEMPLATES[0];
};

export const adjustColorLuminance = (
  hex: string,
  brightnessPercent: number,
  isBrightTheme = false
): string => {
  try {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return hex;
    const num = parseInt(clean, 16);
    let r = num >> 16;
    let g = (num >> 8) & 0x00ff;
    let b = num & 0x0000ff;

    const delta = (brightnessPercent - 100) / 100; // e.g. -0.4 to +0.6

    if (delta < 0) {
      // Dimming: scale RGB down smoothly towards black (stealth night)
      const factor = Math.max(0.25, 1 + delta * 0.85);
      r = Math.round(r * factor);
      g = Math.round(g * factor);
      b = Math.round(b * factor);
    } else if (delta > 0) {
      // Brightening:
      if (isBrightTheme) {
        // Bright themes: shift towards pure crisp white
        r = Math.min(255, Math.round(r + (255 - r) * delta * 0.7));
        g = Math.min(255, Math.round(g + (255 - g) * delta * 0.7));
        b = Math.min(255, Math.round(b + (255 - b) * delta * 0.7));
      } else {
        // Dark themes: smoothly illuminate the dark backgrounds and surfaces
        const lift = Math.round(delta * 65);
        r = Math.min(240, r + lift);
        g = Math.min(240, g + lift);
        b = Math.min(250, b + lift + 3);
      }
    }

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
};

export const boostHexBrightness = (hex: string, boostPercent: number): string => {
  return adjustColorLuminance(hex, 100 + boostPercent);
};

export const applyInterfaceTemplate = (templateOrId: string | InterfaceTemplate, brightness = 104): void => {
  if (typeof document === 'undefined') return;

  const template = getTemplateById(templateOrId);
  const root = document.documentElement;
  const isBright = Boolean(template.isBright);

  // Calculate safe, visible native brightness boost for background & surfaces
  const activeBg = template.bg.startsWith('#')
    ? adjustColorLuminance(template.bg, brightness, isBright)
    : template.bg;
  const activeSurface = template.surface.startsWith('#')
    ? adjustColorLuminance(template.surface, brightness + 2, isBright)
    : template.surface;
  const activeElevated = template.elevated.startsWith('#')
    ? adjustColorLuminance(template.elevated, brightness + 4, isBright)
    : template.elevated;
  const activeBorder = template.border.startsWith('#')
    ? adjustColorLuminance(template.border, brightness + 6, isBright)
    : template.border;
  const activeInk = isBright
    ? template.ink
    : brightness > 120
    ? '#ffffff'
    : template.ink;

  // 1. Instant theme switch via data-theme attribute (binds directly to index.css rules)
  root.dataset.theme = template.id;
  root.dataset.brightnessMode = isBright ? 'bright' : 'dark';

  // 2. Set active CSS variables directly on root element for dynamic brightness and custom styling
  root.style.setProperty('--prime-brightness', `${brightness}%`);
  root.style.setProperty('--prime-intensity', `${brightness / 100}`);
  root.style.setProperty('--bg', activeBg);
  root.style.setProperty('--bg-surface', activeSurface);
  root.style.setProperty('--bg-elevated', activeElevated);
  root.style.setProperty('--border-color', activeBorder);
  root.style.setProperty('--accent', template.accent);
  root.style.setProperty('--accent-secondary', template.accentSecondary);
  root.style.setProperty('--ink', activeInk);
  root.style.setProperty('--ink-muted', template.inkMuted);
  if (template.isGlass) {
    root.style.setProperty('--glass-blur', 'blur(16px) saturate(180%)');
    root.style.setProperty('--glass-blur-sm', 'blur(14px)');
  } else {
    root.style.setProperty('--glass-blur', 'none');
    root.style.setProperty('--glass-blur-sm', 'none');
  }

  // 3. Persist to localStorage for instantaneous restoration across page reloads
  try {
    localStorage.setItem('primepipfx_theme', template.id);
    localStorage.setItem('primepipfx_brightness', String(brightness));
    localStorage.setItem('primepipfx_is_bright', isBright ? 'true' : 'false');
    if (template.isCustom) {
      localStorage.setItem('primepipfx_active_custom_theme', JSON.stringify(template));
    }
  } catch {}

  // 4. Notify listeners of brightness or theme change
  try {
    window.dispatchEvent(
      new CustomEvent('primepipfx_brightness_changed', {
        detail: { brightness, themeId: template.id, isBright },
      })
    );
  } catch {}

  // 5. Safely clean up any legacy dynamic style tag to eliminate style-invalidation lag
  const legacyStyle = document.getElementById('prime-theme-dynamic-styles');
  if (legacyStyle) {
    legacyStyle.remove();
  }
};
