import React, { useState, useEffect } from 'react';
import {
  Compass,
  Shield,
  Eye,
  CheckCircle2,
  BookmarkCheck,
  Clock,
  Trash2,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ACTDefusionRecord, UserAccount } from '../../types';
import { getKarachiDate, getKarachiLiveClock } from '../../utils/time';

interface ACTDefusionToolProps {
  currentUser?: UserAccount | null;
}

const DEFUSION_PRESETS = [
  {
    title: 'Urge to Revenge Trade after Loss',
    notice: 'I notice my mind is generating the urgent story: "You just lost $200, you have to win it back right now or your day is ruined."',
    urge: 'An intense physical urge to open an immediate 1.0 lot trade on EUR/USD without waiting for a 15-minute candle close.',
    distance: 'I step back and label this: "I am having the thought that I must make money back immediately." This is just mental noise and nervous system activation, not an executive command.',
    plan: 'My Trading Plan says: 2 trades max per day, 1% risk maximum. Wait for structural liquidity sweep and session overlap.',
    action: 'Stand up, place hands on desk, take 3 deep breaths, and close the trading terminal for 20 minutes.',
  },
  {
    title: 'Anxiety About Losing Unrealized Gains',
    notice: 'I notice my mind screaming: "Close the trade now! Price might retrace and take away your +$150 profit!"',
    urge: 'The impulse to manually smash the "Close Position" button prematurely before reaching the predetermined 1:2 Take Profit.',
    distance: 'I defuse from this fear: "My mind is attempting to protect me from uncertainty. Thoughts are just suggestions. Price fluctuations are natural waves, not a threat."',
    plan: 'Playbook Rule: Set Stop Loss at Breakeven only after reaching 1:1.5 R, otherwise let the trade reach the Target or Stop.',
    action: 'Minimize the P&L window in MetaTrader. Monitor only key market structure levels on the 1-hour chart.',
  },
];

