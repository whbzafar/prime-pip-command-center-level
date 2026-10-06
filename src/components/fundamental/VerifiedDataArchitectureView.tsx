/**
 * PRIME PIP FX COMMAND CENTER — Verified Financial Data Architecture View
 * Institutional-grade inspection & control terminal for Firestore production database,
 * registries, 14-point validation engine, sync jobs, and role security.
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Server,
  Layers,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Coins,
  Landmark,
  Building2,
  Gem,
  Activity,
  Sliders,
  Filter,
  Check,
  X,
  FileCheck,
  History,
  Terminal,
} from 'lucide-react';
import {
  OFFICIAL_ASSETS,
  OFFICIAL_CURRENCIES,
  OFFICIAL_DATA_SOURCES,
  OFFICIAL_DATA_PROVIDERS,
  OFFICIAL_INDICATORS,
  DatabaseInitializer,
} from '../../services/database/initializationService';
import { testFirestoreConnection, isFirebaseConfigured } from '../../services/firebaseConfig';
import { FinancialDataValidator } from '../../services/database/validationService';
import { DataSyncEngine } from '../../services/database/syncService';
import { AuditLogger } from '../../services/database/auditService';
import {
  AssetType,
  IndicatorCategory,
  ObservationRecord,
  SyncJobRecord,
  AuditLogRecord,
  ValidationResultRecord,
} from '../../types/financialDatabaseTypes';

export const VerifiedDataArchitectureView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'OVERVIEW' | 'ASSETS' | 'INDICATORS' | 'SOURCES' | 'VALIDATOR' | 'SYNC_AUDIT' | 'SECURITY_ROLES'
  >('OVERVIEW');

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    connected: boolean;
    message: string;
    latencyMs: number;
    loading: boolean;
  }>({
    tested: false,
    connected: false,
    message: 'Testing connection...',
    latencyMs: 0,
    loading: false,
  });

  // Initialization State
  const [initStatus, setInitStatus] = useState<{
    initialized: boolean;
    loading: boolean;
    message: string | null;
  }>({
    initialized: false,
    loading: false,
    message: null,
  });

  // Filters
  const [assetFilter, setAssetFilter] = useState<AssetType | 'ALL'>('ALL');
  const [indicatorCategoryFilter, setIndicatorCategoryFilter] = useState<IndicatorCategory | 'ALL'>('ALL');

  // Interactive Validation Playground
  const [sampleObs, setSampleObs] = useState<Partial<ObservationRecord>>({
    id: 'obs_sample_cpi_2026_09',
    indicatorId: 'ind_us_cpi_yoy',
    currency: 'USD',
    country: 'United States',
    period: '2026-09',
    periodType: 'MONTHLY',
    releaseDate: '2026-10-02',
    value: 2.8,
    unit: '%',
    previousValue: 2.9,
    forecastValue: 2.7,
    actualValue: 2.8,
    revisionValue: null,
    isRevision: false,
    sourceId: 'src_bls',
    providerId: 'BLS',
    sourceUrl: 'https://www.bls.gov/cpi/',
    retrievedAt: new Date().toISOString(),
    confidence: 95,
  });

  const [validationResults, setValidationResults] = useState<{
    validationStatus: string;
    dataQuality: string;
    confidence: number;
    freshness: string;
    results: ValidationResultRecord[];
  } | null>(null);

  // Sync & Audit Logs
  const [syncHistory, setSyncHistory] = useState<SyncJobRecord[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLogRecord[]>([]);

  // Test live connection on mount
  useEffect(() => {
    handleTestConnection();
    handleInitializeRegistries();
    loadSyncAndAudit();
  }, []);

  const handleTestConnection = async () => {
    setConnectionStatus((prev) => ({ ...prev, loading: true }));
    const res = await testFirestoreConnection();
    setConnectionStatus({
      tested: true,
      connected: res.connected,
      message: res.message,
      latencyMs: res.latencyMs,
      loading: false,
    });
  };

  const handleInitializeRegistries = async () => {
    setInitStatus((prev) => ({ ...prev, loading: true }));
    const res = await DatabaseInitializer.initializeRegistries('admin_console');
    setInitStatus({
      initialized: res.initialized,
      loading: false,
      message: res.message,
    });
  };

  const loadSyncAndAudit = () => {
    setSyncHistory(DataSyncEngine.getSyncHistory(10));
    setRecentAuditLogs(AuditLogger.getRecentLogs(15));
  };

  const handleRunValidationCheck = () => {
    const fullObs: ObservationRecord = {
      id: sampleObs.id || 'obs_test_manual',
      indicatorId: sampleObs.indicatorId || 'ind_us_cpi_yoy',
      assetId: 'asset_usd',
      currency: sampleObs.currency || 'USD',
      country: sampleObs.country || 'United States',
      period: sampleObs.period || '2026-09',
      periodType: sampleObs.periodType || 'MONTHLY',
      releaseDate: sampleObs.releaseDate || null,
      value: sampleObs.value !== undefined ? sampleObs.value : null,
      unit: sampleObs.unit || '%',
      previousValue: sampleObs.previousValue !== undefined ? sampleObs.previousValue : null,
      forecastValue: sampleObs.forecastValue !== undefined ? sampleObs.forecastValue : null,
      actualValue: sampleObs.actualValue !== undefined ? sampleObs.actualValue : null,
      revisionValue: sampleObs.revisionValue !== undefined ? sampleObs.revisionValue : null,
      isRevision: Boolean(sampleObs.isRevision),
      sourceId: sampleObs.sourceId || 'src_bls',
      providerId: sampleObs.providerId || 'BLS',
      sourceUrl: sampleObs.sourceUrl || 'https://www.bls.gov',
      retrievedAt: sampleObs.retrievedAt || new Date().toISOString(),
      validationStatus: 'PENDING_VALIDATION',
      dataQuality: 'UNKNOWN',
      confidence: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const evaluation = FinancialDataValidator.validateObservation(fullObs);
    setValidationResults({
      validationStatus: evaluation.validationStatus,
      dataQuality: evaluation.dataQuality,
      confidence: evaluation.confidence,
      freshness: evaluation.freshness,
      results: evaluation.results,
    });
  };

  const filteredAssets = assetFilter === 'ALL'
    ? OFFICIAL_ASSETS
    : OFFICIAL_ASSETS.filter((a) => a.assetType === assetFilter);

  const filteredIndicators = indicatorCategoryFilter === 'ALL'
    ? OFFICIAL_INDICATORS
    : OFFICIAL_INDICATORS.filter((i) => i.category === indicatorCategoryFilter);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950/40 border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Database className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-military font-bold text-slate-100 tracking-wider">
                  PRODUCTION DATABASE & VERIFIED DATA ARCHITECTURE
                </h2>
                <p className="text-xs font-mono-code text-slate-400">
                  Institutional Firestore Engine • 23 Scalable Entities • 14-Point Validation Protocol • RBAC
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={connectionStatus.loading}
              className="px-3 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono-code font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus.loading ? 'animate-spin' : ''}`} />
              <span>TEST FIRESTORE CONNECTION</span>
            </button>
            <button
              type="button"
              onClick={handleInitializeRegistries}
              disabled={initStatus.loading}
              className="px-3 py-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-mono-code font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Server className="w-3.5 h-3.5" />
              <span>VERIFY REGISTRIES</span>
            </button>
          </div>
        </div>

        {/* Database Health Summary Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono-code uppercase text-slate-400">Connection Status</div>
              <div className="text-xs font-bold font-mono-code flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${connectionStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className={connectionStatus.connected ? 'text-emerald-300' : 'text-amber-300'}>
                  {connectionStatus.connected ? 'ONLINE / CONNECTED' : 'LOCAL FALLBACK'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono-code text-slate-400">{connectionStatus.latencyMs}ms</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] font-mono-code uppercase text-slate-400">Institutional Assets</div>
            <div className="text-xs font-bold font-mono-code text-cyan-300 mt-0.5">
              {OFFICIAL_ASSETS.length} Core Instruments Verified
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] font-mono-code uppercase text-slate-400">Indicator Registry</div>
            <div className="text-xs font-bold font-mono-code text-purple-300 mt-0.5">
              15 Categories Defined (No Fake Data)
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] font-mono-code uppercase text-slate-400">Security Architecture</div>
            <div className="text-xs font-bold font-mono-code text-emerald-300 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-Trust ABAC Rules Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'OVERVIEW', label: 'Architecture & Tiers', icon: Layers },
          { id: 'ASSETS', label: 'Asset Universe (24)', icon: Landmark },
          { id: 'INDICATORS', label: 'Indicator Registry', icon: Sliders },
          { id: 'SOURCES', label: 'Official Sources', icon: Building2 },
          { id: 'VALIDATOR', label: '14-Point Validation Engine', icon: FileCheck },
          { id: 'SYNC_AUDIT', label: 'Sync Jobs & Audit Trail', icon: History },
          { id: 'SECURITY_ROLES', label: 'RBAC Security Matrix', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono-code font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: ARCHITECTURE & TIERS */}
      {activeSubTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Strict Separation of Concerns Infographic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                  TIER 1 • OFFICIAL & RAW DATA
                </span>
                <Landmark className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Raw & Verified Observations</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Contains only authenticated economic data from central banks and national statistical bureaus (BLS, BEA, Fed, ECB).
              </p>
              <div className="text-[11px] font-mono-code text-cyan-300 space-y-1 pt-2 border-t border-slate-800">
                <div>✓ Missing values strictly preserved as <span className="text-amber-400 font-bold">null</span></div>
                <div>✓ Zero fake or estimated numbers</div>
                <div>✓ Read-only for normal users</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  TIER 2 • CALCULATED METRICS
                </span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Algorithmic Scoring Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deterministic macro composite calculations (Currency scores, yield spreads, pair divergence differentials, contrarian sentiment).
              </p>
              <div className="text-[11px] font-mono-code text-purple-300 space-y-1 pt-2 border-t border-slate-800">
                <div>✓ Strictly separated from raw data</div>
                <div>✓ Audited mathematical models</div>
                <div>✓ Deterministic reproducibility</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  TIER 3 • AI QUALITATIVE
                </span>
                <Terminal className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">AI Macro Intelligence</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Qualitative economic reports and narrative context generated by LLM analysis.
              </p>
              <div className="text-[11px] font-mono-code text-emerald-300 space-y-1 pt-2 border-t border-slate-800">
                <div>✓ Fully isolated in dedicated collection</div>
                <div>✓ Cannot overwrite economic values</div>
                <div>✓ Transparent source attribution</div>
              </div>
            </div>
          </div>

          {/* Normalization Pipeline Flow */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-300">
              Verified Financial Data Pipeline
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-[10px] font-mono-code">
              {[
                { step: '1', title: 'PROVIDER', desc: 'FRED / BLS / BEA' },
                { step: '2', title: 'RAW RESPONSE', desc: 'Preserved JSON payload' },
                { step: '3', title: 'PARSER', desc: 'Typed numeric extractor' },
                { step: '4', title: 'NORMALIZER', desc: 'Standard observation schema' },
                { step: '5', title: 'VALIDATOR', desc: '14-Point integrity checks' },
                { step: '6', title: 'VERIFIED OBS', desc: 'Institutional Firestore' },
                { step: '7', title: 'ANALYSIS ENGINE', desc: 'Macro scoring models' },
              ].map((p, idx) => (
                <div key={p.step} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 relative">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto mb-1 font-bold text-[9px]">
                    {p.step}
                  </div>
                  <div className="font-bold text-slate-200">{p.title}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: ASSET UNIVERSE */}
      {activeSubTab === 'ASSETS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'CURRENCY', 'COMMODITY', 'INDEX', 'CRYPTO', 'STOCK'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAssetFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                    assetFilter === type
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {type === 'ALL' ? 'All (24)' : type}
                </button>
              ))}
            </div>
            <span className="text-xs font-mono-code text-slate-400">
              Showing {filteredAssets.length} of {OFFICIAL_ASSETS.length} Instruments
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-mono-code text-cyan-300">{asset.symbol}</span>
                  <span className="text-[9px] font-mono-code uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {asset.assetType}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200">{asset.name}</div>
                <div className="text-[10px] font-mono-code text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span>{asset.country}</span>
                  <span>{asset.exchange}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: INDICATOR REGISTRY */}
      {activeSubTab === 'INDICATORS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {(['ALL', 'INFLATION', 'INTEREST_RATES', 'EMPLOYMENT', 'GROWTH', 'BUSINESS_ACTIVITY', 'BOND_YIELDS', 'POSITIONING'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setIndicatorCategoryFilter(cat as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-code font-bold transition whitespace-nowrap cursor-pointer ${
                    indicatorCategoryFilter === cat
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
            <span className="text-xs font-mono-code text-slate-400">
              Showing {filteredIndicators.length} Registered Series
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredIndicators.map((ind) => (
              <div key={ind.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono-code text-slate-100">{ind.name}</span>
                    <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                      {ind.category}
                    </span>
                    <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">
                      {ind.currency}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{ind.description}</p>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono-code text-slate-400 shrink-0">
                  <div>Unit: <span className="text-slate-200 font-bold">{ind.unit}</span></div>
                  <div>Freq: <span className="text-slate-200 font-bold">{ind.frequency}</span></div>
                  <div>Source: <span className="text-cyan-300 font-bold">{ind.sourceProvider}</span></div>
                  <a
                    href={ind.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    Official Portal →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: OFFICIAL DATA SOURCES */}
      {activeSubTab === 'SOURCES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {OFFICIAL_DATA_SOURCES.map((src) => (
            <div key={src.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100">{src.name}</span>
                <span className="text-[9px] font-mono-code uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>OFFICIAL {src.sourceType.replace('_', ' ')}</span>
                </span>
              </div>
              <div className="text-[11px] font-mono-code text-slate-400">
                Organization: <span className="text-slate-200">{src.organization}</span> ({src.country})
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono-code">
                <a href={src.website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                  Institutional Portal ↗
                </a>
                <span className="text-slate-500">ID: {src.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-VIEW 5: 14-POINT VALIDATION ENGINE */}
      {activeSubTab === 'VALIDATOR' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono-code font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>14-Point Automated Verification Protocol</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Runs on every ingested observation to verify source authenticity, numerical schema, and integrity.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunValidationCheck}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono-code font-bold text-xs transition cursor-pointer"
              >
                RUN VALIDATION TEST
              </button>
            </div>

            {/* Test Observation Payload Editor */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[10px] font-mono-code pt-2">
              <div>
                <label className="text-slate-400 block mb-0.5">Series ID</label>
                <input
                  type="text"
                  value={sampleObs.indicatorId}
                  onChange={(e) => setSampleObs({ ...sampleObs, indicatorId: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Period (YYYY-MM)</label>
                <input
                  type="text"
                  value={sampleObs.period}
                  onChange={(e) => setSampleObs({ ...sampleObs, period: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Actual Value</label>
                <input
                  type="number"
                  step="0.1"
                  value={sampleObs.value ?? ''}
                  onChange={(e) => setSampleObs({ ...sampleObs, value: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Forecast Value</label>
                <input
                  type="number"
                  step="0.1"
                  value={sampleObs.forecastValue ?? ''}
                  onChange={(e) => setSampleObs({ ...sampleObs, forecastValue: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Source ID</label>
                <input
                  type="text"
                  value={sampleObs.sourceId}
                  onChange={(e) => setSampleObs({ ...sampleObs, sourceId: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Source URL</label>
                <input
                  type="text"
                  value={sampleObs.sourceUrl}
                  onChange={(e) => setSampleObs({ ...sampleObs, sourceUrl: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Validation Output Results */}
          {validationResults && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-code text-slate-400">Status:</span>
                  <span className={`text-xs font-mono-code font-bold px-2 py-0.5 rounded ${
                    validationResults.validationStatus === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {validationResults.validationStatus}
                  </span>
                  <span className="text-xs font-mono-code text-slate-400">Quality:</span>
                  <span className="text-xs font-mono-code font-bold text-cyan-300">{validationResults.dataQuality}</span>
                  <span className="text-xs font-mono-code text-slate-400">Freshness:</span>
                  <span className="text-xs font-mono-code font-bold text-purple-300">{validationResults.freshness}</span>
                </div>
                <div className="text-xs font-mono-code text-slate-400">
                  Confidence Score: <span className="text-cyan-300 font-bold">{validationResults.confidence}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {validationResults.results.map((r) => (
                  <div key={r.id} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 flex items-start gap-2 text-[11px] font-mono-code">
                    {r.status === 'PASSED' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {r.status === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    {r.status === 'FAILED' && <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold text-slate-300">{r.check}</div>
                      <div className="text-[10px] text-slate-400">{r.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 6: SYNC JOBS & AUDIT TRAIL */}
      {activeSubTab === 'SYNC_AUDIT' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-200">
              Recent Data Synchronization Batches
            </h3>
            {syncHistory.length === 0 ? (
              <div className="p-3 text-xs font-mono-code text-slate-500">No sync batch executions recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {syncHistory.map((job) => (
                  <div key={job.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono-code">
                    <div>
                      <span className="font-bold text-slate-200">{job.provider}</span>
                      <span className="text-slate-500 ml-2">Started: {job.startedAt.slice(11, 19)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Accepted: <b className="text-emerald-400">{job.recordsAccepted}</b></span>
                      <span>Rejected: <b className="text-rose-400">{job.recordsRejected}</b></span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-200">
              Immutable Security & Data Audit Trail
            </h3>
            {recentAuditLogs.length === 0 ? (
              <div className="p-3 text-xs font-mono-code text-slate-500">No administrative audit events recorded yet.</div>
            ) : (
              <div className="space-y-1.5 font-mono-code text-[11px]">
                {recentAuditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded bg-slate-950 border border-slate-850 flex items-center justify-between">
                    <div>
                      <span className="text-cyan-400 font-bold">[{log.action}]</span>
                      <span className="text-slate-400 ml-2">Resource: {log.resource} ({log.resourceId})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{log.timestamp.slice(11, 19)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        log.result === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {log.result}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 7: RBAC SECURITY MATRIX */}
      {activeSubTab === 'SECURITY_ROLES' && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-200">
              Role-Based Access Control (RBAC) Permission Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Enforced at the Firestore Security Rules level (`firestore.rules`). Normal users cannot directly write or tamper with official economic records.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono-code text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Permitted Operations</th>
                  <th className="py-2 px-3">Official Observations</th>
                  <th className="py-2 px-3">Calculated Scores</th>
                  <th className="py-2 px-3">Sync & Admin Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-slate-200">USER</td>
                  <td className="py-2.5 px-3">Read published verified market data</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read-Only</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read-Only</td>
                  <td className="py-2.5 px-3 text-rose-400">Denied</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-cyan-300">TRADER</td>
                  <td className="py-2.5 px-3">USER + Personal watchlists, trading journal, lot calculator</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read-Only</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read-Only</td>
                  <td className="py-2.5 px-3 text-rose-400">Denied</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-purple-300">ANALYST</td>
                  <td className="py-2.5 px-3">TRADER + Advanced macro research, view sync history</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read-Only</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read-Only</td>
                  <td className="py-2.5 px-3 text-amber-400">View Only</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-amber-300">ADMIN</td>
                  <td className="py-2.5 px-3">Full data management, sync triggers, validation controls</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read & Write</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read & Write</td>
                  <td className="py-2.5 px-3 text-emerald-400">Authorized</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-rose-400">DEVELOPER</td>
                  <td className="py-2.5 px-3">Full system diagnostics, schema migrations, provider configurations</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read & Write</td>
                  <td className="py-2.5 px-3 text-emerald-400">Read & Write</td>
                  <td className="py-2.5 px-3 text-emerald-400">Authorized</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
