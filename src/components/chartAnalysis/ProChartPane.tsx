import React, { useCallback, useEffect, useRef } from 'react';
import { KLineChartPro } from '@klinecharts/pro';
import { ProDrawingToolbar } from './ProDrawingToolbar';
import { resolveProChart } from '../../utils/chartPersist';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { enhanceIndicatorDialogs } from '../../utils/indicatorCategories';
import { canvasStyles, getCanvasColor, isLightCanvas, onCanvasColor } from '../../utils/chartCanvas';
import { loadIndicators } from '../../utils/chartPersist';
import { useProPersistence } from '../../utils/useProPersistence';
import { CanvasColorControl } from './CanvasColorControl';
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
    const bg0 = getCanvasColor();
    const savedInd = loadIndicators(); // indicators the user had on the chart last time
    chartRef.current = new KLineChartPro({
      container: host,
      theme: isLightCanvas(bg0) ? 'light' : 'dark',
      locale: 'en-US',
      watermark: '',
      drawingBarVisible: false, // replaced by the TradingView-style toolbar (ProDrawingToolbar)
      symbol: findSymbol(state.ticker),
      period: findPeriod(state.period),
      periods: PRO_PERIODS,
      timezone: 'Etc/UTC',
      mainIndicators: savedInd ? savedInd.main.map((i) => i.name) : ['MA'],
      subIndicators: savedInd ? savedInd.sub.map((i) => i.name) : ['VOL'],
      datafeed: feed,
    });
    // Canvas colour: white by default, or the colour the user picked. Re-applied whenever it changes.
    const applyCanvas = (bg: string) => {
      const c = chartRef.current; if (!c) return;
      host.style.setProperty('--klinecharts-pro-background-color', bg);
      host.style.setProperty('--klinecharts-pro-popover-background-color', isLightCanvas(bg) ? '#ffffff' : '#1c1c1f');
      try { c.setTheme(isLightCanvas(bg) ? 'light' : 'dark'); c.setStyles(canvasStyles(bg) as any); } catch { /* chart still starting */ }
    };
    applyCanvas(bg0);
    const t1 = window.setTimeout(() => applyCanvas(getCanvasColor()), 600);
    const offCanvas = onCanvasColor(applyCanvas);
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
    const unEnhance = enhanceIndicatorDialogs(host);
    // Keep the canvas sized to its pane (layout changes, full screen, height slider).
    let raf = 0;
    const fit = () => {
      window.dispatchEvent(new Event('resize'));
      try { const inner = resolveProChart(host); inner?.resize(); } catch { /* chart still starting */ }
    };
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    ro.observe(host); if (host.parentElement) ro.observe(host.parentElement);
    const fitTimers = [300, 1200, 3000].map((ms) => window.setTimeout(fit, ms)); // layout settles after first paint / data load
    window.addEventListener('orientationchange', fit);
    // Keep the chart's top-right buttons (Settings / Screenshot) clear of the floating Announcements buttons.
    const clearFloat = () => {
      const r = host.getBoundingClientRect();
      const under = r.top < 56 && r.bottom > 80 && r.right > window.innerWidth - 300;
      document.documentElement.classList.toggle('ppfx-chart-under-float', under);
    };
    window.addEventListener('scroll', clearFloat, { passive: true }); window.addEventListener('resize', clearFloat); clearFloat();
    return () => {
      host.removeEventListener('click', onClickCapture, true);
      unEnhance();
      ro.disconnect();
      fitTimers.forEach(clearTimeout); window.removeEventListener('orientationchange', fit);
      window.removeEventListener('scroll', clearFloat); window.removeEventListener('resize', clearFloat); document.documentElement.classList.remove('ppfx-chart-under-float');
      cancelAnimationFrame(raf);
      clearInterval(iv);
      clearTimeout(t1);
      offCanvas();
      feed.destroy();
      chartRef.current = null;
      host.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save: drawings and indicators come back exactly as left.
  const liveTicker = useCallback(() => chartRef.current?.getSymbol().ticker ?? null, []);
  useProPersistence(hostRef, liveTicker);
  const getInner = useCallback(() => (hostRef.current ? resolveProChart(hostRef.current) : null), []);

  // Zoom +/−: zoom, then snap back to the live edge so you are never lost in old history. Reset: latest bar at default zoom.
  const zoomBy = useCallback((k: number) => { const c = getInner(); if (!c) return; try { c.zoomAtCoordinate(k, undefined, 120); window.setTimeout(() => { try { c.scrollToRealTime(160); } catch { /* ignore */ } }, 140); } catch { /* ignore */ } }, [getInner]);
  const resetView = useCallback(() => { const c = getInner(); if (!c) return; try { c.setBarSpace(8); c.scrollToRealTime(200); } catch { /* ignore */ } }, [getInner]);

  // Apply changes coming from the workspace (quick symbols, sync, multi-timeframe)
  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    if (c.getSymbol().ticker !== state.ticker) c.setSymbol(findSymbol(state.ticker));
    if (c.getPeriod().text !== state.period) c.setPeriod(findPeriod(state.period));
    lastReported.current = state;
  }, [state.ticker, state.period]);

  return (
    <div className="relative w-full h-full flex">
      <ProDrawingToolbar getChart={getInner} />
      <div ref={hostRef} className="ppfx-pro-chart h-full min-w-0 flex-1 ml-12" />
      <CanvasColorControl className="absolute bottom-12 right-32 z-20" />
      <div className="absolute bottom-12 right-20 z-20 flex items-center gap-1.5" data-testid="unl-zoom-controls">
        <button type="button" title="Zoom out — returns to the latest price" aria-label="Zoom out" data-testid="unl-zoom-out" onClick={() => zoomBy(0.8)} className="w-9 h-9 rounded-full bg-slate-900/90 border border-slate-600 text-slate-200 hover:text-white hover:border-cyan-400 shadow-lg flex items-center justify-center text-lg font-bold leading-none cursor-pointer">−</button>
        <button type="button" title="Zoom in — returns to the latest price" aria-label="Zoom in" data-testid="unl-zoom-in" onClick={() => zoomBy(1.25)} className="w-9 h-9 rounded-full bg-slate-900/90 border border-slate-600 text-slate-200 hover:text-white hover:border-cyan-400 shadow-lg flex items-center justify-center text-lg font-bold leading-none cursor-pointer">+</button>
        <button type="button" title="Reset chart: back to the latest bar at normal zoom" aria-label="Reset chart" data-testid="unl-reset" onClick={resetView} className="w-9 h-9 rounded-full bg-slate-900/90 border border-slate-600 text-slate-200 hover:text-white hover:border-cyan-400 shadow-lg flex items-center justify-center text-lg font-bold leading-none cursor-pointer">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" /></svg>
        </button>
      </div>
    </div>
  );
};
