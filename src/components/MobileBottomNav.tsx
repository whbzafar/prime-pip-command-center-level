import React, { useState, useMemo } from 'react';
import {
  Activity,
  BookOpen,
  Brain,
  Crosshair,
  Plus,
  LayoutGrid,
  X,
  Search,
  BarChart3,
  Compass,
  Radio,
  Calculator,
  FileText,
  ShieldAlert,
  Award,
  Wind,
  Calendar,
  PenTool,
  Users,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Cpu,
  Lock,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { MainNavTab } from './Header';
import { UserAccount } from '../types';
import { ALL_CATEGORIES_DATA } from './AllCategoriesModal';

interface MobileBottomNavProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  onOpenNewTrade: () => void;
  currentUser?: UserAccount | null;
  onOpenEvolution?: () => void;
  onOpenBackupModal?: () => void;
  onOpenAllCategories?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewTrade,
  currentUser,
  onOpenEvolution,
  onOpenBackupModal,
  onOpenAllCategories,
}) => {
  const isMoreTabActive = !['DASHBOARD', 'PRE_TRADE_PLAN', 'LOT_SIZE', 'JOURNAL'].includes(activeTab); = !['DASHBOARD', 'PRE_TRADE_PLAN', 'LOT_SIZE', 'JOURNAL'].includes(activeTab);

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#090d16] border-t border-cyan-500/20 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:hidden select-none shadow-2xl"
      >
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          {/* 1. Dashboard */}
          <button
            onClick={() => onSelectTab('DASHBOARD')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              activeTab === 'DASHBOARD' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'DASHBOARD'
                  ? 'bg-blue-500/20 text-cyan-400 shadow-sm shadow-blue-500/20 scale-105'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              <Activity className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">Dashboard</span>
            {activeTab === 'DASHBOARD' && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            )}
          </button>

          {/* 2. Pre-Trade Plan */}
          <button
            onClick={() => onSelectTab('PRE_TRADE_PLAN')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              activeTab === 'PRE_TRADE_PLAN' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'PRE_TRADE_PLAN'
                  ? 'bg-blue-500/20 text-cyan-400 shadow-sm shadow-blue-500/20 scale-105'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              <ShieldAlert className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">Pre-Plan</span>
            {activeTab === 'PRE_TRADE_PLAN' && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            )}
          </button>

          {/* 3. Center Trade Action / Journal Button */}
          <button
            onClick={onOpenNewTrade}
            className="flex flex-col items-center justify-center py-1 px-1.5 -mt-5 group prime-ios-touch cursor-pointer min-h-[44px]"
            title="Enter New Trade / Journal"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 via-cyan-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-blue-500/40 border-2 border-[#020617] prime-light-sweep transition-transform duration-150 group-active:scale-90">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[9px] font-military font-bold text-cyan-400 tracking-wider mt-0.5 select-none">
              TRADE
            </span>
          </button>

          {/* 4. Lot Size Calculator */}
          <button
            onClick={() => onSelectTab('LOT_SIZE')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              activeTab === 'LOT_SIZE' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'LOT_SIZE'
                  ? 'bg-blue-500/20 text-cyan-400 shadow-sm shadow-blue-500/20 scale-105'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              <Calculator className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">Lot Size</span>
            {activeTab === 'LOT_SIZE' && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            )}
          </button>

          {/* 5. More (Reveals Remaining Categories) */}
          <button
            onClick={() => onOpenAllCategories?.()}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              isMoreTabActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="More Categories"
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                isMoreTabActive
                  ? 'bg-blue-500/20 text-cyan-400 shadow-sm shadow-blue-500/20 scale-105'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">More</span>
            {isMoreTabActive && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
