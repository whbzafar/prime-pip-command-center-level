/**
 * SCORING ENGINE
 *
 * Indicator sub-score (−100 … +100):
 *   surprise  = (actual − forecast) / scale      weight 0.45
 *   momentum  = (actual − previous) / scale      weight 0.30
 *   level     = (actual − anchor)   / levelScale weight 0.25   (only where an anchor exists)
 *   each z is squashed with tanh(0.8·z) so one "typical" surprise ≈ ±0.66 and outliers saturate,
 *   weights are renormalized over the components that exist, then × polarity × 100.
 *
 * Freshness: an indicator keeps full weight for 1.5× its release interval, then decays
 * linearly to 25% at 4.5× — so old data still informs, but never dominates.
 *
 * Pillar score = freshness-weighted mean of its indicators.
 * Asset score  = pillar-weighted mean; pillars with thin coverage are shrunk (0.5 + 0.5·coverage).
 * Bullish %    = (score + 100) / 2. This is a model bias score — NOT a probability of price direction.
 */
import { CONCEPTS, COUNTRY_PATTERNS, FREQ_DAYS, type ConceptDef, type Freq, type Pattern } from './concepts.js';
import type { TvEvent } from './sources/tvCalendar.js';
import type { AssetClass, AssetResult, Bias, IndicatorResult, Observation, PillarResult, ScoreComponent } from './types.js';

export const METHODOLOGY_VERSION = 'PPFA-1.0';

// ───────────────────────────────────────── spec types

export interface CalSpec {
  kind: 'cal';
  id: string;
  concept: string;
  country: string;
  polarity: 1 | -1;
  weight: number;
  polarityNote: string;
  name?: string;
  desc?: string;
  scale?: number;
  level?: { neutral: number; scale: number; label: string } | null;
  /** components to use; default all available */
  use?: Array<'surprise' | 'momentum' | 'level'>;
}

export interface CustomOut {
  observation: Observation;
  components: ScoreComponent[]; // values already in −1..+1, BEFORE polarity
  reasoning: string;
  ageDays: number;
  intervalDays: number;
}

export interface CustomSpec {
  kind: 'custom';
  id: string;
  name: string;
  desc: string;
  freq: string;
  polarity: 1 | -1;
  weight: number;
  polarityNote: string;
  compute: (ctx: EngineContext) => CustomOut | null;
}

export type IndicatorSpec = CalSpec | CustomSpec;

export interface PillarSpec {
  id: string;
  name: string;
  desc: string;
  weight: number;
  indicators: IndicatorSpec[];
  /** Optional pillar that mirrors another asset's score (e.g. "US Dollar (inverse)"). */
  mirror?: { asset: string; sign: 1 | -1 };
}

export interface AssetSpec {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  pillars: PillarSpec[];
  /** Context words used in summaries, e.g. "hawkish" for currencies. */
  meta?: Record<string, string | number | null>;
}

export interface EngineContext {
  now: number;
  events: TvEvent[];
  results: Map<string, AssetResult>;
  /** country → policy rate / cpi used for cross-sectional differentials */
  policy: Map<string, { rate: number | null; cpi: number | null; rateEvent: TvEvent | null; cpiEvent: TvEvent | null }>;
}

// ───────────────────────────────────────── helpers

export const squash = (z: number) => Math.tanh(0.8 * z);
export const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

export function biasFromScore(score: number | null): Bias {
  if (score === null) return 'NEUTRAL';
  if (score >= 60) return 'STRONG_BULLISH';
  if (score >= 30) return 'BULLISH';
  if (score >= 10) return 'MILD_BULLISH';
  if (score > -10) return 'NEUTRAL';
  if (score > -30) return 'MILD_BEARISH';
  if (score > -60) return 'BEARISH';
  return 'STRONG_BEARISH';
}

