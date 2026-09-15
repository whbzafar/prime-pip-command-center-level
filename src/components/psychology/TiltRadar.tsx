import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Flame,
  Zap,
  CheckCircle2,
  ShieldCheck,
  TrendingDown,
  Activity,
  Award,
  AlertOctagon,
  ArrowRight,
  Compass,
  HeartPulse,
} from 'lucide-react';
import { Trade, AccountSettings, UserAccount, TiltLevel } from '../../types';
import { getKarachiDate } from '../../utils/time';

interface TiltRadarProps {
  trades: Trade[];
  account?: AccountSettings;
  currentUser?: UserAccount | null;
  onEnterRecoveryMode?: () => void;
  onOpenCBT?: () => void;
  onOpenACT?: () => void;
}

export const TiltRadar: React.FC<TiltRadarProps> = ({
  trades = [],
  account,
  currentUser,
  onEnterRecoveryMode,
  onOpenCBT,
  onOpenACT,
}) => {
  const userId = currentUser?.id || currentUser?.username || 'guest';
  const cooldownKey = `primepipfx_cooldown_end_${userId}`;

  // Cool-down timer state
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(cooldownKey);
      if (saved) {
        const remaining = Math.floor((Number(saved) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  });

  const [cooldownActive, setCooldownActive] = useState<boolean>(cooldownRemaining > 0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (cooldownActive && cooldownRemaining > 0) {
      timer = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            setCooldownActive(false);
            try {
              localStorage.removeItem(cooldownKey);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownActive, cooldownRemaining, cooldownKey]);

  const startCooldown = (minutes: number = 30) => {
    const totalSeconds = minutes * 60;
    const endTime = Date.now() + totalSeconds * 1000;
    try {
      localStorage.setItem(cooldownKey, endTime.toString());
    } catch {}
    setCooldownRemaining(totalSeconds);
    setCooldownActive(true);
  };

  const cancelCooldown = () => {
    try {
      localStorage.removeItem(cooldownKey);
    } catch {}
    setCooldownRemaining(0);
    setCooldownActive(false);
  };

  // 1. Consecutive Loss Detection (last 2 closed trades)
  const closedTrades = [...trades]
    .filter((t) => t.status !== 'OPEN')
    .sort((a, b) => b.timestamp - a.timestamp);

  const last2Trades = closedTrades.slice(0, 2);
  const consecutiveLosses =
    last2Trades.length >= 2 && last2Trades.every((t) => (t.profitLoss || 0) < 0);

  // 2. Overtrading / High Frequency Detection (trades taken today)
  const todayStr = getKarachiDate();
  const tradesToday = trades.filter((t) => t.date === todayStr);
  const isOvertrading = tradesToday.length > (account?.maxDailyTrades || 2);

  // 3. Evaluate Tilt Level based on empirical metrics
  let currentTiltLevel: TiltLevel | 0 = 0;
  let tiltReason = 'No active tilt signs detected. Operational state is optimal.';

  if (tradesToday.length >= 4 || (last2Trades.length >= 2 && consecutiveLosses && tradesToday.length >= 3)) {
    currentTiltLevel = 3;
    tiltReason = 'Level 3 — Emotional Hijack: High daily trade frequency and consecutive losses indicating revenge trading or emotional impulsivity.';
  } else if (consecutiveLosses || tradesToday.length === 3) {
    currentTiltLevel = 2;
    tiltReason = 'Level 2 — Cognitive Degradation: 2 consecutive losses or daily trade limit exceeded. Decision-making quality is degraded.';
  } else if (tradesToday.length === 2 && tradesToday.some((t) => (t.profitLoss || 0) < 0)) {
    currentTiltLevel = 1;
    tiltReason = 'Level 1 — Subtle Cognitive Shifts: Frustration or restlessness emerging after session loss. Heightened vigilance required.';
  }

  // Streaks
  let winStreak = 0;
  for (const t of closedTrades) {
    if ((t.profitLoss || 0) > 0) winStreak++;
    else break;
  }

  let disciplineStreak = 0;
  for (const t of closedTrades) {
    const followedPlan = t.postPsychology?.followedPlan ?? true;
    const noEarlyExit = !(t.postPsychology?.closedEarly ?? false);
    const noMovedSL = !(t.postPsychology?.movedStopLoss ?? false);
    if (followedPlan && noEarlyExit && noMovedSL) {
      disciplineStreak++;
    } else {
      break;
    }
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-military font-bold text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              TRADING TILT SENTINEL & BEHAVIORAL FRAMEWORK
            </span>
            <span className="text-[10px] font-mono-code text-slate-400">
              USER: @{currentUser?.username || 'Trader'}
            </span>
          </div>
          <h3 className="text-base font-military font-bold text-slate-100 mt-1">
            Trading Tilt Assessment & Behavioral Degradation Guardrails
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Identify early cognitive degradation before it causes catastrophic account drawdown. <span className="text-amber-400/90 font-medium">Trading performance tool — not a medical diagnosis.</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentTiltLevel === 3 ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-mono-code font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1.5 animate-pulse">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>LEVEL 3: EMOTIONAL HIJACK</span>
            </span>
          ) : currentTiltLevel === 2 ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-mono-code font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>LEVEL 2: COGNITIVE DEGRADATION</span>
            </span>
          ) : currentTiltLevel === 1 ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-mono-code font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-yellow-400" />
              <span>LEVEL 1: SUBTLE COGNITIVE SHIFTS</span>
            </span>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-mono-code font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>RADAR CLEAR • DISCIPLINED</span>
            </span>
          )}
        </div>
      </div>

      {/* Tilt Status Warning & Recovery Action Prompts */}
      {currentTiltLevel > 0 && (
        <div
          className={`p-4 sm:p-5 rounded-xl border-2 space-y-3 ${
            currentTiltLevel === 3
              ? 'bg-rose-950/40 border-rose-500 text-rose-200'
              : currentTiltLevel === 2
              ? 'bg-amber-950/40 border-amber-500 text-amber-200'
              : 'bg-yellow-950/30 border-yellow-500/70 text-yellow-200'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-military font-bold text-sm uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{tiltReason}</span>
            </div>
            <span className="text-[11px] font-mono-code px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700">
              Immediate Recovery Protocol Recommended
            </span>
          </div>

          <p className="text-xs font-mono-code leading-relaxed">
            {currentTiltLevel === 3 &&
              'High probability of severe impulsive loss, revenge doubling, or blowing account risk limits. Halt all executions immediately.'}
            {currentTiltLevel === 2 &&
              'Cognitive bandwidth is impaired by recent losses or trade fatigue. Impulsive execution risk is elevated by over 70%.'}
            {currentTiltLevel === 1 &&
              'Early frustration or restlessness detected. Pause to reset before placing any subsequent order.'}
          </p>

          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {onEnterRecoveryMode && (
              <button
                type="button"
                onClick={onEnterRecoveryMode}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-military font-bold text-xs rounded-lg transition shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
              >
                <HeartPulse className="w-4 h-4" />
                <span>ENTER RECOVERY MODE NOW</span>
              </button>
            )}

            {!cooldownActive ? (
              <button
                type="button"
                onClick={() => startCooldown(currentTiltLevel === 3 ? 60 : 30)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-military font-bold text-xs rounded-lg border border-amber-500/40 transition cursor-pointer flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>START {currentTiltLevel === 3 ? '60-MIN' : '30-MIN'} COOL-DOWN LOCK</span>
              </button>
            ) : null}

            {onOpenCBT && (
              <button
                type="button"
                onClick={onOpenCBT}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code rounded-lg border border-slate-700 transition"
              >
                Open CBT Reframe Tool
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Cooldown Box */}
      {cooldownActive && (
        <div className="p-5 rounded-xl bg-slate-950 border border-amber-500/60 flex flex-wrap items-center justify-between shadow-2xl gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <span className="text-[10px] font-military font-bold text-amber-400 uppercase tracking-wider block">
                MANDATORY COOLING-OFF INTERVAL IN PROGRESS
              </span>
              <p className="text-xs text-slate-300 font-mono-code">
                Terminal locked for emotional neutralization. Do not look at 1-minute or 5-minute charts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-3xl font-mono-code font-extrabold text-amber-400 tracking-wider">
              {formatTimer(cooldownRemaining)}
            </div>
            <button
              onClick={cancelCooldown}
              className="px-2.5 py-1 text-[10px] font-mono-code text-slate-500 hover:text-slate-300 border border-slate-800 rounded transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* THE 3-TIER TRADING TILT FRAMEWORK CARDS */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono-code uppercase font-bold text-slate-400 tracking-wider block">
          THE 3-TIER TRADING TILT CLASSIFICATION ARCHITECTURE
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Level 1 */}
          <div
            className={`p-4 rounded-xl border transition ${
              currentTiltLevel === 1
                ? 'bg-yellow-950/20 border-yellow-500 ring-1 ring-yellow-500/50'
                : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-military font-bold text-yellow-400 uppercase">
                LEVEL 1 — SUBTLE SHIFTS
              </span>
              <span className="text-[10px] font-mono-code text-slate-500">Caution</span>
            </div>
            <div className="mt-2.5 space-y-2 text-xs font-mono-code">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">BEHAVIORAL SYMPTOMS:</span>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Checking P&L constantly, impatience before candle closes, slight hesitation on valid entries, mild FOMO.
                </p>
              </div>
              <div>
                <span className="text-[10px] text-yellow-400 uppercase font-bold block">RECOMMENDED ACTION:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  5 cycles of Box Breathing, hands off mouse, zoom out to 1H chart, review written playbook.
                </p>
              </div>
            </div>
          </div>

          {/* Level 2 */}
          <div
            className={`p-4 rounded-xl border transition ${
              currentTiltLevel === 2
                ? 'bg-amber-950/25 border-amber-500 ring-1 ring-amber-500/50'
                : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-military font-bold text-amber-400 uppercase">
                LEVEL 2 — COGNITIVE DEGRADATION
              </span>
              <span className="text-[10px] font-mono-code text-amber-500">Warning</span>
            </div>
            <div className="mt-2.5 space-y-2 text-xs font-mono-code">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">BEHAVIORAL SYMPTOMS:</span>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Taking unplanned setups, widening stop loss, moving stop to breakeven prematurely, 2 consecutive losses.
                </p>
              </div>
              <div>
                <span className="text-[10px] text-amber-400 uppercase font-bold block">RECOMMENDED ACTION:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Activate 30-minute cooling-off timer, complete CBT Thought Record, stand up and leave screen.
                </p>
              </div>
            </div>
          </div>

          {/* Level 3 */}
          <div
            className={`p-4 rounded-xl border transition ${
              currentTiltLevel === 3
                ? 'bg-rose-950/30 border-rose-500 ring-1 ring-rose-500/50'
                : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-military font-bold text-rose-400 uppercase">
                LEVEL 3 — EMOTIONAL HIJACK
              </span>
              <span className="text-[10px] font-mono-code text-rose-400">Critical</span>
            </div>
            <div className="mt-2.5 space-y-2 text-xs font-mono-code">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">BEHAVIORAL SYMPTOMS:</span>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Revenge trading, doubling lot size, ignoring 2-trades daily stop, trading out of pure anger or desperation.
                </p>
              </div>
              <div>
                <span className="text-[10px] text-rose-400 uppercase font-bold block">RECOMMENDED ACTION:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Mandatory Recovery Mode. Full terminal shutdown. Cease trading until tomorrow’s session.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streaks & Radar Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-code uppercase">
            <span>Trading Win Streak</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-mono-code font-bold text-slate-100">
            {winStreak} <span className="text-xs font-normal text-slate-400">Trades</span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            Consecutive profitable closed trades.
          </p>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-code uppercase">
            <span>Discipline Streak</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono-code font-bold text-emerald-400">
            {disciplineStreak} <span className="text-xs font-normal text-slate-400">Trades</span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            Trades strictly adhering to pre-trade plan without moving SL or early exit.
          </p>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-code uppercase">
            <span>Trades Today</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-mono-code font-bold text-slate-100">
            {tradesToday.length} <span className="text-xs font-normal text-slate-400">/ {account?.maxDailyTrades || 2} Max</span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            Session trade volume vs daily limit.
          </p>
        </div>
      </div>
    </div>
  );
};
