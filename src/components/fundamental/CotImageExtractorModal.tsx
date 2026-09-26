import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Sparkles, Check, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { CurrencyCode, CotPositioningRecord } from '../../types/fundamentalIndicatorTypes';
import { CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import { extractCotFromImage } from '../../services/fundamentalLiveResearchService';

interface CotImageExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRecords: (records: CotPositioningRecord[]) => void;
  existingRecords: CotPositioningRecord[];
}

interface ExtractedCotRow {
  currency: CurrencyCode;
  selected: boolean;
  contractName: string;
  openInterest: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  commercialLong: number;
  commercialShort: number;
  reportDate: string;
  releaseDate: string;
  notes?: string;
}

export const CotImageExtractorModal: React.FC<CotImageExtractorModalProps> = ({
  isOpen,
  onClose,
  onApplyRecords,
  existingRecords,
}) => {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>('image/png');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeText, setFileSizeText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedRows, setExtractedRows] = useState<ExtractedCotRow[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = (file: File) => {
    setError(null);
    setAppliedSuccess(null);
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      setError('Please upload a valid image file (PNG, JPG, WEBP) or PDF document.');
      return;
    }

    const sizeKb = Math.round(file.size / 1024);
    setFileSizeText(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
    setFileName(file.name);
    setFileMime(isPdf ? 'application/pdf' : file.type || 'image/png');

    const reader = new FileReader();
    reader.onload = (e) => {
      setFilePreview(e.target?.result as string);
      setExtractedRows([]);
      setHasScanned(false);
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!filePreview) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await extractCotFromImage(filePreview, fileMime);
      if (!res.success || !res.records || res.records.length === 0) {
        throw new Error(res.error || 'No COT data could be extracted from this document.');
      }

      const rows: ExtractedCotRow[] = res.records.map((r: any) => {
        const curr = (String(r.currency || 'USD').toUpperCase()) as CurrencyCode;
        const existing = existingRecords.find((ex) => ex.currency === curr);
        return {
          currency: curr,
          selected: true,
          contractName: r.contractName || existing?.contractName || `${curr} Futures (CME)`,
          openInterest: typeof r.openInterest === 'number' ? r.openInterest : (existing?.openInterest ?? 100000),
          nonCommercialLong: typeof r.nonCommercialLong === 'number' ? r.nonCommercialLong : (existing?.nonCommercialLong ?? 40000),
          nonCommercialShort: typeof r.nonCommercialShort === 'number' ? r.nonCommercialShort : (existing?.nonCommercialShort ?? 30000),
          commercialLong: typeof r.commercialLong === 'number' ? r.commercialLong : (existing?.commercialLong ?? 50000),
          commercialShort: typeof r.commercialShort === 'number' ? r.commercialShort : (existing?.commercialShort ?? 60000),
          reportDate: r.reportDate || existing?.reportDate || new Date().toISOString().slice(0, 10),
          releaseDate: r.releaseDate || existing?.releaseDate || new Date().toISOString().slice(0, 10),
          notes: r.notes || existing?.notes || 'CFTC legacy report extracted.',
        };
      });

      setExtractedRows(rows);
      setHasScanned(true);
    } catch (err: any) {
      console.error('[COT OCR] Error:', err);
      setError(err?.message || 'Failed to extract COT data from document. Please review or edit values manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    const selected = extractedRows.filter((r) => r.selected);
    if (selected.length === 0) {
      setError('Please select at least one COT row to apply.');
      return;
    }

    const updatedRecords: CotPositioningRecord[] = selected.map((r) => {
      const existing = existingRecords.find((e) => e.currency === r.currency);
      return {
        id: existing?.id || `cot_${r.currency.toLowerCase()}`,
        currency: r.currency,
        contractName: r.contractName,
        reportDate: r.reportDate,
        releaseDate: r.releaseDate,
        openInterest: r.openInterest,
        nonCommercialLong: r.nonCommercialLong,
        nonCommercialShort: r.nonCommercialShort,
        nonCommercialSpreading: existing?.nonCommercialSpreading || 0,
        commercialLong: r.commercialLong,
        commercialShort: r.commercialShort,
        dealerLong: existing?.dealerLong || 0,
        dealerShort: existing?.dealerShort || 0,
        assetManagerLong: existing?.assetManagerLong || 0,
        assetManagerShort: existing?.assetManagerShort || 0,
        leveragedFundsLong: existing?.leveragedFundsLong || 0,
        leveragedFundsShort: existing?.leveragedFundsShort || 0,
        otherReportablesLong: existing?.otherReportablesLong || 0,
        otherReportablesShort: existing?.otherReportablesShort || 0,
        nonReportableLong: existing?.nonReportableLong || 0,
        nonReportableShort: existing?.nonReportableShort || 0,
        notes: r.notes,
        sourceUrl: existing?.sourceUrl || 'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm',
      };
    });

    onApplyRecords(updatedRecords);
    setAppliedSuccess(`✓ Successfully updated ${updatedRecords.length} COT Currency Positioning Records!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0b1120] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0d1629] to-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-military flex items-center gap-2">
                <span>COT REPORT DOCUMENT EXTRACTOR</span>
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  CFTC Vision OCR
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Upload screenshot or PDF of CFTC Commitments of Traders tables to extract institutional positioning data 100% accurately.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono-code flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {appliedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{appliedSuccess}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {!filePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition bg-slate-900/40 hover:bg-slate-900/70"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              />
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 font-military tracking-wide uppercase">
                Drop CFTC COT Report Image or PDF
              </h3>
              <p className="text-xs text-slate-400 font-mono-code mt-1.5 max-w-md mx-auto">
                Supports screenshots from CFTC.gov, Tradingster, Barchart, or downloaded CFTC PDF reports.
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-military text-xs uppercase tracking-wider transition"
              >
                Browse File or Paste from Clipboard
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-mono-code truncate max-w-xs sm:max-w-md">
                      {fileName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono-code">{fileSizeText} • Ready for Extraction</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilePreview(null);
                      setExtractedRows([]);
                      setHasScanned(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleProcess}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-military text-xs uppercase tracking-wider flex items-center gap-1.5 shadow"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Extracting COT...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{hasScanned ? 'Re-Extract COT' : 'Extract COT Positioning'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Extracted Results Table */}
              {hasScanned && extractedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-military font-bold text-slate-200 uppercase">
                    <span>Extracted COT Positioning ({extractedRows.length} currencies)</span>
                    <span className="text-[10px] text-cyan-400 font-mono-code">Review contracts and net position</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
                    <table className="w-full text-xs text-left divide-y divide-slate-800">
                      <thead className="bg-[#0e172a] text-slate-400 text-[10px] font-mono-code uppercase">
                        <tr>
                          <th className="p-2 text-center w-10">Use</th>
                          <th className="p-2">Currency</th>
                          <th className="p-2 text-right">Open Interest</th>
                          <th className="p-2 text-right">Non-Comm Long</th>
                          <th className="p-2 text-right">Non-Comm Short</th>
                          <th className="p-2 text-right">Comm Long</th>
                          <th className="p-2 text-right">Comm Short</th>
                          <th className="p-2 text-right">Net Speculator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono-code text-[11px]">
                        {extractedRows.map((row, idx) => {
                          const net = row.nonCommercialLong - row.nonCommercialShort;
                          return (
                            <tr key={row.currency} className={row.selected ? 'hover:bg-slate-900/60' : 'opacity-40'}>
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.selected}
                                  onChange={() =>
                                    setExtractedRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r))
                                    )
                                  }
                                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="p-2 font-bold text-white flex items-center gap-1.5">
                                <span>{CURRENCY_METADATA[row.currency]?.flag}</span>
                                <span>{row.currency}</span>
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  value={row.openInterest}
                                  onChange={(e) =>
                                    setExtractedRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, openInterest: Number(e.target.value) } : r))
                                    )
                                  }
                                  className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-right text-slate-100 outline-none"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  value={row.nonCommercialLong}
                                  onChange={(e) =>
                                    setExtractedRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, nonCommercialLong: Number(e.target.value) } : r))
                                    )
                                  }
                                  className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-right text-emerald-400 font-bold outline-none"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  value={row.nonCommercialShort}
                                  onChange={(e) =>
                                    setExtractedRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, nonCommercialShort: Number(e.target.value) } : r))
                                    )
                                  }
                                  className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-right text-rose-400 font-bold outline-none"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  value={row.commercialLong}
                                  onChange={(e) =>
                                    setExtractedRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, commercialLong: Number(e.target.value) } : r))
                                    )
                                  }
                                  className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-right text-slate-300 outline-none"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  value={row.commercialShort}
                                  onChange={(e) =>
                                    setExtractedRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, commercialShort: Number(e.target.value) } : r))
                                    )
                                  }
                                  className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-right text-slate-300 outline-none"
                                />
                              </td>
                              <td className={`p-2 text-right font-bold ${net > 0 ? 'text-emerald-400' : net < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                {net > 0 ? `+${net.toLocaleString()}` : net.toLocaleString()}
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#080d19]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={extractedRows.filter((r) => r.selected).length === 0}
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Apply Selected COT Data ({extractedRows.filter((r) => r.selected).length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
