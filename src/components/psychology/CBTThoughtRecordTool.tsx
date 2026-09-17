import React, { useState, useEffect } from 'react';
import {
  Brain,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  BookmarkCheck,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { CBTThoughtRecord, UserAccount } from '../../types';
import { getKarachiDate, getKarachiLiveClock } from '../../utils/time';

interface CBTThoughtRecordToolProps {
  currentUser?: UserAccount | null;
}

const PRESET_SCENARIOS = [
  {
    title: 'Missing a Sudden Breakout (FOMO)',
    thought: 'The market is rocketing without me! If I don’t buy right now, I will miss the biggest move of the week!',
    evidenceFor: 'A large green momentum candle just printed on the 5-minute chart.',
    evidenceAgainst: 'The price is overextended into major daily resistance. There is no pullback confirmation. Buying here gives a terrible 1:0.5 risk-to-reward ratio and violates my playbook entry criteria.',
    reframe: 'Missing a move is not losing capital. Chasing an unconfirmed move has a 70% probability of stopping me out at the high. My edge lies in waiting for retracements to key confluence levels. There will always be another setup.',
    action: 'Close the 5-minute chart, zoom out to the 4-hour key level, and set an alert at my planned pullback zone. Step away from the screen for 10 minutes.',
  },
  {
    title: 'Two Consecutive Losses (Revenge Urge)',
    thought: 'I just lost two trades in a row. The market is hunting my stop loss. I need to take another trade immediately to get my money back before the session ends!',
    evidenceFor: 'I feel frustrated and down 2% on the account today.',
    evidenceAgainst: 'My trading rules explicitly state: MAXIMUM 2 TRADES PER DAY. Risking more violates my risk protocol. Losses are a normal mathematical distribution in an edge. Trading while angry always magnifies drawdown.',
    reframe: 'My job is not to win every single session, but to execute my rules with flawless discipline. A 2% daily loss is fully recoverable if I preserve my capital. Taking a 3rd trade guarantees an emotional tilt spiral.',
    action: 'Close MetaTrader/terminal for the day. Log the trades in the journal objectively. Initiate a 30-minute cooling-off period and do 5 cycles of Box Breathing.',
  },
  {
    title: 'Widening Stop Loss During Drawdown',
    thought: 'Price is 3 pips from my stop loss, but I know it’s just liquidity grabbing! If I move my stop loss down 20 pips, it will bounce back and I won’t take a loss.',
    evidenceFor: 'Price has bounced off this general zone in previous market sessions.',
    evidenceAgainst: 'If price hits my original stop loss, my thesis is mathematically invalid. Moving the stop turns a controlled 1% risk into an uncontrolled 3% to 5% loss. This is the #1 cause of catastrophic account blowups.',
    reframe: 'My stop loss is my guardian, not my enemy. Taking the 1% planned loss protects 99% of my capital to trade another day. I gladly accept the 1% loss as the cost of doing business.',
    action: 'Take my hands off the mouse. Allow the predetermined order to play out without interference. If stopped out, accept it with equanimity.',
  },
];

export const CBTThoughtRecordTool: React.FC<CBTThoughtRecordToolProps> = ({ currentUser }) => {
  const userId = currentUser?.id || currentUser?.username || 'guest';
  const storageKey = `primepipfx_cbt_${userId}`;

  const [records, setRecords] = useState<CBTThoughtRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [step, setStep] = useState<number>(1);
  const [automaticThought, setAutomaticThought] = useState('');
  const [evidenceFor, setEvidenceFor] = useState('');
  const [evidenceAgainst, setEvidenceAgainst] = useState('');
  const [balancedReframe, setBalancedReframe] = useState('');
  const [plannedAction, setPlannedAction] = useState('');
  const [emotionBefore, setEmotionBefore] = useState('ANXIOUS / FOMO');
  const [emotionAfter, setEmotionAfter] = useState('CALM / DISCIPLINED');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync with backend if logged in
  useEffect(() => {
    if (currentUser?.id) {
      fetch('/api/user/psychology')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && Array.isArray(data.cbtRecords)) {
            setRecords(data.cbtRecords);
            try {
              localStorage.setItem(storageKey, JSON.stringify(data.cbtRecords));
            } catch (e) {
              console.warn(e);
            }
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.id, storageKey]);

  const handleApplyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setAutomaticThought(preset.thought);
    setEvidenceFor(preset.evidenceFor);
    setEvidenceAgainst(preset.evidenceAgainst);
    setBalancedReframe(preset.reframe);
    setPlannedAction(preset.action);
    setStep(5);
  };

  const handleSaveRecord = async () => {
    if (!automaticThought.trim() || !balancedReframe.trim()) return;

    const clock = getKarachiLiveClock();
    const newRecord: CBTThoughtRecord = {
      id: `cbt-${Date.now()}`,
      userId,
      timestamp: Date.now(),
      date: getKarachiDate(),
      time: clock.time,
      automaticThought: automaticThought.trim(),
      evidenceFor: evidenceFor.trim(),
      evidenceAgainst: evidenceAgainst.trim(),
      balancedReframe: balancedReframe.trim(),
      plannedAction: plannedAction.trim() || 'Follow the planned rule and review in journal.',
      emotionBefore,
      emotionAfter,
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }

    // Persist to server
    try {
      await fetch('/api/user/psychology/cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record: newRecord }),
      });
    } catch (e) {
      console.warn('Server sync error', e);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      // Reset form
      setAutomaticThought('');
      setEvidenceFor('');
      setEvidenceAgainst('');
      setBalancedReframe('');
      setPlannedAction('');
      setStep(1);
    }, 2000);
  };

  const handleDelete = async (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informational Disclaimer Header */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-blue-500/10 text-cyan-400 border border-blue-500/30 font-bold">
              COGNITIVE BEHAVIORAL THERAPY FRAMEWORK
            </span>
            <span className="text-[10px] font-mono-code text-slate-400">
              USER: @{currentUser?.username || 'Trader'}
            </span>
          </div>
          <h3 className="text-base font-military font-bold text-slate-100 mt-1">
            Trading CBT Thought Record & Cognitive Reframe
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5 max-w-3xl">
            A structured behavioral tool to identify automatic emotional impulses, cross-examine evidence objectively,
            and construct a balanced trading reframe. <span className="text-cyan-400/90 font-medium">Performance enhancement exercise — not a medical diagnosis.</span>
          </p>
        </div>

        {/* Quick Presets Dropdown/Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono-code text-slate-400">Presets:</span>
          {PRESET_SCENARIOS.map((p, idx) => (
            <button
              key={p.title}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="text-[11px] font-mono-code px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700 transition"
              title={p.thought}
            >
              #{idx + 1} {p.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Guided 5-Step Wizard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-950/90 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
          {/* Step Progress Indicators */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            {[
              { num: 1, label: 'Automatic Thought' },
              { num: 2, label: 'Evidence For' },
              { num: 3, label: 'Evidence Against' },
              { num: 4, label: 'Balanced Reframe' },
              { num: 5, label: 'Planned Action' },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-1.5 text-xs font-mono-code transition ${
                  step === s.num
                    ? 'text-cyan-400 font-bold'
                    : step > s.num
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    step === s.num
                      ? 'bg-blue-500 text-slate-950 font-bold'
                      : step > s.num
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Wizard Body by Step */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 1: Automatic Thought (The Emotional Impulse)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  What exact thought popped into your mind when looking at the charts or after your trade?
                </p>
              </div>
              <textarea
                value={automaticThought}
                onChange={(e) => setAutomaticThought(e.target.value)}
                placeholder="e.g., The market is running away without me, I need to get in right now with market execution!"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">Capture the exact thought without judging it yet.</span>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!automaticThought.trim()}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-military text-xs font-bold transition"
                >
                  <span>NEXT: EVIDENCE FOR</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 2: Evidence FOR the Thought
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  What objective market facts support this thought? (Be purely factual, not emotional)
                </p>
              </div>
              <textarea
                value={evidenceFor}
                onChange={(e) => setEvidenceFor(e.target.value)}
                placeholder="e.g., A large green candle formed on the 5-minute chart with higher-than-average volume."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-mono-code text-slate-400 hover:text-slate-200"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military text-xs font-bold transition"
                >
                  <span>NEXT: EVIDENCE AGAINST</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 3: Evidence AGAINST the Thought
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  What objective facts or playbook rules contradict this thought?
                </p>
              </div>
              <textarea
                value={evidenceAgainst}
                onChange={(e) => setEvidenceAgainst(e.target.value)}
                placeholder="e.g., Price is approaching major 4H resistance. There is no pullback. Risk-to-reward is under 1:1. Chasing violates Rule #2 of my playbook."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-mono-code text-slate-400 hover:text-slate-200"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military text-xs font-bold transition"
                >
                  <span>NEXT: BALANCED REFRAME</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 4: Balanced Reframe (Objective Truth)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Synthesize both sides into a balanced, professional trader mindset.
                </p>
              </div>
              <textarea
                value={balancedReframe}
                onChange={(e) => setBalancedReframe(e.target.value)}
                placeholder="e.g., While the market moved quickly, entering without confirmation guarantees bad risk. Missing a trade preserves 100% of my capital. The next high-probability setup will arrive in due time."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-mono-code text-slate-400 hover:text-slate-200"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  disabled={!balancedReframe.trim()}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-military text-xs font-bold transition"
                >
                  <span>NEXT: PLANNED ACTION</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 5: Concrete Planned Action (Behavioral Commitment)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  What specific physical/behavioral action will you take right now?
                </p>
              </div>
              <textarea
                value={plannedAction}
                onChange={(e) => setPlannedAction(e.target.value)}
                placeholder="e.g., Step back from screens for 15 minutes, drink a glass of water, and wait for my predefined London session breakout alert."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Emotion Before:</span>
                  <input
                    type="text"
                    value={emotionBefore}
                    onChange={(e) => setEmotionBefore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono-code text-rose-400"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Emotion After Reframe:</span>
                  <input
                    type="text"
                    value={emotionAfter}
                    onChange={(e) => setEmotionAfter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono-code text-emerald-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-xs font-mono-code text-slate-400 hover:text-slate-200"
                >
                  ← Back to Reframe
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecord}
                  disabled={!automaticThought.trim() || !balancedReframe.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-military text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>SAVE CBT REFRAME TO LOG</span>
                </button>
              </div>

              {savedSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-mono-code flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Cognitive reframe successfully saved to your isolated personal record!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Reframe Summary Card & Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                COGNITIVE REFRAME SUMMARY
              </span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="space-y-2 text-xs font-mono-code">
              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300">
                <span className="text-[10px] text-rose-400 uppercase font-bold block">1. AUTOMATIC THOUGHT</span>
                <p className="mt-0.5">{automaticThought || 'Waiting for input...'}</p>
              </div>

              <div className="p-2.5 rounded bg-amber-950/20 border border-blue-500/30 text-amber-300">
                <span className="text-[10px] text-cyan-400 uppercase font-bold block">2. CONFLICTING EVIDENCE</span>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  <span className="text-slate-400">For:</span> {evidenceFor || 'None specified'}<br/>
                  <span className="text-slate-400">Against:</span> {evidenceAgainst || 'None specified'}
                </p>
              </div>

              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">3. BALANCED REFRAME</span>
                <p className="mt-0.5">{balancedReframe || 'Waiting for reframe...'}</p>
              </div>

              <div className="p-2.5 rounded bg-sky-950/20 border border-sky-500/30 text-sky-300">
                <span className="text-[10px] text-sky-400 uppercase font-bold block">4. COMMITTED ACTION</span>
                <p className="mt-0.5">{plannedAction || 'No action planned yet.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History of Past CBT Records */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase">
              PAST CBT THOUGHT RECORDS ({records.length})
            </h4>
          </div>
          <span className="text-xs font-mono-code text-slate-400">
            User-Isolated History
          </span>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono-code text-xs">
            No CBT Thought Records logged yet. Use the 5-step wizard above when you experience an emotional impulse.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.map((r) => (
              <div
                key={r.id}
                className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-2.5 text-xs font-mono-code"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800/80 pb-1.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-400" />
                    {r.date} at {r.time}
                  </span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    title="Delete record"
                    className="text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-400 block">Automatic Impulse:</span>
                  <p className="text-slate-300 mt-0.5 italic">"{r.automaticThought}"</p>
                </div>

                <div className="pt-1 border-t border-slate-900">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Balanced Reframe:</span>
                  <p className="text-slate-200 mt-0.5">{r.balancedReframe}</p>
                </div>

                <div className="pt-1 border-t border-slate-900 flex items-center justify-between text-[11px]">
                  <span className="text-sky-300">Action: {r.plannedAction}</span>
                  <span className="text-slate-500">{r.emotionBefore} → <span className="text-emerald-400">{r.emotionAfter}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
