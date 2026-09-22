import React, { useState } from 'react';
import { Search, Maximize2, Minimize2, X, Loader2, ExternalLink } from 'lucide-react';

interface SearchSource {
  title?: string;
  uri?: string;
}

interface SearchResponse {
  answer?: string;
  sources?: SearchSource[];
}

export const FundamentalLiveSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError('');
    setAnswer('');
    setSources([]);

    try {
      const response = await fetch('/api/fundamental/live-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data: SearchResponse & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || 'Live search is unavailable.');
      setAnswer(data.answer || 'No live answer was returned.');
      setSources(Array.isArray(data.sources) ? data.sources : []);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Live search failed.');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={open ? 'fixed inset-0 z-[90] bg-[#020617]/90 backdrop-blur-md p-4 sm:p-8' : 'relative w-full'}>
      <div className={open ? 'mx-auto w-full max-w-5xl h-full flex flex-col' : 'w-full'}>
        <div className="flex items-center gap-2">
          <form onSubmit={runSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search live economic data, indicators, CPI, inflation, rates..."
              className="w-full h-10 pl-10 pr-24 rounded-xl bg-slate-950/90 border border-slate-700/80 text-slate-100 text-xs font-mono-code outline-none focus:border-cyan-400/70 focus:ring-1 focus:ring-cyan-400/20 placeholder:text-slate-500"
              aria-label="Search live fundamental data"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 rounded-lg bg-blue-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-[10px] font-bold font-military transition"
            >
              {loading ? 'SEARCHING…' : 'SEARCH'}
            </button>
          </form>

          {open && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 w-10 shrink-0 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400/60 flex items-center justify-center cursor-pointer"
              title="Minimize search"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {!open && (answer || error) && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 w-full text-left px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-slate-300 font-mono-code cursor-pointer"
          >
            <span className="text-cyan-400 font-bold">LIVE RESULT:</span> {error || answer.slice(0, 180)}
          </button>
        )}

        {open && (
          <div className="mt-4 flex-1 min-h-0 rounded-2xl bg-slate-950/95 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold font-mono-code">LIVE FUNDAMENTAL SEARCH</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">{query}</div>
              </div>
              <button type="button" onClick={() => { setOpen(false); setAnswer(''); setSources([]); setError(''); }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loading && (
                <div className="h-48 flex flex-col items-center justify-center gap-3 text-cyan-300">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-xs font-mono-code">Searching current web sources…</span>
                </div>
              )}

              {!loading && error && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono-code">{error}</div>
              )}

              {!loading && !error && answer && (
                <div className="space-y-5">
                  <article className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-7 text-slate-200 font-mono-code">
                    {answer}
                  </article>

                  {sources.length > 0 && (
                    <div className="pt-4 border-t border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Sources</div>
                      <div className="grid gap-2">
                        {sources.map((source, index) => (
                          <a
                            key={source.uri || index}
                            href={source.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-slate-300 hover:text-cyan-300 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{source.title || source.uri}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!loading && !error && !answer && (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500 font-mono-code">
                  Search any economic indicator or trading-related question to see a live result here.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