export function biasLabel(b: Bias): string {
  return b.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function freshnessFactor(ageDays: number, intervalDays: number): number {
  const full = 1.5 * intervalDays;
  if (ageDays <= full) return 1;
  const end = 4.5 * intervalDays;
  if (ageDays >= end) return 0.25;
  return 1 - 0.75 * ((ageDays - full) / (end - full));
}

function fmt(v: number | null | undefined, unit = ''): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const s = abs >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : String(round(v, abs < 1 ? 3 : 2));
  return unit === '%' ? `${s}%` : unit ? `${s}${unit.length <= 2 ? unit : ' ' + unit}` : s;
}

// ───────────────────────────────────────── calendar matching

export function patternsFor(concept: string, country: string): Pattern[] {
  return COUNTRY_PATTERNS[country]?.[concept] || CONCEPTS[concept]?.patterns || [];
}

export interface Match { event: TvEvent; pattern: Pattern }

/** Most recent RELEASED print for a concept in a country (first pattern with any data wins). */
export function findLatest(events: TvEvent[], concept: string, country: string, now: number): Match | null {
  const def = CONCEPTS[concept];
  if (!def) return null;
  for (const pattern of patternsFor(concept, country)) {
    let best: TvEvent | null = null;
    for (const e of events) {
      if (e.country !== country || e.actual === null || e.timestamp > now + 60_000) continue;
      if (!pattern.re.test(e.key)) continue;
      if (def.exclude && def.exclude.test(e.key)) continue;
      if (!best || e.timestamp > best.timestamp) best = e;
    }
    if (best) return { event: best, pattern };
  }
  return null;
}

/** Next scheduled (not yet released) print for a concept in a country. */
export function findNext(events: TvEvent[], concept: string, country: string, now: number): TvEvent | null {
  const def = CONCEPTS[concept];
  if (!def) return null;
  let best: TvEvent | null = null;
  for (const pattern of patternsFor(concept, country)) {
    for (const e of events) {
      if (e.country !== country || e.timestamp < now - 5 * 60_000 || e.actual !== null) continue;
      if (!pattern.re.test(e.key) || (def.exclude && def.exclude.test(e.key))) continue;
      if (!best || e.timestamp < best.timestamp) best = e;
    }
    if (best) return best;
  }
  return null;
}

// ───────────────────────────────────────── indicator scoring

function effectiveScale(def: ConceptDef, spec: CalSpec, m: Match): number {
  let s = spec.scale ?? m.pattern.scale ?? def.scale;
  const e = m.event;
  if (def.scaleMode === 'relative') {
    const ref = Math.abs(e.previous ?? e.actual ?? 0);
    return Math.max(ref * s, 1e-6);
  }
  if (def.scaleMode === 'auto_k') {
    const mags = [e.actual, e.forecast, e.previous].filter((v): v is number => v !== null).map(Math.abs).sort((a, b) => a - b);
    const med = mags.length ? mags[Math.floor(mags.length / 2)] : 0;
    // Feed delivered raw counts instead of thousands (or millions for inventories)
    if (med > 5000 && s < 1000) s *= 1000;
    if (med > 5_000_000 && s < 1_000_000) s *= 1000;
  }
  return s;
}

