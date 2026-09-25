import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  Search,
  Filter,
  Star,
  Layers,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Activity,
  Zap,
  Target,
  FileText,
  Sliders,
  Sparkles,
  ExternalLink,
  Edit3,
  Check,
  Download,
  Upload,
  Globe,
  ChevronRight,
  Bookmark,
  X,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import {
  PairProfile,
  WatchlistStatus,
  PairMacroStance,
  PairAssetType,
  SavedPairScenario,
  PairSaverTimeframe,
} from '../../types/pairSaverTypes';
import { DEFAULT_PAIR_PROFILES } from '../../data/defaultPairProfilesData';
import { CurrencyCode, CurrencyScoreResult } from '../../types/fundamentalIndicatorTypes';
import { SBTStrategyModel, Trade, TradingSession } from '../../types';
import { generatePairScenarioReportPdf } from '../../utils/fundamentalPdfGenerator';

interface PairSaverProps {
  currencyScores?: Record<CurrencyCode, CurrencyScoreResult>;
  onOpenNewTrade?: (prefill?: Partial<Trade>) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenCurrencyWorkspace?: (currency: CurrencyCode) => void;
  onSaveSituationForPair?: (pair: string) => void;
}

const STORAGE_KEY = 'primepip_pair_playbooks_v2';
const SCENARIOS_STORAGE_KEY = 'primepip_pair_saved_scenarios_v2';

const PAIR_SAVER_TIMEFRAMES: PairSaverTimeframe[] = [
  'Weekly',
  'Daily',
  'H4',
  'H1',
  'M30',
  'M15',
  'M5',
  'M3',
  'M1',
];

const ALL_SBT_MODELS: SBTStrategyModel[] = [
  'SBT Model 1',
  'SBT Model 2',
  'SBT Model 3',
  'SBT Model 4',
  'SBT Model 5',
  'SBT Model 6',
  'SBT Model 7',
  'SBT Model 8',
  'SBT Model 9',
  'SBT Model 10',
];

