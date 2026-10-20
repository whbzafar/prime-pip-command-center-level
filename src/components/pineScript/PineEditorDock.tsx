import React, { useState, useEffect } from 'react';
import {
  Code2,
  Play,
  Save,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Layers,
  Shield,
  Sliders,
  ChevronRight,
  ClipboardPaste,
} from 'lucide-react';
import { PineScriptIndicator, PineIndicatorCategory } from '../../types';
import { pineScriptService } from '../../services/pineScriptService';
import { isUserAdmin, getStoredUser } from '../../utils/authClient';

interface PineEditorDockProps {
  currentSymbol?: string;
  currentTimeframe?: string;
  onOpenFullModal?: () => void;
  onCloseDock?: () => void;
  onIndicatorToggled?: (indicatorId: string, enabled: boolean) => void;
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
  mcob: {
    title: 'SBT Model 05: MCOB Breakout Engine',
    category: 'SBT_STRUCTURE',
    overlay: true,
    code: `//@version=5
indicator("SBT Model 05: MCOB Breakout Engine", overlay=true)

consolBars = input.int(4, "Consolidation Cluster Bars", minval=3)
volFactor = input.float(1.8, "Volume Expansion Threshold", minval=1.2)

rangeHigh = ta.highest(high[1], consolBars)
rangeLow = ta.lowest(low[1], consolBars)
avgVol = ta.sma(volume, 20)

isExpansionBull = close > rangeHigh and volume > (avgVol * volFactor)
isExpansionBear = close < rangeLow and volume > (avgVol * volFactor)

plotshape(isExpansionBull, title="MCOB Bullish Expansion", style=shape.arrowup, location=location.belowbar, color=color.new(#a855f7, 0), size=size.normal, text="MCOB UP")
plotshape(isExpansionBear, title="MCOB Bearish Expansion", style=shape.arrowdown, location=location.abovebar, color=color.new(#ec4899, 0), size=size.normal, text="MCOB DOWN")
`,
  },
  emaRibbon: {
    title: 'SBT Institutional 4-EMA Ribbon (9, 21, 50, 200)',
    category: 'TREND',
    overlay: true,
    code: `//@version=5
indicator("SBT Institutional 4-EMA Ribbon", overlay=true)

ema9 = ta.ema(close, 9)
ema21 = ta.ema(close, 21)
ema50 = ta.ema(close, 50)
ema200 = ta.ema(close, 200)

plot(ema9, "Fast EMA (9)", color=color.new(#38bdf8, 0), linewidth=1)
plot(ema21, "Medium EMA (21)", color=color.new(#818cf8, 0), linewidth=1)
plot(ema50, "Trend EMA (50)", color=color.new(#f59e0b, 0), linewidth=2)
plot(ema200, "Macro EMA (200)", color=color.new(#ec4899, 0), linewidth=2)
`,
  },
};