export function scoreCalendar(spec: CalSpec, ctx: EngineContext): IndicatorResult {
  const def = CONCEPTS[spec.concept];
  const name = spec.name || def.name;
  const desc = spec.desc || def.desc;
  const base: IndicatorResult = {
    id: spec.id,
    name,
    description: desc,
    frequency: def.freq,
    weight: spec.weight,
    effectiveWeight: 0,
    score: null,
    status: 'missing',
    observation: null,
    components: [],
    reasoning: `No released ${name} print found for ${spec.country} in the last 400 days of the TradingView calendar. Excluded from the score.`,
    polarityNote: spec.polarityNote,
  };
  const m = findLatest(ctx.events, spec.concept, spec.country, ctx.now);
  if (!m) return base;
  const e = m.event;
  const A = e.actual as number;
  // Range check is done in the concept's native units (thousands for auto_k counts)
  const rangeFactor = def.scaleMode === 'auto_k' && effectiveScale(def, spec, m) >= 1000 * (spec.scale ?? m.pattern.scale ?? def.scale) ? 1000 : 1;
  if (def.range && (A / rangeFactor < def.range[0] || A / rangeFactor > def.range[1])) {
    return { ...base, reasoning: `Rejected implausible print ${A} for ${name} (outside ${def.range.join('…')}). Excluded until a valid value arrives.` };
  }

  const scale = effectiveScale(def, spec, m);
  const comps: ScoreComponent[] = [];
  const use = spec.use || ['surprise', 'momentum', 'level'];
  const isRate = def.mode === 'rate';

  if (use.includes('surprise') && e.forecast !== null) {
    const z = (A - e.forecast) / (isRate ? 0.1 : scale);
    comps.push({
      key: 'surprise', label: 'Surprise vs forecast', value: squash(z), weight: isRate ? 0.35 : 0.45,
      detail: `${fmt(A, e.unit)} vs forecast ${fmt(e.forecast, e.unit)} (${A - e.forecast >= 0 ? '+' : ''}${fmt(A - e.forecast)})`,
    });
  }
  if (use.includes('momentum') && e.previous !== null) {
    const z = (A - e.previous) / (isRate ? 0.25 : scale);
    comps.push({
      key: 'momentum', label: isRate ? 'Rate change' : 'Change vs previous', value: squash(z), weight: isRate ? 0.65 : 0.3,
      detail: `${fmt(A, e.unit)} vs previous ${fmt(e.previous, e.unit)} (${A - e.previous >= 0 ? '+' : ''}${fmt(A - e.previous)})`,
    });
  }
  const level = spec.level === null ? undefined : spec.level || def.level;
  if (use.includes('level') && level && !isRate) {
    const z = (A - level.neutral) / level.scale;
    comps.push({
      key: 'level', label: 'Level vs anchor', value: squash(z), weight: 0.25,
      detail: `${fmt(A, e.unit)} vs ${fmt(level.neutral, e.unit)} (${level.label})`,
    });
  }
  if (!comps.length) {
    return { ...base, observation: obsFromEvent(e), reasoning: `${name} released (${fmt(A, e.unit)}) but no forecast/previous was published to compare against.` };
  }
  const wsum = comps.reduce((s, c) => s + c.weight, 0);
  const raw = comps.reduce((s, c) => s + c.value * c.weight, 0) / wsum;
  const score = round(clamp(raw * spec.polarity) * 100, 1);

  const interval = FREQ_DAYS[def.freq as Freq] ?? 31;
  const ageDays = (ctx.now - e.timestamp) / 86_400_000;
  // A rate stance persists between meetings; only decay after ~2 missed meetings
  const fresh = isRate ? freshnessFactor(ageDays, 75) : freshnessFactor(ageDays, interval);
  const status = ageDays <= (isRate ? 150 : interval * 2.2) ? 'live' : 'stale';

  return {
    ...base,
    effectiveWeight: spec.weight * fresh,
    score,
    status,
    observation: obsFromEvent(e),
    components: comps,
    reasoning: explainCalendar(name, spec, comps, score, e, ageDays, fresh),
  };
}

function obsFromEvent(e: TvEvent): Observation {
  return {
    actual: e.actual as number,
    forecast: e.forecast,
    previous: e.previous,
    releasedAt: e.iso,
    period: e.period || undefined,
    unit: [e.scale, e.unit].filter(Boolean).join(''),
    sourceTitle: e.title,
    sourceName: e.source && e.source !== 'TradingView' ? `${e.source} via TradingView` : 'TradingView Economic Calendar',
    sourceUrl: e.sourceUrl,
  };
}

