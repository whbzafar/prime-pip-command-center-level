import React from 'react';
import { Activity, Database, ShieldCheck, RefreshCw, TrendingUp, TrendingDown, Minus, Gem, Droplets, Coins, BarChart3 } from 'lucide-react';
import {
  CommodityObservation,
  CurrencyCode,
  CurrencyScoreResult,
  RetailPositioningRecord,
} from '../../types/fundamentalIndicatorTypes';
import { CURRENCIES } from '../../data/fundamentalRegistryData';
import { calculateCommodityFundamentalScore, calculateRetailContrarianScore } from '../../utils/fundamentalCalculationEngine';
import { generateCommodity } from '../../services/fundamentalLiveResearchService';

type AssetCode = CurrencyCode | 'XAU' | 'XAG' | 'WTI';

interface AssetDefinition {
  code: AssetCode;
  name: string;
  type: 'CURRENCY' | 'COMMODITY';
  essentialIndicators: string[];
  relationships: string[];
}

const ASSETS: AssetDefinition[] = [
  ...CURRENCIES.map((c) => ({
    code: c.code as AssetCode,
    name: c.name,
    type: 'CURRENCY' as const,
    essentialIndicators: currencyIndicators(c.code),
    relationships: currencyRelationships(c.code),
  })),
  {
    code: 'XAU',
    name: 'Gold (XAU/USD)',
    type: 'COMMODITY',
    essentialIndicators: ['US 10Y real yield', 'US 2Y/10Y yields', 'Fed expected path', 'Inflation expectations', 'Central-bank demand', 'ETF/physical demand', 'Geopolitical risk', 'COT non-commercial positioning', 'USD relationship'],
    relationships: ['USD ↔ Gold', 'Gold ↔ real yields', 'Gold/Silver ratio'],
  },
  {
    code: 'XAG',
    name: 'Silver (XAG/USD)',
    type: 'COMMODITY',
    essentialIndicators: ['US 10Y real yield', 'USD', 'Global manufacturing PMI', 'China industrial demand', 'Solar/electronics demand', 'Mine supply/recycling', 'Gold/Silver ratio', 'COT non-commercial positioning', 'Risk regime'],
    relationships: ['USD ↔ Silver', 'Silver ↔ industrial cycle', 'Gold/Silver ratio'],
  },
  {
    code: 'WTI',
    name: 'Crude Oil (WTI)',
    type: 'COMMODITY',
    essentialIndicators: ['Global demand growth', 'US/China demand', 'OPEC+ policy', 'Non-OPEC supply', 'US production', 'EIA crude inventories/SPR', 'Refinery utilization', 'Futures curve', 'Geopolitical disruptions', 'COT non-commercial positioning'],
    relationships: ['USD ↔ WTI', 'CAD ↔ WTI', 'WTI ↔ global growth'],
  },
];

function currencyIndicators(code: CurrencyCode): string[] {
  const common = ['Policy rate / central-bank stance', 'Headline & core inflation', 'GDP / growth', 'Employment', 'Business activity / PMI', 'Sovereign yield', 'COT non-commercial positioning', 'Market sentiment'];
  const external: Record<CurrencyCode, string[]> = {
    USD: ['Retail sales', '10Y Treasury', 'PCE inflation'],
    EUR: ['HICP', 'German Ifo', 'Trade balance'],
    GBP: ['CPI', 'Wages', 'Retail sales'],
    JPY: ['Tokyo/core CPI', 'Tankan', 'FX intervention readiness'],
    CHF: ['KOF barometer', 'Trade balance', 'SNB rate'],
    CAD: ['WTI/terms of trade', 'Employment', 'Retail sales'],
    AUD: ['China demand / iron ore', 'Wages', 'Employment'],
    NZD: ['GDT dairy prices', 'Trade balance', 'Employment'],
  };
  return [...common, ...external[code]];
}

function currencyRelationships(code: CurrencyCode): string[] {
  const map: Record<CurrencyCode, string[]> = {
    USD: ['USD ↔ Gold', 'USD ↔ Silver', 'USD ↔ WTI', 'US yield curve'],
    EUR: ['EUR ↔ USD rate differential', 'EUR ↔ Eurozone growth'],
    GBP: ['GBP ↔ UK-US yield differential', 'GBP ↔ risk regime'],
    JPY: ['JPY ↔ US-Japan yields', 'JPY ↔ risk-off'],
    CHF: ['CHF ↔ global risk', 'CHF ↔ EUR'],
    CAD: ['CAD ↔ WTI', 'CAD ↔ US-Canada yields'],
    AUD: ['AUD ↔ China / iron ore', 'AUD ↔ risk regime'],
    NZD: ['NZD ↔ dairy / GDT', 'NZD ↔ risk regime'],
  };
  return map[code];
}