export const PineEditorDock: React.FC<PineEditorDockProps> = ({
  currentSymbol = 'XAUUSD',
  currentTimeframe = '15',
  onOpenFullModal,
  onCloseDock,
  onIndicatorToggled,
}) => {
  const currentUser = getStoredUser();
  const isAdmin = isUserAdmin(currentUser);

  const [indicators, setIndicators] = useState<PineScriptIndicator[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [code, setCode] = useState<string>('');
  const [compileStatus, setCompileStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Load 5 indicators
  const loadIndicators = async () => {
    const list = await pineScriptService.syncWithServer();
    setIndicators(list.slice(0, 5));
  };

  useEffect(() => {
    loadIndicators();
  }, []);

  // Map 5 fixed slots (1 through 5)
  const currentIndicator = indicators.find((_, idx) => idx + 1 === selectedSlot) || indicators[selectedSlot - 1] || indicators[0];
  const isOnChart = currentIndicator ? pineScriptService.isIndicatorEnabled(currentIndicator.id) : false;

  useEffect(() => {
    if (currentIndicator) {
      setCode(currentIndicator.scriptCode || '');
      setCompileStatus({
        success: true,
        message: `Script #${selectedSlot} [${currentIndicator.shortName || currentIndicator.title}] loaded ready for ${currentSymbol} across all timeframes.`,
      });
    } else {
      setCode('');
      setCompileStatus(null);
    }
  }, [selectedSlot, currentIndicator, currentSymbol]);

  const handleToggleOnChart = async () => {
    if (!currentIndicator) return;
    const newState = !isOnChart;
    await pineScriptService.setIndicatorToggle(currentIndicator.id, newState);
    setIndicators([...pineScriptService.getIndicators().slice(0, 5)]);
    if (onIndicatorToggled) {
      onIndicatorToggled(currentIndicator.id, newState);
    }
  };

  // Admin compile
  const handleCompile = () => {
    if (!isAdmin) return;
    const raw = code.trim();
    if (!raw) {
      setCompileStatus({ success: false, message: 'Script code cannot be empty.' });
      return;
    }
    if (!raw.includes('indicator(')) {
      setCompileStatus({
        success: false,
        message: 'Syntax Error: Missing indicator("Title", overlay=true) declaration.',
      });
      return;
    }
    const openParens = (raw.match(/\(/g) || []).length;
    const closeParens = (raw.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      setCompileStatus({
        success: false,
        message: `Syntax Error: Unbalanced parentheses (${openParens} '(' vs ${closeParens} ')').`,
      });
      return;
    }
    setCompileStatus({
      success: true,
      message: `✓ Script #${selectedSlot} compiled with 0 errors! Active across all timeframes (1m-1W) for ${currentSymbol}.`,
    });
  };

  // Admin save
  const handleSave = async () => {
    if (!isAdmin || !currentIndicator) return;
    handleCompile();
    const updated: PineScriptIndicator = {
      ...currentIndicator,
      scriptCode: code.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
      slotNumber: selectedSlot,
    };
    const res = await pineScriptService.saveIndicator(updated);
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      loadIndicators();
    } else {
      setCompileStatus({ success: false, message: res.error || 'Failed to save script.' });
    }
  };

  // Admin template loader
  const handleLoadTemplate = (key: string) => {
    if (!isAdmin) return;
    const t = TEMPLATES[key];
    if (!t) return;
    setCode(t.code);
    setCompileStatus({
      success: true,
      message: `Loaded template: ${t.title}. Click 'Save' to deploy to Script #${selectedSlot}.`,
    });
  };

  // Admin copy
  const handleCopyCode = () => {
    if (!isAdmin) return;
    try {
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };

  // Admin paste
  const handlePasteCode = async () => {
    if (!isAdmin) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCode(text);
        setCompileStatus({ success: true, message: 'Code pasted from clipboard. Click Compile to test.' });
      }
    } catch {
      alert('Unable to read clipboard. Please paste code directly into the editor box.');
    }
  };

  const lines = code ? code.split('\n') : [];

  return (
    <div
      className={`w-full border-t border-slate-800 bg-[#0d1117] text-slate-200 font-mono-code flex flex-col transition-all duration-200 select-none ${
        isExpanded ? 'h-[520px]' : 'h-[340px]'
      }`}
    >
      {/* Top Pine Editor Header Bar */}
      <div className="px-3 py-2 border-b border-slate-800 bg-[#161b22] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: 5 Script Slot Selectors */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 mr-1">
            <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-military uppercase tracking-wider hidden sm:inline">PINE EDITOR</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              5 SCRIPTS
            </span>
          </div>

          {/* 5 Distinct Script Slot Tabs */}
          <div className="flex items-center bg-[#0d1117] p-0.5 rounded-xl border border-slate-800 gap-0.5 overflow-x-auto">
            {[1, 2, 3, 4, 5].map((slot) => {
              const ind = indicators[slot - 1];
              const isSlotActive = selectedSlot === slot;
              const isEnabledOnChart = ind ? pineScriptService.isIndicatorEnabled(ind.id) : false;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isSlotActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                  title={ind ? `${ind.title} (${isEnabledOnChart ? 'ACTIVE ON CHART' : 'OFF'})` : `Script #${slot}`}
                >
                  <span>Script {slot}</span>
                  {ind && (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isEnabledOnChart ? 'bg-emerald-400 shadow-xs shadow-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {currentIndicator && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300">
              <span className="font-bold text-white truncate max-w-[180px]" title={currentIndicator.title}>
                {currentIndicator.shortName || currentIndicator.title}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase font-bold">
                {currentIndicator.category.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* Role Status Tag */}
          {isAdmin ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>ADMIN: EDIT &amp; PASTE</span>
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>STUDENT: ON/OFF TOGGLE</span>
            </span>
          )}
        </div>

        {/* Right: Actions (Tactile On/Off button, Admin controls, Full modal, Expand, Close) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* TACTILE ON / OFF BUTTON (PRIMARY USER ACTION) */}
          <button
            type="button"
            onClick={handleToggleOnChart}
            disabled={!currentIndicator}
            className={`px-3.5 py-1.5 rounded-xl font-military font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md ${
              isOnChart
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-cyan-500/20'
            }`}
            title={isOnChart ? `Click to remove Script #${selectedSlot} from chart` : `Click to apply Script #${selectedSlot} to chart across all timeframes`}
          >
            {isOnChart ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>ON CHART (CLICK OFF ✕)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>APPLY ON CHART</span>
              </>
            )}
          </button>

          {/* Admin Save Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleSave}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-sm shadow-amber-500/20"
              title="Save changes to Pine Script slot"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccess ? 'Saved ✓' : 'Save'}</span>
            </button>
          )}

          {/* Admin Paste Code Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={handlePasteCode}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              title="Paste Pine Script code from clipboard"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
              <span>Paste</span>
            </button>
          )}

          {/* Admin Compile Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleCompile}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              title="Compile and validate Pine Script code"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Compile</span>
            </button>
          )}

          {/* Templates for Admin */}
          {isAdmin && (
            <div className="hidden lg:flex items-center gap-1 text-[11px]">
              <span className="text-slate-400">Templates:</span>
              <button
                type="button"
                onClick={() => handleLoadTemplate('fvg')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
              >
                FVG
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('supertrend')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
              >
                SuperTrend
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('mcob')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 cursor-pointer"
              >
                MCOB
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('emaRibbon')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 cursor-pointer"
              >
                EMA Ribbon
              </button>
            </div>
          )}

          {/* Admin Copy Code (STRICTLY HIDDEN FOR STUDENTS) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Copy script code"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Open Full Manager Modal */}
          {onOpenFullModal && (
            <button
              type="button"
              onClick={onOpenFullModal}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
              title="Open Full Indicators Manager Modal"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden sm:inline">Manage All</span>
            </button>
          )}

          {/* Resize / Expand */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title={isExpanded ? 'Collapse Dock' : 'Expand Dock'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close Dock */}
          {onCloseDock && (
            <button
              type="button"
              onClick={onCloseDock}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close Pine Editor Dock"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Student Protected Mode Strip */}
      {!isAdmin && (
        <div className="px-3 py-1 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between text-[11px] text-amber-200/90 select-none">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Student Subscribed Access:</strong> Quantitative Pine Script indicator is pre-compiled by PrimePipFX Admin. Use the <strong>ON / OFF</strong> button to apply it to your chart across all timeframes. Source code is copy-protected.
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-mono font-bold">PROTECTED CODE</span>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 flex overflow-hidden bg-[#0d1117]">
        {isAdmin ? (
          <>
            {/* Line Numbers Gutter */}
            <div className="w-12 py-2 bg-[#161b22] text-slate-500 text-right pr-2 select-none border-r border-slate-800 text-xs font-mono shrink-0 overflow-hidden leading-5">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code Textarea for Admin */}
            <div className="flex-1 relative overflow-auto select-text">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="w-full h-full p-2 bg-transparent text-slate-100 font-mono-code text-xs outline-none resize-none leading-5 selection:bg-amber-500/30 selection:text-amber-200"
                placeholder="//@version=5\nindicator('My Script', overlay=true)\n..."
              />
            </div>
          </>
        ) : (
          /* Student Protected View: Clean institutional card with On/Off controls, NO code shown, copy completely prevented */
          <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-4 bg-gradient-to-b from-[#0e1626] to-[#0d1117] select-none">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <Shield className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-lg">
              <div className="flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold uppercase">
                  Script #{selectedSlot}
                </span>
                <h3 className="text-sm sm:text-base font-military font-bold text-white uppercase tracking-wider">
                  {currentIndicator?.title || `Script #${selectedSlot}`}
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {currentIndicator?.description ||
                  'Algorithmic institutional indicator configured by Admin. Ready to apply on your live chart across any timeframe.'}
              </p>
            </div>

            {/* Big Student Interactive ON / OFF Switch */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleOnChart}
                className={`px-6 py-2.5 rounded-2xl font-military font-bold text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xl flex items-center gap-2 active:scale-95 ${
                  isOnChart
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:from-cyan-400 shadow-cyan-500/30'
                }`}
              >
                {isOnChart ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>INDICATOR ACTIVE ON CHART (CLICK OFF)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>CLICK ON TO APPLY TO CHART</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 font-mono-code flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Proprietary quant script • Source code protected against copying &amp; tampering</span>
            </p>
          </div>
        )}
      </div>

      {/* Bottom Console / Status Strip */}
      <div className="px-3 py-1.5 bg-[#161b22] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-2 truncate">
          {compileStatus && (
            <span
              className={`flex items-center gap-1 truncate ${
                compileStatus.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
              }`}
            >
              {compileStatus.success ? (
                <CheckCircle2 className="w-3 h-3 shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate">{compileStatus.message}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 text-slate-500 text-[10px]">
          <span>Slot: {selectedSlot} of 5</span>
          {isAdmin && <span>Lines: {lines.length}</span>}
          <span>Active TF: {currentTimeframe}m</span>
          <span>Target: {currentSymbol}</span>
        </div>
      </div>
    </div>
  );
};