function explainCalendar(name: string, spec: CalSpec, comps: ScoreComponent[], score: number, e: TvEvent, ageDays: number, fresh: number): string {
  const parts: string[] = [];
  const s = comps.find((c) => c.key === 'surprise');
  const m = comps.find((c) => c.key === 'momentum');
  const l = comps.find((c) => c.key === 'level');
  parts.push(`${e.title}${e.period ? ` (${e.period})` : ''} printed ${fmt(e.actual, e.unit)}.`);
  if (s) parts.push(`${(e.actual as number) > (e.forecast as number) ? 'Above' : (e.actual as number) < (e.forecast as number) ? 'Below' : 'In line with'} forecast ${fmt(e.forecast, e.unit)}.`);
  if (m) parts.push(`${(e.actual as number) > (e.previous as number) ? 'Up' : (e.actual as number) < (e.previous as number) ? 'Down' : 'Unchanged'} from ${fmt(e.previous, e.unit)}.`);
  if (l) parts.push(`Level check: ${l.detail}.`);
  parts.push(`${spec.polarityNote} → sub-score ${score > 0 ? '+' : ''}${score}.`);
  if (fresh < 1) parts.push(`Released ${Math.round(ageDays)} days ago, so its weight is reduced to ${Math.round(fresh * 100)}%.`);
  return parts.join(' ');
}

export function scoreCustom(spec: CustomSpec, ctx: EngineContext): IndicatorResult {
  const base: IndicatorResult = {
    id: spec.id, name: spec.name, description: spec.desc, frequency: spec.freq, weight: spec.weight,
    effectiveWeight: 0, score: null, status: 'missing', observation: null, components: [],
    reasoning: `${spec.name}: source data not available right now. Excluded from the score.`,
    polarityNote: spec.polarityNote,
  };
  let out: CustomOut | null = null;
  try { out = spec.compute(ctx); } catch { out = null; }
  if (!out || !out.components.length) return base;
  const wsum = out.components.reduce((s, c) => s + c.weight, 0);
  const raw = out.components.reduce((s, c) => s + clamp(c.value) * c.weight, 0) / wsum;
  const score = round(clamp(raw * spec.polarity) * 100, 1);
  const fresh = freshnessFactor(out.ageDays, out.intervalDays);
  return {
    ...base,
    effectiveWeight: spec.weight * fresh,
    score,
    status: out.ageDays <= out.intervalDays * 2.2 ? 'live' : 'stale',
    observation: out.observation,
    components: out.components,
    reasoning: `${out.reasoning} ${spec.polarityNote} → sub-score ${score > 0 ? '+' : ''}${score}.`,
  };
}

// ───────────────────────────────────────── aggregation

export function aggregatePillar(spec: PillarSpec, ctx: EngineContext): PillarResult {
  if (spec.mirror) {
    const ref = ctx.results.get(spec.mirror.asset);
    const score = ref?.score ?? null;
    const signed = score === null ? null : round(score * spec.mirror.sign, 1);
    return {
      id: spec.id, name: spec.name, description: spec.desc, weight: spec.weight,
      score: signed, bullishPct: signed === null ? null : round((signed + 100) / 2, 1),
      coverage: ref ? ref.confidence / 100 : 0,
      indicators: [],
      reasoning: ref
        ? `${ref.name} fundamental score is ${ref.score! > 0 ? '+' : ''}${ref.score} (${biasLabel(ref.bias)}). ${spec.mirror.sign < 0 ? 'A stronger dollar is a headwind for this USD-priced asset, so the sign is inverted' : 'Applied as-is'} → ${signed! > 0 ? '+' : ''}${signed}.`
        : `${spec.mirror.asset} score unavailable.`,
    };
  }
  const indicators = spec.indicators.map((i) => (i.kind === 'cal' ? scoreCalendar(i, ctx) : scoreCustom(i, ctx)));
  const totalW = indicators.reduce((s, i) => s + i.weight, 0) || 1;
  const live = indicators.filter((i) => i.score !== null && i.effectiveWeight > 0);
  const effW = live.reduce((s, i) => s + i.effectiveWeight, 0);
  const score = effW > 0 ? round(live.reduce((s, i) => s + (i.score as number) * i.effectiveWeight, 0) / effW, 1) : null;
  const coverage = round(effW / totalW, 3);
  const sorted = [...live].sort((a, b) => Math.abs((b.score as number) * b.effectiveWeight) - Math.abs((a.score as number) * a.effectiveWeight));
  const lead = sorted.slice(0, 2).map((i) => `${i.name} (${(i.score as number) > 0 ? '+' : ''}${i.score})`).join(' and ');
  const reasoning = score === null
    ? `No live data for this pillar yet.`
    : `${spec.name} scores ${score > 0 ? '+' : ''}${score} from ${live.length}/${indicators.length} indicators with data${lead ? `, led by ${lead}` : ''}.`;
  return {
    id: spec.id, name: spec.name, description: spec.desc, weight: spec.weight, score,
    bullishPct: score === null ? null : round((score + 100) / 2, 1), coverage, indicators, reasoning,
  };
}

