export interface InterfaceTemplate {
  id: string;
  label: string;
  category: 'FINANCIAL' | 'CYBER' | 'TACTICAL' | 'MINIMAL' | 'VIBRANT';
  description: string;
  accent: string;
  accentSecondary: string;
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  ink: string;
  inkMuted: string;
}

export const INTERFACE_TEMPLATES: InterfaceTemplate[] = [
  {
    id: 'midnight',
    label: 'Midnight Command',
    category: 'CYBER',
    description: 'Classic institutional deep cyber navy with electric cyan highlights.',
    accent: '#38bdf8',
    accentSecondary: '#818cf8',
    bg: '#070A11',
    surface: '#0B111E',
    elevated: '#111B2E',
    border: '#1E293B',
    ink: '#F1F5F9',
    inkMuted: '#94A3B8',
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
];

export const getTemplateById = (id: string): InterfaceTemplate => {
  return INTERFACE_TEMPLATES.find((t) => t.id === id) || INTERFACE_TEMPLATES[0];
};

export const applyInterfaceTemplate = (templateId: string, brightness = 100): void => {
  if (typeof document === 'undefined') return;

  const template = getTemplateById(templateId);
  const root = document.documentElement;

  // Set standard data attribute
  root.dataset.theme = template.id;
  root.style.setProperty('--prime-brightness', `${brightness}%`);
  root.style.setProperty('--bg', template.bg);
  root.style.setProperty('--bg-surface', template.surface);
  root.style.setProperty('--bg-elevated', template.elevated);
  root.style.setProperty('--accent', template.accent);
  root.style.setProperty('--accent-secondary', template.accentSecondary);
  root.style.setProperty('--ink', template.ink);
  root.style.setProperty('--ink-muted', template.inkMuted);
  root.style.setProperty('--border-color', template.border);

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
      background-color: ${template.bg} !important;
      color: ${template.ink} !important;
    }
    .bg-\\[\\#070A11\\], .bg-\\[\\#070a11\\], .bg-slate-950, .bg-slate-950\\/90, .bg-slate-950\\/80, .bg-slate-950\\/60 {
      background-color: ${template.surface} !important;
    }
    .bg-slate-900, .bg-slate-900\\/80, .bg-slate-900\\/90 {
      background-color: ${template.elevated} !important;
    }
    .border-slate-800, .border-slate-800\\/80, .border-slate-800\\/60, .border-slate-850 {
      border-color: ${template.border} !important;
    }
    .text-cyan-400, .text-cyan-300 {
      color: ${template.accent} !important;
    }
    .border-cyan-500, .border-cyan-400, .border-cyan-500\\/40, .border-cyan-500\\/30 {
      border-color: ${template.accent}66 !important;
    }
    .prime-card-elevated {
      background: ${template.surface} !important;
      border-color: ${template.border} !important;
    }
    ::-webkit-scrollbar-thumb {
      background: ${template.border} !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: ${template.accent} !important;
    }
  `;
};
