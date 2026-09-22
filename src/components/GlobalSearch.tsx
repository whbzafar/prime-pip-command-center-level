import React, { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import type { MainNavTab } from './Header';

interface SearchEntry {
  title: string;
  category: string;
  subcategory: string;
  description: string;
  tab: MainNavTab;
}

interface GlobalSearchProps {
  onNavigate: (tab: MainNavTab) => void;
}

const SEARCH_ENTRIES: SearchEntry[] = [
  { title: 'Command Dashboard', category: 'Core', subcategory: 'Overview', description: 'Account health, readiness score, and daily execution metrics.', tab: 'DASHBOARD' },
  { title: 'Trade Journal', category: 'Core', subcategory: 'Execution Log', description: 'Log trades, track performance, and review past setups.', tab: 'JOURNAL' },
  { title: 'SBT Models', category: 'Core', subcategory: 'Strategy Models', description: 'All 10 Structure-Based Trading models, rules, and chart assets.', tab: 'SBT_MODELS' },
  { title: 'Lot Size Calculator', category: 'Risk & Strategy', subcategory: 'Position Sizing', description: 'Exact risk positioning tool and pip calculations.', tab: 'LOT_SIZE' },
  { title: 'Risk Management', category: 'Risk & Strategy', subcategory: 'Capital Protection', description: 'Max drawdown controls, risk rules, and trade limiters.', tab: 'RISK' },
  { title: 'Pre-Trade Plan', category: 'Risk & Strategy', subcategory: 'Execution Protocol', description: 'Pre-trade execution rules and gatekeeper plan.', tab: 'PRE_TRADE_PLAN' },
  { title: 'Live News Calendar', category: 'Market Intelligence', subcategory: 'Economic Calendar', description: 'Macro releases, FOMC, CPI, NFP, and central bank events.', tab: 'FUNDAMENTAL_CALENDAR' },
  { title: 'Fundamental Indicators', category: 'Market Intelligence', subcategory: 'Macro Intelligence', description: '8-currency economic scoring, differential dashboard, and live search.', tab: 'FUNDAMENTAL_INDICATORS' },
  { title: 'Premium Signals', category: 'Market Intelligence', subcategory: 'VIP Setups', description: 'Institutional VIP trade alerts and setup breakdowns.', tab: 'SIGNALS' },
  { title: 'Compounding Tools', category: 'Market Intelligence', subcategory: 'Growth Simulator', description: 'Capital compounding models and equity trajectory plans.', tab: 'COMPOUNDING' },
  { title: 'Performance Report', category: 'Analytics', subcategory: 'Metrics & R:R', description: 'Expectancy, win rate, drawdown analysis, and strategy insights.', tab: 'PERFORMANCE' },
  { title: 'Daily Development', category: 'Mindset & Health', subcategory: 'Habits & Routine', description: 'Backtesting tracker, forward testing, and daily trader routines.', tab: 'DAILY_DEV' },
  { title: 'Psychological Center', category: 'Mindset & Health', subcategory: 'Cognitive Audit', description: 'Emotional regulation, cognitive bias audits, and discipline resets.', tab: 'PSYCHOLOGY' },
  { title: 'Trading Tool Suite', category: 'Mindset & Health', subcategory: 'Regulation', description: 'Diaphragmatic breathing, binaural focus audio, and calming tools.', tab: 'CALMING_TOOLS' },
  { title: 'Academic Research', category: 'Research & Tools', subcategory: 'Market Science', description: 'OpenAlex academic quantitative and market literature engine.', tab: 'RESEARCH' },
  { title: 'Freehand Canvas', category: 'Research & Tools', subcategory: 'Markup Workspace', description: 'Drawings, chart markups, and diagramming canvas.', tab: 'FREEHAND_WORKSPACE' },
  { title: 'Pro Learning / Trading', category: 'Research & Tools', subcategory: 'Education & Bots', description: 'Execution courses, trading playbooks, strategies, and learning command center.', tab: 'PRO_LEARNING' },
  { title: 'Trader Community Feed', category: 'Community', subcategory: 'Peer Network', description: 'Verified trade dispatches, community chat, and trader discussions.', tab: 'COMMUNITY' },
  { title: 'Book a Session', category: 'Community', subcategory: '1-on-1 Mentorship', description: 'Direct mentorship consultations and private trade reviews.', tab: 'BOOK_SESSION' },
  { title: 'Data Export & Backup', category: 'Operations', subcategory: 'Data Management', description: 'Export trade history, backup settings, and cloud state.', tab: 'SETTINGS' },
  { title: 'Admin Panel (Owner)', category: 'Administration', subcategory: 'User Management', description: 'Trader accounts, license control, and system configuration.', tab: 'ADMIN' },
  { title: 'Evaluation Engine', category: 'Administration', subcategory: 'Proprietary Audit', description: 'Comprehensive trader assessment and proprietary scoring.', tab: 'EVOLUTION' },
];

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return SEARCH_ENTRIES.filter((entry) =>
      [entry.title, entry.category, entry.subcategory, entry.description]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    ).slice(0, 8);
  }, [normalizedQuery]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (results[0]) {
      onNavigate(results[0].tab);
      setQuery('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-[22rem]">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setQuery('');
              setIsOpen(false);
            }
          }}
          placeholder="Search categories, tools, models, plans..."
          aria-label="Search command center"
          aria-expanded={isOpen && Boolean(normalizedQuery)}
          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"
        />
      </form>

      {isOpen && normalizedQuery && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[1200] overflow-hidden rounded-xl border border-slate-700 bg-[#0B0F19] p-1.5 shadow-2xl">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={`${result.tab}-${result.title}`}
                type="button"
                onClick={() => {
                  onNavigate(result.tab);
                  setQuery('');
                  setIsOpen(false);
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-slate-800 focus:bg-slate-800 focus:outline-none cursor-pointer"
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-100">{result.title}</span>
                  <span className="block truncate text-[10px] text-slate-400">{result.category} · {result.subcategory} — {result.description}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-xs text-slate-500 font-mono-code text-center">
              No matching internal module found for &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
