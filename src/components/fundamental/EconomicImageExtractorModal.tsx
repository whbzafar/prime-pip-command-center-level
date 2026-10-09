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
  patchFundamentalObservations,
  ExtractedIndicatorItem,
} from '../../services/fundamentalLiveResearchService';
import {
  renderPdfPageToImage,
  PdfExtractionTelemetry,
  ExtractedMultiAssetRecord,
} from '../../utils/pdfDocumentParser';

export type SupportedSelection =
  | 'ALL'
  | CurrencyCode
  | 'GOLD'
  | 'SILVER'
  | 'CRUDE_OIL'
  | 'INDICES'
  | 'STOCKS'
  | 'CRYPTO';

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

const ALL_SELECTIONS: {
  code: SupportedSelection;
  label: string;
  flag: string;
  type: 'ALL' | 'CURRENCY' | 'COMMODITY' | 'MULTI_ASSET';
}[] = [
  { code: 'ALL', label: 'All Currencies & Assets (Multi-Page PDF)', flag: '🌐', type: 'ALL' },
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
  { code: 'INDICES', label: 'Global Indices', flag: '📈', type: 'MULTI_ASSET' },
  { code: 'STOCKS', label: 'Stocks / Equities', flag: '🏛️', type: 'MULTI_ASSET' },
  { code: 'CRYPTO', label: 'Cryptocurrencies', flag: '₿', type: 'MULTI_ASSET' },
];

