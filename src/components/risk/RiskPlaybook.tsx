/**
 * VIP RISK PLAYBOOK — replaces the old instant position-size calculator (the Lot Size
 * Calculator has its own section). Three parts:
 *  1. Risk ladder: today's allowed risk per trade from drawdown + losing streak.
 *  2. Survival maths: losses that fit before the daily / max limits, and how likely losing
 *     streaks are at the trader's real win rate.
 *  3. Complete guides: every rule a funded / professional trader follows, explained.
 */
import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Layers, ShieldCheck, TrendingDown, Zap } from 'lucide-react';
import { formatCurrency } from '../../utils/currencyFormatter';

interface Props {
  balance: number;
  currency: string;
  baseRiskPct: number;
  dailyLossPct: number;
  maxDrawdownPct: number;
  currentDrawdownPct: number;
  todayLoss: number;
  lossStreak: number;
  winRatePct: number;
  onOpenLotSize?: () => void;
}

/** Probability of at least one run of `k` consecutive losses in `n` trades (loss prob q). */
function streakProb(n: number, k: number, q: number): number {
  if (k <= 0) return 1;
  // dp[j] = probability of ending with exactly j consecutive losses and no run of k yet
  let dp = new Array(k).fill(0); dp[0] = 1;
  let hit = 0;
  for (let i = 0; i < n; i++) {
    const nx = new Array(k).fill(0);
    for (let j = 0; j < k; j++) {
      if (!dp[j]) continue;
      nx[0] += dp[j] * (1 - q);
      if (j + 1 >= k) hit += dp[j] * q; else nx[j + 1] += dp[j] * q;
    }
    dp = nx;
  }
  return Math.min(1, hit);
}

const GUIDES: { title: string; points: string[] }[] = [
  { title: '1. Risk per trade — the 0.5–1% rule', points: [
    'Risk is the money lost if the stop is hit — not the lot size. Decide the stop first, then size the position so the loss equals your risk.',
    'Evaluations and funded accounts: 0.5% is the professional default; never above 1%. Personal accounts: 1% maximum until 100+ trades prove a positive expectancy.',
    'Formula: lots = risk money ÷ (stop distance in pips × pip value per lot). Use the Lot Size Calculator — never estimate.',
    'Never move a stop further away to "give it room". A wider stop means a smaller lot, decided before entry.',
  ] },
  { title: '2. Daily loss limit & stop-trading triggers', points: [
    'Stop for the day when either is hit: the daily loss limit (prop firms usually 4–5%; set your personal stop at half of it) or 2 losing trades in a row.',
    'Leave a buffer: never let one trade risk more than half of the daily loss still available.',
    'After the stop: close the platform and journal the trades. The next session starts fresh — no "making it back".',
  ] },
  { title: '3. Drawdown ladder — cut risk as equity falls', points: [
    'Drawdown 0–2%: normal risk. 2–4%: 75% of normal. 4–6%: half risk. Above 6% (or 60% of the max loss used): quarter risk, A+ setups only.',
    'Raise risk again only after recovering half of the drawdown — in small steps of 0.25%.',
    'Losses are asymmetric: −10% needs +11.1%, −20% needs +25%, −50% needs +100%. Small losses are the cheapest to recover.',
  ] },
  { title: '4. Passing a prop-firm evaluation', points: [
    'Phase 1 (typically 8–10% target, 5% daily, 10% max loss): risk 0.5%, aim for 1:2 or better — 8% is about 8 winning trades with normal losses in between.',
    'Phase 2 (typically 5% target): same risk; it is a consistency test, not a race. Many traders fail Phase 2 by increasing risk.',
    'Funded: protect the account first — 0.25–0.5% risk, no trading on high-impact news, close before the weekend if the rules require it.',
    'Check the firm\'s exact rules: trailing vs static drawdown, balance- vs equity-based daily loss, minimum trading days, consistency rules, news and weekend restrictions.',
  ] },
  { title: '5. Correlation & total exposure', points: [
    'EUR/USD, GBP/USD and AUD/USD often move together: three trades = roughly three times the risk on one idea. Count correlated trades as one position.',
    'Keep total open risk at or below 2% of the balance across all trades (1% on evaluations).',
    'Gold, the dollar index and US yields are linked — a USD news shock hits all of them at once.',
  ] },
  { title: '6. News, spreads & weekends', points: [
    'Avoid entries 15 minutes before and after red-folder events (NFP, CPI, rate decisions) — spreads widen and stops slip.',
    'Check the Live News Calendar every morning; the Breaking News tab flags wars, sanctions and central-bank surprises as HIGH impact.',
    'Weekend gaps can jump straight through stops. Close or reduce positions on Friday unless the plan explicitly holds them.',
  ] },
  { title: '7. Reward-to-risk & expectancy', points: [
    'Expectancy per trade (in R) = win rate × average win (R) − loss rate × 1R. At 1:2, a 40% win rate makes +0.2R per trade; at 1:1 you need above 50% just to break even.',
    'Take partial profits at 1R only if the plan says so — then move the stop to breakeven.',
    'Track R, not money. A good month is measured in R and in rules followed.',
  ] },
  { title: '8. The pre-trade checklist', points: [
    'Setup matches a written model (SBT or your plan) on the higher timeframe bias.',
    'Stop and target defined, R:R ≥ 1:2, lot size from the calculator, risk within today\'s ladder value.',
    'No red-folder news within 15 minutes; total exposure ≤ 2%; not after 2 consecutive losses; emotional state calm.',
  ] },
];

