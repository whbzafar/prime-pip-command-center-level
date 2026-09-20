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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const allCategories = useMemo(() => {
    return [
      { id: 'DASHBOARD' as MainNavTab, label: '01. Dashboard', desc: 'Tactical overview & trade metrics', icon: Activity, section: 'Core' },
      { id: 'JOURNAL' as MainNavTab, label: '02. Trade Journal', desc: 'Detailed log & execution vault', icon: BookOpen, section: 'Core' },
      { id: 'SBT_MODELS' as MainNavTab, label: '03. SBT Models', desc: '10 Structure-Based Trading models & PDF assets', icon: Layers, highlight: true, section: 'Core' },
      { id: 'LOT_SIZE' as MainNavTab, label: '04. Lot Size Calculator', desc: 'Exact risk positioning tool', icon: Calculator, section: 'Risk & Strategy' },
      { id: 'RISK' as MainNavTab, label: '05. Risk Management', desc: 'Discipline rules & trade limits', icon: Crosshair, section: 'Risk & Strategy' },
      { id: 'PRE_TRADE_PLAN' as MainNavTab, label: '06. Pre-Trade Plan', desc: '3-phase execution checklist gatekeeper', icon: ShieldAlert, highlight: true, section: 'Risk & Strategy' },
      { id: 'FUNDAMENTAL_CALENDAR' as MainNavTab, label: '07. Fundamental Calendar', desc: 'Macro news & high-impact releases', icon: Calendar, highlight: true, section: 'Market Intelligence' },
      { id: 'SIGNALS' as MainNavTab, label: '08. Premium Signals', desc: 'Institutional VIP trade setups', icon: Radio, comingSoon: true, highlight: true, section: 'Market Intelligence' },
      { id: 'COMPOUNDING' as MainNavTab, label: '09. Compounding Tools', desc: 'Long-term growth simulator', icon: Calculator, section: 'Market Intelligence' },
      { id: 'PERFORMANCE' as MainNavTab, label: '10. Performance Report', desc: 'Win rates, R:R & drawdowns', icon: BarChart3, section: 'Analytics' },
      { id: 'DAILY_DEV' as MainNavTab, label: '11. Daily Development', desc: 'Traders habit tracker & routines', icon: Award, section: 'Mindset & Health' },
      { id: 'PSYCHOLOGY' as MainNavTab, label: '12. Psychological Center', desc: 'Emotional state & cognitive audit', icon: Brain, highlight: true, section: 'Mindset & Health' },
      { id: 'CALMING_TOOLS' as MainNavTab, label: '13. Trading Tool Suite', desc: 'Diaphragmatic breathing & focus tools', icon: Wind, highlight: true, section: 'Mindset & Health' },
      { id: 'RESEARCH' as MainNavTab, label: '14. Academic Research', desc: 'OpenAlex academic market research engine', icon: Compass, highlight: true, section: 'Research & Tools' },
      { id: 'FREEHAND_WORKSPACE' as MainNavTab, label: '15. Freehand Canvas', desc: 'Diagramming & markup workspace', icon: PenTool, section: 'Research & Tools' },
      { id: 'COMMUNITY' as MainNavTab, label: '16. Trader Community Feed', desc: 'Live dispatches & peer sharing', icon: Users, section: 'Community' },
      { id: 'BOOK_SESSION' as MainNavTab, label: '17. Book a Session', desc: '1-on-1 mentorship consultation', icon: MessageSquare, highlight: true, section: 'Community' },
      { id: 'SETTINGS' as MainNavTab, label: '18. Data Export & Backup', desc: 'Export journal & restore state', icon: Settings2, section: 'Operations' },
      { id: 'ADMIN' as MainNavTab, label: '19. Admin Panel (Owner)', desc: 'User access & customer controls', icon: ShieldCheck, highlight: true, section: 'Administration' },
      { id: 'EVOLUTION' as MainNavTab, label: '20. Evaluation Engine', desc: 'Proprietary performance review & evolution', icon: Cpu, highlight: true, section: 'Administration' },
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

  const isMoreTabActive = !['DASHBOARD', 'PRE_TRADE_PLAN', 'LOT_SIZE', 'JOURNAL'].includes(activeTab);

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#090d16] border-t border-cyan-500/20 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:hidden select-none shadow-2xl transform-gpu"
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
            onClick={() => {
              if (onOpenAllCategories) {
                onOpenAllCategories();
              } else {
                setIsMoreOpen(true);
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              isMoreOpen || isMoreTabActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="More Categories"
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                isMoreOpen || isMoreTabActive
                  ? 'bg-blue-500/20 text-cyan-400 shadow-sm shadow-blue-500/20 scale-105'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">More</span>
            {(isMoreOpen || isMoreTabActive) && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
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
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
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
                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200"
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
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-mono-code text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                        ? 'bg-blue-500/15 border-blue-500/50 shadow-md shadow-blue-500/10 text-amber-300'
                        : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${
                          isActive
                            ? 'bg-blue-500/20 text-cyan-400'
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
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono-code bg-blue-500/15 text-cyan-400 border border-blue-500/30">
                              <Lock className="w-2.5 h-2.5" />
                              <span>COMING SOON</span>
                            </span>
                          )}
                          {(item as any).highlight && !isComingSoon && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-600'}`} />
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

