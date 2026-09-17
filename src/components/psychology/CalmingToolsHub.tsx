import React, { useState } from 'react';
import { CalmingSuiteMaster } from '../calming/CalmingSuiteMaster';
import { CalmingSuiteTab } from '../calming/types';
import { ThoughtSorter } from './tools/ThoughtSorter';
import { CognitiveReframer } from './tools/CognitiveReframer';
import { PatternTracer } from './tools/PatternTracer';
import { Trade } from '../../types';
import { Sparkles, Brain } from 'lucide-react';

interface CalmingToolsHubProps {
  trades?: Trade[];
  userId?: string;
  onNavigateToTab?: (tab: string) => void;
  onLogJournalNote?: (note: string) => void;
}

export const CalmingToolsHub: React.FC<CalmingToolsHubProps> = ({
  trades = [],
  userId = 'default',
  onNavigateToTab,
  onLogJournalNote,
}) => {
  const [extraCognitiveTool, setExtraCognitiveTool] = useState<'NONE' | 'THOUGHT_SORTER' | 'COGNITIVE_REFRAMER' | 'PATTERN_TRACER'>('NONE');

  return (
    <div className="space-y-6">
      {/* Optional Toggle for Auxiliary Cognitive Tools */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider">
            CALMING TOOLS SUITE • PREMIUM EXPANSION
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono-code">
          <button
            type="button"
            onClick={() => setExtraCognitiveTool('NONE')}
            className={`px-3 py-1 rounded-xl border transition ${
              extraCognitiveTool === 'NONE'
                ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Calming Suite
          </button>
          <button
            type="button"
            onClick={() => setExtraCognitiveTool('THOUGHT_SORTER')}
            className={`px-3 py-1 rounded-xl border transition ${
              extraCognitiveTool === 'THOUGHT_SORTER'
                ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Thought Sorter
          </button>
          <button
            type="button"
            onClick={() => setExtraCognitiveTool('COGNITIVE_REFRAMER')}
            className={`px-3 py-1 rounded-xl border transition ${
              extraCognitiveTool === 'COGNITIVE_REFRAMER'
                ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Cognitive Reframer
          </button>
          <button
            type="button"
            onClick={() => setExtraCognitiveTool('PATTERN_TRACER')}
            className={`px-3 py-1 rounded-xl border transition ${
              extraCognitiveTool === 'PATTERN_TRACER'
                ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Pattern Tracer
          </button>
        </div>
      </div>

      {extraCognitiveTool === 'NONE' && (
        <CalmingSuiteMaster
          trades={trades}
          userId={userId}
          onNavigateToTab={onNavigateToTab}
          onLogJournalNote={onLogJournalNote}
        />
      )}

      {extraCognitiveTool === 'THOUGHT_SORTER' && <ThoughtSorter />}
      {extraCognitiveTool === 'COGNITIVE_REFRAMER' && <CognitiveReframer />}
      {extraCognitiveTool === 'PATTERN_TRACER' && <PatternTracer patternType="INFINITY" />}
    </div>
  );
};
