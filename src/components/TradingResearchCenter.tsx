import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Layers,
  Zap,
  TrendingUp,
  ShieldCheck,
  Compass,
  FileText,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart2,
  Bookmark,
  Share2,
  Copy,
  Check,
} from 'lucide-react';

export type ResearchCategory =
  | 'ALL'
  | 'MARKET_STRUCTURE'
  | 'LIQUIDITY_MECHANICS'
  | 'ICT_SBT_MODELS'
  | 'WYCKOFF_PRINCIPLES'
  | 'MACRO_FUNDAMENTALS'
  | 'RISK_MATRIX';

interface ResearchArticle {
  id: string;
  category: ResearchCategory;
  title: string;
  subtitle: string;
  readingTime: string;
  difficulty: 'FOUNDATIONAL' | 'INTERMEDIATE' | 'INSTITUTIONAL';
  summary: string;
  corePrinciples: string[];
  keyRules: {
    setupCondition: string;
    entryTrigger: string;
    invalidation: string;
    profitTargeting: string;
  };
  cheatSheetTip: string;
}

const RESEARCH_DATABASE: ResearchArticle[] = [
  {
    id: 'res-ms-01',
    category: 'MARKET_STRUCTURE',
    title: 'Market Structure Shift (MSS) vs Break of Structure (BOS)',
    subtitle: 'Institutional order flow mapping and trend inflection mechanics',
    readingTime: '6 min',
    difficulty: 'FOUNDATIONAL',
    summary:
      'Understanding the structural distinction between a continuation break (BOS) and an institutional trend reversal (MSS) prevents entering trades against prevailing order flow.',
    corePrinciples: [
      'BOS (Break of Structure): A candle close beyond a previous high or low in the direction of the macro trend, confirming trend continuation.',
      'MSS (Market Structure Shift): A decisive displacement close across the most recent counter-trend swing point, signaling that institutional inventory has shifted.',
      'Displacement Requirement: A valid MSS must be accompanied by energetic candles leaving Fair Value Gaps, rather than hesitant wicks.',
      'Multi-Timeframe Alignment: Daily and H4 define direction; M15 and M5 provide structural trigger confirmation.',
    ],
    keyRules: {
      setupCondition: 'Identify major H4/H1 swing high or low swept during key London/NY session killzone.',
      entryTrigger: 'M5/M15 displacement candle closes past previous swing point with clear FVG creation.',
      invalidation: 'Swing high or low that created the displacement is breached by market price.',
      profitTargeting: 'Next opposing high-timeframe internal range liquidity or external swing liquidity.',
    },
    cheatSheetTip:
      'Never trade a break without displacement. A wick beyond a level is liquidity capture, not a structure shift.',
  },
  {
    id: 'res-liq-01',
    category: 'LIQUIDITY_MECHANICS',
    title: 'Internal vs External Range Liquidity Mechanics',
    subtitle: 'How smart money engineers stop runs before directional delivery',
    readingTime: '8 min',
    difficulty: 'INSTITUTIONAL',
    summary:
      'Price delivers perpetually between two states: External Range Liquidity (swing highs and lows) and Internal Range Liquidity (Fair Value Gaps and imbalance pockets).',
    corePrinciples: [
      'Buy-Side Liquidity (BSL): Resting buy-stop orders above key swing highs, equal highs, and trendline resistances.',
      'Sell-Side Liquidity (SSL): Resting sell-stop orders below swing lows, double bottoms, and support levels.',
      'Inducement (IDM): Minor structural swing points engineered specifically to bait early retail traders before true liquidity is taken.',
      'Liquidity Run into Displaced Delivery: The institutional sequence always involves sweeping resting liquidity into an imbalance before expansion.',
    ],
    keyRules: {
      setupCondition: 'Identify prominent Equal Highs (EQH) or Equal Lows (EQL) awaiting liquidity collection.',
      entryTrigger: 'Wait for price to breach the equal highs/lows, reject decisively, and leave an opposing Fair Value Gap.',
      invalidation: 'Price sustains candle closes beyond the extreme sweep wick.',
      profitTargeting: 'Opposing Internal Range Liquidity (first clean FVG) followed by external major swing extreme.',
    },
    cheatSheetTip:
      'Retail sees support and resistance; institutions see liquidity pools to fill substantial institutional volume.',
  },
  {
    id: 'res-ict-01',
    category: 'ICT_SBT_MODELS',
    title: 'SBT Model 1: London Open Session Sweep & Expansion',
    subtitle: 'High-probability execution protocol during 07:00 - 10:00 London Killzone',
    readingTime: '7 min',
    difficulty: 'INSTITUTIONAL',
    summary:
      'The definitive London Open algorithm: Asian session range is manipulated during the initial 60-90 minutes of the London session to capture liquidity before the genuine daily trend expands.',
    corePrinciples: [
      'Asian Range Reference: 00:00 - 06:00 GMT consolidation marks the baseline range (high and low).',
      'Judas Swing (The Manipulation): London open creates an energetic fake push against the true daily bias to run Asian stops.',
      'Market Structure Shift (MSS): After Asian extreme is swept, wait for lower timeframe M5 shift back toward daily bias.',
      'Fair Value Gap (FVG) Retest: Enter on 50% equilibrium of the created imbalance.',
    ],
    keyRules: {
      setupCondition: 'Asian range high or low swept between 07:00 and 08:30 London Killzone.',
      entryTrigger: 'M5 MSS followed by limit or market order on the newly formed Fair Value Gap.',
      invalidation: 'Stop Loss strictly set 2-3 pips beyond the manipulation sweep wick.',
      profitTargeting: 'Asian session opposite extreme (Asian High if entered long, Asian Low if entered short).',
    },
    cheatSheetTip:
      'If London sweeps Asian low first and shifts bullish, the probability of daily high forming in London is near zero. Expect NY continuation.',
  },
  {
    id: 'res-wyck-01',
    category: 'WYCKOFF_PRINCIPLES',
    title: 'Wyckoff Accumulation & The "Spring" Phase Explained',
    subtitle: 'Institutional accumulation schematics and volume signature verification',
    readingTime: '9 min',
    difficulty: 'INTERMEDIATE',
    summary:
      'Richard Wyckoff’s timeless blueprint detailing how institutional composite operators accumulate massive supply without driving price higher until ready for the markup phase.',
    corePrinciples: [
      'Preliminary Support (PS) & Selling Climax (SC): High-volume panic selling exhausted into an initial automatic rally (AR).',
      'Secondary Test (ST): Price tests the selling climax low to verify whether supply has dried up.',
      'The Spring (Phase C): A deliberate breakdown beneath the trading range support to shake out final weak holders and capture buy liquidity.',
      'Sign of Strength (SOS) & Last Point of Support (LPS): Rapid displacement back inside the range with shallow pullbacks confirming institutional dominance.',
    ],
    keyRules: {
      setupCondition: 'Prolonged range bound structure with diminishing sell volume across tests.',
      entryTrigger: 'Price springs below range low, reclaims the range support, and retests the reclaimed level with low volume.',
      invalidation: 'Candle close below the Spring extreme low.',
      profitTargeting: 'Range High Resistance (Sign of Strength target) followed by 1:3 R:R extension.',
    },
    cheatSheetTip:
      'The Spring is the highest reward-to-risk setup in Wyckoff methodology because your invalidation is strictly defined right at the bottom.',
  },
  {
    id: 'res-macro-01',
    category: 'MACRO_FUNDAMENTALS',
    title: 'Central Bank Rate Differentials & Macro Currencies',
    subtitle: 'Understanding real yields, DXY mechanics, and high-impact volatility',
    readingTime: '10 min',
    difficulty: 'INSTITUTIONAL',
    summary:
      'Currencies are fundamentally driven by sovereign capital flows seeking yield and safety. Technical models work with 80%+ efficiency when aligned with macro monetary policy.',
    corePrinciples: [
      'Interest Rate Differentials: Capital flows into the currency offering higher real yields and sound central bank hawkishness.',
      'US Dollar Index (DXY) Inverse Correlation: EUR/USD, GBP/USD, and XAU/USD exhibit heavy inverse correlation to DXY expansions.',
      'High-Impact News Release Protocol: Non-Farm Payrolls (NFP), Consumer Price Index (CPI), and FOMC statements create algorithmic liquidity sweeps; never enter during the first 15 minutes of release.',
      'Gold (XAU/USD) Macro Drivers: Driven by real US interest rates, sovereign central bank reserves purchases, and geopolitical hedging.',
    ],
    keyRules: {
      setupCondition: 'Identify weekly macroeconomic divergence between base and quote currencies (e.g. Fed hawkish vs ECB dovish).',
      entryTrigger: 'Execute technical SBT models strictly in the direction of the macro yield differential.',
      invalidation: 'Unexpected central bank pivot or structural technical failure on Daily timeframe.',
      profitTargeting: 'Multi-day swing targets and weekly liquidity pools.',
    },
    cheatSheetTip:
      'Never trade against the Federal Reserve. Technical setups that align with FOMC balance sheet policy have twice the statistical follow-through.',
  },
  {
    id: 'res-risk-01',
    category: 'RISK_MATRIX',
    title: 'The Institutional Risk Matrix & Capital Preservation Math',
    subtitle: 'The 1% Rule, Drawdown Asymmetry, and the 2-Trades-Per-Day Edge',
    readingTime: '5 min',
    difficulty: 'FOUNDATIONAL',
    summary:
      'The mathematical reality of professional trading: Profitability is a byproduct of strict risk containment and asymmetric reward-to-risk, never predictive certainty.',
    corePrinciples: [
      'The 1% Hard Ceiling: Limiting loss to 1% of total equity guarantees 100 consecutive mistakes required for ruin—mathematically insulating the account.',
      'Asymmetric Recovery Curve: A 10% loss requires an 11% gain to recover; a 50% loss requires a 100% gain to breakeven.',
      'The 2-Trades-Per-Day Limit: Psychological capital depletes rapidly after 2 decisions. Overtrading generates over 85% of retail account blowups.',
      'Minimum 1:2 R:R Ratio: With a 1:2.5 risk-to-reward ratio, a trader is highly profitable even with a modest 40% win rate.',
    ],
    keyRules: {
      setupCondition: 'Calculate position sizing BEFORE placing order using the Lot Size Calculator.',
      entryTrigger: 'Only enter if logical structural stop provides minimum 1:2 R:R to first liquidity pool.',
      invalidation: 'Daily loss limit (2%) reached = Terminal session shutdown.',
      profitTargeting: 'Scale 50-70% of position at 1:2R, move stop loss to breakeven, allow runner to target final liquidity.',
    },
    cheatSheetTip:
      'Amateurs obsess over what they can make. Professionals obsess over how much they could lose and whether capital is protected.',
  },
];

