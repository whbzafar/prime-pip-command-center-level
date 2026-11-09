/**
 * ACCOUNT COMMAND CENTER — the top of the main dashboard.
 *
 * Adapts to the account chosen at setup:
 *  - Funded / prop evaluation: phase, profit target progress, daily + overall drawdown buffers,
 *    minimum trading days, and the exact risk for the NEXT trade so the evaluation is passed
 *    without breaking a rule.
 *  - Demo: practice under prop-firm style rules, with the same per-trade risk coaching.
 *  - Personal: capital-preservation view with per-trade risk guidance.
 */
import React, { useMemo } from 'react';
import { Activity, ArrowRight, CalendarCheck, Crosshair, Flag, Gauge, Repeat, Shield, ShieldAlert, ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import type { AccountSettings, Trade, UserAccount } from '../../types';
import { evaluateFundedAccountRisk, isFundedAccount } from '../../utils/fundedRiskEngine';
import { formatCurrency } from '../../utils/currencyFormatter';

interface Props {
  account: AccountSettings | null;
  trades: Trade[];
  currentUser?: UserAccount | null;
  onOpenNewTrade: () => void;
  onOpenAccountModal?: () => void;
  onNavigateToTab: (tab: string) => void;
}

type Kind = 'FUNDED' | 'DEMO' | 'PERSONAL';
const kindOf = (a: AccountSettings): Kind => {
  if (isFundedAccount(a)) return 'FUNDED';
  const t = `${a.accountType || ''} ${a.accountCategory || ''} ${a.accountKind || ''}`.toUpperCase();
  if (a.isDemo || t.includes('DEMO')) return 'DEMO';
  return 'PERSONAL';
};
const n = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v: number) => Math.max(0, Math.min(100, v));

