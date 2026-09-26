import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  Target,
  Bot,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  DollarSign,
  Coins,
  Globe,
  Flame,
  ArrowRight,
  Search,
  Bookmark,
  Share2,
  Lock,
} from 'lucide-react';

type MainSectionTab = 'STRATEGIES' | 'EXECUTION_COURSES' | 'BOTS_AUTOMATION';
type CoursePhaseTab = 'PHASE_1_BASIC' | 'PHASE_2_INTERMEDIATE' | 'PHASE_3_ADVANCED';

export const ProLearningTrading: React.FC = () => {
  const [activeSection, setActiveSection] = useState<MainSectionTab>('STRATEGIES');
  const [activePhase, setActivePhase] = useState<CoursePhaseTab>('PHASE_1_BASIC');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBasicChapter, setActiveBasicChapter] = useState<number>(1);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 px-2 sm:px-4 font-sans text-slate-100">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-r from-slate-950 via-[#0a1428] to-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-mono-code font-bold tracking-[0.2em] uppercase">
              <GraduationCap className="w-4 h-4" />
              <span>Prime Pip FX Institutional Academy</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] text-cyan-300">
                OFFICIAL CURRICULUM
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-military font-bold tracking-wide text-white">
              PRO LEARNING AND TRADING
            </h1>
            <p className="max-w-3xl text-xs sm:text-sm leading-6 text-slate-300">
              The complete institutional education division. Master foundational commerce, market history, currency mechanics, spread arbitrage, SBT model playbooks, and automated trading algorithms.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="https://www.tradingview.com/chart/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open TradingView Charts</span>
            </a>
          </div>
        </div>

        {/* 3 Main Sections Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-6 mt-6 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSection('STRATEGIES')}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
              activeSection === 'STRATEGIES'
                ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeSection === 'STRATEGIES' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-cyan-400'}`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-military font-bold uppercase tracking-wider">
                  1. Complete Trading Strategies
                </div>
                <div className="text-[10px] font-mono-code text-slate-400">
                  Basic, Intermediate & Advanced Phases
                </div>
              </div>
            </div>
            {activeSection === 'STRATEGIES' && <ChevronRight className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('EXECUTION_COURSES')}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
              activeSection === 'EXECUTION_COURSES'
                ? 'bg-blue-500/15 border-blue-400 text-white shadow-lg shadow-blue-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeSection === 'EXECUTION_COURSES' ? 'bg-blue-500 text-slate-950 font-bold' : 'bg-slate-800 text-blue-400'}`}>
                <Target className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-military font-bold uppercase tracking-wider">
                  2. Professional Execution Courses
                </div>
                <div className="text-[10px] font-mono-code text-slate-400">
                  Killzones, Checklists & Trader Psychology
                </div>
              </div>
            </div>
            {activeSection === 'EXECUTION_COURSES' && <ChevronRight className="w-4 h-4 text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('BOTS_AUTOMATION')}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
              activeSection === 'BOTS_AUTOMATION'
                ? 'bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeSection === 'BOTS_AUTOMATION' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-400'}`}>
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-military font-bold uppercase tracking-wider">
                  3. Trading Bots & Automation
                </div>
                <div className="text-[10px] font-mono-code text-slate-400">
                  Algorithmic SBT logic & Webhook Execution
                </div>
              </div>
            </div>
            {activeSection === 'BOTS_AUTOMATION' && <ChevronRight className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </section>

      {/* SECTION 1: COMPLETE TRADING STRATEGIES */}
      {activeSection === 'STRATEGIES' && (
        <div className="space-y-6">
          {/* Phase 1 / Phase 2 / Phase 3 Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActivePhase('PHASE_1_BASIC')}
                className={`px-4 py-2 rounded-xl text-xs font-military font-bold uppercase tracking-wider transition cursor-pointer ${
                  activePhase === 'PHASE_1_BASIC'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Phase 1: Basic Course
              </button>
              <button
                type="button"
                onClick={() => setActivePhase('PHASE_2_INTERMEDIATE')}
                className={`px-4 py-2 rounded-xl text-xs font-military font-bold uppercase tracking-wider transition cursor-pointer ${
                  activePhase === 'PHASE_2_INTERMEDIATE'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Phase 2: Intermediate Course
              </button>
              <button
                type="button"
                onClick={() => setActivePhase('PHASE_3_ADVANCED')}
                className={`px-4 py-2 rounded-xl text-xs font-military font-bold uppercase tracking-wider transition cursor-pointer ${
                  activePhase === 'PHASE_3_ADVANCED'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Phase 3 / Pro Level: Advanced Course
              </button>
            </div>

            <span className="text-[11px] font-mono-code text-cyan-400 px-3">
              {activePhase === 'PHASE_1_BASIC' && 'Foundations • History • 5 Trading Types • Spreads & Brokers'}
              {activePhase === 'PHASE_2_INTERMEDIATE' && 'Smart Money Concepts • Liquidity • Order Blocks & Gaps'}
              {activePhase === 'PHASE_3_ADVANCED' && 'SBT Models 1–10 • Top-Down Framework • Institutional Risk'}
            </span>
          </div>

          {/* PHASE 1: BASIC COURSE CONTENT */}
          {activePhase === 'PHASE_1_BASIC' && (
            <div className="space-y-6">
              {/* Basic Course Chapter Navigation Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono-code">
                {[
                  { num: 1, title: 'What is Trading?' },
                  { num: 2, title: 'History of Trading' },
                  { num: 3, title: 'The 5 Types of Trading' },
                  { num: 4, title: 'Forex Pairs & Mechanics' },
                  { num: 5, title: 'Spreads & Brokers' },
                  { num: 6, title: 'TradingView Chart Feeds' },
                  { num: 7, title: 'Candlesticks & Anatomy' },
                  { num: 8, title: 'Market Trends & Golden Rules' },
                ].map((ch) => (
                  <button
                    key={ch.num}
                    type="button"
                    onClick={() => setActiveBasicChapter(ch.num)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap font-bold transition cursor-pointer ${
                      activeBasicChapter === ch.num
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Chapter {ch.num}: {ch.title}
                  </button>
                ))}
              </div>

              {/* Chapter 1: Definition of Trading */}
              {(activeBasicChapter === 1 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>CHAPTER 1 • FOUNDATIONAL DEFINITION</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    WHAT IS TRADING?
                  </h2>

                  <div className="text-sm leading-7 text-slate-300 space-y-3">
                    <p>
                      At its most fundamental level, <strong className="text-cyan-300">trading means commerce, transacting, or exchanging goods</strong>. The core objective is simple and universal: <em>buying low and selling high</em>.
                    </p>
                    <p>
                      You can find countless examples of this in everyday life:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                        <div className="text-xs font-military font-bold text-amber-300 uppercase">
                          Everyday Example 1: Real Estate
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          An investor purchases a plot of land cheaply during a slow market period and waits for infrastructural development to sell it at a much higher price to a developer or homebuyer.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                        <div className="text-xs font-military font-bold text-cyan-300 uppercase">
                          Everyday Example 2: Grocery Commerce
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Visiting a grocery store to purchase essential food items by paying currency. The shopkeeper bought wholesale at a lower price and sells retail to consumers at a modest markup.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 pt-1">
                      This is how human commerce has always operated. Financial trading takes this same universal principle and applies it to financial assets like currencies, company shares, commodities, and index derivatives.
                    </p>
                  </div>
                </div>
              )}

              {/* Chapter 2: History of Trading */}
              {(activeBasicChapter === 2 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>CHAPTER 2 • HISTORICAL EVOLUTION</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    THE COMPLETE HISTORY OF TRADING
                  </h2>
                  <p className="text-xs text-slate-400">
                    From ancient direct physical barter to global fiber-optic algorithmic trading engines.
                  </p>

                  <div className="space-y-4 pt-2">
                    {/* Era 1: Barter System */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-military font-bold text-amber-300 uppercase tracking-wider">
                          1. The Era of the Barter System
                        </span>
                        <span className="text-[10px] font-mono-code text-slate-500">Ancient Times</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Under the <strong className="text-white">barter system</strong>, transactions occurred through direct item-for-item exchange without any money. If someone had corn but needed wheat, they would search the neighborhood for someone with surplus wheat; they would then propose an exchange—trading their corn for the other person's wheat.
                      </p>
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90">
                        <strong>Limitation of Barter:</strong> The "coincidence of wants" was required. If the wheat farmer did not want corn, no trade could occur. This friction forced humanity to invent standard media of exchange.
                      </div>
                    </div>

                    {/* Era 2: Emergence of Currency */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-military font-bold text-cyan-300 uppercase tracking-wider">
                          2. The Era of Currency: Gold, Silver & Lydia
                        </span>
                        <span className="text-[10px] font-mono-code text-slate-500">c. 600 BC</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Precious metals like gold and silver emerged as universally accepted stores of value due to their durability, divisibility, and rarity. The <strong className="text-white">first official government-stamped currency system originated in the Kingdom of Lydia</strong> (located in present-day Turkey). King Alyattes minted electrum (a natural gold-silver alloy) stamped with the royal lion emblem, guaranteeing its purity and weight.
                      </p>
                    </div>

                    {/* Era 3: Emergence of Stock Markets */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-military font-bold text-blue-300 uppercase tracking-wider">
                          3. Emergence of Stock Markets: The Dutch East India Company
                        </span>
                        <span className="text-[10px] font-mono-code text-slate-500">1602 Amsterdam</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        As international trade expanded across oceans, building and maintaining merchant fleets required vast capital and carried high risk. In 1602, the <strong className="text-white">Dutch East India Company (Vereenigde Oostindische Compagnie - VOC)</strong> publicly offered shares to raise funds for ship repairs, expeditions, and spices. Investors received fractional ownership certificates (shares) and dividends, birthing the world’s first formal stock exchange in Amsterdam.
                      </p>
                    </div>

                    {/* Era 4: The Digital Age */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-military font-bold text-emerald-300 uppercase tracking-wider">
                          4. The Digital Age: Electronic Trading & Nasdaq 100
                        </span>
                        <span className="text-[10px] font-mono-code text-slate-500">1971–Present</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Following centuries of chaotic physical floor trading pits, the modern digital era began. <strong className="text-white">Electronic trading was pioneered by the Nasdaq 100 index</strong> (National Association of Securities Dealers Automated Quotations) in 1971. Instead of yelling orders on a physical floor, computers matched buy and sell bids instantly over telecommunication wires. This paved the way for modern internet retail trading, ECN brokers, and millisecond execution.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 3 & 4: The 5 Types of Trading & Forex Deep Dive */}
              {(activeBasicChapter === 3 || activeBasicChapter === 4 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-6">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <Globe className="w-4 h-4" />
                    <span>CHAPTER 3 & 4 • THE 5 TYPES OF TRADING</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    ASSET CLASSES & FOREX CURRENCY PAIRS
                  </h2>

                  {/* 5 Types Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-1.5">
                      <div className="text-xs font-bold text-cyan-400 font-military">1. FOREX</div>
                      <p className="text-[11px] text-slate-400">Foreign Exchange. Trading national currency pairs (EUR/USD, USD/JPY).</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="text-xs font-bold text-slate-200 font-military">2. STOCKS</div>
                      <p className="text-[11px] text-slate-400">Shares in individual public corporations (Tesla, Apple, Amazon).</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="text-xs font-bold text-slate-200 font-military">3. INDICES</div>
                      <p className="text-[11px] text-slate-400">Baskets of top companies grouped into one ticker (Nasdaq 100, S&P 500).</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="text-xs font-bold text-slate-200 font-military">4. CRYPTO</div>
                      <p className="text-[11px] text-slate-400">Decentralized digital tokens paired with USDT (BTC/USDT, SOL/USDT).</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="text-xs font-bold text-slate-200 font-military">5. COMMODITIES</div>
                      <p className="text-[11px] text-slate-400">Hard (Gold, Oil) and Soft (Wheat, Rice, Sugarcane) earth assets.</p>
                    </div>
                  </div>

                  {/* Forex Breakdown */}
                  <div className="p-5 rounded-2xl bg-[#090f1d] border border-cyan-500/25 space-y-4">
                    <h3 className="text-base font-military font-bold text-cyan-300 uppercase tracking-wide">
                      FOREX: FOREIGN EXCHANGE IN-DEPTH
                    </h3>
                    <div className="text-xs sm:text-sm text-slate-300 space-y-2.5 leading-relaxed">
                      <p>
                        The term <strong>"Forex"</strong> is a combination of <strong>"Foreign"</strong> (countries other than one's own) and <strong>"Exchange"</strong> (swapping or trading). Thus, Forex essentially involves the exchange of currencies.
                      </p>
                      <p>
                        Currencies are always traded in pairs: for instance, if you take the US Dollar and the Pakistani Rupee (<strong>USD/PKR</strong>), you form a trading pair. The first currency on the left (<strong>USD</strong>) is the <strong className="text-emerald-400">Base Currency</strong> (the one you buy), while the second currency on the right (<strong>PKR</strong>) is the <strong className="text-rose-400">Quote Currency</strong> (the one you sell).
                      </p>
                    </div>

                    {/* Pair Types */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
                        <div className="text-xs font-military font-bold text-cyan-300 uppercase">
                          MAJOR PAIRS
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Involve the <strong>7 primary currencies</strong>: Euro (EUR), Canadian Dollar (CAD), Australian Dollar (AUD), New Zealand Dollar (NZD), Japanese Yen (JPY), British Pound (GBP), and Swiss Franc (CHF).
                        </p>
                        <div className="p-2 rounded bg-cyan-500/10 text-[11px] text-cyan-200 font-mono-code font-bold">
                          If the US Dollar (USD) is paired with ANY of these seven currencies, it is a Major Pair (e.g. EUR/USD, USD/JPY, GBP/USD, USD/CAD, AUD/USD).
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="text-xs font-military font-bold text-slate-200 uppercase">
                          MINOR PAIRS (CROSSES)
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          These occur when any of these seven currencies are paired with each other, <em>excluding the US Dollar</em>.
                        </p>
                        <div className="p-2 rounded bg-slate-900 text-[11px] text-slate-300 font-mono-code font-bold">
                          Examples: GBP/JPY, EUR/GBP, AUD/CAD, EUR/AUD, CAD/JPY.
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="text-xs font-military font-bold text-slate-200 uppercase">
                          EXOTIC PAIRS
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          These involve pairing one major currency (including USD) with the currency of an emerging or smaller economy.
                        </p>
                        <div className="p-2 rounded bg-slate-900 text-[11px] text-slate-300 font-mono-code font-bold">
                          Examples: USD/PKR, USD/TRY, CAD/TRY, EUR/ZAR.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Commodities Breakdown */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="text-xs font-military font-bold text-amber-300 uppercase">
                      COMMODITIES: HARD VS. SOFT
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                        <span className="font-bold text-amber-400">Hard Commodities: </span>
                        <span>Things extracted from the earth—such as Gold (<code className="text-white">XAU/USD</code>), Silver (<code className="text-white">XAG/USD</code>), and Crude Oil (<code className="text-white">USOIL</code>).</span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                        <span className="font-bold text-emerald-400">Soft Commodities: </span>
                        <span>Things grown on the land—such as rice, wheat, sugarcane, coffee, and corn.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 5: Spreads & Brokers */}
              {(activeBasicChapter === 5 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <DollarSign className="w-4 h-4" />
                    <span>CHAPTER 5 • SPREADS AND BROKER COMMISSIONS</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    HOW SPREADS WORK & WHY MAJOR PAIRS MATTER
                  </h2>

                  <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
                    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                      <div className="text-xs font-military font-bold text-cyan-300 uppercase">
                        The Broker as Intermediary (Real Estate Agent Analogy)
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        A broker acts as an intermediary—much like in real estate. An agent facilitates the buying and selling of a plot between buyer and seller and charges a commission fee for the service. In financial markets, the broker connects the retail trader to the interbank market and charges a fee known as the <strong>"Spread"</strong>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                        <div className="text-xs font-military font-bold text-emerald-300 uppercase">
                          Major Pairs = Lowest Spreads (Recommended)
                        </div>
                        <p className="text-xs text-slate-300">
                          We primarily trade Major pairs because trading volume is massive, keeping the broker's spread at its absolute lowest (often 0.1 to 0.8 pips on EUR/USD).
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1">
                        <div className="text-xs font-military font-bold text-rose-300 uppercase">
                          Minor & Exotic Pairs = High Spreads (Slippage Danger)
                        </div>
                        <p className="text-xs text-slate-300">
                          Trading minor and exotic pairs involves much wider spreads. If you trade pairs with high spreads, your execution price will be significantly worse than your intended entry point—for instance, when you place a buy order, the trade might execute at a much higher price level!
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono-code text-amber-200">
                      <strong>CORE EXECUTION RULE:</strong> The lower the spread, the better your fill and the safer your stop loss. Always trade high-liquidity sessions on Major pairs.
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 6: TradingView Chart Recommendations */}
              {(activeBasicChapter === 6 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <ExternalLink className="w-4 h-4" />
                    <span>CHAPTER 6 • TRADINGVIEW CHART SELECTION</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    VERIFIED TRADINGVIEW CHART PROVIDERS
                  </h2>
                  <p className="text-xs text-slate-400">
                    Not all charts on TradingView provide identical candle data. Follow these exact rules when opening your charting workspace:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
                      <div className="text-xs font-military font-bold text-cyan-300 uppercase">
                        FOREX PAIRS
                      </div>
                      <div className="text-xs font-bold text-white">
                        Use: <strong className="text-cyan-400 font-mono-code">FXCM</strong>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        When selecting a currency pair on TradingView, always use the FXCM chart. If FXCM is unavailable, opt for <strong className="text-slate-200 font-mono-code">Forex.com</strong>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="text-xs font-military font-bold text-slate-200 uppercase">
                        STOCKS & INDICES
                      </div>
                      <div className="text-xs font-bold text-white">
                        Use: <strong className="text-white font-mono-code">Ticker / FXCM</strong>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        For stocks like Tesla (`TSLA`) or Apple (`AAPL`), use official ticker. For Indices (Nasdaq 100, S&P 500), use FXCM (`NAS100`, `SPX500`).
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-2">
                      <div className="text-xs font-military font-bold text-amber-300 uppercase">
                        CRYPTO TOKENS
                      </div>
                      <div className="text-xs font-bold text-white">
                        Use: <strong className="text-amber-400 font-mono-code">BINANCE</strong>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        For crypto (`BTC/USDT`, `SOL/USDT`), <strong>always use the Binance chart</strong>, not FXCM. Binance reflects true spot liquidity.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
                      <div className="text-xs font-military font-bold text-emerald-300 uppercase">
                        COMMODITIES
                      </div>
                      <div className="text-xs font-bold text-white">
                        Use: <strong className="text-emerald-400 font-mono-code">FXCM</strong>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        For Gold (`XAU/USD`), Silver (`XAG/USD`), and Crude Oil (`USOIL`), select the FXCM chart on TradingView.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 7: Candlestick Charts & Anatomy */}
              {(activeBasicChapter === 7 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    <span>CHAPTER 7 • CANDLESTICK ANATOMY & ORIGINS</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    JAPANESE CANDLESTICK STRUCTURE
                  </h2>

                  <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
                    <p>
                      Candlestick charting was invented in the 18th century by <strong className="text-white">Munehisa Homma</strong>, a legendary Japanese rice merchant trading at the Dojima Rice Exchange in Osaka. Homma recognized that markets were driven not just by supply and demand, but crucially by trader psychology and emotion.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Bullish Candle */}
                      <div className="p-4 rounded-xl bg-slate-900/70 border border-emerald-500/30 space-y-2 font-mono-code text-xs">
                        <div className="text-emerald-400 font-military font-bold text-sm uppercase">
                          Bullish Candle (Green / White)
                        </div>
                        <ul className="space-y-1 text-slate-300 list-disc list-inside">
                          <li><strong>Close &gt; Open:</strong> Price closed higher than it opened.</li>
                          <li><strong>Real Body:</strong> The distance between Open (bottom) and Close (top).</li>
                          <li><strong>Upper Shadow / Wick:</strong> The highest price reached during the period.</li>
                          <li><strong>Lower Shadow / Wick:</strong> The lowest price reached before buying pressure resumed.</li>
                        </ul>
                      </div>

                      {/* Bearish Candle */}
                      <div className="p-4 rounded-xl bg-slate-900/70 border border-rose-500/30 space-y-2 font-mono-code text-xs">
                        <div className="text-rose-400 font-military font-bold text-sm uppercase">
                          Bearish Candle (Red / Black)
                        </div>
                        <ul className="space-y-1 text-slate-300 list-disc list-inside">
                          <li><strong>Close &lt; Open:</strong> Price closed lower than it opened.</li>
                          <li><strong>Real Body:</strong> The distance between Open (top) and Close (bottom).</li>
                          <li><strong>Upper Shadow / Wick:</strong> The highest price reached before sellers took over.</li>
                          <li><strong>Lower Shadow / Wick:</strong> The lowest price reached during the session.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter 8: Market Trends & Rules */}
              {(activeBasicChapter === 8 || activeBasicChapter === 0) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                    <Award className="w-4 h-4" />
                    <span>CHAPTER 8 • MARKET TRENDS & GOLDEN RULES</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                    THREE MARKET TRENDS & GOLDEN EXECUTION PROTOCOL
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-military font-bold text-xs">
                        <TrendingUp className="w-4 h-4" />
                        <span>1. UPTREND (BULLISH)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Characterized by a continuous series of <strong>Higher Highs (HH)</strong> and <strong>Higher Lows (HL)</strong>. Institutional buyers defend discount levels on pullbacks.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-rose-400 font-military font-bold text-xs">
                        <TrendingDown className="w-4 h-4" />
                        <span>2. DOWNTREND (BEARISH)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Characterized by a continuous series of <strong>Lower Highs (LH)</strong> and <strong>Lower Lows (LL)</strong>. Institutional sellers distribute inventory into premium retracements.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-400 font-military font-bold text-xs">
                        <Minus className="w-4 h-4" />
                        <span>3. SIDEWAYS (RANGE / CHOP)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Price oscillates between equal support and resistance levels without a clear trend. Smart money accumulates liquidity above and below the range before breaking out.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PHASE 2: INTERMEDIATE COURSE CONTENT */}
          {activePhase === 'PHASE_2_INTERMEDIATE' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-6">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>PHASE 2: INTERMEDIATE COURSE • SMART MONEY CONCEPTS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                INSTITUTIONAL LIQUIDITY & MARKET STRUCTURE SHIFTS
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <h3 className="text-sm font-military font-bold text-cyan-300">
                    1. LIQUIDITY SWEEPS (BUY-SIDE & SELL-SIDE)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Retail stop-losses cluster in predictable pools: Buy-Side Liquidity (BSL) above double tops and swing highs, and Sell-Side Liquidity (SSL) below swing lows. Institutional algorithms intentionally drive price through these levels to fill large orders before reversing.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <h3 className="text-sm font-military font-bold text-cyan-300">
                    2. ORDER BLOCKS (OB) & MITIGATION
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    An Order Block is the last opposite-direction candle before an aggressive expansion that breaks market structure. A Bullish OB is the last down-candle before a violent rally; institutions return to mitigate their drawdowns and add positions.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <h3 className="text-sm font-military font-bold text-cyan-300">
                    3. FAIR VALUE GAPS (FVG) & IMBALANCES
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A three-candle pattern where candle 1's wick and candle 3's wick do not overlap, leaving a clean inefficiency in candle 2. Price acts like a magnet, returning to fill the gap (rebalance the auction) before continuing the trend.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <h3 className="text-sm font-military font-bold text-cyan-300">
                    4. FIBONACCI OPTIMAL TRADE ENTRY (OTE)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Using the Fibonacci retracement tool from swing low to swing high, the <strong>0.618 to 0.786</strong> zone represents the institutional discount. Entries in this golden pocket offer 1:3+ Risk-to-Reward profiles.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PHASE 3: ADVANCED COURSE CONTENT */}
          {activePhase === 'PHASE_3_ADVANCED' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl space-y-6">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-code font-bold uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>PHASE 3 / PRO LEVEL: ADVANCED COURSE • SBT MODELS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
                SBT MODELS 1–10 & TOP-DOWN EXECUTION
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                The Prime Pip FX proprietary SBT Playbook codifies 10 institutional patterns. Each model defines the exact Higher Timeframe context (Weekly/Daily), Middle Timeframe narrative (H4/H1), and Lower Timeframe entry trigger (M15/M5/M1).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { num: 1, name: 'Model 1', title: 'Lowest Bearish OB' },
                  { num: 2, name: 'Model 2', title: 'Mitigation Block' },
                  { num: 3, name: 'Model 3', title: 'FVG Imbalance' },
                  { num: 4, name: 'Model 4', title: 'Order Block Level' },
                  { num: 5, name: 'Model 5', title: 'OB at Level 1' },
                  { num: 6, name: 'Model 6', title: 'Turtle Soup Sweep' },
                  { num: 7, name: 'Model 7', title: 'Judas Swing Entry' },
                  { num: 8, name: 'Model 8', title: 'Breaker Reversal' },
                  { num: 9, name: 'Model 9', title: 'Liquidity Void Fill' },
                  { num: 10, name: 'Model 10', title: 'CISD Expansion' },
                ].map((m) => (
                  <div key={m.num} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono-code font-bold text-cyan-400">
                      SBT MODEL {m.num}
                    </span>
                    <div className="text-xs font-bold text-white">{m.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PROFESSIONAL EXECUTION COURSES */}
      {activeSection === 'EXECUTION_COURSES' && (
        <div className="rounded-2xl border border-blue-500/20 bg-slate-950/90 p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono-code font-bold uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>SECTION 2 • PROFESSIONAL EXECUTION COURSES</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
            SESSION KILLZONES, PRE-TRADE CHECKLISTS & TRADER MINDSET
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-xs font-military font-bold text-blue-300 uppercase">
                1. London & NY Session Killzones
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trading only during peak institutional liquidity windows: London Open (07:00–10:00 GMT), New York Open (12:00–15:00 GMT), and the London/NY Overlap. Avoid Asian session chop.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-xs font-military font-bold text-blue-300 uppercase">
                2. Strict 1–2% Capital Preservation
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Never risk more than 1% to 2% of total account equity on any single idea. Target minimum 1:2.5 to 1:3 Risk-to-Reward so a 45% win-rate generates sustained portfolio growth.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-xs font-military font-bold text-blue-300 uppercase">
                3. The Institutional Trade Journal
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Log every trade with screenshot proof, timeframe context, SBT model tag, and emotional state. Review mistakes weekly to continuously refine execution precision.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: TRADING BOTS & AUTOMATION */}
      {activeSection === 'BOTS_AUTOMATION' && (
        <div className="rounded-2xl border border-amber-500/20 bg-slate-950/90 p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono-code font-bold uppercase tracking-wider">
            <Bot className="w-4 h-4" />
            <span>SECTION 3 • TRADING BOTS & AUTOMATION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-military font-bold text-white">
            PRIME PIP FX QUANTITATIVE BOTS & ALGORITHMIC ARCHITECTURE
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-xs font-military font-bold text-amber-300 uppercase">
                1. Webhook Alert Execution
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect TradingView automated alerts directly to execution endpoints via secure JSON webhooks, triggering instant limit and market orders upon price reaching Fair Value Gaps or Order Blocks.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-xs font-military font-bold text-amber-300 uppercase">
                2. Automated Risk Guardrails
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Algorithmic position sizing based on live account balance and stop loss distance. Auto-killswitch locks execution if daily drawdown reaches 4%, protecting prop firm capital.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
