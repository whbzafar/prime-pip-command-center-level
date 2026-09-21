export type TradeDirection = 'BUY' | 'SELL';

export type AccountType = 'PROP_FIRM_EVALUATION' | 'PROP_FIRM_FUNDED' | 'PERSONAL_LIVE' | 'DEMO';

export type SBTStrategyModel =
  | 'SBT Model 1'
  | 'SBT Model 2'
  | 'SBT Model 3'
  | 'SBT Model 4'
  | 'SBT Model 5'
  | 'SBT Model 6'
  | 'SBT Model 7'
  | 'SBT Model 8'
  | 'SBT Model 9'
  | 'SBT Model 10';

export type StrategyType = SBTStrategyModel | string;

export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';

export type TrendDirection = 'BULLISH' | 'BEARISH' | 'RANGING';

export type MarketStructureElement = 'BOS' | 'MSS' | 'CHOCH' | 'Liquidity Sweep' | 'Consolidation';

export type TradingSession = 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'LONDON_NY_OVERLAP';

export type EmotionState =
  | 'CALM'
  | 'FOCUSED'
  | 'CONFIDENT'
  | 'NEUTRAL'
  | 'FEARFUL'
  | 'ANXIOUS'
  | 'GREEDY'
  | 'ANGRY'
  | 'FRUSTRATED'
  | 'REVENGE'
  | 'FOMO'
  | 'DISCIPLINED'
  | 'HESITANT'
  | 'STRESSED'
  | 'TIRED'
  | 'EXCITED';

export type TradeIntention =
  | 'PLANNED'
  | 'FOLLOW_PLAN'
  | 'SETUP_CONFIRMED'
  | 'FOMO'
  | 'REVENGE'
  | 'RECOVER_LOSS'
  | 'RECOVERY'
  | 'BOREDOM'
  | 'IMPULSIVE'
  | 'OTHER';

export interface PsychologyCheckIn {
  id: string;
  accountId: string;
  date: string; // YYYY-MM-DD (PKT)
  time: string; // hh:mm A (PKT)
  feeling: EmotionState;
  tradeIntention: TradeIntention;
  readinessScore: number; // 0-100
  confidenceLevel?: number; // 1 to 5 (Requirement 14)
  riskAccepted?: boolean; // (Requirement 14)
  notes?: string;
  timestamp: number;
}

export interface PostTradeReviewEntry {
  id: string;
  tradeId?: string;
  accountId: string;
  date: string;
  time: string;
  followedPlan: 'YES' | 'NO' | 'PARTIALLY';
  changedStopLoss: 'YES' | 'NO';
  closedEarly: 'YES' | 'NO';
  emotionAffectedTrade: 'YES' | 'NO';
  notes?: string;
  timestamp: number;
}

export type PsychologicalState = 'CALM' | 'READY' | 'CAUTION' | 'RECOVERY';

export type TiltLevel = 1 | 2 | 3;

export interface PsychologicalSettings {
  cooldownMinutes: number;
  mandatoryCheckIn: boolean;
  audioAlertsEnabled: boolean;
  autoPromptRecoveryOnTilt: boolean;
  breathingPreset: 'BOX_4_4_4_4' | 'CALM_4_7_8' | 'READINESS_5_5_5_5';
  maxConsecutiveLossesBeforeTilt: number;
  tiltSensitivity: 'STRICT' | 'MODERATE' | 'STANDARD';
}

export interface CBTThoughtRecord {
  id: string;
  userId: string;
  timestamp: number;
  date: string;
  time: string;
  automaticThought: string;
  evidenceFor: string;
  evidenceAgainst: string;
  balancedReframe: string;
  plannedAction: string;
  emotionBefore?: string;
  emotionAfter?: string;
}

export interface ACTDefusionRecord {
  id: string;
  userId: string;
  timestamp: number;
  date: string;
  time: string;
  noticeThought: string;
  identifyUrge: string;
  createDistance: string;
  returnToPlan: string;
  chosenAction: string;
}

export interface PsychologicalRecoveryLog {
  id: string;
  userId: string;
  timestamp: number;
  date: string;
  time: string;
  triggerReason: string;
  breathingCompleted: boolean;
  reflectionNotes: string;
  checklistPassed: boolean;
}

export type TradeGrade = 'A+' | 'A' | 'B' | 'C' | 'F';

export type RuleViolationLevel = 'NONE' | 'MINOR' | 'MAJOR';

