import React, { useState } from 'react';
import {
  Activity,
  BookOpen,
  Brain,
  Crosshair,
  Menu,
  Plus,
  Calendar,
  PenTool,
  Users,
  MessageSquare,
  Sparkles,
  Cpu,
  Calculator,
  Settings2,
  X,
  ShieldCheck,
  Wind,
  Compass,
  Radio,
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const mainItems = [
    { id: 'DASHBOARD' as MainNavTab, label: 'Dash', icon: Activity },
    { id: 'JOURNAL' as MainNavTab, label: 'Vault', icon: BookOpen },
    { id: 'PSYCHOLOGY' as MainNavTab, label: 'Mindset', icon: Brain, calm: true },
    { id: 'RISK' as MainNavTab, label: 'Risk', icon: Crosshair },
  ];

  const categorizedMoreItems = [
    {
      title: 'ANALYTICAL & CALCULATORS',
      items: [
        { id: 'LOT_SIZE' as MainNavTab, label: 'Lot Size Calculator', icon: Calculator, desc: '1% sizing engine' },
        { id: 'COMPOUNDING' as MainNavTab, label: 'Compounding Tool', icon: Calculator, desc: 'Growth projection' },
        { id: 'REPORTS' as MainNavTab, label: 'Performance Reports', icon: BookOpen, desc: 'Statistical audits' },
      ],
    },
    {
      title: 'DISCIPLINE & MINDSET',
      items: [
        { id: 'PRE_TRADE_PLAN' as MainNavTab, label: 'Pre-Trade Plan', icon: Crosshair, highlight: 'DISCIPLINE', desc: 'Pre-flight checks' },
        { id: 'DAILY_DEV' as MainNavTab, label: 'Daily Development', icon: Sparkles, desc: 'Habits & routine' },
        { id: 'PSYCHOLOGY' as MainNavTab, label: 'Psychology Center', icon: Brain, highlight: 'CALM', desc: 'Mindset drills' },
        { id: 'CALMING_TOOLS' as MainNavTab, label: 'Calming Tools Suite', icon: Wind, highlight: 'RESET', desc: 'Breathing resets' },
      ],
    },
    {
      title: 'WORKSPACE & RESEARCH',
      items: [
        { id: 'RESEARCH' as MainNavTab, label: 'Trading Research', icon: Compass, highlight: 'STUDY', desc: 'Market analysis' },
        { id: 'SIGNALS' as MainNavTab, label: 'Premium Signals', icon: Radio, highlight: 'VIP', desc: 'Institutional feed' },
        { id: 'FUNDAMENTAL_CALENDAR' as MainNavTab, label: 'Fundamental News', icon: Calendar, highlight: 'NEWS', desc: 'Macro catalysts' },
        { id: 'FREEHAND_WORKSPACE' as MainNavTab, label: 'Freehand Canvas', icon: PenTool, desc: 'Chart sketching' },
        { id: 'COMMUNITY' as MainNavTab, label: 'Community Feed', icon: Users, desc: 'Trader discussions' },
        { id: 'BOOK_SESSION' as MainNavTab, label: 'Book 1-on-1 Session', icon: MessageSquare, desc: 'Strategy coaching' },
      ],
    },
    {
      title: 'SYSTEM & VAULT',
      items: [
        { id: 'SETTINGS' as MainNavTab, label: 'Data Export & Backup', icon: Settings2, desc: 'JSON vault backup' },
        ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' || currentUser?.isDeveloper || currentUser?.username === 'primepipfx-admin'
          ? [
              { id: 'ADMIN' as MainNavTab, label: 'Owner Admin Panel', icon: ShieldCheck, highlight: 'SECURE', desc: 'System vault' },
              { id: 'EVOLUTION' as MainNavTab, label: 'Evolution Engine', icon: Cpu, highlight: 'AI', desc: 'Adaptive intelligence' },
            ]
          : []),
      ],
    },
  ];

  const handleSelectMoreItem = (id: MainNavTab) => {
    setIsMoreMenuOpen(false);
    if (id === 'EVOLUTION' && onOpenEvolution) {
      onOpenEvolution();
    } else {
      onSelectTab(id);
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay for "More" Navigation */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsMoreMenuOpen(false)}
          />
          <div className="bg-[#0B0F19] border-t border-slate-800 rounded-t-3xl p-5 max-h-[82vh] overflow-y-auto pb-8 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-military font-bold text-slate-100 text-sm tracking-wider">
                  TACTICAL NAVIGATION
                </span>
                <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                  ALL MODULES
                </span>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {categorizedMoreItems.map((cat) => (
                <div key={cat.title} className="space-y-2">
                  <div className="text-[10px] font-mono-code font-bold text-amber-400/90 tracking-wider uppercase border-b border-slate-800/80 pb-1">
                    {cat.title}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectMoreItem(item.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                            isItemActive
                              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold'
                              : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isItemActive
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-850 text-amber-400'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-military tracking-wide truncate">
                              {item.label}
                            </div>
                            <div className="text-[10px] font-mono-code text-slate-400 truncate">
                              {item.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {onOpenBackupModal && (
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenBackupModal();
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-military font-bold tracking-wider hover:border-amber-500/40 transition"
              >
                <Settings2 className="w-4 h-4 text-amber-400" />
                <span>DATA EXPORT & RESTORE CENTER</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Bottom App Bar (Only visible on screens < md) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden prime-dock-blur px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
                  isActive
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                    isActive
                      ? item.calm
                        ? 'bg-indigo-500/25 text-indigo-300 shadow-sm shadow-indigo-500/20'
                        : 'bg-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/20 scale-105'
                      : 'bg-transparent text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 animate-in fade-in zoom-in" />
                )}
              </button>
            );
          })}

          {/* Quick Action: Center New Trade Action Button */}
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

          {/* More Drawer Button */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 min-w-[56px] min-h-[44px] prime-ios-touch cursor-pointer ${
              isMoreMenuOpen ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                isMoreMenuOpen ? 'bg-amber-500/20 text-amber-400' : 'bg-transparent text-slate-400'
              }`}
            >
              <Menu className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-military tracking-tight mt-0.5 select-none">
              More
            </span>
            {isMoreMenuOpen && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-amber-400" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
