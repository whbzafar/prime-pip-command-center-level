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
} from 'lucide-react';
import { MainNavTab } from './Header';
import { UserAccount } from '../types';

interface MobileBottomNavProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  onOpenNewTrade: () => void;
  currentUser?: UserAccount | null;
  onOpenEvolution?: () => void;
  onOpenBackupModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewTrade,
  currentUser,
  onOpenEvolution,
  onOpenBackupModal,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const allCategories = useMemo(() => {
    return [
      { id: 'DASHBOARD' as MainNavTab, label: 'Dashboard', desc: 'Tactical overview & trade metrics', icon: Activity, section: 'Execution' },
      { id: 'JOURNAL' as MainNavTab, label: 'Trade Journal', desc: 'Detailed log & execution vault', icon: BookOpen, section: 'Execution' },
      { id: 'PERFORMANCE' as MainNavTab, label: 'Performance Analytics', desc: 'Win rates, R:R & drawdowns', icon: BarChart3, section: 'Execution' },
      { id: 'RISK' as MainNavTab, label: 'Risk Management', desc: 'Discipline rules & trade limits', icon: Crosshair, section: 'Execution' },
      { id: 'LOT_SIZE' as MainNavTab, label: 'Lot Size Calculator', desc: 'Exact risk positioning tool', icon: Calculator, section: 'Execution' },
      { id: 'COMPOUNDING' as MainNavTab, label: 'Compounding Tool', desc: 'Long-term growth simulator', icon: Calculator, section: 'Execution' },
      { id: 'REPORTS' as MainNavTab, label: 'Performance Reports', desc: 'Weekly & monthly summaries', icon: FileText, section: 'Execution' },
      { id: 'PRE_TRADE_PLAN' as MainNavTab, label: 'Pre-Trade Plan', desc: 'Execution checklist protocol', icon: ShieldAlert, highlight: true, section: 'Execution' },

      { id: 'FUNDAMENTAL_CALENDAR' as MainNavTab, label: 'Fundamental Calendar', desc: 'Macro news & high-impact releases', icon: Calendar, highlight: true, section: 'Intelligence' },
      { id: 'RESEARCH' as MainNavTab, label: 'Trading Research', desc: 'Institutional playbooks & SMC', icon: Compass, comingSoon: true, section: 'Intelligence' },
      { id: 'SIGNALS' as MainNavTab, label: 'Premium Signals', desc: 'Institutional VIP trade setups', icon: Radio, comingSoon: true, highlight: true, section: 'Intelligence' },

      { id: 'PSYCHOLOGY' as MainNavTab, label: 'Psychology Center', desc: 'Emotional state & cognitive audit', icon: Brain, highlight: true, section: 'Psychology' },
      { id: 'CALMING_TOOLS' as MainNavTab, label: 'Calming Tools Suite', desc: 'Diaphragmatic breathing & focus', icon: Wind, highlight: true, section: 'Psychology' },
      { id: 'DAILY_DEV' as MainNavTab, label: 'Daily Development', desc: 'Traders habit tracker & routines', icon: Award, section: 'Psychology' },

      { id: 'FREEHAND_WORKSPACE' as MainNavTab, label: 'Freehand Canvas', desc: 'Diagramming & markup workspace', icon: PenTool, section: 'Community & Tools' },
      { id: 'COMMUNITY' as MainNavTab, label: 'Trader Community Feed', desc: 'Live dispatches & peer sharing', icon: Users, section: 'Community & Tools' },
      { id: 'BOOK_SESSION' as MainNavTab, label: 'Book a Session', desc: '1-on-1 mentorship consultation', icon: MessageSquare, highlight: true, section: 'Community & Tools' },
      { id: 'SETTINGS' as MainNavTab, label: 'Data Export & Backup', desc: 'Export journal & restore state', icon: Settings2, section: 'Community & Tools' },

      ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' || currentUser?.isDeveloper || currentUser?.username === 'primepipfx-admin'
        ? [
            { id: 'ADMIN' as MainNavTab, label: 'Admin Panel — Owner', desc: 'User access & customer controls', icon: ShieldCheck, highlight: true, section: 'Administration' },
            { id: 'EVOLUTION' as MainNavTab, label: 'Evolution Engine', desc: 'Autonomous system upgrades', icon: Cpu, highlight: true, section: 'Administration' },
          ]
        : []),
    ];
  }, [currentUser]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return allCategories;
    const q = searchQuery.toLowerCase();
    return allCategories.filter(
      (c) => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.section.toLowerCase().includes(q)
    );
  }, [allCategories, searchQuery]);

  const handleSelect = (id: MainNavTab) => {
    setIsMoreOpen(false);
    if (id === 'SETTINGS' && onOpenBackupModal) {
      onOpenBackupModal();
      return;
    }
    if (id === 'EVOLUTION' && onOpenEvolution) {
      onOpenEvolution();
      return;
    }
    onSelectTab(id);
  };

  const isMoreTabActive = !['DASHBOARD', 'JOURNAL', 'RISK'].includes(activeTab);

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden prime-dock-blur px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          {/* 1. Dash */}
          <button
            onClick={() => onSelectTab('DASHBOARD')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              activeTab === 'DASHBOARD' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'DASHBOARD'
                  ? 'bg-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/20 scale-105'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              <Activity className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">Dash</span>
            {activeTab === 'DASHBOARD' && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            )}
          </button>

          {/* 2. Vault */}
          <button
            onClick={() => onSelectTab('JOURNAL')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              activeTab === 'JOURNAL' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'JOURNAL'
                  ? 'bg-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/20 scale-105'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              <BookOpen className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">Vault</span>
            {activeTab === 'JOURNAL' && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            )}
          </button>

          {/* 3. Center Trade Action Button */}
          <button
            onClick={onOpenNewTrade}
            className="flex flex-col items-center justify-center py-1 px-1.5 -mt-5 group prime-ios-touch cursor-pointer min-h-[44px]"
            title="Enter New Trade"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/40 border-2 border-[#070A11] prime-light-sweep transition-transform duration-150 group-active:scale-90">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[9px] font-military font-bold text-amber-400 tracking-wider mt-0.5 select-none">
              TRADE
            </span>
          </button>

          {/* 4. Risk */}
          <button
            onClick={() => onSelectTab('RISK')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              activeTab === 'RISK' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'RISK'
                  ? 'bg-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/20 scale-105'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              <Crosshair className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">Risk</span>
            {activeTab === 'RISK' && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            )}
          </button>

          {/* 5. More (Reveals All Categories) */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              isMoreOpen || isMoreTabActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="More Categories"
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                isMoreOpen || isMoreTabActive
                  ? 'bg-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/20 scale-105'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">More</span>
            {(isMoreOpen || isMoreTabActive) && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile "More Categories" Bottom Sheet / Full Screen Slide-Up Drawer */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          {/* Backdrop dismiss */}
          <div className="flex-1" onClick={() => setIsMoreOpen(false)} />

          <div className="bg-[#0B0F19] border-t border-slate-800 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Sheet Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-military font-bold text-sm tracking-wider text-slate-100">
                    ALL CATEGORIES & MODULES
                  </h3>
                  <p className="text-[11px] font-mono-code text-slate-400">
                    {allCategories.length} Tactical Systems Available
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-5 pt-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search categories (e.g. Risk, Calendar, Psychology)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-mono-code text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Category Grid List */}
            <div className="overflow-y-auto px-5 py-3 space-y-2 pb-10">
              {filteredCategories.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isComingSoon = (item as any).comingSoon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer active:scale-98 ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10 text-amber-300'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-military font-bold text-xs tracking-wider">
                            {item.label}
                          </span>
                          {isComingSoon && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono-code bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Lock className="w-2.5 h-2.5" />
                              <span>COMING SOON</span>
                            </span>
                          )}
                          {(item as any).highlight && !isComingSoon && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

