import React, { useState } from 'react';
import { ShieldCheck, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, FileText } from 'lucide-react';
import { getSbtAssetPath } from './SbtModelsHub';

interface SbtDeterministicChartProps {
  model: any;
  selectedVariationId?: string;
  className?: string;
  initialFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/**
 * Source-accurate SBT reference renderer.
 *
 * The supplied SBT PDF is the authoritative visual reference. Instead of
 * drawing a second, approximate candle interpretation, this component uses
 * the corresponding source diagram asset directly. This guarantees that the
 * candle bodies, wick proportions, sequence, spacing and source annotations
 * shown for Models 1-10 match the supplied reference artwork.
 */
export const SbtDeterministicChart: React.FC<SbtDeterministicChartProps> = ({
  model,
  selectedVariationId,
  className = '',
  initialFullscreen = false,
  onToggleFullscreen,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [zoom, setZoom] = useState(1);

  const modelNumber = Number(model?.modelNumber ?? model?.number ?? 0);
  const sourceGraphicUrl = getSbtAssetPath(modelNumber, selectedVariationId);
  const title = model?.title || `SBT Model (${modelNumber})`;

  const toggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    setIsFullscreen((value) => !value);
  };

  const resetZoom = () => setZoom(1);

  return (
    <div
      id={`sbt-chart-container-${modelNumber}`}
      className={`relative overflow-visible rounded-xl border border-slate-800 bg-white ${
        isFullscreen ? 'fixed inset-0 z-[100] rounded-none h-screen w-screen' : ''
      } ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            PDF SOURCE-EXACT
          </span>
          <span className="truncate text-xs font-semibold text-slate-700">{title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.15))} className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100" title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.75, z - 0.15))} className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100" title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          {zoom !== 1 && (
            <button type="button" onClick={resetZoom} className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100" title="Reset zoom">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-800 hover:bg-cyan-100" title={isFullscreen ? 'Minimize' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {isFullscreen ? 'MINIMIZE' : 'FULLSCREEN'}
          </button>
        </div>
      </div>

      <div className={`relative flex min-h-0 items-center justify-center overflow-auto bg-white p-2 ${isFullscreen ? 'h-[calc(100vh-54px)]' : 'aspect-[460/330] max-h-[620px]'}`}>
        <div className="flex min-h-full min-w-full items-center justify-center" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
          <img
            src={sourceGraphicUrl}
            alt={`SBT Model ${modelNumber} authoritative PDF source diagram`}
            className="block h-auto max-h-full w-auto max-w-full object-contain select-none"
            draggable={false}
          />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500">
        Visual source: supplied Official SBT PDF. The displayed candle artwork is not reconstructed or approximated by a separate vector candle engine.
      </div>
    </div>
  );
};
