import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Activity,
  BookOpen,
  Layers,
  Calculator,
  Crosshair,
  ShieldAlert,
  Calendar,
  Globe,
  Radio,
  BarChart3,
  Award,
  Brain,
  Wind,
  Compass,
  PenTool,
  Users,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Cpu,
  ChevronRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { MainNavTab } from './Header';
import { UserAccount } from '../types';

export interface CategoryItem {
  id: MainNavTab;
  num: string;
  label: string;
  name: string;
  desc: string;
  section: 'Core Execution' | 'Intelligence & Setups' | 'Mindset & Health' | 'Tools & Systems';
  icon: React.FC<{ className?: string }>;
  highlight?: boolean;
  comingSoon?: boolean;
}

export const ALL_CATEGORIES_DATA: CategoryItem[] = [
  {
    id: 'DASHBOARD',
    num: '01',
    label: 'Dashboard',
    name: 'Dashboard Overview',
    desc: 'Tactical account metrics, session PnL, live trade equity curve, and quick performance summary.',
    section: 'Core Execution',
    icon: Activity,
  },
  {
    id: 'JOURNAL',
    num: '02',
    label: 'Trade Journal',
    name: 'Trade Journal Vault',
    desc: 'Log and analyze trades with entry, exit, RR, pre/post psychology tags, screenshots, and mistake reasons.',
    section: 'Core Execution',
    icon: BookOpen,
  },
  {
    id: 'SBT_MODELS',
    num: '03',
    label: 'SBT Models',
    name: '10 SBT Playbook Models',
    desc: 'High-probability Structure-Based Trading models, confirmation checklists, and institutional mechanics.',
    section: 'Core Execution',
    icon: Layers,
    highlight: true,
  },
  {
    id: 'LOT_SIZE',
    num: '04',
    label: 'Lot Size Calculator',
    name: 'Lot Size Calculator',
    desc: 'Exact mathematical position sizing based on risk percentage, stop loss pips, and account balance.',
    section: 'Core Execution',
    icon: Calculator,
  },
  {
    id: 'RISK',
    num: '05',
    label: 'Risk Management',
    name: 'Risk Management Center',
    desc: 'Strict daily loss limits, 2-trade circuit breakers, account preservation protocols, and rules verification.',
    section: 'Core Execution',
    icon: Crosshair,
  },
  {
    id: 'PRE_TRADE_PLAN',
    num: '06',
    label: 'Pre-Trade Plan',
    name: 'Pre-Trade Plan Gatekeeper',
    desc: '3-phase execution checklist (HTF analysis, setup verification, psychological check-in) before orders.',
    section: 'Core Execution',
    icon: ShieldAlert,
    highlight: true,
  },
  {
    id: 'FUNDAMENTAL_CALENDAR',
    num: '07',
    label: 'Live News Calendar',
    name: 'Fundamental News Calendar',
    desc: 'High-impact macroeconomic releases (CPI, NFP, FOMC) with live countdowns and currency filters.',
    section: 'Intelligence & Setups',
    icon: Calendar,
    highlight: true,
  },
  {
    id: 'FUNDAMENTAL_INDICATORS',
    num: '08',
    label: 'Fundamental Indicators',
    name: 'Macro Indicators & Yields',
    desc: 'Treasury yield spreads, dollar index telemetry, and macro fundamental dashboards.',
    section: 'Intelligence & Setups',
    icon: Globe,
    highlight: true,
  },
  {
    id: 'SIGNALS',
    num: '09',
    label: 'Premium Signals',
    name: 'Institutional Signals Hub',
    desc: 'Verified alpha signals, real-time setups, entry/exit notifications, and institutional confluences.',
    section: 'Intelligence & Setups',
    icon: Radio,
    comingSoon: true,
    highlight: true,
  },
  {
    id: 'COMPOUNDING',
    num: '10',
    label: 'Compounding Tools',
    name: 'Compounding Engine',
    desc: 'Long-term equity compounding simulator, target milestones, and risk-adjusted growth trajectories.',
    section: 'Intelligence & Setups',
    icon: Calculator,
  },
  {
    id: 'PERFORMANCE',
    num: '11',
    label: 'Performance Report',
    name: 'Performance Lab',
    desc: 'Win rate breakdown, profit factor, R:R analytics, payoff ratio, and drawdown analysis.',
    section: 'Mindset & Health',
    icon: BarChart3,
  },
  {
    id: 'DAILY_DEV',
    num: '12',
    label: 'Daily Development',
    name: 'Daily Development Plan',
    desc: 'Trader habit tracking, morning preparation, post-market review routines, and discipline streaks.',
    section: 'Mindset & Health',
    icon: Award,
  },
  {
    id: 'PSYCHOLOGY',
    num: '13',
    label: 'Psychological Center',
    name: 'Psychological Command Center',
    desc: 'Cognitive state tracking, tilt early-warning system, CBT thought records, and emotion management.',
    section: 'Mindset & Health',
    icon: Brain,
    highlight: true,
  },
  {
    id: 'CALMING_TOOLS',
    num: '14',
    label: 'Trading Tool Suite',
    name: 'Calming Tools & Sound Suite',
    desc: 'Audio soundscapes, box breathing exercises, focus mode sanctuary, and post-loss resets.',
    section: 'Mindset & Health',
    icon: Wind,
    highlight: true,
  },
  {
    id: 'RESEARCH',
    num: '15',
    label: 'Academic Research',
    name: 'Academic Research Center',
    desc: 'Scientific trading papers, behavioral finance studies, and quantitative market literature.',
    section: 'Intelligence & Setups',
    icon: Compass,
    highlight: true,
  },
  {
    id: 'FREEHAND_WORKSPACE',
    num: '16',
    label: 'Freehand Canvas',
    name: 'Freehand Chart Canvas',
    desc: 'Interactive visual diagramming workspace for drawing market setups, liquidity pools, and ranges.',
    section: 'Tools & Systems',
    icon: PenTool,
  },
  {
    id: 'COMMUNITY',
    num: '17',
    label: 'Trader Community Feed',
    name: 'Community Dispatches',
    desc: 'Live trader chat, shared trade ideas, execution questions, and peer support.',
    section: 'Tools & Systems',
    icon: Users,
  },
  {
    id: 'BOOK_SESSION',
    num: '18',
    label: 'Book a Session',
    name: '1-on-1 Mentorship',
    desc: 'Book personalized trade review, execution critique, and psychological coaching sessions.',
    section: 'Tools & Systems',
    icon: MessageSquare,
    highlight: true,
  },
  {
    id: 'SETTINGS',
    num: '19',
    label: 'Data Export & Backup',
    name: 'Data Backup & Restore',
    desc: 'Export journal data to encrypted JSON, restore previous states, and manage local cloud sync.',
    section: 'Tools & Systems',
    icon: Settings2,
  },
  {
    id: 'ADMIN',
    num: '20',
    label: 'Admin Panel (Owner)',
    name: 'Administration Panel',
    desc: 'Customer accounts management, system permissions, license controls, and audit logs.',
    section: 'Tools & Systems',
    icon: ShieldCheck,
  },
  {
    id: 'EVOLUTION',
    num: '21',
    label: 'Evaluation Engine',
    name: 'Evolution Command Center',
    desc: 'Comprehensive trader progression matrix, discipline scores, and skill-tree evaluation telemetry.',
    section: 'Mindset & Health',
    icon: Cpu,
    highlight: true,
  },
];

