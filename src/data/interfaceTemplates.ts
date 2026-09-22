export interface InterfaceTemplate {
  id: string;
  label: string;
  category: 'FINANCIAL' | 'CYBER' | 'TACTICAL' | 'MINIMAL' | 'VIBRANT' | 'GLASS';
  description: string;
  accent: string;
  accentSecondary: string;
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  ink: string;
  inkMuted: string;
  visualStyle?: 'standard' | 'liquid-glass' | 'frosted-glass';
  glassTint?: string;
}

export const INTERFACE_TEMPLATES: InterfaceTemplate[] = [
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
  {
    id: 'liquid-aurora', label: 'Liquid Aurora Glass', category: 'GLASS',
    description: 'Premium dark liquid glass with cyan, violet and rose refractions inspired by the supplied glass UI references.',
    accent: '#67E8F9', accentSecondary: '#F0ABFC', bg: '#050711', surface: '#0B1020', elevated: '#141A31', border: '#5B5CE2', ink: '#F8FAFC', inkMuted: '#CBD5E1',
    visualStyle: 'liquid-glass', glassTint: 'rgba(70, 80, 150, 0.24)',
  },
  {
    id: 'liquid-prism', label: 'Liquid Prism Pro', category: 'GLASS',
    description: 'Glossy black glass with electric blue, magenta and violet prism highlights for a high-end command-center feel.',
    accent: '#60A5FA', accentSecondary: '#F472B6', bg: '#03050B', surface: '#0A0E19', elevated: '#151426', border: '#6D5AE8', ink: '#FFFFFF', inkMuted: '#CBD5E1',
    visualStyle: 'liquid-glass', glassTint: 'rgba(55, 45, 115, 0.26)',
  },
  {
    id: 'frosted-arctic', label: 'Frosted Arctic Glass', category: 'GLASS',
    description: 'Bright translucent frosted glass with cool blue highlights, soft depth and clean premium controls.',
    accent: '#2563EB', accentSecondary: '#06B6D4', bg: '#DCE8F4', surface: '#EAF2F8', elevated: '#F7FAFC', border: '#A9C6DD', ink: '#0F172A', inkMuted: '#475569',
    visualStyle: 'frosted-glass', glassTint: 'rgba(255, 255, 255, 0.52)',
  },
  {
    id: 'neon-glass', label: 'Neon Glass Studio', category: 'GLASS',
    description: 'Ultra-modern translucent glass with cyan, blue and hot-pink luminous edges inspired by the UI kit showcase.',
    accent: '#22D3EE', accentSecondary: '#F472B6', bg: '#050816', surface: '#0B1224', elevated: '#121A34', border: '#3B82F6', ink: '#F8FAFC', inkMuted: '#CBD5E1',
    visualStyle: 'liquid-glass', glassTint: 'rgba(30, 55, 110, 0.28)',
  },
];

export const getTemplateById = (id: string): InterfaceTemplate => {
  return INTERFACE_TEMPLATES.find((t) => t.id === id) || INTERFACE_TEMPLATES[0];
};

