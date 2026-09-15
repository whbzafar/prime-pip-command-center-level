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
  resultLogs,
  habitProgress,
  trades = [],
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTheme, setFilterTheme] = useState<'ALL' | 'FEAR' | 'GREED' | 'IMPULSE' | 'FATIGUE'>('ALL');

  // Compute completed sessions by category
  const completedByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    resultLogs.forEach((l) => {
      counts[l.categoryId] = (counts[l.categoryId] || 0) + 1;
    });
    return counts;
  }, [resultLogs]);

  // Contextual Suggestion Engine based on ACTUAL journal trades data
  const contextualSuggestions: ContextualSuggestion[] = useMemo(() => {
    const suggestions: ContextualSuggestion[] = [];
    if (!trades || trades.length === 0) return suggestions;

    const closed = trades
      .filter((t) => t.status !== 'OPEN')
      .sort((a, b) => b.timestamp - a.timestamp);

    // 1. Check for 3 or more consecutive losses
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
          reason: 'Your journal indicates 3 consecutive stop-outs. Neurological threat response is heightened.',
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
          reason: 'A significant winning outcome can artificially inflate risk tolerance and bypass trade rules.',
          calmMessage: 'Celebrate with quiet composure. The market owes us nothing on the next execution.',
          priority: 'RECOMMENDED',
        });
      }
    }

    // 3. Rapid trading or short hold times -> Boredom or Impatience
    const todayStr = new Date().toISOString().split('T')[0];
    const tradesToday = trades.filter((t) => t.date === todayStr);
    if (tradesToday.length >= 4) {
      const cat = CATEGORY_LIST.find((c) => c.id === 'BOREDOM_TRADING');
      if (cat) {
        suggestions.push({
          id: 'sugg-boredom-frequency',
          categoryId: 'BOREDOM_TRADING',
          sessionId: cat.sessions[0].id,
          title: 'High Trade Frequency Cooldown',
          reason: `${tradesToday.length} executions recorded today. High frequency often indicates stimulation seeking.`,
          calmMessage: 'Great trading is mostly patient observation. Let the market come to your playbook.',
          priority: 'RECOMMENDED',
        });
      }
    }

    // 4. Late night / Long session check -> Burnout or Fatigue
    const currentHour = new Date().getHours();
    if (currentHour >= 22 || currentHour <= 5) {
      const cat = CATEGORY_LIST.find((c) => c.id === 'BURNOUT');
      if (cat) {
        suggestions.push({
          id: 'sugg-late-night-fatigue',
          categoryId: 'BURNOUT',
          sessionId: cat.sessions[0].id,
          title: 'Late Night Cognitive Decompression',
          reason: 'Trading during biological sleep windows reduces prefrontal executive capacity by up to 40%.',
          calmMessage: 'Rest and mental restoration are active trading disciplines. Honor your biological battery.',
          priority: 'INFO',
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. Contextual Suggestions Banner based on Journal Data */}
      {/* ========================================================================= */}
      {contextualSuggestions.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0c1427] via-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-military font-bold text-teal-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>CONTEXTUAL SENSING • JOURNAL-DRIVEN REGULATION</span>
            </div>
            <span className="text-[10px] font-mono-code text-slate-400">
              Calm suggestions based on actual execution patterns
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
                            : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                        }`}
                      >
                        {sugg.priority}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono-code text-slate-400 leading-snug">
                      {sugg.reason}
                    </p>
                    <p className="text-[11px] font-sans text-indigo-300/90 italic pt-1">
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
                        Explore Category Details →
                      </button>
                      <button
                        type="button"
                        onClick={() => onLaunchSessionDirect(matchedCategory, matchedSession)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-military text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 transition cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start Reset</span>
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
      {/* 2. Filter & Search Controls */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0f1d] border border-indigo-900/40 p-3 rounded-2xl shadow-lg">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all 17 psychological categories (e.g. FOMO, Hesitation, Revenge)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-400"
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
                  ? 'bg-indigo-600/30 border border-indigo-400 text-indigo-100 shadow'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 17 Dedicated Psychological Categories Grid */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => {
          const completedCount = completedByCategory[category.id] || 0;
          const masteryLevel = Math.min(5, Math.floor(completedCount / 2) + 1);

          return (
            <div
              key={category.id}
              onClick={() => onSelectCategory(category)}
              className="p-5 rounded-2xl bg-[#0b1122] border border-indigo-900/40 hover:border-indigo-400/60 hover:shadow-indigo-500/10 transition-all duration-200 shadow-xl flex flex-col justify-between space-y-4 group cursor-pointer relative overflow-hidden"
            >
              {/* Top Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-military font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                    {category.id.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono-code text-teal-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Level {masteryLevel}/5</span>
                  </div>
                </div>

                <h3 className="text-base font-military font-bold text-slate-100 group-hover:text-teal-300 transition tracking-wider uppercase">
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
                    <strong className="text-rose-400">Primary Risk:</strong>{' '}
                    {category.possibleImpact.capitalRisk}
                  </div>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="pt-3 border-t border-indigo-900/30 flex items-center justify-between text-xs font-mono-code">
                <span className="text-slate-500">5 Dedicated Protocols</span>
                <span className="text-indigo-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Enter Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