export const PairSaver: React.FC<PairSaverProps> = ({
  currencyScores,
  onOpenNewTrade,
  onNavigateTab,
  onOpenCurrencyWorkspace,
  onSaveSituationForPair,
}) => {
  const [mainTab, setMainTab] = useState<'SCENARIOS' | 'PROFILES'>('SCENARIOS');
  const [isCreateScenarioModalOpen, setIsCreateScenarioModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<SavedPairScenario | null>(null);

  const [savedScenarios, setSavedScenarios] = useState<SavedPairScenario[]>(() => {
    try {
      const saved = localStorage.getItem(SCENARIOS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'scen_eurusd_1',
        pair: 'EUR/USD',
        timeframeBiases: {
          Weekly: 'Bullish',
          Daily: 'Bullish',
          H4: 'Bullish',
          H1: 'Bearish',
          M30: 'Bullish',
          M15: 'Bullish',
          M5: 'Bullish',
          M3: 'Bullish',
          M1: 'Bullish',
        },
        notes: 'Weekly institutional trend continuation. Daily support retest confirmed, H1 pullback into discount zone.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'scen_gbpjpy_1',
        pair: 'GBP/JPY',
        timeframeBiases: {
          Weekly: 'Bullish',
          Daily: 'Bullish',
          H4: 'Bullish',
          H1: 'Bullish',
          M30: 'Bullish',
          M15: 'Bearish',
          M5: 'Bullish',
          M3: 'Bullish',
          M1: 'Bullish',
        },
        notes: 'London session momentum expansion. M15 pullback into H1 bullish order block before expansion.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'scen_xauusd_1',
        pair: 'XAU/USD',
        timeframeBiases: {
          Weekly: 'Bullish',
          Daily: 'Bullish',
          H4: 'Bullish',
          H1: 'Bullish',
          M30: 'Bullish',
          M15: 'Bullish',
          M5: 'Bullish',
          M3: 'Bullish',
          M1: 'Bullish',
        },
        notes: 'Institutional safe haven & real yield tailwind with full multi-timeframe bullish alignment.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  });

  const [profiles, setProfiles] = useState<PairProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PAIR_PROFILES;
  });

  // Save scenarios to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(savedScenarios));
    } catch {}
  }, [savedScenarios]);

  const handleDeleteScenario = (id: string) => {
    if (confirm('Are you sure you want to delete this saved pair scenario?')) {
      setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleSaveScenario = (scenario: SavedPairScenario) => {
    setSavedScenarios((prev) => {
      const idx = prev.findIndex((s) => s.id === scenario.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = scenario;
        return copy;
      }
      return [scenario, ...prev];
    });
    setIsCreateScenarioModalOpen(false);
    setEditingScenario(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MAJOR_FOREX' | 'MINOR_FOREX' | 'COMMODITY' | 'WATCHLIST'>('ALL');
  const [biasFilter, setBiasFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'>('ALL');
  const [sortBy, setSortBy] = useState<'SPREAD' | 'ADR' | 'SYMBOL' | 'VOLATILITY'>('SPREAD');

  const [activeProfile, setActiveProfile] = useState<PairProfile>(profiles[0]);
  const [isEditingPlaybook, setIsEditingPlaybook] = useState(false);
  const [playbookForm, setPlaybookForm] = useState(activeProfile.playbook);

  useEffect(() => {
    setPlaybookForm(activeProfile.playbook);
    setIsEditingPlaybook(false);
  }, [activeProfile.symbol]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch {}
  }, [profiles]);

  // Compute live fundamental differential for each profile
  const enrichedProfiles = useMemo(() => {
    return profiles.map((p) => {
      let baseScore = 0;
      let quoteScore = 0;

      if (currencyScores) {
        if (p.baseCurrency in currencyScores) {
          baseScore = currencyScores[p.baseCurrency as CurrencyCode]?.score || 0;
        } else if (p.baseCurrency === 'GOLD' || p.baseCurrency === 'SILVER') {
          baseScore = 25; // Commodities baseline
        }
        if (p.quoteCurrency in currencyScores) {
          quoteScore = currencyScores[p.quoteCurrency as CurrencyCode]?.score || 0;
        }
      }

      const diff = baseScore - quoteScore;
      let macroStance: PairMacroStance = 'NEUTRAL';
      if (diff >= 25) macroStance = 'STRONG_BULLISH';
      else if (diff >= 10) macroStance = 'MODERATE_BULLISH';
      else if (diff <= -25) macroStance = 'STRONG_BEARISH';
      else if (diff <= -10) macroStance = 'MODERATE_BEARISH';

      return {
        ...p,
        baseScore,
        quoteScore,
        diff,
        macroStance,
      };
    });
  }, [profiles, currencyScores]);

  // Filter & Sort
  const filteredProfiles = useMemo(() => {
    return enrichedProfiles
      .filter((p) => {
        if (typeFilter === 'WATCHLIST') {
          if (p.playbook.watchlistStatus !== 'ACTIVE_FOCUS') return false;
        } else if (typeFilter !== 'ALL' && p.type !== typeFilter) {
          return false;
        }

        if (biasFilter === 'BULLISH' && (p.macroStance !== 'STRONG_BULLISH' && p.macroStance !== 'MODERATE_BULLISH')) return false;
        if (biasFilter === 'BEARISH' && (p.macroStance !== 'STRONG_BEARISH' && p.macroStance !== 'MODERATE_BEARISH')) return false;
        if (biasFilter === 'NEUTRAL' && p.macroStance !== 'NEUTRAL') return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSym = p.symbol.toLowerCase().includes(q);
          const matchName = p.displayName.toLowerCase().includes(q);
          const matchNick = (p.nickname || '').toLowerCase().includes(q);
          const matchCurr = p.baseCurrency.toLowerCase().includes(q) || p.quoteCurrency.toLowerCase().includes(q);
          if (!matchSym && !matchName && !matchNick && !matchCurr) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'SPREAD') return Math.abs(b.diff) - Math.abs(a.diff);
        if (sortBy === 'ADR') return b.averageDailyRangePips - a.averageDailyRangePips;
        if (sortBy === 'SYMBOL') return a.symbol.localeCompare(b.symbol);
        return 0;
      });
  }, [enrichedProfiles, typeFilter, biasFilter, searchQuery, sortBy]);

  const activeEnriched = useMemo(() => {
    return enrichedProfiles.find((p) => p.symbol === activeProfile.symbol) || enrichedProfiles[0];
  }, [enrichedProfiles, activeProfile.symbol]);

  const handleToggleWatchlist = (symbol: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.symbol !== symbol) return p;
        const newStatus: WatchlistStatus =
          p.playbook.watchlistStatus === 'ACTIVE_FOCUS' ? 'MONITORING' : 'ACTIVE_FOCUS';
        return {
          ...p,
          playbook: {
            ...p.playbook,
            watchlistStatus: newStatus,
            lastUpdated: new Date().toISOString(),
          },
        };
      })
    );
  };

  const handleSavePlaybook = () => {
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.symbol !== activeProfile.symbol) return p;
        return {
          ...p,
          playbook: {
            ...playbookForm,
            lastUpdated: new Date().toISOString(),
          },
        };
      })
    );
    setIsEditingPlaybook(false);
  };

  const handleSendToJournal = () => {
    if (onOpenNewTrade) {
      onOpenNewTrade({
        pair: activeEnriched.symbol,
        direction: activeEnriched.diff >= 0 ? 'BUY' : 'SELL',
        strategy: activeEnriched.playbook.preferredModels[0] || 'SBT Model 1',
        tradeRationale: `From Pair Saver Playbook (${activeEnriched.symbol}):\nMacro Bias: ${activeEnriched.macroStance} (Diff: ${activeEnriched.diff > 0 ? `+${activeEnriched.diff}` : activeEnriched.diff})\nADR: ${activeEnriched.averageDailyRangePips} pips\nStrategy Notes: ${activeEnriched.playbook.traderPlaybookNotes}`,
      });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-[#0d1629] to-slate-950 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/40 text-[10px] font-bold font-military tracking-widest uppercase">
                INSTITUTIONAL KNOWLEDGE-BASE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                31 Instruments (28 Forex Pairs + 3 Commodities)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-military tracking-wide flex items-center gap-3">
              <Compass className="w-7 h-7 text-cyan-400" />
              <span>PAIR SAVER</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Curate comprehensive profiles, behavioral quirks, volatility ADRs, and custom trading playbooks for every currency & commodity pair, powered by real-time fundamental differential spreads.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingScenario(null);
                setIsCreateScenarioModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-military font-bold transition shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>CREATE</span>
            </button>

            <button
              type="button"
              onClick={() => generatePairScenarioReportPdf(savedScenarios)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-military font-bold transition shadow cursor-pointer"
              title="Download All Pair Scenarios as Institutional PDF"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>DOWNLOAD ALL</span>
            </button>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono-code text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Coverage</span>
              <span className="text-lg font-bold text-white mt-0.5 block">31 Pairs</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono-code text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Scenarios</span>
              <span className="text-lg font-bold text-cyan-400 mt-0.5 block">{savedScenarios.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 font-military">
        <button
          type="button"
          onClick={() => setMainTab('SCENARIOS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            mainTab === 'SCENARIOS'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
              : 'text-slate-400 hover:text-white bg-slate-900/40 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>SAVED PAIR SCENARIOS ({savedScenarios.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMainTab('PROFILES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            mainTab === 'PROFILES'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
              : 'text-slate-400 hover:text-white bg-slate-900/40 border border-slate-800'
          }`}
        >
          <Compass className="w-4 h-4 text-blue-400" />
          <span>ALL 31 PAIR PROFILES & SPREADS</span>
        </button>
      </div>

      {/* TAB 1: SAVED PAIR SCENARIOS */}
      {mainTab === 'SCENARIOS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white font-military uppercase tracking-wide flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-cyan-400" />
                <span>SAVED MULTI-TIMEFRAME SCENARIOS</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Saved market scenarios with directional bias across Weekly, Daily, H4, H1, M30, M15, M5, M3, and M1.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingScenario(null);
                setIsCreateScenarioModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold transition shadow cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ CREATE PAIR SCENARIO</span>
            </button>
          </div>

          {savedScenarios.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
              <Compass className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No pair scenarios saved yet.</p>
              <button
                type="button"
                onClick={() => {
                  setEditingScenario(null);
                  setIsCreateScenarioModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold font-military"
              >
                Create Your First Scenario
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedScenarios.map((scen) => {
                const bullCount = Object.values(scen.timeframeBiases).filter((b) => b === 'Bullish').length;
                const bearCount = Object.values(scen.timeframeBiases).filter((b) => b === 'Bearish').length;
                return (
                  <div
                    key={scen.id}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition shadow-lg space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold font-mono-code text-white">{scen.pair}</span>
                        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded font-bold bg-slate-900 border border-slate-800 text-slate-300">
                          {bullCount > bearCount ? `▲ ${bullCount}/9 Bullish` : `▼ ${bearCount}/9 Bearish`}
                        </span>
                      </div>

                      {/* 9 Timeframes Matrix */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 font-mono-code text-center">
                        {PAIR_SAVER_TIMEFRAMES.map((tf) => {
                          const bias = scen.timeframeBiases[tf];
                          return (
                            <div
                              key={tf}
                              className={`p-1.5 rounded-lg border text-[10px] ${
                                bias === 'Bullish'
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                  : bias === 'Bearish'
                                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
                              }`}
                            >
                              <div className="text-[9px] text-slate-400 font-semibold">{tf}</div>
                              <div className="font-bold mt-0.5">
                                {bias === 'Bullish' ? '▲ BULL' : bias === 'Bearish' ? '▼ BEAR' : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Notes */}
                      {scen.notes && (
                        <p className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                          {scen.notes}
                        </p>
                      )}
                    </div>

                    {/* Action buttons: Download, Edit, Delete */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 font-mono-code">
                        {new Date(scen.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => generatePairScenarioReportPdf(scen)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition"
                          title="Download Scenario PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingScenario(scen);
                            setIsCreateScenarioModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition"
                          title="Edit Scenario"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteScenario(scen.id)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                          title="Delete Scenario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL 31 PAIR PROFILES */}
      {mainTab === 'PROFILES' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Instruments List & Filters */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search symbol, currency, or nickname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-code"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px] font-mono-code pt-1">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                  typeFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                All (31)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('MAJOR_FOREX')}
                className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                  typeFilter === 'MAJOR_FOREX' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                Majors (7)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('MINOR_FOREX')}
                className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                  typeFilter === 'MINOR_FOREX' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                Minors (21)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('COMMODITY')}
                className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                  typeFilter === 'COMMODITY' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                Commodities (3)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('WATCHLIST')}
                className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap flex items-center gap-1 ${
                  typeFilter === 'WATCHLIST' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>Focus</span>
              </button>
            </div>
          </div>

          {/* List of Pairs */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredProfiles.map((p) => {
              const isSelected = p.symbol === activeProfile.symbol;
              const isStarred = p.playbook.watchlistStatus === 'ACTIVE_FOCUS';

              return (
                <div
                  key={p.symbol}
                  onClick={() => setActiveProfile(p)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-400/60 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => handleToggleWatchlist(p.symbol, e)}
                      className="p-1 text-slate-600 hover:text-amber-400 transition"
                      title={isStarred ? 'Remove from focus watchlist' : 'Star for active focus'}
                    >
                      <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono-code">{p.symbol}</span>
                        {p.nickname && (
                          <span className="text-[10px] text-slate-500 font-mono-code italic">({p.nickname})</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                        {p.displayName}
                      </span>
                    </div>
                  </div>

                  {/* Differential & ADR */}
                  <div className="text-right font-mono-code">
                    <div
                      className={`text-xs font-bold inline-flex items-center gap-1 ${
                        p.diff > 10
                          ? 'text-emerald-400'
                          : p.diff < -10
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {p.diff > 0 ? `+${p.diff}` : p.diff} diff
                    </div>
                    <div className="text-[10px] text-slate-500">ADR: {p.averageDailyRangePips}p</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Pair Deep Profile & Saved Playbook */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-6 rounded-2xl bg-[#0b1120] border border-cyan-500/30 shadow-2xl space-y-6">
            {/* Top Identity & Action Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{activeEnriched.flagBase}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-white font-mono-code">{activeEnriched.symbol}</h2>
                    {activeEnriched.nickname && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-cyan-300">
                        {activeEnriched.nickname}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-military uppercase ${
                        activeEnriched.diff >= 10
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : activeEnriched.diff <= -10
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {activeEnriched.macroStance.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{activeEnriched.displayName}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleToggleWatchlist(activeEnriched.symbol)}
                  className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                    activeEnriched.playbook.watchlistStatus === 'ACTIVE_FOCUS'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{activeEnriched.playbook.watchlistStatus === 'ACTIVE_FOCUS' ? 'Active Focus' : 'Add to Focus'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendToJournal}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition shadow cursor-pointer flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Log Trade</span>
                </button>
              </div>
            </div>

            {/* Tactical Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-code text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Average Daily Range</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{activeEnriched.averageDailyRangePips} Pips</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Pip Value (1.00 Lot)</span>
                <span className="text-sm font-bold text-cyan-400 mt-0.5 block">${activeEnriched.pipValuePerStandardLotUsd.toFixed(2)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Volatility Tier</span>
                <span className="text-sm font-bold text-amber-400 mt-0.5 block">{activeEnriched.volatilityRating}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Typical Spread</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{activeEnriched.spreadPipsTypical} Pips</span>
              </div>
            </div>

            {/* Live Macro Differential Breakdown */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-950 to-slate-950 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Macro Intelligence Differential</span>
                </span>
                <span className="font-bold text-white">
                  Base: {activeEnriched.baseScore > 0 ? `+${activeEnriched.baseScore}` : activeEnriched.baseScore} vs Quote: {activeEnriched.quoteScore > 0 ? `+${activeEnriched.quoteScore}` : activeEnriched.quoteScore}
                </span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Net differential spread of <strong className="text-cyan-300 font-mono-code">{activeEnriched.diff > 0 ? `+${activeEnriched.diff}` : activeEnriched.diff} points</strong> gives {activeEnriched.symbol} a <strong className="text-white">{activeEnriched.macroStance.replace('_', ' ')}</strong> institutional posture.
              </div>
            </div>

            {/* Intermarket Correlations & Personality Traits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-cyan-400 uppercase tracking-wider block text-[10px]">
                  Intermarket Drivers & Correlations
                </span>
                <div className="space-y-1.5">
                  {activeEnriched.intermarketCorrelations.map((corr, idx) => (
                    <div key={idx} className="text-slate-300 text-[11px] leading-relaxed">
                      <strong className="text-white">{corr.correlatedAsset}</strong> ({corr.correlationType}): {corr.description}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-amber-400 uppercase tracking-wider block text-[10px]">
                  Institutional Behavioral Traps to Avoid
                </span>
                <div className="space-y-1.5">
                  {activeEnriched.institutionalTrapsToAvoid.map((trap, idx) => (
                    <div key={idx} className="text-amber-200/90 text-[11px] leading-relaxed">
                      ⚠️ {trap}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Saved Pair Playbook Section */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-military uppercase tracking-wide">
                    SAVED TRADING PLAYBOOK & EXECUTION RULES
                  </h3>
                </div>
                {!isEditingPlaybook ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingPlaybook(true)}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Playbook</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingPlaybook(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePlaybook}
                      className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                    >
                      Save Playbook
                    </button>
                  </div>
                )}
              </div>

              {!isEditingPlaybook ? (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-mono-code text-[11px]">Preferred SBT Models:</span>
                    {activeEnriched.playbook.preferredModels.map((m, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 text-[10px] font-bold font-military">
                        {m}
                      </span>
                    ))}
                  </div>

                  <div className="text-slate-300 leading-relaxed">
                    <strong className="text-white">Execution Notes:</strong> {activeEnriched.playbook.traderPlaybookNotes}
                  </div>

                  {activeEnriched.playbook.customRules.length > 0 && (
                    <div className="space-y-1">
                      <strong className="text-white">Specific Pair Rules:</strong>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                        {activeEnriched.playbook.customRules.map((rule, idx) => (
                          <li key={idx}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Playbook Strategy Notes</label>
                    <textarea
                      rows={3}
                      value={playbookForm.traderPlaybookNotes}
                      onChange={(e) => setPlaybookForm({ ...playbookForm, traderPlaybookNotes: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Target R:R Ratio</label>
                    <input
                      type="number"
                      step="0.1"
                      value={playbookForm.targetRiskReward}
                      onChange={(e) => setPlaybookForm({ ...playbookForm, targetRiskReward: Number(e.target.value) })}
                      className="w-32 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Create / Edit Pair Scenario Modal */}
      {isCreateScenarioModalOpen && (
        <CreatePairScenarioModal
          isOpen={isCreateScenarioModalOpen}
          initialData={editingScenario}
          onClose={() => {
            setIsCreateScenarioModalOpen(false);
            setEditingScenario(null);
          }}
          onSave={handleSaveScenario}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// CREATE / EDIT PAIR SCENARIO MODAL
// -------------------------------------------------------------
interface CreatePairScenarioModalProps {
  isOpen: boolean;
  initialData?: SavedPairScenario | null;
  onClose: () => void;
  onSave: (scenario: SavedPairScenario) => void;
}

const CreatePairScenarioModal: React.FC<CreatePairScenarioModalProps> = ({
  isOpen,
  initialData,
  onClose,
  onSave,
}) => {
  const [pairName, setPairName] = useState(initialData?.pair || 'EUR/USD');
  const [timeframeBiases, setTimeframeBiases] = useState<Record<PairSaverTimeframe, 'Bullish' | 'Bearish' | null>>(() => {
    if (initialData?.timeframeBiases) return initialData.timeframeBiases;
    const initialMap: any = {};
    PAIR_SAVER_TIMEFRAMES.forEach((tf) => {
      initialMap[tf] = tf === 'Weekly' || tf === 'Daily' || tf === 'H4' ? 'Bullish' : null;
    });
    return initialMap;
  });
  const [notes, setNotes] = useState(initialData?.notes || '');

  if (!isOpen) return null;

  const handleSetBias = (tf: PairSaverTimeframe, bias: 'Bullish' | 'Bearish' | null) => {
    setTimeframeBiases((prev) => ({
      ...prev,
      [tf]: bias,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairName.trim()) {
      alert('Please enter a currency pair name.');
      return;
    }
    const newRecord: SavedPairScenario = {
      id: initialData?.id || `scen_${Date.now()}`,
      pair: pairName.toUpperCase().trim(),
      timeframeBiases,
      notes: notes.trim(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(newRecord);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0b1120] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#080d19]">
          <h2 className="text-base font-bold text-white font-military flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-cyan-400" />
            <span>{initialData ? 'EDIT PAIR SCENARIO' : 'CREATE NEW PAIR SCENARIO'}</span>
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Pair Name Input */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold block">
              Enter Currency Pair Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. EUR/USD, GBP/JPY, XAU/USD, AUD/CAD"
              value={pairName}
              onChange={(e) => setPairName(e.target.value.toUpperCase().trim())}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono-code font-bold uppercase focus:border-cyan-400 outline-none"
            />
            {/* Quick chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD', 'GBP/JPY', 'EUR/JPY', 'XAU/USD', 'XAG/USD', 'USOIL', 'BTC/USD'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPairName(p)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono-code transition cursor-pointer ${
                    pairName === p
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* List of Timeframes with Bullish / Bearish Selection */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="text-xs font-bold text-white uppercase tracking-wider font-military block">
              Select Direction for Each Timeframe (Weekly down to M1):
            </label>
            <div className="space-y-2">
              {PAIR_SAVER_TIMEFRAMES.map((tf) => {
                const currentBias = timeframeBiases[tf];
                return (
                  <div
                    key={tf}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80"
                  >
                    <span className="font-mono-code font-bold text-slate-200 text-xs w-20">
                      {tf}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetBias(tf, currentBias === 'Bullish' ? null : 'Bullish')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-military transition flex items-center gap-1.5 cursor-pointer ${
                          currentBias === 'Bullish'
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>BULLISH</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetBias(tf, currentBias === 'Bearish' ? null : 'Bearish')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-military transition flex items-center gap-1.5 cursor-pointer ${
                          currentBias === 'Bearish'
                            ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>BEARISH</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label className="text-slate-300 font-bold block mb-1">
              Manual Scenario Notes & Strategy Observations
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Higher timeframe daily bullish order block holding. London session sweep into discount..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-400"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs uppercase tracking-wider"
            >
              {initialData ? 'Update Scenario' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
