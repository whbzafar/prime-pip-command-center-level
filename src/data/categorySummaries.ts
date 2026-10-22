import { hasFullAccess, getStoredUser } from '../utils/authClient';

export interface CategorySummary {
  id: string;
  name: string;
  shortDesc: string;
  overview: string;
  keyFeatures: string[];
  roleRequired?: string;
}

export const ALLOWED_DEMO_CATEGORIES: string[] = [
  'DASHBOARD',            // 01. Dashboard
  'JOURNAL',              // 02. Trade Journal (Trading Tool Suite)
  'SBT_MODELS',           // 03. SBT Models (Trading Tool Suite)
  'LOT_SIZE',             // 04. Lot Size Calculator (Trading Tool Suite)
  'RISK',                 // 05. Risk Management Engine (Trading Tool Suite)
  'PRE_TRADE_PLAN',       // 06. Pre-Trade Plan Gatekeeper (Pre-made trade plans)
  'FUNDAMENTAL_CALENDAR', // 07. Live News Calendar (TradingView × Forex Factory — Unlocked per user request)
  'FUNDAMENTAL_INDICATORS', // 08. Fundamental Indicators Engine (Free COT & Sentiment in Demo)
  'PRO_TRADING',          // 10. Premium TradingView
  'CHART_ANALYSIS',       // 12. Unlimited Chart Analysis (100% Free Unrestricted)
  'BACKTESTING',          // 11. Backtesting Suite
  'BACKTEST_REPLAY',      // 11. Backtesting Replay Pro
  'COMPOUNDING',          // 12. Compounding Engine (Trading Tool Suite)
  'PERFORMANCE',          // 11. Performance Report (Performance reports)
  'REPORTS',              // Performance reports
  'CALMING_TOOLS',        // 14. Trading Tool Suite (Unlocked per user request: "keep it unlocked")
  'RESEARCH',             // 15. Academic Research (Unlocked per user request: 'Academy Research')
  'FREEHAND_WORKSPACE',   // 16. Freehand Canvas (Unlocked per user request: 'Free-hand Canvas')
  'SITUATION_SAVER',      // 17. Situation Saver (Unlocked per user request: 'Situation Saver')
  'PAIR_SAVER',           // 18. Pair Saver (Unlocked per user request: 'Peer Saver')
  'PRO_LEARNING',         // 19. Pro Learning / Academy (Unlocked per user request: 'Pro Learning Trading')
  'BOOK_SESSION',         // 21. Book a Session (Unlocked per user request: 'the book section')
  'SETTINGS',             // 22. Data Export & Backup (Unlocked per user request: 'Data Export/Backup')
  'SETUP',                // 00. Account Setup Wizard
];

export const isCategoryLockedInDemo = (
  categoryId: string,
  isDemoMode: boolean = false,
  user?: any
): boolean => {
  if (categoryId === 'META5_PREMIUM') return true; // MetaTrader terminal requires broker subscription
  
  const effectiveUser = user !== undefined ? user : getStoredUser();
  const hasSub = hasFullAccess(effectiveUser);

  // Psychological Center is strictly locked wherever it appears for any user without an active subscription
  if (categoryId === 'PSYCHOLOGY') {
    return !hasSub;
  }

  // Active subscribers have full access to remaining modules
  if (hasSub) return false;

  // Fundamental section is marked free to allow exploring COT reports and sentiment
  if (categoryId === 'FUNDAMENTAL_INDICATORS' || categoryId === 'FUNDAMENTAL_CALENDAR') {
    return false;
  }

  if (isDemoMode) {
    return !ALLOWED_DEMO_CATEGORIES.includes(categoryId);
  }

  return false;
};