export const boostHexBrightness = (hex: string, boostPercent: number): string => {
  try {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return hex;
    const num = parseInt(clean, 16);
    const boost = Math.round(255 * (boostPercent / 100));
    let r = (num >> 16) + boost;
    let g = ((num >> 8) & 0x00ff) + boost;
    let b = (num & 0x0000ff) + boost;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
};

export const applyInterfaceTemplate = (templateId: string, brightness = 104): void => {
  if (typeof document === 'undefined') return;

  const template = getTemplateById(templateId);
  const root = document.documentElement;

  // Calculate safe native brightness boost without breaking CSS position:fixed
  const boostPercent = Math.max(0, (brightness - 100) * 0.15);
  const activeBg = boostHexBrightness(template.bg, boostPercent);
  const activeSurface = boostHexBrightness(template.surface, boostPercent + 0.8);
  const activeElevated = boostHexBrightness(template.elevated, boostPercent + 1.5);
  const activeBorder = boostHexBrightness(template.border, boostPercent + 2);

  // Set standard data attributes and CSS variables
  root.dataset.theme = template.id;
  root.style.setProperty('--prime-brightness', `${brightness}%`);
  root.style.setProperty('--bg', activeBg);
  root.style.setProperty('--bg-surface', activeSurface);
  root.style.setProperty('--bg-elevated', activeElevated);
  root.style.setProperty('--accent', template.accent);
  root.style.setProperty('--accent-secondary', template.accentSecondary);
  root.style.setProperty('--ink', template.ink);
  root.style.setProperty('--ink-muted', template.inkMuted);
  root.style.setProperty('--border-color', activeBorder);

  // Store in localStorage
  try {
    localStorage.setItem('primepipfx_theme', template.id);
    localStorage.setItem('primepipfx_brightness', String(brightness));
  } catch {}

  // Inject or update live override stylesheet to guarantee 100% functional visual update across the whole app
  let styleEl = document.getElementById('prime-theme-dynamic-styles') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'prime-theme-dynamic-styles';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    html, body {
      background-color: ${activeBg} !important;
      color: ${template.ink} !important;
    }
    .bg-\\[\\#070A11\\], .bg-\\[\\#070a11\\], .bg-\\[\\#080C14\\], .bg-\\[\\#020617\\], .bg-slate-950, .bg-slate-950\\/90, .bg-slate-950\\/80, .bg-slate-950\\/60 {
      background-color: ${activeSurface} !important;
    }
    .bg-slate-900, .bg-slate-900\\/80, .bg-slate-900\\/90, .bg-\\[\\#0B0F19\\], .bg-\\[\\#090D15\\] {
      background-color: ${activeElevated} !important;
    }
    .border-slate-800, .border-slate-800\\/80, .border-slate-800\\/60, .border-slate-850 {
      border-color: ${activeBorder} !important;
    }
    .text-cyan-400, .text-cyan-300 {
      color: ${template.accent} !important;
    }

    /* Pro-level Liquid Glass / Frosted Glass visual system. */
    ${template.visualStyle === 'liquid-glass' ? `
    body, #root {
      background: radial-gradient(circle at 12% 8%, ${template.accent}22 0%, transparent 28%), radial-gradient(circle at 88% 18%, ${template.accentSecondary}1f 0%, transparent 30%), linear-gradient(135deg, ${activeBg} 0%, ${activeSurface} 52%, ${activeBg} 100%) !important;
      color: ${template.ink} !important;
    }
    button, input, select, textarea, .prime-card, .prime-card-elevated, .prime-glass-card, .prime-glass-surface, [class*="bg-slate-"], [class*="bg-["] {
      background-image: linear-gradient(135deg, rgba(255,255,255,0.105), rgba(255,255,255,0.025)) !important;
      background-color: ${template.glassTint || 'rgba(20,30,55,0.28)'} !important;
      backdrop-filter: blur(20px) saturate(165%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(165%) !important;
      border-color: ${template.accent}35 !important;
      box-shadow: 0 14px 38px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.20) !important;
    }
    button:hover { border-color: ${template.accent}88 !important; box-shadow: 0 12px 34px ${template.accent}22, inset 0 1px 0 rgba(255,255,255,0.28) !important; }
    input:focus, select:focus, textarea:focus { border-color: ${template.accent}bb !important; box-shadow: 0 0 0 2px ${template.accent}22, 0 12px 30px rgba(0,0,0,0.22) !important; }
    ` : template.visualStyle === 'frosted-glass' ? `
    body, #root {
      background: radial-gradient(circle at 15% 10%, ${template.accent}1a 0%, transparent 28%), radial-gradient(circle at 85% 80%, ${template.accentSecondary}18 0%, transparent 30%), linear-gradient(135deg, ${activeBg} 0%, ${activeSurface} 100%) !important;
      color: ${template.ink} !important;
    }
    button, input, select, textarea, .prime-card, .prime-card-elevated, .prime-glass-card, .prime-glass-surface, [class*="bg-slate-"], [class*="bg-["] {
      background-image: linear-gradient(145deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34)) !important;
      background-color: ${template.glassTint || 'rgba(255,255,255,0.52)'} !important;
      backdrop-filter: blur(24px) saturate(125%) !important;
      -webkit-backdrop-filter: blur(24px) saturate(125%) !important;
      border-color: ${template.accent}35 !important;
      color: ${template.ink} !important;
      box-shadow: 0 16px 40px rgba(51,65,85,0.16), inset 0 1px 0 rgba(255,255,255,0.85) !important;
    }
    button:hover { border-color: ${template.accent}80 !important; transform: translateY(-1px); }
    ` : ''}

    ${template.visualStyle ? `
    .prime-gradient-box::before { background: linear-gradient(var(--angle,135deg), ${template.accent}, ${template.accentSecondary}, #8B5CF6, ${template.accent}) !important; }
    ::selection { background: ${template.accent}55 !important; color: ${template.ink} !important; }
    ` : ''}
    .border-cyan-500, .border-cyan-400, .border-cyan-500\\/40, .border-cyan-500\\/30 {
      border-color: ${template.accent}66 !important;
    }
    .prime-card-elevated {
      background: ${activeSurface} !important;
      border-color: ${activeBorder} !important;
    }
    ::-webkit-scrollbar-thumb {
      background: ${activeBorder} !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: ${template.accent} !important;
    }
  `;
};
