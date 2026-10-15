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
      // Look back n periods (e.g. 12 for monthly, 4 for quarterly, 252 for daily)
      const lookback = spec.n ?? 12;
      for (let i = 0; i < series.length; i++) {
        if (i < lookback) continue;
        const prev = series[i - lookback].value;
        const curr = series[i].value;
        // Absolute difference (for rates/percentage points) or percentage change
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
      // 3-month annualized growth: ((1 + 3m_change / prev)^4 - 1) * 100
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
        const rank = ((strictlyLess + 0.5 * equals) / windowVals.length) * 100;
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
 * Inputs are matched strictly on identical period_date (point-in-time alignment).
 */
export function computeDerivedSeries(
  formula: 'us_2y_minus_fedfunds' | 'yield_curve_slope' | 'real_yield' | 'cftc_net_spec_pct_oi',
  seriesA: PointInTimeObservation[],
  seriesB: PointInTimeObservation[]
): PointInTimeObservation[] {
  if (!seriesA || !seriesB || seriesA.length === 0 || seriesB.length === 0) {
    return [];
  }

  // Create lookup map for series B by period_date
  const mapB = new Map<string, PointInTimeObservation>();
  for (const item of seriesB) {
    mapB.set(item.periodDate, item);
  }

  const result: PointInTimeObservation[] = [];

  for (const itemA of seriesA) {
    const itemB = mapB.get(itemA.periodDate);
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

    // Released timestamp is the later of the two releases (conservative auditability)
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