export function scoreAsset(spec: AssetSpec, ctx: EngineContext): AssetResult {
  const pillars = spec.pillars.map((p) => aggregatePillar(p, ctx));
  const scored = pillars.filter((p) => p.score !== null && p.coverage > 0);
  const effW = (p: PillarResult) => p.weight * (0.5 + 0.5 * Math.min(1, p.coverage));
  const W = scored.reduce((s, p) => s + effW(p), 0);
  const score = W > 0 ? round(scored.reduce((s, p) => s + (p.score as number) * effW(p), 0) / W, 1) : null;
  const totalPW = pillars.reduce((s, p) => s + p.weight, 0) || 1;
  const confidence = Math.round((pillars.reduce((s, p) => s + p.weight * Math.min(1, p.coverage), 0) / totalPW) * 100);

  const drivers: AssetResult['topDrivers'] = [];
  for (const p of pillars) {
    if (p.indicators.length === 0 && p.score !== null) {
      drivers.push({ name: p.name, pillar: p.name, impact: round((p.score * effW(p)) / (W || 1), 1) });
    }
    const pw = p.indicators.reduce((s, i) => s + i.effectiveWeight, 0) || 1;
    for (const i of p.indicators) {
      if (i.score === null) continue;
      const pillarShare = p.score !== null && W ? effW(p) / W : 0;
      drivers.push({ name: i.name, pillar: p.name, impact: round(i.score * (i.effectiveWeight / pw) * pillarShare, 1) });
    }
  }
  drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const bias = biasFromScore(score);
  const top = drivers.slice(0, 3);
  const pos = top.filter((d) => d.impact > 0).map((d) => d.name);
  const neg = top.filter((d) => d.impact < 0).map((d) => d.name);
  const summary = score === null
    ? `Not enough live data to score ${spec.name} yet.`
    : `${spec.name} is ${biasLabel(bias)} at ${score > 0 ? '+' : ''}${score} (${round((score + 100) / 2, 0)}% bullish / ${100 - round((score + 100) / 2, 0)}% bearish), confidence ${confidence}%.` +
      (pos.length ? ` Supported by ${pos.join(', ')}.` : '') +
      (neg.length ? ` Weighed down by ${neg.join(', ')}.` : '');

  return {
    symbol: spec.symbol,
    name: spec.name,
    assetClass: spec.assetClass,
    score,
    bullishPct: score === null ? null : round((score + 100) / 2, 1),
    bearishPct: score === null ? null : round(100 - round((score + 100) / 2, 1), 1),
    bias,
    confidence,
    pillars,
    summary,
    topDrivers: drivers.slice(0, 8),
    updatedAt: new Date(ctx.now).toISOString(),
    meta: spec.meta,
  };
}
