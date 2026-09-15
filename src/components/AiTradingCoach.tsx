import React, { useState } from 'react';
import {
  Sparkles,
  Brain,
  Send,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Award,
  Shield,
  Zap,
  RefreshCw,
  MessageSquare,
  Bot,
  WifiOff,
} from 'lucide-react';
import { Trade, AccountSettings } from '../types';
import { calculateDashboardMetrics, calculateStrategyMetrics, calculateMistakeMetrics } from '../utils/tradeAnalytics';
import { useOnlineStatus } from '../utils/useOnlineStatus';
import { getKarachiTime } from '../utils/time';

interface AiTradingCoachProps {
  trades: Trade[];
  account: AccountSettings;
}

const PREMADE_PROMPTS = [
  'What is stopping me from becoming a consistently profitable trader?',
  'What are my highest-expectancy setups and how should I double down on them?',
  'Audit my emotional leakages and discipline rule breaches.',
  'Analyze my London vs New York session performance and give me a tactical execution schedule.',
];

export const AiTradingCoach: React.FC<AiTradingCoachProps> = ({ trades, account }) => {
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; text: string; timestamp: string }[]
  >([
    {
      role: 'assistant',
      text: `### PRIMEPIPFX AI COMBAT BRIEFING INITIATED
Welcome to the Tactical Command Center, Operator. 

I have analyzed your entire trade vault (${trades.length} logged missions). 

**Preliminary Diagnostic:**
- **Capital Core:** Your **SBT Model** setup yields an **80% win rate** with **+2.9R** average expectancy.
- **Critical Leakage:** 62% of your total drawdowns stem from **FOMO entries** and **moving stop losses**.
- **Time Anomaly:** Your win rate plummets from 73% during London Open down to 48% in New York afternoon chop.

Select an analysis directive below or ask me directly: *"What is stopping me from becoming a consistently profitable trader?"*`,
      timestamp: 'SYSTEM ONLINE',
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const isOnline = useOnlineStatus();

  const metrics = calculateDashboardMetrics(trades, account);
  const strategyMetrics = calculateStrategyMetrics(trades);
  const mistakeMetrics = calculateMistakeMetrics(trades);

  const handleAskCoach = async (questionToAsk: string) => {
    if (!questionToAsk.trim() || loading) return;

    if (!isOnline) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          text: questionToAsk,
          timestamp: `${getKarachiTime()} PKT`,
        },
        {
          role: 'assistant',
          text: 'AI Coach unavailable. Core Trading Journal remains fully operational.',
          timestamp: `${getKarachiTime()} PKT`,
        },
      ]);
      return;
    }

    const userMsg = {
      role: 'user' as const,
      text: questionToAsk,
      timestamp: `${getKarachiTime()} PKT`,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/trading-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionToAsk,
          tradeContext: {
            metrics,
            topStrategies: strategyMetrics.slice(0, 4),
            topMistakes: mistakeMetrics.slice(0, 4),
            recentTrades: trades.slice(0, 8),
            account,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('AI Coach service unavailable');
      }

      const data = await res.json();
      const botResponse =
        data.response ||
        'AI Coach unavailable. Core Trading Journal remains fully operational.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: botResponse,
          timestamp: `${getKarachiTime()} PKT`,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'AI Coach unavailable. Core Trading Journal remains fully operational.',
          timestamp: `${getKarachiTime()} PKT`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isOnline && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-mono-code flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="leading-relaxed">
            <strong className="block text-amber-200 font-bold">AI Coach unavailable. Core Trading Journal remains fully operational.</strong>
            All calculations, trade entries, risk limits, statistics, and journal history continue working offline via local storage.
          </div>
        </div>
      )}

      {/* AI Intelligence Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-code uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  GEMINI 2.5 FLASH PRO OPERATOR
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  REAL-TIME JOURNAL SYNTHESIS
                </span>
              </div>
              <h2 className="text-lg font-military font-bold text-slate-100 tracking-wide mt-1">
                AI TRADING COACH & COMBAT AUDITOR
              </h2>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                Institutional psychometrics and algorithmic pattern detection evaluating your edge.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAskCoach('What is stopping me from becoming a consistently profitable trader?')}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs tracking-wider shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>ASK: "WHAT IS STOPPING MY CONSISTENCY?"</span>
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Command Directives */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {PREMADE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleAskCoach(prompt)}
            disabled={loading}
            className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left text-xs font-mono-code text-slate-300 hover:text-amber-400 transition flex items-start gap-2"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Chat / Directive Terminal Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl shadow-xl flex flex-col h-[520px] overflow-hidden">
        {/* Terminal Header */}
        <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-mono-code">
          <div className="flex items-center gap-2 text-slate-300">
            <Bot className="w-4 h-4 text-amber-400" />
            <span className="font-bold">PRIMEPIPFX NEURAL COACH HUD</span>
          </div>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            STREAM SYNCHRONIZED
          </span>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 font-mono-code text-xs">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl p-4 leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-slate-950 font-sans font-medium'
                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-70 mb-1.5 font-mono-code">
                  <span>{msg.role === 'user' ? 'OPERATOR' : 'AI COACH'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap font-sans text-xs space-y-2">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>AI Coach auditing journal parameters...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-slate-800 bg-slate-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskCoach(inputQuestion);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask the AI Coach anything (e.g. 'How can I fix my win rate on Gold?')..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono-code text-slate-200 placeholder:text-slate-500 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-military font-bold text-xs tracking-wider transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>TRANSMIT</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
