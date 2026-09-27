import React, { useState } from 'react';
import {
  CurrencyCode,
  CotPositioningRecord,
  CotAssetCode,
} from '../../types/fundamentalIndicatorTypes';
import { DEFAULT_COT_RECORDS } from '../../data/defaultFundamentalObservations';
import { CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import { calculateCotMetrics } from '../../utils/fundamentalCalculationEngine';
import { generateCot, generateAllCotRecords } from '../../services/fundamentalLiveResearchService';
import {
  Activity,
  ExternalLink,
  Edit3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
  RefreshCw,
  Sparkles,
  Download,
  Camera,
  Coins,
  Wheat,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { generateCotReportPdf } from '../../utils/fundamentalPdfGenerator';
import { CotImageExtractorModal } from './CotImageExtractorModal';

interface CotTradingViewProps {
  activeCurrency?: CurrencyCode;
  cotData?: CotPositioningRecord[];
  cotRecords?: CotPositioningRecord[];
  onUpdateCotRecord?: (record: CotPositioningRecord) => void;
  onUpdateCotRecords?: (records: CotPositioningRecord[]) => void;
  onSelectCurrency?: (curr: CurrencyCode) => void;
}

export interface CotAssetMetadata {
  code: CotAssetCode;
  name: string;
  symbol: string;
  flag: string;
  contractDefault: string;
  exchange: string;
  category: 'CURRENCY' | 'COMMODITY';
}

export const COT_ASSETS_CATALOG: Record<CotAssetCode, CotAssetMetadata> = {
  USD: { code: 'USD', name: 'US Dollar Index', symbol: '$', flag: '🇺🇸', contractDefault: 'U.S. Dollar Index Futures (ICE)', exchange: 'ICE', category: 'CURRENCY' },
  EUR: { code: 'EUR', name: 'Euro FX Futures', symbol: '€', flag: '🇪🇺', contractDefault: 'Euro FX Futures (CME)', exchange: 'CME', category: 'CURRENCY' },
  GBP: { code: 'GBP', name: 'British Pound Futures', symbol: '£', flag: '🇬🇧', contractDefault: 'British Pound Futures (CME)', exchange: 'CME', category: 'CURRENCY' },
  JPY: { code: 'JPY', name: 'Japanese Yen Futures', symbol: '¥', flag: '🇯🇵', contractDefault: 'Japanese Yen Futures (CME)', exchange: 'CME', category: 'CURRENCY' },
  CHF: { code: 'CHF', name: 'Swiss Franc Futures', symbol: 'Fr', flag: '🇨🇭', contractDefault: 'Swiss Franc Futures (CME)', exchange: 'CME', category: 'CURRENCY' },
  CAD: { code: 'CAD', name: 'Canadian Dollar Futures', symbol: 'C$', flag: '🇨🇦', contractDefault: 'Canadian Dollar Futures (CME)', exchange: 'CME', category: 'CURRENCY' },
  AUD: { code: 'AUD', name: 'Australian Dollar Futures', symbol: 'A$', flag: '🇦🇺', contractDefault: 'Australian Dollar Futures (CME)', exchange: 'CME', category: 'CURRENCY' },
  NZD: { code: 'NZD', name: 'New Zealand Dollar Futures', symbol: 'NZ$', flag: '🇳🇿', contractDefault: 'New Zealand Dollar Futures (CME)', exchange: 'CME', category: 'CURRENCY' },
  XAU: { code: 'XAU', name: 'Gold Futures (COMEX)', symbol: '🪙', flag: '🥇', contractDefault: 'Gold Futures (COMEX)', exchange: 'COMEX / CME', category: 'COMMODITY' },
  XAG: { code: 'XAG', name: 'Silver Futures (COMEX)', symbol: '🥈', flag: '🥈', contractDefault: 'Silver Futures (COMEX)', exchange: 'COMEX / CME', category: 'COMMODITY' },
  OIL: { code: 'OIL', name: 'Crude Oil (NYMEX WTI)', symbol: '🛢️', flag: '🛢️', contractDefault: 'Crude Oil Light Sweet (NYMEX WTI)', exchange: 'NYMEX / CME', category: 'COMMODITY' },
};

export const CotTradingView: React.FC<CotTradingViewProps> = ({
  activeCurrency,
  cotData,
  cotRecords = DEFAULT_COT_RECORDS,
  onUpdateCotRecord,
  onUpdateCotRecords,
  onSelectCurrency,
}) => {
  const initialRecords = cotData || cotRecords;
  const [records, setRecords] = useState<CotPositioningRecord[]>(initialRecords);
  const [selectedAsset, setSelectedAsset] = useState<CotAssetCode>('USD');
  const [editingRecord, setEditingRecord] = useState<CotPositioningRecord | null>(null);
  const [isLiveGenerating, setIsLiveGenerating] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'CURRENCY' | 'COMMODITY'>('ALL');

  const [editForm, setEditForm] = useState({
    nonCommercialLong: 0,
    nonCommercialShort: 0,
    commercialLong: 0,
    commercialShort: 0,
    openInterest: 0,
    reportDate: '',
    contractName: '',
    notes: '',
  });

  // Sync with prop updates
  React.useEffect(() => {
    if (cotData && cotData.length > 0) {
      setRecords(cotData);
    } else if (cotRecords && cotRecords.length > 0) {
      setRecords(cotRecords);
    }
  }, [cotData, cotRecords]);

  React.useEffect(() => {
    if (activeCurrency) {
      setSelectedAsset(activeCurrency);
    }
  }, [activeCurrency]);

  const currencyCodes: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
  const commodityCodes: CotAssetCode[] = ['XAU', 'XAG', 'OIL'];

  const currentRecord: CotPositioningRecord = records.find((r) => r.currency === selectedAsset) || records[0] || {
    id: `cot_${selectedAsset.toLowerCase()}`,
    currency: selectedAsset,
    contractName: COT_ASSETS_CATALOG[selectedAsset]?.contractDefault || `${selectedAsset} Futures`,
    reportDate: '2025-02-18',
    releaseDate: '2025-02-21',
    openInterest: 100000,
    nonCommercialLong: 50000,
    nonCommercialShort: 40000,
    commercialLong: 30000,
    commercialShort: 40000,
    dealerLong: 0,
    dealerShort: 0,
    assetManagerLong: 0,
    assetManagerShort: 0,
    leveragedFundsLong: 0,
    leveragedFundsShort: 0,
    otherReportablesLong: 0,
    otherReportablesShort: 0,
    nonReportableLong: 0,
    nonReportableShort: 0,
    sourceUrl: 'https://www.tradingster.com/cot',
    updatedAt: new Date().toISOString(),
  };

  const assetMeta = COT_ASSETS_CATALOG[selectedAsset] || {
    code: selectedAsset,
    name: selectedAsset,
    symbol: '',
    flag: '🌐',
    contractDefault: currentRecord.contractName,
    exchange: 'GLOBAL',
    category: 'CURRENCY',
  };

  // Deterministic COT calculations
  const cotMetrics = calculateCotMetrics({
    nonCommercialLong: currentRecord.nonCommercialLong,
    nonCommercialShort: currentRecord.nonCommercialShort,
    commercialLong: currentRecord.commercialLong,
    commercialShort: currentRecord.commercialShort,
    dealerLong: currentRecord.dealerLong,
    dealerShort: currentRecord.dealerShort,
    assetManagerLong: currentRecord.assetManagerLong,
    assetManagerShort: currentRecord.assetManagerShort,
    leveragedFundsLong: currentRecord.leveragedFundsLong,
    leveragedFundsShort: currentRecord.leveragedFundsShort,
    otherReportablesLong: currentRecord.otherReportablesLong,
    otherReportablesShort: currentRecord.otherReportablesShort,
    nonReportableLong: currentRecord.nonReportableLong,
    nonReportableShort: currentRecord.nonReportableShort,
    openInterest: currentRecord.openInterest,
  });

  // Short-Term Speculative Stance (driven by Hedge Funds & Large Speculators Non-Commercial positioning)
  const nonCommNet = (currentRecord.nonCommercialLong ?? 0) - (currentRecord.nonCommercialShort ?? 0);
  const shortTermStance: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    nonCommNet > 0 ? 'BULLISH' : nonCommNet < 0 ? 'BEARISH' : 'NEUTRAL';

  // Long-Term Structural Stance (driven by Commercial Hedgers and open interest accumulation)
  const commNet = (currentRecord.commercialLong ?? 0) - (currentRecord.commercialShort ?? 0);
  const longTermStance: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    commNet > 0
      ? 'BULLISH'
      : cotMetrics.positioningExtreme === 'HIGH_CROWDED_LONG'
      ? 'BEARISH'
      : nonCommNet > 0
      ? 'BULLISH'
      : 'BEARISH';

  const handleSelectAsset = (asset: CotAssetCode) => {
    setSelectedAsset(asset);
    const validCurrency = currencyCodes.find((c) => c === asset);
    if (validCurrency && onSelectCurrency) {
      onSelectCurrency(validCurrency);
    }
  };

  const handleGenerateLiveCot = async (mode: 'GENERATE' | 'REGENERATE' = 'GENERATE', scope: 'ALL' | 'SINGLE' = 'ALL') => {
    if (isLiveGenerating) return;
    setIsLiveGenerating(true);
    setLiveMessage(null);
    try {
      if (scope === 'ALL') {
        const nextRecords = await generateAllCotRecords(mode);
        setRecords(nextRecords);
        const currentUpdated = nextRecords.find((r) => r.currency === selectedAsset);
        if (currentUpdated) {
          onUpdateCotRecord?.(currentUpdated);
        }
        onUpdateCotRecords?.(nextRecords);
        try {
          localStorage.setItem('primepip_fundamental_cot_v2', JSON.stringify(nextRecords));
        } catch {}
        window.dispatchEvent(new CustomEvent('primepipfx_fundamental_updated', { detail: { type: 'COT' } }));
        setLiveMessage(`✓ All instruments: COT institutional positioning verified and retrieved successfully.`);
      } else {
        if (!currentRecord) return;
        const validCurr = currencyCodes.includes(selectedAsset as CurrencyCode) ? (selectedAsset as CurrencyCode) : 'USD';
        const result = await generateCot(validCurr, currentRecord, mode);
        const updated: CotPositioningRecord = {
          ...currentRecord,
          contractName: result.contractName || currentRecord.contractName,
          reportDate: result.reportDate || currentRecord.reportDate,
          releaseDate: result.releaseDate || currentRecord.releaseDate,
          openInterest: result.openInterest,
          nonCommercialLong: result.nonCommercialLong,
          nonCommercialShort: result.nonCommercialShort,
          commercialLong: result.commercialLong,
          commercialShort: result.commercialShort,
          previousNetPosition: result.previousNetPosition ?? currentRecord.previousNetPosition,
          previousOpenInterest: result.previousOpenInterest ?? currentRecord.previousOpenInterest,
          sourceUrl: result.sourceUrl || currentRecord.sourceUrl,
          notes: result.notes || currentRecord.notes,
          updatedAt: result.retrievedAt || new Date().toISOString(),
          verificationStatus: 'VERIFIED',
          confidence: result.confidence,
          researchRetrievedAt: result.retrievedAt,
        };
        const nextRecords = records.map((record) => record.currency === selectedAsset ? updated : record);
        setRecords(nextRecords);
        onUpdateCotRecord?.(updated);
        onUpdateCotRecords?.(nextRecords);
        try {
          localStorage.setItem('primepip_fundamental_cot_v2', JSON.stringify(nextRecords));
        } catch {}
        window.dispatchEvent(new CustomEvent('primepipfx_fundamental_updated', { detail: { type: 'COT' } }));
        setLiveMessage(`✓ ${selectedAsset} COT verified & updated: Net Speculator ${updated.nonCommercialLong - updated.nonCommercialShort > 0 ? '+' : ''}${updated.nonCommercialLong - updated.nonCommercialShort} contracts.`);
      }
    } catch (error) {
      setLiveMessage(error instanceof Error ? error.message : 'Live COT research failed; existing data was preserved.');
    } finally {
      setIsLiveGenerating(false);
    }
  };

  const handleStartEdit = (rec: CotPositioningRecord) => {
    setEditingRecord(rec);
    setEditForm({
      nonCommercialLong: rec.nonCommercialLong || 0,
      nonCommercialShort: rec.nonCommercialShort || 0,
      commercialLong: rec.commercialLong || 0,
      commercialShort: rec.commercialShort || 0,
      openInterest: rec.openInterest || 0,
      reportDate: rec.reportDate || new Date().toISOString().slice(0, 10),
      contractName: rec.contractName || '',
      notes: rec.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    const ncLong = Number(editForm.nonCommercialLong);
    const ncShort = Number(editForm.nonCommercialShort);
    const cLong = Number(editForm.commercialLong);
    const cShort = Number(editForm.commercialShort);
    const oi = Number(editForm.openInterest);

    if (!Number.isFinite(ncLong) || !Number.isFinite(ncShort) || !Number.isFinite(cLong) || !Number.isFinite(cShort) || !Number.isFinite(oi) || oi <= 0) {
      return;
    }

    const updatedRecord: CotPositioningRecord = {
      ...editingRecord,
      contractName: editForm.contractName || editingRecord.contractName,
      nonCommercialLong: ncLong,
      nonCommercialShort: ncShort,
      commercialLong: cLong,
      commercialShort: cShort,
      openInterest: oi,
      reportDate: editForm.reportDate,
      notes: editForm.notes,
      verificationStatus: 'MANUAL',
      updatedAt: new Date().toISOString(),
    };

    const nextRecords = records.map((r) => (r.id === updatedRecord.id || r.currency === updatedRecord.currency ? updatedRecord : r));
    setRecords(nextRecords);
    if (onUpdateCotRecord) onUpdateCotRecord(updatedRecord);
    if (onUpdateCotRecords) onUpdateCotRecords(nextRecords);
    try {
      localStorage.setItem('primepip_fundamental_cot_v2', JSON.stringify(nextRecords));
    } catch {}
    window.dispatchEvent(new CustomEvent('primepipfx_fundamental_updated', { detail: { type: 'COT' } }));
    setEditingRecord(null);
  };

  const handleApplyExtractedRecords = (extractedList: CotPositioningRecord[]) => {
    const updatedMap = new Map<string, CotPositioningRecord>();
    for (const r of records) {
      updatedMap.set(r.currency, r);
    }
    for (const ex of extractedList) {
      updatedMap.set(ex.currency, ex);
    }
    const nextList = Array.from(updatedMap.values());
    setRecords(nextList);
    onUpdateCotRecords?.(nextList);
    if (extractedList.length > 0) {
      setSelectedAsset(extractedList[0].currency);
      onUpdateCotRecord?.(extractedList[0]);
    }
    try {
      localStorage.setItem('primepip_fundamental_cot_v2', JSON.stringify(nextList));
    } catch {}
    window.dispatchEvent(new CustomEvent('primepipfx_fundamental_updated', { detail: { type: 'COT' } }));
    setIsUploadModalOpen(false);
  };

  const cotSourceUrl = 'https://www.tradingster.com/cot';

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-military font-bold text-slate-100 uppercase tracking-wider">
                  Commitment of Traders (COT) Reports
                </h3>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 text-[10px] font-mono-code font-bold border border-cyan-500/30">
                  G8 CURRENCIES & COMMODITIES
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-1 max-w-2xl">
                CFTC Weekly Institutional Positioning • Non-Commercial Speculators vs Commercial Hedgers • Gold (XAU), Silver (XAG), Crude Oil (OIL), and 8 Primary Global Currencies.
              </p>
            </div>
          </div>

          {/* Action Buttons: Upload Image, Download Report, Generate, Web Source */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Upload COT Image / PDF Button */}
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-military font-bold transition cursor-pointer shadow-sm shadow-amber-500/10"
              title="Upload PDF or Screenshot of CFTC COT Report to accurately extract positioning"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>UPLOAD IMAGE / PDF</span>
            </button>

            {/* 2. Download COT Report PDF */}
            <button
              type="button"
              onClick={() => generateCotReportPdf(records)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-military font-bold transition cursor-pointer shadow-sm"
              title="Download G8 & Commodities Commitment of Traders Institutional Report"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>DOWNLOAD COT REPORT</span>
            </button>

            {/* 3. Generate Live COT */}
            <button
              type="button"
              onClick={() => handleGenerateLiveCot('GENERATE', 'ALL')}
              disabled={isLiveGenerating}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-military font-bold transition cursor-pointer shadow-md shadow-emerald-500/20"
              title="Generate live COT positioning for all instruments"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLiveGenerating ? 'RETRIEVING ALL…' : 'REFRESH ALL'}</span>
            </button>

            {/* 4. Regenerate */}
            <button
              type="button"
              onClick={() => handleGenerateLiveCot('REGENERATE', 'ALL')}
              disabled={isLiveGenerating}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-cyan-300 border border-cyan-500/30 text-xs font-military font-bold transition cursor-pointer shadow-sm"
              title="Regenerate verified baseline COT data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLiveGenerating ? 'animate-spin' : ''}`} />
              <span>REGENERATE</span>
            </button>

            {/* 5. External Web Source Link */}
            <a
              href={cotSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-military font-bold transition shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              <span>Tradingster COT ↗</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {liveMessage && (
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-[11px] font-mono-code text-cyan-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{liveMessage}</span>
            </div>
            <button onClick={() => setLiveMessage(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Filter Tabs: ALL | G8 CURRENCIES | COMMODITIES */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFilterCategory('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                filterCategory === 'ALL' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL ({currencyCodes.length + commodityCodes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('CURRENCY')}
              className={`px-3 py-1 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'CURRENCY' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-3 h-3 text-cyan-400" />
              <span>G8 CURRENCIES ({currencyCodes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('COMMODITY')}
              className={`px-3 py-1 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'COMMODITY' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wheat className="w-3 h-3 text-amber-400" />
              <span>COMMODITIES ({commodityCodes.length})</span>
            </button>
          </div>

          <div className="text-[11px] font-mono-code text-slate-400">
            Selected: <strong className="text-cyan-300">{assetMeta.name} ({selectedAsset})</strong>
          </div>
        </div>

        {/* Asset Selector Buttons */}
        <div className="space-y-2.5">
          {/* Section 1: Currencies */}
          {(filterCategory === 'ALL' || filterCategory === 'CURRENCY') && (
            <div>
              <div className="text-[10px] font-mono-code font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Coins className="w-3 h-3 text-blue-400" />
                <span>G8 Primary Currencies:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {currencyCodes.map((code) => {
                  const cMeta = COT_ASSETS_CATALOG[code];
                  const isSelected = selectedAsset === code;
                  const rec = records.find((r) => r.currency === code);
                  const m = rec ? calculateCotMetrics(rec) : null;
                  const net = rec ? (rec.nonCommercialLong ?? 0) - (rec.nonCommercialShort ?? 0) : 0;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleSelectAsset(code)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono-code transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-500/25 border-cyan-400 text-cyan-200 font-bold shadow-lg shadow-blue-500/20 ring-1 ring-cyan-400/40'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base">{cMeta?.flag}</span>
                      <span className="font-bold">{code}</span>
                      {m && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            net > 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : net < 0
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {net > 0 ? `+${(net / 1000).toFixed(0)}k` : `${(net / 1000).toFixed(0)}k`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Commodities (Gold, Silver, Crude Oil) */}
          {(filterCategory === 'ALL' || filterCategory === 'COMMODITY') && (
            <div className="pt-1">
              <div className="text-[10px] font-mono-code font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Wheat className="w-3 h-3 text-amber-400" />
                <span>Commodities Institutional COT (Gold, Silver, Crude Oil):</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {commodityCodes.map((code) => {
                  const cMeta = COT_ASSETS_CATALOG[code];
                  const isSelected = selectedAsset === code;
                  const rec = records.find((r) => r.currency === code);
                  const net = rec ? (rec.nonCommercialLong ?? 0) - (rec.nonCommercialShort ?? 0) : 0;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleSelectAsset(code)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-mono-code transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">{cMeta?.flag}</span>
                      <div className="text-left leading-tight">
                        <div className="font-bold flex items-center gap-1">
                          <span>{code}</span>
                          <span className="text-[10px] text-slate-400">({code === 'XAU' ? 'Gold' : code === 'XAG' ? 'Silver' : 'Crude Oil'})</span>
                        </div>
                        <div className="text-[9px] text-slate-400">{cMeta?.exchange}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          net > 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : net < 0
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {net > 0 ? `+${(net / 1000).toFixed(0)}k` : `${(net / 1000).toFixed(0)}k`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Selected Asset COT Breakdown Card */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5">
            <span className="text-4xl">{assetMeta.flag}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-military font-bold text-slate-100">
                  {assetMeta.name} Speculative & Commercial Positioning
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-300 font-mono-code font-bold">
                  {currentRecord.contractName}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-mono-code">
                  Report Date: {currentRecord.reportDate || 'Latest'}
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-1">
                {currentRecord.notes || `${assetMeta.name} institutional positioning breakdown from CFTC weekly filings.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStartEdit(currentRecord)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-military font-bold transition cursor-pointer shadow-sm hover:border-cyan-500/40"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modify Raw Figures</span>
            </button>
          </div>
        </div>

        {/* 100% Accurate Bias Stance Banner (Short-Term & Long-Term) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. Short-Term Speculative Stance */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-military font-bold text-cyan-400 uppercase tracking-wider">
                SHORT-TERM SPECULATIVE STANCE (LARGE FUNDS)
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-military font-bold tracking-wider ${
                shortTermStance === 'BULLISH'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : shortTermStance === 'BEARISH'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {shortTermStance}
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
              Non-Commercial Speculator Net: <strong className={nonCommNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {nonCommNet >= 0 ? `+${nonCommNet.toLocaleString()}` : nonCommNet.toLocaleString()} contracts
              </strong> ({cotMetrics.longPercent.toFixed(1)}% Long vs {cotMetrics.shortPercent.toFixed(1)}% Short). Speculators {nonCommNet >= 0 ? 'maintain directional upside accumulation' : 'are net short and distributing positions'}.
            </p>
          </div>

          {/* 2. Long-Term Structural Stance */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-military font-bold text-amber-400 uppercase tracking-wider">
                LONG-TERM STRUCTURAL STANCE (COMMERCIAL HEDGERS)
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-military font-bold tracking-wider ${
                longTermStance === 'BULLISH'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {longTermStance}
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
              Commercial Net Position: <strong className={commNet >= 0 ? 'text-emerald-400' : 'text-slate-300'}>
                {commNet >= 0 ? `+${commNet.toLocaleString()}` : commNet.toLocaleString()} contracts
              </strong>. Total Open Interest is <strong className="text-white">{currentRecord.openInterest.toLocaleString()}</strong> contracts. Commercial producers and physical market players provide structural support.
            </p>
          </div>
        </div>

        {/* Core COT Outputs KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">COT Direction</span>
            <span className={`text-sm font-military font-bold block ${cotMetrics.cotDirection === 'BULLISH' ? 'text-emerald-400' : cotMetrics.cotDirection === 'BEARISH' ? 'text-rose-400' : 'text-slate-300'}`}>
              {cotMetrics.cotDirection}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Net Speculator Position</span>
            <span className={`text-sm font-military font-bold block ${cotMetrics.netPosition > 0 ? 'text-emerald-400' : cotMetrics.netPosition < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {cotMetrics.netPosition > 0 ? '+' : ''}{cotMetrics.netPosition.toLocaleString()}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Net / Open Interest</span>
            <span className="text-sm font-military font-bold text-cyan-300 block">
              {cotMetrics.netOpenInterestPercent > 0 ? '+' : ''}{cotMetrics.netOpenInterestPercent.toFixed(2)}%
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Positioning Score</span>
            <span className={`text-sm font-military font-bold block ${cotMetrics.positioningScore > 0 ? 'text-emerald-400' : cotMetrics.positioningScore < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {cotMetrics.positioningScore > 0 ? '+' : ''}{cotMetrics.positioningScore} / 100
            </span>
          </div>
        </div>

        {/* Detailed Interpretation Banner */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start sm:items-center gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
              Institutional COT Reading & Execution Thesis:
            </span>
            <p className="text-xs font-mono-code text-slate-300 mt-1 leading-relaxed">
              {cotMetrics.interpretation}
            </p>
          </div>
        </div>

        {/* Essential Raw Figures Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
              {assetMeta.name} — CFTC Legacy Input Fields
            </h4>
            <span className="text-[10px] font-mono-code text-slate-400">Contracts in standard lots</span>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs font-mono-code">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0c1222] border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Long Contracts</th>
                  <th className="p-3 text-right">Short Contracts</th>
                  <th className="p-3 text-right">Net Position</th>
                  <th className="p-3 text-center">% of Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                <tr className="bg-cyan-500/5">
                  <td className="p-3 font-semibold text-cyan-300">Non-Commercial (Speculators / Hedge Funds)</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">{(currentRecord.nonCommercialLong ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-400 font-bold">{(currentRecord.nonCommercialShort ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-military font-bold">
                    <span className={cotMetrics.netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {cotMetrics.netPosition >= 0 ? `+${cotMetrics.netPosition.toLocaleString()}` : cotMetrics.netPosition.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-400">{cotMetrics.longPercent.toFixed(1)}% L / {cotMetrics.shortPercent.toFixed(1)}% S</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-300">Commercial (Producers / Hedgers)</td>
                  <td className="p-3 text-right text-slate-300">{(currentRecord.commercialLong ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-300">{(currentRecord.commercialShort ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-military text-slate-400">
                    {cotMetrics.commercialNet >= 0 ? `+${cotMetrics.commercialNet.toLocaleString()}` : cotMetrics.commercialNet.toLocaleString()}
                  </td>
                  <td className="p-3 text-center text-slate-500">Commercial Hedging</td>
                </tr>
                <tr className="bg-slate-900/60 font-bold border-t border-slate-700">
                  <td className="p-3 text-cyan-300">Total Open Interest</td>
                  <td colSpan={3} className="p-3 text-right text-slate-100 font-military text-sm">
                    {currentRecord.openInterest.toLocaleString()} Contracts
                  </td>
                  <td className="p-3 text-center text-slate-400">
                    {cotMetrics.openInterestChange === null ? 'Active' : `OI ${cotMetrics.openInterestChange >= 0 ? '+' : ''}${cotMetrics.openInterestChange.toLocaleString()}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit COT Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#0a0f1d] border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-military font-bold text-base text-slate-100">
                  Update COT Input Fields: {editingRecord.currency}
                </h3>
                <span className="text-xs font-mono-code text-cyan-400 block mt-0.5">
                  Enter verified figures from CFTC Commitments of Traders Legacy report
                </span>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-mono-code">
              {/* Contract Name */}
              <div>
                <label className="text-slate-400 block mb-1">Contract Name</label>
                <input
                  type="text"
                  value={editForm.contractName}
                  onChange={(e) => setEditForm({ ...editForm, contractName: e.target.value })}
                  placeholder="e.g. Gold Futures (COMEX)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              {/* Non-Commercial Inputs */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-2">
                <span className="font-military font-bold text-cyan-300 uppercase">Non-Commercial (Speculative)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Long Contracts</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.nonCommercialLong}
                      onChange={(e) => setEditForm({ ...editForm, nonCommercialLong: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Short Contracts</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.nonCommercialShort}
                      onChange={(e) => setEditForm({ ...editForm, nonCommercialShort: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-rose-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Commercial Inputs */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="font-military font-bold text-slate-300 uppercase">Commercial (Hedging)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Commercial Long</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.commercialLong}
                      onChange={(e) => setEditForm({ ...editForm, commercialLong: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Commercial Short</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.commercialShort}
                      onChange={(e) => setEditForm({ ...editForm, commercialShort: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Open Interest & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Total Open Interest</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.openInterest}
                    onChange={(e) => setEditForm({ ...editForm, openInterest: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Report Date</label>
                  <input
                    type="date"
                    value={editForm.reportDate}
                    onChange={(e) => setEditForm({ ...editForm, reportDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notes / Analysis</label>
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
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-military font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Save & Recalculate COT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Image / PDF Modal */}
      <CotImageExtractorModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onApplyRecords={handleApplyExtractedRecords}
        existingRecords={records}
      />
    </div>
  );
};