export const CATEGORY_SUMMARIES: Record<string, CategorySummary> = {
  DASHBOARD: {
    id: 'DASHBOARD',
    name: '01. Trade Command Dashboard',
    shortDesc: 'Live Command Terminal, multi-account equity metrics, and real-time execution telemetry.',
    overview: 'The central nerve center of your trading operation. Displays real-time account balances, daily drawdown limits, current equity curves, win rate analytics, and active risk telemetry at a glance.',
    keyFeatures: [
      'Live equity curve and balance tracking across personal and funded accounts',
      'Real-time daily loss circuit breaker with automated risk alerts',
      'Overall institutional trading score and discipline rating',
      'Quick trade execution launcher and active risk gauges',
    ],
  },
  JOURNAL: {
    id: 'JOURNAL',
    name: '02. Trade Journal',
    shortDesc: 'Institutional trade logging, confluences, screenshots, and automated R:R calculation.',
    overview: 'The professional trade journal allows you to log every execution with precision. Document entry/exit points, risk-to-reward ratios, confluences, emotional state, and before/after chart screenshots.',
    keyFeatures: [
      'Full trade detail capture with automated lot size and risk metrics',
      'Before & After chart screenshot upload and visual markup',
      'SMC & Fundamental confluence tagging per setup',
      'Automated P&L, win/loss ratio, and execution quality auditing',
    ],
  },
  SBT_MODELS: {
    id: 'SBT_MODELS',
    name: '03. SBT Institutional Models',
    shortDesc: 'Order flow confluences, Fair Value Gaps (FVG), Liquidity Sweeps, and kill-zone setups.',
    overview: 'Proprietary institutional execution frameworks modeled on Smart Money concepts, algorithmic liquidity delivery, liquidity sweeps, and high-probability session kill-zones.',
    keyFeatures: [
      'Step-by-step institutional entry validation checklists',
      'FVG, Order Block, and Liquidity Run confluence matrices',
      'London and New York kill-zone timing filters',
      'Mechanical execution rules for high win-rate setups',
    ],
  },
  LOT_SIZE: {
    id: 'LOT_SIZE',
    name: '04. Lot Size Calculator',
    shortDesc: 'Institutional position sizing and risk calculation.',
    overview: 'Precision position size calculator calibrated for Forex pairs, Gold, Silver, Indices, and Crypto.',
    keyFeatures: ['Live pip value calculation', 'Cent and Dollar account standards', 'Over-risk safeguard'],
  },
  RISK: {
    id: 'RISK',
    name: '05. Risk Management Engine',
    shortDesc: '1% Master Risk Enforcement Engine, daily loss limits, and drawdown protection.',
    overview: 'The discipline gatekeeper. Enforces maximum risk per trade, limits daily executions, and prevents over-trading or revenge trading with hard circuit breakers.',
    keyFeatures: [
      'Strict 1% maximum trade risk enforcement',
      'Daily trade count circuit breaker (max 2 trades per day)',
      'Account drawdown threshold protection',
      'Capital preservation risk audit reports',
    ],
  },
  PRE_TRADE_PLAN: {
    id: 'PRE_TRADE_PLAN',
    name: '06. Pre-Trade Plan Gatekeeper',
    shortDesc: '3-Phase Execution Checklist Gatekeeper and mandatory discipline verification.',
    overview: 'A mandatory pre-flight checklist that every trader must complete before placing an order. Ensures you never take an impulsive trade without HTF alignment and risk validation.',
    keyFeatures: [
      '3-Phase gatekeeper checklist: Macro Context, Technical Model, Risk Rules',
      'Prevents order entry until all institutional conditions are met',
      'Automatic risk-reward verification against target levels',
      'Discipline logging attached to your journal record',
    ],
  },
  FUNDAMENTAL_CALENDAR: {
    id: 'FUNDAMENTAL_CALENDAR',
    name: '07. Live News Calendar',
    shortDesc: 'Forex Factory interface powered by 100% live TradingView news data in Pakistan Standard Time (PKT).',
    overview: 'Real-time macroeconomic news calendar combining 100% free live data sourced directly from TradingView with the classic Forex Factory interface. Features color-coded High, Medium, and Low impact folders that open to reveal the news topic, official issuing source, potential currency impact, and Previous, Forecast, and Actual figures in Pakistan Standard Time (PKT / UTC+5).',
    keyFeatures: [
      '100% live macroeconomic release feed sourced directly from TradingView',
      'Forex Factory layout with expandable color-coded impact folders (Red, Orange, Yellow)',
      'Click any folder to inspect News Topic, Official Source, Potential Impact, and Actual/Forecast/Previous figures',
      'Synchronized to Pakistan Standard Time (PKT / Asia/Karachi UTC+5) with live second-by-second countdowns',
    ],
  },
  FUNDAMENTAL_INDICATORS: {
    id: 'FUNDAMENTAL_INDICATORS',
    name: '08. Fundamental Indicators Engine (Free COT & Sentiment)',
    shortDesc: '100% Free COT Reports and Market Sentiment; advanced macro scoring & raw models available with subscription.',
    overview: 'The definitive macroeconomic intelligence suite. In Demo and Free mode, both institutional COT (Commitments of Traders) reports and retail sentiment data are 100% accessible for free. Advanced central bank ledger models, currency strength matrices, and raw yield models require an active subscription.',
    keyFeatures: [
      '100% Free Institutional COT (Commitments of Traders) positioning data',
      '100% Free Contrarian Retail Sentiment & positioning gauges',
      'Deterministic currency strength scoring across 8 major currencies (Pro)',
      'Central Bank policy rates, bond yields & multi-asset differentials (Pro)',
    ],
  },
  SIGNALS: {
    id: 'SIGNALS',
    name: '09. Premium Signals Hub',
    shortDesc: 'Institutional VIP trade setups, entry/exit notifications, and verified alpha confluences.',
    overview: 'Direct access to institutional setups curated by verified analysts. Receive real-time notifications with exact entry, stop loss, take profit targets, and confluence breakdowns.',
    keyFeatures: [
      'Real-time institutional trade setup dispatches with TP/SL targets',
      'Technical, Macro, and Sentiment confluence breakdown per signal',
      'Timeframe and risk parameter specifications',
      'Live signal status tracking: Active, Hit Target, or Closed',
    ],
  },
  PRO_TRADING: {
    id: 'PRO_TRADING',
    name: '10. Premium TradingView',
    shortDesc: 'Live TradingView interactive charts, broker feeds, drawing tools, and real-time candle timers.',
    overview: 'Full-featured TradingView terminal with real-time multi-asset quotes, broker selection, indicators, candle countdowns, and collaborative chart sharing.',
    keyFeatures: ['Full Drawing Suite', 'Candle Close Countdown', 'Fundamental Pairs tab', 'Auto-Save & Sharing'],
  },
  BACKTESTING: {
    id: 'BACKTESTING',
    name: '11. Backtesting',
    shortDesc: 'TradingView candlestick charting, drawing tools, indicators, bar-by-bar replay, and multi-source historical feeds.',
    overview: 'Full-featured TradingView-style Backtesting module with candlestick charts, complete drawing tools toolbar, core indicators (SMA/EMA, RSI, MACD, Bollinger Bands, Stochastic, Volume), bar-by-bar historical replay, paper trade execution, and an automated data layer spanning Twelve Data, Dukascopy, Yahoo Finance, and Binance.',
    keyFeatures: [
      'Interactive TradingView lightweight-charts with green/red candlestick styling',
      'Complete drawing suite: Trendlines, Horizontal S/R, Fibonacci Retracements, Rectangles, Long/Short Position tools',
      'Core technical indicators: Moving Averages (SMA/EMA), RSI, MACD, Bollinger Bands, Stochastic, Volume',
      'Multi-source data layer: Twelve Data API, Dukascopy historical feed, Yahoo Finance, and Binance',
      'Intelligent local disk caching for zero repeat network requests',
      'Bar-by-bar replay with Jump to Bar, Play/Pause, Step Forward/Back, and adjustable speeds',
      'Paper trading simulator with market Buy/Sell, SL/TP risk lines, and 1-click log to Trade Journal',
    ],
  },
  BACKTEST_REPLAY: {
    id: 'BACKTEST_REPLAY',
    name: '11. Backtesting Replay Pro',
    shortDesc: 'Candle-by-candle market replay video player with simulated orders and auto journal logging.',
    overview: 'High-precision strategy backtesting terminal powered by Dukascopy Forex feeds and Binance Crypto feeds. Replay historical price action candle-by-candle with zero look-ahead bias, place simulated market and pending orders, and automatically sync completed trades into your journal.',
    keyFeatures: [
      'Candle-by-candle video player playback (Play, Pause, Step, Speed 1x-10x)',
      'Real historical data from Dukascopy (Forex) and Binance (Crypto)',
      'Local IndexedDB and server-side disk caching for zero repeat lag',
      'Automated position sizing using active account risk management',
      'Automatic sync to Trade Journal with Backtest tag',
    ],
  },
  CHART_ANALYSIS: {
    id: 'CHART_ANALYSIS',
    name: '12. Unlimited Chart Analysis',
    shortDesc: 'Unrestricted live full-featured price charts for all Forex & Crypto pairs.',
    overview: 'Clean, unthrottled live technical analysis workspace powered by Twelve Data / OANDA Forex feeds and Binance Crypto sub-second WebSocket feeds. View, analyze, and monitor any currency or crypto pair with technical indicators, drawing tools, and instant switching cache with no session caps or paywalls.',
    keyFeatures: [
      'Unrestricted charting with no pair limits, duration caps, or paywall gates',
      'Live crypto sub-second WebSocket streaming via Binance',
      'Forex free-tier live feed via Twelve Data / OANDA with smart rate throttling',
      'In-memory & client caching for 0ms latency when switching between active pairs',
      'Full technical indicator suite (EMA 20/50/200, Bollinger Bands, RSI, MACD, Volume)',
      '1-click integration with Pre-Trade Plan, Lot Size Calculator, and Trade Journal',
    ],
  },
  COMPOUNDING: {
    id: 'COMPOUNDING',
    name: '11. Compounding Engine',
    shortDesc: 'Long-term equity compounding simulator and growth milestones.',
    overview: 'Simulate long-term capital compounding and projected equity milestones with risk-adjusted returns.',
    keyFeatures: ['Custom compound interest periods', 'Milestone target setting', 'Drawdown projections'],
  },
  PERFORMANCE: {
    id: 'PERFORMANCE',
    name: '11. Performance Report',
    shortDesc: 'Win rates, risk-reward matrices, equity curves, and performance benchmarking.',
    overview: 'Deep statistical autopsy of your trading performance. Identifies which pairs, sessions, and setups yield the highest profitability while flagging behavioral leaks.',
    keyFeatures: [
      'Comprehensive win/loss ratio and profit factor analysis',
      'Performance breakdown by currency pair, session, and day of week',
      'Average win vs. average loss distribution curves',
      'Actionable recommendations to plug profitability leaks',
    ],
  },
  DAILY_DEV: {
    id: 'DAILY_DEV',
    name: '12. Daily Development',
    shortDesc: 'Trader habit tracker, morning routines, mental state logging, and daily review.',
    overview: 'Structured daily habits and routines for elite traders. Track your physical, mental, and technical preparation to ensure you enter every trading session in prime mental state.',
    keyFeatures: [
      'Morning routine and session preparation checklist',
      'Sleep, energy, and cognitive focus tracking',
      'End-of-day trading reflection and lessons learned',
      'Habit streak counters and consistency scoring',
    ],
  },
  PSYCHOLOGY: {
    id: 'PSYCHOLOGY',
    name: '13. Psychological Center (Pro)',
    shortDesc: '🔒 Locked for non-subscribers. Emotional state monitoring, cognitive bias audit, and mental resilience tools.',
    overview: 'Cognitive defense against FOMO, greed, fear, and revenge trading. Access to the Psychological Center requires an active PrimePipFX subscription. Audit your psychological state before taking risk and build iron-clad trading discipline.',
    keyFeatures: [
      'Pre-trade emotional state check and tilt detector (Pro)',
      'Cognitive bias identification (sunk cost, confirmation bias, recency bias)',
      'Revenge trading lockout circuit breaker',
      'Psychological timeline tracking your emotional evolution over time',
    ],
  },
  CALMING_TOOLS: {
    id: 'CALMING_TOOLS',
    name: '14. Trading Tool Suite',
    shortDesc: 'Diaphragmatic breathing timers, cardiac coherence, and emotional reset tools.',
    overview: 'Scientifically validated physiological regulation tools for traders experiencing elevated heart rates or stress during drawdowns or fast-moving markets.',
    keyFeatures: [
      'Box breathing and 4-7-8 diaphragmatic respiration pacing guides',
      'Cardiac coherence visual pulse guides',
      'Post-loss emotional reset timer (5-minute cool-down protocol)',
      'Focus-enhancing audio and ambient frequency generators',
    ],
  },
  RESEARCH: {
    id: 'RESEARCH',
    name: '15. Academic Research',
    shortDesc: 'Academic market research engine and behavioral finance literature.',
    overview: 'Search verified quantitative and behavioral finance papers to deepen your market knowledge.',
    keyFeatures: ['OpenAlex academic research engine', 'Peer-reviewed studies', 'Quantitative papers'],
  },
  FREEHAND_WORKSPACE: {
    id: 'FREEHAND_WORKSPACE',
    name: '16. Freehand Canvas',
    shortDesc: 'Infinite diagramming workspace for market structure and strategy notes.',
    overview: 'A free-flowing canvas to draw liquidity pools, map multi-timeframe structures, and brainstorm trade ideas.',
    keyFeatures: ['Vector drawing tools', 'Chart snapshot pasting', 'Exportable diagram sheets'],
  },
  SITUATION_SAVER: {
    id: 'SITUATION_SAVER',
    name: '17. Situation Saver',
    shortDesc: 'Vault of historical market structures, liquidity setups, and playbook situations.',
    overview: 'Save and categorize unique market situations, unexpected news spikes, and textbook setups so you can study them and recognize them instantly when they recur.',
    keyFeatures: [
      'Organize setups by market condition (Trend, Consolidation, News Spike)',
      'Tag with execution notes and key learning takeaways',
      'Searchable personal library of recurring market archetypes',
      'Cloud synchronized and offline accessible',
    ],
  },
  PAIR_SAVER: {
    id: 'PAIR_SAVER',
    name: '18. Pair Saver',
    shortDesc: 'Custom multi-pair watchlist and technical bias tracker.',
    overview: 'Track your favorite pairs, correlated assets, and key levels across sessions.',
    keyFeatures: ['Watchlist grouping', 'Live quote tracking', 'Technical bias tags'],
  },
  PRO_LEARNING: {
    id: 'PRO_LEARNING',
    name: '19. Pro Learning / Academy',
    shortDesc: 'Complete institutional trading strategies, execution courses, and trading bot library.',
    overview: 'Comprehensive video and text curriculum covering institutional order flow, macroeconomic analysis, risk engineering, and algorithmic bot automation.',
    keyFeatures: [
      'Complete 3-month institutional trading curriculum',
      'Video breakdowns of high-probability execution models',
      'Trading bot algorithms and automated execution scripts',
      'Direct mentor review and homework submission channels',
    ],
  },
  COMMUNITY: {
    id: 'COMMUNITY',
    name: '20. Trader Community Feed',
    shortDesc: 'Live dispatches, verified student network, and real-time market sharing.',
    overview: 'Connect with verified students and institutional traders. Share analysis, discuss active market conditions, exchange trade ideas, and celebrate milestones together.',
    keyFeatures: [
      'Live peer chat feed and setup sharing',
      'Friend requests and private trader messaging',
      'Online verified trader presence indicators',
      'Direct announcements and updates from the mentorship desk',
    ],
  },
  BOOK_SESSION: {
    id: 'BOOK_SESSION',
    name: '21. Book a Session',
    shortDesc: '1-on-1 mentorship consultation and personalized trading roadmap reviews.',
    overview: 'Schedule a private consultation directly with the lead mentor. Review your trade journal, identify psychological leaks, and formulate a customized path to funded trader status.',
    keyFeatures: [
      'Direct calendar booking for 1-on-1 Zoom / Google Meet sessions',
      'Personal trade journal autopsy and chart audit',
      'Prop firm challenge preparation strategy',
      'Priority WhatsApp support channel access',
    ],
  },
  SETTINGS: {
    id: 'SETTINGS',
    name: '22. Data Export & Backup',
    shortDesc: 'Full state export, automated Google Drive sync, and account restoration.',
    overview: 'Secure your trading data with automatic cloud backups to your personal Google Drive or download encrypted JSON backups to your computer anytime.',
    keyFeatures: [
      'One-click full trade journal JSON export',
      'Automatic background synchronization to personal Google Drive',
      'Cross-device restoration without server hosting costs',
      'Complete privacy and data ownership guarantee',
    ],
  },
  ADMIN: {
    id: 'ADMIN',
    name: '23. Admin Panel (Owner)',
    shortDesc: 'Master administrative terminal, student enrollment, credentials, and access control.',
    overview: 'Authorized administrator panel for platform owners to register new students, generate activation links, verify subscription payments, and manage user accounts.',
    keyFeatures: [
      'Student account creation and credential generation',
      'One-click WhatsApp activation link generator',
      'Subscription price and expiration date management',
      'Live student roster and session monitoring',
    ],
  },
  META5_PREMIUM: {
    id: 'META5_PREMIUM',
    name: '11. Meta5 Premium Terminal',
    shortDesc: 'Authentic MetaTrader 5 mobile terminal with live broker & funded account connectivity.',
    overview: 'Execute trades directly inside the application using a faithful, mobile-first MetaTrader 5 interface. Connect any broker or prop firm (FTMO, FundedNext, IC Markets, Exness), stream live quotes, trade interactive charts, and automatically sync every execution to your Trading Journal.',
    keyFeatures: [
      'Authentic mobile MT5 Quotes, Charts, Trade, History, and Settings interface',
      'Instant connection to 50+ real brokers and top funded account prop firms',
      'Live Bid/Ask ticking quotes with simple and advanced pip breakdown views',
      'One-click trading and execution with automatic logging into your Trade Journal',
    ],
  },
  EVOLUTION: {
    id: 'EVOLUTION',
    name: '24. Evaluation Engine',
    shortDesc: 'Proprietary performance grading, prop firm qualification, and edge refinement.',
    overview: 'Autonomous evaluation engine that audits your trading data against prop firm funded benchmarks to determine whether you are mathematically ready to pass an evaluation.',
    keyFeatures: [
      'Prop firm consistency rule compliance audit',
      'Maximum daily and total loss tolerance stress test',
      'Algorithmic trading evolution score and readiness certificate',
      'Personalized risk-calibrated roadmap to full-time funded status',
    ],
  },
};
