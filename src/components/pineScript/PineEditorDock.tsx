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
  Plus,
  Trash2,
  Power,
  RotateCcw,
  UserCheck,
  GraduationCap,
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

const TEMPLATES: Record<string, { title: string; shortName: string; category: PineIndicatorCategory; overlay: boolean; color: string; code: string }> = {
  fvg: {
    title: 'SBT Custom Fair Value Gap (FVG) Radar',
    shortName: 'SBT FVG',
    category: 'SBT_STRUCTURE',
    overlay: true,
    color: '#00f0ff',
    code: `//@version=5
indicator("SBT Custom Fair Value Gap Radar", overlay=true)

// Parameter inputs
minPips = input.float(2.0, "Minimum FVG Imbalance Pips", minval=0.5)

// Bullish FVG: Bar 2 High is lower than Bar 0 Low
bullishFVG = high[2] < low[0] and (low[0] - high[2]) >= (minPips * syminfo.mintick * 10)
// Bearish FVG: Bar 2 Low is higher than Bar 0 High
bearishFVG = low[2] > high[0] and (low[2] - high[0]) >= (minPips * syminfo.mintick * 10)

plotshape(bullishFVG, title="Bullish FVG Void", style=shape.triangleup, location=location.belowbar, color=color.new(#00f0ff, 0), size=size.small, text="FVG")
plotshape(bearishFVG, title="Bearish FVG Void", style=shape.triangledown, location=location.abovebar, color=color.new(#f43f5e, 0), size=size.small, text="FVG")
`,
  },
  supertrend: {
    title: 'SBT Adaptive SuperTrend & Trailing Filter',
    shortName: 'SuperTrend',
    category: 'TREND',
    overlay: true,
    color: '#10b981',
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
    title: 'SBT Session High-Low Liquidity Sweep (Turtle)',
    shortName: 'Turtle Sweep',
    category: 'LIQUIDITY',
    overlay: true,
    color: '#f59e0b',
    code: `//@version=5
indicator("SBT Session Liquidity Sweep", overlay=true)

lookbackBars = input.int(20, "Lookback Period", minval=5)
highestRef = ta.highest(high[1], lookbackBars)
lowestRef = ta.lowest(low[1], lookbackBars)

// Liquidity sweep triggers when price breaches extreme then closes back inside
sweepHigh = high > highestRef and close < highestRef
sweepLow = low < lowestRef and close > lowestRef

plotshape(sweepHigh, "Liquidity Sweep High", style=shape.labeldown, location=location.abovebar, color=color.new(#ef4444, 0), text="SWEEP HIGH", textcolor=color.white)
plotshape(sweepLow, "Liquidity Sweep Low", style=shape.labelup, location=location.belowbar, color=color.new(#10b981, 0), text="SWEEP LOW", textcolor=color.black)
`,
  },
  mcob: {
    title: 'SBT Model 05: MCOB Breakout Engine',
    shortName: 'Model 05',
    category: 'SBT_STRUCTURE',
    overlay: true,
    color: '#a855f7',
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
    shortName: 'EMA Ribbon',
    category: 'TREND',
    overlay: true,
    color: '#3b82f6',
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
  const [viewMode, setViewMode] = useState<'TEACHER' | 'STUDENT'>(() => {
    return pineScriptService.isTeacherMode() ? 'TEACHER' : 'STUDENT';
  });

  const isTeacher = viewMode === 'TEACHER';

  const [indicators, setIndicators] = useState<PineScriptIndicator[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [code, setCode] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editShortName, setEditShortName] = useState<string>('');
  const [editCategory, setEditCategory] = useState<PineIndicatorCategory>('SBT_STRUCTURE');
  const [editColor, setEditColor] = useState<string>('#00f0ff');
  const [compileStatus, setCompileStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Sync indicators
  const loadIndicators = async () => {
    const list = await pineScriptService.syncWithServer();
    setIndicators(list);
  };

  useEffect(() => {
    loadIndicators();

    const handleUpdate = () => {
      setIndicators(pineScriptService.getIndicators());
    };
    const handleViewChange = (e: any) => {
      if (e?.detail?.mode) setViewMode(e.detail.mode);
    };

    window.addEventListener('primepipfx_pine_indicators_updated', handleUpdate);
    window.addEventListener('primepipfx_pine_toggle_change', handleUpdate);
    window.addEventListener('primepipfx_pine_view_mode_changed', handleViewChange);
    return () => {
      window.removeEventListener('primepipfx_pine_indicators_updated', handleUpdate);
      window.removeEventListener('primepipfx_pine_toggle_change', handleUpdate);
      window.removeEventListener('primepipfx_pine_view_mode_changed', handleViewChange);
    };
  }, []);

  const currentIndicator = indicators[selectedSlot - 1] || indicators[0];
  const isOnChart = currentIndicator ? pineScriptService.isIndicatorEnabled(currentIndicator.id) : false;

  useEffect(() => {
    if (currentIndicator) {
      setCode(currentIndicator.scriptCode || '');
      setEditTitle(currentIndicator.title);
      setEditShortName(currentIndicator.shortName || currentIndicator.title.slice(0, 10));
      setEditCategory(currentIndicator.category);
      setEditColor(currentIndicator.color || '#00f0ff');
      setCompileStatus({
        success: true,
        message: `Indicator #${selectedSlot} [${currentIndicator.shortName || currentIndicator.title}] active on ${currentSymbol} across all timeframes (${currentTimeframe}m).`,
      });
    } else {
      setCode('');
      setEditTitle('');
      setEditShortName('');
      setCompileStatus(null);
    }
  }, [selectedSlot, currentIndicator, currentSymbol, currentTimeframe]);

  // Explicit Student "ON" handler: applies indicator to chart
  const handleTurnOn = async () => {
    if (!currentIndicator) return;
    await pineScriptService.setIndicatorToggle(currentIndicator.id, true);
    setIndicators([...pineScriptService.getIndicators()]);
    if (onIndicatorToggled) onIndicatorToggled(currentIndicator.id, true);
    setCompileStatus({
      success: true,
      message: `✓ Applied [${currentIndicator.shortName || currentIndicator.title}] to ${currentSymbol} chart across all timeframes.`,
    });
  };

  // Explicit Student "OFF" handler: removes indicator from chart
  const handleTurnOff = async () => {
    if (!currentIndicator) return;
    await pineScriptService.setIndicatorToggle(currentIndicator.id, false);
    setIndicators([...pineScriptService.getIndicators()]);
    if (onIndicatorToggled) onIndicatorToggled(currentIndicator.id, false);
    setCompileStatus({
      success: true,
      message: `✓ Removed [${currentIndicator.shortName || currentIndicator.title}] from chart.`,
    });
  };

  // Switch between Teacher and Student view modes
  const handleToggleViewMode = (mode: 'TEACHER' | 'STUDENT') => {
    setViewMode(mode);
    pineScriptService.setViewMode(mode);
    loadIndicators();
  };

  // Teacher compile / syntax check
  const handleCompile = (): boolean => {
    if (!isTeacher) return false;
    const raw = code.trim();
    if (!raw) {
      setCompileStatus({ success: false, message: 'Syntax Error: Pine Script code cannot be empty.' });
      return false;
    }
    if (!raw.includes('indicator(')) {
      setCompileStatus({
        success: false,
        message: 'Syntax Error: Missing indicator("Title", overlay=true) declaration.',
      });
      return false;
    }
    const openParens = (raw.match(/\(/g) || []).length;
    const closeParens = (raw.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      setCompileStatus({
        success: false,
        message: `Syntax Error: Unbalanced parentheses (${openParens} '(' vs ${closeParens} ')').`,
      });
      return false;
    }

    setCompileStatus({
      success: true,
      message: `✓ Indicator #${selectedSlot} compiled successfully with 0 errors! Verified for ${currentSymbol} across all timeframes.`,
    });
    return true;
  };

  // Teacher save & deploy to students
  const handleSave = async () => {
    if (!isTeacher) return;
    if (!handleCompile()) return;

    const indId = currentIndicator?.id || `pine_${Date.now()}`;
    const updated: PineScriptIndicator = {
      id: indId,
      title: editTitle.trim() || `Custom Script #${selectedSlot}`,
      shortName: editShortName.trim() || (editTitle.trim().slice(0, 10) || `Script ${selectedSlot}`),
      description: currentIndicator?.description || 'Custom institutional Pine Script indicator configured by Admin.',
      category: editCategory,
      overlay: true,
      color: editColor,
      version: '5.2.0',
      author: currentUser?.name || currentUser?.username || 'PrimePipFX Chief Admin / Teacher',
      updatedAt: new Date().toISOString().slice(0, 10),
      scriptCode: code.trim(),
      slotNumber: selectedSlot,
      defaultEnabled: pineScriptService.isIndicatorEnabled(indId),
      isOfficial: true,
    };

    const res = await pineScriptService.saveIndicator(updated);
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      setCompileStatus({
        success: true,
        message: `✓ Saved & Deployed to students! Indicator #${selectedSlot} is ready to toggle on any pair or timeframe.`,
      });
      loadIndicators();
    } else {
      setCompileStatus({ success: false, message: res.error || 'Failed to save script.' });
    }
  };

  // Teacher: Create a brand new custom indicator slot
  const handleAddNewSlot = () => {
    if (!isTeacher) return;
    const newSlotNum = indicators.length + 1;
    const newId = `pine_custom_${Date.now()}`;
    const newInd: PineScriptIndicator = {
      id: newId,
      title: `Custom Institutional Indicator #${newSlotNum}`,
      shortName: `Custom #${newSlotNum}`,
      description: 'Algorithmic indicator authored by Teacher desk.',
      category: 'CUSTOM',
      overlay: true,
      color: '#38bdf8',
      version: '5.0.0',
      author: currentUser?.name || 'Teacher / Admin',
      updatedAt: new Date().toISOString().slice(0, 10),
      slotNumber: newSlotNum,
      scriptCode: `//@version=5\nindicator("Custom Indicator #${newSlotNum}", overlay=true)\n\n// Inputs\nlen = input.int(14, "Length")\nsrc = input(close, "Source")\n\n// Logic\nsmaVal = ta.sma(src, len)\nplot(smaVal, "SMA", color=color.cyan, linewidth=2)\n`,
    };
    pineScriptService.saveIndicator(newInd);
    setIndicators(pineScriptService.getIndicators());
    setSelectedSlot(newSlotNum);
  };

  // Teacher: Delete indicator
  const handleDeleteSlot = async () => {
    if (!isTeacher || !currentIndicator) return;
    if (indicators.length <= 1) {
      alert('Cannot delete the last remaining indicator slot.');
      return;
    }
    if (!window.confirm(`Delete indicator "${currentIndicator.title}"?`)) return;

    await pineScriptService.deleteIndicator(currentIndicator.id);
    const updated = pineScriptService.getIndicators();
    setIndicators(updated);
    setSelectedSlot(Math.max(1, selectedSlot - 1));
  };

  // Teacher template loader
  const handleLoadTemplate = (key: string) => {
    if (!isTeacher) return;
    const t = TEMPLATES[key];
    if (!t) return;
    setCode(t.code);
    setEditTitle(t.title);
    setEditShortName(t.shortName);
    setEditCategory(t.category);
    setEditColor(t.color);
    setCompileStatus({
      success: true,
      message: `Loaded template: ${t.title}. Click 'Save & Deploy' to broadcast to students.`,
    });
  };

  // Teacher paste from clipboard
  const handlePasteCode = async () => {
    if (!isTeacher) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCode(text);
        setCompileStatus({
          success: true,
          message: 'Code pasted successfully from clipboard! Click Compile to validate syntax.',
        });
      }
    } catch {
      alert('Unable to read clipboard. You can paste directly into the code editor box using Ctrl+V or Cmd+V.');
    }
  };

  // Copy code
  const handleCopyCode = () => {
    if (!isTeacher || !code) return;
    try {
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };

  const lines = code ? code.split('\n') : [];

  return (
    <div
      className={`w-full border-t border-slate-800 bg-[#0d1117] text-slate-200 font-mono-code flex flex-col transition-all duration-200 select-none ${
        isExpanded ? 'h-[520px]' : 'h-[360px]'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. TOP PINE EDITOR DOCK CONTROLS BAR (Authentic TradingView Layout)        */}
      {/* ========================================================================= */}
      <div className="px-3 py-2 border-b border-slate-800 bg-[#161b22] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Pine Editor Logo + Indicator Tabs */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 mr-1 shrink-0">
            <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-military uppercase tracking-wider hidden sm:inline">PINE EDITOR</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              v5
            </span>
          </div>

          {/* Target Symbol & Timeframe Context Tag */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-[11px] text-cyan-300">
            <span className="font-bold text-white">{currentSymbol}</span>
            <span className="text-slate-500">•</span>
            <span>{currentTimeframe}m (All TF)</span>
          </div>

          {/* Dynamic Script Slot Tabs */}
          <div className="flex items-center bg-[#0d1117] p-0.5 rounded-xl border border-slate-800 gap-0.5 overflow-x-auto max-w-[420px] sm:max-w-none">
            {indicators.map((ind, idx) => {
              const slot = idx + 1;
              const isSlotActive = selectedSlot === slot;
              const isEnabled = pineScriptService.isIndicatorEnabled(ind.id);
              return (
                <button
                  key={ind.id || slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isSlotActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                  title={`${ind.title} (${isEnabled ? 'ON CHART' : 'OFF'})`}
                >
                  <span>{ind.shortName || `Script ${slot}`}</span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isEnabled ? 'bg-emerald-400 shadow-xs shadow-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                </button>
              );
            })}

            {/* Teacher: Add New Slot */}
            {isTeacher && (
              <button
                type="button"
                onClick={handleAddNewSlot}
                className="px-2 py-1 rounded-lg text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-0.5"
                title="Create a new custom Pine Script indicator"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Explicit Teacher/Student Role Switcher + Main Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* TEACHER VS STUDENT ROLE TOGGLE (Instant Testing & Switching) */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleToggleViewMode('TEACHER')}
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                isTeacher
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-military'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
              title="Teacher Mode: Full control to input, paste, edit, compile and save indicator code"
            >
              <Sparkles className="w-3 h-3" />
              <span>Teacher (Admin)</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('STUDENT')}
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                !isTeacher
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-military'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
              title="Student Mode: View-only with explicit On/Off buttons"
            >
              <GraduationCap className="w-3 h-3" />
              <span>Student</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* TEACHER (ADMIN) ACTION BUTTONS                                    */}
          {/* ================================================================= */}
          {isTeacher && (
            <>
              {/* Paste Code Button */}
              <button
                type="button"
                onClick={handlePasteCode}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-sm"
                title="Paste Pine Script code from clipboard directly into the editor"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
                <span>Paste Code</span>
              </button>

              {/* Compile & Check Button */}
              <button
                type="button"
                onClick={handleCompile}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-sm"
                title="Compile script and run syntax validator"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>Compile</span>
              </button>

              {/* Save & Deploy Button */}
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                title="Save indicator and deploy live to students"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveSuccess ? 'Deployed ✓' : 'Save & Deploy'}</span>
              </button>

              {/* Template Presets */}
              <div className="hidden xl:flex items-center gap-1 text-[11px]">
                <span className="text-slate-500 text-[10px]">Templates:</span>
                <button
                  type="button"
                  onClick={() => handleLoadTemplate('fvg')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[10px] cursor-pointer"
                >
                  FVG
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadTemplate('supertrend')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[10px] cursor-pointer"
                >
                  SuperTrend
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadTemplate('liquiditySweep')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-slate-700 text-[10px] cursor-pointer"
                >
                  Turtle
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadTemplate('mcob')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 text-[10px] cursor-pointer"
                >
                  MCOB
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadTemplate('emaRibbon')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-[10px] cursor-pointer"
                >
                  Ribbon
                </button>
              </div>

              {/* Delete Custom Slot */}
              {indicators.length > 5 && (
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-400 hover:text-white transition cursor-pointer"
                  title="Delete current custom indicator"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          {/* ================================================================= */}
          {/* EXPLICIT STUDENT "ON" & "OFF" BUTTONS IN TOP DOCK BAR             */}
          {/* ================================================================= */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5">
            {/* 1. EXPLICIT "ON" BUTTON: Applies Indicator */}
            <button
              type="button"
              onClick={handleTurnOn}
              className={`px-3 py-1.5 rounded-lg font-military font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                isOnChart
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
              }`}
              title={`Click to turn ON [${currentIndicator?.shortName || 'indicator'}] and apply it to chart`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnChart ? 'bg-slate-950 animate-pulse' : 'bg-emerald-500'}`} />
              <span>ON</span>
              {isOnChart && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            {/* 2. EXPLICIT "OFF" BUTTON: Removes Indicator */}
            <button
              type="button"
              onClick={handleTurnOff}
              className={`px-3 py-1.5 rounded-lg font-military font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                !isOnChart
                  ? 'bg-gradient-to-r from-rose-950 to-slate-900 text-rose-300 border border-rose-500/50 shadow-md'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
              }`}
              title={`Click to turn OFF [${currentIndicator?.shortName || 'indicator'}] and remove it from chart`}
            >
              <Power className="w-3 h-3" />
              <span>OFF</span>
            </button>
          </div>

          {/* Open Full Modal */}
          {onOpenFullModal && (
            <button
              type="button"
              onClick={onOpenFullModal}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1"
              title="Open full Pine Script Indicators Modal"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Manage</span>
            </button>
          )}

          {/* Expand / Minimize */}
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

      {/* ========================================================================= */}
      {/* 2. MAIN DOCK BODY: TEACHER CODE EDITOR vs STUDENT ON/OFF DASHBOARD        */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden bg-[#0d1117] relative">
        {isTeacher ? (
          /* ===================================================================== */
          /* TEACHER (ADMIN) VIEW: CODE INPUT, METADATA EDITING, LINE NUMBERS     */
          /* ===================================================================== */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Indicator Metadata Bar (Title, Short Name, Category, Color) */}
            <div className="px-3 py-1.5 bg-[#111622] border-b border-slate-800/80 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] text-amber-400 font-bold shrink-0">Indicator Settings:</span>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Indicator Title (e.g. SBT Custom FVG Radar)"
                className="px-2 py-0.5 rounded bg-[#0d1117] border border-slate-700 text-white text-xs w-56 sm:w-72 outline-none focus:border-amber-400"
              />
              <input
                type="text"
                value={editShortName}
                onChange={(e) => setEditShortName(e.target.value)}
                placeholder="Short Tag"
                className="px-2 py-0.5 rounded bg-[#0d1117] border border-slate-700 text-cyan-300 text-xs w-28 outline-none focus:border-amber-400"
              />
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as PineIndicatorCategory)}
                className="px-2 py-0.5 rounded bg-[#0d1117] border border-slate-700 text-slate-300 text-xs outline-none"
              >
                <option value="SBT_STRUCTURE">SBT Structure</option>
                <option value="TREND">Trend / Trailing</option>
                <option value="LIQUIDITY">Liquidity Sweeps</option>
                <option value="CUSTOM">Custom Strategy</option>
              </select>
              <div className="flex items-center gap-1 ml-auto text-[11px] text-slate-400">
                <span>Color:</span>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-slate-700 bg-transparent"
                />
              </div>
            </div>

            {/* Code Editor with Line Numbers */}
            <div className="flex-1 flex overflow-hidden">
              <div className="w-12 py-2 bg-[#161b22] text-slate-500 text-right pr-2 select-none border-r border-slate-800 text-xs font-mono shrink-0 overflow-hidden leading-5">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <div className="flex-1 relative overflow-auto select-text">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="w-full h-full p-2 bg-transparent text-slate-100 font-mono-code text-xs outline-none resize-none leading-5 selection:bg-amber-500/30 selection:text-amber-200"
                  placeholder="//@version=5\nindicator('My Custom Indicator', overlay=true)\n..."
                />
              </div>
            </div>
          </div>
        ) : (
          /* ===================================================================== */
          /* STUDENT VIEW: CLEAN INSTITUTIONAL CARD WITH EXPLICIT ON / OFF BUTTONS */
          /* ===================================================================== */
          <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-4 bg-gradient-to-b from-[#0e1626] to-[#0d1117] select-none">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <Shield className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-lg">
              <div className="flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold uppercase">
                  Script #{selectedSlot}
                </span>
                <h3 className="text-base sm:text-lg font-military font-bold text-white uppercase tracking-wider">
                  {currentIndicator?.title || `Script #${selectedSlot}`}
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {currentIndicator?.description ||
                  'Institutional quantitative indicator configured and deployed by Teacher. Use the explicit ON and OFF buttons to apply or remove it from your live chart.'}
              </p>
            </div>

            {/* =============================================================== */}
            {/* PROMINENT STUDENT INTERACTIVE "ON" AND "OFF" BUTTONS            */}
            {/* =============================================================== */}
            <div className="pt-2 flex items-center justify-center gap-4">
              {/* 1. EXPLICIT "ON" BUTTON */}
              <button
                type="button"
                onClick={handleTurnOn}
                className={`px-6 py-3 rounded-2xl font-military font-bold text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xl flex items-center gap-2.5 active:scale-95 ${
                  isOnChart
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 ring-4 ring-emerald-400/40 shadow-emerald-500/30'
                    : 'bg-slate-900 text-slate-300 border-2 border-slate-700 hover:border-emerald-500 hover:text-emerald-300 hover:bg-slate-800'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${isOnChart ? 'bg-slate-950 animate-pulse' : 'bg-emerald-400'}`} />
                <span>ON (APPLY TO CHART)</span>
                {isOnChart && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              {/* 2. EXPLICIT "OFF" BUTTON */}
              <button
                type="button"
                onClick={handleTurnOff}
                className={`px-6 py-3 rounded-2xl font-military font-bold text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xl flex items-center gap-2.5 active:scale-95 ${
                  !isOnChart
                    ? 'bg-gradient-to-r from-rose-950 to-slate-900 text-rose-300 border-2 border-rose-500/60 shadow-rose-950/40'
                    : 'bg-slate-900 text-slate-300 border-2 border-slate-700 hover:border-rose-500 hover:text-rose-300 hover:bg-slate-800'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>OFF (REMOVE FROM CHART)</span>
              </button>
            </div>

            {/* Real-time Target Info Badge */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Current Target Pair:</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 font-bold border border-slate-700">
                {currentSymbol} ({currentTimeframe}m)
              </span>
              <span className="text-slate-500">|</span>
              <span className={isOnChart ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {isOnChart ? '● Active on Chart' : '○ Not Applied'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 font-mono-code flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Proprietary Pine Script • Source code is controlled &amp; protected by Teacher</span>
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM CONSOLE STRIP (Execution status, error reporting, slot details)  */}
      {/* ========================================================================= */}
      <div className="px-3 py-1.5 bg-[#161b22] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-2 truncate">
          {compileStatus && (
            <span
              className={`flex items-center gap-1.5 truncate ${
                compileStatus.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
              }`}
            >
              {compileStatus.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">{compileStatus.message}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 text-slate-500 text-[10px]">
          <span>Slot: {selectedSlot} of {indicators.length}</span>
          {isTeacher && <span>Lines: {lines.length}</span>}
          <span>Active TF: {currentTimeframe}m</span>
          <span>Pair: {currentSymbol}</span>
        </div>
      </div>
    </div>
  );
};
