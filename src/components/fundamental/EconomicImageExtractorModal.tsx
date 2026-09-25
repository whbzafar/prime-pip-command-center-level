import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  Info,
  Sliders,
  Maximize2,
  Check,
  Trash2,
} from 'lucide-react';
import {
  CurrencyCode,
  IndicatorObservation,
  IndicatorDefinition,
  CommodityObservation,
} from '../../types/fundamentalIndicatorTypes';
import { CURRENCIES, OFFICIAL_INDICATOR_REGISTRY } from '../../data/fundamentalRegistryData';
import {
  extractIndicatorsFromImage,
  ExtractedIndicatorItem,
} from '../../services/fundamentalLiveResearchService';

export type SupportedSelection = CurrencyCode | 'GOLD' | 'SILVER' | 'CRUDE_OIL';

interface EconomicImageExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelection?: SupportedSelection;
  onApplyObservations: (
    selection: SupportedSelection,
    updatedObservations: IndicatorObservation[]
  ) => void;
  onApplyCommodity?: (commodity: Partial<CommodityObservation>) => void;
  existingObservations: IndicatorObservation[];
}

const ALL_SELECTIONS: { code: SupportedSelection; label: string; flag: string; type: 'CURRENCY' | 'COMMODITY' }[] = [
  { code: 'USD', label: 'US Dollar', flag: '🇺🇸', type: 'CURRENCY' },
  { code: 'EUR', label: 'Euro', flag: '🇪🇺', type: 'CURRENCY' },
  { code: 'GBP', label: 'British Pound', flag: '🇬🇧', type: 'CURRENCY' },
  { code: 'JPY', label: 'Japanese Yen', flag: '🇯🇵', type: 'CURRENCY' },
  { code: 'CHF', label: 'Swiss Franc', flag: '🇨🇭', type: 'CURRENCY' },
  { code: 'CAD', label: 'Canadian Dollar', flag: '🇨🇦', type: 'CURRENCY' },
  { code: 'AUD', label: 'Australian Dollar', flag: '🇦🇺', type: 'CURRENCY' },
  { code: 'NZD', label: 'New Zealand Dollar', flag: '🇳🇿', type: 'CURRENCY' },
  { code: 'GOLD', label: 'Gold (XAU)', flag: '🪙', type: 'COMMODITY' },
  { code: 'SILVER', label: 'Silver (XAG)', flag: '🥈', type: 'COMMODITY' },
  { code: 'CRUDE_OIL', label: 'Crude Oil (WTI)', flag: '🛢️', type: 'COMMODITY' },
];

