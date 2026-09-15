import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, AlertTriangle, CheckCircle, ShieldAlert, Zap, Award } from 'lucide-react';

interface SetupEvent {
  id: string;
  type: 'NOISE' | 'LIQUIDITY_TRAP' | 'FALSE_BREAKOUT' | 'A_PLUS_SETUP';
  title: string;
  description: string;
  isTrigger: boolean;
}

export const PatienceSimulator: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [patienceScore, setPatienceScore] = useState<number>(100);
  const [currentEvent, setCurrentEvent] = useState<SetupEvent | null>(null);
  const [round, setRound] = useState<number>(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [validClicked, setValidClicked] = useState<boolean>(false);
  const [reactionTime, setReactionTime] = useState<number | null>(null);

  const eventStartTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const eventsSequence: SetupEvent[] = [
    {
      id: 'e1',
      type: 'NOISE',
      title: 'Asian Session Chop / Low Volume Range',
      description: 'Price is bouncing randomly inside 5-pip range. No displacement.',
      isTrigger: false,
    },
    {
      id: 'e2',
      type: 'FALSE_BREAKOUT',
      title: 'Aggressive 1-Min Green Candle',
      description: 'Huge spike into untested resistance. High probability bull-trap.',
      isTrigger: false,
    },
    {
      id: 'e3',
      type: 'LIQUIDITY_TRAP',
      title: 'Equal Highs Inducement',
      description: 'Price wick taps equal highs, tempting early breakout buyers.',
      isTrigger: false,
    },
    {
      id: 'e4',
      type: 'A_PLUS_SETUP',
      title: 'Grade A+ Setup: HTF Sweep + MSS + 15m Fair Value Gap Confirmed!',
      description: 'Institutional displacement confirmed. Optimal Trade Entry aligned. EXECUTE NOW!',
      isTrigger: true,
    },
  ];

  const startNextEvent = (nextRound: number) => {
    if (nextRound >= eventsSequence.length) {
      setIsPlaying(false);
      setCurrentEvent(null);
      setFeedback('Simulation complete! You resisted all market traps and executed cleanly.');
      setIsSuccess(true);
      return;
    }

    const ev = eventsSequence[nextRound];
    setCurrentEvent(ev);
    setRound(nextRound);
    setFeedback(null);
    setIsSuccess(null);
    setValidClicked(false);
    eventStartTimeRef.current = Date.now();

    // Duration of this event
    const duration = ev.isTrigger ? 2500 : 3500;

    timeoutRef.current = setTimeout(() => {
      if (ev.isTrigger && !validClicked) {
        // Missed the valid setup
        setPatienceScore((s) => Math.max(0, s - 25));
        setFeedback('Hesitation! You froze and missed the A+ displacement setup.');
        setIsSuccess(false);
      } else if (!ev.isTrigger) {
        // Successfully waited through noise
        setPatienceScore((s) => Math.min(100, s + 5));
      }

      // Proceed to next event
      setTimeout(() => {
        startNextEvent(nextRound + 1);
      }, 1200);
    }, duration);
  };

  const handleStart = () => {
    setIsPlaying(true);
    setPatienceScore(100);
    setRound(0);
    setReactionTime(null);
    setFeedback(null);
    startNextEvent(0);
  };

  const handleUserClick = () => {
    if (!isPlaying || !currentEvent) return;

    const reaction = Date.now() - eventStartTimeRef.current;

    if (currentEvent.isTrigger) {
      // Correct execution!
      setValidClicked(true);
      setReactionTime(reaction);
      setPatienceScore((s) => Math.min(100, s + 20));
      setFeedback(`Clean Execution! Reaction speed: ${reaction}ms. Strict model adherence.`);
      setIsSuccess(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTimeout(() => {
        startNextEvent(round + 1);
      }, 1500);
    } else {
      // Impulsive FOMO trigger error!
      setPatienceScore((s) => Math.max(0, s - 30));
      setFeedback(`FOMO Penalty! You entered into ${currentEvent.title}. Market liquidated you.`);
      setIsSuccess(false);
    }
  };

  const handleReset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsPlaying(false);
    setCurrentEvent(null);
    setFeedback(null);
    setPatienceScore(100);
    setRound(0);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-military font-bold text-amber-400 uppercase tracking-widest">
            DISCIPLINE & IMPULSE CONTROL LAB
          </span>
          <h3 className="text-base font-military font-bold text-slate-100 mt-1">
            Patience & Reaction Simulator
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Test your discipline under psychological pressure. Wait through fake noise and only execute on Grade A+ setups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Discipline Score</span>
            <span
              className={`text-lg font-mono-code font-bold ${
                patienceScore >= 80
                  ? 'text-emerald-400'
                  : patienceScore >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {patienceScore} / 100
            </span>
          </div>
        </div>
      </div>

      {/* Simulator Active Display */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 min-h-[220px] flex flex-col items-center justify-center text-center space-y-4">
        {!isPlaying ? (
          <div className="space-y-3">
            <Award className="w-12 h-12 text-amber-400 mx-auto" />
            <div>
              <h4 className="font-military font-bold text-slate-200 text-sm">
                READY FOR PATIENCE ASSESSMENT?
              </h4>
              <p className="text-xs text-slate-400 font-mono-code max-w-md mx-auto mt-1">
                The simulator will display simulated market price events.
                <br />
                <strong className="text-rose-400">DO NOT CLICK</strong> on noise, equal highs, or fakeouts.
                <br />
                <strong className="text-emerald-400">CLICK ONLY</strong> when Grade A+ displacement setup confirms.
              </p>
            </div>
            <button
              onClick={handleStart}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer transition"
            >
              START PATIENCE TEST
            </button>
          </div>
        ) : (
          <div className="w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 border-b border-slate-800 pb-2">
              <span>Market Phase {round + 1} of {eventsSequence.length}</span>
              <span className="animate-pulse text-amber-400">● LIVE FEED ACTIVE</span>
            </div>

            {currentEvent && (
              <div
                className={`p-5 rounded-xl border transition-all ${
                  currentEvent.isTrigger
                    ? 'bg-emerald-950/40 border-emerald-500/80 shadow-2xl shadow-emerald-500/20 animate-pulse'
                    : 'bg-slate-900 border-slate-700'
                }`}
              >
                <span
                  className={`text-[10px] font-military font-bold uppercase tracking-wider block mb-1 ${
                    currentEvent.isTrigger ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {currentEvent.type.replace(/_/g, ' ')}
                </span>
                <h4 className="text-sm font-military font-bold text-slate-100">
                  {currentEvent.title}
                </h4>
                <p className="text-xs text-slate-300 font-mono-code mt-1">
                  {currentEvent.description}
                </p>
              </div>
            )}

            {/* User Execution Trigger Button */}
            <button
              onClick={handleUserClick}
              disabled={validClicked}
              className={`w-full py-4 rounded-xl font-military font-bold text-sm tracking-wider transition cursor-pointer shadow-xl ${
                currentEvent?.isTrigger
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 ring-4 ring-emerald-400/40 animate-bounce'
                  : 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-600'
              }`}
            >
              {currentEvent?.isTrigger ? '🔥 EXECUTE A+ ENTRY NOW! 🔥' : 'TAKE TRADE (RESIST IF NO SETUP)'}
            </button>

            {/* Instant Feedback Message */}
            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs font-mono-code flex items-center justify-center gap-2 ${
                  isSuccess
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}
              >
                {isSuccess ? <CheckCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                <span>{feedback}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isPlaying && (
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono-code flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ABORT</span>
          </button>
        </div>
      )}
    </div>
  );
};
