import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  Search,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Upload,
  Edit3,
  Trash2,
  X,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Check,
  ShieldCheck,
  Award,
  Zap,
} from 'lucide-react';
import {
  SavedPairScenario,
  PairSaverTimeframe,
  TimeframeScenarioDetails,
} from '../../types/pairSaverTypes';
import { generatePairScenarioReportPdf } from '../../utils/fundamentalPdfGenerator';

interface PairSaverProps {
  onOpenNewTrade?: (prefill?: any) => void;
  onNavigateTab?: (tab: string) => void;
}

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
];

const DEFAULT_RETRACEMENT_PRESETS = ['0.23', '0.38', '0.50', '0.618', '0.705', '0.786'];
const DEFAULT_TARGET_PRESETS = ['1.272', '1.414', '1.618', '2.0'];
const DEFAULT_OPTIONAL_TARGET_PRESETS = ['2.0', '2.618', '3.14', 'Runner'];

export const PairSaver: React.FC<PairSaverProps> = ({
  onOpenNewTrade,
  onNavigateTab,
}) => {
  const [savedScenarios, setSavedScenarios] = useState<SavedPairScenario[]>(() => {
    try {
      const saved = localStorage.getItem(SCENARIOS_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
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
        timeframeDetails: {
          Weekly: { bias: 'Bullish', retracements: ['0.38', '0.50', '0.618'], finalTarget: '1.618', optionalTarget: '2.0' },
          Daily: { bias: 'Bullish', retracements: ['0.50', '0.618'], finalTarget: '1.618', optionalTarget: '1.0950' },
          H4: { bias: 'Bullish', retracements: ['0.618', '0.705'], finalTarget: '1.414', optionalTarget: '1.618' },
          H1: { bias: 'Bearish', retracements: ['0.50'], finalTarget: '1.272', optionalTarget: '1.414' },
          M30: { bias: 'Bullish', retracements: ['0.38', '0.50'], finalTarget: '1.618', optionalTarget: '2.0' },
          M15: { bias: 'Bullish', retracements: ['0.50', '0.618'], finalTarget: '1.618', optionalTarget: 'Runner' },
          M5: { bias: 'Bullish', retracements: ['0.618'], finalTarget: '1.414', optionalTarget: '1.618' },
          M3: { bias: 'Bullish', retracements: ['0.50'], finalTarget: '1.272', optionalTarget: '1.414' },
          M1: { bias: 'Bullish', retracements: ['0.38'], finalTarget: '1.272', optionalTarget: '1.414' },
        },
        retracements: ['0.23', '0.38', '0.50'],
        customRetracements: ['0.618'],
        finalTargets: ['1.414', '1.618'],
        customFinalTargets: ['1.0950'],
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
        timeframeDetails: {
          Weekly: { bias: 'Bullish', retracements: ['0.38', '0.50'], finalTarget: '1.618', optionalTarget: '2.618' },
          Daily: { bias: 'Bullish', retracements: ['0.50', '0.618'], finalTarget: '1.618', optionalTarget: '195.50' },
          H4: { bias: 'Bullish', retracements: ['0.618', '0.705'], finalTarget: '1.618', optionalTarget: '2.0' },
          H1: { bias: 'Bullish', retracements: ['0.50', '0.618'], finalTarget: '1.414', optionalTarget: '1.618' },
          M30: { bias: 'Bullish', retracements: ['0.50'], finalTarget: '1.414', optionalTarget: '1.618' },
          M15: { bias: 'Bearish', retracements: ['0.38', '0.50'], finalTarget: '1.272', optionalTarget: '1.414' },
          M5: { bias: 'Bullish', retracements: ['0.618'], finalTarget: '1.414', optionalTarget: 'Runner' },
          M3: { bias: 'Bullish', retracements: ['0.50'], finalTarget: '1.272', optionalTarget: '1.414' },
          M1: { bias: 'Bullish', retracements: ['0.38'], finalTarget: '1.272', optionalTarget: '1.414' },
        },
        retracements: ['0.38', '0.50'],
        customRetracements: ['0.705'],
        finalTargets: ['1.618'],
        customFinalTargets: ['195.50'],
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
        timeframeDetails: {
          Weekly: { bias: 'Bullish', retracements: ['0.38', '0.50'], finalTarget: '1.618', optionalTarget: '2750.00' },
          Daily: { bias: 'Bullish', retracements: ['0.50', '0.618', '0.786'], finalTarget: '1.618', optionalTarget: '2.618' },
          H4: { bias: 'Bullish', retracements: ['0.618'], finalTarget: '1.618', optionalTarget: '2.0' },
          H1: { bias: 'Bullish', retracements: ['0.50', '0.618'], finalTarget: '1.414', optionalTarget: '1.618' },
          M30: { bias: 'Bullish', retracements: ['0.50'], finalTarget: '1.414', optionalTarget: 'Runner' },
          M15: { bias: 'Bullish', retracements: ['0.38', '0.50'], finalTarget: '1.414', optionalTarget: '1.618' },
          M5: { bias: 'Bullish', retracements: ['0.50'], finalTarget: '1.272', optionalTarget: '1.414' },
          M3: { bias: 'Bullish', retracements: ['0.38'], finalTarget: '1.272', optionalTarget: '1.414' },
          M1: { bias: 'Bullish', retracements: ['0.23'], finalTarget: '1.272', optionalTarget: '1.414' },
        },
        retracements: ['0.23', '0.50'],
        customRetracements: ['0.786'],
        finalTargets: ['1.414', '1.618'],
        customFinalTargets: ['2750.00'],
        notes: 'Institutional safe haven & real yield tailwind with full multi-timeframe bullish alignment.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<SavedPairScenario | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(savedScenarios));
    } catch {}
  }, [savedScenarios]);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteScenario = (id: string) => {
    setSavedScenarios((prev) => {
      const next = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    showNotification('Pair scenario deleted.', 'info');
  };

  const handleSaveScenario = (scenario: SavedPairScenario) => {
    setSavedScenarios((prev) => {
      const idx = prev.findIndex((s) => s.id === scenario.id);
      let next: SavedPairScenario[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = scenario;
      } else {
        next = [scenario, ...prev];
      }
      try {
        localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setIsModalOpen(false);
    setEditingScenario(null);
    showNotification(editingScenario ? 'Pair scenario updated.' : 'New pair scenario saved.');
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedScenarios, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `primepip_pair_scenarios_${new Date().toISOString().slice(0, 10)}.json`);
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
          setSavedScenarios(imported);
          showNotification(`Successfully imported ${imported.length} pair scenarios!`);
        }
      } catch {
        showNotification('Invalid JSON file format.', 'info');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredScenarios = useMemo(() => {
    if (!searchQuery.trim()) return savedScenarios;
    const q = searchQuery.toLowerCase().trim();
    return savedScenarios.filter(
      (s) =>
        s.pair.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q))
    );
  }, [savedScenarios, searchQuery]);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs font-mono-code shadow-2xl animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950/20 to-slate-950 border border-blue-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-cyan-400 border border-blue-500/30 font-mono-code">
                MULTI-TIMEFRAME SCENARIO SAVER
              </span>
              <span className="text-[10px] text-slate-400 font-mono-code">
                {savedScenarios.length} Saved Scenarios
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-military tracking-wide text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-cyan-400" />
              <span>PAIR INTELLIGENCE & SCENARIO SAVER</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Track directional structure from Weekly down to M1, calibrate Fibonacci retracement zones, and define institutional final targets for each currency pair.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingScenario(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-military text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition hover:scale-105 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>CREATE PAIR SCENARIO</span>
            </button>

            <button
              onClick={() => generatePairScenarioReportPdf(savedScenarios)}
              disabled={savedScenarios.length === 0}
              className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Download all saved pair scenarios as PDF report"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download All PDF</span>
            </button>

            <button
              onClick={handleExportJson}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs transition cursor-pointer"
              title="Export Scenarios to JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            <label
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs transition cursor-pointer"
              title="Import Scenarios from JSON"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search saved scenarios by pair (e.g. EUR/USD, XAU/USD) or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200 text-xs outline-none focus:border-cyan-400"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Scenarios Grid */}
      {filteredScenarios.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold font-military uppercase text-white tracking-wider">
              {searchQuery ? 'No matching pair scenarios found' : 'No Saved Pair Scenarios Yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? 'Try searching with another symbol or clearing your query.'
                : 'Click "Create Pair Scenario" above to configure your multi-timeframe directional bias, Fibonacci retracements, and final targets.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => {
                setEditingScenario(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-military text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>CREATE FIRST PAIR SCENARIO</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredScenarios.map((scenario) => {
            const retracementsList = [
              ...(scenario.retracements || []),
              ...(scenario.customRetracements || []),
            ];
            const finalTargetsList = [
              ...(scenario.finalTargets || []),
              ...(scenario.customFinalTargets || []),
            ];

            return (
              <div
                key={scenario.id}
                className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/40 transition shadow-xl space-y-4"
              >
                {/* Top Row: Symbol, Updated Date, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold font-mono-code text-white tracking-wide">
                      {scenario.pair}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-code">
                      Updated: {new Date(scenario.updatedAt || scenario.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => generatePairScenarioReportPdf(scenario)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Download PDF Report for this scenario"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingScenario(scenario);
                        setIsModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Edit this scenario"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScenario(scenario.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Delete this scenario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* 9 Timeframes Direction Alignment Strip */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 font-mono-code uppercase tracking-wider block">
                    Direction For Each Time Frame:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 font-mono-code text-xs">
                    {PAIR_SAVER_TIMEFRAMES.map((tf) => {
                      const bias = scenario.timeframeBiases[tf];
                      const isBull = bias === 'Bullish';
                      const isBear = bias === 'Bearish';
                      return (
                        <div
                          key={tf}
                          className={`p-2 rounded-xl text-center border flex flex-col items-center justify-center gap-1 ${
                            isBull
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : isBear
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              : 'bg-slate-900/60 border-slate-800 text-slate-500'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-300">{tf}</span>
                          <span
                            className={`text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 ${
                              isBull
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isBear
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {isBull ? (
                              <>
                                <TrendingUp className="w-2.5 h-2.5" />
                                <span>BULL</span>
                              </>
                            ) : isBear ? (
                              <>
                                <TrendingDown className="w-2.5 h-2.5" />
                                <span>BEAR</span>
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-Timeframe Retracements, Final Targets & Optional Targets */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono-code block">
                    TIMEFRAME FIBONACCI RETRACEMENTS, FINAL TARGETS & OPTIONAL TARGETS:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono-code">
                    {PAIR_SAVER_TIMEFRAMES.filter((tf) => {
                      const d = scenario.timeframeDetails?.[tf];
                      const bias = scenario.timeframeBiases[tf];
                      return bias || (d && (d.retracements?.length || d.finalTarget));
                    }).slice(0, 6).map((tf) => {
                      const d = scenario.timeframeDetails?.[tf];
                      const bias = scenario.timeframeBiases[tf] || d?.bias || 'Neutral';
                      const retracements = (d?.retracements && d.retracements.length > 0)
                        ? d.retracements
                        : (scenario.retracements || ['0.23', '0.38', '0.50']);
                      const finalTgt = d?.finalTarget || scenario.finalTargets?.[0] || '1.618';
                      const optTgt = d?.optionalTarget || scenario.customFinalTargets?.[0] || '2.0';

                      return (
                        <div key={tf} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{tf}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                bias === 'Bullish'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : bias === 'Bearish'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {bias}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            <span className="text-cyan-400 font-semibold">Retracement: </span>
                            <span className="text-slate-300">{retracements.join(', ')}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                            <div>
                              <span className="text-amber-400 font-semibold">Final: </span>
                              <span className="text-amber-300 font-bold">{finalTgt}</span>
                            </div>
                            <div>
                              <span className="text-indigo-400 font-semibold">Optional: </span>
                              <span className="text-indigo-300 font-bold">{optTgt}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scenario Notes */}
                {scenario.notes && (
                  <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300 leading-relaxed font-sans">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider font-mono-code">
                      Scenario Notes & Commentary:
                    </span>
                    {scenario.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT SCENARIO MODAL */}
      {isModalOpen && (
        <PairScenarioModal
          initialScenario={editingScenario}
          onClose={() => {
            setIsModalOpen(false);
            setEditingScenario(null);
          }}
          onSave={handleSaveScenario}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------
// CREATE / EDIT PAIR SCENARIO MODAL COMPONENT
// ----------------------------------------------------
interface PairScenarioModalProps {
  initialScenario: SavedPairScenario | null;
  onClose: () => void;
  onSave: (scenario: SavedPairScenario) => void;
}

const PairScenarioModal: React.FC<PairScenarioModalProps> = ({
  initialScenario,
  onClose,
  onSave,
}) => {
  const [pairName, setPairName] = useState(initialScenario?.pair || 'EUR/USD');
  const [activeTfTab, setActiveTfTab] = useState<PairSaverTimeframe>('Weekly');

  const [timeframeBiases, setTimeframeBiases] = useState<
    Record<PairSaverTimeframe, 'Bullish' | 'Bearish' | null>
  >(() => {
    if (initialScenario?.timeframeBiases) return initialScenario.timeframeBiases;
    const initialMap: Record<PairSaverTimeframe, 'Bullish' | 'Bearish' | null> = {
      Weekly: 'Bullish',
      Daily: 'Bullish',
      H4: 'Bullish',
      H1: 'Bullish',
      M30: 'Bullish',
      M15: 'Bullish',
      M5: 'Bullish',
      M3: 'Bullish',
      M1: 'Bullish',
    };
    return initialMap;
  });

  const [timeframeDetails, setTimeframeDetails] = useState<
    Record<PairSaverTimeframe, TimeframeScenarioDetails>
  >(() => {
    const map: Record<PairSaverTimeframe, TimeframeScenarioDetails> = {} as any;
    PAIR_SAVER_TIMEFRAMES.forEach((tf) => {
      const existing = initialScenario?.timeframeDetails?.[tf];
      map[tf] = {
        bias: existing?.bias || initialScenario?.timeframeBiases?.[tf] || 'Bullish',
        retracements: existing?.retracements && existing.retracements.length > 0
          ? existing.retracements
          : (initialScenario?.retracements && initialScenario.retracements.length > 0 ? initialScenario.retracements : ['0.23', '0.38', '0.50']),
        customRetracement: existing?.customRetracement || '',
        finalTarget: existing?.finalTarget || (initialScenario?.finalTargets?.[0] || '1.618'),
        customFinalTarget: existing?.customFinalTarget || '',
        optionalTarget: existing?.optionalTarget || '2.0',
        customOptionalTarget: existing?.customOptionalTarget || '',
        notes: existing?.notes || '',
      };
    });
    return map;
  });

  const [notes, setNotes] = useState(initialScenario?.notes || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [customRetraceInput, setCustomRetraceInput] = useState('');
  const [customFinalTargetInput, setCustomFinalTargetInput] = useState('');
  const [customOptTargetInput, setCustomOptTargetInput] = useState('');

  const currentTfDetails = timeframeDetails[activeTfTab];

  const handleUpdateTfDetail = (tf: PairSaverTimeframe, updates: Partial<TimeframeScenarioDetails>) => {
    setTimeframeDetails((prev) => ({
      ...prev,
      [tf]: {
        ...prev[tf],
        ...updates,
      },
    }));
  };

  const handleToggleTfRetracement = (tf: PairSaverTimeframe, lvl: string) => {
    const current = timeframeDetails[tf].retracements || [];
    const next = current.includes(lvl) ? current.filter((x) => x !== lvl) : [...current, lvl];
    handleUpdateTfDetail(tf, { retracements: next });
  };

  const handleAddCustomRetracement = (tf: PairSaverTimeframe) => {
    const val = customRetraceInput.trim();
    if (!val) return;
    const current = timeframeDetails[tf].retracements || [];
    if (!current.includes(val)) {
      handleUpdateTfDetail(tf, { retracements: [...current, val] });
    }
    setCustomRetraceInput('');
  };

  const handleAddCustomFinalTarget = (tf: PairSaverTimeframe) => {
    const val = customFinalTargetInput.trim();
    if (!val) return;
    handleUpdateTfDetail(tf, { finalTarget: val });
    setCustomFinalTargetInput('');
  };

  const handleAddCustomOptTarget = (tf: PairSaverTimeframe) => {
    const val = customOptTargetInput.trim();
    if (!val) return;
    handleUpdateTfDetail(tf, { optionalTarget: val });
    setCustomOptTargetInput('');
  };

  const handleApplyToAllTimeframes = () => {
    const source = timeframeDetails[activeTfTab];
    setTimeframeDetails((prev) => {
      const next: Record<PairSaverTimeframe, TimeframeScenarioDetails> = {} as any;
      PAIR_SAVER_TIMEFRAMES.forEach((tf) => {
        next[tf] = {
          ...prev[tf],
          retracements: [...source.retracements],
          finalTarget: source.finalTarget,
          optionalTarget: source.optionalTarget,
        };
      });
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairName.trim()) {
      setValidationError('Please enter a currency pair or instrument name.');
      return;
    }

    const detailsList = Object.values(timeframeDetails) as TimeframeScenarioDetails[];
    const allRetracements = Array.from(
      new Set(detailsList.flatMap((d) => d.retracements || []))
    );
    const allFinalTargets = Array.from(
      new Set(detailsList.map((d) => d.finalTarget).filter(Boolean) as string[])
    );
    const allOptTargets = Array.from(
      new Set(detailsList.map((d) => d.optionalTarget).filter(Boolean) as string[])
    );

    const record: SavedPairScenario = {
      id: initialScenario?.id || `scen_${Date.now()}`,
      pair: pairName.toUpperCase().trim(),
      timeframeBiases,
      timeframeDetails,
      retracements: allRetracements.length > 0 ? allRetracements : ['0.23', '0.38', '0.50'],
      finalTargets: allFinalTargets.length > 0 ? allFinalTargets : ['1.618'],
      optionalTargets: allOptTargets,
      notes: notes.trim(),
      createdAt: initialScenario?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(record);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0b1120] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#080d19]">
          <h2 className="text-base font-bold text-white font-military flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <span>{initialScenario ? 'EDIT PAIR SCENARIO' : 'CREATE PAIR SCENARIO'}</span>
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono-code text-xs">
              {validationError}
            </div>
          )}

          {/* 1. Currency Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold font-military uppercase tracking-wide">
                Currency Name / Instrument *
              </label>
              <span className="text-[10px] text-cyan-400 font-mono-code">Type any pair or click below</span>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. EUR/USD, GBP/JPY, XAU/USD, USOIL, BTC/USD"
              value={pairName}
              onChange={(e) => {
                setPairName(e.target.value.toUpperCase());
                setValidationError(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono-code font-bold uppercase focus:border-cyan-400 outline-none text-sm"
            />
            {/* Quick chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {POPULAR_PAIRS.map((p) => (
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

          {/* 2. Select Direction, Retracement, Final & Optional Targets for Each Timeframe */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <label className="text-xs font-bold text-white uppercase tracking-wider font-military flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>SELECT DIRECTION & FIBONACCI TARGETS FOR EACH TIMEFRAME</span>
                </label>
                <p className="text-[11px] text-slate-400 font-mono-code mt-0.5">
                  Configure Retracement, Final Target, and Optional Target for Weekly down to M1
                </p>
              </div>

              <button
                type="button"
                onClick={handleApplyToAllTimeframes}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold font-military flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                title="Copies current Retracement, Final Target & Optional Target to all other timeframes"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>APPLY TO ALL TIMEFRAMES</span>
              </button>
            </div>

            {/* Timeframe Selector Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {PAIR_SAVER_TIMEFRAMES.map((tf) => {
                const bias = timeframeBiases[tf];
                const isSelected = activeTfTab === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setActiveTfTab(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : bias === 'Bullish'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : bias === 'Bearish'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <span>{tf}</span>
                    {bias && (
                      <span className={`w-1.5 h-1.5 rounded-full ${bias === 'Bullish' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Timeframe Detailed Configuration Panel */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-military font-bold text-white text-sm">
                  TIMEFRAME: <span className="text-cyan-400">{activeTfTab}</span>
                </span>
                {/* Bias Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTimeframeBiases((prev) => ({ ...prev, [activeTfTab]: 'Bullish' }));
                      handleUpdateTfDetail(activeTfTab, { bias: 'Bullish' });
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold font-military flex items-center gap-1 transition cursor-pointer ${
                      timeframeBiases[activeTfTab] === 'Bullish'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    <span>BULLISH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimeframeBiases((prev) => ({ ...prev, [activeTfTab]: 'Bearish' }));
                      handleUpdateTfDetail(activeTfTab, { bias: 'Bearish' });
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold font-military flex items-center gap-1 transition cursor-pointer ${
                      timeframeBiases[activeTfTab] === 'Bearish'
                        ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                        : 'bg-slate-800 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <TrendingDown className="w-3 h-3" />
                    <span>BEARISH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimeframeBiases((prev) => ({ ...prev, [activeTfTab]: null }));
                      handleUpdateTfDetail(activeTfTab, { bias: null });
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer ${
                      timeframeBiases[activeTfTab] === null ? 'bg-slate-800 border border-slate-700 text-slate-200' : ''
                    }`}
                  >
                    Neutral
                  </button>
                </div>
              </div>

              {/* Retracements, Final Target & Optional Target for active timeframe */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-code text-xs">
                {/* 1. Fibonacci Retracement */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/20 space-y-2">
                  <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                    1. Fibonacci Retracement Levels
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DEFAULT_RETRACEMENT_PRESETS.map((lvl) => {
                      const isSelected = currentTfDetails.retracements?.includes(lvl);
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => handleToggleTfRetracement(activeTfTab, lvl)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Custom (e.g. 0.705)"
                      value={customRetraceInput}
                      onChange={(e) => setCustomRetraceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomRetracement(activeTfTab);
                        }
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomRetracement(activeTfTab)}
                      className="px-2 py-1 rounded bg-slate-800 text-cyan-300 text-[11px] font-bold"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* 2. Final Target */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-amber-500/20 space-y-2">
                  <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    2. Final Target
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DEFAULT_TARGET_PRESETS.map((tgt) => {
                      const isSelected = currentTfDetails.finalTarget === tgt;
                      return (
                        <button
                          key={tgt}
                          type="button"
                          onClick={() => handleUpdateTfDetail(activeTfTab, { finalTarget: tgt })}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/30 text-amber-200 border border-amber-400'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {tgt}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Custom (e.g. 1.0950)"
                      value={customFinalTargetInput}
                      onChange={(e) => setCustomFinalTargetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomFinalTarget(activeTfTab);
                        }
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomFinalTarget(activeTfTab)}
                      className="px-2 py-1 rounded bg-slate-800 text-amber-300 text-[11px] font-bold"
                    >
                      Set
                    </button>
                  </div>
                </div>

                {/* 3. Optional Target */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-indigo-500/20 space-y-2">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                    3. Optional Target
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DEFAULT_OPTIONAL_TARGET_PRESETS.map((opt) => {
                      const isSelected = currentTfDetails.optionalTarget === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleUpdateTfDetail(activeTfTab, { optionalTarget: opt })}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Custom (e.g. 2.618)"
                      value={customOptTargetInput}
                      onChange={(e) => setCustomOptTargetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomOptTarget(activeTfTab);
                        }
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomOptTarget(activeTfTab)}
                      className="px-2 py-1 rounded bg-slate-800 text-indigo-300 text-[11px] font-bold"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Notes / Commentary */}
          <div>
            <label className="text-slate-300 block mb-1 font-bold font-military uppercase tracking-wide">
              Scenario Notes & Observations
            </label>
            <textarea
              rows={3}
              placeholder="Enter institutional narrative, order block retests, liquidity sweeps, or execution notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 outline-none focus:border-cyan-400 text-xs leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              {initialScenario ? 'Update Scenario' : 'Save Scenario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
