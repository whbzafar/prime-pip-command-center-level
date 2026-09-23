import React, { useState } from 'react';
import { CommodityObservation, CurrencyScoreResult } from '../../types/fundamentalIndicatorTypes';
import { DEFAULT_COMMODITY_OBSERVATIONS } from '../../data/defaultFundamentalObservations';
import { calculateCommodityFundamentalScore } from '../../utils/fundamentalCalculationEngine';
import { generateCommodity } from '../../services/fundamentalLiveResearchService';
import {
  Gem,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Scale,
  Info,
  ShieldCheck,
  ExternalLink,
  Edit3,
  X,
  Layers,
  Activity,
} from 'lucide-react';

interface CommoditiesMacroViewProps {
  usdScore?: CurrencyScoreResult;
  commodityObservations?: CommodityObservation[];
  retailPositioning?: RetailPositioningRecord[];
  onUpdateCommodity?: (observation: CommodityObservation) => void;
  onRequestAiExplanation?: (commodity: string) => void;
}

export const CommoditiesMacroView: React.FC<CommoditiesMacroViewProps> = ({
  usdScore,
  commodityObservations,
  retailPositioning = [],
  onUpdateCommodity,
  onRequestAiExplanation,
}) => {
  const [activeCommodity, setActiveCommodity] = useState<'GOLD' | 'CRUDE_OIL' | 'SILVER'>('GOLD');
  const [localCommodityData, setLocalCommodityData] = useState<CommodityObservation[]>(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_commodity_observations_v1');
      return saved ? JSON.parse(saved) : DEFAULT_COMMODITY_OBSERVATIONS;
    } catch {
      return DEFAULT_COMMODITY_OBSERVATIONS;
    }
  });
  const commodityData = commodityObservations ?? localCommodityData;
  const updateCommodityData = (next: CommodityObservation[]) => {
    if (onUpdateCommodity) next.forEach((item) => onUpdateCommodity(item));
    else setLocalCommodityData(next);
  };
  const [editingObs, setEditingObs] = useState<CommodityObservation | null>(null);
  const [commodityLiveLoading, setCommodityLiveLoading] = useState(false);
  const [commodityLiveMessage, setCommodityLiveMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    price: '',
    usRealYield10Y: '',
    inflationBreakeven5Y: '',
    centralBankDemandTone: 'AGGRESSIVE_BUYING',
    industrialDemandTone: 'NEUTRAL',
    geopoliticalRiskLevel: 'HIGH',
    supplyDemandBalance: 'DEFICIT',
    inventoriesWeeklySurpriseMb: '',
    opecPolicyTone: 'DEFENDING_FLOOR',
    notes: '',
  });

  React.useEffect(() => {
    try {
      if (!commodityObservations) localStorage.setItem('primepip_fundamental_commodity_observations_v1', JSON.stringify(commodityData));
    } catch {}
  }, [commodityData, commodityObservations]);

  const currentObs = commodityData.find((c) => c.symbol === activeCommodity) || commodityData[0];
  const calculated = calculateCommodityFundamentalScore(currentObs, retailPositioning.find((r) => r.asset === currentObs.symbol));
  const commodityDataComplete =
    currentObs.symbol === 'GOLD'
      ? currentObs.price > 0 && currentObs.usRealYield10Y !== undefined && currentObs.inflationBreakeven5Y !== undefined && currentObs.centralBankDemandTone !== undefined && currentObs.geopoliticalRiskLevel !== undefined && currentObs.sentiment !== undefined
      : currentObs.symbol === 'SILVER'
      ? currentObs.price > 0 && currentObs.usRealYield10Y !== undefined && currentObs.industrialDemandTone !== undefined && currentObs.geopoliticalRiskLevel !== undefined && currentObs.sentiment !== undefined
      : currentObs.price > 0 && currentObs.supplyDemandBalance !== undefined && currentObs.inventoriesWeeklySurpriseMb !== undefined && currentObs.opecPolicyTone !== undefined && currentObs.sentiment !== undefined;

  // Relative Valuation vs USD (Section 32)
  const usdScoreVal = usdScore?.score;
  const relativeSpread = commodityDataComplete && usdScoreVal !== undefined ? calculated.score - usdScoreVal : null;

  const handleGenerateLiveCommodity = async (mode: 'GENERATE' | 'REGENERATE' = 'GENERATE') => {
    if (!currentObs || commodityLiveLoading) return;
    setCommodityLiveLoading(true);
    setCommodityLiveMessage(null);
    try {
      const result = await generateCommodity(currentObs.symbol, currentObs, mode);
      if (result.status !== 'VERIFIED') {
        setCommodityLiveMessage(result.notes || 'Commodity evidence could not be verified; existing data was preserved.');
        return;
      }
      const updated: CommodityObservation = {
        ...currentObs,
        price: result.price ?? currentObs.price,
        sentiment: result.sentiment,
        sentimentConfidence: result.sentimentConfidence,
        sentimentSourceUrl: result.sentimentSourceUrl || currentObs.sentimentSourceUrl,
        sentimentUpdatedAt: result.retrievedAt,
        notes: result.notes || currentObs.notes,
        usRealYield10Y: result.usRealYield10Y ?? currentObs.usRealYield10Y,
        inflationBreakeven5Y: result.inflationBreakeven5Y ?? currentObs.inflationBreakeven5Y,
        centralBankDemandTone: result.centralBankDemandTone ?? currentObs.centralBankDemandTone,
        industrialDemandTone: result.industrialDemandTone ?? currentObs.industrialDemandTone,
        geopoliticalRiskLevel: result.geopoliticalRiskLevel ?? currentObs.geopoliticalRiskLevel,
        supplyDemandBalance: result.supplyDemandBalance ?? currentObs.supplyDemandBalance,
        inventoriesWeeklySurpriseMb: result.inventoriesWeeklySurpriseMb ?? currentObs.inventoriesWeeklySurpriseMb,
        opecPolicyTone: result.opecPolicyTone ?? currentObs.opecPolicyTone,
        updatedAt: result.retrievedAt,
      };
      updateCommodityData(commodityData.map((item) => item.symbol === currentObs.symbol ? updated : item));
      setCommodityLiveMessage(`${currentObs.name}: sentiment and current evidence verified.`);
    } catch (error) {
      setCommodityLiveMessage(error instanceof Error ? error.message : 'Live commodity research failed; existing data was preserved.');
    } finally {
      setCommodityLiveLoading(false);
    }
  };

  const handleStartEdit = (obs: CommodityObservation) => {
    setEditingObs(obs);
    setEditForm({
      price: obs.price > 0 ? String(obs.price) : '',
      usRealYield10Y: obs.usRealYield10Y !== undefined ? String(obs.usRealYield10Y) : '',
      inflationBreakeven5Y: obs.inflationBreakeven5Y !== undefined ? String(obs.inflationBreakeven5Y) : '',
      centralBankDemandTone: obs.centralBankDemandTone ?? 'AGGRESSIVE_BUYING',
      industrialDemandTone: obs.industrialDemandTone ?? 'NEUTRAL',
      geopoliticalRiskLevel: obs.geopoliticalRiskLevel ?? 'HIGH',
      supplyDemandBalance: obs.supplyDemandBalance ?? 'DEFICIT',
      inventoriesWeeklySurpriseMb: obs.inventoriesWeeklySurpriseMb !== undefined ? String(obs.inventoriesWeeklySurpriseMb) : '',
      opecPolicyTone: obs.opecPolicyTone ?? 'DEFENDING_FLOOR',
      notes: obs.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingObs) return;
    const price = Number(editForm.price);
    const realYield = Number(editForm.usRealYield10Y);
    const breakeven = Number(editForm.inflationBreakeven5Y);
    const inventory = Number(editForm.inventoriesWeeklySurpriseMb);
    if (!Number.isFinite(price) || price <= 0) return;
    if (editingObs.symbol !== 'CRUDE_OIL' && (!Number.isFinite(realYield) || !Number.isFinite(breakeven))) return;
    if (editingObs.symbol === 'CRUDE_OIL' && !Number.isFinite(inventory)) return;
    const updated: CommodityObservation = {
      ...editingObs,
      price,
      usRealYield10Y: editingObs.symbol === 'CRUDE_OIL' ? editingObs.usRealYield10Y : realYield,
      inflationBreakeven5Y: editingObs.symbol === 'CRUDE_OIL' ? editingObs.inflationBreakeven5Y : breakeven,
      centralBankDemandTone: editForm.centralBankDemandTone as any,
      industrialDemandTone: editForm.industrialDemandTone as any,
      geopoliticalRiskLevel: editForm.geopoliticalRiskLevel as any,
      supplyDemandBalance: editForm.supplyDemandBalance as any,
      inventoriesWeeklySurpriseMb: editingObs.symbol === 'CRUDE_OIL' ? inventory : editingObs.inventoriesWeeklySurpriseMb,
      opecPolicyTone: editForm.opecPolicyTone as any,
      notes: editForm.notes,
      updatedAt: new Date().toISOString(),
    };

    const next = commodityData.map((c) => (c.symbol === updated.symbol ? updated : c));
    updateCommodityData(next);
    setEditingObs(null);
  };

  const getSourcePortal = (sym: string) => {
    if (sym === 'GOLD') return { name: 'World Gold Council (WGC) & FRED 10Y TIPS', url: 'https://www.gold.org/goldhub/data' };
    if (sym === 'SILVER') return { name: 'The Silver Institute & USGS Mineral Survey', url: 'https://www.silverinstitute.org/' };
    return { name: 'US EIA Petroleum Status & OPEC Secretariat', url: 'https://www.eia.gov/petroleum/' };
  };

  const portal = getSourcePortal(currentObs.symbol);

  return (
    <div className="space-y-6">
      {/* Header & Commodity Switcher */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Gem className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                Commodities Macro Valuation Engine
              </h3>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Valuation Models Driven by Real Yields, Physical Supply/Demand, and Industrial Demand
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono-code">
            <button
              onClick={() => setActiveCommodity('GOLD')}
              className={`px-3.5 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                activeCommodity === 'GOLD'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              GOLD (XAU/USD)
            </button>
            <button
              onClick={() => setActiveCommodity('SILVER')}
              className={`px-3.5 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                activeCommodity === 'SILVER'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SILVER (XAG/USD)
            </button>
            <button
              onClick={() => setActiveCommodity('CRUDE_OIL')}
              className={`px-3.5 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                activeCommodity === 'CRUDE_OIL'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CRUDE OIL (WTI)
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleGenerateLiveCommodity('GENERATE')}
              disabled={commodityLiveLoading}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-military font-bold transition cursor-pointer"
            >
              {commodityLiveLoading ? 'RESEARCHING…' : 'GENERATE LIVE SENTIMENT'}
            </button>
            <button
              type="button"
              onClick={() => handleGenerateLiveCommodity('REGENERATE')}
              disabled={commodityLiveLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-cyan-300 border border-cyan-500/30 text-xs font-military font-bold transition cursor-pointer"
            >
              REGENERATE
            </button>
          </div>
        </div>

        {commodityLiveMessage && (
          <div className="px-3 py-2 rounded-xl bg-slate-900/70 border border-cyan-500/20 text-[11px] font-mono-code text-slate-300">
            <strong className="text-cyan-300">COMMODITY LIVE RESEARCH:</strong> {commodityLiveMessage}
          </div>
        )}

        {/* Selected Commodity Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Score Card */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-code text-slate-400 uppercase">
                  {currentObs.name}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold inline-flex items-center gap-1 ${
                    !commodityDataComplete
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : calculated.score > 20
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : calculated.score < -20
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {!commodityDataComplete ? 'INSUFFICIENT DATA' : calculated.bias.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-military font-bold text-slate-100">
                  ${currentObs.price > 0 ? currentObs.price.toLocaleString() : 'Not entered'}
                </span>
                <span className="text-xs font-mono-code text-slate-400">USD Spot</span>
              </div>
            </div>

            {/* Score progress bar */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="flex justify-between text-xs font-mono-code">
                <span className="text-slate-400">Macro Fundamental Score:</span>
                <span
                  className={`font-bold ${
                    calculated.score > 0 ? 'text-emerald-400' : calculated.score < 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {calculated.score > 0 ? `+${calculated.score}` : calculated.score} / 100
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex mt-2">
                <div
                  className={`h-full ${
                    calculated.score > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.abs(calculated.score))}%`,
                    marginLeft: calculated.score < 0 ? 'auto' : 0,
                  }}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono-code space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase">Live Sentiment Monitor</span>
                <span className={`font-bold ${currentObs.sentiment === 'BULLISH' ? 'text-emerald-400' : currentObs.sentiment === 'BEARISH' ? 'text-rose-400' : 'text-slate-300'}`}>
                  {currentObs.sentiment || 'NOT YET VERIFIED'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Confidence</span><span>{currentObs.sentimentConfidence ?? 0}%</span>
              </div>
              {currentObs.sentimentUpdatedAt && <span className="text-[10px] text-slate-500 block">Updated {new Date(currentObs.sentimentUpdatedAt).toLocaleString()}</span>}
            </div>

                        {/* Relative Valuation vs USD (Section 32) */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono-code space-y-1">
              <span className="text-slate-400 text-[10px] uppercase block">
                Relative Valuation vs USD ({usdScoreVal === undefined ? '—' : usdScoreVal > 0 ? `+${usdScoreVal}` : usdScoreVal} pts)
              </span>
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-bold">
                  {currentObs.symbol}/USD Spread:
                </span>
                <span
                  className={`font-military font-bold text-sm ${
                    relativeSpread > 0 ? 'text-emerald-400' : relativeSpread < 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {relativeSpread === null ? 'INSUFFICIENT DATA' : relativeSpread > 0 ? `+${relativeSpread}` : relativeSpread} pts
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                {relativeSpread === null
                  ? !commodityDataComplete
                    ? 'Enter the required commodity drivers before classifying the commodity or its USD-relative bias.'
                    : 'Enter the USD fundamental score before classifying the USD-relative commodity bias.'
                  : relativeSpread > 15
                  ? `${currentObs.symbol} fundamental drivers outpacing USD headwinds`
                  : relativeSpread < -15
                  ? `Strong USD environment exerting downward valuation pressure`
                  : `Balanced fundamental tug-of-war`}
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleStartEdit(currentObs)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 text-xs font-military font-bold transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Update Driver Inputs</span>
              </button>

              {onRequestAiExplanation && (
                <button
                  type="button"
                  onClick={() => onRequestAiExplanation(currentObs.name)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI MACRO THESIS ({currentObs.symbol})</span>
                </button>
              )}
            </div>
          </div>

          {/* Drivers List */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                Core Macro & Quantitative Drivers
              </h4>
              <span className="text-[10px] font-mono-code text-slate-500">
                Deterministic factor weighting
              </span>
            </div>

            <div className="space-y-2">
              {calculated.drivers.map((d, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono-code"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-200">{d.label}</div>
                    <div className="text-[11px] text-slate-400 font-sans">{d.impact}</div>
                  </div>
                  <div
                    className={`font-mono-code font-bold text-sm ${
                      d.score > 0 ? 'text-emerald-400' : d.score < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {d.score > 0 ? `+${d.score}` : d.score} pts
                  </div>
                </div>
              ))}
            </div>

            {/* Official Source Link */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono-code">
              <span className="text-slate-400">Verified Official Source:</span>
              <a
                href={portal.url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-1"
              >
                <span>{portal.name}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {currentObs.notes && (
              <div className="pt-2 text-xs text-slate-400 font-sans leading-relaxed border-t border-slate-800/80">
                <strong className="text-slate-300">Desk Intelligence Note: </strong>
                {currentObs.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Commodity Observation Modal */}
      {editingObs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0a0f1d] border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-military font-bold text-base text-slate-100">
                  Update Inputs: {editingObs.name}
                </h3>
                <span className="text-xs font-mono-code text-amber-400 block mt-0.5">
                  Enter verified macroeconomic & physical market indicators
                </span>
              </div>
              <button
                onClick={() => setEditingObs(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono-code">
              <div>
                <label className="text-slate-400 block mb-1">Spot Price ($ USD)</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              {editingObs.symbol !== 'CRUDE_OIL' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">US 10Y Real Yield (TIPS %)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.usRealYield10Y}
                        onChange={(e) => setEditForm({ ...editForm, usRealYield10Y: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                      />
                    </div>
                    </div>

                  {editingObs.symbol === 'SILVER' && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <label className="text-slate-400 block mb-1">Industrial Demand Tone</label>
                      <select
                        value={editForm.industrialDemandTone}
                        onChange={(e) => setEditForm({ ...editForm, industrialDemandTone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                      >
                        <option value="STRONG">Strong / Expanding</option>
                        <option value="NEUTRAL">Neutral / Stable</option>
                        <option value="WEAK">Weak / Contracting</option>
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Central Bank Buying Tone</label>
                      <select
                        value={editForm.centralBankDemandTone}
                        onChange={(e) => setEditForm({ ...editForm, centralBankDemandTone: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                      >
                        <option value="AGGRESSIVE_BUYING">Aggressive Buying (Surge)</option>
                        <option value="STEADY">Steady Demand</option>
                        <option value="SLOW">Slow / Paused</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Supply / Demand Balance</label>
                      <select
                        value={editForm.supplyDemandBalance}
                        onChange={(e) => setEditForm({ ...editForm, supplyDemandBalance: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                      >
                        <option value="DEFICIT">Deficit (Bullish)</option>
                        <option value="BALANCED">Balanced</option>
                        <option value="SURPLUS">Surplus (Bearish)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">OPEC+ Policy Stance</label>
                      <select
                        value={editForm.opecPolicyTone}
                        onChange={(e) => setEditForm({ ...editForm, opecPolicyTone: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                      >
                        <option value="DEFENDING_FLOOR">Defending Floor (Cuts/Delays)</option>
                        <option value="STEADY_PRODUCTION">Steady Production</option>
                        <option value="EXPANDING_SUPPLY">Expanding Supply</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">EIA Weekly Inventory Surprise (Million Barrels)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.inventoriesWeeklySurpriseMb}
                      onChange={(e) => setEditForm({ ...editForm, inventoriesWeeklySurpriseMb: e.target.value })}
                      placeholder="Negative = draw (bullish), Positive = build (bearish)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setEditingObs(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-military font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs transition shadow-md cursor-pointer"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
