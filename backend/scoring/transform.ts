import { PointInTimeObservation } from './data.js';
import { TransformSpec } from './modelConfig.js';

/**
 * Applies a mathematical transform to an ascending point-in-time time series.
 * Returns a new time series of transformed values.
 */
export function applyTransform(
  series: PointInTimeObservation[],
  spec: TransformSpec
): PointInTimeObservation[] {
  if (!series || series.length === 0) return [];

  const n = spec.n ?? 1;
  const result: PointInTimeObservation[] = [];

  switch (spec.type) {
    case 'level':
      return series.map((s) => ({ ...s }));

    case 'change_n': {
      for (let i = 0; i < series.length; i++) {
        if (i < n) continue;
        const delta = series[i].value - series[i - n].value;
        result.push({
          periodDate: series[i].periodDate,
          value: delta,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'pct_change_n': {
      for (let i = 0; i < series.length; i++) {
        if (i < n) continue;
        const prev = series[i - n].value;
        const curr = series[i].value;
        const pct = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
        result.push({
          periodDate: series[i].periodDate,
          value: pct,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'yoy': {
      const lookback = spec.n ?? 12;
      for (let i = 0; i < series.length; i++) {
        if (i < lookback) continue;
        const prev = series[i - lookback].value;
        const curr = series[i].value;
        const change = curr - prev;
        result.push({
          periodDate: series[i].periodDate,
          value: change,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'annualized_3m': {
      // 3-month annualized growth: ((curr / prev_3m)^4 - 1) * 100
      const periods = spec.n ?? 3;
      for (let i = 0; i < series.length; i++) {
        if (i < periods) continue;
        const prev = series[i - periods].value;
        const curr = series[i].value;
        if (prev <= 0) continue;
        const quarterlyRatio = curr / prev;
        const annualizedPct = (Math.pow(quarterlyRatio, 4) - 1) * 100;
        result.push({
          periodDate: series[i].periodDate,
          value: annualizedPct,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'avg_n': {
      for (let i = 0; i < series.length; i++) {
        if (i < n - 1) continue;
        const window = series.slice(i - n + 1, i + 1);
        const avg = window.reduce((sum, item) => sum + item.value, 0) / n;
        result.push({
          periodDate: series[i].periodDate,
          value: avg,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'avg_change_n': {
      // Average of last n monthly changes (e.g. PAYEMS)
      for (let i = 0; i < series.length; i++) {
        if (i < n) continue;
        let sumDelta = 0;
        for (let j = 0; j < n; j++) {
          sumDelta += (series[i - j].value - series[i - j - 1].value);
        }
        result.push({
          periodDate: series[i].periodDate,
          value: sumDelta / n,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'avg_level_change_20d': {
      // High yield spread: level plus change 20d averaged
      for (let i = 0; i < series.length; i++) {
        if (i < n) continue;
        const delta = series[i].value - series[i - n].value;
        const blended = (series[i].value + delta) / 2.0;
        result.push({
          periodDate: series[i].periodDate,
          value: blended,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'return_n': {
      for (let i = 0; i < series.length; i++) {
        if (i < n) continue;
        const prev = series[i - n].value;
        const curr = series[i].value;
        const ret = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
        result.push({
          periodDate: series[i].periodDate,
          value: ret,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'return_plus_ma_distance': {
      // DTWEXBGS: return 120d plus ma_distance 200d
      const retPeriods = spec.n ?? 120;
      const maPeriods = spec.ma_n ?? 200;
      const requiredLookback = Math.max(retPeriods, maPeriods);
      for (let i = 0; i < series.length; i++) {
        if (i < requiredLookback) continue;
        const prev = series[i - retPeriods].value;
        const curr = series[i].value;
        const ret = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;

        const maWindow = series.slice(i - maPeriods + 1, i + 1);
        const ma = maWindow.reduce((s, it) => s + it.value, 0) / maPeriods;
        const dist = ma !== 0 ? ((curr - ma) / Math.abs(ma)) * 100 : 0;

        result.push({
          periodDate: series[i].periodDate,
          value: (ret + dist) / 2.0,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'ma_distance': {
      for (let i = 0; i < series.length; i++) {
        if (i < n - 1) continue;
        const window = series.slice(i - n + 1, i + 1);
        const ma = window.reduce((sum, item) => sum + item.value, 0) / n;
        const curr = series[i].value;
        const dist = ma !== 0 ? ((curr - ma) / Math.abs(ma)) * 100 : 0;
        result.push({
          periodDate: series[i].periodDate,
          value: dist,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    case 'percentile_rank': {
      const windowSize = spec.n ?? 60;
      for (let i = 0; i < series.length; i++) {
        const startIdx = Math.max(0, i - windowSize + 1);
        const windowVals = series.slice(startIdx, i + 1).map((x) => x.value);
        const curr = series[i].value;
        const strictlyLess = windowVals.filter((v) => v < curr).length;
        const equals = windowVals.filter((v) => v === curr).length;
        const rank = ((strictlyLess + 0.5 * equals) / windowVals.length);
        result.push({
          periodDate: series[i].periodDate,
          value: rank,
          releasedAt: series[i].releasedAt,
        });
      }
      return result;
    }

    default:
      return series.map((s) => ({ ...s }));
  }
}

/**
 * Computes derived macroeconomic and positioning indicators from primary series.
 * Inputs are matched on period_date with backward-fill fallback for cross-frequency series.
 */
export function computeDerivedSeries(
  formula: 'us_2y_minus_fedfunds' | 'yield_curve_slope' | 'real_yield' | 'cftc_net_spec_pct_oi',
  seriesA: PointInTimeObservation[],
  seriesB: PointInTimeObservation[]
): PointInTimeObservation[] {
  if (!seriesA || !seriesB || seriesA.length === 0 || seriesB.length === 0) {
    return [];
  }

  // Exact lookup map for series B by period_date
  const mapB = new Map<string, PointInTimeObservation>();
  for (const item of seriesB) {
    mapB.set(item.periodDate, item);
  }

  const sortedB = [...seriesB].sort((a, b) => a.periodDate.localeCompare(b.periodDate));
  const result: PointInTimeObservation[] = [];

  for (const itemA of seriesA) {
    let itemB = mapB.get(itemA.periodDate);

    // If no exact date match (e.g. daily DGS2 vs monthly FEDFUNDS), find the latest B on or before A
    if (!itemB) {
      for (let i = sortedB.length - 1; i >= 0; i--) {
        if (sortedB[i].periodDate <= itemA.periodDate) {
          itemB = sortedB[i];
          break;
        }
      }
    }

    if (!itemB) continue;

    let derivedValue = 0;
    switch (formula) {
      case 'us_2y_minus_fedfunds':
        // 2Y Treasury yield minus Fed Funds Rate
        derivedValue = itemA.value - itemB.value;
        break;

      case 'yield_curve_slope':
        // 10Y Treasury yield minus 2Y Treasury yield
        derivedValue = itemA.value - itemB.value;
        break;

      case 'real_yield':
        // 10Y Nominal yield minus 10Y Breakeven inflation expectation
        derivedValue = itemA.value - itemB.value;
        break;

      case 'cftc_net_spec_pct_oi':
        // Net speculative positioning / Total Open Interest * 100
        if (itemB.value > 0) {
          derivedValue = (itemA.value / itemB.value) * 100;
        }
        break;
    }

    const relA = new Date(itemA.releasedAt).getTime();
    const relB = new Date(itemB.releasedAt).getTime();
    const laterReleasedAt = relA >= relB ? itemA.releasedAt : itemB.releasedAt;

    result.push({
      periodDate: itemA.periodDate,
      value: derivedValue,
      releasedAt: laterReleasedAt,
    });
  }

  return result.sort((a, b) => a.periodDate.localeCompare(b.periodDate));
}