export const EconomicImageExtractorModal: React.FC<EconomicImageExtractorModalProps> = ({
  isOpen,
  onClose,
  initialSelection = 'USD',
  onApplyObservations,
  onApplyCommodity,
  existingObservations,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<SupportedSelection>(initialSelection);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeText, setFileSizeText] = useState<string>('');
  const [isPdf, setIsPdf] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedRows, setExtractedRows] = useState<(ExtractedIndicatorItem & { selected: boolean })[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialSelection) {
      setSelectedAsset(initialSelection);
    }
  }, [initialSelection]);

  // Paste image directly from clipboard
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1 || item.type.indexOf('pdf') !== -1) {
            const file = item.getAsFile();
            if (file) {
              handleFileSelected(file);
              break;
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelected = (file: File) => {
    setError(null);
    setAppliedSuccess(null);
    const isImage = file.type.startsWith('image/');
    const isPdfFile = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdfFile) {
      setError('Please upload a valid image file (PNG, JPG, WEBP) or PDF document.');
      return;
    }

    const sizeKb = Math.round(file.size / 1024);
    setFileSizeText(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
    setFileName(file.name);
    setIsPdf(isPdfFile);
    setImageMime(isPdfFile ? 'application/pdf' : (file.type || 'image/png'));

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setExtractedRows([]);
      setHasScanned(false);
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleProcessImage = async () => {
    if (!imagePreview) return;
    setIsProcessing(true);
    setError(null);
    setAppliedSuccess(null);

    try {
      const response = await extractIndicatorsFromImage(imagePreview, imageMime, selectedAsset);
      if (!response.success || !response.indicators || response.indicators.length === 0) {
        throw new Error(response.error || 'No readable economic indicator rows found in this screenshot.');
      }

      setExtractedRows(
        response.indicators.map((ind) => ({
          ...ind,
          selected: true,
        }))
      );
      setHasScanned(true);
    } catch (err: any) {
      console.error('[IMAGE_EXTRACTOR] Error:', err);
      setError(err?.message || 'Failed to extract indicator data from screenshot. Please try another image or edit manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleRow = (index: number) => {
    setExtractedRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, selected: !row.selected } : row))
    );
  };

  const handleUpdateRowField = (index: number, field: keyof ExtractedIndicatorItem, value: any) => {
    setExtractedRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return { ...row, [field]: value };
      })
    );
  };

  const handleRemoveRow = (index: number) => {
    setExtractedRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyToWorkspace = () => {
    const selectedRows = extractedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setError('Please select at least one indicator row to apply.');
      return;
    }

    const isCommodity = selectedAsset === 'GOLD' || selectedAsset === 'SILVER' || selectedAsset === 'CRUDE_OIL';

    if (isCommodity && onApplyCommodity) {
      // Find price or sentiment metrics if present
      const priceRow = selectedRows.find((r) => r.name.toLowerCase().includes('price') || r.unit === '$');
      if (priceRow && priceRow.actual !== null) {
        onApplyCommodity({
          symbol: selectedAsset,
          price: priceRow.actual,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Convert to IndicatorObservation list
    const updatedObservations: IndicatorObservation[] = selectedRows.map((row, idx) => {
      const targetId = row.matchedIndicatorId || `obs_custom_${Date.now()}_${idx}`;
      const officialDef = OFFICIAL_INDICATOR_REGISTRY.find((d) => d.id === targetId);
      const existing = existingObservations.find((o) => o.indicatorId === targetId);

      return {
        id: existing?.id || `obs_${targetId}_${Date.now()}_${idx}`,
        indicatorId: targetId,
        indicatorName: row.name,
        currency: (row.currency || selectedAsset) as CurrencyCode,
        referencePeriod: row.referencePeriod || existing?.referencePeriod || 'Latest Release',
        releaseDate: row.releaseDate || new Date().toISOString().slice(0, 10),
        releaseTime: row.releaseTime || '08:30 GMT',
        actual: row.actual !== null ? Number(row.actual) : (existing?.actual ?? 0),
        forecast: row.forecast !== null ? Number(row.forecast) : null,
        previous: row.previous !== null ? Number(row.previous) : null,
        revisedPrevious: row.revisedPrevious !== null ? Number(row.revisedPrevious) : null,
        unit: row.unit || officialDef?.unit || '%',
        dataSource: row.source || 'Screenshot Economic Calendar',
        sourceUrl: officialDef?.officialSourceUrl || 'https://www.tradingeconomics.com',
        notes: row.notes || 'Extracted via High-Fidelity Multimodal Vision OCR',
        updatedAt: new Date().toISOString(),
        dataRetrievalTimestamp: new Date().toISOString(),
        dataStatus: 'EXTRACTED_FROM_IMAGE',
        verificationStatus: 'VERIFIED',
        confidence: row.confidence || 95,
      };
    });

    onApplyObservations(selectedAsset, updatedObservations);
    setAppliedSuccess(`✓ Successfully applied ${updatedObservations.length} indicator(s) to ${selectedAsset} workspace!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const officialCandidates = OFFICIAL_INDICATOR_REGISTRY.filter((d) => d.currency === selectedAsset);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#0b1120] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0d1629] to-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-military tracking-wide">
                  ECONOMIC CALENDAR IMAGE EXTRACTOR
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Multimodal Vision OCR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload or paste a screenshot of ForexFactory, TradingEconomics, or broker calendars to extract Actual, Forecast, Previous & Units automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Asset Selector (All 11 Supported Selections) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
              <span>1. Target Currency or Commodity ({ALL_SELECTIONS.length} Available)</span>
              <span className="text-[11px] text-cyan-400 font-normal">
                Active Selection: {ALL_SELECTIONS.find((s) => s.code === selectedAsset)?.label}
              </span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-11 gap-1.5">
              {ALL_SELECTIONS.map((item) => {
                const isActive = selectedAsset === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setSelectedAsset(item.code);
                      setExtractedRows([]);
                      setHasScanned(false);
                      setError(null);
                    }}
                    className={`py-2 px-1 rounded-xl text-center border transition flex flex-col items-center justify-center gap-0.5 ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-base">{item.flag}</span>
                    <span className="text-xs font-bold font-mono-code">{item.code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload / Drop Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Upload File (Screenshot, PDF Document, or Paste Ctrl+V)
              </label>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center min-h-[190px] ${
                  imagePreview
                    ? 'border-cyan-500/50 bg-slate-950/60'
                    : 'border-slate-800 hover:border-cyan-500/40 bg-slate-900/40 hover:bg-slate-900/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                />

                {imagePreview ? (
                  isPdf ? (
                    <div className="space-y-2.5 w-full p-4 rounded-xl bg-slate-900/90 border border-red-500/30 text-center">
                      <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="text-xs font-bold text-white truncate max-w-xs mx-auto">
                        {fileName || 'Economic_Calendar_Report.pdf'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-code">
                        PDF Document ({fileSizeText}) • Ready for Table OCR
                      </div>
                      <span className="inline-block text-[10px] text-cyan-400 underline">Click to choose a different file</span>
                    </div>
                  ) : (
                    <div className="space-y-2 w-full">
                      <img
                        src={imagePreview}
                        alt="Screenshot preview"
                        className="max-h-40 mx-auto rounded-lg object-contain border border-slate-800 shadow-md"
                      />
                      <div className="flex items-center justify-center gap-2 text-[11px] text-cyan-400">
                        <span>Click or drag another image/PDF to replace</span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-semibold text-slate-200">
                      Drop economic calendar image or PDF here
                    </div>
                    <div className="text-[11px] text-slate-500">
                      PNG, JPG, WEBP, PDF up to 10MB • or press Ctrl+V anywhere
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button: Scan Image */}
              <button
                type="button"
                onClick={handleProcessImage}
                disabled={!imagePreview || isProcessing}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] disabled:opacity-40 text-slate-950 font-bold font-military text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing {isPdf ? 'PDF Document' : 'Image'} with Gemini Vision...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Indicators from {isPdf ? 'PDF Document' : 'Image'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Extraction Information / Instructions */}
            <div className="lg:col-span-7 flex flex-col justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Info className="w-4 h-4" />
                  <span>How Image Extraction Works</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  PrimePipFX uses high-resolution multimodal vision analysis to parse economic tables. It extracts the indicator name, Previous, Forecast, Actual, and unit (%, thousands, index points).
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-emerald-400 block mb-0.5">✓ Supported Formats</span>
                    <span className="text-slate-400">ForexFactory, Investing.com, TradingEconomics, FXStreet, DailyFX tables</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-amber-400 block mb-0.5">⚠️ Data Quality Safeguard</span>
                    <span className="text-slate-400">You can edit any cell before confirming to ensure 100% precision.</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 mt-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {appliedSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 mt-3">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{appliedSuccess}</span>
                </div>
              )}
            </div>
          </div>

          {/* Scanned Indicator Review Table */}
          {hasScanned && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white font-military uppercase tracking-wider">
                    3. Review & Verify Extracted Records ({extractedRows.length} Found)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Review values, adjust any fields, then click Apply.
                  </span>
                </div>
                <div className="text-[11px] text-cyan-400">
                  {extractedRows.filter((r) => r.selected).length} of {extractedRows.length} selected
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
                <table className="w-full text-xs text-left divide-y divide-slate-800">
                  <thead className="bg-[#0e172a] text-slate-400 text-[10px] font-mono-code uppercase">
                    <tr>
                      <th className="p-2 text-center w-10">Use</th>
                      <th className="p-2">Indicator Name</th>
                      <th className="p-2">Registry Match</th>
                      <th className="p-2 text-right">Actual</th>
                      <th className="p-2 text-right">Forecast</th>
                      <th className="p-2 text-right">Previous</th>
                      <th className="p-2 text-center">Unit</th>
                      <th className="p-2 text-center">Confidence</th>
                      <th className="p-2 text-center w-10">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {extractedRows.map((row, idx) => {
                      return (
                        <tr
                          key={idx}
                          className={`transition ${
                            row.selected ? 'hover:bg-slate-900/60' : 'opacity-40 bg-slate-950/90'
                          }`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => handleToggleRow(idx)}
                              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => handleUpdateRowField(idx, 'name', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-semibold focus:border-cyan-400 outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={row.matchedIndicatorId || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateRowField(idx, 'matchedIndicatorId', val || undefined);
                                const match = officialCandidates.find((d) => d.id === val);
                                if (match) {
                                  handleUpdateRowField(idx, 'unit', match.unit);
                                }
                              }}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 text-[11px] focus:border-cyan-400 outline-none max-w-[200px]"
                            >
                              <option value="">-- Custom / Unmapped --</option>
                              {officialCandidates.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.shortLabel} ({c.name})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={row.actual !== null ? row.actual : ''}
                              placeholder="None"
                              onChange={(e) =>
                                handleUpdateRowField(
                                  idx,
                                  'actual',
                                  e.target.value === '' ? null : Number(e.target.value)
                                )
                              }
                              className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-right text-emerald-400 font-bold font-mono-code text-xs focus:border-cyan-400 outline-none"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={row.forecast !== null ? row.forecast : ''}
                              placeholder="None"
                              onChange={(e) =>
                                handleUpdateRowField(
                                  idx,
                                  'forecast',
                                  e.target.value === '' ? null : Number(e.target.value)
                                )
                              }
                              className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-right text-slate-300 font-mono-code text-xs focus:border-cyan-400 outline-none"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={row.previous !== null ? row.previous : ''}
                              placeholder="None"
                              onChange={(e) =>
                                handleUpdateRowField(
                                  idx,
                                  'previous',
                                  e.target.value === '' ? null : Number(e.target.value)
                                )
                              }
                              className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-right text-slate-400 font-mono-code text-xs focus:border-cyan-400 outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) => handleUpdateRowField(idx, 'unit', e.target.value)}
                              className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-center text-slate-300 text-xs focus:border-cyan-400 outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                row.confidence >= 90
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {row.confidence}%
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#080d19]">
          <div className="text-xs text-slate-400">
            Selected for sync:{' '}
            <strong className="text-cyan-300 font-mono-code">
              {ALL_SELECTIONS.find((s) => s.code === selectedAsset)?.label} ({selectedAsset})
            </strong>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyToWorkspace}
              disabled={extractedRows.filter((r) => r.selected).length === 0}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 text-slate-950 font-bold font-military text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply to {selectedAsset} Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
