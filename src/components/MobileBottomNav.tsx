import React from 'react';
import {
  Activity,
  BookOpen,
  Brain,
  Crosshair,
  Plus,
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
}) => {
  const mainItems = [
    { id: 'DASHBOARD' as MainNavTab, label: 'Dash', icon: Activity },
    { id: 'JOURNAL' as MainNavTab, label: 'Vault', icon: BookOpen },
    { id: 'PSYCHOLOGY' as MainNavTab, label: 'Mindset', icon: Brain, calm: true },
    { id: 'RISK' as MainNavTab, label: 'Risk', icon: Crosshair },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden prime-dock-blur px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {mainItems.slice(0, 2).map((item) => {
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
                    ? 'bg-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/20 scale-105'
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

        {mainItems.slice(2, 4).map((item) => {
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
      </div>
    </nav>
  );
};