export const RiskPlaybook: React.FC<Props> = ({ balance, currency, baseRiskPct, dailyLossPct, maxDrawdownPct, currentDrawdownPct, todayLoss, lossStreak, winRatePct, onOpenLotSize }) => {
  const [openGuide, setOpenGuide] = useState<number | null>(0);
  const ladder = useMemo(() => {
    const ddUsedShare = maxDrawdownPct > 0 ? currentDrawdownPct / maxDrawdownPct : 0;
    let factor = 1; let reason = 'Normal conditions';
    if (currentDrawdownPct >= 6 || ddUsedShare >= 0.6) { factor = 0.25; reason = `Drawdown ${currentDrawdownPct.toFixed(1)}% — quarter risk, A+ setups only`; }
    else if (currentDrawdownPct >= 4) { factor = 0.5; reason = `Drawdown ${currentDrawdownPct.toFixed(1)}% — half risk`; }
    else if (currentDrawdownPct >= 2) { factor = 0.75; reason = `Drawdown ${currentDrawdownPct.toFixed(1)}% — 75% risk`; }
    if (lossStreak >= 2) { factor = Math.min(factor, 0.5); reason = `${lossStreak} losses in a row — half risk (stop for today if this is today)`; }
    const dailyLimit = (balance * dailyLossPct) / 100;
    const dailyLeft = Math.max(0, dailyLimit - todayLoss);
    let riskPct = baseRiskPct * factor;
    let money = (balance * riskPct) / 100;
    if (money > dailyLeft / 2) { money = dailyLeft / 2; riskPct = balance > 0 ? (money / balance) * 100 : 0; reason = dailyLeft <= 0 ? 'Daily loss limit reached — stop for today' : 'Capped at half of the daily loss still available'; }
    const ddLeftMoney = Math.max(0, (balance * (maxDrawdownPct - currentDrawdownPct)) / 100);
    return { riskPct, money, reason, dailyLeft, dailyLimit, ddLeftMoney,
      lossesToDaily: money > 0 ? Math.floor(dailyLeft / money) : 0,
      lossesToMax: money > 0 ? Math.floor(ddLeftMoney / money) : 0 };
  }, [balance, baseRiskPct, dailyLossPct, maxDrawdownPct, currentDrawdownPct, todayLoss, lossStreak]);

  const q = 1 - Math.min(0.95, Math.max(0.05, (winRatePct || 45) / 100));
  const streaks = [3, 4, 5, 6, 8, 10].map((k) => ({ k, p: streakProb(100, k, q) }));

  return (
    <section className="space-y-4">
      {/* 1. Risk ladder */}
      <div className="rounded-2xl p-[1px] bg-gradient-to-br from-amber-400/40 via-cyan-500/25 to-violet-500/40">
        <div className="rounded-[15px] bg-[#070b14] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-amber-300"><Layers className="w-4 h-4" />Risk ladder · your allowed risk right now</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 items-center">
            <div>
              <div className="flex items-baseline gap-2"><span className="text-[34px] font-extrabold font-mono-code text-slate-50">{formatCurrency(ladder.money, currency)}</span><span className="text-[15px] font-mono-code text-cyan-300">{ladder.riskPct.toFixed(2)}%</span></div>
              <div className="text-[12px] text-slate-400">{ladder.reason}</div>
              {onOpenLotSize && <button type="button" onClick={onOpenLotSize} className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-[12px] font-bold cursor-pointer"><Zap className="w-3.5 h-3.5" />Size this risk in the Lot Size Calculator</button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Daily loss left', `${formatCurrency(ladder.dailyLeft, currency)} of ${formatCurrency(ladder.dailyLimit, currency)}`],
                ['Losses before daily stop', `${ladder.lossesToDaily}`],
                ['Room to max loss', formatCurrency(ladder.ddLeftMoney, currency)],
                ['Losses before max loss', `${ladder.lossesToMax}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"><div className="text-[9.5px] uppercase tracking-wider text-slate-500">{k}</div><div className="text-[14px] font-bold font-mono-code text-slate-100">{v}</div></div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10.5px] font-mono-code">
            {[['DD 0–2%', '100%'], ['DD 2–4%', '75%'], ['DD 4–6%', '50%'], ['DD > 6% / 2 losses', '25–50%']].map(([a, b]) => (
              <div key={a} className="rounded-lg border border-slate-800 bg-slate-900/50 px-2 py-1 flex justify-between"><span className="text-slate-400">{a}</span><span className="text-slate-100 font-bold">{b}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Survival maths */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-cyan-300"><TrendingDown className="w-4 h-4" />Losing streaks are normal · chance in the next 100 trades at a {(100 - q * 100).toFixed(0)}% win rate</div>
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {streaks.map(({ k, p }) => (
            <div key={k} className="rounded-xl border border-slate-800 bg-slate-900/50 px-2 py-2 text-center">
              <div className="text-[10px] text-slate-500">{k} losses in a row</div>
              <div className={`text-[16px] font-bold font-mono-code ${p > 0.5 ? 'text-rose-300' : p > 0.2 ? 'text-amber-300' : 'text-emerald-300'}`}>{(p * 100).toFixed(0)}%</div>
              <div className="text-[9.5px] text-slate-500">−{(k * ladder.riskPct).toFixed(1)}% equity</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Size risk so the streak you are likely to see (red/amber) costs less than the daily and max loss limits. That is why evaluations are passed at 0.5% risk, not 2%.</p>
      </div>

      {/* 3. Guides */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-violet-300"><BookOpen className="w-4 h-4" />Complete risk guides</div>
        <div className="mt-3 space-y-2">
          {GUIDES.map((g, i) => (
            <div key={g.title} className={`rounded-xl border ${openGuide === i ? 'border-violet-500/40 bg-violet-500/[0.05]' : 'border-slate-800 bg-slate-900/40'}`}>
              <button type="button" onClick={() => setOpenGuide(openGuide === i ? null : i)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer">
                <ShieldCheck className="w-4 h-4 text-violet-300 shrink-0" />
                <span className="text-[13px] font-semibold text-slate-100 flex-1">{g.title}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition ${openGuide === i ? 'rotate-180' : ''}`} />
              </button>
              {openGuide === i && (
                <ul className="px-4 pb-3 space-y-1.5">
                  {g.points.map((p) => <li key={p} className="text-[12.5px] leading-relaxed text-slate-300 flex gap-2"><span className="text-violet-400">•</span><span>{p}</span></li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RiskPlaybook;
