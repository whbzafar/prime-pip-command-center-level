import React, { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, Search, Wifi, WifiOff } from 'lucide-react';
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
  { title: 'Command Dashboard', category: 'Dashboard', subcategory: 'Overview', description: 'Account health, readiness, score, and daily execution controls.', tab: 'DASHBOARD' },
  { title: 'Trade Journal', category: 'Journal', subcategory: 'Execution log', description: 'Review and edit recorded trades, plans, and post-trade notes.', tab: 'JOURNAL' },
  { title: 'Performance Lab', category: 'Performance', subcategory: 'Analytics', description: 'Audit expectancy, sessions, pairs, timeframes, and strategy results.', tab: 'PERFORMANCE' },
  { title: 'Risk Center', category: 'Risk', subcategory: 'Protection', description: 'Risk limits, daily trade controls, and capital preservation tools.', tab: 'RISK' },
  { title: 'Psychological Center', category: 'Psychology', subcategory: 'Mindset training', description: 'Bias tools, recovery exercises, and discipline support.', tab: 'PSYCHOLOGY' },
  { title: 'Trading Research', category: 'Research', subcategory: 'Market intelligence', description: 'Research workspace for fundamental and technical context.', tab: 'RESEARCH' },
  { title: 'Fundamental Calendar', category: 'Research', subcategory: 'Economic calendar', description: 'Review scheduled economic events and their expected impact.', tab: 'FUNDAMENTAL_CALENDAR' },
  { title: 'Fundamental Indicators', category: 'Research', subcategory: 'Macro indicators', description: 'Explore macroeconomic indicator context.', tab: 'FUNDAMENTAL_INDICATORS' },
  { title: 'SBT Models', category: 'Education', subcategory: 'Strategy models', description: 'Study the ten SBT execution models and their rules.', tab: 'SBT_MODELS' },
  { title: 'Pre-Trade Plan', category: 'Execution', subcategory: 'Preparation', description: 'Complete the checklist before opening a position.', tab: 'PRE_TRADE_PLAN' },
  { title: 'Daily Development', category: 'Development', subcategory: 'Growth plan', description: 'Work through daily improvement tasks and goals.', tab: 'DAILY_DEV' },
  { title: 'Compounding Engine', category: 'Development', subcategory: 'Capital planning', description: 'Model disciplined account growth scenarios.', tab: 'COMPOUNDING' },
  { title: 'Calming Tools', category: 'Psychology', subcategory: 'Regulation', description: 'Use breathing, focus, and reset tools before execution.', tab: 'CALMING_TOOLS' },
  { title: 'Community', category: 'Community', subcategory: 'Peer workspace', description: 'Connect with the trading community.', tab: 'COMMUNITY' },
];

const NEWS_TERMS = /\b(news|headline|headlines|fed|fomc|cpi|nfp|central bank|market update|breaking)\b/i;

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const isOnline = typeof navigator === 'undefined' || navigator.onLine;
  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return SEARCH_ENTRIES.filter((entry) =>
      [entry.title, entry.category, entry.subcategory, entry.description]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    ).slice(0, 6);
  }, [normalizedQuery]);

  const showNewsPath = normalizedQuery.length > 1 && NEWS_TERMS.test(normalizedQuery);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (results[0]) {
      onNavigate(results[0].tab);
      setQuery('');
      setIsOpen(false);
    } else if (showNewsPath && isOnline) {
      window.open(`https://news.google.com/search?q=${encodeURIComponent(query.trim())}`, '_blank', 'noopener,noreferrer');
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
          placeholder="Search command center..."
          aria-label="Search command center"
          aria-expanded={isOpen && Boolean(normalizedQuery)}
          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-9 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" title={isOnline ? 'Online' : 'Offline'}>
          {isOnline ? <Wifi className="w-3.5 h-3.5" aria-label="Online search available" /> : <WifiOff className="w-3.5 h-3.5" aria-label="Offline search only" />}
        </span>
      </form>

      {isOpen && normalizedQuery && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[1200] overflow-hidden rounded-xl border border-slate-700 bg-[#0B0F19] p-1.5 shadow-2xl">
          {results.map((result) => (
            <button
              key={`${result.tab}-${result.title}`}
              type="button"
              onClick={() => {
                onNavigate(result.tab);
                setQuery('');
                setIsOpen(false);
              }}
              className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-slate-800 focus:bg-slate-800 focus:outline-none"
            >
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-100">{result.title}</span>
                <span className="block truncate text-[10px] text-slate-500">{result.category} · {result.subcategory} — {result.description}</span>
              </span>
            </button>
          ))}

          {showNewsPath && (
            <div className="mt-1 border-t border-slate-800 px-3 py-2">
              {isOnline ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex w-full items-center gap-2 rounded-lg text-left text-xs text-amber-300 transition hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  Search current news in Google News
                </button>
              ) : (
                <p className="flex items-center gap-2 text-[10px] leading-relaxed text-slate-500">
                  <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  News search needs an internet connection. Offline results are not current news.
                </p>
              )}
            </div>
          )}

          {!results.length && !showNewsPath && (
            <p className="px-3 py-3 text-xs text-slate-500">No offline content matched this search.</p>
          )}
        </div>
      )}
    </div>
  );
};
