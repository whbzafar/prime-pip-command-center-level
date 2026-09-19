// PRIMEPIP FX COMMAND CENTER — PSYCHOLOGY CORE 2090
// Master Overview Dashboard: 17 Categories, Telemetry, Practice History & Reflection Records
import React, { useState, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  Search,
  Filter,
  Play,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Flame,
  Clock,
  Compass,
  Zap,
  BookOpen,
  Activity,
  History,
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  Scale,
  Award,
  Info,
  ChevronRight,
  Layers,
} from 'lucide-react';
import {
  CATEGORY_LIST,
  PsychologicalCategory,
  PsychCategoryType,
  SessionResultLog,
  HabitProgressState,
  ContextualSuggestion,
  InteractiveSession,
} from './psychologyData';
import { Trade } from '../../types';

interface CategoriesDashboardProps {
  onSelectCategory: (category: PsychologicalCategory) => void;
  onLaunchSessionDirect: (category: PsychologicalCategory, session: InteractiveSession) => void;
  resultLogs: SessionResultLog[];
  habitProgress: HabitProgressState;
  trades: Trade[];
}

export const CategoriesDashboard: React.FC<CategoriesDashboardProps> = ({
  onSelectCategory,
  onLaunchSessionDirect,
  resultLogs = [],
  habitProgress,
  trades = [],
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTheme, setFilterTheme] = useState<'ALL' | 'FEAR' | 'GREED' | 'IMPULSE' | 'FATIGUE'>('ALL');
  const [activeViewTab, setActiveViewTab] = useState<'CATEGORIES' | 'HISTORY' | 'REFLECTIONS'>('CATEGORIES');
  const [quickSelfReportState, setQuickSelfReportState] = useState<string>('DISCIPLINED & FOCUSED');

  // Compute completed sessions by category
  const completedByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    resultLogs.forEach((l) => {
      counts[l.categoryId] = (counts[l.categoryId] || 0) + 1;
    });
    return counts;
  }, [resultLogs]);

  // Overall Practice Mastery Stats
  const totalCompletedSessions = resultLogs.length;
  const planAlignedCount = resultLogs.filter((l) => l.isPlanAligned !== false).length;
  const planAdherencePercentage = totalCompletedSessions > 0
    ? Math.round((planAlignedCount / totalCompletedSessions) * 100)
    : 100;

  // Latest Self-Reported Session Check-in
  const latestLog = resultLogs[resultLogs.length - 1];

  // Contextual Suggestion Engine based on ACTUAL journal trades data
  const contextualSuggestions: ContextualSuggestion[] = useMemo(() => {
    const suggestions: ContextualSuggestion[] = [];
    if (!trades || trades.length === 0) {
      // Default recommended starting protocol for Fear Pilot
      const fearCat = CATEGORY_LIST.find((c) => c.id === 'FEAR');
      if (fearCat) {
        suggestions.push({
          id: 'sugg-fear-pilot',
          categoryId: 'FEAR',
          sessionId: fearCat.sessions[0].id,
          title: 'FEAR PILOT: Capital Detachment & Risk Acceptance',
          reason: 'Master the cognitive separation between normal floating drawdown and trade invalidation.',
          calmMessage: 'The dollar risk was emotionally spent at order fill. Invalidation governs action.',
          priority: 'RECOMMENDED',
        });
      }
      return suggestions;
    }

    const closed = trades
      .filter((t) => t.status !== 'OPEN')
      .sort((a, b) => b.timestamp - a.timestamp);

    // 1. Check for consecutive losses
    const recent3 = closed.slice(0, 3);
    const has3ConsecutiveLosses = recent3.length >= 3 && recent3.every((t) => (t.profitLoss || 0) < 0);
    const has2ConsecutiveLosses = recent3.length >= 2 && recent3.slice(0, 2).every((t) => (t.profitLoss || 0) < 0);

    if (has3ConsecutiveLosses) {
      const cat = CATEGORY_LIST.find((c) => c.id === 'REVENGE_TRADING');
      if (cat) {
        suggestions.push({
          id: 'sugg-revenge-3loss',
          categoryId: 'REVENGE_TRADING',
          sessionId: cat.sessions[0].id,
          title: 'Decompress From 3 Consecutive Losses',
          reason: 'Your journal indicates 3 consecutive stop-outs. Amygdala threat response is elevated.',
          calmMessage: 'Take a gentle, non-judgmental pause. Preserving capital is your only job right now.',
          priority: 'URGENT',
        });
      }
    } else if (has2ConsecutiveLosses) {
      const cat = CATEGORY_LIST.find((c) => c.id === 'POST_LOSS_SHAME');
      if (cat) {
        suggestions.push({
          id: 'sugg-post-loss-2',
          categoryId: 'POST_LOSS_SHAME',
          sessionId: cat.sessions[0].id,
          title: 'Decouple Identity From Recent Losses',
          reason: '2 consecutive stop-outs registered. Acknowledge the mathematical probability distribution.',
          calmMessage: 'A loss is simply a statistical cost of business, not an indicator of personal intelligence.',
          priority: 'RECOMMENDED',
        });
      }
    }

    // 2. Check for big win or win streak -> Post-Win Overconfidence
    const lastTrade = closed[0];
    const recentWins = closed.slice(0, 3).filter((t) => (t.profitLoss || 0) > 0);
    const isBigWin = lastTrade && (lastTrade.profitLoss || 0) > 250;

    if (isBigWin || recentWins.length >= 3) {
      const cat = CATEGORY_LIST.find((c) => c.id === 'POST_WIN_OVERCONFIDENCE');
      if (cat) {
        suggestions.push({
          id: 'sugg-post-win',
          categoryId: 'POST_WIN_OVERCONFIDENCE',
          sessionId: cat.sessions[0].id,
          title: 'Post-Win Grounding & Euphoria Neutralizer',
          reason: 'A winning outcome can artificially inflate risk tolerance and bypass trade rules.',
          calmMessage: 'Celebrate with quiet composure. The market owes us nothing on the next execution.',
          priority: 'RECOMMENDED',
        });
      }
    }

    // Always ensure FEAR pilot is easily accessible
    if (suggestions.length === 0) {
      const fearCat = CATEGORY_LIST.find((c) => c.id === 'FEAR');
      if (fearCat) {
        suggestions.push({
          id: 'sugg-fear-pilot',
          categoryId: 'FEAR',
          sessionId: fearCat.sessions[0].id,
          title: 'FEAR PILOT: Capital Detachment & Risk Acceptance',
          reason: 'Engage the 2090 Candlestick Simulation to practice holding through market noise.',
          calmMessage: 'Trading mastery is the ability to execute rules under emotional uncertainty.',
          priority: 'RECOMMENDED',
        });
      }
    }

    return suggestions;
  }, [trades]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    return CATEGORY_LIST.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.whyItHappens.cognitiveDistortion.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTheme === 'FEAR') {
        return ['FEAR', 'HESITATION', 'LOSS_AVERSION', 'ANALYSIS_PARALYSIS', 'PRE_MARKET_ANXIETY', 'POST_LOSS_SHAME'].includes(cat.id);
      }
      if (filterTheme === 'GREED') {
        return ['GREED', 'OVERCONFIDENCE', 'POST_WIN_OVERCONFIDENCE', 'FOMO'].includes(cat.id);
      }
      if (filterTheme === 'IMPULSE') {
        return ['REVENGE_TRADING', 'BOREDOM_TRADING', 'IMPATIENCE', 'PERFECTIONISM'].includes(cat.id);
      }
      if (filterTheme === 'FATIGUE') {
        return ['BURNOUT', 'DISCIPLINE_FATIGUE', 'COMPARISON_ANXIETY'].includes(cat.id);
      }

      return true;
    });
  }, [searchQuery, filterTheme]);

  return (
    <div id="psychology-core-2090-dashboard" className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. 2090 Command Center HUD Banner & Educational Safeguards */}
      {/* ========================================================================= */}
      <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#060a17] via-[#0b1226] to-[#060a17] border border-cyan-500/30 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-cyan-500/10 via-indigo-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono-code font-bold uppercase tracking-widest">
                PRIMEPIP FX 2090
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono-code font-bold uppercase tracking-widest">
                BEHAVIORAL SIMULATION CORE
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-military font-black text-slate-100 uppercase tracking-wider">
              Psychological Center
            </h2>
            <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
              Interactive 8-stage educational simulator training emotional regulation, process fidelity, and execution discipline under simulated market pressure.
            </p>
          </div>

          {/* Educational & Non-Medical Notice Badge */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono-code text-slate-400 max-w-xs space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase text-[10px]">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Educational Training Standard</span>
            </div>
            <p className="text-[10px] leading-tight text-slate-400">
              Not a clinical medical tool. Focuses strictly on trade plan compliance, risk boundaries, and cognitive grounding.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Practice Progress vs Actual Trading Performance Distinction Telemetry */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Practice Sessions Completed */}
        <div className="p-4 rounded-2xl bg-[#080d1e] border border-indigo-900/50 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 uppercase">
            <span>Practice Drills</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-military font-bold text-slate-100">
            {totalCompletedSessions} <span className="text-xs font-mono-code text-slate-500 font-normal">Protocols</span>
          </div>
          <span className="text-[10px] font-mono-code text-cyan-400/90 block">
            Demonstrated Simulation Habit
          </span>
        </div>

        {/* Plan-Aligned Execution Rate */}
        <div className="p-4 rounded-2xl bg-[#080d1e] border border-indigo-900/50 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 uppercase">
            <span>Plan Adherence</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-military font-bold text-emerald-400">
            {planAdherencePercentage}%
          </div>
          <span className="text-[10px] font-mono-code text-slate-400 block">
            Rules Honored During Scenarios
          </span>
        </div>

        {/* Current Self-Reported State */}
        <div className="p-4 rounded-2xl bg-[#080d1e] border border-indigo-900/50 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 uppercase">
            <span>Self-Reported State</span>
            <Brain className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-military font-bold text-amber-300 truncate">
            {latestLog ? `Intensity ${latestLog.shiftedIntensity}/10` : quickSelfReportState}
          </div>
          <span className="text-[10px] font-mono-code text-slate-400 block truncate">
            {latestLog ? `Shift: ${latestLog.initialIntensity} → ${latestLog.shiftedIntensity}` : 'User-audited baseline'}
          </span>
        </div>

        {/* Process Habit Points */}
        <div className="p-4 rounded-2xl bg-[#080d1e] border border-indigo-900/50 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 uppercase">
            <span>Process Mastery</span>
            <Award className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-military font-bold text-indigo-300">
            {habitProgress.processPoints || totalCompletedSessions * 35}{' '}
            <span className="text-xs font-mono-code text-slate-500 font-normal">PTS</span>
          </div>
          <span className="text-[10px] font-mono-code text-slate-500 block">
            Distinct from P&L results
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Recommended Practice Activity Banner */}
      {/* ========================================================================= */}
      {contextualSuggestions.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0a1024] via-[#090e20] to-[#070b18] border border-indigo-500/40 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-military font-bold text-amber-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>RECOMMENDED PRACTICE PROTOCOL • CONTEXTUAL SENSING</span>
            </div>
            <span className="text-[10px] font-mono-code text-slate-400 hidden sm:inline">
              Tailored to your current execution cadence
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {contextualSuggestions.map((sugg) => {
              const matchedCategory = CATEGORY_LIST.find((c) => c.id === sugg.categoryId);
              const matchedSession = matchedCategory?.sessions.find((s) => s.id === sugg.sessionId);

              return (
                <div
                  key={sugg.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                    sugg.priority === 'URGENT'
                      ? 'bg-rose-950/30 border-rose-500/40'
                      : 'bg-indigo-950/30 border-indigo-500/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                        {sugg.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full border ${
                          sugg.priority === 'URGENT'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {sugg.priority}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono-code text-slate-300 leading-snug">
                      {sugg.reason}
                    </p>
                    <p className="text-[11px] font-sans text-cyan-300/90 italic pt-1">
                      "{sugg.calmMessage}"
                    </p>
                  </div>

                  {matchedCategory && matchedSession && (
                    <div className="flex items-center justify-between pt-2 border-t border-indigo-900/30">
                      <button
                        type="button"
                        onClick={() => onSelectCategory(matchedCategory)}
                        className="text-[11px] font-mono-code text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      >
                        Explore 5 Category Sessions →
                      </button>
                      <button
                        type="button"
                        onClick={() => onLaunchSessionDirect(matchedCategory, matchedSession)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-military text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 transition cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Launch 2090 Protocol</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Navigation View Tabs (Categories vs History vs Reflections) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between border-b border-indigo-950 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveViewTab('CATEGORIES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-military font-bold uppercase tracking-wider transition cursor-pointer ${
              activeViewTab === 'CATEGORIES'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>17 Categories Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-military font-bold uppercase tracking-wider transition cursor-pointer ${
              activeViewTab === 'HISTORY'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Practice History ({resultLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('REFLECTIONS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-military font-bold uppercase tracking-wider transition cursor-pointer ${
              activeViewTab === 'REFLECTIONS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reflection Records ({resultLogs.filter((l) => l.reflectionNotes).length})</span>
          </button>
        </div>

        <div className="text-[11px] font-mono-code text-slate-500 hidden md:block">
          17 Specialized Categories • 85 Tailored Protocols
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5A. VIEW: 17 CATEGORIES GRID */}
      {/* ========================================================================= */}
      {activeViewTab === 'CATEGORIES' && (
        <div className="space-y-4">
          {/* Search & Filter Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080d1c] border border-indigo-900/40 p-3 rounded-2xl shadow-lg">
            {/* Search input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories (e.g. Fear, FOMO, Hesitation, Revenge)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All 17 Categories' },
                { id: 'FEAR', label: 'Fear & Hesitation' },
                { id: 'GREED', label: 'Greed & Euphoria' },
                { id: 'IMPULSE', label: 'Impulse & Tilt' },
                { id: 'FATIGUE', label: 'Burnout & Fatigue' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setFilterTheme(theme.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-military font-bold tracking-wider uppercase transition cursor-pointer whitespace-nowrap ${
                    filterTheme === theme.id
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 shadow'
                      : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* 17 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => {
              const completedCount = completedByCategory[category.id] || 0;
              const masteryLevel = Math.min(5, Math.floor(completedCount / 2) + 1);
              const isFear = category.id === 'FEAR';

              return (
                <div
                  key={category.id}
                  onClick={() => onSelectCategory(category)}
                  className={`p-5 rounded-2xl bg-[#080d1e] border transition-all duration-200 shadow-xl flex flex-col justify-between space-y-4 group cursor-pointer relative overflow-hidden ${
                    isFear
                      ? 'border-cyan-500/50 hover:border-cyan-400 shadow-cyan-500/10 ring-1 ring-cyan-500/20'
                      : 'border-indigo-900/40 hover:border-indigo-400/60 hover:shadow-indigo-500/10'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-military font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                          {category.id.replace('_', ' ')}
                        </span>
                        {isFear && (
                          <span className="text-[9px] font-mono-code font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            PILOT MODULE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono-code text-cyan-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mastery Lvl {masteryLevel}/5</span>
                      </div>
                    </div>

                    <h3 className="text-base font-military font-bold text-slate-100 group-hover:text-cyan-300 transition tracking-wider uppercase">
                      {category.name}
                    </h3>

                    <p className="text-xs font-mono-code text-slate-400 leading-relaxed line-clamp-2">
                      {category.tagline}
                    </p>

                    <div className="pt-2 border-t border-indigo-950 space-y-1 text-[11px] font-mono-code text-slate-400">
                      <div className="truncate">
                        <strong className="text-slate-300">Cognitive Driver:</strong>{' '}
                        {category.whyItHappens.cognitiveDistortion}
                      </div>
                      <div className="truncate text-rose-300/80">
                        <strong className="text-rose-400">Trading Vulnerability:</strong>{' '}
                        {category.possibleImpact.capitalRisk}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer */}
                  <div className="pt-3 border-t border-indigo-900/30 flex items-center justify-between text-xs font-mono-code">
                    <span className="text-slate-500">{category.sessions.length} Interactive Protocols</span>
                    <span className="text-cyan-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      <span>Enter Module</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5B. VIEW: PRACTICE HISTORY */}
      {/* ========================================================================= */}
      {activeViewTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-indigo-900/40 flex items-center justify-between text-xs font-mono-code text-slate-400">
            <span>Showing recent completed simulation protocols from local storage</span>
            <span>Total Logged: {resultLogs.length}</span>
          </div>

          {resultLogs.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#080d1e] border border-slate-800 space-y-3">
              <Brain className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-base font-military font-bold text-slate-300 uppercase">
                No Practice Protocols Completed Yet
              </h4>
              <p className="text-xs font-mono-code text-slate-500 max-w-sm mx-auto">
                Launch any of the 17 category protocols above to begin recording your simulation practice history.
              </p>
              <button
                type="button"
                onClick={() => setActiveViewTab('CATEGORIES')}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-military text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Browse Categories
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...resultLogs].reverse().map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-[#080d1e] border border-slate-800/80 hover:border-slate-700 transition space-y-2 text-xs font-mono-code"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{log.sessionTitle}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {log.categoryId}
                      </span>
                      {log.scenarioSymbol && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {log.scenarioSymbol}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px]">{log.dateStr} • {log.timeStr}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Intensity Shift:</span>
                      <span className="text-emerald-400 font-bold">
                        {log.initialIntensity}/10 → {log.shiftedIntensity}/10 (Δ -{Math.max(0, log.initialIntensity - log.shiftedIntensity)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Process Status:</span>
                      <span className={log.isPlanAligned !== false ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        {log.isPlanAligned !== false ? '✓ Plan Aligned' : 'Impulse Breach'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Tension Focus:</span>
                      <span className="text-slate-300">{log.physicalTensionArea}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Reward:</span>
                      <span className="text-cyan-400 font-bold">+{log.habitPointsEarned} PTS</span>
                    </div>
                  </div>

                  {log.reflectionNotes && (
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-900 text-slate-300 text-[11px] italic">
                      "{log.reflectionNotes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5C. VIEW: REFLECTION RECORDS */}
      {/* ========================================================================= */}
      {activeViewTab === 'REFLECTIONS' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-indigo-900/40 text-xs font-mono-code text-slate-400">
            Written personal reflections and cognitive breakthroughs stored across all completed protocols.
          </div>

          {resultLogs.filter((l) => l.reflectionNotes).length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#080d1e] border border-slate-800 space-y-3">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-base font-military font-bold text-slate-300 uppercase">
                No Reflection Records Written Yet
              </h4>
              <p className="text-xs font-mono-code text-slate-500 max-w-sm mx-auto">
                During Step 7 of any protocol, write down your key insights to populate this personal psychology journal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {resultLogs
                .filter((l) => l.reflectionNotes)
                .reverse()
                .map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-[#080d1e] border border-indigo-950 space-y-2 text-xs font-mono-code"
                  >
                    <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 text-slate-400">
                      <span className="font-bold text-cyan-300">{log.sessionTitle}</span>
                      <span className="text-[10px] text-slate-500">{log.dateStr}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed italic">
                      "{log.reflectionNotes}"
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Shift: {log.initialIntensity}/10 → {log.shiftedIntensity}/10</span>
                      <span className="text-slate-400">{log.triggerIdentified}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
