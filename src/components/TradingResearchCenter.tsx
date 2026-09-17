import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  BookOpen,
  GraduationCap,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  User,
  Building,
  Quote,
  FileText,
  Filter,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Share2,
  SlidersHorizontal,
  X,
  Library,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface ScholarlyArticle {
  id: string;
  doi: string | null;
  title: string;
  authors: { name: string; institution?: string }[];
  journalOrVenue: string;
  publicationYear: number;
  citedByCount: number;
  type: string;
  abstract: string | null;
  pdfUrl: string | null;
  landingPageUrl: string | null;
  isOpenAccess: boolean;
}

export type CitationStyle = 'APA' | 'MLA' | 'CHICAGO' | 'BIBTEX';

const CURATED_SEARCH_PRESETS = [
  'market structure trading',
  'forex market structure',
  'trading psychology cognitive bias',
  'financial market microstructure',
  'gold price monetary policy',
  'algorithmic trading order flow',
  'foreign exchange liquidity mechanics',
  'risk management drawdown analysis',
];

// Helper to reconstruct clean text from OpenAlex inverted index
function parseInvertedIndexAbstract(invertedIndex: Record<string, number[]> | undefined | null): string | null {
  if (!invertedIndex || Object.keys(invertedIndex).length === 0) return null;
  try {
    const wordEntries: [number, string][] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        wordEntries.push([pos, word]);
      }
    }
    wordEntries.sort((a, b) => a[0] - b[0]);
    return wordEntries.map((entry) => entry[1]).join(' ');
  } catch {
    return null;
  }
}

