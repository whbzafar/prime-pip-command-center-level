import React from 'react';
import {
  CurrencyCode,
  CurrencyScoreResult,
  IndicatorObservation,
  IndicatorDefinition,
} from '../../types/fundamentalIndicatorTypes';
import { OFFICIAL_INDICATOR_REGISTRY, CURRENCIES, CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface DataQualityAuditViewProps {
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  observations: IndicatorObservation[];
  onSelectCurrency: (curr: CurrencyCode) => void;
  onNavigateTab: (tab: any) => void;
}

export const DataQualityAuditView: React.FC<DataQualityAuditViewProps> = ({
  currencyScores,
  observations,
  onSelectCurrency,
  onNavigateTab,
}) => {
  const obsMap = new Map<string, IndicatorObservation>();
  observations.forEach((o) => obsMap.set(o.indicatorId, o));

  const now = new Date().getTime();

  // Audit by currency
  const currencyAudits = CURRENCIES.map((c) => {
    const defs = OFFICIAL_INDICATOR_REGISTRY.filter((d) => d.currency === c.code);
    const requiredDefs = defs.filter((d) => d.required);

    let completed = 0;
    let missingRequired: IndicatorDefinition[] = [];
    let staleCount = 0;
    let currentCount = 0;

    defs.forEach((d) => {
      const obs = obsMap.get(d.id);
      if (obs && obs.actual !== undefined && obs.actual !== null) {
        completed++;
        // Check freshness
        if (obs.releaseDate) {
          const daysDiff = (now - new Date(obs.releaseDate).getTime()) / (1000 * 3600 * 24);
          if (daysDiff > 60) {
            staleCount++;
          } else {
            currentCount++;
          }
        } else {
          currentCount++;
        }
      } else if (d.required) {
        missingRequired.push(d);
      }
    });

    const coveragePct = Math.round((completed / (defs.length || 1)) * 100);
    const requiredCoveragePct = Math.round(
      ((requiredDefs.length - missingRequired.length) / (requiredDefs.length || 1)) * 100
    );

    let statusBadge: 'FULL' | 'ADEQUATE' | 'INCOMPLETE' = 'FULL';
    if (coveragePct < 75 || missingRequired.length > 2) statusBadge = 'INCOMPLETE';
    else if (coveragePct < 90 || missingRequired.length > 0) statusBadge = 'ADEQUATE';

    return {
      currency: c.code,
      meta: CURRENCY_METADATA[c.code],
      totalIndicators: defs.length,
      completed,
      missingRequired,
      coveragePct,
      requiredCoveragePct,
      staleCount,
      currentCount,
      statusBadge,
    };
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              Macro Data Quality & Freshness Audit Engine
            </h3>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Completeness Tracking • Missing Core Releases • Age Classification (&lt;30d Current, &gt;60d Stale)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">CURRENT DATA (&lt; 30 DAYS)</span>
              <span className="text-slate-100 font-bold">Standard Weight Applied (100%)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">PARTIAL / MATURING (&lt; 60 DAYS)</span>
              <span className="text-amber-300 font-bold">Valid with Maturing Status</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">STALE DATA (&gt; 60 DAYS)</span>
              <span className="text-rose-400 font-bold">Requires Verification / Re-Entry</span>
            </div>
          </div>
        </div>
      </div>

      {/* Currency-by-Currency Completeness Matrix */}
      <div className="space-y-3">
        <h4 className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider">
          Currency Workspace Completeness Audit
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {currencyAudits.map((aud) => (
            <div
              key={aud.currency}
              className={`p-4 rounded-xl border space-y-3 ${
                aud.statusBadge === 'INCOMPLETE'
                  ? 'bg-slate-950/80 border-rose-500/30'
                  : aud.statusBadge === 'ADEQUATE'
                  ? 'bg-slate-950/80 border-amber-500/30'
                  : 'bg-slate-950/80 border-emerald-500/30'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{aud.meta?.flag}</span>
                  <div>
                    <h5 className="font-military font-bold text-sm text-slate-100">{aud.currency}</h5>
                    <span className="text-[10px] font-mono-code text-slate-500">
                      {aud.completed} / {aud.totalIndicators} Indicators
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono-code ${
                    aud.statusBadge === 'INCOMPLETE'
                      ? 'bg-rose-500/20 text-rose-300'
                      : aud.statusBadge === 'ADEQUATE'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {aud.coveragePct}% COVERAGE
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  style={{ width: `${aud.coveragePct}%` }}
                  className={`h-full ${
                    aud.coveragePct > 80 ? 'bg-emerald-500' : aud.coveragePct > 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                />
              </div>

              {/* Missing Requirements List */}
              {aud.missingRequired.length > 0 ? (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] font-mono-code space-y-1">
                  <span className="text-rose-300 font-bold block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Missing Core Required Releases:</span>
                  </span>
                  <ul className="text-rose-200/80 space-y-0.5 list-disc list-inside">
                    {aud.missingRequired.map((m) => (
                      <li key={m.id}>{m.shortLabel}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono-code font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All core required indicators verified</span>
                </div>
              )}

              <button
                onClick={() => {
                  onSelectCurrency(aud.currency);
                  onNavigateTab('CURRENCIES');
                }}
                className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-xs font-mono-code font-bold transition cursor-pointer"
              >
                Inspect {aud.currency} Inputs →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
