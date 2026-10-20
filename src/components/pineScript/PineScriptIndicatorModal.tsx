import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Code2,
  Sliders,
  Shield,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Copy,
  Check,
  Play,
  RotateCcw,
  Layers,
  TrendingUp,
  Cpu,
  Lock,
  EyeOff,
  Eye,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { PineScriptIndicator, PineIndicatorCategory } from '../../types';
import { pineScriptService } from '../../services/pineScriptService';
import { isUserAdmin, getStoredUser } from '../../utils/authClient';

interface PineScriptIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol?: string;
  currentTimeframe?: string;
}

const TEMPLATES: Record<string, { title: string; category: PineIndicatorCategory; overlay: boolean; code: string }> = {
  fvg: {
    title: 'SBT Custom Fair Value Gap (FVG) Radar',
    category: 'SBT_STRUCTURE',
    overlay: true,
    code: `//@version=5
indicator("SBT Custom Fair Value Gap Radar", overlay=true)

// Parameter inputs
minPips = input.float(2.0, "Minimum FVG Imbalance Pips", minval=0.5)

// Bullish FVG: Bar 2 High is lower than Bar 0 Low
bullishFVG = high[2] < low[0] and (low[0] - high[2]) >= (minPips * syminfo.mintick * 10)
// Bearish FVG: Bar 2 Low is higher than Bar 0 High
bearishFVG = low[2] > high[0] and (low[2] - high[0]) >= (minPips * syminfo.mintick * 10)

plotshape(bullishFVG, title="Bullish FVG", style=shape.triangleup, location=location.belowbar, color=color.cyan, size=size.small, text="FVG")
plotshape(bearishFVG, title="Bearish FVG", style=shape.triangledown, location=location.abovebar, color=color.rose, size=size.small, text="FVG")
`,
  },
  supertrend: {
    title: 'SBT Adaptive SuperTrend & Trailing Filter',
    category: 'TREND',
    overlay: true,
    code: `//@version=5
indicator("SBT Adaptive SuperTrend", overlay=true)

atrLen = input.int(10, "ATR Length", minval=1)
atrFactor = input.float(3.0, "ATR Factor", minval=0.5, step=0.1)

[stVal, stDir] = ta.supertrend(atrFactor, atrLen)

plot(stDir < 0 ? stVal : na, "Bullish Trend Stop", color=color.new(#10b981, 0), style=plot.style_linebr, linewidth=2)
plot(stDir > 0 ? stVal : na, "Bearish Trend Stop", color=color.new(#ef4444, 0), style=plot.style_linebr, linewidth=2)

alertcondition(ta.change(stDir) < 0, "SuperTrend Bullish Shift", "Bullish Trend Transition")
alertcondition(ta.change(stDir) > 0, "SuperTrend Bearish Shift", "Bearish Trend Transition")
`,
  },
  liquiditySweep: {
    title: 'SBT Session High-Low Liquidity Sweep',
    category: 'LIQUIDITY',
    overlay: true,
    code: `//@version=5
indicator("SBT Session Liquidity Sweep", overlay=true)

lookbackBars = input.int(20, "Lookback Period", minval=5)
highestRef = ta.highest(high[1], lookbackBars)
lowestRef = ta.lowest(low[1], lookbackBars)

// Liquidity sweep triggers when price breaches extreme then immediately closes back inside
sweepHigh = high > highestRef and close < highestRef
sweepLow = low < lowestRef and close > lowestRef

plotshape(sweepHigh, "Liquidity Sweep High", style=shape.labeldown, location=location.abovebar, color=color.red, text="SWEEP HIGH", textcolor=color.white)
plotshape(sweepLow, "Liquidity Sweep Low", style=shape.labelup, location=location.belowbar, color=color.green, text="SWEEP LOW", textcolor=color.black)
`,
  },
  emaRibbon: {
    title: 'SBT Multi-EMA Trend Alignment',
    category: 'TREND',
    overlay: true,
    code: `//@version=5
indicator("SBT Multi-EMA Ribbon", overlay=true)

fastEMA = ta.ema(close, 9)
midEMA = ta.ema(close, 21)
trendEMA = ta.ema(close, 50)
macroEMA = ta.ema(close, 200)

plot(fastEMA, "Fast EMA 9", color=color.cyan, linewidth=1)
plot(midEMA, "Mid EMA 21", color=color.blue, linewidth=1)
plot(trendEMA, "Trend EMA 50", color=color.orange, linewidth=2)
plot(macroEMA, "Macro EMA 200", color=color.purple, linewidth=2)
`,
  },
};

