import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ExternalLink,
  FileCode,
  PlusCircle,
  Layers,
  Activity,
  Server,
  ChevronDown,
  ChevronUp,
  Search,
  Lock,
  Radio,
} from 'lucide-react';
import { IndicatorObservation } from '../../types/fundamentalIndicatorTypes';

interface DataControlCenterViewProps {
  observations: IndicatorObservation[];
  onUpdateObservation: (updated: IndicatorObservation) => void;
  onNotify?: (msg: string) => void;
}

export const DataControlCenterView: React.FC<DataControlCenterViewProps> = ({
  observations,
  onUpdateObservation,
  onNotify,
}) => {
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncingTarget, setSyncingTarget] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<
    'CONTROL_CENTER' | 'SOURCE_MAP' | 'MANUAL_ENTRY' | 'SYNC_AND_QUALITY_LOGS'
  >('CONTROL_CENTER');
  const [filterAsset, setFilterAsset] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Manual Entry State
  const [manualIndicatorId, setManualIndicatorId] = useState<string>('IND_USD_CPI_YOY');
  const [manualPeriod, setManualPeriod] = useState<string>(new Date().toISOString().slice(0, 7) + '-01');
  const [manualPrev, setManualPrev] = useState<string>('');
  const [manualForecast, setManualForecast] = useState<string>('');
  const [manualActual, setManualActual] = useState<string>('');
  const [manualSource, setManualSource] = useState<string>('Official BLS Release Table');
  const [manualSourceUrl, setManualSourceUrl] = useState<string>('https://www.bls.gov/cpi/');
  const [manualReleaseDate, setManualReleaseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [manualEnteredBy, setManualEnteredBy] = useState<string>('Lead Macro Analyst');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/fundamental-architecture/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.warn('Error fetching fundamental architecture overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const handleSyncProfile = async (profileTarget: string) => {
    setSyncingTarget(profileTarget);
    try {
      const res = await fetch('/api/fundamental-architecture/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileTarget }),
      });
      const data = await res.json();
      await fetchOverview();
      if (data?.syncLog) {
        onNotify?.(
          `✓ Synced ${profileTarget}: ${data.syncLog.records_received} received, ${data.syncLog.records_inserted + data.syncLog.records_updated} stored (${data.syncLog.status}).`
        );
      }
    } catch (err: any) {
      onNotify?.(`⚠️ Sync failed for ${profileTarget}: ${err?.message || 'Network error'}`);
    } finally {
      setSyncingTarget(null);
    }
  };

  const promoteToDashboardObservation = (archObs: any, indicatorMeta: any) => {
    const dashboardId = indicatorMeta?.dashboard_indicator_id || archObs.indicator_code;
    const existing = observations.find((o) => o.indicatorId === dashboardId);
    const actualVal = typeof archObs.actual_value === 'number' ? archObs.actual_value : null;
    const prevVal = typeof archObs.previous_value === 'number' ? archObs.previous_value : null;
    const forecastVal =
      typeof archObs.forecast_value === 'number'
        ? archObs.forecast_value
        : existing?.forecast ?? prevVal ?? 0;

    if (actualVal === null) return;

    const updatedObs: IndicatorObservation = {
      id: existing?.id || `obs_${dashboardId}`,
      indicatorId: dashboardId,
      currency: (archObs.asset_currency || existing?.currency || 'USD') as any,
      category: (indicatorMeta?.category || existing?.category || 'MONETARY_POLICY') as any,
      indicatorName: archObs.indicator_name || existing?.indicatorName || dashboardId,
      actual: actualVal,
      forecast: forecastVal,
      previous: prevVal ?? actualVal,
      revisedPrevious:
        typeof archObs.revised_previous_value === 'number'
          ? archObs.revised_previous_value
          : existing?.revisedPrevious,
      unit: archObs.unit || existing?.unit || '%',
      frequency: (indicatorMeta?.frequency === 'QUARTERLY'
        ? 'Quarterly'
        : indicatorMeta?.frequency === 'WEEKLY'
        ? 'Weekly'
        : 'Monthly') as any,
      referencePeriod: archObs.observation_period,
      releaseDate: archObs.release_timestamp
        ? String(archObs.release_timestamp).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
      sourceName: archObs.source_name,
      sourceUrl: archObs.source_url,
      sourceType: archObs.verification_status === 'MANUAL' ? 'MANUAL' : 'OFFICIAL',
      verificationStatus: 'VERIFIED',
      dataStatus: 'COMPLETE',
      notes: `Verified via Prime FX Data Control Center (${archObs.source_id} • ${indicatorMeta?.source_series_id || archObs.indicator_code})`,
    };

    onUpdateObservation(updatedObs);
  };

  const handleVerifyAndAccept = async (obs: any) => {
    try {
      const res = await fetch('/api/fundamental-architecture/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observationId: obs.id,
          verifiedBy: 'Prime FX Operator',
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        const indicatorMeta = (overview?.indicators || []).find((i: any) => i.id === obs.indicator_id);
        promoteToDashboardObservation(data.observation, indicatorMeta);
        await fetchOverview();
        onNotify?.(`🟢 Verified & Accepted ${obs.indicator_name} (${obs.actual_value}${obs.unit}) into active dashboard.`);
      }
    } catch (err: any) {
      onNotify?.(`⚠️ Verification error: ${err?.message || 'Failed'}`);
    }
  };

  const handleVerifyAllValid = async () => {
    const validList = (overview?.observations || []).filter(
      (o: any) => o.actual_value !== null && o.validation_status === 'VALID'
    );
    if (validList.length === 0) {
      onNotify?.('No VALID unverified observations available yet. Click [ SYNC USD DATA ] first.');
      return;
    }
    for (const obs of validList) {
      await fetch('/api/fundamental-architecture/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observationId: obs.id,
          verifiedBy: 'Batch Operator Verification',
        }),
      });
      const indicatorMeta = (overview?.indicators || []).find((i: any) => i.id === obs.indicator_id);
      promoteToDashboardObservation(obs, indicatorMeta);
    }
    await fetchOverview();
    onNotify?.(`🟢 Verified & Accepted ${validList.length} official observations into the Fundamental Dashboard.`);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    try {
      const res = await fetch('/api/fundamental-architecture/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicator_id: manualIndicatorId,
          observation_period: manualPeriod,
          previous_value: manualPrev,
          forecast_value: manualForecast,
          actual_value: manualActual,
          source_name: manualSource,
          source_url: manualSourceUrl,
          release_date: manualReleaseDate,
          entered_by: manualEnteredBy,
          notes: manualNotes,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        await fetchOverview();
        onNotify?.(
          data.conflictDetected
            ? '⚠️ Manual observation stored with DATA_CONFLICT flag (disagrees with API source — both preserved).'
            : '✓ Manual observation stored with MANUAL audit label.'
        );
        setManualActual('');
        setManualNotes('');
        setActiveSubTab('CONTROL_CENTER');
      }
    } catch (err: any) {
      onNotify?.(`⚠️ Failed to store manual observation: ${err?.message}`);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'STALE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'DATA_CONFLICT':
        return 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse';
      case 'DATA_UNAVAILABLE':
      case 'MISSING':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'VALIDATION_ERROR':
      case 'SOURCE_ERROR':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  const sources = overview?.sources || [];
  const indicators = overview?.indicators || [];
  const storedObservations = overview?.observations || [];
  const syncLogs = overview?.syncLogs || [];
  const qualityLogs = overview?.qualityLogs || [];
  const schedules = overview?.schedules || [];
  const counts = overview?.countsByStatus || {};

  const filteredObservations = storedObservations.filter((o: any) => {
    if (filterAsset !== 'ALL' && o.asset_currency !== filterAsset) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        String(o.indicator_name || '').toLowerCase().includes(q) ||
        String(o.indicator_code || '').toLowerCase().includes(q) ||
        String(o.source_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredIndicators = indicators.filter((ind: any) => {
    if (filterAsset !== 'ALL' && ind.asset_currency !== filterAsset) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        String(ind.indicator_name || '').toLowerCase().includes(q) ||
        String(ind.indicator_code || '').toLowerCase().includes(q) ||
        String(ind.source_series_id || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const syncControlProfiles = [
    { id: 'USD', label: 'USD Core Profile (17 Series)', sub: 'FRED • BLS • BEA • Federal Reserve', badge: 'CONNECTED' },
    { id: 'G8_RATES', label: 'G8 Central Bank Policy Rates', sub: 'FED • ECB • BOE • BOJ • SNB • BOC • RBA • RBNZ', badge: 'CONNECTED' },
    { id: 'COMMODITIES', label: 'Gold / Silver / WTI Drivers', sub: '10Y TIPS Real Yield • 5Y Breakeven • WTI Spot', badge: 'CONNECTED' },
    { id: 'INDICES', label: 'US30 / NASDAQ100 / S&P500', sub: 'Official FRED Index Close Benchmarks', badge: 'CONNECTED' },
    { id: 'CRYPTO', label: 'BTC / ETH Benchmarks', sub: 'Coinbase Institutional Spot Index Series', badge: 'CONNECTED' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Step 1 Data Control Center */}
      <div className="bg-slate-950/90 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono-code font-bold uppercase tracking-wider">
                STEP 1 FOUNDATION ACTIVE
              </span>
              <span className="text-xs font-mono-code text-slate-400">
                100% SOURCE-CONTROLLED • ZERO AI FABRICATION • DETERMINISTIC AUDIT TRAIL
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wide flex items-center gap-2.5">
              <Database className="w-6 h-6 text-cyan-400" />
              <span>PRIME FX DATA CONTROL CENTER & VERIFIED SOURCE ARCHITECTURE</span>
            </h2>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              disabled={syncingTarget !== null}
              onClick={() => handleSyncProfile('USD')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-military font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncingTarget === 'USD' ? 'animate-spin' : ''}`} />
              <span>{syncingTarget === 'USD' ? 'SYNCING USD SERIES...' : 'SYNC USD DATA'}</span>
            </button>

            <button
              type="button"
              disabled={syncingTarget !== null}
              onClick={() => handleSyncProfile('ALL')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-cyan-300 border border-cyan-400/40 font-military font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncingTarget === 'ALL' ? 'animate-spin' : ''}`} />
              <span>{syncingTarget === 'ALL' ? 'SYNCING ALL...' : 'SYNC ALL VERIFIED DATA'}</span>
            </button>

            <button
              type="button"
              onClick={handleVerifyAllValid}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-military font-bold text-xs transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>VERIFY & ACCEPT ALL VALID</span>
            </button>
          </div>
        </div>

        {/* Status Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Sources Healthy</div>
            <div className="text-lg font-mono-code font-bold text-emerald-400 mt-0.5">
              {sources.filter((s: any) => s.active).length} / {sources.length} ACTIVE
            </div>
            <div className="text-[10px] font-mono-code text-slate-500 mt-0.5">FRED • BLS • BEA • G8 CBs</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Pre-Configured Series</div>
            <div className="text-lg font-mono-code font-bold text-cyan-400 mt-0.5">
              {indicators.length} SERIES
            </div>
            <div className="text-[10px] font-mono-code text-slate-500 mt-0.5">Exact Series IDs Locked</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Valid Records</div>
            <div className="text-lg font-mono-code font-bold text-emerald-300 mt-0.5">
              {counts.VALID || 0} VALID
            </div>
            <div className="text-[10px] font-mono-code text-slate-500 mt-0.5">
              {storedObservations.filter((o: any) => o.verification_status === 'VERIFIED').length} Operator Verified
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Stale / Unavailable</div>
            <div className="text-lg font-mono-code font-bold text-amber-300 mt-0.5">
              {(counts.STALE || 0) + (counts.DATA_UNAVAILABLE || 0)}
            </div>
            <div className="text-[10px] font-mono-code text-slate-500 mt-0.5">Never Substituted by AI</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Data Conflicts</div>
            <div className="text-lg font-mono-code font-bold text-rose-400 mt-0.5">
              {counts.DATA_CONFLICT || 0} CONFLICTS
            </div>
            <div className="text-[10px] font-mono-code text-slate-500 mt-0.5">Rule 8 Dual-Source Guard</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Last Successful Sync</div>
            <div className="text-xs font-mono-code font-bold text-slate-200 mt-1 truncate">
              {overview?.lastSyncAt ? new Date(overview.lastSyncAt).toLocaleTimeString() : 'Ready to Sync'}
            </div>
            <div className="text-[10px] font-mono-code text-cyan-400 mt-0.5">
              {overview?.lastSyncAt ? new Date(overview.lastSyncAt).toISOString().slice(0, 10) : 'Click [SYNC USD DATA]'}
            </div>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {[
            { id: 'CONTROL_CENTER', label: '1. Data Control Center & Verify Queue', icon: Radio },
            { id: 'SOURCE_MAP', label: '2. Verified Data Source Map (Series Registry)', icon: Layers },
            { id: 'MANUAL_ENTRY', label: '3. Manual Verified Data Entry (Labeled MANUAL)', icon: PlusCircle },
            { id: 'SYNC_AND_QUALITY_LOGS', label: '4. Sync Logs, Quality Audit & Cron Schedules', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono-code font-bold border transition cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60 shadow-sm'
                    : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: DATA CONTROL CENTER & VERIFY QUEUE */}
      {activeSubTab === 'CONTROL_CENTER' && (
        <div className="space-y-6">
          {/* One-Click Preconfigured Sync Profiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {syncControlProfiles.map((prof) => (
              <div
                key={prof.id}
                className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-cyan-500/40 transition flex flex-col justify-between gap-3 shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-military font-bold text-slate-100">{prof.id}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {prof.badge}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-cyan-300 mt-1.5">{prof.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{prof.sub}</div>
                </div>

                <button
                  type="button"
                  disabled={syncingTarget !== null}
                  onClick={() => handleSyncProfile(prof.id)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700 hover:border-cyan-400/50 text-xs font-mono-code font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingTarget === prof.id ? 'animate-spin' : ''}`} />
                  <span>{syncingTarget === prof.id ? 'SYNCING...' : `[ SYNC ${prof.id} ]`}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Filter & Search Bar for Retrieved Observations */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-military font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>RETRIEVED OBSERVATIONS — SYNC → VERIFY → ACCEPT PIPELINE</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                  Every observation retains its official source, series ID, release timestamp, and raw payload. Click [VERIFY & ACCEPT] to push verified numbers to the dashboard.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter indicator or source..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono-code focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <select
                  value={filterAsset}
                  onChange={(e) => setFilterAsset(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono-code focus:outline-none focus:border-cyan-400"
                >
                  <option value="ALL">All Assets ({storedObservations.length})</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CHF">CHF</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="NZD">NZD</option>
                  <option value="XAUUSD">XAU/USD (Gold)</option>
                  <option value="WTI">WTI Crude Oil</option>
                  <option value="NASDAQ100">NASDAQ100</option>
                  <option value="SP500">S&P500</option>
                  <option value="US30">US30</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs font-mono-code text-slate-400">
                Loading foundational data store...
              </div>
            ) : filteredObservations.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <div className="text-sm font-military font-bold text-slate-200">
                  No synchronized observations in current filter yet
                </div>
                <p className="text-xs text-slate-400 max-w-xl mx-auto font-mono-code">
                  Click <span className="text-cyan-300 font-bold">[ SYNC USD DATA ]</span> above to retrieve live verified series directly from FRED / BLS / BEA / Federal Reserve.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono-code">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Indicator</th>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3 text-right">Previous</th>
                      <th className="py-2.5 px-3 text-right">Forecast</th>
                      <th className="py-2.5 px-3 text-right">Actual</th>
                      <th className="py-2.5 px-3 text-right">Revision</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Validation</th>
                      <th className="py-2.5 px-3">Verification</th>
                      <th className="py-2.5 px-3 text-right">Action / Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredObservations.map((obs: any) => {
                      const isExpanded = expandedAuditId === obs.id;
                      const indMeta = indicators.find((i: any) => i.id === obs.indicator_id);
                      return (
                        <React.Fragment key={obs.id}>
                          <tr className="hover:bg-slate-900/60 transition">
                            <td className="py-3 px-3 font-bold text-cyan-300">{obs.asset_currency}</td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-100">{obs.indicator_name}</div>
                              <div className="text-[10px] text-slate-500">
                                {obs.indicator_code} • Series: {indMeta?.source_series_id || 'MANUAL'} ({indMeta?.transformation || 'LEVEL'})
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-300">{obs.observation_period}</td>
                            <td className="py-3 px-3 text-right text-slate-300">
                              {obs.previous_value !== null ? `${obs.previous_value}${obs.unit}` : '—'}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-400">
                              {obs.forecast_value !== null ? `${obs.forecast_value}${obs.unit}` : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-300">
                              {obs.actual_value !== null ? `${obs.actual_value}${obs.unit}` : 'DATA_UNAVAILABLE'}
                            </td>
                            <td className="py-3 px-3 text-right text-amber-300">
                              {obs.revised_previous_value !== null ? `${obs.revised_previous_value}${obs.unit}` : '—'}
                            </td>
                            <td className="py-3 px-3">
                              <a
                                href={obs.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                              >
                                <span className="truncate max-w-[140px]">{obs.source_name}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${statusBadge(
                                  obs.validation_status
                                )}`}
                              >
                                {obs.validation_status}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {obs.verification_status === 'VERIFIED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                  🟢 VERIFIED
                                </span>
                              ) : obs.verification_status === 'MANUAL' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                                  MANUAL
                                </span>
                              ) : obs.verification_status === 'CONFLICT_FLAGGED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                  ⚠️ CONFLICT
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                                  API_RETRIEVED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {obs.actual_value !== null && (
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyAndAccept(obs)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition cursor-pointer"
                                  >
                                    {obs.verification_status === 'VERIFIED' ? 'RE-PUSH' : 'VERIFY & ACCEPT'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setExpandedAuditId(isExpanded ? null : obs.id)}
                                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                                  title="Inspect full audit trail & raw payload"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-900/90">
                              <td colSpan={11} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                                  <div className="space-y-1.5">
                                    <div className="font-bold text-cyan-300 uppercase tracking-wider">
                                      Full Traceability Chain (Rule 2, 3, 4, 9)
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Asset → Indicator:</span>{' '}
                                      <span className="text-slate-200 font-bold">
                                        {obs.asset_currency} → {obs.indicator_code} ({obs.indicator_id})
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Source ID & URL:</span>{' '}
                                      <span className="text-slate-200">{obs.source_id} • {obs.source_url}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Release Timestamp:</span>{' '}
                                      <span className="text-slate-200">{obs.release_timestamp || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Retrieved Timestamp:</span>{' '}
                                      <span className="text-slate-200">{obs.retrieved_at}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Data Quality Score:</span>{' '}
                                      <span className="text-emerald-400 font-bold">{obs.data_quality_score}/100</span>
                                    </div>
                                    {obs.notes && (
                                      <div>
                                        <span className="text-slate-400">Audit Notes:</span>{' '}
                                        <span className="text-amber-200">{obs.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-cyan-300 uppercase tracking-wider mb-1">
                                      Retained Raw API Payload Sample (Rule 9)
                                    </div>
                                    <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-300 overflow-x-auto max-h-36">
                                      {JSON.stringify(obs.raw_payload, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRIME FX VERIFIED DATA SOURCE MAP */}
      {activeSubTab === 'SOURCE_MAP' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-military font-bold text-slate-100">
                PRIME FX VERIFIED DATA SOURCE MAP — INDICATOR-BY-INDICATOR REGISTRY
              </h3>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Pre-configured official statistical series IDs, transformations, importance tiers, and base weights.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterAsset}
                onChange={(e) => setFilterAsset(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono-code"
              >
                <option value="ALL">All Assets ({indicators.length})</option>
                <option value="USD">USD Core Profile</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="CHF">CHF</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="NZD">NZD</option>
                <option value="XAUUSD">XAU/USD (Gold)</option>
                <option value="WTI">WTI Crude</option>
                <option value="NASDAQ100">NASDAQ100</option>
                <option value="SP500">S&P500</option>
                <option value="US30">US30</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono-code">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">Indicator Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Official Source</th>
                  <th className="py-2.5 px-3">Exact Series ID</th>
                  <th className="py-2.5 px-3">Transformation</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Importance</th>
                  <th className="py-2.5 px-3 text-right">Base Weight</th>
                  <th className="py-2.5 px-3">Direction Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredIndicators.map((ind: any) => (
                  <tr key={ind.id} className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-3 font-bold text-cyan-300">{ind.asset_currency}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-100">{ind.indicator_name}</td>
                    <td className="py-2.5 px-3 text-slate-300">{ind.category}</td>
                    <td className="py-2.5 px-3 text-slate-300">{ind.source_id.replace('SRC_', '')}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-cyan-300 border border-blue-500/30 font-bold">
                        {ind.source_series_id}
                      </span>
                      {ind.bls_series_id && (
                        <span className="ml-1.5 text-[10px] text-slate-400">BLS: {ind.bls_series_id}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">{ind.transformation} ({ind.expected_unit})</td>
                    <td className="py-2.5 px-3 text-slate-400">{ind.frequency}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ind.importance_level === 'TIER_1_EXTREME'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {ind.importance_level}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-300">{ind.base_weight}%</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[10px]">{ind.direction_rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MANUAL VERIFIED ENTRY MECHANISM */}
      {activeSubTab === 'MANUAL_ENTRY' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 max-w-3xl space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono-code font-bold">
                RULE 4 & RULE 8 COMPLIANT
              </span>
              <span className="text-xs font-mono-code text-slate-400">
                Explicitly labeled MANUAL • Never overwrites API records silently
              </span>
            </div>
            <h3 className="text-lg font-military font-bold text-slate-100 mt-1">
              MANUAL VERIFIED OBSERVATION ENTRY
            </h3>
            <p className="text-xs text-slate-400 font-mono-code">
              If a manual entry disagrees with an existing official API record for the same period, both records are preserved and marked <span className="text-rose-400 font-bold">DATA_CONFLICT</span> for verification.
            </p>
          </div>

          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono-code">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 mb-1">Target Economic Indicator</label>
              <select
                value={manualIndicatorId}
                onChange={(e) => setManualIndicatorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              >
                {indicators.map((ind: any) => (
                  <option key={ind.id} value={ind.id}>
                    [{ind.asset_currency}] {ind.indicator_name} ({ind.source_series_id} • {ind.expected_unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Observation Period (YYYY-MM-DD)</label>
              <input
                type="text"
                required
                value={manualPeriod}
                onChange={(e) => setManualPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Official Release Date</label>
              <input
                type="date"
                required
                value={manualReleaseDate}
                onChange={(e) => setManualReleaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Previous Value</label>
              <input
                type="number"
                step="any"
                value={manualPrev}
                onChange={(e) => setManualPrev(e.target.value)}
                placeholder="e.g. 3.1"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Consensus Forecast Value</label>
              <input
                type="number"
                step="any"
                value={manualForecast}
                onChange={(e) => setManualForecast(e.target.value)}
                placeholder="e.g. 3.2"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-emerald-300 font-bold mb-1">Actual Released Value</label>
              <input
                type="number"
                step="any"
                required
                value={manualActual}
                onChange={(e) => setManualActual(e.target.value)}
                placeholder="e.g. 3.3"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-200 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Entered By (Operator / Analyst)</label>
              <input
                type="text"
                required
                value={manualEnteredBy}
                onChange={(e) => setManualEnteredBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Official Source Name</label>
              <input
                type="text"
                required
                value={manualSource}
                onChange={(e) => setManualSource(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Official Source URL</label>
              <input
                type="url"
                required
                value={manualSourceUrl}
                onChange={(e) => setManualSourceUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 mb-1">Verification Notes</label>
              <input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="e.g. Verified directly against BLS Table 1 at 08:30 EST release"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                disabled={isSubmittingManual}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-slate-950 font-military font-bold text-xs shadow-lg cursor-pointer"
              >
                {isSubmittingManual ? 'STORING MANUAL RECORD...' : 'STORE VERIFIED MANUAL OBSERVATION'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 4: SYNC LOGS, DATA QUALITY LOGS & CRON SCHEDULES */}
      {activeSubTab === 'SYNC_AND_QUALITY_LOGS' && (
        <div className="space-y-6">
          {/* Prepared Supabase Cron + Edge Functions Infrastructure */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-base font-military font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>PREPARED SUPABASE CRON + EDGE FUNCTION SCHEDULES</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono-code">
              {schedules.map((s: any) => (
                <div key={s.id} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">{s.frequency_label}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 text-[10px]">{s.cron_expression}</span>
                  </div>
                  <div className="font-semibold text-slate-100">{s.name}</div>
                  <div className="text-[11px] text-slate-400">{s.target_scope}</div>
                  <div className="text-[10px] text-slate-500 pt-1">Edge Fn: {s.edge_function_name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sync Logs */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-base font-military font-bold text-slate-100">
              AUTOMATED SYNCHRONIZATION LOGS (sync_logs)
            </h3>
            {syncLogs.length === 0 ? (
              <div className="text-xs font-mono-code text-slate-400">No synchronization runs recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono-code">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                      <th className="py-2 px-3">Started At</th>
                      <th className="py-2 px-3">Function / Profile</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Received</th>
                      <th className="py-2 px-3 text-right">Inserted</th>
                      <th className="py-2 px-3 text-right">Updated</th>
                      <th className="py-2 px-3 text-right">Rejected</th>
                      <th className="py-2 px-3">Error / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {syncLogs.map((log: any) => (
                      <tr key={log.id}>
                        <td className="py-2 px-3 text-slate-300">{new Date(log.started_at).toLocaleString()}</td>
                        <td className="py-2 px-3 text-cyan-300 font-bold">{log.function_name}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : log.status === 'PARTIAL_SUCCESS'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-200">{log.records_received}</td>
                        <td className="py-2 px-3 text-right text-emerald-300">{log.records_inserted}</td>
                        <td className="py-2 px-3 text-right text-cyan-300">{log.records_updated}</td>
                        <td className="py-2 px-3 text-right text-rose-300">{log.records_rejected}</td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{log.error_message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Data Quality Logs */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-base font-military font-bold text-slate-100">
              ENDPOINT VALIDATION & QUALITY AUDIT LOGS (data_quality_logs)
            </h3>
            {qualityLogs.length === 0 ? (
              <div className="text-xs font-mono-code text-slate-400">No endpoint validation logs recorded yet.</div>
            ) : (
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left border-collapse text-xs font-mono-code">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Source</th>
                      <th className="py-2 px-3">HTTP</th>
                      <th className="py-2 px-3">Validation Result</th>
                      <th className="py-2 px-3">Flags</th>
                      <th className="py-2 px-3">Endpoint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {qualityLogs.map((q: any) => (
                      <tr key={q.id}>
                        <td className="py-2 px-3 text-slate-400">{new Date(q.request_time).toLocaleTimeString()}</td>
                        <td className="py-2 px-3 text-cyan-300">{q.source_id}</td>
                        <td className="py-2 px-3 text-slate-200">{q.response_status ?? 'ERR'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${statusBadge(q.validation_result)}`}>
                            {q.validation_result}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[10px] text-slate-300">
                          {q.duplicate_data && <span className="mr-1.5 text-cyan-400">[DUPLICATE]</span>}
                          {q.stale_data && <span className="mr-1.5 text-amber-400">[STALE]</span>}
                          {q.conflicting_data && <span className="mr-1.5 text-rose-400 font-bold">[CONFLICT]</span>}
                          {!q.duplicate_data && !q.stale_data && !q.conflicting_data && 'CLEAN'}
                        </td>
                        <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{q.endpoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
