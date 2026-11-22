import React from 'react';
import { GraduationCap } from 'lucide-react';

/** Plain-language setup guidance shown while creating an account. General education — each firm's own rulebook is the authority. */
interface Guide { title: string; points: string[] }
const GUIDES: Record<string, Guide> = {
  'Demo Account': { title: 'Demo account — your training ground', points: [
    'Use the balance and risk you would really trade. A $100,000 demo with $5,000 risk per trade teaches habits that do not survive real money.',
    'Risk 1% or less per trade, and write down your rules before the first trade.',
    'Graduate when your journal shows 30+ trades, a positive average result, rules followed on 80%+ of trades and no trade over 1% risk. The app tracks this for you.',
    'When you go live, start at 0.25% risk and climb the Fear Ladder in Mind Lab.' ] },
  'Personal Account': { title: 'Personal account — your own capital', points: [
    'Risk 0.5–1% per trade. At 1%, ten losses in a row costs about 10% — painful but survivable. At 5% it ends the account.',
    'Set a daily loss stop (about 2–3%) and a maximum number of trades per day. Hitting either means you are done for the day.',
    'Keep total open risk under about 3% and avoid taking two trades that are really the same bet (the Pre-Trade Checklist checks this).',
    'On a small account, the minimum lot size can force more than 1% risk — then trade a smaller stop or skip the set-up.' ] },
  'Cent Account': { title: 'Cent account — low-cost practice with real fills', points: [
    'Ideal for learning execution with real spreads and emotions at tiny dollar risk.',
    'Still use percentage risk (1% or less) — the habit matters more than the amount.',
    'Do not scale the lot size up just because each loss "looks small". Judge by percent.' ] },
  'Funded Account': { title: 'Funded account — read these rules before you trade', points: [
    'Most challenges have a profit target (about 8–10% in Phase 1, 4–5% in Phase 2), a daily loss limit (about 3–5%), a maximum loss (about 10%) and often a minimum number of trading days (commonly 4).',
    'Breaching the daily or maximum loss by even a cent usually fails the challenge instantly — so the real job is survival, not profit.',
    'Check whether the maximum loss is static (fixed floor) or trailing (the floor rises as you profit), and whether the daily limit counts floating loss (equity) or only closed trades (balance).',
    'Risk 0.25–0.5% per trade during an evaluation. At 0.5%, a 10% target needs about 20 net winners of 1R — there is no prize for hurrying.',
    'Check the firm\'s extra rules: news-trading limits, weekend holding, best-day/consistency rules and the daily reset time.',
    'Pick a preset below, then confirm every number against your firm\'s official rules — they change.' ] },
};
GUIDES['Prop Firm Challenge'] = GUIDES['Funded Account'];
GUIDES['Live Funded Account'] = { title: 'Live funded account — protect what you earned', points: [
  'There is usually no profit target now — your edge is staying inside the loss limits and getting paid.',
  'Risk less than you did in the challenge (0.25–0.5%). One bad day should never threaten the account.',
  'Know your firm\'s payout rules (minimum days, consistency or best-day rules) and trade to satisfy them.',
  'Keep a personal stop well inside the firm\'s limit — for example stop for the day at half the firm\'s daily loss.' ] };

export const AccountGuide: React.FC<{ accountType: string }> = ({ accountType }) => {
  const g = GUIDES[accountType];
  if (!g) return null;
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-1.5" data-testid="account-guide">
      <div className="flex items-center gap-2 text-[12px] font-black text-cyan-300 uppercase tracking-wide"><GraduationCap className="w-4 h-4" />{g.title}</div>
      <ul className="space-y-1">{g.points.map((p, i) => <li key={i} className="text-[12px] text-slate-300 leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-cyan-400">{p}</li>)}</ul>
      <div className="text-[10px] text-slate-600">General education, not financial advice.</div>
    </div>
  );
};