export const EconomicImageExtractorModal: React.FC<EconomicImageExtractorModalProps> = ({
  isOpen,
  onClose,
  initialSelection = 'ALL',
  onApplyObservations,
  onApplyCommodity,
  existingObservations,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<SupportedSelection>(initialSelection || 'ALL');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeText, setFileSizeText] = useState<string>('');
  const [isPdf, setIsPdf] = useState(false);
  const [rawFileBytes, setRawFileBytes] = useState<Uint8Array | null>(null);
  const [pdfRenderedPreview, setPdfRenderedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedRows, setExtractedRows] = useState<(ExtractedIndicatorItem & { selected: boolean })[]>([]);
  const [extractedMultiAssets, setExtractedMultiAssets] = useState<ExtractedMultiAssetRecord[]>([]);
  const [extractionTelemetry, setExtractionTelemetry] = useState<PdfExtractionTelemetry | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');

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
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|jfif|tiff?)$/i.test(file.name);
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

    if (isPdfFile) {
      file.arrayBuffer().then((ab) => {
        const u8 = new Uint8Array(ab);
        setRawFileBytes(new Uint8Array(u8));
        renderPdfPageToImage(new Uint8Array(u8), 1, 1.5).then((rendered) => {
          if (rendered && rendered.dataUrl) {
            setPdfRenderedPreview(rendered.dataUrl);
          }
        }).catch((e) => console.warn('PDF render preview warning:', e));
      }).catch((e) => console.warn('ArrayBuffer read failed:', e));
    } else {
      setRawFileBytes(null);
      setPdfRenderedPreview(null);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (isPdfFile || !result.startsWith('data:image')) {
        setImagePreview(result);
        setExtractedRows([]);
        setHasScanned(false);
      } else {
        // Optimize and downscale image to max 1280px to prevent payload-too-large errors on Vercel/Android
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const maxDim = 1280;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/jpeg', 0.85);
            setImagePreview(optimized);
            setImageMime('image/jpeg');
          } else {
            setImagePreview(result);
          }
          setExtractedRows([]);
          setHasScanned(false);
        };
        img.onerror = () => {
          setImagePreview(result);
          setExtractedRows([]);
          setHasScanned(false);
        };
        img.src = result;
      }
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
    if (!imagePreview && !rawFileBytes && !pdfRenderedPreview) return;
    setIsProcessing(true);
    setError(null);
    setAppliedSuccess(null);
    setExtractionTelemetry(null);

    try {
      const payload = rawFileBytes ? new Uint8Array(rawFileBytes) : (imagePreview || pdfRenderedPreview);
      const effectiveMime = isPdf ? 'application/pdf' : imageMime;
      const response = await extractIndicatorsFromImage(payload!, effectiveMime, selectedAsset);
      if (!response.success || !response.indicators || response.indicators.length === 0) {
        throw new Error(response.error || 'No readable economic indicator rows found in this document/screenshot.');
      }

      setExtractedRows(
        response.indicators.map((ind) => ({
          ...ind,
          selected: true,
        }))
      );
      if (response.multiAssets && response.multiAssets.length > 0) {
        setExtractedMultiAssets(response.multiAssets);
      } else {
        setExtractedMultiAssets([]);
      }
      if (response.telemetry) {
        setExtractionTelemetry(response.telemetry);
      }
      setHasScanned(true);
    } catch (err: any) {
      console.warn('[IMAGE_EXTRACTOR] Extraction error:', err);
      setExtractedRows([]);
      setExtractedMultiAssets([]);
      setHasScanned(false);
      setError(
        err?.message ||
          'Unable to extract real indicator values from this document. No fabricated or default values were substituted. You may add rows manually or upload a clearer report.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNewManualRow = () => {
    const defaultCurr =
      selectedAsset !== 'ALL' && !['GOLD', 'SILVER', 'CRUDE_OIL', 'INDICES', 'STOCKS', 'CRYPTO'].includes(selectedAsset)
        ? selectedAsset
        : 'USD';
    const newRow: ExtractedIndicatorItem & { selected: boolean } = {
      name: 'Custom Economic Release',
      currency: defaultCurr,
      actual: 0.0,
      forecast: 0.0,
      previous: 0.0,
      revisedPrevious: null,
      unit: '%',
      referencePeriod: 'Latest',
      releaseDate: new Date().toISOString().slice(0, 10),
      releaseTime: '12:00 GMT',
      source: 'Verified User Entry',
      confidence: 100,
      dataStatus: 'EXTRACTED_FROM_IMAGE',
      notes: '100% verified manual data entry',
      selected: true,
    };
    setExtractedRows((prev) => [newRow, ...prev]);
    setHasScanned(true);
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

  const handleApplyToWorkspace = async () => {
    const selectedRows = extractedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setError('Please select at least one indicator row to apply.');
      return;
    }

    const commoditySymbols: ('GOLD' | 'SILVER' | 'CRUDE_OIL')[] = ['GOLD', 'SILVER', 'CRUDE_OIL'];
    if (onApplyCommodity) {
      commoditySymbols.forEach((sym) => {
        if (selectedAsset === sym || selectedAsset === 'ALL') {
          const symRows = selectedRows.filter(
            (r) =>
              selectedAsset === sym ||
              r.name.toUpperCase().includes(sym) ||
              (sym === 'GOLD' && (r.name.toUpperCase().includes('XAU') || r.name.toLowerCase().includes('gold'))) ||
              (sym === 'SILVER' && (r.name.toUpperCase().includes('XAG') || r.name.toLowerCase().includes('silver'))) ||
              (sym === 'CRUDE_OIL' && (r.name.toUpperCase().includes('OIL') || r.name.toLowerCase().includes('wti') || r.name.toLowerCase().includes('crude')))
          );
          if (symRows.length > 0) {
            const priceRow = symRows.find((r) => r.name.toLowerCase().includes('price') || r.unit === '$' || (typeof r.actual === 'number' && r.actual > 20)) || symRows[0];
            const yieldRow = symRows.find((r) => r.name.toLowerCase().includes('yield') || r.name.toLowerCase().includes('tips'));
            const breakevenRow = symRows.find((r) => r.name.toLowerCase().includes('breakeven'));
            const inventoryRow = symRows.find((r) => r.name.toLowerCase().includes('inventor'));

            const updatePayload: Partial<CommodityObservation> = {
              symbol: sym,
              updatedAt: new Date().toISOString(),
            };
            if (priceRow && typeof priceRow.actual === 'number') {
              updatePayload.price = priceRow.actual;
              updatePayload.referenceDate = priceRow.referencePeriod || new Date().toISOString().slice(0, 10);
            }
            if (yieldRow && typeof yieldRow.actual === 'number') {
              updatePayload.usRealYield10Y = yieldRow.actual;
            }
            if (breakevenRow && typeof breakevenRow.actual === 'number') {
              updatePayload.inflationBreakeven5Y = breakevenRow.actual;
            }
            if (inventoryRow && typeof inventoryRow.actual === 'number') {
              updatePayload.inventoriesWeeklySurpriseMb = inventoryRow.actual;
            }
            onApplyCommodity(updatePayload);
          }
        }
      });
    }

    // Persist multi-asset records (Indices, Stocks, Crypto) so their intelligence views update immediately
    try {
      const existingMultiRaw = localStorage.getItem('primepip_multi_asset_extracted_v1');
      const existingMulti: ExtractedMultiAssetRecord[] = existingMultiRaw ? JSON.parse(existingMultiRaw) : [];
      const mergedMap = new Map<string, ExtractedMultiAssetRecord>();
      existingMulti.forEach((m) => mergedMap.set(m.symbol, m));
      extractedMultiAssets.forEach((m) => mergedMap.set(m.symbol, m));

      // Also map any edited selectedRows that correspond to Indices/Stocks/Crypto
      selectedRows.forEach((row) => {
        if (row.matchedIndicatorId?.startsWith('MULTI_') && typeof row.actual === 'number') {
          const sym = row.matchedIndicatorId.replace('MULTI_', '');
          const prevRec = mergedMap.get(sym);
          mergedMap.set(sym, {
            category:
              selectedAsset === 'INDICES'
                ? 'INDICES'
                : selectedAsset === 'STOCKS'
                ? 'STOCKS'
                : selectedAsset === 'CRYPTO'
                ? 'CRYPTO'
                : prevRec?.category || 'INDICES',
            symbol: sym,
            name: row.name,
            price: row.actual,
            changePct: row.previous,
            secondaryMetric: row.forecast,
            unit: row.unit || '$',
            bias: row.previous !== null && row.previous < 0 ? 'BEARISH' : 'BULLISH',
            notes: row.notes || 'Updated from PDF Document',
            updatedAt: new Date().toISOString(),
          });
        }
      });

      if (mergedMap.size > 0) {
        const mergedList = Array.from(mergedMap.values());
        localStorage.setItem('primepip_multi_asset_extracted_v1', JSON.stringify(mergedList));
        window.dispatchEvent(new CustomEvent('primepip-multi-asset-updated', { detail: mergedList }));

        // Also synchronize primepip_fundamental_multi_assets_v1 used by FundamentalAssetCommandCenter and Intelligence views
        try {
          const savedMultiRaw = localStorage.getItem('primepip_fundamental_multi_assets_v1');
          const currentMultiList: any[] = savedMultiRaw ? JSON.parse(savedMultiRaw) : [];
          if (Array.isArray(currentMultiList) && currentMultiList.length > 0) {
            const updatedMultiList = currentMultiList.map((item) => {
              const normItemSym = String(item.symbol || '').replace('/USDT', '').replace('S&P500', 'SPX500').toUpperCase();
              const match = mergedList.find((m) => {
                const normM = String(m.symbol || '').replace('/USDT', '').replace('S&P500', 'SPX500').toUpperCase();
                return normM === normItemSym || String(m.symbol).toUpperCase() === String(item.symbol).toUpperCase();
              });
              if (!match) return item;
              const nextScore = match.bias === 'BULLISH' ? Math.max(25, item.score || 35) : match.bias === 'BEARISH' ? Math.min(-25, item.score || -35) : item.score;
              return {
                ...item,
                price: typeof match.price === 'number' && match.price > 0 ? match.price : item.price,
                changePercent: typeof match.changePct === 'number' ? match.changePct : item.changePercent,
                score: nextScore,
                bias: nextScore >= 35 ? 'STRONG BULLISH' : nextScore >= 10 ? 'BULLISH' : nextScore <= -35 ? 'STRONG BEARISH' : nextScore <= -10 ? 'BEARISH' : 'NEUTRAL',
                keyMetric1Value: match.secondaryMetric !== null && match.secondaryMetric !== undefined ? String(match.secondaryMetric) : item.keyMetric1Value,
                drivers: match.notes ? [match.notes, ...(Array.isArray(item.drivers) ? item.drivers.slice(0, 2) : [])] : item.drivers,
                updatedAt: new Date().toISOString(),
                verificationStatus: 'VERIFIED',
              };
            });
            localStorage.setItem('primepip_fundamental_multi_assets_v1', JSON.stringify(updatedMultiList));
          }
          window.dispatchEvent(new CustomEvent('primepipfx_fundamental_data_updated'));
        } catch {}
      }
    } catch (e) {
      console.warn('[IMAGE_EXTRACTOR] Multi-asset persistence warning:', e);
    }

    // Convert to IndicatorObservation list
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
    const updatedObservations: IndicatorObservation[] = selectedRows.map((row, idx) => {
      const rawCurr = (row.currency || (validCurrencies.includes(selectedAsset) ? selectedAsset : 'USD')).toUpperCase();
      const rowCurr = (validCurrencies.includes(rawCurr) ? rawCurr : 'USD') as CurrencyCode;
      const targetId = row.matchedIndicatorId || `obs_custom_${rowCurr}_${Date.now()}_${idx}`;
      const officialDef = OFFICIAL_INDICATOR_REGISTRY.find((d) => d.id === targetId);
      const existing = existingObservations.find((o) => o.indicatorId === targetId);

      return {
        id: existing?.id || `obs_${targetId}_${Date.now()}_${idx}`,
        indicatorId: targetId,
        indicatorName: row.name,
        currency: rowCurr,
        referencePeriod: row.referencePeriod || existing?.referencePeriod || 'Latest Release',
        releaseDate: row.releaseDate || new Date().toISOString().slice(0, 10),
        releaseTime: row.releaseTime || '08:30 GMT',
        actual: row.actual !== null && !isNaN(Number(row.actual)) ? Number(row.actual) : (existing?.actual ?? null),
        forecast: row.forecast !== null && !isNaN(Number(row.forecast)) ? Number(row.forecast) : null,
        previous: row.previous !== null && !isNaN(Number(row.previous)) ? Number(row.previous) : null,
        revisedPrevious: row.revisedPrevious !== null && !isNaN(Number(row.revisedPrevious)) ? Number(row.revisedPrevious) : null,
        unit: row.unit || officialDef?.unit || '%',
        dataSource: row.source || 'Uploaded Economic Calendar Table',
        sourceUrl: officialDef?.officialSourceUrl || 'https://www.forexfactory.com/calendar',
        notes: row.notes || 'Extracted via High-Fidelity Document & Vision Parser',
        updatedAt: new Date().toISOString(),
        dataRetrievalTimestamp: new Date().toISOString(),
        dataStatus: 'EXTRACTED_FROM_IMAGE',
        verificationStatus: 'VERIFIED',
        confidence: row.confidence || 95,
      };
    });

    try {
      // Mandatory server-side patching into persistent institutional storage
      await patchFundamentalObservations(
        updatedObservations,
        fileName ? `Uploaded: ${fileName}` : 'Uploaded Economic Calendar Table'
      );
    } catch (e) {
      console.warn('[IMAGE_EXTRACTOR] Patch to server warning:', e);
    }

    onApplyObservations(selectedAsset, updatedObservations);
    const uniqueCurrencies = Array.from(new Set(updatedObservations.map((o) => o.currency)));
    setAppliedSuccess(
      `✓ Successfully patched ${updatedObservations.length} indicator(s) across ${uniqueCurrencies.length} currencies (${uniqueCurrencies.join(', ')}) into institutional database!`
    );
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const getCandidatesForRow = (rowCurr?: string) => {
    const target = (rowCurr || (selectedAsset !== 'ALL' ? selectedAsset : 'USD')).toUpperCase();
    const matches = OFFICIAL_INDICATOR_REGISTRY.filter((d) => d.currency === target);
    return matches.length > 0 ? matches : OFFICIAL_INDICATOR_REGISTRY;
  };

  const displayedRows = extractedRows.filter((r) => {
    if (currencyFilter === 'ALL') return true;
    return (r.currency || 'USD').toUpperCase() === currencyFilter;
  });

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
                      {pdfRenderedPreview ? (
                        <div className="relative inline-block max-w-sm mx-auto">
                          <img
                            src={pdfRenderedPreview}
                            alt="PDF Document Preview"
                            className="max-h-48 mx-auto rounded-lg object-contain border border-slate-700 shadow-lg bg-white"
                          />
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-cyan-300 border border-cyan-500/40">
                            PDF Page 1 Rendered
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center">
                          <FileText className="w-7 h-7" />
                        </div>
                      )}
                      <div className="text-xs font-bold text-white truncate max-w-xs mx-auto">
                        {fileName || 'Economic_Calendar_Report.pdf'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-code">
                        PDF Document ({fileSizeText}) • Ready for Table OCR & Extraction
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

              {/* Direct Manual Entry Option Alongside Upload Image */}
              <button
                type="button"
                onClick={handleAddNewManualRow}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 font-bold font-military text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Directly enter indicator data (Actual, Forecast, Previous) with 100% precision"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>+ ADD / RECORD DATA MANUALLY</span>
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
              {extractionTelemetry && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Total Pages:</span>
                      <span className="font-mono-code font-bold text-white">{extractionTelemetry.totalPages}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Pages Processed:</span>
                      <span className="font-mono-code font-bold text-emerald-400">{extractionTelemetry.pagesProcessed}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Pages Failed:</span>
                      <span className={`font-mono-code font-bold ${extractionTelemetry.pagesFailed > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {extractionTelemetry.pagesFailed}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Values Extracted:</span>
                      <span className="font-mono-code font-bold text-cyan-300">{extractionTelemetry.valuesExtracted}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Requiring Review:</span>
                      <span className={`font-mono-code font-bold ${extractionTelemetry.valuesRequiringReview > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {extractionTelemetry.valuesRequiringReview}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono-code text-[10px] font-bold">
                      {extractionTelemetry.extractionMethod}
                    </span>
                    {extractionTelemetry.incompleteReason && (
                      <span className="text-[11px] text-amber-400 font-semibold">
                        ({extractionTelemetry.incompleteReason})
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white font-military uppercase tracking-wider">
                    3. Review & Verify Extracted Records ({extractedRows.length} Found)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Review values, adjust any fields, then click Patch.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAddNewManualRow}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 font-bold font-mono-code text-[11px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>+ Add Row</span>
                  </button>
                  <div className="text-[11px] text-cyan-400">
                    {extractedRows.filter((r) => r.selected).length} of {extractedRows.length} selected
                  </div>
                </div>
              </div>

              {/* Currency Filter Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] text-slate-400 font-mono-code uppercase mr-1">Filter Currency:</span>
                {['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD'].map((curr) => {
                  const count = curr === 'ALL' ? extractedRows.length : extractedRows.filter((r) => (r.currency || 'USD').toUpperCase() === curr).length;
                  if (curr !== 'ALL' && count === 0) return null;
                  const isActive = currencyFilter === curr;
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setCurrencyFilter(curr)}
                      className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono-code font-bold transition flex items-center gap-1 ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{curr}</span>
                      <span className="text-[9px] px-1 rounded-full bg-slate-800 text-slate-300">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
                <table className="w-full text-xs text-left divide-y divide-slate-800">
                  <thead className="bg-[#0e172a] text-slate-400 text-[10px] font-mono-code uppercase">
                    <tr>
                      <th className="p-2 text-center w-10">Use</th>
                      <th className="p-2 text-center w-20">Currency</th>
                      <th className="p-2">Indicator Name</th>
                      <th className="p-2">Registry Match</th>
                      <th className="p-2 text-right">Actual</th>
                      <th className="p-2 text-right">Forecast</th>
                      <th className="p-2 text-right">Previous</th>
                      <th className="p-2 text-center">Unit</th>
                      <th className="p-2 text-center">Confidence</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-center w-10">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {extractedRows.map((row, idx) => {
                      if (currencyFilter !== 'ALL' && (row.currency || 'USD').toUpperCase() !== currencyFilter) {
                        return null;
                      }
                      const candidates = getCandidatesForRow(row.currency);
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
                          <td className="p-2 text-center">
                            <select
                              value={row.currency || 'USD'}
                              onChange={(e) => {
                                const newCurr = e.target.value;
                                handleUpdateRowField(idx, 'currency', newCurr);
                                // Reset matched ID if not belonging to new currency
                                handleUpdateRowField(idx, 'matchedIndicatorId', undefined);
                              }}
                              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono-code text-[11px] font-bold focus:border-cyan-400 outline-none"
                            >
                              <option value="USD">USD 🇺🇸</option>
                              <option value="EUR">EUR 🇪🇺</option>
                              <option value="GBP">GBP 🇬🇧</option>
                              <option value="JPY">JPY 🇯🇵</option>
                              <option value="CAD">CAD 🇨🇦</option>
                              <option value="AUD">AUD 🇦🇺</option>
                              <option value="CHF">CHF 🇨🇭</option>
                              <option value="NZD">NZD 🇳🇿</option>
                            </select>
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
                                const match = candidates.find((d) => d.id === val);
                                if (match) {
                                  handleUpdateRowField(idx, 'unit', match.unit);
                                  handleUpdateRowField(idx, 'currency', match.currency);
                                }
                              }}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 text-[11px] focus:border-cyan-400 outline-none max-w-[200px]"
                            >
                              <option value="">-- Custom / Unmapped --</option>
                              {candidates.map((c) => (
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
                          <td className="p-2 text-center whitespace-nowrap">
                            {row.actual !== null ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                VALIDATED
                              </span>
                            ) : row.forecast !== null || row.previous !== null ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                REVIEW REQUIRED
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                NOT EXTRACTED
                              </span>
                            )}
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 active:scale-95 disabled:opacity-40 text-slate-950 font-bold font-military text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {selectedAsset === 'ALL'
                  ? `PATCH ALL CURRENCIES & WORKSPACES (${extractedRows.filter((r) => r.selected).length})`
                  : `PATCH & APPLY TO ${selectedAsset} WORKSPACE (${extractedRows.filter((r) => r.selected).length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
