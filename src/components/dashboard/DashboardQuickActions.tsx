import React from 'react';
import {
  Plus,
  Calculator,
  Crosshair,
  PenTool,
  Brain,
  ListTodo,
  Zap,
} from 'lucide-react';

interface DashboardQuickActionsProps {
  onOpenNewTrade: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  onOpenNewTrade,
  onNavigateToTab,
}) => {
  return (
    <div className="rounded-2xl bg-[#090D16] border border-slate-800/80 p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
            HIGH-SPEED OPERATIONAL TRIGGERS
          </h3>
        </div>
        <span className="text-[10px] font-mono-code text-slate-400 uppercase">QUICK ACTIONS</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Record New Trade - Primary CTA */}
        <button
          type="button"
          onClick={onOpenNewTrade}
          className="p-3.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-amber-600/10 border border-blue-500/40 hover:border-cyan-400 text-left transition duration-150 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-cyan-400 mb-2 group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <div className="text-xs font-military font-bold text-amber-300">ENTER TRADE</div>
          <div className="text-[10px] font-mono-code text-slate-400 mt-0.5">Open trade log</div>
        </button>

        {/* Lot Size Calculator */}
        <button
          type="button"
          onClick={() => onNavigateToTab('LOT_SIZE')}
          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 text-left transition duration-150 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
            <Calculator className="w-4 h-4" />
          </div>
          <div className="text-xs font-military font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
            LOT CALCULATOR
          </div>
          <div className="text-[10px] font-mono-code text-slate-400 mt-0.5">1% risk calculator</div>
        </button>

        {/* Pre-Trade Plan */}
        <button
          type="button"
          onClick={() => onNavigateToTab('PRE_TRADE_PLAN')}
          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-sky-500/40 text-left transition duration-150 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 mb-2 group-hover:scale-105 transition-transform">
            <Crosshair className="w-4 h-4" />
          </div>
          <div className="text-xs font-military font-bold text-slate-200 group-hover:text-sky-300 transition-colors">
            PRE-TRADE PLAN
          </div>
          <div className="text-[10px] font-mono-code text-slate-400 mt-0.5">Validate setup</div>
        </button>

        {/* Freehand Canvas */}
        <button
          type="button"
          onClick={() => onNavigateToTab('FREEHAND_WORKSPACE')}
          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/40 text-left transition duration-150 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-105 transition-transform">
            <PenTool className="w-4 h-4" />
          </div>
          <div className="text-xs font-military font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
            FREEHAND CANVAS
          </div>
          <div className="text-[10px] font-mono-code text-slate-400 mt-0.5">Sketch chart flow</div>
        </button>

        {/* Daily Development */}
        <button
          type="button"
          onClick={() => onNavigateToTab('DAILY_DEV')}
          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/40 text-left transition duration-150 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-cyan-400 mb-2 group-hover:scale-105 transition-transform">
            <ListTodo className="w-4 h-4" />
          </div>
          <div className="text-xs font-military font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
            DAILY DEV PLAN
          </div>
          <div className="text-[10px] font-mono-code text-slate-400 mt-0.5">Habits & checklist</div>
        </button>

        {/* Psychology Center */}
        <button
          type="button"
          onClick={() => onNavigateToTab('PSYCHOLOGY')}
          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/40 text-left transition duration-150 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-105 transition-transform">
            <Brain className="w-4 h-4" />
          </div>
          <div className="text-xs font-military font-bold text-slate-200 group-hover:text-purple-300 transition-colors">
            PSYCHOLOGY
          </div>
          <div className="text-[10px] font-mono-code text-slate-400 mt-0.5">Mindset masterclass</div>
        </button>
      </div>
    </div>
  );
};
