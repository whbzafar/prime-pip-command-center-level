import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Globe2,
  Landmark,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type Bias = 'BULLISH' | 'BEARISH' | 'MIXED';

interface FundamentalIndicator {
  id: string;
  name: string;
  category: string;
  whatItMeasures: string;
  whyItMovesCurrency: string;
  bullishSignal: string;
  bearishSignal: string;
  timing: string;
  sources: { label: string; url: string }[];
}

interface OnlineIndicator {
  id: string;
  name: string;
  description: string;
  source: string;
  url: string;
}

const INDICATORS: FundamentalIndicator[] = [
  {
    id: 'central-bank',
    name: 'Central-bank policy and rate expectations',
    category: 'Monetary policy',
    whatItMeasures: 'The policy rate, guidance, meeting statement, and expected path of future rates.',
    whyItMovesCurrency: 'Higher expected returns on a currency’s interest-bearing assets can attract capital. Markets usually react to the expected path, not only the latest rate.',
    bullishSignal: 'The central bank is more hawkish than markets expected, or expected rates rise relative to the other currency.',
    bearishSignal: 'The central bank is more dovish than expected, signals cuts, or expected rates fall relative to the other currency.',
    timing: 'Every policy meeting; repricing can happen immediately after decisions, speeches, minutes, and major data releases.',
    sources: [
      { label: 'Federal Reserve FOMC', url: 'https://www.federalreserve.gov/monetarypolicy/fomc.htm' },
      { label: 'ECB monetary policy', url: 'https://www.ecb.europa.eu/press/govcdec/mopo/html/index.en.html' },
    ],
  },
  {
    id: 'inflation',
    name: 'Inflation: CPI and core inflation',
    category: 'Prices',
    whatItMeasures: 'How quickly consumer prices are changing. Core measures remove volatile food and energy components; each country defines its official measure differently.',
    whyItMovesCurrency: 'Persistent inflation can keep policy rates high, but very high inflation can also damage real incomes and growth. The policy reaction and the surprise versus expectations matter.',
    bullishSignal: 'Inflation is sticky enough to support a relatively tighter policy path, without a growth shock, and the release is above expectations.',
    bearishSignal: 'Inflation is cooling faster than expected and supports earlier easing, or high inflation is causing a severe growth and confidence shock.',
    timing: 'Usually monthly. Compare year-over-year and month-over-month changes with the consensus forecast and the central bank’s target.',
    sources: [
      { label: 'US CPI (BLS)', url: 'https://www.bls.gov/cpi/' },
      { label: 'Eurostat HICP', url: 'https://ec.europa.eu/eurostat/web/hicp' },
    ],
  },
  {
    id: 'employment',
    name: 'Employment, unemployment, and wages',
    category: 'Growth and labor',
    whatItMeasures: 'Job creation, the unemployment rate, labor-force participation, vacancies, and wage growth.',
    whyItMovesCurrency: 'A resilient labor market can support household spending and a tighter policy path. Weak employment usually reduces growth and rate expectations.',
    bullishSignal: 'Employment and wages beat expectations while unemployment remains contained, especially when the data changes rate expectations.',
    bearishSignal: 'Job losses, rising unemployment, falling participation, or a meaningful downside surprise in payrolls and wages.',
    timing: 'Payrolls and unemployment are generally monthly; wage and labor-demand details should be read together rather than in isolation.',
    sources: [
      { label: 'US Employment Situation (BLS)', url: 'https://www.bls.gov/news.release/empsit.nr0.htm' },
      { label: 'Euro area labor data (Eurostat)', url: 'https://ec.europa.eu/eurostat/web/labour-market' },
    ],
  },
  {
    id: 'growth',
    name: 'GDP and activity surveys',
    category: 'Growth and labor',
    whatItMeasures: 'GDP measures total economic output. PMI and similar surveys provide faster evidence about business activity, new orders, and employment.',
    whyItMovesCurrency: 'Stronger relative growth can attract investment and reduce the need for policy easing; weak growth can do the opposite.',
    bullishSignal: 'GDP, composite PMI, new orders, and employment components show durable expansion above expectations.',
    bearishSignal: 'Output contracts, PMIs remain below 50, or forward-looking orders deteriorate materially.',
    timing: 'GDP is quarterly and revised. PMIs are usually monthly and are useful for spotting turning points before official GDP.',
    sources: [
      { label: 'US BEA GDP', url: 'https://www.bea.gov/data/gdp/gross-domestic-product' },
      { label: 'S&P Global PMI', url: 'https://www.pmi.spglobal.com/Public/Home/PressRelease' },
    ],
  },
  {
    id: 'consumption',
    name: 'Retail sales and consumer demand',
    category: 'Domestic demand',
    whatItMeasures: 'Spending by households and the strength of consumer demand, often excluding volatile categories for the underlying trend.',
    whyItMovesCurrency: 'Consumption is a major part of many economies. Strong demand can lift growth and keep policy tighter; weak demand can signal slowdown.',
    bullishSignal: 'Underlying sales grow above expectations and revisions improve, without an accompanying inflation or credit shock.',
    bearishSignal: 'Sales contract broadly, prior months are revised down, or consumers are weakening because financing stress is rising.',
    timing: 'Usually monthly. Check the control or core measure and real spending context where available.',
    sources: [
      { label: 'US Census retail sales', url: 'https://www.census.gov/retail/index.html' },
      { label: 'UK retail sales (ONS)', url: 'https://www.ons.gov.uk/businessindustryandtrade/retailindustry' },
    ],
  },
  {
    id: 'external-balance',
    name: 'Trade balance and current account',
    category: 'External sector',
    whatItMeasures: 'Exports minus imports, plus the broader current account, which includes income and transfers.',
    whyItMovesCurrency: 'Persistent external surpluses can create natural demand for a currency; deficits require financing and may increase sensitivity to capital flows.',
    bullishSignal: 'A durable improvement in exports, terms of trade, or current-account balance supported by productive investment.',
    bearishSignal: 'A widening deficit that depends on unstable financing, or an export shock that reduces foreign-currency receipts.',
    timing: 'Trade data is often monthly; current-account data is usually quarterly. Avoid treating one month as a structural trend.',
    sources: [
      { label: 'US Census trade data', url: 'https://www.census.gov/foreign-trade/data/index.html' },
      { label: 'IMF external sector data', url: 'https://data.imf.org/' },
    ],
  },
  {
    id: 'commodities-terms',
    name: 'Commodity prices and terms of trade',
    category: 'External sector',
    whatItMeasures: 'The prices of a country’s key exports relative to the price of its imports. This is especially important for commodity-linked currencies.',
    whyItMovesCurrency: 'Higher export prices can improve national income, trade flows, and fiscal receipts; lower prices can create the reverse pressure.',
    bullishSignal: 'Export commodities rise while the economy and fiscal position benefit, as often seen in commodity exporters.',
    bearishSignal: 'A sustained export-price decline weakens income, investment, and the trade balance.',
    timing: 'Market prices are continuous; use them with trade, production, and fiscal data to confirm the transmission to the economy.',
    sources: [
      { label: 'World Bank commodity data', url: 'https://www.worldbank.org/en/research/commodity-markets' },
      { label: 'IMF commodity prices', url: 'https://www.imf.org/en/Research/commodity-prices' },
    ],
  },
  {
    id: 'positioning-risk',
    name: 'Positioning and global risk appetite',
    category: 'Market context',
    whatItMeasures: 'Speculative positioning, volatility, credit conditions, and whether investors are seeking risk or safety.',
    whyItMovesCurrency: 'Currencies have different risk and funding roles. Safe-haven demand can override domestic data; crowded positioning can amplify reversals.',
    bullishSignal: 'Positioning is not excessively crowded, risk conditions support the currency’s role, and price confirms the fundamental impulse.',
    bearishSignal: 'A crowded long position unwinds, funding stress rises, or global risk aversion favors another currency.',
    timing: 'Risk pricing is continuous. CFTC positioning is weekly and delayed, so use it as context, not a real-time trigger.',
    sources: [
      { label: 'CFTC Commitments of Traders', url: 'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm' },
      { label: 'BIS statistics', url: 'https://www.bis.org/statistics/index.htm' },
    ],
  },
];