export const ACTDefusionTool: React.FC<ACTDefusionToolProps> = ({ currentUser }) => {
  const userId = currentUser?.id || currentUser?.username || 'guest';
  const storageKey = `primepipfx_act_${userId}`;

  const [records, setRecords] = useState<ACTDefusionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [step, setStep] = useState<number>(1);
  const [noticeThought, setNoticeThought] = useState('');
  const [identifyUrge, setIdentifyUrge] = useState('');
  const [createDistance, setCreateDistance] = useState('');
  const [returnToPlan, setReturnToPlan] = useState('');
  const [chosenAction, setChosenAction] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      fetch('/api/user/psychology')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && Array.isArray(data.actRecords)) {
            setRecords(data.actRecords);
            try {
              localStorage.setItem(storageKey, JSON.stringify(data.actRecords));
            } catch (e) {
              console.warn(e);
            }
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.id, storageKey]);

  const handleApplyPreset = (p: typeof DEFUSION_PRESETS[0]) => {
    setNoticeThought(p.notice);
    setIdentifyUrge(p.urge);
    setCreateDistance(p.distance);
    setReturnToPlan(p.plan);
    setChosenAction(p.action);
    setStep(5);
  };

  const handleSave = async () => {
    if (!noticeThought.trim() || !chosenAction.trim()) return;

    const clock = getKarachiLiveClock();
    const newRecord: ACTDefusionRecord = {
      id: `act-${Date.now()}`,
      userId,
      timestamp: Date.now(),
      date: getKarachiDate(),
      time: clock.time,
      noticeThought: noticeThought.trim(),
      identifyUrge: identifyUrge.trim(),
      createDistance: createDistance.trim(),
      returnToPlan: returnToPlan.trim(),
      chosenAction: chosenAction.trim(),
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }

    try {
      await fetch('/api/user/psychology/act', {
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
      setNoticeThought('');
      setIdentifyUrge('');
      setCreateDistance('');
      setReturnToPlan('');
      setChosenAction('');
      setStep(1);
    }, 2000);
  };

  const handleDelete = (id: string) => {
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
      {/* Header Bar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold">
              ACCEPTANCE & COMMITMENT (ACT) DEFUSION
            </span>
            <span className="text-[10px] font-mono-code text-slate-400">
              USER: @{currentUser?.username || 'Trader'}
            </span>
          </div>
          <h3 className="text-base font-military font-bold text-slate-100 mt-1">
            Cognitive Defusion: Unhooking from Impulsive Trading Urges
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5 max-w-3xl">
            Create psychological distance from market-induced thoughts and urges so you can choose committed actions
            aligned with your trading rules. <span className="text-sky-400/90 font-medium">Practical performance protocol — not a mental-health substitute.</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono-code text-slate-400">Presets:</span>
          {DEFUSION_PRESETS.map((p, idx) => (
            <button
              key={p.title}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="text-[11px] font-mono-code px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-400 border border-slate-700 transition"
            >
              #{idx + 1} {p.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Guided 5-Step Process */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-950/90 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
          {/* Step tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            {[
              { num: 1, label: '1. Notice Thought' },
              { num: 2, label: '2. Identify Urge' },
              { num: 3, label: '3. Create Distance' },
              { num: 4, label: '4. Return to Plan' },
              { num: 5, label: '5. Choose Action' },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-1.5 text-xs font-mono-code transition ${
                  step === s.num
                    ? 'text-sky-400 font-bold'
                    : step > s.num
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    step === s.num
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : step > s.num
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {s.num}
                </span>
                <span className="hidden sm:inline">{s.label.split('.')[1]}</span>
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 1: Notice the Thought
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Observe your mind generating a narrative. Start with: "I notice my mind saying..."
                </p>
              </div>
              <textarea
                value={noticeThought}
                onChange={(e) => setNoticeThought(e.target.value)}
                placeholder='e.g., I notice my mind is generating the thought: "If I do not enter right now, everyone else is making money while I get left behind."'
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">Notice thoughts as transient events, not commands.</span>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!noticeThought.trim()}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-military text-xs font-bold transition"
                >
                  <span>NEXT: IDENTIFY URGE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 2: Identify the Urge
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  What physical or behavioral impulse is pulling on you right now?
                </p>
              </div>
              <textarea
                value={identifyUrge}
                onChange={(e) => setIdentifyUrge(e.target.value)}
                placeholder="e.g., The physical urge to double my lot size to 2.0 lots and click BUY without waiting for the 15-minute close."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
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
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-military text-xs font-bold transition"
                >
                  <span>NEXT: CREATE DISTANCE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 3: Create Distance From the Thought (Defusion)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Acknowledge that you are the observer, not the thought. "I am having the thought that..."
                </p>
              </div>
              <textarea
                value={createDistance}
                onChange={(e) => setCreateDistance(e.target.value)}
                placeholder='e.g., I am having the thought that I must double my size. I thank my brain for trying to protect my pride, but this thought does not control my hands.'
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
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
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-military text-xs font-bold transition"
                >
                  <span>NEXT: RETURN TO PLAN</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 4: Return to the Trading Plan
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Re-anchor to your predetermined trading rules and capital preservation criteria.
                </p>
              </div>
              <textarea
                value={returnToPlan}
                onChange={(e) => setReturnToPlan(e.target.value)}
                placeholder="e.g., Strict 1% risk per trade. Maximum 2 executions per day. Wait for candle close confirmation and clear confluence."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
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
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-military text-xs font-bold transition"
                >
                  <span>NEXT: CHOOSE PLANNED ACTION</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Step 5: Choose the Planned Action
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Execute the professional decision that aligns with your core trader values.
                </p>
              </div>
              <textarea
                value={chosenAction}
                onChange={(e) => setChosenAction(e.target.value)}
                placeholder="e.g., Step away from screens for 10 minutes. Return only when calm and wait for high-probability liquidity sweep."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-xs font-mono-code text-slate-400 hover:text-slate-200"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!noticeThought.trim() || !chosenAction.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-military text-xs font-bold transition shadow-lg shadow-sky-500/20"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>SAVE ACT DEFUSION EXERCISE</span>
                </button>
              </div>

              {savedSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-mono-code flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>ACT Defusion exercise saved to your personal isolated record!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Defusion Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                ACT DEFUSION SUMMARY
              </span>
              <Compass className="w-4 h-4 text-sky-400" />
            </div>

            <div className="space-y-2 text-xs font-mono-code">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                <span className="text-[10px] text-sky-400 uppercase font-bold block">1. NOTICED THOUGHT</span>
                <p className="mt-0.5">{noticeThought || 'Waiting...'}</p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                <span className="text-[10px] text-cyan-400 uppercase font-bold block">2. IDENTIFIED URGE</span>
                <p className="mt-0.5">{identifyUrge || 'Waiting...'}</p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                <span className="text-[10px] text-purple-400 uppercase font-bold block">3. CREATED DISTANCE</span>
                <p className="mt-0.5">{createDistance || 'Waiting...'}</p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">4. RETURNED TO PLAN</span>
                <p className="mt-0.5">{returnToPlan || 'Waiting...'}</p>
              </div>

              <div className="p-2.5 rounded bg-sky-950/30 border border-sky-500/40 text-sky-300 font-medium">
                <span className="text-[10px] text-sky-400 uppercase font-bold block">5. CHOSEN ACTION</span>
                <p className="mt-0.5">{chosenAction || 'Waiting...'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Past Exercises Log */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase">
              ACT DEFUSION EXERCISE LOG ({records.length})
            </h4>
          </div>
          <span className="text-xs font-mono-code text-slate-400">
            User-Isolated Records
          </span>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono-code text-xs">
            No ACT Defusion sessions logged yet. Whenever you feel pulled toward impulsive behavior, run through the 5 steps above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.map((r) => (
              <div
                key={r.id}
                className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-2 text-xs font-mono-code"
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
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Noticed Urge:</span>
                  <p className="text-amber-300/90 mt-0.5">{r.identifyUrge || r.noticeThought}</p>
                </div>

                <div className="pt-1 border-t border-slate-900">
                  <span className="text-[10px] uppercase font-bold text-sky-400 block">Distance & Re-anchor:</span>
                  <p className="text-slate-300 mt-0.5">{r.createDistance}</p>
                </div>

                <div className="pt-1 border-t border-slate-900">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Committed Action:</span>
                  <p className="text-slate-200 mt-0.5">{r.chosenAction}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