export type MistakeReason =
  | 'None (Flawless)'
  | 'Wrong Direction'
  | 'Early Entry'
  | 'Late Entry'
  | 'FOMO'
  | 'Revenge Trading'
  | 'No Confirmation'
  | 'High-Impact News'
  | 'Poor Risk Management'
  | 'Emotional Trade'
  | 'Overtrading'
  | 'Moved Stop Loss'
  | 'Closed Early'
  | 'Strategy Mistake'
  | 'Poor Entry'
  | 'Poor Exit'
  | 'Stop Loss Mistake'
  | 'Fear'
  | 'Greed'
  | 'Poor Market Analysis'
  | 'Failure to Follow Plan'
  | 'Other';

export interface PreTradeChecklist {
  htfTrendAligned: boolean;
  marketStructureBreak: boolean;
  liquiditySwept: boolean;
  properRiskReward: boolean;
  noHighImpactNews: boolean;
  calmPsychology: boolean;
  positionSizeCalculated: boolean;
  stopLossAtLogicalLevel: boolean;
  completedCount: number;
}

export interface TradeScreenshots {
  beforeEntry?: string;
  entry?: string;
  afterTrade?: string;
  htfAnalysis?: string;
}

export interface TradeAlignmentScore {
  htfDirection: number; // max 25
  marketStructure: number; // max 20
  entryModel: number; // max 20
  riskManagement: number; // max 20
  newsCondition: number; // max 15
  totalQuality: number; // max 100
}

export interface PostTradePsychology {
  followedPlan: boolean;
  movedStopLoss: boolean;
  closedEarly: boolean;
  overtraded: boolean;
  revengeTraded: boolean;
  increasedLotSizeEmotionally: boolean;
}

export interface TradeDiagnosticRecord {
  classification:
    | 'A_PLUS_EDGE_WIN'
    | 'SUBOPTIMAL_EARLY_EXIT_WIN'
    | 'LUCKY_BAD_WIN'
    | 'GOOD_BUSINESS_LOSS'
    | 'EXECUTION_ERROR_LOSS'
    | 'DISCIPLINE_BREACH_LOSS'
    | 'NEUTRAL_BREAKEVEN';
  headline: string;
  verdict: string;
  adherenceScore: number; // 0-100
  questions: {
    question: string;
    answer: boolean;
    explanation: string;
  }[];
  actionableTakeaway: string;
  reviewedAt: string;
}

export interface Trade {
  id: string;
  userId?: string;
  accountId?: string; // Belongs to specific account
  tradeNumber: number;
  date: string; // YYYY-MM-DD (Pakistan Asia/Karachi)
  time: string; // HH:mm (Pakistan Asia/Karachi)
  broker: string;
  accountType: AccountType;
  accountSize: number;
  instrument: string; // e.g., XAUUSD, EURUSD, GBPUSD, USDJPY, US30, NAS100
  direction: TradeDirection;
  timeframe: Timeframe;
  session: TradingSession;
  status?: 'OPEN' | 'CLOSED';
  result?: 'WIN' | 'LOSS' | 'BREAKEVEN';
  floatingPnL?: number; // For open trades
  
  // Execution
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number;
  lotSize: number;
  riskAmount: number; // in $
  riskPercent?: number; // % of account
  profitLoss: number; // in $
  rMultiple: number; // e.g. +3.2 or -1.0
  pips: number;

  // Strategy & Structure
  strategy: StrategyType;
  sbtModel?: string;
  strategyModel?: string;
  htfTrend: TrendDirection;
  ltfTrend: TrendDirection;
  marketStructure: MarketStructureElement;
  alignmentScore: TradeAlignmentScore;

  // Psychology & Discipline
  preEmotion: EmotionState;
  postPsychology: PostTradePsychology;
  ruleViolation: RuleViolationLevel;
  violatedRules: string[];
  mistakeReason: MistakeReason;
  grade: TradeGrade;

  // Screenshots
  screenshots: TradeScreenshots;
  notes?: string;

  tradeIntention?: TradeIntention;
  qualityBreakdown?: {
    htfAlignment: number; // 0-20
    entryModel: number; // 0-20
    riskReward: number; // 0-20
    riskCompliance: number; // 0-20
    psychologyScore: number; // 0-20
    totalQuality: number; // 0-100
  };

  preTradeChecklist?: PreTradeChecklist;

  tradeDiagnostic?: TradeDiagnosticRecord;

  // AI Vision audit cache
  aiAudit?: {
    qualityScore: number;
    verdict: string;
    critique: string;
    timestamp: string;
  };

  postTradeAnalysis?: {
    tradeOutcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
    primaryReason: string;
    secondaryReasons?: string[];
    notes?: string;
    actionableTakeaway?: string;
    recommendedModule?: string;
  };
}

