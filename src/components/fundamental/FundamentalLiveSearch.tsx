import React, { useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';

export const FundamentalLiveSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [lastSearched, setLastSearched] = useState<string | null>(null);

  const runSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLastSearched(trimmed);
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;

    try {
      window.open(googleUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback in UI
    }
  };

  return (
    <div className="relative w-full">
      <div className="w-full">
        <form onSubmit={runSearch} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search economic data, CPI, interest rates, GDP, central bank decisions on Google..."
              className="w-full h-10 pl-10 pr-28 rounded-xl bg-slate-950/90 border border-slate-700/80 text-slate-100 text-xs font-mono-code outline-none focus:border-cyan-400/70 focus:ring-1 focus:ring-cyan-400/20 placeholder:text-slate-500"
              aria-label="Search live fundamental data in Google"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 rounded-lg bg-blue-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-[10px] font-bold font-military transition flex items-center gap-1 cursor-pointer"
            >
              <span>SEARCH GOOGLE</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </form>

        {lastSearched && (
          <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono-code text-slate-300">
            <div className="flex items-center gap-2 truncate">
              <span className="text-cyan-400 font-bold">GOOGLE SEARCH:</span>
              <span className="text-slate-200 truncate font-semibold">&ldquo;{lastSearched}&rdquo;</span>
            </div>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(lastSearched)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-200 font-bold shrink-0 ml-2 underline underline-offset-2"
            >
              <span>OPEN RESULT</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