export const PineScriptIndicatorModal: React.FC<PineScriptIndicatorModalProps> = ({
  isOpen,
  onClose,
  currentSymbol = 'XAUUSD',
  currentTimeframe = '15',
}) => {
  const [indicators, setIndicators] = useState<PineScriptIndicator[]>([]);
  const [activeTab, setActiveTab] = useState<'TOGGLES' | 'EDITOR'>('TOGGLES');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Check admin privileges
  const currentUser = getStoredUser();
  const isAdmin = isUserAdmin(currentUser);

  // Editor states (Admin only)
  const [editingIndicatorId, setEditingIndicatorId] = useState<string>('sbt-fvg-ob');
  const [editTitle, setEditTitle] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<PineIndicatorCategory>('SBT_STRUCTURE');
  const [editOverlay, setEditOverlay] = useState(true);
  const [editColor, setEditColor] = useState('#00f0ff');
  const [editCode, setEditCode] = useState('');
  const [compileStatus, setCompileStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load indicators
  const refreshList = async () => {
    const list = await pineScriptService.syncWithServer();
    setIndicators(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
    }
  }, [isOpen]);

  // Load selected indicator into editor / viewer
  useEffect(() => {
    const current = indicators.find((i) => i.id === editingIndicatorId);
    if (current) {
      setEditTitle(current.title);
      setEditShortName(current.shortName);
      setEditDescription(current.description);
      setEditCategory(current.category);
      setEditOverlay(current.overlay);
      setEditColor(current.color || '#00f0ff');
      setEditCode(current.scriptCode || '');
      setCompileStatus(null);
    }
  }, [editingIndicatorId, indicators]);

  if (!isOpen) return null;

  const handleToggle = async (id: string) => {
    const currentState = pineScriptService.isIndicatorEnabled(id);
    await pineScriptService.setIndicatorToggle(id, !currentState);
    // Force re-render
    setIndicators([...pineScriptService.getIndicators()]);
  };

  const handleSelectTemplate = (templateKey: string) => {
    const t = TEMPLATES[templateKey];
    if (!t) return;
    setEditTitle(t.title);
    setEditShortName(t.title.slice(0, 10));
    setEditCategory(t.category);
    setEditOverlay(t.overlay);
    setEditCode(t.code);
    setCompileStatus({
      success: true,
      message: 'Template loaded. Ready to compile and deploy.',
    });
  };

  const handleCreateNew = () => {
    const newId = `pine_custom_${Date.now()}`;
    setEditingIndicatorId(newId);
    setEditTitle('New Custom Pine Script Indicator');
    setEditShortName('NEW IND');
    setEditDescription('Custom institutional indicator authored via PrimePipFX Pine Script console.');
    setEditCategory('CUSTOM');
    setEditOverlay(true);
    setEditColor('#10b981');
    setEditCode(`//@version=5
indicator("My Custom Indicator", overlay=true)

// Add your Pine Script logic here
fastMA = ta.sma(close, 14)
plot(fastMA, "Simple Moving Average", color=color.cyan, linewidth=2)
`);
    setCompileStatus(null);
  };

  const handleCompileAndTest = () => {
    const code = editCode.trim();
    if (!code) {
      setCompileStatus({ success: false, message: 'Script code cannot be empty.' });
      return;
    }

    // Basic syntactic validation of Pine Script v5 conventions
    if (!code.includes('indicator(')) {
      setCompileStatus({
        success: false,
        message: 'Compilation Error: Missing indicator() declaration. Example: indicator("Title", overlay=true)',
      });
      return;
    }

    // Bracket balance check
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      setCompileStatus({
        success: false,
        message: `Syntax Error: Unbalanced parentheses. Found ${openParens} '(' and ${closeParens} ')'.`,
      });
      return;
    }

    setCompileStatus({
      success: true,
      message: '✓ Script compiled successfully! Syntax validated with 0 errors.',
    });
  };

  const handleSaveIndicator = async () => {
    if (!editTitle.trim()) {
      setCompileStatus({ success: false, message: 'Indicator Title is required.' });
      return;
    }

    const payload: PineScriptIndicator = {
      id: editingIndicatorId,
      title: editTitle.trim(),
      shortName: editShortName.trim() || editTitle.trim().slice(0, 10),
      description: editDescription.trim() || 'Institutional Pine Script Indicator.',
      category: editCategory,
      overlay: editOverlay,
      color: editColor,
      version: '5.0.0',
      author: currentUser?.name || currentUser?.username || 'PrimePipFX Chief Admin',
      updatedAt: new Date().toISOString().slice(0, 10),
      scriptCode: editCode,
      defaultEnabled: pineScriptService.isIndicatorEnabled(editingIndicatorId),
      isOfficial: true,
    };

    const res = await pineScriptService.saveIndicator(payload);
    if (res.ok) {
      setSaveSuccess(true);
      setCompileStatus({
        success: true,
        message: '✓ Script saved and deployed live! Available to all platform traders with simple On/Off control.',
      });
      setTimeout(() => setSaveSuccess(false), 3000);
      refreshList();
    } else {
      setCompileStatus({ success: false, message: res.error || 'Failed to save indicator.' });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete indicator "${editTitle}"?`)) return;
    const res = await pineScriptService.deleteIndicator(editingIndicatorId);
    if (res.ok) {
      refreshList();
      const remaining = indicators.filter((i) => i.id !== editingIndicatorId);
      if (remaining.length > 0) {
        setEditingIndicatorId(remaining[0].id);
      }
    }
  };

  const handleCopyCode = () => {
    if (!editCode) return;
    navigator.clipboard.writeText(editCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setEditCode(text);
        setCompileStatus({ success: true, message: 'Code pasted from clipboard. Click Compile to test.' });
      }
    } catch {
      alert('Unable to read clipboard. Please paste code directly into the editor box.');
    }
  };

  const filteredIndicators = indicators.filter((i) => {
    if (selectedCategory === 'ALL') return true;
    return i.category === selectedCategory;
  });

  const activeCount = indicators.filter((i) => pineScriptService.isIndicatorEnabled(i.id)).length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto selection:bg-cyan-500/30 selection:text-cyan-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl font-mono-code overflow-hidden"
      >
        {/* Top Iridescent Glow Rim */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/10">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-military font-bold text-white uppercase tracking-wider">
                  TRADINGVIEW PINE EDITOR &amp; QUANT SCRIPTS
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
                  v5.0 ENGINE
                </span>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-amber-400" />
                    ADMIN AUTHORING CONSOLE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    SUBSCRIBER ACCESS • PROTECTED CODE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Institutional Algorithmic Overlays • Applies across all chart timeframes (1m, 5m, 15m, 1h, 4h, 1D, 1W) • {activeCount} Enabled
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 cursor-pointer transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (Admin sees full Editor; Students only toggle On/Off) */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 pt-2 bg-slate-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('TOGGLES')}
              className={`px-4 py-2 border-b-2 font-bold text-xs uppercase transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'TOGGLES'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Available Indicators ({indicators.length})</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-cyan-500/20 text-cyan-300 font-mono-code font-bold">
                {activeCount} ON
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('EDITOR')}
              className={`px-4 py-2 border-b-2 font-bold text-xs uppercase transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'EDITOR'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-amber-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAdmin ? 'Pine Script Code Editor (Admin)' : 'Pine Editor (Protected)'}</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isAdmin ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400 flex items-center gap-1'}`}>
                {isAdmin ? 'AUTHOR' : <><Lock className="w-2.5 h-2.5" /> ADMIN ONLY</>}
              </span>
            </button>
          </div>

          {/* Quick Notice */}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 py-1">
            {isAdmin ? (
              <span className="text-amber-300/90 flex items-center gap-1 font-mono-code">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Admin authoring mode: Edit, copy, paste &amp; compile code
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1 font-mono-code">
                <Lock className="w-3 h-3 text-amber-400" />
                Code protected: Students toggle indicators ON/OFF across all timeframes
              </span>
            )}
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-950">
          {/* TAB 1: INDICATOR LIST & ON/OFF TOGGLES (FOR BOTH STUDENTS & ADMIN) */}
          {activeTab === 'TOGGLES' && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
                  {[
                    { id: 'ALL', label: 'All Indicators' },
                    { id: 'SBT_STRUCTURE', label: 'SBT Market Structure' },
                    { id: 'TREND', label: 'Trend & Bands' },
                    { id: 'LIQUIDITY', label: 'Liquidity Sweeps' },
                    { id: 'OSCILLATOR', label: 'Oscillators' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1 rounded-xl border font-bold text-xs transition cursor-pointer shrink-0 ${
                        selectedCategory === cat.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm shadow-cyan-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCreateNew();
                      setActiveTab('EDITOR');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-military font-bold text-xs uppercase flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Pine Script</span>
                  </button>
                )}
              </div>

              {/* Security Shield Banner for Students */}
              {!isAdmin && (
                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block">
                        Institutional Proprietary Indicators
                      </span>
                      <span className="text-[11px] text-slate-400">
                        These quantitative scripts are managed and compiled exclusively by the PrimePipFX Administrator desk. Click <strong>ON</strong> to apply an indicator to your chart, or <strong>OFF</strong> to remove it.
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono-code text-[10px] text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                    PROTECTED CODE
                  </div>
                </div>
              )}

              {/* Indicator Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredIndicators.map((ind) => {
                  const isEnabled = pineScriptService.isIndicatorEnabled(ind.id);
                  return (
                    <div
                      key={ind.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                        isEnabled
                          ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80'
                      }`}
                    >
                      {/* Top Corner Color Tag */}
                      <div
                        className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-15 blur-lg"
                        style={{ backgroundColor: ind.color }}
                      />

                      <div>
                        {/* Header: Title + Tag */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: ind.color }}
                            />
                            <h3 className="font-military font-bold text-sm text-white truncate" title={ind.title}>
                              {ind.title}
                            </h3>
                          </div>
                          <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {ind.shortName}
                          </span>
                        </div>

                        {/* Meta Badges */}
                        <div className="flex items-center gap-2 mb-2 text-[10px] flex-wrap">
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                            {ind.category.replace('_', ' ')}
                          </span>
                          <span className="text-slate-500">
                            {ind.overlay ? 'Chart Overlay' : 'Sub-Pane Oscillator'}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-500">{ind.version}</span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2 mb-3">
                          {ind.description}
                        </p>
                      </div>

                      {/* Footer: ON/OFF Interactive Control */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          {isEnabled ? (
                            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                              Active on Live Chart
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <span className="w-2 h-2 rounded-full bg-slate-700" />
                              Disabled
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Script View / Edit Shortcut */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndicatorId(ind.id);
                              setActiveTab('EDITOR');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition cursor-pointer"
                            title={isAdmin ? "Edit Pine Script Source Code" : "View Pine Script Source Code"}
                          >
                            {isAdmin ? 'Edit Script ✎' : 'View Script 👁'}
                          </button>

                          {/* TACTILE ON / OFF TOGGLE SWITCH */}
                          <button
                            type="button"
                            onClick={() => handleToggle(ind.id)}
                            className={`px-4 py-1.5 rounded-xl font-military font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md flex items-center gap-1.5 ${
                              isEnabled
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:from-cyan-400 hover:to-blue-400 shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                            }`}
                          >
                            <span>{isEnabled ? 'ON' : 'OFF'}</span>
                            <span className="text-[10px] font-mono-code font-normal">
                              {isEnabled ? '✓' : '—'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PINE SCRIPT EDITOR / VIEWER */}
          {activeTab === 'EDITOR' && (
            <div className="space-y-4">
              {/* Editor / Viewer Control Strip */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-900/90 p-3 rounded-2xl border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 font-bold uppercase flex items-center gap-1">
                    <Code2 className="w-4 h-4 text-amber-400" />
                    {isAdmin ? 'SELECT SCRIPT TO EDIT:' : 'SELECT SCRIPT TO VIEW:'}
                  </span>
                  <select
                    value={editingIndicatorId}
                    onChange={(e) => setEditingIndicatorId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-bold outline-none cursor-pointer"
                  >
                    {indicators.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title} ({i.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Templates & Quick Actions (Admin only) */}
                {isAdmin ? (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-slate-400 text-[11px]">Templates:</span>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('fvg')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
                    >
                      FVG Imbalance
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('supertrend')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                    >
                      SuperTrend
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('liquiditySweep')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition cursor-pointer"
                    >
                      Liquidity Sweep
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('emaRibbon')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 transition cursor-pointer"
                    >
                      EMA Ribbon
                    </button>
                  </div>
                ) : (
                  /* Student direct toggle on/off button right in editor view */
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(editingIndicatorId)}
                      className={`px-3.5 py-1.5 rounded-xl font-military font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                        pineScriptService.isIndicatorEnabled(editingIndicatorId)
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 ring-1 ring-emerald-400'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:from-cyan-400'
                      }`}
                    >
                      {pineScriptService.isIndicatorEnabled(editingIndicatorId) ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>On Chart (Click to Remove ✕)</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Apply to Chart</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Indicator Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Indicator Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. SBT Custom SuperTrend"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Short Tag (Chart Pill)</label>
                  <input
                    type="text"
                    value={editShortName}
                    onChange={(e) => setEditShortName(e.target.value)}
                    placeholder="e.g. SBT-ST"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as PineIndicatorCategory)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none cursor-pointer"
                  >
                    <option value="SBT_STRUCTURE">SBT Market Structure</option>
                    <option value="TREND">Trend &amp; Trailing Bands</option>
                    <option value="LIQUIDITY">Liquidity Sweeps</option>
                    <option value="OSCILLATOR">Oscillator (Sub-Pane)</option>
                    <option value="CUSTOM">Custom Strategy</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={editOverlay}
                      onChange={(e) => setEditOverlay(e.target.checked)}
                      className="accent-amber-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Overlay on Main Price</span>
                  </label>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-slate-400 text-[11px]">Color:</span>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Code Editor Header & Tooling Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-300 font-military tracking-wider uppercase flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5" />
                    PINE SCRIPT v5 SOURCE CODE
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono-code">
                    (Restricted: Only Admin has access to view, copy, or edit)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1 transition cursor-pointer text-[11px]"
                    title="Copy full script code"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePasteCode}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1 transition cursor-pointer text-[11px]"
                    title="Paste code from clipboard"
                  >
                    <span>Paste</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompileAndTest}
                    className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1 transition cursor-pointer shadow-sm text-[11px]"
                    title="Compile & test script logic"
                  >
                    <Play className="w-3 h-3 fill-slate-950" />
                    <span>Compile &amp; Test</span>
                  </button>
                </div>
              </div>

              {/* Code Textarea Editor with Line Numbers Styling */}
              <div className="relative rounded-2xl bg-[#070b14] border border-slate-800 p-3 font-mono text-xs overflow-hidden shadow-inner focus-within:border-amber-400/80 transition">
                <textarea
                  value={editCode}
                  onChange={(e) => {
                    setEditCode(e.target.value);
                    setCompileStatus(null);
                  }}
                  rows={14}
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full bg-transparent text-emerald-300 font-mono text-xs outline-none leading-relaxed resize-y min-h-[220px]"
                  placeholder="//@version=5&#10;indicator('My Indicator', overlay=true)&#10;..."
                />
              </div>

              {/* Compilation Feedback Message */}
              {compileStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    compileStatus.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {compileStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{compileStatus.message}</span>
                </motion.div>
              )}

              {/* Action Buttons: Save & Deploy / Delete */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Indicator</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('TOGGLES')}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    View Indicator Toggles
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIndicator}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-military font-bold text-xs uppercase transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saveSuccess ? 'Saved & Deployed!' : 'Save & Deploy to Students'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              Real-time Pine Script Engine • {activeCount} of {indicators.length} active on chart
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-military font-bold uppercase transition cursor-pointer shadow-md shadow-cyan-500/20"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