const BIAS_OPTIONS: { value: Bias; label: string }[] = [
  { value: 'BULLISH', label: 'Bullish' },
  { value: 'BEARISH', label: 'Bearish' },
  { value: 'MIXED', label: 'Mixed / unclear' },
];

export const FundamentalIndicators: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [selectedId, setSelectedId] = useState(INDICATORS[0].id);
  const [biases, setBiases] = useState<Record<string, Bias>>({});
  const [onlineResults, setOnlineResults] = useState<OnlineIndicator[]>([]);
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setOnlineResults([]);
      setOnlineError(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsOnlineLoading(true);
      setOnlineError(null);
      try {
        const response = await fetch(`/api/fundamental-indicators/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Online indicator search failed.');
        setOnlineResults(Array.isArray(body.results) ? body.results : []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setOnlineResults([]);
          setOnlineError(error instanceof Error ? error.message : 'Online indicator search failed.');
        }
      } finally {
        if (!controller.signal.aborted) setIsOnlineLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(INDICATORS.map((indicator) => indicator.category)))],
    [],
  );
  const filteredIndicators = INDICATORS.filter((indicator) => {
    const searchable = `${indicator.name} ${indicator.category} ${indicator.whatItMeasures}`.toLowerCase();
    return (category === 'ALL' || indicator.category === category) &&
      searchable.includes(query.trim().toLowerCase());
  });
  const selected = INDICATORS.find((indicator) => indicator.id === selectedId) || filteredIndicators[0] || INDICATORS[0];

  const updateBias = (id: string, value: Bias) => {
    setBiases((current) => ({ ...current, [id]: value }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-cyan-300">
              <Globe2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-military font-bold tracking-wider text-slate-100">FUNDAMENTAL INDICATORS</h1>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
                A plain-language framework for judging relative currency strength. No single release proves a bullish or bearish trend:
                compare the surprise, the policy reaction, the other currency, and the wider risk environment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono-code text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> EDUCATIONAL REFERENCE
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search indicators..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            />
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-mono-code font-bold ${
                    category === item ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  {item === 'ALL' ? 'ALL' : item}
                </button>
              ))}
            </div>
            {query.trim().length >= 2 && (
              <div className="mt-3 border-t border-slate-800 pt-3">
                <div className="mb-2 flex items-center justify-between text-[10px] font-mono-code text-slate-400">
                  <span>ONLINE INDICATOR CATALOG (WORLD BANK)</span>
                  {isOnlineLoading && <span className="text-cyan-300">SEARCHING...</span>}
                </div>
                {onlineError ? (
                  <p className="text-[10px] text-amber-300">{onlineError} Curated indicators remain available.</p>
                ) : onlineResults.length > 0 ? (
                  <div className="space-y-2">
                    {onlineResults.map((result) => (
                      <a
                        key={result.id}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 hover:border-cyan-400/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-cyan-200">{result.name}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-cyan-400" />
                        </div>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{result.description}</p>
                      </a>
                    ))}
                  </div>
                ) : !isOnlineLoading ? (
                  <p className="text-[10px] text-slate-500">No online catalog match. Try a broader term such as inflation, employment, GDP, or trade.</p>
                ) : null}
              </div>
            )}
          </div>
          {filteredIndicators.map((indicator) => {
            const bias = biases[indicator.id] || 'MIXED';
            return (
              <button
                key={indicator.id}
                type="button"
                onClick={() => setSelectedId(indicator.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selected.id === indicator.id ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono-code text-cyan-400">{indicator.category}</span>
                    <h2 className="mt-1 text-sm font-bold text-slate-100">{indicator.name}</h2>
                  </div>
                  {bias === 'BULLISH' ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : bias === 'BEARISH' ? <TrendingDown className="h-4 w-4 text-rose-400" /> : <Activity className="h-4 w-4 text-amber-300" />}
                </div>
                <div className="mt-3 flex gap-1">
                  {BIAS_OPTIONS.map((option) => (
                    <span
                      key={option.value}
                      onClick={(event) => { event.stopPropagation(); updateBias(indicator.id, option.value); }}
                      className={`rounded border px-2 py-1 text-[9px] font-mono-code ${
                        bias === option.value ? 'border-cyan-400/50 bg-slate-900 text-cyan-200' : 'border-slate-800 text-slate-500'
                      }`}
                    >
                      {option.label}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <article className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono-code font-bold text-cyan-400">{selected.category}</span>
              <h2 className="mt-1 text-xl font-military font-bold text-slate-100">{selected.name}</h2>
            </div>
            <Landmark className="h-6 w-6 text-amber-300" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ['What it represents', selected.whatItMeasures, BookOpen],
              ['Why it matters', selected.whyItMovesCurrency, BarChart3],
              ['Bullish reading', selected.bullishSignal, TrendingUp],
              ['Bearish reading', selected.bearishSignal, TrendingDown],
              ['When it applies', selected.timing, Activity],
            ].map(([title, text, Icon]) => (
              <div key={title as string} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Icon className="h-4 w-4 text-cyan-400" />
                  {title as string}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{text as string}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <h3 className="text-xs font-bold text-amber-200">How to use it for a currency pair</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Compare this indicator for the base currency with the same indicator for the quote currency. Favor the currency with the stronger
              relative surprise and policy support, then check whether price action confirms it. A good reading can be overridden by a central-bank
              repricing, geopolitical shock, or broad risk-off move.
            </p>
          </div>
          <div className="mt-5">
            <h3 className="mb-2 text-xs font-bold text-slate-300">Official data sources</h3>
            <div className="flex flex-wrap gap-2">
              {selected.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-mono-code text-cyan-300 hover:border-cyan-400/50">
                  {source.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};