export const TradingResearchCenter: React.FC = () => {
  const [query, setQuery] = useState('market structure trading');
  const [activeSearchTerm, setActiveSearchTerm] = useState('market structure trading');
  const [articles, setArticles] = useState<ScholarlyArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters & Sorting
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'citations'>('relevance');
  const [minYear, setMinYear] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [openAccessOnly, setOpenAccessOnly] = useState<boolean>(false);

  // Modal / Detail state
  const [selectedArticle, setSelectedArticle] = useState<ScholarlyArticle | null>(null);
  const [isArticleFullscreen, setIsArticleFullscreen] = useState<boolean>(false);
  const [citationModalArticle, setCitationModalArticle] = useState<ScholarlyArticle | null>(null);
  const [selectedCitationStyle, setSelectedCitationStyle] = useState<CitationStyle>('APA');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Saved bookmark list in localStorage
  const [savedBookmarks, setSavedBookmarks] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('academic_research_saved');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleBookmark = (id: string) => {
    const next = savedBookmarks.includes(id)
      ? savedBookmarks.filter((x) => x !== id)
      : [...savedBookmarks, id];
    setSavedBookmarks(next);
    localStorage.setItem('academic_research_saved', JSON.stringify(next));
  };

  // Perform Real Scholarly Search via OpenAlex API (Free, legitimate, 250M+ scholarly works)
  const performSearch = useCallback(
    async (searchTerm: string, pageNumber: number, sortOption: string, yearFilter: string, oaOnly: boolean) => {
      const trimmed = searchTerm.trim();
      if (!trimmed) return;

      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Build sort parameter
        let sortParam = 'relevance_score:desc';
        if (sortOption === 'date') sortParam = 'publication_year:desc';
        if (sortOption === 'citations') sortParam = 'cited_by_count:desc';

        let url = `https://api.openalex.org/works?search=${encodeURIComponent(
          trimmed
        )}&page=${pageNumber}&per-page=10&sort=${sortParam}`;

        // Apply filters
        const filterParts: string[] = [];
        if (yearFilter !== 'ALL') {
          filterParts.push(`from_publication_date:${yearFilter}-01-01`);
        }
        if (oaOnly) {
          filterParts.push('is_oa:true');
        }

        if (filterParts.length > 0) {
          url += `&filter=${encodeURIComponent(filterParts.join(','))}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`OpenAlex response status: ${response.status}`);
        }

        const data = await response.json();
        const results = data.results || [];
        setTotalCount(data.meta?.count || results.length);

        const mappedArticles: ScholarlyArticle[] = results.map((work: any) => {
          const authors = (work.authorships || []).map((a: any) => ({
            name: a.author?.display_name || 'Anonymous',
            institution: a.institutions?.[0]?.display_name,
          }));

          const journalOrVenue =
            work.primary_location?.source?.display_name ||
            work.host_venue?.display_name ||
            work.locations?.[0]?.source?.display_name ||
            'Scholarly Publication';

          const abstract = parseInvertedIndexAbstract(work.abstract_inverted_index);

          const pdfUrl =
            work.open_access?.oa_url ||
            work.primary_location?.pdf_url ||
            null;

          const landingPageUrl =
            work.primary_location?.landing_page_url ||
            work.doi ||
            work.id ||
            null;

          return {
            id: work.id || String(Math.random()),
            doi: work.doi || null,
            title: work.title || 'Untitled Scholarly Work',
            authors,
            journalOrVenue,
            publicationYear: work.publication_year || new Date().getFullYear(),
            citedByCount: work.cited_by_count || 0,
            type: work.type ? work.type.replace('-', ' ') : 'Journal Article',
            abstract,
            pdfUrl,
            landingPageUrl,
            isOpenAccess: Boolean(work.open_access?.is_oa),
          };
        });

        setArticles(mappedArticles);
        setActiveSearchTerm(trimmed);
      } catch (err) {
        console.error('Academic search error:', err);
        setErrorMessage('Research search is temporarily unavailable. Please try again.');
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Trigger initial search
  useEffect(() => {
    performSearch(query, page, sortBy, minYear, openAccessOnly);
  }, []); // Run once on mount

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    performSearch(query, 1, sortBy, minYear, openAccessOnly);
  };

  const handlePresetClick = (preset: string) => {
    setQuery(preset);
    setPage(1);
    performSearch(preset, 1, sortBy, minYear, openAccessOnly);
  };

  const handleSortChange = (newSort: 'relevance' | 'date' | 'citations') => {
    setSortBy(newSort);
    setPage(1);
    performSearch(query, 1, newSort, minYear, openAccessOnly);
  };

  const handleYearChange = (newYear: string) => {
    setMinYear(newYear);
    setPage(1);
    performSearch(query, 1, sortBy, newYear, openAccessOnly);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    setPage(newPage);
    performSearch(activeSearchTerm, newPage, sortBy, minYear, openAccessOnly);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Generate Citation formats
  const generateCitation = (art: ScholarlyArticle, style: CitationStyle): string => {
    const authorList = art.authors.map((a) => a.name).join(', ');
    const firstAuthor = art.authors[0]?.name || 'Author';
    const year = art.publicationYear;
    const title = art.title;
    const venue = art.journalOrVenue;
    const doiStr = art.doi ? ` https://doi.org/${art.doi.replace(/^https?:\/\/doi.org\//, '')}` : '';

    switch (style) {
      case 'APA':
        return `${authorList || 'Anonymous'}. (${year}). ${title}. ${venue}.${doiStr}`;
      case 'MLA':
        return `${authorList || 'Anonymous'}. "${title}." ${venue}, ${year}.${doiStr}`;
      case 'CHICAGO':
        return `${authorList || 'Anonymous'}. "${title}." ${venue} (${year}).${doiStr}`;
      case 'BIBTEX': {
        const citeKey = `${firstAuthor.split(' ').pop()?.toLowerCase() || 'paper'}${year}`;
        return `@article{${citeKey},\n  title={${title}},\n  author={${authorList}},\n  journal={${venue}},\n  year={${year}},\n  doi={${art.doi || ''}}\n}`;
      }
      default:
        return `${authorList}. (${year}). ${title}. ${venue}.`;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2200);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Workspace Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <GraduationCap className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wider">
                  ACADEMIC RESEARCH WORKSPACE
                </h1>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono-code font-bold">
                  LIVE SCHOLARLY INDEX
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400">
                Institutional papers, peer-reviewed journals, and empirical finance studies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-code text-slate-400">
              Indexed Library: <span className="text-emerald-400 font-semibold">250M+ Works</span>
            </span>
          </div>
        </div>

        {/* Primary Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-5 relative">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Academic Research / Google Scholar index (e.g., market structure, forex liquidity, trading psychology)..."
              className="w-full pl-12 pr-28 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-mono-code text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  SEARCHING...
                </span>
              ) : (
                'SEARCH'
              )}
            </button>
          </div>
        </form>

        {/* Curated Scholarly Search Queries */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-mono-code">
          <span className="text-slate-500 shrink-0 text-[11px] font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Presets:
          </span>
          {CURATED_SEARCH_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer border ${
                activeSearchTerm === preset
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-300">Filters:</span>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Most Recent Date</option>
              <option value="citations">Most Cited</option>
            </select>
          </div>

          {/* Publication Year Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Published:</span>
            <select
              value={minYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Any Time</option>
              <option value="2024">Since 2024</option>
              <option value="2022">Since 2022</option>
              <option value="2020">Since 2020</option>
              <option value="2015">Since 2015</option>
            </select>
          </div>

          {/* Open Access Toggle */}
          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={openAccessOnly}
              onChange={(e) => {
                setOpenAccessOnly(e.target.checked);
                setPage(1);
                performSearch(activeSearchTerm, 1, sortBy, minYear, e.target.checked);
              }}
              className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
            />
            <span>Open Access Only</span>
          </label>
        </div>

        {/* Results Metadata & Count */}
        <div className="text-slate-400 text-[11px]">
          {isLoading ? (
            <span>Querying academic repositories...</span>
          ) : totalCount > 0 ? (
            <span>
              Found <strong className="text-emerald-400">{totalCount.toLocaleString()}</strong> scholarly works
            </span>
          ) : (
            <span>Ready for search</span>
          )}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-300 text-xs font-mono-code">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{errorMessage}</p>
            <p className="text-red-400/80 text-[11px] mt-0.5">
              Check your network connection or try a different academic query.
            </p>
          </div>
          <button
            type="button"
            onClick={() => performSearch(activeSearchTerm, page, sortBy, minYear, openAccessOnly)}
            className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-[11px] font-bold"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 animate-pulse space-y-3"
            >
              <div className="h-5 bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-800/60 rounded w-1/2" />
              <div className="h-16 bg-slate-800/40 rounded w-full" />
              <div className="flex gap-2">
                <div className="h-7 w-20 bg-slate-800 rounded" />
                <div className="h-7 w-28 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && articles.length === 0 && (
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Library className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
          <h3 className="text-base font-military font-bold text-slate-300">
            No scholarly results found for this query.
          </h3>
          <p className="text-xs font-mono-code text-slate-500 max-w-md mx-auto">
            Try adjusting search terms, removing year filters, or exploring institutional queries like &quot;foreign exchange microstructure&quot; or &quot;trading psychology&quot;.
          </p>
        </div>
      )}

      {/* Search Results List */}
      {!isLoading && articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((art) => {
            const isBookmarked = savedBookmarks.includes(art.id);

            return (
              <div
                key={art.id}
                className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 sm:p-5 transition shadow-sm space-y-3"
              >
                {/* Header Row: Title & Bookmark */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2
                      onClick={() => setSelectedArticle(art)}
                      className="text-base sm:text-lg font-military font-bold text-slate-100 hover:text-emerald-400 transition cursor-pointer leading-snug"
                    >
                      {art.title}
                    </h2>

                    {/* Metadata strip: Authors, Journal, Year */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs font-mono-code text-slate-400">
                      {art.authors.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <User className="w-3 h-3 text-slate-500" />
                          {art.authors.slice(0, 3).map((a) => a.name).join(', ')}
                          {art.authors.length > 3 && ` et al.`}
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-emerald-400/90">
                        <Building className="w-3 h-3 text-slate-500" />
                        {art.journalOrVenue}
                      </span>

                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {art.publicationYear}
                      </span>

                      {art.citedByCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                          Cited by {art.citedByCount.toLocaleString()}
                        </span>
                      )}

                      {art.isOpenAccess && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          Open Access
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    type="button"
                    onClick={() => toggleBookmark(art.id)}
                    className={`p-2 rounded-lg border transition cursor-pointer shrink-0 ${
                      isBookmarked
                        ? 'bg-blue-500/20 text-amber-300 border-blue-500/40'
                        : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                    title={isBookmarked ? 'Saved to collection' : 'Bookmark paper'}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>

                {/* Abstract Preview */}
                {art.abstract ? (
                  <p className="text-xs font-mono-code text-slate-400 leading-relaxed line-clamp-3">
                    {art.abstract}
                  </p>
                ) : (
                  <p className="text-xs font-mono-code text-slate-500 italic">
                    Abstract available through publisher index. Click below to inspect paper details.
                  </p>
                )}

                {/* Actions Strip */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Abstract / Details Modal */}
                    <button
                      type="button"
                      onClick={() => setSelectedArticle(art)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Abstract / Overview</span>
                    </button>

                    {/* Copy Citation */}
                    <button
                      type="button"
                      onClick={() => setCitationModalArticle(art)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-mono-code flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Quote className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Cite Paper</span>
                    </button>

                    {/* Legitimate Open Access PDF (only if truly available) */}
                    {art.pdfUrl && (
                      <a
                        href={art.pdfUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Access PDF</span>
                      </a>
                    )}

                    {/* Publisher Landing Page / DOI */}
                    {art.landingPageUrl && (
                      <a
                        href={art.landingPageUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono-code flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Publisher Page</span>
                      </a>
                    )}
                  </div>

                  {art.doi && (
                    <span className="text-[10px] font-mono-code text-slate-500">
                      DOI: {art.doi.replace(/^https?:\/\/doi.org\//, '')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs font-mono-code">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => handlePageChange(page - 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Page</span>
            </button>

            <span className="text-slate-400">
              Page <strong className="text-emerald-400">{page}</strong> of{' '}
              {Math.max(1, Math.ceil(totalCount / 10))}
            </span>

            <button
              type="button"
              disabled={page * 10 >= totalCount || isLoading}
              onClick={() => handlePageChange(page + 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 transition cursor-pointer"
            >
              <span>Next Page</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ARTICLE ABSTRACT & DETAILS MODAL */}
      {selectedArticle && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
            isArticleFullscreen
              ? 'p-0 bg-slate-950/95 backdrop-blur-md'
              : 'p-4 bg-slate-950/80 backdrop-blur-sm'
          }`}
        >
          <div
            className={`bg-slate-950 border border-slate-700 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
              isArticleFullscreen
                ? 'w-full h-full rounded-none max-w-none max-h-none'
                : 'rounded-2xl w-full max-w-3xl max-h-[88vh]'
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-950/60">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono-code font-bold">
                  {selectedArticle.type.toUpperCase()}
                </span>
                <h3 className="text-base sm:text-lg font-military font-bold text-slate-100 leading-snug">
                  {selectedArticle.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsArticleFullscreen(!isArticleFullscreen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono-code font-bold transition cursor-pointer"
                  title={isArticleFullscreen ? 'Minimize to window' : 'Expand to full screen'}
                >
                  {isArticleFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>MINIMIZE</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>FULLSCREEN</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArticle(null);
                    setIsArticleFullscreen(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono-code">
              {/* Authors & Institutions */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Authors & Affiliations
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.authors.map((a, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      <span className="font-bold">{a.name}</span>
                      {a.institution && (
                        <span className="text-slate-400 block text-[10px]">{a.institution}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Journal / Year / Citations strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">PUBLICATION VENUE</span>
                  <span className="font-bold text-slate-200">{selectedArticle.journalOrVenue}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">YEAR OF PUBLICATION</span>
                  <span className="font-bold text-slate-200">{selectedArticle.publicationYear}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CITATION COUNT</span>
                  <span className="font-bold text-emerald-400">
                    {selectedArticle.citedByCount.toLocaleString()} Citations
                  </span>
                </div>
              </div>

              {/* Abstract */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Abstract
                </h4>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-4 text-slate-300 leading-relaxed text-xs">
                  {selectedArticle.abstract ||
                    'Full abstract is archived directly by the host journal and index repository. Refer to the publisher landing link below to access the full catalogued paper.'}
                </div>
              </div>

              {/* DOI and URLs */}
              {selectedArticle.doi && (
                <div>
                  <span className="text-slate-500 block text-[10px]">DIGITAL OBJECT IDENTIFIER (DOI)</span>
                  <a
                    href={`https://doi.org/${selectedArticle.doi.replace(/^https?:\/\/doi.org\//, '')}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-emerald-400 hover:underline break-all"
                  >
                    https://doi.org/{selectedArticle.doi.replace(/^https?:\/\/doi.org\//, '')}
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setCitationModalArticle(selectedArticle);
                }}
                className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-amber-300 border border-blue-500/40 text-xs font-military font-bold tracking-wider cursor-pointer"
              >
                CITE THIS WORK
              </button>

              <div className="flex items-center gap-2">
                {selectedArticle.pdfUrl && (
                  <a
                    href={selectedArticle.pdfUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-military font-bold tracking-wider cursor-pointer"
                  >
                    OPEN ACCESS PDF
                  </a>
                )}
                {selectedArticle.landingPageUrl && (
                  <a
                    href={selectedArticle.landingPageUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-military font-bold tracking-wider"
                  >
                    VISIT REPOSITORY
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CITATION GENERATOR MODAL */}
      {citationModalArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Quote className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-military font-bold text-slate-100">
                  EXPORT ACADEMIC CITATION
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCitationModalArticle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono-code">
              {/* Citation Format Switcher */}
              <div className="flex items-center gap-2">
                {(['APA', 'MLA', 'CHICAGO', 'BIBTEX'] as CitationStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setSelectedCitationStyle(style)}
                    className={`px-3 py-1 rounded text-xs transition cursor-pointer font-bold border ${
                      selectedCitationStyle === style
                        ? 'bg-blue-500/20 text-amber-300 border-blue-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              {/* Formatted Citation Block */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono-code text-slate-200 leading-relaxed select-all">
                {generateCitation(citationModalArticle, selectedCitationStyle)}
              </div>

              {/* Copy Button */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Ready for copy into LaTeX, Word, Overleaf, or reference managers.
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(generateCitation(citationModalArticle, selectedCitationStyle))
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>COPY CITATION</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
