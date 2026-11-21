import { useEffect, type RefObject } from 'react';
import type { Chart } from 'klinecharts';
import { loadIndicators, loadOverlays, resolveProChart, restoreOverlays, startAutoSave } from './chartPersist';

/**
 * Auto-save / restore for the Pro (KLineChart Pro) chart: once the chart is up, put back the drawings saved for
 * the instrument on screen, keep saving every change, and do the same again whenever the instrument changes.
 */
export function useProPersistence(hostRef: RefObject<HTMLDivElement | null>, getTicker: () => string | null) {
  useEffect(() => {
    let chart: Chart | null = null; let loadedFor = ''; let ready = false; let changedAt = 0; let stopSave: (() => void) | null = null; let indApplied = false;
    const iv = window.setInterval(() => {
      const host = hostRef.current; if (!host) return;
      if (!chart) {
        chart = resolveProChart(host); if (!chart) return;
        stopSave = startAutoSave(chart, () => loadedFor, () => ready && loadedFor === getTicker());
      }
      const t = getTicker(); if (!t) return;
      if (t !== loadedFor) { if (!changedAt) changedAt = Date.now(); ready = false; }
      if (ready || !changedAt) return;
      if (Date.now() - changedAt < 800 || chart.getDataList().length === 0) return; // let the library finish switching / loading first
      restoreOverlays(chart, loadOverlays(t));
      if (!indApplied) { // indicator settings (periods etc.) saved earlier
        indApplied = true;
        const saved = loadIndicators();
        try { for (const i of [...(saved?.main || []), ...(saved?.sub || [])]) if (i.calcParams?.length) chart.overrideIndicator({ name: i.name, calcParams: i.calcParams }); } catch { /* ignore */ }
      }
      loadedFor = t; ready = true; changedAt = 0;
    }, 400);
    return () => { window.clearInterval(iv); stopSave?.(); };
  }, [hostRef, getTicker]);
}
