import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Info,
  Layers,
  Clock,
  Globe,
  Sliders,
  DollarSign,
  Percent,
  CheckCircle2,
  Calendar,
  Lock,
  Bookmark,
  Users,
} from 'lucide-react';
import { RulesConfig, AccountPhase, DrawdownType, DailyLossBasis } from '../../riskEngine';
import { formatCurrency } from '../../utils/currencyFormatter';
import { AccountSettings } from '../../types';

interface CommandSetupWizardProps {
  onSaveProfile: (profile: RulesConfig, rawAccount: AccountSettings) => void;
  existingAccounts?: AccountSettings[];
  activeAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  onClose?: () => void;
}

export const PRESET_TEMPLATES: Array<{
  id: string;
  name: string;
  badge: string;
  config: Partial<RulesConfig>;
}> = [
  {
    id: 'generic_2step',
    name: 'Generic 2-Step (5% Daily / 10% Overall)',
    badge: 'Example only. Verify against your firm\'s current rules',
    config: {
      accountName: 'Generic 2-Step 100K',
      phase: 'Phase 1',
      startingBalance: 100000,
      currency: 'USD',
      profitTargetValue: 8,
      profitTargetType: 'PERCENT',
      minimumTradingDays: 5,
      timeLimitDays: 30,
      dailyLossValue: 5,
      dailyLossType: 'PERCENT',
      dailyLossBasis: 'EQUITY_BASED',
      dailyResetTime: '00:00',
      dailyResetTimezone: 'UTC',
      maxDrawdownValue: 10,
      maxDrawdownType: 'STATIC',
      lockFloorAtStartBalanceOnceInProfit: false,
      consistencyRuleEnabled: false,
      maxProfitSharePercentFromSingleDay: 30,
      maxTradesPerDay: 4,
      maxLots: 10,
      newsTradingRestricted: false,
      weekendHoldingRestricted: false,
      personalDailyLossValue: 2.5,
      personalDailyLossType: 'PERCENT',
      personalOverallDrawdownValue: 5,
      personalOverallDrawdownType: 'PERCENT',
      maxRiskPerTradePercent: 0.5,
      maxTotalOpenRiskPercent: 1.5,
    },
  },
  {
    id: 'generic_1step',
    name: 'Generic 1-Step (4% Daily / 6% Trailing)',
    badge: 'Example only. Verify against your firm\'s current rules',
    config: {
      accountName: 'Generic 1-Step 100K',
      phase: 'Phase 1',
      startingBalance: 100000,
      currency: 'USD',
      profitTargetValue: 10,
      profitTargetType: 'PERCENT',
      minimumTradingDays: 3,
      dailyLossValue: 4,
      dailyLossType: 'PERCENT',
      dailyLossBasis: 'EQUITY_BASED',
      dailyResetTime: '00:00',
      dailyResetTimezone: 'UTC',
      maxDrawdownValue: 6,
      maxDrawdownType: 'INTRADAY_TRAILING',
      lockFloorAtStartBalanceOnceInProfit: true,
      consistencyRuleEnabled: true,
      maxProfitSharePercentFromSingleDay: 30,
      maxTradesPerDay: 3,
      maxLots: 8,
      newsTradingRestricted: true,
      weekendHoldingRestricted: true,
      personalDailyLossValue: 2,
      personalDailyLossType: 'PERCENT',
      personalOverallDrawdownValue: 3,
      personalOverallDrawdownType: 'PERCENT',
      maxRiskPerTradePercent: 0.5,
      maxTotalOpenRiskPercent: 1.5,
    },
  },
  {
    id: 'futures_eod',
    name: 'Futures-Style EOD Trailing Drawdown',
    badge: 'Example only. Verify against your firm\'s current rules',
    config: {
      accountName: 'Futures EOD 50K',
      phase: 'Funded',
      startingBalance: 50000,
      currency: 'USD',
      profitTargetValue: 3000,
      profitTargetType: 'DOLLARS',
      minimumTradingDays: 5,
      dailyLossValue: 1250,
      dailyLossType: 'DOLLARS',
      dailyLossBasis: 'BALANCE_BASED',
      dailyResetTime: '17:00',
      dailyResetTimezone: 'America/New_York',
      maxDrawdownValue: 2500,
      maxDrawdownType: 'EOD_TRAILING',
      lockFloorAtStartBalanceOnceInProfit: true,
      consistencyRuleEnabled: true,
      maxProfitSharePercentFromSingleDay: 30,
      maxTradesPerDay: 5,
      maxLots: 5,
      newsTradingRestricted: false,
      weekendHoldingRestricted: true,
      personalDailyLossValue: 625,
      personalDailyLossType: 'DOLLARS',
      personalOverallDrawdownValue: 1250,
      personalOverallDrawdownType: 'DOLLARS',
      maxRiskPerTradePercent: 0.5,
      maxTotalOpenRiskPercent: 1.5,
    },
  },
];