export const TradingResearchCenter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ResearchCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<ResearchArticle | null>(RESEARCH_DATABASE[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    return RESEARCH_DATABASE.filter((art) => {
      const matchesCat = selectedCategory === 'ALL' || art.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.subtitle.toLowerCase().includes(q) ||
        art.summary.toLowerCase().includes(q) ||
        art.cheatSheetTip.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleCopyCheatSheet = (art: ResearchArticle) => {
    const text = `[PRIMEPIPFX RESEARCH CHEAT SHEET: ${art.title}]\n\nSUMMARY:\n${art.summary}\n\nCORE RULES:\n• Setup Condition: ${art.keyRules.setupCondition}\n• Entry Trigger: ${art.keyRules.entryTrigger}\n• Invalidation: ${art.keyRules.invalidation}\n• Target: ${art.keyRules.profitTargeting}\n\nGOLDEN TIP: ${art.cheatSheetTip}`;
    navigator.clipboard.writeText(text);
    setCopiedId(art.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Directive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B0F19] to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono-code uppercase px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                  INSTITUTIONAL KNOWLEDGE REPOSITORY
                </span>
                <h1 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wider">
                  TRADING RESEARCH CENTER
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Curated, peer-reviewed institutional frameworks covering Market Structure, Liquidity Mechanics, ICT/SBT Models, Wyckoff Principles, and Macro Fundamentals.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase">CURATED PAPERS</div>
              <div className="text-lg font-military font-bold text-amber-400">
                {RESEARCH_DATABASE.length} INSTITUTIONAL GUIDES
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, ICT models, Wyckoff..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono-code text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1">
            {[
              { id: 'ALL', label: 'ALL MODULES' },
              { id: 'MARKET_STRUCTURE', label: 'MARKET STRUCTURE' },
              { id: 'LIQUIDITY_MECHANICS', label: 'LIQUIDITY' },
              { id: 'ICT_SBT_MODELS', label: 'ICT / SBT MODELS' },
              { id: 'WYCKOFF_PRINCIPLES', label: 'WYCKOFF' },
              { id: 'MACRO_FUNDAMENTALS', label: 'MACRO' },
              { id: 'RISK_MATRIX', label: 'RISK MATRIX' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id as ResearchCategory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold tracking-wider whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Layout: Article List + Reader Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Article Selector */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-military font-bold text-slate-400 uppercase tracking-wider px-1">
            RESEARCH PAPERS ({filteredArticles.length})
          </div>

          <div className="space-y-2.5">
            {filteredArticles.map((art) => {
              const isSelected = activeArticle?.id === art.id;
              return (
                <div
                  key={art.id}
                  onClick={() => setActiveArticle(art)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                        {art.category.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono-code text-slate-400">
                        {art.readingTime}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 font-military leading-snug">
                      {art.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {art.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] font-mono-code">
                    <span
                      className={`font-bold ${
                        art.difficulty === 'INSTITUTIONAL'
                          ? 'text-purple-400'
                          : art.difficulty === 'INTERMEDIATE'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {art.difficulty}
                    </span>
                    <span className="text-slate-400 inline-flex items-center gap-1 group-hover:text-amber-400">
                      READ FRAMEWORK <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Article Inspector */}
        <div className="lg:col-span-7">
          {activeArticle ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 sticky top-20">
              {/* Header */}
              <div className="space-y-2 border-b border-slate-800 pb-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-code font-bold uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    {activeArticle.category.replace('_', ' ')} • {activeArticle.difficulty}
                  </span>
                  <button
                    onClick={() => handleCopyCheatSheet(activeArticle)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 text-xs font-mono-code transition cursor-pointer"
                  >
                    {copiedId === activeArticle.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">COPIED CHEAT SHEET!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY CHEAT SHEET</span>
                      </>
                    )}
                  </button>
                </div>

                <h2 className="text-lg sm:text-xl font-military font-bold text-slate-100 tracking-wider">
                  {activeArticle.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-sans">
                  {activeArticle.subtitle}
                </p>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="text-[10px] font-mono-code text-amber-400 uppercase font-bold">
                  EXECUTIVE SUMMARY
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  {activeArticle.summary}
                </p>
              </div>

              {/* Core Principles */}
              <div className="space-y-3">
                <div className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                  CORE MECHANICS & INSTITUTIONAL LAWS
                </div>
                <div className="space-y-2">
                  {activeArticle.corePrinciples.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Protocol / Key Rules */}
              <div className="p-5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-military font-bold text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>EXECUTION PROTOCOL MATRIX</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-code">
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-slate-500 uppercase text-[10px]">1. SETUP CONDITION</span>
                    <p className="text-slate-200">{activeArticle.keyRules.setupCondition}</p>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-slate-500 uppercase text-[10px]">2. ENTRY TRIGGER</span>
                    <p className="text-slate-200">{activeArticle.keyRules.entryTrigger}</p>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-rose-400 uppercase text-[10px]">3. INVALIDATION (SL)</span>
                    <p className="text-slate-200">{activeArticle.keyRules.invalidation}</p>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-emerald-400 uppercase text-[10px]">4. TARGETING (TP)</span>
                    <p className="text-slate-200">{activeArticle.keyRules.profitTargeting}</p>
                  </div>
                </div>
              </div>

              {/* Golden Tip / Cheat Sheet Notice */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono-code text-amber-200 space-y-1">
                <div className="font-bold text-amber-400 text-[10px] uppercase">
                  PRACTICAL CHEAT SHEET TAKEAWAY
                </div>
                <p className="leading-relaxed">
                  "{activeArticle.cheatSheetTip}"
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 font-mono-code bg-slate-900/40 rounded-2xl border border-slate-800">
              SELECT AN ARTICLE TO BEGIN STUDY
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
