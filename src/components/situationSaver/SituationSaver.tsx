import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  PlusCircle,
  Bookmark,
  Layers,
  Crosshair,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  ShieldCheck,
  Award,
  AlertTriangle,
  ArrowRight,
  Eye,
  Trash2,
  Edit3,
  Download,
  Upload,
  RotateCcw,
  Zap,
  Target,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  MarketSituation,
  SituationDirection,
  SituationOutcome,
  HTFTimeframe,
  MTFTimeframe,
  LTFTimeframe,
  StructureElement,
  FibonacciLevel,
  SituationFilterOptions,
  SimilarityMatchResult,
  SituationTimeframe,
  TimeframeScenarioConfig,
} from '../../types/situationSaverTypes';
import { DEFAULT_SITUATIONS_DATABASE } from '../../data/defaultSituationsData';
import { SBTStrategyModel, Trade, TradingSession, AccountSettings } from '../../types';
import { generateSituationReportPdf } from '../../utils/fundamentalPdfGenerator';

interface SituationSaverProps {
  onOpenNewTrade?: (prefill?: Partial<Trade>) => void;
  onNavigateTab?: (tab: string) => void;
  activeAccount?: AccountSettings | null;
}

const STORAGE_KEY = 'primepip_saved_market_situations_v2';

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

const FIBONACCI_LEVELS: FibonacciLevel[] = [
  '0.382',
  '0.500 (Equilibrium)',
  '0.618 (OTE Golden Pocket)',
  '0.705 (OTE Institutional)',
  '0.786 (Deep Discount/Premium)',
  '0.886 (Extreme Invalidation Edge)',
  '1.272 (Target Extension)',
  '1.618 (Deep Target Extension)',
  'None',
];

const POPULAR_PAIRS = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'USD/CHF',
  'USD/CAD',
  'AUD/USD',
  'NZD/USD',
  'GBP/JPY',
  'EUR/JPY',
  'EUR/GBP',
  'AUD/JPY',
  'CAD/JPY',
  'XAU/USD',
  'XAG/USD',
  'USOIL',
  'BTC/USD',
  'US30',
  'NAS100',
];

