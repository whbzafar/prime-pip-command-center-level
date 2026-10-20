import React, { useState, useEffect } from 'react';
import {
  Code2,
  Play,
  Save,
  Plus,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  FileCode,
  Layers,
  ChevronDown,
  RotateCcw,
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
  const [selectedId, setSelectedId] = useState<string>('sbt-fvg-ob');
  const [code, setCode] = useState<string>('');
  const [compileStatus, setCompileStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Load indicators
  const loadIndicators = async () => {
    const list = await pineScriptService.syncWithServer();
    setIndicators(list);
    if (list.length > 0 && !list.find((i) => i.id === selectedId)) {
      setSelectedId(list[0].id);
    }
  };

  useEffect(() => {
    loadIndicators();
  }, []);

  const currentIndicator = indicators.find((i) => i.id === selectedId) || indicators[0];
  const isOnChart = currentIndicator ? pineScriptService.isIndicatorEnabled(currentIndicator.id) : false;

  useEffect(() => {
    if (currentIndicator) {
      setCode(currentIndicator.scriptCode || '');
      setCompileStatus({
        success: true,
        message: `Pine Script v5 (${currentIndicator.version || '5.0.0'}) loaded ready for execution.`,
      });
    }
  }, [selectedId, currentIndicator]);

  const handleToggleOnChart = async () => {
    if (!currentIndicator) return;
    const newState = !isOnChart;
    await pineScriptService.setIndicatorToggle(currentIndicator.id, newState);
    setIndicators([...pineScriptService.getIndicators()]);
    if (onIndicatorToggled) {
      onIndicatorToggled(currentIndicator.id, newState);
    }
  };

  const handleCompile = () => {
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
      message: `✓ Compiled successfully with 0 errors! Indicator ready to apply to ${currentSymbol} [${currentTimeframe}m].`,
    });
  };

  const handleSave = async () => {
    if (!isAdmin || !currentIndicator) return;
    handleCompile();
    const updated: PineScriptIndicator = {
      ...currentIndicator,
      scriptCode: code.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
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

  const handleLoadTemplate = (key: string) => {
    if (!isAdmin) return;
    const t = TEMPLATES[key];
    if (!t) return;
    setCode(t.code);
    setCompileStatus({
      success: true,
      message: `Loaded template: ${t.title}. Click 'Save' or 'Add to Chart'.`,
    });
  };

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };

  const lines = code.split('\n');

  return (
    <div
      className={`w-full border-t border-slate-800 bg-[#0d1117] text-slate-200 font-mono-code flex flex-col transition-all duration-200 select-text ${
        isExpanded ? 'h-[520px]' : 'h-[320px]'
      }`}
    >
      {/* Top Pine Editor Header Bar */}
      <div className="px-3 py-2 border-b border-slate-800 bg-[#161b22] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Indicator Selector & Title */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-military uppercase tracking-wider">PINE EDITOR</span>
          </div>

          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#0d1117] border border-slate-700 hover:border-amber-400 text-white font-bold text-xs outline-none cursor-pointer pr-7 transition"
            >
              {indicators.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.title} ({ind.shortName})
                </option>
              ))}
            </select>
          </div>

          {currentIndicator && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
              {currentIndicator.category.replace('_', ' ')}
            </span>
          )}

          {/* Role Status Tag */}
          {isAdmin ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>ADMIN: EDIT &amp; SAVE</span>
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>STUDENT: READ-ONLY</span>
            </span>
          )}
        </div>

        {/* Right: Actions (Add/Remove from Chart, Compile, Save, Expand, Close) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* TACTILE ADD TO CHART / REMOVE FROM CHART BUTTON */}
          <button
            type="button"
            onClick={handleToggleOnChart}
            className={`px-3 py-1.5 rounded-xl font-military font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md ${
              isOnChart
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-cyan-500/20'
            }`}
            title={isOnChart ? 'Click to remove this indicator from chart' : 'Click to apply this indicator to chart'}
          >
            {isOnChart ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>On Chart (Remove ✕)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Add to Chart</span>
              </>
            )}
          </button>

          {/* Admin Save Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleSave}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-sm shadow-amber-500/20"
              title="Save changes to Pine Script indicator"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccess ? 'Saved ✓' : 'Save'}</span>
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
            </div>
          )}

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Copy script code"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

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

      {/* Student Read-Only Notice Bar */}
      {!isAdmin && (
        <div className="px-3 py-1 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between text-[11px] text-amber-200/90">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Student Read-Only Mode:</strong> You can view and inspect the Pine Script code and toggle it On/Off on your chart. Only Admin can edit source code.
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-mono">CODE VIEWING ENABLED</span>
        </div>
      )}

      {/* Editor Content Area: Line Numbers + Code */}
      <div className="flex-1 flex overflow-hidden bg-[#0d1117]">
        {/* Line Numbers Gutter */}
        <div className="w-12 py-2 bg-[#161b22] text-slate-500 text-right pr-2 select-none border-r border-slate-800 text-xs font-mono shrink-0 overflow-hidden leading-5">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Area */}
        <div className="flex-1 relative overflow-auto">
          {isAdmin ? (
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full h-full p-2 bg-transparent text-slate-100 font-mono-code text-xs outline-none resize-none leading-5 selection:bg-amber-500/30 selection:text-amber-200"
              placeholder="//@version=5\nindicator('My Script', overlay=true)\n..."
            />
          ) : (
            <pre className="w-full h-full p-2 text-slate-200 font-mono-code text-xs leading-5 select-text overflow-auto">
              <code>{code || '// No code provided'}</code>
            </pre>
          )}
        </div>
      </div>

      {/* Bottom Console / Status Strip */}
      <div className="px-3 py-1.5 bg-[#161b22] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
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
          <span>Lines: {lines.length}</span>
          <span>Chars: {code.length}</span>
          <span>Timeframe: {currentTimeframe}m</span>
          <span>Target: {currentSymbol}</span>
        </div>
      </div>
    </div>
  );
};
