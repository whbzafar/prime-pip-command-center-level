import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Percent,
  DollarSign,
  AlertOctagon,
  Edit2,
  X,
  Volume2,
  Radio,
  Crosshair,
  Info,
  Check,
} from 'lucide-react';
import { AccountSettings, TradingRule, Trade } from '../types';
import { DashboardMetrics } from '../utils/tradeAnalytics';
import { playDisciplineAlert } from '../utils/audioAlerts';
import { getKarachiDate, getKarachiTime } from '../utils/time';
import { formatCurrency } from '../utils/currencyFormatter';
import { calculateNextTradeReadiness } from '../utils/readinessEngine';

export interface TradeLimitAlertSystemProps {
  account: AccountSettings | null;
  metrics: DashboardMetrics;
  trades: Trade[];
  onNavigateToTab?: (tab: any) => void;
  forceOpen?: boolean;
  onClose?: () => void;
}

export const TradeLimitAlertSystem: React.FC<TradeLimitAlertSystemProps> = ({
  account,
  metrics,
  trades,
  onNavigateToTab,
  forceOpen = false,
  onClose,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const lastAlertKeyRef = useRef<string>('');

  if (!account) return null;

  const todayDate = getKarachiDate();
  const todayTrades = trades.filter((t) => t.date === todayDate);
  const todayPnL = todayTrades.reduce(
    (acc, t) => acc + (typeof t.profitLoss === 'number' ? t.profitLoss : 0),
    0
  );

  const dailyLossLimitDollars = (account.initialBalance * (account.maxDailyLossPercent || 2)) / 100;

  const isTradeLimitReached = account.maxDailyTrades > 0 && metrics.tradesToday >= account.maxDailyTrades;
  const isDailyLossLimitHit =
    account.maxDailyLossPercent > 0 &&
    ((todayTrades.length > 0 && todayPnL <= -dailyLossLimitDollars) ||
      (metrics.tradesToday > 0 && metrics.totalProfitLoss <= -dailyLossLimitDollars));

  const isLimitReached = isTradeLimitReached || isDailyLossLimitHit;

  // Trigger audio alert and reset dismissal when limit is reached
  useEffect(() => {
    if (isLimitReached) {
      const alertKey = `${todayDate}-${metrics.tradesToday}-${Math.floor(todayPnL)}-${
        isTradeLimitReached ? 'TRD' : ''
      }-${isDailyLossLimitHit ? 'LOSS' : ''}`;
      if (lastAlertKeyRef.current !== alertKey) {
        lastAlertKeyRef.current = alertKey;
        setIsDismissed(false);
        playDisciplineAlert('LIMIT_REACHED');
      }
    }
  }, [isLimitReached, metrics.tradesToday, todayPnL, isTradeLimitReached, isDailyLossLimitHit, todayDate]);

  // When forceOpen changes to true, trigger sound
  useEffect(() => {
    if (forceOpen) {
      setIsDismissed(false);
      playDisciplineAlert('LIMIT_REACHED');
    }
  }, [forceOpen]);

  const handleReplayAlert = () => {
    playDisciplineAlert('LIMIT_REACHED');
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onClose) onClose();
  };

  const shouldShowModal = (isLimitReached && !isDismissed) || forceOpen;

  return (
    <>
      {shouldShowModal && (
        <div
          id="trade-limit-lockout-overlay"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-xl rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-black border-2 border-rose-600/80 p-6 sm:p-8 shadow-2xl shadow-rose-950/60 overflow-hidden">
            {/* Pulsing indicator strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="p-4 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/40 animate-pulse">
                  <AlertOctagon className="w-12 h-12" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600"></span>
                </span>
              </div>

              <div>
                <span className="text-[11px] font-mono-code font-bold tracking-widest text-rose-400 uppercase">
                  CIRCUIT BREAKER ACTIVATED
                </span>
                <h3 className="text-xl sm:text-2xl font-military font-bold text-white tracking-wider uppercase mt-1">
                  DAILY TRADING LOCKOUT ENFORCED
                </h3>
              </div>

              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono-code text-xs text-left space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">STATUS TRIGGER:</span>
                  <span className="font-bold text-rose-400 uppercase">
                    {isTradeLimitReached && isDailyLossLimitHit
                      ? 'TRADE COUNT & LOSS LIMIT BREACHED'
                      : isTradeLimitReached
                      ? 'MAX DAILY TRADES REACHED'
                      : 'DAILY LOSS LIMIT BREACHED'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">TRADES TODAY:</span>
                  <span className="font-bold text-slate-200">
                    {metrics.tradesToday} / {account.maxDailyTrades} (Max Allowed)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">DAILY LOSS GUARDRAIL:</span>
                  <span className="font-bold text-slate-200">
                    {account.maxDailyLossPercent}% ({formatCurrency(dailyLossLimitDollars, account.currency)})
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">MANDATORY PROTOCOL:</span>
                  <span className="font-bold text-amber-400">HALT TRADING IMMEDIATELY</span>
                </div>
              </div>

              <p className="text-xs font-sans text-slate-300 max-w-md leading-relaxed">
                Disciplined execution requires strict adherence to stop limits. Overtrading or revenge trading after a limit breach is strictly prohibited. Step away from your charts.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReplayAlert}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-code text-xs flex items-center gap-2 border border-slate-700 transition"
                >
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>REPLAY ALARM</span>
                </button>

                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDismiss();
                      onNavigateToTab('PSYCHOLOGY');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono-code text-xs flex items-center gap-2 border border-amber-500/40 transition"
                  >
                    <span>COOL-DOWN PROTOCOL</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-military font-bold text-xs tracking-wider transition shadow-lg shadow-rose-900/30"
                >
                  ACKNOWLEDGE LOCKOUT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface RiskCenterProps {
  account: AccountSettings;
  onUpdateAccount: (updated: AccountSettings) => void;
  rules: TradingRule[];
  onToggleRule: (ruleId: string) => void;
  onAddRule?: (
    title: string,
    category: 'RISK' | 'EXECUTION' | 'PSYCHOLOGY',
    isHardRule: boolean,
    description?: string,
    severity?: 'MAJOR' | 'MINOR'
  ) => void;
  onSaveRule?: (rule: TradingRule) => void;
  onDeleteRule: (ruleId: string) => void;
  metrics: DashboardMetrics;
  trades: Trade[];
  defaultInstrument?: string;
  onInstrumentChange?: (instrument: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const RiskCenter: React.FC<RiskCenterProps> = ({
  account,
  onUpdateAccount,
  rules,
  onToggleRule,
  onAddRule,
  onSaveRule,
  onDeleteRule,
  metrics,
  trades,
  onNavigateToTab,
}) => {
  const [isTestAlertOpen, setIsTestAlertOpen] = useState(false);

  // Rule Management State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleCategory, setRuleCategory] = useState<'RISK' | 'EXECUTION' | 'PSYCHOLOGY'>('RISK');
  const [ruleSeverity, setRuleSeverity] = useState<'MAJOR' | 'MINOR'>('MAJOR');
  const [ruleIsHard, setRuleIsHard] = useState(true);
  const [ruleIsActive, setRuleIsActive] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ACTIVE' | 'RISK' | 'EXECUTION' | 'PSYCHOLOGY'>('ALL');

  // Real-time Readiness & Risk Calculations from active account master balance
  const readiness = calculateNextTradeReadiness(trades, account);
  const activeBalance = account.currentBalance > 0 ? account.currentBalance : account.initialBalance;
  const closedTrades = (trades || []).filter(
    (t) => t.status === 'CLOSED' || typeof t.profitLoss === 'number'
  );
  const latestClosedTrade = closedTrades.length > 0 ? closedTrades[0] : null;
  
  // Standard 1% per trade and 2% daily limit calculations
  const standardRiskPercent = 1.0;
  const master1PercentRiskDollars = (activeBalance * 1.0) / 100;
  const standardDailyRiskPercent = 2.0;
  const dailyRiskLimitDollars = (activeBalance * standardDailyRiskPercent) / 100;
  const dailyRiskUsed = readiness.dailyRiskUsed || 0;
  const remainingDailyRisk = Math.max(0, dailyRiskLimitDollars - dailyRiskUsed);
  const recommendedMaxRisk = (readiness.status === 'RED' || remainingDailyRisk <= 0)
    ? 0
    : Math.min(master1PercentRiskDollars, remainingDailyRisk);

  // Warning detectors
  const isDailyLimitReached = metrics.tradesToday >= account.maxDailyTrades;
  const isDailyLossLimitHit = readiness.isDailyLossLimitReached || (metrics.tradesToday > 0 && metrics.totalProfitLoss < -dailyRiskLimitDollars);
  const isDrawdownNearing = metrics.maxDrawdownPercent >= account.maxDrawdownPercent * 0.75;
  const isDrawdownBreached = metrics.maxDrawdownPercent >= account.maxDrawdownPercent;

  // Rule handlers
  const handleOpenAddModal = () => {
    setEditingRuleId(null);
    setRuleTitle('');
    setRuleDescription('');
    setRuleCategory('RISK');
    setRuleSeverity('MAJOR');
    setRuleIsHard(true);
    setRuleIsActive(true);
    setIsRuleModalOpen(true);
  };

  const handleOpenEditModal = (rule: TradingRule) => {
    setEditingRuleId(rule.id);
    setRuleTitle(rule.title);
    setRuleDescription(rule.description || '');
    setRuleCategory(rule.category || 'RISK');
    setRuleSeverity(rule.severity || (rule.isHardRule ? 'MAJOR' : 'MINOR'));
    setRuleIsHard(rule.isHardRule ?? true);
    setRuleIsActive(rule.isActive ?? rule.active ?? true);
    setIsRuleModalOpen(true);
  };

  const handleSaveRuleForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim()) return;

    if (editingRuleId) {
      const updatedRule: TradingRule = {
        id: editingRuleId,
        title: ruleTitle.trim(),
        description: ruleDescription.trim(),
        category: ruleCategory,
        severity: ruleSeverity,
        isHardRule: ruleIsHard,
        isActive: ruleIsActive,
        active: ruleIsActive,
        violationCount: rules.find((r) => r.id === editingRuleId)?.violationCount || 0,
      };
      if (onSaveRule) {
        onSaveRule(updatedRule);
      } else if (onAddRule) {
        onAddRule(ruleTitle.trim(), ruleCategory, ruleIsHard, ruleDescription.trim(), ruleSeverity);
      }
    } else {
      const newRule: TradingRule = {
        id: `rule-${Date.now()}`,
        title: ruleTitle.trim(),
        description: ruleDescription.trim(),
        category: ruleCategory,
        severity: ruleSeverity,
        isHardRule: ruleIsHard,
        isActive: ruleIsActive,
        active: ruleIsActive,
        violationCount: 0,
      };
      if (onSaveRule) {
        onSaveRule(newRule);
      } else if (onAddRule) {
        onAddRule(ruleTitle.trim(), ruleCategory, ruleIsHard, ruleDescription.trim(), ruleSeverity);
      }
    }

    setIsRuleModalOpen(false);
  };

  const filteredRules = rules.filter((r) => {
    const isAct = r.isActive ?? r.active ?? true;
    if (categoryFilter === 'ACTIVE') return isAct;
    if (categoryFilter === 'RISK') return r.category === 'RISK';
    if (categoryFilter === 'EXECUTION') return r.category === 'EXECUTION';
    if (categoryFilter === 'PSYCHOLOGY') return r.category === 'PSYCHOLOGY';
    return true;
  });

  const activeCount = rules.filter((r) => r.isActive ?? r.active ?? true).length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Institutional Risk Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-military font-bold text-sm text-slate-100 tracking-wider uppercase">
              RISK MANAGEMENT & DISCIPLINE COMMAND
            </h3>
            <p className="text-xs text-slate-400 font-mono-code">
              Institutional Capital Preservation • Standard 1% Risk • 2% Daily Cap • Circuit Breakers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTestAlertOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-mono-code text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
          >
            <Volume2 className="w-4 h-4" />
            <span>TEST LOCKOUT OVERLAY & SIREN</span>
          </button>
        </div>
      </div>

      {/* Local Test Trigger for TradeLimitAlertSystem */}
      {isTestAlertOpen && (
        <TradeLimitAlertSystem
          account={account}
          metrics={metrics}
          trades={trades}
          forceOpen={true}
          onClose={() => setIsTestAlertOpen(false)}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* Real-time Defense Warnings */}
      <div className="space-y-3">
        {isDailyLimitReached && (
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <strong className="font-military font-bold text-sm block tracking-wide">
                  TACTICAL PROTOCOL: DAILY TRADE LIMIT REACHED ({metrics.tradesToday}/{account.maxDailyTrades})
                </strong>
                <span className="text-xs text-slate-300 font-sans">
                  You have fulfilled your trade allocation for this 24-hour cycle. Close charting terminal to prevent overtrading.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-xs font-military font-bold">
              LOCKED
            </span>
          </div>
        )}

        {isDailyLossLimitHit && (
          <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <strong className="font-military font-bold text-sm block tracking-wide">
                  CRITICAL DEFENSE WARNING: DAILY LOSS LIMIT REACHED
                </strong>
                <span className="text-xs text-slate-300 font-sans">
                  Current session losses exceed your 2% ({formatCurrency(dailyRiskLimitDollars, account.currency)}) guardrail. Hard stop active.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-rose-500 text-white text-xs font-military font-bold">
              DEFENSE LOCK
            </span>
          </div>
        )}

        {isDrawdownBreached && (
          <div className="p-4 rounded-xl bg-rose-600/25 border border-rose-600 text-rose-200 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <strong className="font-military font-bold text-sm block tracking-wide">
                  MAX DRAWDOWN BREACHED: {metrics.maxDrawdownPercent.toFixed(1)}% (Threshold: {account.maxDrawdownPercent}%)
                </strong>
                <span className="text-xs font-sans">
                  Trading suspended. Mandatory account preservation review required.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-military font-bold">
              HALT
            </span>
          </div>
        )}

        {isDrawdownNearing && !isDrawdownBreached && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-xs font-sans">
              Warning: Current drawdown ({metrics.maxDrawdownPercent.toFixed(1)}%) is approaching your maximum threshold ({account.maxDrawdownPercent}%). Reduce position risk to protect equity.
            </span>
          </div>
        )}
      </div>

      {/* Grid: Tactical Defense Guardrails & Master Balance Risk Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Tactical Defense Guardrails */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-slate-200">
                <Shield className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-military font-bold tracking-wider uppercase">
                  TACTICAL DEFENSE GUARDRAILS
                </h4>
              </div>
              <span className="text-[10px] font-mono-code text-emerald-400">HARD RULES ENFORCED</span>
            </div>

            <div className="space-y-4 text-xs font-mono-code">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Max Risk Per Trade</label>
                  <span className="text-[10px] text-amber-400 font-bold">STANDARD: 1.0%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2.0"
                    value={account.maxRiskPerTradePercent || 1.0}
                    onChange={(e) =>
                      onUpdateAccount({
                        ...account,
                        maxRiskPerTradePercent: Math.min(2.0, parseFloat(e.target.value) || 1.0),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-bold outline-none focus:border-amber-400"
                  />
                  <span className="text-slate-400">%</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  =${formatCurrency(master1PercentRiskDollars, account.currency)} per trade on active balance
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Max Daily Loss Limit</label>
                  <span className="text-[10px] text-slate-300 font-bold">STANDARD: 2.0%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1.0"
                    max="5.0"
                    value={account.maxDailyLossPercent || 2.0}
                    onChange={(e) =>
                      onUpdateAccount({
                        ...account,
                        maxDailyLossPercent: parseFloat(e.target.value) || 2.0,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 font-bold outline-none focus:border-amber-400"
                  />
                  <span className="text-slate-400">%</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  =${formatCurrency(dailyRiskLimitDollars, account.currency)} maximum daily loss cap
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Max Allowable Drawdown (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="2.0"
                    max="20.0"
                    value={account.maxDrawdownPercent || 5.0}
                    onChange={(e) =>
                      onUpdateAccount({
                        ...account,
                        maxDrawdownPercent: parseFloat(e.target.value) || 5.0,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 font-bold outline-none focus:border-amber-400"
                  />
                  <span className="text-slate-400">%</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Max Daily Trades Cap</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={account.maxDailyTrades || 2}
                  onChange={(e) =>
                    onUpdateAccount({
                      ...account,
                      maxDailyTrades: parseInt(e.target.value) || 2,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-bold outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono-code text-slate-500">
            *Hard risk limits are active across all tools. Never increase risk after losses or winning runs.
          </div>
        </div>

        {/* Card 2: Master Account Balance Risk Guidance (Section 8) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
                  ACTIVE BALANCE RISK GUIDANCE
                </h4>
              </div>
              <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                isDailyLimitReached || isDailyLossLimitHit
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isDailyLimitReached || isDailyLossLimitHit ? 'LIMIT REACHED' : 'WITHIN PLAN'}
              </span>
            </div>

            <div className="space-y-3 font-mono-code text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">ACCOUNT BALANCE:</span>
                <span className="font-bold text-slate-100 text-sm">
                  {formatCurrency(activeBalance, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">MAX RISK PER TRADE:</span>
                <span className="font-bold text-amber-400">
                  1% ({formatCurrency(master1PercentRiskDollars, account.currency)})
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">DAILY RISK LIMIT:</span>
                <span className="font-bold text-slate-200">
                  2% ({formatCurrency(dailyRiskLimitDollars, account.currency)})
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">DAILY RISK USED:</span>
                <span className={`font-bold ${dailyRiskUsed > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {formatCurrency(dailyRiskUsed, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">REMAINING DAILY RISK:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(remainingDailyRisk, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">RECOMMENDED MAX RISK:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {formatCurrency(recommendedMaxRisk, account.currency)}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-300 leading-relaxed">
              <div className="text-[10px] uppercase font-bold tracking-wider mb-1 text-amber-400 font-military flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                INSTITUTIONAL POSITION SIZING DIRECTIVE:
              </div>
              Use the official <strong className="text-amber-400">LOT SIZE CALCULATOR</strong> in the main navigation for exact lot size calculation on any manual instrument with stop loss in pips.
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono-code text-slate-500">
            *Master balance dynamically drives recommended risk across all modules.
          </div>
        </div>
      </div>

      {/* SECTION 12: WIN / LOSS DISCIPLINE GUIDANCE & REAL AUDIT */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              latestClosedTrade && (latestClosedTrade.profitLoss || 0) > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : latestClosedTrade && (latestClosedTrade.profitLoss || 0) < 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-military font-bold text-sm text-slate-100 uppercase tracking-wider">
                POST-TRADE DISCIPLINE & RISK GUIDANCE AUDIT
              </h3>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Dynamic balance adjustment & rule-based execution guidance on trade results
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs font-mono-code font-bold uppercase border ${
              (latestClosedTrade?.profitLoss ?? -5) > 0
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : (latestClosedTrade?.profitLoss ?? -5) < 0
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {(latestClosedTrade?.profitLoss ?? -5) > 0
                ? 'OUTCOME: WIN (PROFIT)'
                : (latestClosedTrade?.profitLoss ?? -5) < 0
                ? 'OUTCOME: LOSS'
                : 'OUTCOME: BREAK-EVEN'}
            </span>
          </div>
        </div>

        {/* Real Dynamic Calculations Grid */}
        {(() => {
          const pnl = latestClosedTrade ? (latestClosedTrade.profitLoss || 0) : -5;
          const isWin = pnl > 0;
          const isLoss = pnl < 0;
          const startBal = latestClosedTrade ? activeBalance - pnl : activeBalance;
          const endBal = activeBalance;
          const next1Pct = (endBal * 1) / 100;
          const dailyUsed = readiness.dailyRiskUsed || 0;
          const remDaily = Math.max(0, dailyRiskLimitDollars - dailyUsed);

          const suggestionText = isLoss
            ? 'Review whether the setup followed your strategy, whether the stop loss was respected, and whether the trade stayed within your risk plan. Do not increase risk to recover the loss.'
            : isWin
            ? 'Review what made the setup valid and keep the same 1% risk discipline. A winning trade is not a reason to increase risk.'
            : 'Review whether the trade followed your technical criteria and whether the break-even adjustment was executed according to your playbook. Maintain standard 1% risk discipline.';

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-code text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Starting Balance</span>
                  <span className="text-sm font-bold text-slate-200 mt-0.5 block">
                    {formatCurrency(startBal, account.currency)}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Trade P&L</span>
                  <span className={`text-sm font-bold mt-0.5 block ${
                    isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'
                  }`}>
                    {pnl >= 0 ? `+${formatCurrency(pnl, account.currency)}` : `-${formatCurrency(Math.abs(pnl), account.currency)}`}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase block">New Current Balance</span>
                  <span className="text-sm font-bold text-amber-300 mt-0.5 block">
                    {formatCurrency(endBal, account.currency)}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-amber-500/30">
                  <span className="text-amber-400 text-[10px] uppercase block font-bold">Next 1% Risk Cap</span>
                  <span className="text-sm font-black text-amber-400 mt-0.5 block">
                    {formatCurrency(next1Pct, account.currency)}
                  </span>
                </div>
              </div>

              {/* Daily Risk Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono-code text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Daily Risk Used:</span>
                  <span className="font-bold text-slate-200">
                    {formatCurrency(dailyUsed, account.currency)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Remaining Daily Risk (2% Limit):</span>
                  <span className={`font-bold ${remDaily > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(remDaily, account.currency)}
                  </span>
                </div>
              </div>

              {/* Official Professional Suggestion Box */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isLoss
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : isWin
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-slate-950 border-slate-800'
              }`}>
                <Info className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isLoss ? 'text-rose-400' : isWin ? 'text-emerald-400' : 'text-amber-400'
                }`} />
                <div className="space-y-1">
                  <div className="text-[11px] font-military font-bold uppercase tracking-wider text-slate-200">
                    PROFESSIONAL DISCIPLINE DIRECTIVE
                  </div>
                  <p className="text-xs font-mono-code text-slate-200 leading-relaxed">
                    "{suggestionText}"
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Trading Rules Checklist & Violation Enforcement */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-military font-bold text-slate-100">
                ACTIVE TRADING COMMAND RULES (PLAYBOOK)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Disciplined operators review and uphold these rules on every execution. All rules default to ACTIVE: ON.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono-code text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
              {activeCount} / {rules.length} ACTIVE RULES
            </span>

            <button
              id="add-rule-btn"
              onClick={handleOpenAddModal}
              className="prime-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs uppercase cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>ADD RULE</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs font-mono-code">
          {(['ALL', 'ACTIVE', 'RISK', 'EXECUTION', 'PSYCHOLOGY'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md transition ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat === 'ACTIVE' ? `ACTIVE ONLY (${activeCount})` : cat}
            </button>
          ))}
        </div>

        {/* Rule list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRules.map((rule) => {
            const isActive = rule.isActive ?? rule.active ?? true;
            return (
              <div
                key={rule.id}
                className={`p-3.5 rounded-lg border transition flex flex-col justify-between gap-3 ${
                  isActive
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-950/30 border-slate-900 opacity-50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <button
                        id={`toggle-rule-${rule.id}`}
                        onClick={() => onToggleRule(rule.id)}
                        className="mt-0.5 text-amber-400 hover:text-amber-300 transition"
                        title={isActive ? 'Click to deactivate rule' : 'Click to activate rule'}
                      >
                        {isActive ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                      <div>
                        <span className={`text-xs font-semibold block ${isActive ? 'text-slate-100' : 'text-slate-400 line-through'}`}>
                          {rule.title}
                        </span>
                        {rule.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(rule)}
                        className="p-1 rounded text-slate-500 hover:text-amber-400 transition"
                        title="Edit Rule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1 rounded text-slate-600 hover:text-rose-400 transition"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] font-mono-code">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {rule.category || 'RISK'}
                    </span>
                    {rule.isHardRule && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        HARD RULE
                      </span>
                    )}
                    {rule.severity && (
                      <span className={`px-1.5 py-0.5 rounded ${rule.severity === 'MAJOR' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                        {rule.severity}
                      </span>
                    )}
                  </div>

                  <span className={`font-bold ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isActive ? 'ACTIVE: ON' : 'ACTIVE: OFF'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-700/80 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4 font-mono-code">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-100 font-military font-bold text-sm">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{editingRuleId ? 'EDIT TRADING RULE' : 'ADD NEW TRADING COMMAND RULE'}</span>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Rule Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Never enter without 15M FVG confluence"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description / Rationale</label>
                <textarea
                  rows={2}
                  placeholder="Context and rationale behind this discipline requirement..."
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category</label>
                  <select
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none focus:border-amber-400"
                  >
                    <option value="RISK">RISK</option>
                    <option value="EXECUTION">EXECUTION</option>
                    <option value="PSYCHOLOGY">PSYCHOLOGY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Severity Level</label>
                  <select
                    value={ruleSeverity}
                    onChange={(e) => setRuleSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none focus:border-amber-400"
                  >
                    <option value="MAJOR">MAJOR (Critical)</option>
                    <option value="MINOR">MINOR (Discretionary)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-200 font-bold block">Hard Rule Enforcement</span>
                  <span className="text-[10px] text-slate-400">Strictly flags trade score if breached</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRuleIsHard(!ruleIsHard)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    ruleIsHard ? 'bg-rose-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      ruleIsHard ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-200 font-bold block">Rule Status (Active)</span>
                  <span className="text-[10px] text-slate-400">Defaults to active on creation</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRuleIsActive(!ruleIsActive)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    ruleIsActive ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      ruleIsActive ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="prime-btn-secondary px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="prime-btn-primary px-5 py-2 text-xs font-bold"
                >
                  {editingRuleId ? 'Save Changes' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