const labelForScore = (score: number) => {
  if (score >= 60) return 'STRONG BULLISH';
  if (score >= 25) return 'BULLISH';
  if (score <= -60) return 'STRONG BEARISH';
  if (score <= -25) return 'BEARISH';
  return 'NEUTRAL / MIXED';
};

const ScoreIcon = ({ score }: { score: number }) =>
  score > 0 ? <TrendingUp className="w-4 h-4" /> : score < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />;

interface Props {
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  commodityObservations: CommodityObservation[];
  retailPositioning?: RetailPositioningRecord[];
  onCommodityUpdate: (observation: CommodityObservation) => void;
  onOpenCurrencyWorkspace?: (currency: CurrencyCode) => void;
  onOpenRates?: (currency: CurrencyCode) => void;
  onOpenCot?: (currency: CurrencyCode) => void;
  onOpenSentiment?: (currency: CurrencyCode) => void;
  onOpenCommodities?: () => void;
}

export const FundamentalAssetCommandCenter: React.FC<Props> = ({
  currencyScores,
  commodityObservations,
  retailPositioning = [],
  onCommodityUpdate,
  onOpenCurrencyWorkspace,
  onOpenRates,
  onOpenCot,
  onOpenSentiment,
  onOpenCommodities,
}) => {
  const [loading, setLoading] = React.useState<AssetCode | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const refreshCommodity = async (symbol: CommodityObservation['symbol']) => {
    const code: AssetCode = symbol === 'GOLD' ? 'XAU' : symbol === 'SILVER' ? 'XAG' : 'WTI';
    setLoading(code);
    setMessage(null);
    try {
      const existing = commodityObservations.find((o) => o.symbol === symbol);
      const result = await generateCommodity(symbol, existing, existing?.updatedAt ? 'REGENERATE' : 'GENERATE');
      onCommodityUpdate({
        ...(existing || { id: 'comm_' + symbol.toLowerCase(), symbol, name: symbol === 'GOLD' ? 'Gold (XAU/USD)' : symbol === 'SILVER' ? 'Silver (XAG/USD)' : 'Crude Oil (WTI)', referenceDate: '', price: 0, updatedAt: '' }),
        price: result.price ?? existing?.price ?? 0,
        sentiment: result.sentiment,
        sentimentConfidence: result.sentimentConfidence,
        sentimentSourceUrl: result.sentimentSourceUrl,
        sentimentUpdatedAt: result.retrievedAt,
        notes: result.notes || existing?.notes,
        usRealYield10Y: result.usRealYield10Y ?? existing?.usRealYield10Y,
        inflationBreakeven5Y: result.inflationBreakeven5Y ?? existing?.inflationBreakeven5Y,
        centralBankDemandTone: result.centralBankDemandTone ?? existing?.centralBankDemandTone,
        industrialDemandTone: result.industrialDemandTone ?? existing?.industrialDemandTone,
        geopoliticalRiskLevel: result.geopoliticalRiskLevel ?? existing?.geopoliticalRiskLevel,
        supplyDemandBalance: result.supplyDemandBalance ?? existing?.supplyDemandBalance,
        inventoriesWeeklySurpriseMb: result.inventoriesWeeklySurpriseMb ?? existing?.inventoriesWeeklySurpriseMb,
        opecPolicyTone: result.opecPolicyTone ?? existing?.opecPolicyTone,
        updatedAt: result.retrievedAt,
      });
      setMessage(result.status === 'VERIFIED' ? code + ' live research verified.' : code + ' returned review-required data; no missing values were invented.');
    } catch (error) {
      setMessage(code + ' live research failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(null);
    }
  };

  const getCommodity = (code: AssetCode) => {
    const symbol = code === 'XAU' ? 'GOLD' : code === 'XAG' ? 'SILVER' : 'CRUDE_OIL';
    return commodityObservations.find((o) => o.symbol === symbol);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cyan-500/25 bg-slate-950/85 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono-code font-bold tracking-widest text-cyan-300">
              <ShieldCheck className="w-4 h-4" /> 11-ASSET FUNDAMENTAL COMMAND CENTER
            </div>
            <h2 className="mt-2 text-2xl font-military font-bold text-slate-100">8 Currencies + Gold + Silver + WTI</h2>
            <p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-400">
              One deterministic asset universe. Currency scores use the existing verified indicator engine; commodities use their dedicated macro driver model. Missing live evidence is shown as incomplete rather than converted into a bullish or bearish assumption.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono-code">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"><div className="text-slate-500">CURRENCIES</div><div className="text-lg font-bold text-cyan-300">8</div></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"><div className="text-slate-500">COMMODITIES</div><div className="text-lg font-bold text-amber-300">3</div></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"><div className="text-slate-500">TOTAL</div><div className="text-lg font-bold text-slate-100">11</div></div>
          </div>
        </div>
        {message && <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-[11px] font-mono-code text-cyan-200">{message}</div>}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {ASSETS.map((asset) => {
          const currency = asset.type === 'CURRENCY' ? currencyScores[asset.code as CurrencyCode] : undefined;
          const commodity = asset.type === 'COMMODITY' ? getCommodity(asset.code) : undefined;
          const commodityRetail = commodity ? retailPositioning.find((r) => r.asset === commodity.symbol) : undefined;
          const currencyRetail = asset.type === 'CURRENCY' ? retailPositioning.find((r) => r.asset === asset.code) : undefined;
          const retailRecord = currencyRetail ?? commodityRetail;
          const commodityScore = commodity ? calculateCommodityFundamentalScore(commodity, commodityRetail) : null;
          const retailScore = retailRecord?.isEntered !== false && retailRecord ? calculateRetailContrarianScore(retailRecord) : null;
          const retailLabel = retailScore === null ? 'INPUT' : retailScore > 0 ? 'BULLISH' : retailScore < 0 ? 'BEARISH' : 'NEUTRAL';
          const score = currency?.score ?? commodityScore?.score ?? 0;
          const coverage = currency?.dataCoveragePercent ?? (commodity ? commodityCoverage(commodity) : 0);
          const incomplete = asset.type === 'CURRENCY' ? coverage < 75 : coverage < 60;
          const symbol = asset.code === 'XAU' ? 'GOLD' : asset.code === 'XAG' ? 'SILVER' : 'CRUDE_OIL';
          const icon = asset.code === 'XAU' ? <Gem className="w-5 h-5" /> : asset.code === 'XAG' ? <Coins className="w-5 h-5" /> : asset.code === 'WTI' ? <Droplets className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />;

          return (
            <article key={asset.code} className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4 shadow-xl hover:border-cyan-500/30 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center text-cyan-300">{icon}</div>
                  <div>
                    <div className="font-military font-bold text-slate-100">{asset.code}</div>
                    <div className="text-[10px] text-slate-500">{asset.name}</div>
                  </div>
                </div>
                <div className="text-right font-mono-code">
                  <div className={score > 0 ? 'text-emerald-400' : score < 0 ? 'text-rose-400' : 'text-slate-300'}><ScoreIcon score={score} /></div>
                  <div className="text-sm font-bold">{incomplete ? 'INSUFFICIENT' : labelForScore(score)}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2 text-center font-mono-code">
                <div><div className="text-[9px] text-slate-500">SCORE</div><div className="font-bold">{incomplete ? '—' : (score > 0 ? '+' : '') + score}</div></div>
                <div><div className="text-[9px] text-slate-500">COVERAGE</div><div className="font-bold">{coverage}%</div></div>
                <div><div className="text-[9px] text-slate-500">COT</div><div className="font-bold text-slate-300">{currency?.categoryScores?.COT_POSITIONING?.activeCount ? 'LIVE' : asset.type === 'CURRENCY' ? 'WAITING' : 'INPUT'}</div></div>
                <div><div className="text-[9px] text-slate-500">RETAIL SENTIMENT</div><div className={retailScore === null ? 'font-bold text-amber-300' : retailScore > 0 ? 'font-bold text-emerald-300' : retailScore < 0 ? 'font-bold text-rose-300' : 'font-bold text-slate-300'}>{retailScore === null ? 'INPUT' : (retailScore > 0 ? '+' : '') + retailScore + ' · ' + retailLabel}</div></div>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-mono-code">
                  <span className="text-slate-400">Essential indicator coverage</span>
                  <span className={coverage >= 75 ? 'text-emerald-300' : 'text-amber-300'}>{coverage}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400" style={{ width: Math.min(100, coverage) + '%' }} /></div>
              </div>

              <div className="mt-3 space-y-1">
                {asset.essentialIndicators.slice(0, 5).map((indicator) => (
                  <div key={indicator} className="flex items-center gap-1.5 text-[10px] text-slate-300"><Activity className="w-3 h-3 text-cyan-400 shrink-0" /><span>{indicator}</span></div>
                ))}
                <div className="pt-1 text-[10px] text-slate-500">+{Math.max(0, asset.essentialIndicators.length - 5)} additional essential drivers</div>
              </div>

              {asset.type === 'COMMODITY' && (
                <button
                  type="button"
                  onClick={() => refreshCommodity(symbol as CommodityObservation['symbol'])}
                  disabled={loading === asset.code}
                  className="mt-4 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-military font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1.5"><RefreshCw className={'w-3.5 h-3.5 ' + (loading === asset.code ? 'animate-spin' : '')} /> {loading === asset.code ? 'RESEARCHING...' : 'GENERATE / REGENERATE LIVE'}</span>
                </button>
              )}

              <div className="mt-4 border-t border-slate-800 pt-3">
                <div className="text-[9px] font-mono-code uppercase tracking-wider text-cyan-300">DATA INPUT / RESEARCH</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {asset.type === 'CURRENCY' ? <>
                    <button type="button" onClick={() => onOpenCurrencyWorkspace?.(asset.code as CurrencyCode)} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-[9px] text-cyan-300 hover:border-cyan-400">INDICATORS {currency?.completedIndicators ?? 0}/{currency?.totalIndicators ?? 0}</button>
                    <button type="button" onClick={() => onOpenRates?.(asset.code as CurrencyCode)} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[9px] text-slate-300 hover:border-cyan-400">RATE / YIELD {currency?.categoryScores?.RATES_YIELDS?.activeCount ? 'ACTIVE' : 'INPUT'}</button>
                    <button type="button" onClick={() => onOpenCot?.(asset.code as CurrencyCode)} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[9px] text-slate-300 hover:border-cyan-400">COT {currency?.categoryScores?.COT_POSITIONING?.activeCount ? 'ACTIVE' : 'INPUT'}</button>
                    <button type="button" onClick={() => onOpenSentiment?.(asset.code as CurrencyCode)} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[9px] text-slate-300 hover:border-cyan-400">SENTIMENT {currency?.categoryScores?.SENTIMENT?.activeCount ? 'ACTIVE' : 'INPUT'}</button>
                  </> : <button type="button" onClick={() => onOpenCommodities?.()} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[9px] text-amber-300 hover:border-amber-400">OPEN COMMODITY INPUTS</button>}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-800 pt-3">
                <div className="text-[9px] font-mono-code uppercase tracking-wider text-slate-500">Cross-asset links</div>
                <div className="mt-1 flex flex-wrap gap-1.5">{asset.relationships.map((r) => <span key={r} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[9px] text-slate-400">{r}</span>)}</div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/75 p-5">
        <div className="flex items-center gap-2 text-sm font-military font-bold text-slate-100"><Database className="w-4 h-4 text-cyan-400" /> MODEL INTEGRITY RULES</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><b className="text-cyan-300">Direction</b><p className="mt-1 text-slate-400">Each indicator has an explicit scoring direction; higher/lower readings are never assumed to have the same meaning.</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><b className="text-cyan-300">COT</b><p className="mt-1 text-slate-400">CFTC non-commercial long minus short is normalized by open interest. COT is a positioning input, not a guaranteed price forecast.</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><b className="text-cyan-300">Retail Sentiment</b><p className="mt-1 text-slate-400">Long/Short inputs are normalized to a 100% mix, converted to a contrarian score, and included in the weighted sentiment category and pair differentials.</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><b className="text-cyan-300">Relationships</b><p className="mt-1 text-slate-400">USD/Gold, USD/Silver, USD/WTI, CAD/WTI, AUD/China, NZD/Dairy and JPY/US yields are contextual relationships, not hard-coded inverse rules.</p></div>
        </div>
      </section>
    </div>
  );
};

function commodityCoverage(obs: CommodityObservation): number {
  const fields = [
    obs.price > 0,
    obs.usRealYield10Y !== undefined,
    obs.inflationBreakeven5Y !== undefined,
    obs.centralBankDemandTone !== undefined,
    obs.industrialDemandTone !== undefined,
    obs.supplyDemandBalance !== undefined,
    obs.inventoriesWeeklySurpriseMb !== undefined,
    obs.opecPolicyTone !== undefined,
    obs.geopoliticalRiskLevel !== undefined,
    obs.sentiment !== undefined,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