export const SituationSaver: React.FC<SituationSaverProps> = ({
  onOpenNewTrade,
  onNavigateTab,
  activeAccount,
}) => {
  const [situations, setSituations] = useState<MarketSituation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_SITUATIONS_DATABASE;
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filters
  const [filters, setFilters] = useState<SituationFilterOptions>({
    searchQuery: '',
    pair: 'ALL',
    direction: 'ALL',
    sbtModel: 'ALL',
    outcome: 'ALL',
    fibonacciLevel: 'ALL',
    session: 'ALL',
  });

  // Modals & Active Inspecting
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSituation, setEditingSituation] = useState<MarketSituation | null>(null);
  const [inspectingSituation, setInspectingSituation] = useState<MarketSituation | null>(null);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Similarity Matcher State
  const [isSimilarityMatcherOpen, setIsSimilarityMatcherOpen] = useState(false);
  const [similarityInput, setSimilarityInput] = useState<{
    pair: string;
    direction: SituationDirection;
    sbtModel: string;
    fibonacciLevel: FibonacciLevel;
  }>({
    pair: 'EUR/USD',
    direction: 'BEARISH',
    sbtModel: 'SBT Model 3',
    fibonacciLevel: '0.618 (OTE Golden Pocket)',
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(situations));
    } catch {}
  }, [situations]);

  // Compute Overall Analytics
  const stats = useMemo(() => {
    const total = situations.length;
    const completed = situations.filter((s) => s.outcome !== 'SAVED_SETUP');
    const wins = situations.filter((s) => s.outcome === 'WIN_FULL_TP' || s.outcome === 'PARTIAL_WIN');
    const winRate = completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0;

    const rrs = situations
      .map((s) => s.realizedRiskReward)
      .filter((r): r is number => typeof r === 'number');
    const avgRr = rrs.length > 0 ? (rrs.reduce((a, b) => a + b, 0) / rrs.length).toFixed(2) : '3.2';

    // Model breakdown
    const modelCounts: Record<string, number> = {};
    situations.forEach((s) => {
      modelCounts[s.sbtModel] = (modelCounts[s.sbtModel] || 0) + 1;
    });
    const topModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'SBT Model 3';

    return { total, winRate, avgRr, topModel };
  }, [situations]);

  // Filtered List
  const filteredSituations = useMemo(() => {
    return situations.filter((item) => {
      if (filters.pair !== 'ALL' && item.pair !== filters.pair) return false;
      if (filters.direction !== 'ALL' && item.direction !== filters.direction) return false;
      if (filters.sbtModel !== 'ALL' && item.sbtModel !== filters.sbtModel) return false;
      if (filters.outcome !== 'ALL' && item.outcome !== filters.outcome) return false;
      if (filters.fibonacciLevel !== 'ALL' && item.fibonacciLevel !== filters.fibonacciLevel) return false;
      if (filters.session !== 'ALL' && item.session !== filters.session) return false;

      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesNotes = item.htfContext.toLowerCase().includes(query) || item.mtfNotes.toLowerCase().includes(query) || item.lessonsLearned.toLowerCase().includes(query);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));
        const matchesPair = item.pair.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes && !matchesTags && !matchesPair) return false;
      }

      return true;
    });
  }, [situations, filters]);

  // Similarity Match Engine
  const similarityResults: SimilarityMatchResult[] = useMemo(() => {
    if (!isSimilarityMatcherOpen) return [];

    return situations
      .map((sit) => {
        let score = 0;
        const matchingFactors: string[] = [];

        if (sit.pair === similarityInput.pair) {
          score += 35;
          matchingFactors.push(`Same Instrument (${sit.pair})`);
        }
        if (sit.direction === similarityInput.direction) {
          score += 25;
          matchingFactors.push(`Directional Bias (${sit.direction})`);
        }
        if (sit.sbtModel === similarityInput.sbtModel) {
          score += 25;
          matchingFactors.push(`Institutional Framework (${sit.sbtModel})`);
        }
        if (sit.fibonacciLevel === similarityInput.fibonacciLevel) {
          score += 15;
          matchingFactors.push(`Fibonacci Zone (${sit.fibonacciLevel})`);
        }

        return {
          situation: sit,
          similarityScore: score,
          matchingFactors,
        };
      })
      .filter((res) => res.similarityScore >= 35)
      .sort((a, b) => b.similarityScore - a.similarityScore);
  }, [situations, isSimilarityMatcherOpen, similarityInput]);

  const handleDeleteSituation = (id: string) => {
    setSituations((prev) => {
      const next = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (inspectingSituation?.id === id) setInspectingSituation(null);
    showNotification('Market situation setup deleted.', 'info');
  };

  const handleUpdateSituationLesson = (id: string, newLesson: string) => {
    const trimmed = newLesson.trim();
    if (!trimmed) return;
    setSituations((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        lessonsLearned: trimmed,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (inspectingSituation?.id === id) {
      setInspectingSituation((prev) =>
        prev ? { ...prev, lessonsLearned: trimmed, updatedAt: new Date().toISOString() } : null
      );
    }
    showNotification('Golden Institutional Lesson Learned updated and saved.');
  };

  const handleSaveSituation = (situation: MarketSituation) => {
    const isEdit = Boolean(editingSituation);
    setSituations((prev) => {
      const idx = prev.findIndex((s) => s.id === situation.id);
      let updated: MarketSituation[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = situation;
      } else {
        updated = [situation, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setIsCreateModalOpen(false);
    setEditingSituation(null);
    showNotification(isEdit ? 'Market situation updated.' : 'New market situation setup saved.');
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(situations, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `primepip_market_situations_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (Array.isArray(imported)) {
          setSituations(imported);
          alert(`Successfully imported ${imported.length} market situations!`);
        }
      } catch {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleSendToTradeJournal = (sit: MarketSituation) => {
    if (onOpenNewTrade) {
      onOpenNewTrade({
        pair: sit.pair,
        direction: sit.direction === 'BULLISH' ? 'BUY' : 'SELL',
        entryPrice: sit.entryPrice,
        stopLoss: sit.stopLossPrice,
        takeProfit: sit.takeProfit1,
        strategy: sit.sbtModel,
        timeframe: sit.mtfTimeframe,
        session: sit.session,
        preTradeChecklist: {
          htfBiasConfirmed: true,
          liquidityIdentified: true,
          clearDisplacement: true,
          riskParametersChecked: true,
          sessionTimingValid: true,
        },
        tradeRationale: `From Situation Saver: ${sit.title}\n${sit.htfContext}\n${sit.mtfNotes}\nGolden Lesson: ${sit.lessonsLearned}`,
      });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-[#0d1629] to-slate-950 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold font-military tracking-widest uppercase">
                INSTITUTIONAL KNOWLEDGE-BASE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                Multi-Timeframe Architecture
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-military tracking-wide flex items-center gap-3">
              <Bookmark className="w-7 h-7 text-cyan-400" />
              <span>SITUATION SAVER</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Capture, categorize, and backtest multi-timeframe market configurations with exact Fibonacci retracements, order block triggers, historical outcomes, and actionable lessons learned.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsSimilarityMatcherOpen(!isSimilarityMatcherOpen)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-military font-bold transition shadow cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>SIMILARITY MATCHER</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingSituation(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-military font-bold transition shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>CREATE SITUATION</span>
            </button>

            <button
              type="button"
              onClick={() => generateSituationReportPdf(situations)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-military font-bold transition shadow cursor-pointer"
              title="Download All Situations as Institutional PDF"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>DOWNLOAD ALL</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={handleExportJson}
                className="p-1.5 text-slate-400 hover:text-cyan-300 transition"
                title="Export Situations JSON"
              >
                <FileText className="w-4 h-4" />
              </button>
              <label className="p-1.5 text-slate-400 hover:text-cyan-300 transition cursor-pointer" title="Import Situations JSON">
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Tactical Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 font-mono-code">
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Situations</span>
            <span className="text-xl font-bold text-white mt-0.5 block">{stats.total}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Verified Win Rate</span>
            <span className="text-xl font-bold text-emerald-400 mt-0.5 block">{stats.winRate}%</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Average Realized R:R</span>
            <span className="text-xl font-bold text-cyan-400 mt-0.5 block">1 : {stats.avgRr}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Top Framework</span>
            <span className="text-xs font-bold text-amber-300 mt-1 block truncate">{stats.topModel}</span>
          </div>
        </div>
      </div>

      {/* Similarity Matcher Panel */}
      {isSimilarityMatcherOpen && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#14122b] to-[#0c0d1c] border border-purple-500/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white font-military uppercase tracking-wide">
                SETUP SIMILARITY MATCHING ENGINE
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsSimilarityMatcherOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Evaluating a potential live market setup? Select your target pair, direction, and SBT framework to match identical historical situations and review past outcome win-rates and lessons learned before risking capital.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Target Instrument</label>
              <select
                value={similarityInput.pair}
                onChange={(e) => setSimilarityInput({ ...similarityInput, pair: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code focus:border-purple-400 outline-none"
              >
                {POPULAR_PAIRS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Directional Bias</label>
              <select
                value={similarityInput.direction}
                onChange={(e) => setSimilarityInput({ ...similarityInput, direction: e.target.value as SituationDirection })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code focus:border-purple-400 outline-none"
              >
                <option value="BULLISH">BULLISH (Long)</option>
                <option value="BEARISH">BEARISH (Short)</option>
                <option value="RANGING">RANGING (Mean Reversion)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">SBT Playbook Model</label>
              <select
                value={similarityInput.sbtModel}
                onChange={(e) => setSimilarityInput({ ...similarityInput, sbtModel: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code focus:border-purple-400 outline-none"
              >
                {ALL_SBT_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Fibonacci Confluence</label>
              <select
                value={similarityInput.fibonacciLevel}
                onChange={(e) => setSimilarityInput({ ...similarityInput, fibonacciLevel: e.target.value as FibonacciLevel })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code focus:border-purple-400 outline-none"
              >
                {FIBONACCI_LEVELS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Matched Situations Output */}
          <div className="pt-2 border-t border-purple-500/20">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block mb-2">
              Matched Situations ({similarityResults.length} Found)
            </span>

            {similarityResults.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                No past situations match these parameters. Save more setups to train your personalized institutional similarity library.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {similarityResults.slice(0, 4).map(({ situation, similarityScore, matchingFactors }) => (
                  <div
                    key={situation.id}
                    onClick={() => setInspectingSituation(situation)}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-purple-500/30 hover:border-purple-400 transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        {similarityScore}% Match
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          situation.outcome === 'WIN_FULL_TP' || situation.outcome === 'PARTIAL_WIN'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : situation.outcome === 'LOSS_STOPPED'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {situation.outcome.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate">{situation.title}</h4>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {matchingFactors.map((fact, fIdx) => (
                        <span key={fIdx} className="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          ✓ {fact}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-amber-300/90 italic line-clamp-2 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      💡 Lesson: "{situation.lessonsLearned}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Control Toolbar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search situations by title, lessons learned, tags, or currency..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-code"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-military font-bold transition ${
                viewMode === 'CARDS' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              CARDS
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-military font-bold transition ${
                viewMode === 'TABLE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              TABLE
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono-code pt-1">
          <select
            value={filters.pair}
            onChange={(e) => setFilters({ ...filters, pair: e.target.value })}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:border-cyan-500 outline-none"
          >
            <option value="ALL">All Instruments</option>
            {POPULAR_PAIRS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={filters.sbtModel}
            onChange={(e) => setFilters({ ...filters, sbtModel: e.target.value })}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:border-cyan-500 outline-none"
          >
            <option value="ALL">All SBT Models</option>
            {ALL_SBT_MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={filters.direction}
            onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:border-cyan-500 outline-none"
          >
            <option value="ALL">All Directions</option>
            <option value="BULLISH">Bullish (Long)</option>
            <option value="BEARISH">Bearish (Short)</option>
            <option value="RANGING">Ranging</option>
          </select>

          <select
            value={filters.outcome}
            onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:border-cyan-500 outline-none"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN_FULL_TP">Win (Full TP)</option>
            <option value="PARTIAL_WIN">Partial Win</option>
            <option value="BREAKEVEN">Breakeven</option>
            <option value="LOSS_STOPPED">Stopped Out (Loss)</option>
            <option value="SAVED_SETUP">Saved Setup (Pending)</option>
          </select>

          <select
            value={filters.fibonacciLevel}
            onChange={(e) => setFilters({ ...filters, fibonacciLevel: e.target.value })}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:border-cyan-500 outline-none"
          >
            <option value="ALL">All Fibonacci Zones</option>
            {FIBONACCI_LEVELS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredSituations.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">No matching situations found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try resetting your filters or click "Save Situation" to record a new multi-timeframe market setup.
          </p>
          <button
            type="button"
            onClick={() => setFilters({ searchQuery: '', pair: 'ALL', direction: 'ALL', sbtModel: 'ALL', outcome: 'ALL', fibonacciLevel: 'ALL', session: 'ALL' })}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-military font-bold border border-slate-800 transition"
          >
            RESET ALL FILTERS
          </button>
        </div>
      ) : viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSituations.map((sit) => {
            const isBullish = sit.direction === 'BULLISH';
            const isBearish = sit.direction === 'BEARISH';

            return (
              <div
                key={sit.id}
                className="flex flex-col justify-between rounded-2xl bg-[#0b1120] border border-slate-800 hover:border-cyan-500/40 transition shadow-xl p-5 space-y-4 group cursor-pointer"
                onClick={() => setInspectingSituation(sit)}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono-code">{sit.pair}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-military flex items-center gap-1 ${
                          isBullish
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isBearish
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isBullish ? <TrendingUp className="w-3 h-3" /> : isBearish ? <TrendingDown className="w-3 h-3" /> : null}
                        <span>{sit.direction}</span>
                      </span>
                    </div>

                    {/* Outcome Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        sit.outcome === 'WIN_FULL_TP' || sit.outcome === 'PARTIAL_WIN'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : sit.outcome === 'LOSS_STOPPED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {sit.outcome === 'WIN_FULL_TP'
                        ? '✓ WIN (FULL TP)'
                        : sit.outcome === 'PARTIAL_WIN'
                        ? '✓ PARTIAL WIN'
                        : sit.outcome === 'LOSS_STOPPED'
                        ? '✕ STOPPED OUT'
                        : 'PENDING'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition line-clamp-2">
                    {sit.title}
                  </h3>

                  {/* Framework & Confluence Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono-code">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                      {sit.sbtModel}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      Fib: {sit.fibonacciLevel.split(' ')[0]}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {sit.session}
                    </span>
                  </div>

                  {/* Timeframe & Target Summary */}
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-[10px] font-mono-code flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block">Timeframe</span>
                      <span className="text-cyan-300 font-bold">{sit.selectedTimeframe || sit.htfTimeframe || 'Weekly'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Final Target</span>
                      <span className="text-amber-400 font-bold">{sit.finalTarget || '1.618'}</span>
                    </div>
                  </div>

                  {/* Key Lesson Learned Excerpt */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed italic line-clamp-2">
                    💡 <strong className="font-semibold text-amber-300">Takeaway:</strong> "{sit.lessonsLearned}"
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateSituationReportPdf(sit);
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 transition"
                      title="Download Situation Report (PDF)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSituation(sit);
                        setIsCreateModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 transition"
                      title="Edit Situation"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSituation(sit.id);
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Delete Situation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendToTradeJournal(sit);
                    }}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold font-military uppercase transition cursor-pointer"
                  >
                    <span>Send to Journal</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl">
          <table className="w-full text-left font-mono-code text-xs">
            <thead className="bg-[#0e172a] text-slate-400 border-b border-slate-800 text-[10px] uppercase">
              <tr>
                <th className="p-3">Instrument</th>
                <th className="p-3">Direction</th>
                <th className="p-3">Title & Framework</th>
                <th className="p-3">Timeframes</th>
                <th className="p-3">Fib Level</th>
                <th className="p-3 text-right">Final Target</th>
                <th className="p-3 text-center">Outcome</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSituations.map((sit) => (
                <tr
                  key={sit.id}
                  onClick={() => setInspectingSituation(sit)}
                  className="hover:bg-slate-900/60 transition cursor-pointer"
                >
                  <td className="p-3 font-bold text-white">{sit.pair}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sit.direction === 'BULLISH'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : sit.direction === 'BEARISH'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {sit.direction}
                    </span>
                  </td>
                  <td className="p-3 max-w-[260px]">
                    <div className="font-bold text-slate-200 truncate">{sit.title}</div>
                    <div className="text-[10px] text-cyan-400">{sit.sbtModel}</div>
                  </td>
                  <td className="p-3 text-slate-400 text-[11px]">
                    {sit.htfTimeframe} → {sit.mtfTimeframe} → {sit.ltfTimeframe}
                  </td>
                  <td className="p-3 text-slate-300 text-[11px]">{sit.fibonacciLevel.split(' ')[0]}</td>
                  <td className="p-3 text-right font-bold text-amber-400 font-mono-code">{sit.finalTarget || '1.618'}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        sit.outcome === 'WIN_FULL_TP' || sit.outcome === 'PARTIAL_WIN'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : sit.outcome === 'LOSS_STOPPED'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sit.outcome.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendToTradeJournal(sit)}
                        className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold"
                      >
                        Journal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSituation(sit.id)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspecting Modal */}
      {inspectingSituation && (
        <SituationDetailModal
          situation={inspectingSituation}
          onClose={() => setInspectingSituation(null)}
          onEdit={() => {
            setEditingSituation(inspectingSituation);
            setInspectingSituation(null);
            setIsCreateModalOpen(true);
          }}
          onDelete={() => {
            handleDeleteSituation(inspectingSituation.id);
          }}
          onUpdateLesson={(id, lesson) => handleUpdateSituationLesson(id, lesson)}
          onSendToJournal={() => handleSendToTradeJournal(inspectingSituation)}
        />
      )}

      {/* Create / Edit Modal */}
      {isCreateModalOpen && (
        <CreateSituationModal
          isOpen={isCreateModalOpen}
          initialData={editingSituation}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingSituation(null);
          }}
          onSave={handleSaveSituation}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// SITUATION DETAIL MODAL
// -------------------------------------------------------------
interface SituationDetailModalProps {
  situation: MarketSituation;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateLesson?: (id: string, lesson: string) => void;
  onSendToJournal: () => void;
}

const SituationDetailModal: React.FC<SituationDetailModalProps> = ({
  situation,
  onClose,
  onEdit,
  onDelete,
  onUpdateLesson,
  onSendToJournal,
}) => {
  const [lessonDraft, setLessonDraft] = useState(situation.lessonsLearned || '');
  const [lessonSavedFeedback, setLessonSavedFeedback] = useState(false);

  const handleSaveLesson = () => {
    if (!lessonDraft.trim()) return;
    if (onUpdateLesson) {
      onUpdateLesson(situation.id, lessonDraft.trim());
      setLessonSavedFeedback(true);
      setTimeout(() => setLessonSavedFeedback(false), 2500);
    }
  };

  const [selectedInspectTf, setSelectedInspectTf] = useState<string>(
    situation.selectedTimeframe || situation.htfTimeframe || '1 week'
  );

  const activeTfList = SITUATION_TIMEFRAMES;
  const currentTfConfig = situation.timeframeConfigs?.[selectedInspectTf];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0b1120] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#080d19]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-white font-military">{situation.pair}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                situation.direction === 'BULLISH'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : situation.direction === 'BEARISH'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {situation.direction}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40 text-xs font-bold font-military">
              {situation.sbtModel}
            </span>
            <span className="text-[10px] text-slate-400 font-mono-code">
              {situation.session}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white font-military tracking-wide">{situation.title}</h2>
            <div className="text-xs text-slate-400 font-mono-code mt-1">
              Complete Multi-Timeframe Institutional Setup Architecture
            </div>
          </div>

          {/* Timeframe Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-mono-code">
                HTF Structure ({situation.htfTimeframe})
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{situation.htfContext || 'HTF bullish momentum and trend continuation.'}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block font-mono-code">
                MTF Setup ({situation.mtfTimeframe} - {situation.mtfStructure})
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{situation.mtfNotes || 'Clean break of structure & discount retest.'}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block font-mono-code">
                LTF Execution ({situation.ltfTimeframe} - {situation.ltfTrigger})
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{situation.ltfNotes || 'Confirmation trigger and liquidity displacement.'}</p>
            </div>
          </div>

          {/* Timeframe Selector & Full Configuration (Weekly, Daily, H4, etc.) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-100 font-military uppercase tracking-wide">
                  MULTI-TIMEFRAME SETUP PARAMETERS (WEEKLY, DAILY, H4 & MORE)
                </span>
              </div>
              <span className="text-[11px] text-cyan-400 font-mono-code">
                Viewing: <strong className="text-white">{selectedInspectTf}</strong>
              </span>
            </div>

            {/* Timeframe Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeTfList.map((tf) => {
                const conf = situation.timeframeConfigs?.[tf];
                const hasBias = conf && conf.bias && conf.bias !== 'None';
                const isSelected = selectedInspectTf === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setSelectedInspectTf(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : hasBias
                        ? 'bg-slate-900 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{tf}</span>
                    {hasBias && (
                      <span className={`w-1.5 h-1.5 rounded-full ${conf.bias === 'Bullish' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Timeframe Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code pt-1">
              {/* Direction Bias */}
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Timeframe Direction Bias
                </span>
                <div className="pt-0.5">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold inline-flex items-center gap-1 ${
                      currentTfConfig?.bias === 'Bullish'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : currentTfConfig?.bias === 'Bearish'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {currentTfConfig?.bias === 'Bullish' ? <TrendingUp className="w-3 h-3" /> : currentTfConfig?.bias === 'Bearish' ? <TrendingDown className="w-3 h-3" /> : null}
                    <span>{currentTfConfig?.bias || situation.direction || 'Neutral'}</span>
                  </span>
                </div>
              </div>

              {/* Retracements */}
              <div className="p-3 rounded-lg bg-slate-900/70 border border-cyan-500/20 space-y-1">
                <span className="text-[10px] text-cyan-400 font-bold uppercase block">
                  Fibonacci Retracements
                </span>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {(currentTfConfig?.fibonacciRetracements && currentTfConfig.fibonacciRetracements.length > 0) ? (
                    currentTfConfig.fibonacciRetracements.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 text-[11px]">
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs">
                      {situation.fibonacciLevel?.split(' ')[0] || '0.238, 0.38, 0.50'}
                    </span>
                  )}
                </div>
              </div>

              {/* Final Target */}
              <div className="p-3 rounded-lg bg-slate-900/70 border border-amber-500/20 space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">
                  Final Target & Extension
                </span>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 text-[11px]">
                    {currentTfConfig?.finalTarget || situation.finalTarget || '1.618'}
                  </span>
                  {currentTfConfig?.customTarget && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-200 border border-amber-500/25 text-[11px]">
                      {currentTfConfig.customTarget}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {currentTfConfig?.notes && (
              <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs text-slate-300">
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">TIMEFRAME SPECIFIC NOTES:</span>
                {currentTfConfig.notes}
              </div>
            )}
          </div>

          {/* Fundamental Confluence */}
          {situation.fundamentalConfluence && (
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono-code">
                Fundamental Intelligence Confluence
              </span>
              <p className="text-slate-300">{situation.fundamentalConfluence}</p>
            </div>
          )}

          {/* Interactive Golden Institutional Lesson Learned Editor */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-950 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-military font-bold text-xs uppercase tracking-wide">
                <Award className="w-4 h-4 text-amber-400" />
                <span>GOLDEN INSTITUTIONAL LESSON LEARNED</span>
              </div>
              {lessonSavedFeedback && (
                <span className="text-[11px] font-mono-code text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  ✓ Lesson Updated & Saved!
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Update and refine the core takeaway, institutional rule, or mistake prevention lesson learned from this market situation:
            </p>

            <textarea
              rows={3}
              value={lessonDraft}
              onChange={(e) => setLessonDraft(e.target.value)}
              placeholder="Write the golden institutional lesson learned from this market situation..."
              className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-3 text-amber-100 font-semibold text-xs leading-relaxed outline-none focus:border-amber-400"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500 font-mono-code">
                Edits save directly to this situation setup.
              </span>
              <button
                type="button"
                onClick={handleSaveLesson}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-amber-500/20"
              >
                Update & Save Lesson
              </button>
            </div>

            {situation.whatWentRight && (
              <div className="text-[11px] text-slate-300 mt-2 border-t border-amber-500/20 pt-2">
                <strong className="text-emerald-400 font-semibold">What went right:</strong> {situation.whatWentRight}
              </div>
            )}
            {situation.whatWentWrong && (
              <div className="text-[11px] text-slate-300 mt-1">
                <strong className="text-rose-400 font-semibold">Mistakes / what failed:</strong> {situation.whatWentWrong}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#080d19]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateSituationReportPdf(situation)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Download Institutional Situation PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              Edit Setup
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition cursor-pointer"
            >
              Delete
            </button>
          </div>
          <button
            type="button"
            onClick={onSendToJournal}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-cyan-500/20"
          >
            Send to Trade Journal
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// CREATE / EDIT SITUATION MODAL
// -------------------------------------------------------------
const SITUATION_TIMEFRAMES: SituationTimeframe[] = [
  '12 months',
  '6 months',
  '3 months',
  '1 month',
  '1 week',
  'Daily',
  'H4',
  'H1',
  'M30',
  'M15',
  'M5',
];

const FIB_RETRACEMENT_PRESETS = ['0.238', '0.38', '0.50', '0.618', '0.705', '0.786'];
const FIB_TARGET_PRESETS = ['1.414', '1.618', '1.272', '2.0'];

interface CreateSituationModalProps {
  isOpen: boolean;
  initialData?: MarketSituation | null;
  onClose: () => void;
  onSave: (situation: MarketSituation) => void;
}

const CreateSituationModal: React.FC<CreateSituationModalProps> = ({
  isOpen,
  initialData,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<MarketSituation>>(() => {
    if (initialData) return initialData;
    return {
      title: '',
      pair: 'EUR/USD',
      direction: 'BULLISH',
      sbtModel: 'SBT Model 1',
      session: 'LONDON',
      htfTimeframe: 'D1',
      htfTrend: 'BULLISH',
      htfContext: '',
      mtfTimeframe: 'H1',
      mtfStructure: 'BOS',
      mtfNotes: '',
      ltfTimeframe: 'M5',
      ltfTrigger: 'ORDER_BLOCK',
      ltfNotes: '',
      fibonacciLevel: '0.618 (OTE Golden Pocket)',
      entryPrice: 0,
      stopLossPrice: 0,
      takeProfit1: 0,
      plannedRiskReward: 3.0,
      marketConditions: ['High Liquidity'],
      fundamentalConfluence: '',
      outcome: 'SAVED_SETUP',
      realizedRiskReward: 0,
      lessonsLearned: '',
      notes: '',
      finalTarget: '1.618',
      selectedTimeframe: '1 week',
      tags: [],
    };
  });

  const [activeTf, setActiveTf] = useState<SituationTimeframe>(
    (initialData?.selectedTimeframe as SituationTimeframe) || '1 week'
  );

  const [timeframeConfigs, setTimeframeConfigs] = useState<Record<string, TimeframeScenarioConfig>>(() => {
    if (initialData?.timeframeConfigs) return initialData.timeframeConfigs;
    const initialMap: Record<string, TimeframeScenarioConfig> = {};
    SITUATION_TIMEFRAMES.forEach((tf) => {
      initialMap[tf] = {
        timeframe: tf,
        bias: tf === 'Daily' || tf === '1 week' ? (initialData?.direction === 'BEARISH' ? 'Bearish' : 'Bullish') : 'None',
        fibonacciRetracements: ['0.238', '0.38', '0.50'],
        fibonacciTargets: ['1.414', '1.618'],
        fibonacciLevels: ['0.238', '0.38', '0.50'],
        finalTarget: '1.618',
        notes: '',
      };
    });
    return initialMap;
  });

  const [customRetracementInput, setCustomRetracementInput] = useState('');
  const [customTargetInput, setCustomTargetInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUpdateTfConfig = (tf: string, updates: Partial<TimeframeScenarioConfig>) => {
    setTimeframeConfigs((prev) => ({
      ...prev,
      [tf]: {
        ...(prev[tf] || {
          timeframe: tf,
          bias: 'None',
          fibonacciRetracements: ['0.238', '0.38', '0.50'],
          fibonacciTargets: ['1.414', '1.618'],
          finalTarget: '1.618',
        }),
        ...updates,
      },
    }));
  };

  const handleToggleRetracement = (tf: string, level: string) => {
    const current = timeframeConfigs[tf]?.fibonacciRetracements || ['0.238', '0.38', '0.50'];
    const next = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    handleUpdateTfConfig(tf, { fibonacciRetracements: next, fibonacciLevels: next });
  };

  const handleAddCustomRetracement = (tf: string) => {
    const val = customRetracementInput.trim();
    if (!val) return;
    const current = timeframeConfigs[tf]?.fibonacciRetracements || ['0.238', '0.38', '0.50'];
    if (!current.includes(val)) {
      const next = [...current, val];
      handleUpdateTfConfig(tf, { fibonacciRetracements: next, fibonacciLevels: next });
    }
    setCustomRetracementInput('');
  };

  const handleToggleTarget = (tf: string, targetVal: string) => {
    const current = timeframeConfigs[tf]?.fibonacciTargets || ['1.414', '1.618'];
    const next = current.includes(targetVal)
      ? current.filter((t) => t !== targetVal)
      : [...current, targetVal];
    handleUpdateTfConfig(tf, {
      fibonacciTargets: next,
      finalTarget: next[0] || '1.618',
    });
  };

  const handleAddCustomTarget = (tf: string) => {
    const val = customTargetInput.trim();
    if (!val) return;
    const current = timeframeConfigs[tf]?.fibonacciTargets || ['1.414', '1.618'];
    if (!current.includes(val)) {
      const next = [...current, val];
      handleUpdateTfConfig(tf, {
        fibonacciTargets: next,
        finalTarget: val,
      });
    }
    setCustomTargetInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      setValidationError('Please enter a descriptive situation title.');
      return;
    }
    if (!formData.pair?.trim()) {
      setValidationError('Please enter or select a currency pair name.');
      return;
    }
    if (!formData.lessonsLearned?.trim()) {
      setValidationError('Please write at least one golden institutional lesson learned from this market situation.');
      return;
    }

    const currentTfConfig = timeframeConfigs[activeTf];
    const effectiveDirection =
      currentTfConfig?.bias === 'Bullish'
        ? 'BULLISH'
        : currentTfConfig?.bias === 'Bearish'
        ? 'BEARISH'
        : formData.direction || 'BULLISH';

    const savedRecord: MarketSituation = {
      id: initialData?.id || `sit_${Date.now()}`,
      title: formData.title.trim(),
      pair: (formData.pair || 'EUR/USD').toUpperCase().trim(),
      direction: effectiveDirection,
      sbtModel: formData.sbtModel || 'SBT Model 1',
      session: formData.session || 'LONDON',
      htfTimeframe: formData.htfTimeframe || 'D1',
      htfTrend: effectiveDirection,
      htfContext: formData.htfContext || `${activeTf} Structure Alignment`,
      mtfTimeframe: formData.mtfTimeframe || 'H1',
      mtfStructure: formData.mtfStructure || 'BOS',
      mtfNotes: formData.mtfNotes || '',
      ltfTimeframe: formData.ltfTimeframe || 'M5',
      ltfTrigger: formData.ltfTrigger || 'ORDER_BLOCK',
      ltfNotes: formData.ltfNotes || '',
      fibonacciLevel: (currentTfConfig?.fibonacciRetracements?.[0] || '0.500 (Equilibrium)') as FibonacciLevel,
      entryPrice: 0,
      stopLossPrice: 0,
      takeProfit1: 0,
      plannedRiskReward: 3.0,
      // Timeframe configs & separated Fibonacci levels
      timeframeConfigs,
      selectedTimeframe: activeTf,
      finalTarget: currentTfConfig?.finalTarget || currentTfConfig?.fibonacciTargets?.[0] || '1.618',
      notes: formData.notes?.trim() || '',
      marketConditions: formData.marketConditions || [],
      fundamentalConfluence: formData.fundamentalConfluence || '',
      outcome: formData.outcome || 'SAVED_SETUP',
      realizedRiskReward: formData.realizedRiskReward,
      lessonsLearned: formData.lessonsLearned.trim(),
      whatWentRight: formData.whatWentRight,
      whatWentWrong: formData.whatWentWrong,
      tags: [(formData.pair || 'EUR/USD').toUpperCase().trim(), formData.sbtModel || 'SBT Model 1', activeTf],
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedRecord);
  };

  const currentRetracements = timeframeConfigs[activeTf]?.fibonacciRetracements || ['0.238', '0.38', '0.50'];
  const currentTargets = timeframeConfigs[activeTf]?.fibonacciTargets || ['1.414', '1.618'];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0b1120] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#080d19]">
          <h2 className="text-base font-bold text-white font-military flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-cyan-400" />
            <span>{initialData ? 'EDIT MARKET SITUATION' : 'CREATE MARKET SITUATION'}</span>
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Situation Title */}
          <div>
            <label className="text-slate-300 block mb-1 font-bold">Situation Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. EUR/USD London Open Model (3) FVG Retest after Asian Sweep"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-semibold focus:border-cyan-400 outline-none"
            />
          </div>

          {/* Currency Pair Name (Manual Input + Quick Chips) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold">Currency Pair / Instrument Name *</label>
              <span className="text-[10px] text-cyan-400">Manual entry allowed (type any pair)</span>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. EUR/USD, GBP/JPY, XAU/USD, USOIL, BTC/USD"
              value={formData.pair}
              onChange={(e) => setFormData({ ...formData, pair: e.target.value.toUpperCase().trim() })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono-code font-bold uppercase focus:border-cyan-400 outline-none"
            />
            {/* Quick chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD', 'GBP/JPY', 'EUR/JPY', 'XAU/USD', 'XAG/USD', 'USOIL', 'BTC/USD'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, pair: p })}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono-code transition cursor-pointer ${
                    formData.pair === p
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframes Setup Grid (12 months down to M5) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider font-military flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>MULTI-TIMEFRAME SCENARIO CONFIGURATION ({SITUATION_TIMEFRAMES.length} TIMEFRAMES)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono-code">Select a timeframe to set Bias, Fibonacci & Final Target</span>
            </div>

            {/* Timeframe List Tabs */}
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5 font-mono-code text-[11px]">
              {SITUATION_TIMEFRAMES.map((tf) => {
                const isCurrent = activeTf === tf;
                const cfg = timeframeConfigs[tf];
                const bias = cfg?.bias;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setActiveTf(tf)}
                    className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="font-bold text-[10px]">{tf}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                        bias === 'Bullish'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : bias === 'Bearish'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {bias === 'Bullish' ? '▲ BULL' : bias === 'Bearish' ? '▼ BEAR' : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Timeframe Configuration Box */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-3 mt-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-cyan-300 uppercase">
                  CONFIGURING TIMEFRAME: <span className="text-white underline font-mono-code">{activeTf}</span>
                </span>
                <span className="text-[10px] text-slate-400">Settings apply specifically to {activeTf}</span>
              </div>

              {/* Directional Bias for this Timeframe */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px] font-bold">Directional Bias for {activeTf}:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateTfConfig(activeTf, { bias: 'Bullish' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-military transition flex items-center gap-1.5 ${
                      timeframeConfigs[activeTf]?.bias === 'Bullish'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>BULLISH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTfConfig(activeTf, { bias: 'Bearish' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-military transition flex items-center gap-1.5 ${
                      timeframeConfigs[activeTf]?.bias === 'Bearish'
                        ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>BEARISH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTfConfig(activeTf, { bias: 'None' })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white ${
                      timeframeConfigs[activeTf]?.bias === 'None' ? 'bg-slate-800 border border-slate-700' : ''
                    }`}
                  >
                    Neutral / Clear
                  </button>
                </div>
              </div>

              {/* Separate Categories: Fibonacci Retracement & Fibonacci Target */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Category 1: Fibonacci Retracement */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider font-military">
                      FIBONACCI RETRACEMENT
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono-code">{activeTf}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['0.238', '0.38', '0.50'].map((fib) => {
                      const isSelected = (timeframeConfigs[activeTf]?.fibonacciRetracements || ['0.238', '0.38', '0.50']).includes(fib);
                      return (
                        <button
                          key={fib}
                          type="button"
                          onClick={() => handleToggleRetracement(activeTf, fib)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono-code font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {fib}
                        </button>
                      );
                    })}
                    {/* Render any custom retracements added for this timeframe */}
                    {(timeframeConfigs[activeTf]?.fibonacciRetracements || [])
                      .filter((f) => !['0.238', '0.38', '0.50'].includes(f))
                      .map((fib) => (
                        <span
                          key={fib}
                          className="px-2 py-0.5 rounded text-[11px] font-mono-code font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 flex items-center gap-1"
                        >
                          <span>{fib}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleRetracement(activeTf, fib)}
                            className="hover:text-rose-400 cursor-pointer text-[10px]"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                  </div>

                  {/* Option to add custom level */}
                  <div className="pt-1">
                    <label className="text-slate-400 block mb-1 text-[10px]">
                      Optional: Add Custom Retracement Level
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. 0.618, 0.705, 0.786"
                        value={customRetracementInput}
                        onChange={(e) => setCustomRetracementInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomRetracement(activeTf);
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono-code outline-none focus:border-cyan-400 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomRetracement(activeTf)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category 2: Fibonacci Target */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-military">
                      FIBONACCI TARGET
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono-code">{activeTf}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['1.414', '1.618'].map((tgt) => {
                      const isSelected = (timeframeConfigs[activeTf]?.fibonacciTargets || ['1.414', '1.618']).includes(tgt);
                      return (
                        <button
                          key={tgt}
                          type="button"
                          onClick={() => handleToggleTarget(activeTf, tgt)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono-code font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/30 text-amber-200 border border-amber-400 shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {tgt}
                        </button>
                      );
                    })}
                    {/* Render any custom targets added for this timeframe */}
                    {(timeframeConfigs[activeTf]?.fibonacciTargets || [])
                      .filter((t) => !['1.414', '1.618'].includes(t))
                      .map((tgt) => (
                        <span
                          key={tgt}
                          className="px-2 py-0.5 rounded text-[11px] font-mono-code font-bold bg-amber-500/20 text-amber-200 border border-amber-400/50 flex items-center gap-1"
                        >
                          <span>{tgt}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleTarget(activeTf, tgt)}
                            className="hover:text-rose-400 cursor-pointer text-[10px]"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                  </div>

                  {/* Option to add custom target */}
                  <div className="pt-1">
                    <label className="text-slate-400 block mb-1 text-[10px]">
                      Optional: Add Custom Target Level
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. 1.272, 2.0, 1.0950, 2750.00"
                        value={customTargetInput}
                        onChange={(e) => setCustomTargetInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomTarget(activeTf);
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono-code outline-none focus:border-amber-400 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomTarget(activeTf)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeframe Specific Notes */}
              <div>
                <label className="text-slate-400 block mb-1 text-[10px]">Timeframe Observation for {activeTf}:</label>
                <input
                  type="text"
                  placeholder={`e.g. ${activeTf} liquidity sweep into order block and displacement`}
                  value={timeframeConfigs[activeTf]?.notes || ''}
                  onChange={(e) => handleUpdateTfConfig(activeTf, { notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Strategy Model & Session */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">SBT Playbook Model</label>
              <select
                value={formData.sbtModel}
                onChange={(e) => setFormData({ ...formData, sbtModel: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code focus:border-cyan-400 outline-none"
              >
                {ALL_SBT_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Trading Session</label>
              <select
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value as TradingSession })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code focus:border-cyan-400 outline-none"
              >
                <option value="LONDON">LONDON</option>
                <option value="NEW_YORK">NEW YORK</option>
                <option value="LONDON_NY_OVERLAP">LONDON-NY OVERLAP</option>
                <option value="ASIAN">ASIAN</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Outcome Status</label>
              <select
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value as SituationOutcome })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-code focus:border-cyan-400 outline-none"
              >
                <option value="SAVED_SETUP">Saved Setup (Pending / Tracking)</option>
                <option value="WIN_FULL_TP">Win (Full TP)</option>
                <option value="PARTIAL_WIN">Partial Win</option>
                <option value="BREAKEVEN">Breakeven</option>
                <option value="LOSS_STOPPED">Stopped Out (Loss)</option>
                <option value="INVALIDATED_MISSED">Invalidated / Missed</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Fundamental Confluence</label>
              <input
                type="text"
                placeholder="e.g. Fed hawkish divergence"
                value={formData.fundamentalConfluence}
                onChange={(e) => setFormData({ ...formData, fundamentalConfluence: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
              />
            </div>
          </div>

          {/* Dedicated Text Box for Manual Notes or Comments */}
          <div>
            <label className="text-slate-300 block mb-1 font-bold flex items-center justify-between">
              <span>Manual Notes / Comments *</span>
              <span className="text-[10px] text-slate-500 font-normal">Scenario observations, entry reasons, or annotations</span>
            </label>
            <textarea
              rows={3}
              placeholder="Enter manual scenario notes, setup reasons, session commentary, or trading thoughts here..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-400"
            />
          </div>

          {/* Golden Institutional Lesson Learned */}
          <div>
            <label className="text-amber-300 block mb-1 font-bold">
              Golden Institutional Lesson Learned *
            </label>
            <textarea
              required
              rows={2}
              placeholder="What is the critical takeaway for students and yourself when this exact market situation appears again?"
              value={formData.lessonsLearned}
              onChange={(e) => setFormData({ ...formData, lessonsLearned: e.target.value })}
              className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2.5 text-amber-100 outline-none font-semibold"
            />
          </div>

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
              {initialData ? 'Update Situation' : 'Confirm & Save Situation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