export const CommandSetupWizard: React.FC<CommandSetupWizardProps> = ({
  onSaveProfile,
  existingAccounts = [],
  activeAccountId,
  onSelectAccount,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 7;

  // 1. Basics
  const [accountName, setAccountName] = useState('My Funded Challenge');
  const [currency, setCurrency] = useState('USD');
  const [startingBalance, setStartingBalance] = useState<number>(100000);
  const [phase, setPhase] = useState<AccountPhase>('Phase 1');

  // 2. Targets
  const [profitTargetValue, setProfitTargetValue] = useState<number>(8);
  const [profitTargetType, setProfitTargetType] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [minimumTradingDays, setMinimumTradingDays] = useState<number>(5);
  const [timeLimitDays, setTimeLimitDays] = useState<string>('30');

  // 3. Daily Loss Limit
  const [dailyLossValue, setDailyLossValue] = useState<number>(5);
  const [dailyLossType, setDailyLossType] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [dailyLossBasis, setDailyLossBasis] = useState<DailyLossBasis>('EQUITY_BASED');
  const [dailyResetTime, setDailyResetTime] = useState('00:00');
  const [dailyResetTimezone, setDailyResetTimezone] = useState('UTC');

  // 4. Max Drawdown
  const [maxDrawdownValue, setMaxDrawdownValue] = useState<number>(10);
  const [maxDrawdownUnit, setMaxDrawdownUnit] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [maxDrawdownType, setMaxDrawdownType] = useState<DrawdownType>('STATIC');
  const [lockFloorAtStart, setLockFloorAtStart] = useState<boolean>(false);

  // 5. Consistency Rule
  const [consistencyRuleEnabled, setConsistencyRuleEnabled] = useState<boolean>(false);
  const [maxProfitSharePct, setMaxProfitSharePct] = useState<number>(30);

  // 6. Other Restrictions
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(3);
  const [maxLots, setMaxLots] = useState<number>(10);
  const [newsTradingRestricted, setNewsTradingRestricted] = useState<boolean>(false);
  const [weekendHoldingRestricted, setWeekendHoldingRestricted] = useState<boolean>(false);

  // 7. Personal Safety Buffer
  const [personalDailyLossValue, setPersonalDailyLossValue] = useState<number>(2.5);
  const [personalDailyLossType, setPersonalDailyLossType] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [personalOverallDrawdownValue, setPersonalOverallDrawdownValue] = useState<number>(5);
  const [personalOverallDrawdownType, setPersonalOverallDrawdownType] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [maxRiskPerTradePercent, setMaxRiskPerTradePercent] = useState<number>(0.5);
  const [maxTotalOpenRiskPercent, setMaxTotalOpenRiskPercent] = useState<number>(1.5);

  const [validationError, setValidationError] = useState<string | null>(null);

  // Apply a preset template
  const applyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    const c = preset.config;
    if (c.accountName) setAccountName(c.accountName);
    if (c.currency) setCurrency(c.currency);
    if (c.startingBalance) setStartingBalance(c.startingBalance);
    if (c.phase) setPhase(c.phase);
    if (c.profitTargetValue !== undefined) setProfitTargetValue(c.profitTargetValue);
    if (c.profitTargetType) setProfitTargetType(c.profitTargetType);
    if (c.minimumTradingDays !== undefined) setMinimumTradingDays(c.minimumTradingDays);
    if (c.timeLimitDays !== undefined) setTimeLimitDays(String(c.timeLimitDays));
    if (c.dailyLossValue !== undefined) setDailyLossValue(c.dailyLossValue);
    if (c.dailyLossType) setDailyLossType(c.dailyLossType);
    if (c.dailyLossBasis) setDailyLossBasis(c.dailyLossBasis);
    if (c.dailyResetTime) setDailyResetTime(c.dailyResetTime);
    if (c.dailyResetTimezone) setDailyResetTimezone(c.dailyResetTimezone);
    if (c.maxDrawdownValue !== undefined) setMaxDrawdownValue(c.maxDrawdownValue);
    if (c.maxDrawdownType) setMaxDrawdownType(c.maxDrawdownType);
    if (c.lockFloorAtStartBalanceOnceInProfit !== undefined) setLockFloorAtStart(c.lockFloorAtStartBalanceOnceInProfit);
    if (c.consistencyRuleEnabled !== undefined) setConsistencyRuleEnabled(c.consistencyRuleEnabled);
    if (c.maxProfitSharePercentFromSingleDay !== undefined) setMaxProfitSharePct(c.maxProfitSharePercentFromSingleDay);
    if (c.maxTradesPerDay !== undefined) setMaxTradesPerDay(c.maxTradesPerDay);
    if (c.maxLots !== undefined) setMaxLots(c.maxLots);
    if (c.newsTradingRestricted !== undefined) setNewsTradingRestricted(c.newsTradingRestricted);
    if (c.weekendHoldingRestricted !== undefined) setWeekendHoldingRestricted(c.weekendHoldingRestricted);
    if (c.personalDailyLossValue !== undefined) setPersonalDailyLossValue(c.personalDailyLossValue);
    if (c.personalDailyLossType) setPersonalDailyLossType(c.personalDailyLossType);
    if (c.personalOverallDrawdownValue !== undefined) setPersonalOverallDrawdownValue(c.personalOverallDrawdownValue);
    if (c.personalOverallDrawdownType) setPersonalOverallDrawdownType(c.personalOverallDrawdownType);
    if (c.maxRiskPerTradePercent !== undefined) setMaxRiskPerTradePercent(c.maxRiskPerTradePercent);
    if (c.maxTotalOpenRiskPercent !== undefined) setMaxTotalOpenRiskPercent(c.maxTotalOpenRiskPercent);
  };

  const validateCurrentStep = (): boolean => {
    setValidationError(null);
    if (currentStep === 1) {
      if (!accountName.trim()) {
        setValidationError('Account profile name is required.');
        return false;
      }
      if (startingBalance <= 0) {
        setValidationError('Starting balance must be greater than zero.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (profitTargetValue <= 0) {
        setValidationError('Profit target must be greater than zero.');
        return false;
      }
    }
    if (currentStep === 3) {
      if (dailyLossValue <= 0) {
        setValidationError('Daily loss limit must be greater than zero.');
        return false;
      }
    }
    if (currentStep === 4) {
      if (maxDrawdownValue <= 0) {
        setValidationError('Maximum drawdown value must be greater than zero.');
        return false;
      }
    }
    if (currentStep === 7) {
      if (maxRiskPerTradePercent <= 0 || maxRiskPerTradePercent > 10) {
        setValidationError('Max risk per trade must be between 0.1% and 10%.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinish = () => {
    if (!validateCurrentStep()) return;

    const rules: RulesConfig = {
      accountName: accountName.trim(),
      currency,
      startingBalance,
      phase,
      profitTargetValue,
      profitTargetType,
      minimumTradingDays,
      timeLimitDays: timeLimitDays.trim() ? parseInt(timeLimitDays, 10) : undefined,
      dailyLossValue,
      dailyLossType,
      dailyLossBasis,
      dailyResetTime,
      dailyResetTimezone,
      maxDrawdownValue,
      maxDrawdownType,
      lockFloorAtStartBalanceOnceInProfit: lockFloorAtStart,
      consistencyRuleEnabled,
      maxProfitSharePercentFromSingleDay: maxProfitSharePct,
      maxTradesPerDay,
      maxLots,
      newsTradingRestricted,
      weekendHoldingRestricted,
      personalDailyLossValue,
      personalDailyLossType,
      personalOverallDrawdownValue,
      personalOverallDrawdownType,
      maxRiskPerTradePercent,
      maxTotalOpenRiskPercent,
    };

    const rawAccount: AccountSettings = {
      id: `acc-profile-${Date.now()}`,
      traderName: 'TRADER',
      accountName: accountName.trim(),
      accountType:
        phase === 'Funded'
          ? 'PROP_FIRM_FUNDED'
          : phase === 'Personal'
          ? 'PERSONAL_LIVE'
          : 'PROP_FIRM_EVALUATION',
      accountCategory: phase === 'Personal' ? 'PERSONAL' : 'FUNDED',
      initialBalance: startingBalance,
      currentBalance: startingBalance,
      currentEquity: startingBalance,
      broker: 'Prop Firm Challenge',
      currency,
      maxDailyLossPercent: dailyLossType === 'PERCENT' ? dailyLossValue : (dailyLossValue / startingBalance) * 100,
      maxDrawdownPercent: maxDrawdownValue <= 100 ? maxDrawdownValue : (maxDrawdownValue / startingBalance) * 100,
      maxDailyTrades: maxTradesPerDay,
      targetRiskPerTradePercent: maxRiskPerTradePercent,
      maxRiskPerTradePercent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveProfile(rules, rawAccount);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100 p-3 sm:p-6 font-mono-code">
      {/* Top Header & Account Switcher Banner */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>ACCOUNT SETUP WIZARD & PROFILE BUILDER</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-military font-bold text-white tracking-wide">
            CONFIGURE TRADING ACCOUNT RULES
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Calibrate strict risk controls, drawdown trailing logic, and personal safety limits for funded challenges.
          </p>
        </div>

        {/* Existing Profile Switcher */}
        {existingAccounts.length > 0 && onSelectAccount && (
          <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px]">ACTIVE PROFILE:</span>
            <select
              value={activeAccountId || existingAccounts[0]?.id}
              onChange={(e) => onSelectAccount(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs font-bold focus:border-cyan-400 outline-none"
            >
              {existingAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} ({formatCurrency(acc.currentBalance, acc.currency)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Preset Templates Carousel */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-military font-bold text-slate-300 uppercase flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>QUICK-START PRESET TEMPLATES</span>
          </span>
          <span className="text-[10px] text-amber-400/90 font-sans italic">
            Example only. Verify against your firm's current rules.
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PRESET_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyPreset(tpl)}
              className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 text-left transition flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition">
                  {tpl.name}
                </div>
                <div className="text-[9px] text-amber-400/80 mt-1 font-sans">
                  {tpl.badge}
                </div>
              </div>
              <span className="mt-2 text-[10px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                <span>LOAD PRESET</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-cyan-400 font-military">
            STEP {currentStep} OF {totalSteps}:{' '}
            {currentStep === 1
              ? 'BASICS'
              : currentStep === 2
              ? 'PROFIT TARGETS'
              : currentStep === 3
              ? 'DAILY LOSS LIMIT'
              : currentStep === 4
              ? 'MAX DRAWDOWN'
              : currentStep === 5
              ? 'CONSISTENCY RULE'
              : currentStep === 6
              ? 'OTHER RESTRICTIONS'
              : 'PERSONAL SAFETY BUFFER'}
          </span>
          <span className="text-slate-400 font-sans">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Error alert */}
      {validationError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* STEP CONTENT BODY */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl min-h-[380px] flex flex-col justify-between">
        <div>
          {/* STEP 1: BASICS */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-military font-bold text-white uppercase border-b border-slate-800 pb-2">
                Step 1: Account Basics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Account Profile Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. FTMO Phase 1 100K"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Account Base Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="USC">Cent Account (USC / ¢)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="PKR">PKR (Rs)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Starting Account Balance</label>
                  <input
                    type="number"
                    min="100"
                    step="1000"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(Math.max(100, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 font-bold outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Account Challenge Phase</label>
                  <select
                    value={phase}
                    onChange={(e) => setPhase(e.target.value as AccountPhase)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  >
                    <option value="Phase 1">Phase 1 (Evaluation)</option>
                    <option value="Phase 2">Phase 2 (Verification)</option>
                    <option value="Funded">Funded (Live Simulated / Real)</option>
                    <option value="Personal">Personal Account</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TARGETS */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-military font-bold text-white uppercase border-b border-slate-800 pb-2">
                Step 2: Profit Targets & Duration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Profit Target</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={profitTargetValue}
                      onChange={(e) => setProfitTargetValue(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold outline-none focus:border-cyan-400"
                    />
                    <select
                      value={profitTargetType}
                      onChange={(e) => setProfitTargetType(e.target.value as any)}
                      className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none"
                    >
                      <option value="PERCENT">%</option>
                      <option value="DOLLARS">{currency}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Minimum Trading Days</label>
                  <input
                    type="number"
                    min="0"
                    value={minimumTradingDays}
                    onChange={(e) => setMinimumTradingDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Time Limit (Days, Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={timeLimitDays}
                    onChange={(e) => setTimeLimitDays(e.target.value)}
                    placeholder="e.g. 30 (or leave empty for unlimited)"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DAILY LOSS LIMIT */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-military font-bold text-white uppercase border-b border-slate-800 pb-2">
                Step 3: Daily Loss Limit & Reset Timezone
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Daily Loss Limit</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={dailyLossValue}
                      onChange={(e) => setDailyLossValue(Math.max(0.1, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-rose-400 font-bold outline-none focus:border-cyan-400"
                    />
                    <select
                      value={dailyLossType}
                      onChange={(e) => setDailyLossType(e.target.value as any)}
                      className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none"
                    >
                      <option value="PERCENT">%</option>
                      <option value="DOLLARS">{currency}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Daily Loss Basis</label>
                  <select
                    value={dailyLossBasis}
                    onChange={(e) => setDailyLossBasis(e.target.value as DailyLossBasis)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  >
                    <option value="EQUITY_BASED">Equity-Based (Includes Floating Open P/L)</option>
                    <option value="BALANCE_BASED">Balance-Based (Closed Trades Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Daily Reset Time (HH:MM)</label>
                  <input
                    type="text"
                    value={dailyResetTime}
                    onChange={(e) => setDailyResetTime(e.target.value)}
                    placeholder="00:00"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Daily Reset Timezone</label>
                  <select
                    value={dailyResetTimezone}
                    onChange={(e) => setDailyResetTimezone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  >
                    <option value="UTC">UTC (Universal Coordinated)</option>
                    <option value="America/New_York">America/New_York (EST / EDT)</option>
                    <option value="Europe/London">Europe/London (GMT / BST)</option>
                    <option value="Europe/Prague">Europe/Prague (CE(S)T - FTMO Default)</option>
                    <option value="Asia/Karachi">Asia/Karachi (PKT +5)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +4)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: MAX DRAWDOWN */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-military font-bold text-white uppercase border-b border-slate-800 pb-2">
                Step 4: Maximum Drawdown & Trailing Floor
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Max Drawdown Value</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={maxDrawdownValue}
                      onChange={(e) => setMaxDrawdownValue(Math.max(0.5, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-rose-400 font-bold outline-none focus:border-cyan-400"
                    />
                    <select
                      value={maxDrawdownUnit}
                      onChange={(e) => setMaxDrawdownUnit(e.target.value as any)}
                      className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none"
                    >
                      <option value="PERCENT">%</option>
                      <option value="DOLLARS">{currency}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Drawdown Type</label>
                  <select
                    value={maxDrawdownType}
                    onChange={(e) => setMaxDrawdownType(e.target.value as DrawdownType)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  >
                    <option value="STATIC">Static (Fixed from Starting Balance)</option>
                    <option value="EOD_TRAILING">End-of-Day Trailing (Trails Closed Daily Balance)</option>
                    <option value="INTRADAY_TRAILING">Intraday Trailing (Trails Peak High Water Mark Equity)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 pt-2">
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-cyan-500/40 transition">
                    <input
                      type="checkbox"
                      checked={lockFloorAtStart}
                      onChange={(e) => setLockFloorAtStart(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-200 block">
                        Trailing Floor Locks at Starting Balance Once in Profit
                      </span>
                      <span className="text-slate-400 text-[11px] font-sans">
                        When enabled, as soon as your account exceeds starting capital (${startingBalance.toLocaleString()}), the drawdown floor will stop rising once it reaches your original starting balance.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONSISTENCY RULE */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-military font-bold text-white uppercase border-b border-slate-800 pb-2">
                Step 5: Consistency Rule
              </h3>
              <div className="space-y-4 text-xs">
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-cyan-500/40 transition">
                  <input
                    type="checkbox"
                    checked={consistencyRuleEnabled}
                    onChange={(e) => setConsistencyRuleEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      Enable Single-Day Profit Consistency Rule
                    </span>
                    <span className="text-slate-400 text-[11px] font-sans">
                      Some firms disqualify challenge passes if more than a certain percentage of total profit is earned in a single trading day (e.g., passing on a lucky news spike).
                    </span>
                  </div>
                </label>

                {consistencyRuleEnabled && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <label className="block text-slate-300 font-bold uppercase">
                      Max % of Total Profit Allowed from a Single Day
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        max="80"
                        value={maxProfitSharePct}
                        onChange={(e) => setMaxProfitSharePct(parseInt(e.target.value, 10) || 30)}
                        className="w-32 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-bold outline-none"
                      />
                      <span className="font-bold text-cyan-400">% (Default: 30%)</span>
                    </div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      The riskEngine will compute your best day's profit share and calculate the exact remaining profit you are allowed to make today without violating this rule.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: OTHER RESTRICTIONS */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-sm font-military font-bold text-white uppercase border-b border-slate-800 pb-2">
                Step 6: Other Trading Restrictions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Max Trades Per Day</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxTradesPerDay}
                    onChange={(e) => setMaxTradesPerDay(parseInt(e.target.value, 10) || 3)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Max Lots Open Simultaneously</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={maxLots}
                    onChange={(e) => setMaxLots(parseFloat(e.target.value) || 10)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2 pt-1">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsTradingRestricted}
                      onChange={(e) => setNewsTradingRestricted(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500"
                    />
                    <span className="text-slate-200 font-bold">News-Trading Restriction Active (No trades ±2m of high-impact releases)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weekendHoldingRestricted}
                      onChange={(e) => setWeekendHoldingRestricted(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500"
                    />
                    <span className="text-slate-200 font-bold">Weekend-Holding Restriction Active (Close all positions Friday before market close)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: PERSONAL SAFETY BUFFER & SUMMARY */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h3 className="text-sm font-military font-bold text-white uppercase border-b border-slate-800 pb-2">
                Step 7: Personal Safety Buffer & Final Plain-English Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">
                    Personal Daily Loss Cap (Defaults to 50% of firm's)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.25"
                      value={personalDailyLossValue}
                      onChange={(e) => setPersonalDailyLossValue(parseFloat(e.target.value) || 2.5)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold outline-none"
                    />
                    <span className="px-3 py-2.5 bg-slate-900 rounded-xl border border-slate-700 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">
                    Personal Overall Drawdown Cap (Defaults to 50% of firm's)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={personalOverallDrawdownValue}
                      onChange={(e) => setPersonalOverallDrawdownValue(parseFloat(e.target.value) || 5)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold outline-none"
                    />
                    <span className="px-3 py-2.5 bg-slate-900 rounded-xl border border-slate-700 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Max Risk Per Trade</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={maxRiskPerTradePercent}
                      onChange={(e) => setMaxRiskPerTradePercent(parseFloat(e.target.value) || 0.5)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none"
                    />
                    <span className="px-3 py-2.5 bg-slate-900 rounded-xl border border-slate-700 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase">Max Total Open Risk</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.25"
                      value={maxTotalOpenRiskPercent}
                      onChange={(e) => setMaxTotalOpenRiskPercent(parseFloat(e.target.value) || 1.5)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none"
                    />
                    <span className="px-3 py-2.5 bg-slate-900 rounded-xl border border-slate-700 font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* Plain-English Summary Before Saving */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-2 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-cyan-300 block uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Plain-English Summary of Rules
                </span>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-300 font-sans">
                  <li>
                    Account: <strong>{accountName}</strong> starting with <strong>{startingBalance.toLocaleString()} {currency}</strong> ({phase}).
                  </li>
                  <li>
                    Profit Target: <strong>{profitTargetValue}{profitTargetType === 'PERCENT' ? '%' : ` ${currency}`}</strong> with minimum <strong>{minimumTradingDays}</strong> trading days.
                  </li>
                  <li>
                    Daily Loss: Firm cap is <strong>{dailyLossValue}{dailyLossType === 'PERCENT' ? '%' : ` ${currency}`}</strong> ({dailyLossBasis.replace('_', ' ')}), resetting at <strong>{dailyResetTime} {dailyResetTimezone}</strong>. Personal safety lockout triggers at <strong>{personalDailyLossValue}%</strong>.
                  </li>
                  <li>
                    Max Drawdown: <strong>{maxDrawdownValue}%</strong> ({maxDrawdownType.replace('_', ' ')}), {lockFloorAtStart ? 'locking at starting balance once in profit' : 'never locked'}.
                  </li>
                  <li>
                    Consistency Rule: {consistencyRuleEnabled ? `Active (Max ${maxProfitSharePct}% from single day)` : 'Disabled'}.
                  </li>
                  <li>
                    Risk Buffer: Max risk per trade is <strong>{maxRiskPerTradePercent}%</strong>; maximum aggregated open risk capped at <strong>{maxTotalOpenRiskPercent}%</strong>.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Controls Footer */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-900 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK</span>
          </button>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold tracking-wider uppercase transition shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <span>NEXT STEP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>SAVE TRADING PROFILE</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