interface AllCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  currentUser?: UserAccount | null;
}

export const AllCategoriesModal: React.FC<AllCategoriesModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sections = ['ALL', 'Core Execution', 'Intelligence & Setups', 'Mindset & Health', 'Tools & Systems'];

  const filteredCategories = useMemo(() => {
    return ALL_CATEGORIES_DATA.filter((cat) => {
      // Section filter
      if (selectedSection !== 'ALL' && cat.section !== selectedSection) {
        return false;
      }
      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        cat.label.toLowerCase().includes(q) ||
        cat.name.toLowerCase().includes(q) ||
        cat.desc.toLowerCase().includes(q) ||
        cat.section.toLowerCase().includes(q) ||
        cat.num.includes(q)
      );
    });
  }, [searchQuery, selectedSection]);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-categories-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] bg-[#070B14] border border-slate-800/90 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 sm:p-5 border-b border-slate-800/80 bg-[#090E1A]/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-blue-500/20 text-cyan-300 font-bold">
                  DIRECT ACCESS
                </span>
                <span className="text-[10px] text-slate-400 font-mono-code">21 Modules</span>
              </div>
              <h2 id="all-categories-title" className="text-base sm:text-xl font-military font-bold text-slate-100 tracking-wider">
                Explore All Categories & Modules
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-700/80 transition cursor-pointer active:scale-95"
            title="Close directory (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-3 sm:p-4 border-b border-slate-800/60 bg-[#070B14] space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 21 categories by name, tool, or keyword (e.g. 'Lot Size', 'Psychology', 'News')..."
              className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-400 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-sans focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Section Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px] font-military">
            {sections.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSection(sec)}
                className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition cursor-pointer ${
                  selectedSection === sec
                    ? 'bg-blue-500/20 text-cyan-300 border-cyan-400/60 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Grid (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 overscroll-contain">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <p className="text-sm font-military">No categories match "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSection('ALL');
                }}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                Clear filters to show all categories
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
              {filteredCategories.map((cat) => {
                const Icon = cat.icon;
                const isCurrent = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(cat.id);
                      onClose();
                    }}
                    className={`group text-left p-3 sm:p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.98] ${
                      isCurrent
                        ? 'bg-blue-950/40 border-cyan-400/80 shadow-md shadow-blue-500/10'
                        : 'bg-slate-950/60 hover:bg-slate-900/80 border-slate-800/80 hover:border-blue-500/40'
                    }`}
                  >
                    <div>
                      {/* Top Row: Number, Icon, Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                              isCurrent
                                ? 'bg-cyan-400 text-slate-950 font-bold'
                                : 'bg-slate-900 border border-slate-800 text-slate-300 group-hover:text-cyan-300 group-hover:border-cyan-400/40'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono-code font-bold text-slate-400 group-hover:text-slate-200">
                            {cat.num}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {isCurrent && (
                            <span className="text-[9px] font-mono-code font-bold px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                              ACTIVE
                            </span>
                          )}
                          {cat.comingSoon && (
                            <span className="flex items-center gap-0.5 text-[8px] font-mono-code px-1.5 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/30">
                              <Lock className="w-2.5 h-2.5" /> SOON
                            </span>
                          )}
                          {cat.highlight && !isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3
                        className={`text-xs sm:text-sm font-military font-bold tracking-wide transition ${
                          isCurrent ? 'text-cyan-300' : 'text-slate-200 group-hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>

                    {/* Bottom Indicator */}
                    <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono-code text-slate-400 group-hover:text-cyan-400 transition">
                      <span className="text-[9px] text-slate-400">{cat.section}</span>
                      <div className="flex items-center gap-0.5 font-bold">
                        <span>OPEN</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-[#090E1A] flex items-center justify-between gap-3 text-xs text-slate-400 font-mono-code shrink-0">
          <span className="hidden sm:inline">Select any category to jump directly to its tools</span>
          <span className="sm:hidden">Tap any category to open</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