export interface SignalItem {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  timeframe: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  recommendedRiskPercent: number; // e.g. 1.0%
  strategyNotes: string;
  status: 'PENDING' | 'ACTIVE' | 'HIT_TP' | 'HIT_SL' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  author: string;
}

export interface TradingRule {
  id: string;
  userId?: string;
  accountId?: string;
  title: string;
  description?: string;
  category?: 'RISK' | 'EXECUTION' | 'PSYCHOLOGY';
  severity?: 'MAJOR' | 'MINOR';
  isHardRule?: boolean;
  isActive?: boolean;
  active?: boolean;
  violationCount?: number;
}

export interface TradingGoal {
  id: string;
  userId?: string;
  accountId?: string;
  title: string;
  category?: 'PROCESS' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  target?: number;
  current?: number;
  unit?: string;
  isCompleted?: boolean;
  completed?: boolean;
  notes?: string;
  targetValue?: string;
  currentProgress?: string;
}

export type TraderProcessGoal = TradingGoal;

export interface DisciplineAlarms {
  tradeLimitAlarm: boolean;
  dailyLossAlarm: boolean;
  riskLimitAlarm: boolean;
  consecutiveLossAlarm: boolean;
  soundEnabled: boolean;
}

export interface AccountSettings {
  id: string;
  userId?: string;
  traderName: string;
  accountName: string;
  accountType: AccountType | string;
  initialBalance: number;
  currentBalance: number;
  currentEquity: number;
  broker: string;
  currency: string;
  dailyMaxLossPercent?: number;
  maxDailyLossPercent: number;
  maxDrawdownPercent: number;
  maxDailyTrades: number;
  targetRiskPerTradePercent?: number;
  maxRiskPerTradePercent: number;
  maxDailyRiskPercent?: number;
  maxConsecutiveLosses?: number;
  disciplineAlarms?: DisciplineAlarms;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  timezone: string;
  accounts: AccountSettings[];
  activeAccountId: string;
  trades: Trade[];
  rules: TradingRule[];
  goals: TradingGoal[];
  settings?: Record<string, unknown>;
}

export interface TraderPerformanceScores {
  riskManagement: number; // 0-100
  psychology: number; // 0-100
  strategyExecution: number; // 0-100
  discipline: number; // 0-100
  consistency: number; // 0-100
  overallTradingScore: number; // 0-100
}

// ----------------------------------------------------
// BACKTESTING TRACKER TYPES (Requirements 24 & 25)
// ----------------------------------------------------
export interface BacktestSession {
  id: string;
  accountId?: string;
  date: string; // YYYY-MM-DD (PKT)
  strategy: string; // e.g. 'SBT Model 1'
  pair: string; // e.g. 'XAUUSD'
  timeframe: string; // e.g. 'M15', 'W1', 'MN1'
  testType?: 'BACKTEST' | 'FORWARD_TEST';
  historicalPeriod: string; // e.g. 'Jan 2024 - Mar 2024'
  tradesTested: number;
  wins: number;
  losses: number;
  winRate: number; // calculated %
  averageRiskReward: number; // e.g. 2.5 (1:2.5)
  profitFactor?: number;
  notes?: string;
  timestamp: number;
}

// ----------------------------------------------------
// DAILY TRADER DEVELOPMENT PLAN (Requirements 8, 9, 10, 11)
// ----------------------------------------------------
export type TaskStatus = 'COMPLETED' | 'NOT_COMPLETED' | 'SKIPPED';

export interface DailyTaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  category?: 'PRE_MARKET' | 'RISK' | 'PSYCHOLOGY' | 'EXECUTION' | 'REVIEW' | 'BACKTEST' | 'CUSTOM';
  isCustom?: boolean;
  isRecurring?: boolean;
  recurrence?: 'DAILY' | 'WEEKLY';
  createdAt?: string;
}

export interface DailyDisciplineRecord {
  id: string;
  date: string; // YYYY-MM-DD (PKT)
  tasksCompleted: number;
  totalTasks: number;
  rulesFollowedCount: number;
  totalRulesActive: number;
  riskComplianceRating: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'BREACHED';
  psychologyCheckCompleted: boolean;
  disciplineScore: number; // 0-100
  todayDidWell: string[];
  areaToImprove: string;
  tomorrowFocus: string;
  timestamp: number;
}

// ----------------------------------------------------
// RISK MANAGEMENT CHALLENGES (Requirement 16)
// ----------------------------------------------------
export interface RiskChallenge {
  id: string;
  title: string;
  description: string;
  targetCount: number; // e.g. 7 days, 10 trades
  currentProgress: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  category: '7_DAY_RISK' | '10_TRADE_CONSISTENCY' | 'NO_OVERTRADING' | 'CUSTOM';
  ruleCondition: string;
  startDate?: string;
}

