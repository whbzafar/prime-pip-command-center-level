import React from 'react';
import {
  Bookmark,
  AlarmClock,
  BarChart2,
  PieChart,
  CalendarDays,
  Newspaper,
  Users2,
  Calendar,
  Palette,
} from 'lucide-react';
import { RightSideToolId } from '../ProTradingView';

export interface TradingViewVerticalToolbarProps {
  activeTool: RightSideToolId | null;
  onToggleTool: (tool: RightSideToolId) => void;
  onOpenSettings: () => void;
  watchlistCount: number;
  alertsCount: number;
}

export const TradingViewVerticalToolbar: React.FC<TradingViewVerticalToolbarProps> = ({
  activeTool,
  onToggleTool,
  onOpenSettings,
  watchlistCount,
  alertsCount,
}) => {
  const tools = [
    { id: 'WATCHLIST' as const, icon: Bookmark, label: 'Watchlist & Details', badge: watchlistCount },
    { id: 'ALERTS' as const, icon: AlarmClock, label: 'Price Alerts', badge: alertsCount },
    { id: 'TECHNICALS' as const, icon: BarChart2, label: 'Technical Analysis (TradingView)' },
    { id: 'SENTIMENT' as const, icon: PieChart, label: 'Market Sentiment & Institutional COT' },
    { id: 'SEASONALITY' as const, icon: CalendarDays, label: 'Monthly Seasonality Tendencies' },
    { id: 'NEWS' as const, icon: Newspaper, label: 'Pair-Specific News & Headlines' },
    { id: 'COMMUNITY' as const, icon: Users2, label: 'Community Insights & Trader Setups' },
    { id: 'CALENDAR' as const, icon: Calendar, label: 'Economic Calendar' },
  ];

  return (
    <div className="w-11 bg-[#0B0F19] border-l border-slate-800/80 flex flex-col items-center justify-between py-2 z-20 shrink-0 select-none">
      {/* Top Dock Tools */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onToggleTool(tool.id)}
              title={tool.label}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer relative ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tool.badge !== undefined && tool.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center font-mono ring-2 ring-slate-950">
                  {tool.badge > 9 ? '9+' : tool.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Settings Button */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <button
          type="button"
          onClick={onOpenSettings}
          title="Chart Appearance & Background Settings"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition cursor-pointer"
        >
          <Palette className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