const Bar: React.FC<{ value: number; tone: 'cyan' | 'emerald' | 'amber' | 'rose' }> = ({ value, tone }) => {
  const g = { cyan: 'from-cyan-400 to-blue-500', emerald: 'from-emerald-400 to-teal-500', amber: 'from-amber-400 to-orange-500', rose: 'from-rose-500 to-red-500' }[tone];
  return <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${g} transition-all duration-700`} style={{ width: `${clamp(value)}%` }} /></div>;
};

const Meter: React.FC<{ icon: React.ReactNode; label: string; value: string; sub: string; pct: number; tone: 'cyan' | 'emerald' | 'amber' | 'rose' }> = ({ icon, label, value, sub, pct, tone }) => (
  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">{icon}{label}</div>
    <div className="mt-1 flex items-baseline justify-between gap-2"><span className="text-[15px] font-bold text-slate-50 font-mono-code">{value}</span><span className="text-[10.5px] text-slate-400 text-right">{sub}</span></div>
    <div className="mt-2"><Bar value={pct} tone={tone} /></div>
  </div>
);

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = 'text-slate-50' }) => (
  <div className="min-w-0">
    <div className="text-[9.5px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
    <div className={`text-[16px] sm:text-[18px] font-bold font-mono-code truncate ${tone}`}>{value}</div>
  </div>
);

export const AccountCommandCenter: React.FC<Props> = ({ account, trades, onOpenNewTrade, onOpenAccountModal, onNavigateToTab }) => {
  const view = useMemo(() => {
    if (!account) return null;
    const kind = kindOf(account);
    const ccy = account.currency || 'USD';
    const accTrades = trades.filter((t: any) => !t.accountId || t.accountId === account.id);
    const closed = accTrades.filter((t) => t.status !== 'OPEN');
    const wins = closed.filter((t) => n(t.profitLoss) > 0).length;
    const winRate = closed.length ? (wins / closed.length) * 100 : 0;
    const days = new Set(closed.map((t) => t.date)).size;
    const start = n(account.initialBalance, 0) || n(account.fundedConfig?.startingBalance, 0) || 0;
    const balance = n(account.currentBalance, start);
    const pnl = balance - start;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
    const todayPnl = closed.filter((t) => t.date === today).reduce((s, t) => s + n(t.profitLoss), 0);
    let lossStreak = 0;
    for (const t of [...closed].reverse()) { if (n(t.profitLoss) < 0) lossStreak++; else break; }

    if (kind === 'FUNDED') {
      const e = evaluateFundedAccountRisk(account, accTrades);
      const minDays = n(e.config.minimumTradingDays, 0);
      const riskD = n(e.recommendedRiskDollars);
      const winsNeeded = riskD > 0 ? Math.max(0, Math.ceil(e.remainingProfitTarget / (riskD * 2))) : 0;
      const guidance: string[] = [];
      if (e.isDailyDrawdownBreached || e.isOverallDrawdownBreached) guidance.push('A drawdown limit is breached — stop trading this account and review the rules with your firm.');
      else {
        guidance.push(riskD > 0 ? `Risk ${formatCurrency(riskD, ccy)} (${n(e.recommendedRiskPercent).toFixed(2)}%) on the next trade — never more than ${formatCurrency(n(e.hardCeilingRiskDollars || e.maxRiskPerTradeDollars), ccy)}.` : 'No risk available today — the daily buffer is used up. Stop for today.');
        if (!e.isTargetPassed) guidance.push(`${formatCurrency(e.remainingProfitTarget, ccy)} left to the ${e.phaseLabel} target ≈ ${winsNeeded} winning trade${winsNeeded === 1 ? '' : 's'} at 1:2 with that risk.`);
        else guidance.push(minDays > days ? `Target reached — complete ${minDays - days} more trading day(s) with tiny risk to satisfy the minimum days.` : 'Target reached — stop trading and request the next phase / payout.');
        guidance.push(`Daily buffer ${formatCurrency(e.remainingDailyDrawdown, ccy)} left — stop for the day after ${Math.max(1, Math.min(2, n(e.tradesToDailyBreachAtRecommended, 2) - 1))} loss(es) or if the buffer drops below 2× your risk.`);
        if (lossStreak >= 2) guidance.push(`${lossStreak} losses in a row — halve the risk on the next trade and only take A+ setups.`);
        if (e.config.newsRestriction) guidance.push('High-impact news is restricted — no trades 5 minutes either side of red-folder events.');
        if (e.config.weekendHoldingRestriction || e.config.overnightHoldingRestriction) guidance.push('Close positions before the weekend (and overnight if required by the firm).');
      }
      return {
        kind, ccy, title: e.accountName || account.accountName, badge: e.phaseLabel, firm: e.firmName, balance, pnl, todayPnl, winRate, trades: closed.length,
        verdict: e.verdictBadge, verdictTone: e.verdictColor, risk: riskD, riskPct: n(e.recommendedRiskPercent), limiting: e.limitingFactor,
        meters: [
          { icon: <Target className="w-3 h-3" />, label: `${e.phaseLabel} target`, value: `${clamp(e.profitProgressPercent).toFixed(0)}%`, sub: e.isTargetPassed ? 'Target reached' : `${formatCurrency(e.remainingProfitTarget, ccy)} to go of ${formatCurrency(e.activeProfitTargetDollars, ccy)}`, pct: e.profitProgressPercent, tone: 'emerald' as const },
          { icon: <ShieldAlert className="w-3 h-3" />, label: 'Daily loss used', value: `${clamp(e.dailyDrawdownUsedPercent).toFixed(0)}%`, sub: `${formatCurrency(e.remainingDailyDrawdown, ccy)} left of ${formatCurrency(e.dailyDrawdownLimitDollars, ccy)}`, pct: e.dailyDrawdownUsedPercent, tone: e.dailyDrawdownUsedPercent > 60 ? 'rose' as const : e.dailyDrawdownUsedPercent > 30 ? 'amber' as const : 'cyan' as const },
          { icon: <Shield className="w-3 h-3" />, label: `Max loss used${e.isTrailing ? ' (trailing)' : ''}`, value: `${clamp(e.overallDrawdownUsedPercent).toFixed(0)}%`, sub: `${formatCurrency(e.remainingOverallDrawdown, ccy)} left of ${formatCurrency(e.overallDrawdownLimitDollars, ccy)}`, pct: e.overallDrawdownUsedPercent, tone: e.overallDrawdownUsedPercent > 60 ? 'rose' as const : e.overallDrawdownUsedPercent > 30 ? 'amber' as const : 'cyan' as const },
          { icon: <CalendarCheck className="w-3 h-3" />, label: 'Trading days', value: minDays ? `${days}/${minDays}` : `${days}`, sub: minDays ? (days >= minDays ? 'Minimum met' : `${minDays - days} more required`) : 'No minimum', pct: minDays ? (days / minDays) * 100 : 100, tone: 'cyan' as const },
        ],
        guidance,
      };
    }

    // DEMO / PERSONAL — practise (or protect capital) with prop-firm style rules.
    const dailyLossPct = n(account.maxDailyLossPercent || account.dailyMaxLossPercent, 5) || 5;
    const maxDdPct = n(account.maxDrawdownPercent, 10) || 10;
    const riskPctSetting = n(account.targetRiskPerTradePercent || account.maxRiskPerTradePercent, 1) || 1;
    const targetPct = kind === 'DEMO' ? 8 : 0;
    const dailyLimit = (start * dailyLossPct) / 100;
    const dailyUsed = Math.max(0, -todayPnl);
    const ddLimit = (start * maxDdPct) / 100;
    const ddUsed = Math.max(0, start - balance);
    const baseRiskPct = Math.min(riskPctSetting, kind === 'DEMO' ? 1 : riskPctSetting);
    const riskPct = lossStreak >= 2 ? baseRiskPct / 2 : baseRiskPct;
    const riskRoomDaily = Math.max(0, dailyLimit - dailyUsed);
    const risk = Math.min((balance * riskPct) / 100, riskRoomDaily / 2);
    const target = (start * targetPct) / 100;
    const guidance: string[] = [
      risk > 0 ? `Risk ${formatCurrency(risk, ccy)} (${((risk / Math.max(1, balance)) * 100).toFixed(2)}%) on the next trade${lossStreak >= 2 ? ' — halved after a losing streak' : ''}.` : 'Daily loss limit reached — stop for today.',
      kind === 'DEMO' ? `Practise exactly as in a challenge: ${dailyLossPct}% daily loss, ${maxDdPct}% max loss, ${targetPct}% target. Demo results only count if the rules are respected.` : `Protect capital first: stop for the day at −${dailyLossPct}% and cut risk in half after a ${Math.round(maxDdPct / 2)}% drawdown.`,
      'Only take setups with at least 1:2 reward-to-risk, and set the stop before entering.',
      winRate && closed.length >= 10 ? `Your win rate is ${winRate.toFixed(0)}% over ${closed.length} trades — ${winRate >= 40 ? 'consistent enough to keep 1:2 targets.' : 'below 40%: tighten entries before increasing risk.'}` : 'Log at least 20 trades to get a reliable win rate and expectancy.',
    ];
    return {
      kind, ccy, title: account.accountName, badge: kind === 'DEMO' ? 'Demo · practice' : 'Personal', firm: account.broker, balance, pnl, todayPnl, winRate, trades: closed.length,
      verdict: risk > 0 ? (lossStreak >= 2 ? 'Reduce risk' : 'Clear to trade') : 'Stop for today', verdictTone: risk > 0 ? (lossStreak >= 2 ? 'AMBER' : 'EMERALD') : 'ROSE', risk, riskPct: (risk / Math.max(1, balance)) * 100,
      limiting: risk < (balance * riskPct) / 100 ? 'Daily loss buffer' : `Risk setting ${riskPct.toFixed(2)}%`,
      meters: [
        ...(kind === 'DEMO' ? [{ icon: <Target className="w-3 h-3" />, label: 'Practice target (8%)', value: `${clamp(target > 0 ? (pnl / target) * 100 : 0).toFixed(0)}%`, sub: pnl >= target ? 'Target reached' : `${formatCurrency(Math.max(0, target - pnl), ccy)} to go`, pct: target > 0 ? (pnl / target) * 100 : 0, tone: 'emerald' as const }] : [{ icon: <TrendingUp className="w-3 h-3" />, label: 'Account growth', value: `${start > 0 ? ((pnl / start) * 100).toFixed(2) : '0.00'}%`, sub: `${formatCurrency(pnl, ccy)} since start`, pct: start > 0 ? Math.abs((pnl / start) * 100) * 5 : 0, tone: pnl >= 0 ? 'emerald' as const : 'rose' as const }]),
        { icon: <ShieldAlert className="w-3 h-3" />, label: `Daily loss (${dailyLossPct}%)`, value: `${clamp(dailyLimit ? (dailyUsed / dailyLimit) * 100 : 0).toFixed(0)}%`, sub: `${formatCurrency(riskRoomDaily, ccy)} left today`, pct: dailyLimit ? (dailyUsed / dailyLimit) * 100 : 0, tone: dailyUsed / Math.max(1, dailyLimit) > 0.6 ? 'rose' as const : 'cyan' as const },
        { icon: <Shield className="w-3 h-3" />, label: `Max loss (${maxDdPct}%)`, value: `${clamp(ddLimit ? (ddUsed / ddLimit) * 100 : 0).toFixed(0)}%`, sub: `${formatCurrency(Math.max(0, ddLimit - ddUsed), ccy)} left`, pct: ddLimit ? (ddUsed / ddLimit) * 100 : 0, tone: ddUsed / Math.max(1, ddLimit) > 0.6 ? 'rose' as const : 'cyan' as const },
        { icon: <Activity className="w-3 h-3" />, label: 'Win rate', value: `${winRate.toFixed(0)}%`, sub: `${closed.length} closed trades`, pct: winRate, tone: winRate >= 50 ? 'emerald' as const : winRate >= 35 ? 'amber' as const : 'rose' as const },
      ],
      guidance,
    };
  }, [account, trades]);

  if (!account || !view) {
    return (
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-violet-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Sparkles className="w-6 h-6 text-cyan-300" />
        <div className="flex-1"><div className="text-[15px] font-bold text-slate-50">Set up your trading account</div><div className="text-[12px] text-slate-400">Choose Demo, Funded (prop firm) or Personal — the dashboard then tracks your rules and coaches the risk on every trade.</div></div>
        {onOpenAccountModal && <button type="button" onClick={onOpenAccountModal} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold text-[12.5px] cursor-pointer">Set up account</button>}
      </div>
    );
  }

  const tone = { EMERALD: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200', AMBER: 'border-amber-400/50 bg-amber-500/15 text-amber-200', ROSE: 'border-rose-400/50 bg-rose-500/15 text-rose-200', CYAN: 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200' }[view.verdictTone as 'EMERALD'] || 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200';
  const kindBadge = view.kind === 'FUNDED' ? 'from-amber-300 to-orange-500' : view.kind === 'DEMO' ? 'from-cyan-300 to-blue-500' : 'from-violet-300 to-fuchsia-500';

  return (
    <section className="relative rounded-[22px] p-[1px] bg-gradient-to-br from-amber-400/40 via-cyan-500/25 to-violet-500/40 shadow-[0_20px_60px_-20px_rgba(34,211,238,0.25)]">
      <div className="rounded-[21px] bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.10),transparent_55%)] bg-[#070b14] p-4 sm:p-5">
        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${kindBadge} flex items-center justify-center text-slate-950 shadow-lg shrink-0`}>
              {view.kind === 'FUNDED' ? <Trophy className="w-5 h-5" /> : view.kind === 'DEMO' ? <Gauge className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16px] sm:text-[18px] font-extrabold text-slate-50 truncate">{view.title}</h2>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r ${kindBadge} text-slate-950`}>{view.badge}</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">{view.kind === 'FUNDED' ? `${view.firm} evaluation · rules tracked live` : view.kind === 'DEMO' ? 'Demo account · practise under prop-firm rules' : `${view.firm || 'Personal account'} · capital protection`}</div>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${tone}`}>{view.verdict}</span>
            {onOpenAccountModal && <button type="button" onClick={onOpenAccountModal} className="inline-flex items-center gap-1 text-[11.5px] px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 cursor-pointer"><Repeat className="w-3.5 h-3.5" />Switch</button>}
            <button type="button" onClick={onOpenNewTrade} className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.35)]"><Crosshair className="w-3.5 h-3.5" />New trade</button>
          </div>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-3.5">
          <Stat label="Balance" value={formatCurrency(view.balance, view.ccy)} />
          <Stat label="Total P&L" value={`${view.pnl >= 0 ? '+' : ''}${formatCurrency(view.pnl, view.ccy)}`} tone={view.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
          <Stat label="Today" value={`${view.todayPnl >= 0 ? '+' : ''}${formatCurrency(view.todayPnl, view.ccy)}`} tone={view.todayPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
          <Stat label="Win rate" value={`${view.winRate.toFixed(0)}% · ${view.trades}`} />
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-3">
          {/* meters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {view.meters.map((m) => <Meter key={m.label} {...m} />)}
          </div>
          {/* next trade coach */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/[0.08] to-slate-950/60 p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-cyan-300"><Flag className="w-3 h-3" />Next trade · risk coach</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold font-mono-code text-slate-50">{formatCurrency(view.risk, view.ccy)}</span>
              <span className="text-[12px] text-cyan-200 font-mono-code">{view.riskPct.toFixed(2)}%</span>
            </div>
            <div className="text-[10.5px] text-slate-500">Max risk for the next trade · limited by {view.limiting}</div>
            <ul className="mt-2.5 space-y-1.5">
              {view.guidance.slice(0, 5).map((g) => (
                <li key={g} className="flex gap-1.5 text-[11.5px] leading-snug text-slate-300"><ArrowRight className="w-3 h-3 mt-0.5 text-cyan-400 shrink-0" /><span>{g}</span></li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onNavigateToTab('LOT_SIZE')} className="text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer">Lot size</button>
              <button type="button" onClick={() => onNavigateToTab('RISK')} className="text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer">Risk plan</button>
            </div>
          </div>
        </div>
        {view.pnl < 0 && <div className="mt-2 text-[10.5px] text-slate-500 flex items-center gap-1"><TrendingDown className="w-3 h-3" />Below the starting balance — trade smaller until you are back above it.</div>}
      </div>
    </section>
  );
};

export default AccountCommandCenter;