// ----------------------------------------------------
// TRADER DEVELOPMENT JOURNEY (Requirement 23)
// ----------------------------------------------------
export interface MonthlyJourneyMilestone {
  monthLabel: string; // e.g. "Month 1", "Month 2"
  discipline: number; // 0-100
  riskManagement: number; // 0-100
  psychology: number; // 0-100
  consistency: number; // 0-100
  strategyExecution: number; // 0-100
  backtestTradesTested: number;
}

// ----------------------------------------------------
// AUTH, SUBSCRIPTION & DEVELOPER ACCESS TYPES
// ----------------------------------------------------
export type UserRole = 'ADMIN' | 'CUSTOMER' | 'DEVELOPER';

export type SubscriptionStatus =
  | 'DEMO'
  | 'PAYMENT_REQUIRED'
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'LIFETIME';

export type PaymentStatus = 'UNPAID' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPrice: number; // $50 standard, $40 referral
  startDate?: string;
  expiryDate?: string;
  isLifetime: boolean;
  paymentStatus: PaymentStatus;
  referralCode?: string;
  referredBy?: string;
  adminNotes?: string;
  isDeveloper?: boolean;
  phone?: string;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt?: string;
  avatarUrl?: string;
  bio?: string;
  onlineStatus?: 'ONLINE' | 'AWAY' | 'OFFLINE';
  tradingStyle?: string;
  warningsCount?: number;
  hasCompletedOnboarding?: boolean;
  needsOnboarding?: boolean;
  googleDriveConnected?: boolean;
  googleDriveEmail?: string;
  googleDriveLastBackup?: string;
}

export interface ReferralRecord {
  id: string;
  referrerUsername: string;
  referredUsername: string;
  referralCode: string;
  paymentStatus: PaymentStatus;
  activationStatus: SubscriptionStatus;
  rewardStatus: 'PENDING' | 'GRANTED_LIFETIME';
  createdAt: string;
}

export interface LotCalculationHistoryItem {
  id: string;
  date: string;
  pair: string;
  balance: number;
  currency: string;
  riskPercent: number;
  riskAmount: number;
  stopLossPips: number;
  stopLossInputMode?: 'PIPS' | 'PRICE';
  entryPrice?: number;
  stopLossPrice?: number;
  pipValue: number;
  recommendedLotSize: number;
  estimatedLoss: number;
  customLotSize?: number;
  customLoss?: number;
  customRiskPercent?: number;
  status: 'SAFE' | 'WARNING';
}

// ----------------------------------------------------
// MARKET SENTIMENT MODULE TYPES
// ----------------------------------------------------
export type SentimentAssetClass = 'FOREX' | 'COMMODITIES' | 'CRYPTO';

export interface SentimentRecord {
  symbol: string;
  assetClass: SentimentAssetClass;
  longPercentage: number;
  shortPercentage: number;
  longVolume?: number;
  shortVolume?: number;
  longPositions?: number;
  shortPositions?: number;
  longShortRatio?: number;
  source: string;
  updatedAt: string;
  updatedAtPkt: string;
  isDelayed: boolean;
  status: 'VERIFIED' | 'DELAYED' | 'STALE' | 'UNAVAILABLE' | 'DEMO';
  message?: string;
}

// ----------------------------------------------------
// APPOINTMENTS & SESSIONS
// ----------------------------------------------------
export interface AppointmentRecord {
  id: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  sessionType: string;
  date: string;
  timeSlot: string;
  durationMinutes: number;
  price: number;
  userNotes?: string;
  ownerNotes?: string;
  rescheduledDateTime?: string;
  status: 'REQUESTED' | 'PENDING' | 'CONFIRMED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// MODERATION & WARNING SYSTEM
// ----------------------------------------------------
export interface ModerationWarning {
  id: string;
  userId: string;
  username: string;
  userDisplayName?: string;
  violationType:
    | 'ABUSIVE_LANGUAGE'
    | 'HARASSMENT'
    | 'SEXUAL_CONTENT'
    | 'SUSPICIOUS_ACTIVITY'
    | 'SPAM'
    | 'UNRELATED_CONTENT'
    | 'COMPETITOR_PROMOTION'
    | 'CONTACT_INFO_SHARING'
    | 'POLICY_VIOLATION';
  messageSample: string;
  warningNumber: number; // 1 to 5
  timestamp: number;
  datePkt: string;
  timePkt: string;
  acknowledgedByAdmin?: boolean;
}
