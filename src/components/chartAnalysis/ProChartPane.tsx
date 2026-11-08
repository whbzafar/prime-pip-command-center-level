import React, { useEffect, useRef } from 'react';
import { KLineChartPro } from '@klinecharts/pro';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS, type FeedStatus } from './fullHistoryDatafeed';

export interface ProPaneState { ticker: string; period: string }

const findPeriod = (text: string) => PRO_PERIODS.find((p) => p.text === text) || PRO_PERIODS[5];
const findSymbol = (ticker: string) =>
  CATALOG.find((c) => c.ticker === ticker) ||
  (/USDT$/.test(ticker)
    ? { ticker, name: ticker, shortName: ticker, market: 'crypto', exchange: 'Binance', pricePrecision: 4, volumePrecision: 2, binance: ticker }
    : { ticker, name: ticker, shortName: ticker, market: 'stocks', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: `${ticker.toLowerCase()}ususd`, yahoo: ticker });

/**
 * One TradingView-style chart (KLineChart Pro): symbol search, period bar, drawing toolbar,
 * indicators, settings, screenshot — fed by FullHistoryDatafeed, which keeps loading older bars as
 * you scroll left until the instrument's first recorded data.
 */
export const ProChartPane: React.FC<{
  state: ProPaneState;
  onStateChange: (s: ProPaneState) => void;
  onStatus?: (s: FeedStatus) => void;
  onToggleFullscreen?: () => void;
}> = ({ state, onStateChange, onStatus, onToggleFullscreen }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<KLineChartPro | null>(null);
  const feedRef = useRef<FullHistoryDatafeed | null>(null);
  const lastReported = useRef<ProPaneState>(state);
  const cbRef = useRef(onStateChange);
  cbRef.current = onStateChange;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  const fsRef = useRef(onToggleFullscreen);
  fsRef.current = onToggleFullscreen;

  // Create once
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const feed = new FullHistoryDatafeed((st) => statusRef.current?.(st));
    feedRef.current = feed;
    chartRef.current = new KLineChartPro({
      container: host,
      theme: 'dark',
      locale: 'en-US',
      watermark: '',
      drawingBarVisible: true,
      symbol: findSymbol(state.ticker),
      period: findPeriod(state.period),
      periods: PRO_PERIODS,
      timezone: 'Etc/UTC',
      mainIndicators: ['MA'],
      subIndicators: ['VOL'],
      datafeed: feed,
    });
    // Report changes made inside the chart (its own symbol search / period bar) back to the workspace.
    const iv = setInterval(() => {
      const c = chartRef.current;
      if (!c) return;
      const s = { ticker: c.getSymbol().ticker, period: c.getPeriod().text };
      if (s.ticker !== lastReported.current.ticker || s.period !== lastReported.current.period) {
        lastReported.current = s;
        cbRef.current(s);
      }
    }, 800);
    // The library's own Full Screen button calls requestFullscreen() with no fallback, which
    // browsers refuse inside frames or without permission. Take it over (capture phase) and use
    // the workspace's full screen, which falls back to a full-window overlay.
    const onClickCapture = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      const item = target?.closest('.klinecharts-pro-period-bar .item.tools') as HTMLElement | null;
      if (!item) return;
      const tools = host.querySelectorAll('.klinecharts-pro-period-bar .item.tools');
      if (tools.length && item === tools[tools.length - 1] && fsRef.current) {
        ev.stopPropagation();
        ev.preventDefault();
        fsRef.current();
      }
    };
    host.addEventListener('click', onClickCapture, true);
    // Keep the canvas sized to its pane (layout changes, full screen, height slider).
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    });
    ro.observe(host);
    return () => {
      host.removeEventListener('click', onClickCapture, true);
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearInterval(iv);
      feed.destroy();
      chartRef.current = null;
      host.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply changes coming from the workspace (quick symbols, sync, multi-timeframe)
  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    if (c.getSymbol().ticker !== state.ticker) c.setSymbol(findSymbol(state.ticker));
    if (c.getPeriod().text !== state.period) c.setPeriod(findPeriod(state.period));
    lastReported.current = state;
  }, [state.ticker, state.period]);

  return <div ref={hostRef} className="ppfx-pro-chart w-full h-full" />;
};
