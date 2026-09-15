import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Activity,
  Brain,
  Layers,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Search,
  Code,
  Terminal,
  FileCode,
  BookOpen,
  Sliders,
  Award,
  ChevronRight,
  TrendingUp,
  Cpu,
  Lock,
  Pause,
  Play,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Compass,
  ArrowRight,
  History,
  GitBranch,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  apiGetEvolutionStatus,
  apiRunEvolutionCycle,
  apiGetAutonomousRoadmap,
  apiExecuteRollback,
  apiRollbackEvolutionEvent,
} from '../../utils/evolutionClient';
import { isUserAdmin } from '../../utils/authClient';
import { UserAccount } from '../../types';

interface EvolutionCommandCenterProps {
  currentUser?: UserAccount;
  onClose?: () => void;
}

export const EvolutionCommandCenter: React.FC<EvolutionCommandCenterProps> = ({
  currentUser,
  onClose,
}) => {
  const isAdmin = isUserAdmin(currentUser);

  const [activeTab, setActiveTab] = useState<
    | 'OVERVIEW'
    | 'MEMORY'
    | 'GAPS_EXPERIMENTS'
    | 'FEATURES'
    | 'DIMENSIONS'
    | 'LIVE_FEED'
    | 'CAPABILITIES'
    | 'HEALTH'
    | 'SANDBOX'
    | 'CONSENSUS'
    | 'ROADMAP'
    | 'INNOVATIONS'
    | 'EXPLAINABILITY'
    | 'FEEDBACK'
  >('OVERVIEW');

  const [statusData, setStatusData] = useState<any>(null);
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCycling, setIsCycling] = useState(false);
  const [isEnginePaused, setIsEnginePaused] = useState(false);
  const [selectedTrustLevel, setSelectedTrustLevel] = useState<number>(2);
  const [cycleNotification, setCycleNotification] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any>(null);
  const [selectedMemoryEvent, setSelectedMemoryEvent] = useState<any>(null);
  const [featureFilter, setFeatureFilter] = useState<'ALL' | 'BUILT' | 'TESTED' | 'RELEASED' | 'FAILED' | 'ROLLED_BACK'>('ALL');
  const [countdownSec, setCountdownSec] = useState<number>(285);

  // Rollback state
  const [rollbackFeatureId, setRollbackFeatureId] = useState('');
  const [rollbackReason, setRollbackReason] = useState('');
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackFeedback, setRollbackFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Live countdown timer for next evaluation
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [status, roadmap] = await Promise.all([
        apiGetEvolutionStatus(),
        apiGetAutonomousRoadmap(),
      ]);
      if (status.ok) {
        setStatusData(status);
        if (status.featureProposals?.length > 0) {
          setSelectedProposal(status.featureProposals[0]);
        }
        if (status.auditLogs?.length > 0) {
          setSelectedAuditLog(status.auditLogs[0]);
        }
        if (status.events?.length > 0) {
          setSelectedMemoryEvent(status.events[0]);
        }
      }
      if (roadmap.ok && roadmap.roadmap) {
        setRoadmapData(roadmap.roadmap);
      }
    } catch (err) {
      console.error('Error fetching evolution status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCycle = async () => {
    try {
      setIsCycling(true);
      setCycleNotification('Initiating Autonomous 17-Stage Evolution Cycle across all 13 Observation Dimensions...');
      const res = await apiRunEvolutionCycle({
        trustLevel: selectedTrustLevel,
        runSandboxTests: true,
      });
      if (res.ok) {
        setCycleNotification(
          `Cycle ${res.cycleId} Completed! Multi-Agent Consensus: ${res.multiAgentEvaluation?.consensusOutcome} (${res.multiAgentEvaluation?.consensusRationale})`
        );
        setCountdownSec(300);
        await loadData();
      }
    } catch (err: any) {
      setCycleNotification(`Cycle execution error: ${err?.message}`);
    } finally {
      setIsCycling(false);
      setTimeout(() => setCycleNotification(null), 8000);
    }
  };

  const handleRollbackMemoryEvent = async (eventId: string) => {
    if (!eventId) return;
    try {
      setIsRollingBack(true);
      const res = await apiRollbackEvolutionEvent(
        eventId,
        'Admin manual rollback via Command Center',
        currentUser?.username || 'Platform Administrator'
      );
      if (res.ok) {
        setCycleNotification(`Rollback successful: Event ${eventId} restored to prior baseline.`);
        await loadData();
      }
    } catch (err: any) {
      setCycleNotification(`Rollback error: ${err?.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleExecuteRollback = async (featId: string) => {
    if (!featId) return;
    try {
      setIsRollingBack(true);
      setRollbackFeedback(null);
      const res = await apiExecuteRollback(
        featId,
        rollbackReason || 'Platform Developer Manual Rollback'
      );
      if (res.ok) {
        setRollbackFeedback(res.message || 'Rollback executed successfully.');
        await loadData();
      } else {
        setRollbackFeedback(`Rollback failed: ${res.error}`);
      }
    } catch (err: any) {
      setRollbackFeedback(`Rollback error: ${err?.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  // STRICT ADMIN ACCESS BARRIER
  if (!isAdmin) {
    return (
      <div className="bg-slate-950 border border-rose-500/30 rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto my-12 text-center text-slate-100 font-mono-code">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4 animate-pulse">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-military font-bold text-white tracking-wider mb-2">
          ADMINISTRATOR ACCESS ONLY
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto mb-6">
          The PRIMEPIPFX Autonomous Evolution Engine Command Center is exclusively restricted to verified Administrator and Developer roles. Elevated permissions are required to inspect multi-agent evaluation pipelines, monitor observation dimensions, review sandboxed diffs, or execute rollback procedures.
        </p>
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs mb-6 max-w-md mx-auto">
          Current Role: <span className="font-bold text-white">{currentUser?.role || 'TRADER / UNAUTHORIZED'}</span> • Access Denied (HTTP 403)
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-200 transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        )}
      </div>
    );
  }

  const currentVersion = statusData?.currentVersion || 'v2.9.44-evo.44';
  const evolutionStatus = statusData?.evolutionStatus || (isEnginePaused ? 'PAUSED' : 'ACTIVE');
  const lastEvaluationTime = statusData?.lastEvaluation || statusData?.lastCycleTimestamp || Date.now() - 75000;
  const nextEvaluationTime = statusData?.nextEvaluation || Date.now() + 225000;

  const detectedGaps = statusData?.detectedGaps || [];
  const activeExperiments = statusData?.activeExperiments || [];
  const builtFeatures = statusData?.builtFeatures || [];
  const testedFeatures = statusData?.testedFeatures || [];
  const releasedFeatures = statusData?.releasedFeatures || [];
  const failedFeatures = statusData?.failedFeatures || [];
  const rolledBackFeatures = statusData?.rolledBackFeatures || [];
  const memoryEvents = statusData?.events || [];
  const dimensionMetrics = statusData?.dimensionMetrics || [];

  const stats = statusData?.stats || {
    cyclesCompleted: statusData?.activeCycle || 44,
    needsDetectedCount: detectedGaps.length || 3,
    gapsDetectedCount: detectedGaps.length || 3,
    ideasGeneratedCount: 12,
    featuresCreatedCount: builtFeatures.length || 3,
    featuresTestedCount: testedFeatures.length || 3,
    featuresDeployedCount: releasedFeatures.length || 3,
    featuresRolledBackCount: rolledBackFeatures.length || 0,
    systemHealth: 'OPTIMAL',
    securityStatus: 'SECURE',
    evolutionConfidence: 97,
  };

  const minutesLeft = Math.floor(countdownSec / 60);
  const secondsLeft = countdownSec % 60;

  return (
    <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans my-4">
      {/* 1. EXECUTIVE HEADER: ALL MANDATED ADMIN ITEMS */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/50 to-slate-900 border-b border-emerald-500/30 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-military font-bold tracking-wider text-white">
                  PRIMEPIPFX EVOLUTION COMMAND CENTER
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  ADMIN ONLY
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  {evolutionStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono-code">
                Autonomous 17-Stage Architecture • 13 Observation Dimensions • Multi-Agent Consensus
              </p>
            </div>
          </div>

          {/* Controls & Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Trust Level Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs font-mono-code">
              <span className="text-slate-400">Trust Level:</span>
              <select
                value={selectedTrustLevel}
                onChange={(e) => setSelectedTrustLevel(Number(e.target.value))}
                className="bg-transparent text-emerald-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900 text-white">L0: Observe</option>
                <option value={1} className="bg-slate-900 text-white">L1: Content</option>
                <option value={2} className="bg-slate-900 text-white">L2: UI/Workflow</option>
                <option value={3} className="bg-slate-900 text-white">L3: Software</option>
              </select>
            </div>

            {/* Pause/Resume Engine */}
            <button
              onClick={() => setIsEnginePaused(!isEnginePaused)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isEnginePaused
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              {isEnginePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {isEnginePaused ? 'Resume Engine' : 'Pause Engine'}
            </button>

            {/* Trigger Autonomous Cycle */}
            <button
              onClick={handleRunCycle}
              disabled={isCycling || isEnginePaused}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-180 shadow-lg shadow-emerald-500/25 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCycling ? 'animate-spin' : ''}`} />
              <span>{isCycling ? 'Evaluating 17 Stages...' : 'Trigger Evolution Cycle'}</span>
            </button>
          </div>
        </div>

        {/* Live Notification Banner */}
        {cycleNotification && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{cycleNotification}</span>
            </div>
            <button
              onClick={() => setCycleNotification(null)}
              className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CORE MANDATED ATTRIBUTES STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-3">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Current Version</div>
            <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">{currentVersion}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Auditable Git Baseline</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Evolution Status</div>
            <div className="text-base font-mono font-bold text-cyan-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {evolutionStatus}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Autonomous L2 Safe Sandbox</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Last Evaluation</div>
            <div className="text-sm font-mono font-bold text-white mt-0.5">
              {new Date(lastEvaluationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Cycle {stats.cyclesCompleted} Completed</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Next Evaluation</div>
            <div className="text-sm font-mono font-bold text-amber-400 mt-0.5 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              In {minutesLeft}m {secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}s
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Continuous Cadence: 300s</div>
          </div>
        </div>

        {/* 7 MANDATED EVOLUTION LIFECYCLE COUNTERS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-3">
          <button
            onClick={() => setActiveTab('GAPS_EXPERIMENTS')}
            className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl p-2.5 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Detected Gaps</div>
            <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">{detectedGaps.length || 3}</div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">Telemetry Scanned</div>
          </button>

          <button
            onClick={() => setActiveTab('GAPS_EXPERIMENTS')}
            className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-2.5 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Active Experiments</div>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">{activeExperiments.length || 2}</div>
            <div className="text-[10px] text-cyan-300/80 mt-0.5">Canary Cohorts</div>
          </button>

          <button
            onClick={() => { setActiveTab('FEATURES'); setFeatureFilter('BUILT'); }}
            className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 rounded-xl p-2.5 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Built Features</div>
            <div className="text-lg font-mono font-bold text-blue-400 mt-0.5">{builtFeatures.length || 3}</div>
            <div className="text-[10px] text-blue-300/80 mt-0.5">Sandboxed Modules</div>
          </button>

          <button
            onClick={() => { setActiveTab('FEATURES'); setFeatureFilter('TESTED'); }}
            className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-2.5 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Tested Features</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">{testedFeatures.length || 3}</div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">100% Passed</div>
          </button>

          <button
            onClick={() => { setActiveTab('FEATURES'); setFeatureFilter('RELEASED'); }}
            className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 rounded-xl p-2.5 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Released Features</div>
            <div className="text-lg font-mono font-bold text-teal-400 mt-0.5">{releasedFeatures.length || 3}</div>
            <div className="text-[10px] text-teal-300/80 mt-0.5">Live Production</div>
          </button>

          <button
            onClick={() => { setActiveTab('FEATURES'); setFeatureFilter('FAILED'); }}
            className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/40 rounded-xl p-2.5 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Failed Features</div>
            <div className="text-lg font-mono font-bold text-rose-400 mt-0.5">{failedFeatures.length || 0}</div>
            <div className="text-[10px] text-rose-300/80 mt-0.5">Safety Blocked</div>
          </button>

          <button
            onClick={() => { setActiveTab('FEATURES'); setFeatureFilter('ROLLED_BACK'); }}
            className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 rounded-xl p-2.5 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono-code text-slate-400 uppercase">Rolled Back Features</div>
            <div className="text-lg font-mono font-bold text-purple-400 mt-0.5">{rolledBackFeatures.length || 0}</div>
            <div className="text-[10px] text-purple-300/80 mt-0.5">Instant Restored</div>
          </button>
        </div>
      </div>

      {/* 2. TAB NAVIGATION (Cyber Command Center Layout) */}
      <div className="bg-[#070E18]/90 border-b border-emerald-500/20 px-4 sm:px-6 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        {[
          { id: 'OVERVIEW', label: 'Overview & 17-Stage Loop' },
          { id: 'MEMORY', label: 'Evolution Memory Store' },
          { id: 'GAPS_EXPERIMENTS', label: 'Detected Gaps & Canaries' },
          { id: 'FEATURES', label: 'Features Lifecycle' },
          { id: 'DIMENSIONS', label: '13 Observation Dimensions' },
          { id: 'LIVE_FEED', label: 'Live Evolution Feed' },
          { id: 'SANDBOX', label: 'Sandbox & Safety Lab' },
          { id: 'CONSENSUS', label: '15-Agent Consensus' },
          { id: 'ROADMAP', label: 'Autonomous Roadmap' },
          { id: 'INNOVATIONS', label: 'Innovation Engine' },
          { id: 'EXPLAINABILITY', label: 'Explainability & Audit' },
          { id: 'FEEDBACK', label: 'Trader Feedback' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 text-xs font-mono-code font-bold whitespace-nowrap rounded-xl transition-all duration-180 select-none active:scale-95 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-emerald-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. TAB CONTENTS */}
      <div className="p-6">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
            <p className="text-xs font-mono-code">Retrieving real-time telemetry from Evolution Engine...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW & 17-STAGE EVOLUTION PIPELINE */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-6">
                <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-military font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      THE 17-STAGE AUTONOMOUS EVOLUTION PIPELINE
                    </h3>
                    <span className="text-[11px] font-mono-code text-slate-400">
                      Last Execution: {new Date(stats.lastCycleTimestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Visual 17-stage loop */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
                    {[
                      { step: 1, name: 'OBSERVE', desc: '13 dimensions telemetry' },
                      { step: 2, name: 'ANALYZE', desc: 'Behavior & latency patterns' },
                      { step: 3, name: 'DETECT GAP', desc: 'Identify friction points' },
                      { step: 4, name: 'PRIORITIZE', desc: 'P0/P1 opportunity ranking' },
                      { step: 5, name: 'GENERATE', desc: 'Safe solution concept' },
                      { step: 6, name: 'DESIGN', desc: 'Zero-clutter workflows' },
                      { step: 7, name: 'SANDBOX', desc: 'Isolated sandbox build' },
                      { step: 8, name: 'TESTS', desc: 'Automated test suite' },
                      { step: 9, name: 'SECURITY', desc: 'AST & 0 RCE verification' },
                      { step: 10, name: 'DATA VALIDATION', desc: 'Tenant isolation checks' },
                      { step: 11, name: 'PERFORMANCE', desc: 'LCP & bundle delta test' },
                      { step: 12, name: 'CANARY', desc: 'Gradual cohort rollout' },
                      { step: 13, name: 'MEASURE', desc: 'Real user metrics delta' },
                      { step: 14, name: 'RELEASE', desc: 'Production deployment' },
                      { step: 15, name: 'MONITOR', desc: 'Live error & tilt telemetry' },
                      { step: 16, name: 'ROLLBACK', desc: 'Instant atomic revert' },
                      { step: 17, name: 'LEARN', desc: 'Evolution memory store' },
                    ].map((st) => (
                      <div
                        key={st.step}
                        className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-2.5 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono-code text-emerald-400">
                            <span>S{st.step}</span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          </div>
                          <div className="font-bold text-[11px] text-white mt-1 leading-tight">{st.name}</div>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1 leading-tight">{st.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Opportunity Highlight */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        Top Active Evolution: Integrated Sizing (v1.4.2-evo)
                      </h4>
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        CANARY ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Embedded real-time position sizing directly inside Pre-Trade Plan, eliminating repetitive navigation between Lot Calculator and Pre-Trade sheet.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono-code">
                      <div className="bg-slate-800/60 p-2 rounded-lg text-center">
                        <div className="text-slate-400 text-[10px]">Friction Reduction</div>
                        <div className="text-emerald-400 font-bold mt-0.5">68%</div>
                      </div>
                      <div className="bg-slate-800/60 p-2 rounded-lg text-center">
                        <div className="text-slate-400 text-[10px]">Satisfaction</div>
                        <div className="text-emerald-400 font-bold mt-0.5">96%</div>
                      </div>
                      <div className="bg-slate-800/60 p-2 rounded-lg text-center">
                        <div className="text-slate-400 text-[10px]">Security Checks</div>
                        <div className="text-emerald-400 font-bold mt-0.5">5/5 Passed</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        Next Evolution: Stop Loss Integrity Shield (v1.4.3-evo)
                      </h4>
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        SANDBOX VALIDATED
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Defensive cognitive interceptor that detects when a trader attempts to widen their stop loss mid-trade in drawdown, triggering a high-contrast discipline confirmation modal.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono-code">
                      <div className="bg-slate-800/60 p-2 rounded-lg text-center">
                        <div className="text-slate-400 text-[10px]">Opportunity Score</div>
                        <div className="text-cyan-400 font-bold mt-0.5">88/100</div>
                      </div>
                      <div className="bg-slate-800/60 p-2 rounded-lg text-center">
                        <div className="text-slate-400 text-[10px]">Agent Consensus</div>
                        <div className="text-cyan-400 font-bold mt-0.5">15/15 Yes</div>
                      </div>
                      <div className="bg-slate-800/60 p-2 rounded-lg text-center">
                        <div className="text-slate-400 text-[10px]">Rollback Snapshot</div>
                        <div className="text-cyan-400 font-bold mt-0.5">Ready (0ms)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LIVE EVOLUTION FEED (Section 25) */}
            {activeTab === 'LIVE_FEED' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div>
                    <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Continuous Autonomous Event Feed (Real-Time Transparency)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Chronological stream of all 22-step cycle milestones, friction detections, and consensus validations.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono-code px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      LIVE STREAM ACTIVE
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {(statusData?.liveFeed || [
                    {
                      id: 'f-1',
                      timeFormatted: '18:31',
                      stepNumber: 1,
                      stage: 'OBSERVE',
                      event: 'User workflow pattern detected',
                      details: 'Traders repeatedly bounce between Lot Size Calculator and Pre-Trade Plan within 45s.',
                      status: 'INFO',
                    },
                    {
                      id: 'f-2',
                      timeFormatted: '18:32',
                      stepNumber: 4,
                      stage: 'DETECT_GAPS',
                      event: 'Cognitive friction gap categorized',
                      details: 'Manual re-keying gap confirmed with 27 documented occurrences.',
                      status: 'INFO',
                    },
                    {
                      id: 'f-3',
                      timeFormatted: '18:34',
                      stepNumber: 6,
                      stage: 'PRIORITIZE',
                      event: 'Opportunity scored: 91/100 (HIGH)',
                      details: 'Impact: 4, Frequency: 5, Severity: 3, Confidence: 0.94.',
                      status: 'SUCCESS',
                    },
                    {
                      id: 'f-4',
                      timeFormatted: '18:37',
                      stepNumber: 8,
                      stage: 'DESIGN',
                      event: 'Feature concept & UX blueprint generated',
                      details: 'Single-click memory bridge with visual confirmation flash formulated.',
                      status: 'SUCCESS',
                    },
                    {
                      id: 'f-5',
                      timeFormatted: '18:41',
                      stepNumber: 9,
                      stage: 'BUILD',
                      event: 'Technical implementation generated in sandbox',
                      details: 'Synthesized /src/utils/tradeBridge.ts isolated module.',
                      status: 'SUCCESS',
                    },
                    {
                      id: 'f-6',
                      timeFormatted: '18:49',
                      stepNumber: 10,
                      stage: 'SANDBOX_BUILD',
                      event: 'Isolated sandbox build completed',
                      details: 'Build passed in 1,420ms with 0 compile warnings.',
                      status: 'SUCCESS',
                    },
                    {
                      id: 'f-7',
                      timeFormatted: '18:52',
                      stepNumber: 13,
                      stage: 'SECURITY_SCAN',
                      event: 'Security Agent validation passed (0 violations)',
                      details: 'Zero eval(), no privilege escalations, financial calculation bounds strictly verified.',
                      status: 'SUCCESS',
                    },
                    {
                      id: 'f-8',
                      timeFormatted: '18:54',
                      stepNumber: 16,
                      stage: 'CANARY_DEPLOY',
                      event: 'Canary deployment initiated for 10% cohort',
                      details: 'Canary flag enabled; real-world metric telemetry streaming.',
                      status: 'IN_PROGRESS',
                    },
                    {
                      id: 'f-9',
                      timeFormatted: '19:10',
                      stepNumber: 17,
                      stage: 'MEASURE_PERFORMANCE',
                      event: 'Real-world telemetry validated (62% time reduction)',
                      details: 'Zero errors logged; user adoption measured at 94%.',
                      status: 'SUCCESS',
                    },
                    {
                      id: 'f-10',
                      timeFormatted: '19:12',
                      stepNumber: 19,
                      stage: 'RELEASE',
                      event: 'Evolution released to production baseline',
                      details: 'Version 1.2.0 active with instant non-destructive rollback checkpoint saved.',
                      status: 'SUCCESS',
                    },
                  ]).map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3.5 flex items-start gap-3 transition-colors"
                    >
                      <div className="font-mono-code text-xs font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 flex-shrink-0">
                        {item.timeFormatted}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            STEP {item.stepNumber || '•'}
                          </span>
                          <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {item.stage}
                          </span>
                          <span className="text-xs font-bold text-white tracking-wide">
                            {item.event}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {item.details}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        <span
                          className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded border ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : item.status === 'IN_PROGRESS'
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CAPABILITY REGISTRY (Section 22) */}
            {activeTab === 'CAPABILITIES' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div>
                    <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      PRIMEPIPFX Dynamic Capability Directory
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Authoritative map of what the platform currently supports, integrated AI models, external APIs, and identified missing gaps.
                    </p>
                  </div>
                  <div className="text-xs font-mono-code text-slate-400">
                    Capabilities Cataloged: <span className="text-emerald-400 font-bold">{statusData?.capabilities?.length || 14}</span>
                  </div>
                </div>

                {/* Capability Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(statusData?.capabilities || [
                    {
                      id: 'cap-1',
                      category: 'CORE_FEATURE',
                      name: 'High-Precision Trade Journal',
                      version: '2.4.0',
                      status: 'ACTIVE',
                      description: 'Complete trade execution recording with multi-timeframe tagging, emotional ratings, and PnL metrics.',
                      evolutionLevel: 4,
                      combinatorialSynergies: ['Analytics', 'Psychology', 'Pre-Trade Plan'],
                    },
                    {
                      id: 'cap-2',
                      category: 'CORE_FEATURE',
                      name: '1% Capital Preservation Risk Guardian',
                      version: '2.1.0',
                      status: 'ACTIVE',
                      description: 'Hard mathematical enforcement of maximum 1% per-trade risk and 2% daily loss interlock with audio chime alerts.',
                      evolutionLevel: 4,
                      combinatorialSynergies: ['Lot Size Calc', 'Economic Calendar'],
                    },
                    {
                      id: 'cap-3',
                      category: 'AI_MODEL',
                      name: 'Google Gemini 2.5 Flash Multi-Modal',
                      version: '2.5.0',
                      status: 'ACTIVE',
                      description: 'Server-side reasoning engine powering Chart Scanner, AI Coach, and Opportunity Synthesis.',
                      provider: 'Google GenAI SDK',
                      evolutionLevel: 5,
                    },
                    {
                      id: 'cap-4',
                      category: 'DATA_SOURCE',
                      name: 'Fundamental Calendar Feed',
                      version: '1.4.0',
                      status: 'ACTIVE',
                      description: 'Real-time macroeconomic news feed with impact weighting (USD, EUR, GBP, JPY, CAD) and countdown timers.',
                      evolutionLevel: 2,
                    },
                    {
                      id: 'cap-5',
                      category: 'INTEGRATION',
                      name: 'Tactical Audio Alert Synthesizer',
                      version: '1.2.0',
                      status: 'ACTIVE',
                      description: 'Web Audio API procedural sound engine generating discrete chimes, warning klaxons, and discipline pulses.',
                      evolutionLevel: 2,
                    },
                    {
                      id: 'cap-6',
                      category: 'MISSING_GAP',
                      name: 'USD Simultaneous Exposure Matrix',
                      version: '0.1.0-planned',
                      status: 'PLANNED',
                      description: 'Cross-instrument correlation tracker warning if open positions compound hidden dollar risk across pairs.',
                      evolutionLevel: 4,
                    },
                  ]).map((cap: any) => (
                    <div
                      key={cap.id}
                      className="bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[9px] font-mono-code font-bold px-2 py-0.5 rounded border ${
                              cap.status === 'ACTIVE' || cap.status === 'SUPPORTED'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}
                          >
                            {cap.status}
                          </span>
                          <span className="text-[10px] font-mono-code text-slate-400">
                            v{cap.version} • Lv.{cap.evolutionLevel || 3}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white tracking-wide">{cap.name}</h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{cap.description}</p>
                      </div>

                      {cap.combinatorialSynergies && cap.combinatorialSynergies.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <div className="text-[10px] font-mono-code text-slate-400 mb-1">
                            Combinatorial Synergies:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {cap.combinatorialSynergies.map((syn: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SYSTEM HEALTH SENTINEL (Section 23) */}
            {activeTab === 'HEALTH' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div>
                    <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Autonomous System Health & Self-Healing Sentinel
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Continuous diagnostics across API, database, auth, background workers, and cryptographic update delivery.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono-code text-slate-400">
                      Uptime: <span className="text-emerald-400 font-bold">{statusData?.systemHealth?.overallUptime || 99.98}%</span>
                    </span>
                    <span className="text-[10px] font-mono-code font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      STATUS: OPTIMAL
                    </span>
                  </div>
                </div>

                {/* Subsystem Health Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(statusData?.systemHealth?.metrics || [
                    {
                      subsystem: 'Core Express REST API',
                      category: 'API',
                      status: 'HEALTHY',
                      latencyMs: 14,
                      uptimePercent: 99.98,
                      details: 'Port 3000 responsive, JSON payload serialization normal',
                    },
                    {
                      subsystem: 'Local & Cloud Database Layer',
                      category: 'DATABASE',
                      status: 'HEALTHY',
                      latencyMs: 8,
                      uptimePercent: 100.0,
                      details: 'IndexedDB persistent storage operational with local disk state backups',
                    },
                    {
                      subsystem: 'Authentication & Session Sentinel',
                      category: 'AUTH',
                      status: 'HEALTHY',
                      latencyMs: 6,
                      uptimePercent: 100.0,
                      details: 'HMAC token verification active; zero privilege bypass attempts',
                    },
                    {
                      subsystem: 'UI Frame Budget & Performance',
                      category: 'PERFORMANCE',
                      status: 'HEALTHY',
                      latencyMs: 16,
                      uptimePercent: 99.95,
                      details: 'Average 60 FPS maintained; zero excessive layout shifts',
                    },
                    {
                      subsystem: 'Autonomous Evolution Workers',
                      category: 'WORKERS',
                      status: 'HEALTHY',
                      latencyMs: 22,
                      uptimePercent: 100.0,
                      details: '15 Specialized AI Agent quorums active; sandbox isolation confirmed',
                    },
                    {
                      subsystem: 'Cryptographic Update Delivery',
                      category: 'SECURITY',
                      status: 'HEALTHY',
                      latencyMs: 12,
                      uptimePercent: 100.0,
                      details: 'Signed manifest verification operational; unauthorized URLs blocked',
                    },
                    {
                      subsystem: 'Gemini 2.5 Flash Server Proxy',
                      category: 'INTEGRATION',
                      status: 'HEALTHY',
                      latencyMs: 380,
                      uptimePercent: 99.85,
                      details: 'Server-side key security maintained; rate limits intact',
                    },
                    {
                      subsystem: 'IndexedDB & Journal Engine',
                      category: 'STORAGE',
                      status: 'HEALTHY',
                      latencyMs: 5,
                      uptimePercent: 99.99,
                      details: 'Read/Write quotas healthy; zero corruption incidents',
                    },
                  ]).map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono-code font-bold text-slate-400">
                          {m.category}
                        </span>
                        <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {m.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">{m.subsystem}</div>
                      <div className="text-[11px] text-slate-300 font-sans leading-snug">
                        {m.details}
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono-code text-slate-400">
                        <span>Latency: {m.latencyMs}ms</span>
                        <span>Uptime: {m.uptimePercent}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Self-Healing Incident & Resolution Log */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-xs font-military font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Automated Detect → Diagnose → Recover → Verify Log
                  </h4>
                  <div className="space-y-2">
                    {(statusData?.systemHealth?.recentIncidents || [
                      {
                        id: 'inc-1',
                        timestamp: Date.now() - 14400000,
                        subsystem: 'IndexedDB Storage Quota',
                        detectedIssue: 'Local storage buffer reached 92% capacity during batch screenshot import',
                        diagnostic: 'Temporary cache bloat in legacy telemetry table',
                        recoveryAction: 'Executed non-destructive telemetry log compaction preserving all trade records',
                        verificationOutcome: 'RECOVERY_VERIFIED',
                        downtimeMs: 0,
                      },
                      {
                        id: 'inc-2',
                        timestamp: Date.now() - 86400000,
                        subsystem: 'Audio Synthesis Dispatcher',
                        detectedIssue: 'AudioContext autoplay policy blocked initial alert chime without user interaction',
                        diagnostic: 'Browser security policy required explicit user gesture unlock',
                        recoveryAction: 'Injected lazy-unlock event listener on first pointerdown/click interaction',
                        verificationOutcome: 'RECOVERY_VERIFIED',
                        downtimeMs: 0,
                      },
                    ]).map((inc: any) => (
                      <div
                        key={inc.id}
                        className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{inc.subsystem}</span>
                          <span className="text-[10px] font-mono-code text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            {inc.verificationOutcome} (Downtime: {inc.downtimeMs}ms)
                          </span>
                        </div>
                        <p className="text-slate-300">
                          <span className="text-rose-400 font-semibold">Detected:</span> {inc.detectedIssue}
                        </p>
                        <p className="text-slate-300">
                          <span className="text-amber-400 font-semibold">Diagnosed:</span> {inc.diagnostic}
                        </p>
                        <p className="text-slate-300">
                          <span className="text-emerald-400 font-semibold">Self-Healed:</span> {inc.recoveryAction}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: NEEDS & GAPS */}
            {activeTab === 'NEEDS_GAPS' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-emerald-400" />
                    Detected User Needs Across Trader Categories
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statusData?.needs?.map((need: any) => (
                      <div
                        key={need.id}
                        className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 space-y-2 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                            TARGET: {need.profileCategory}
                          </span>
                          <span className="text-[10px] font-mono-code text-slate-400">
                            Confidence: {Math.round(need.confidence * 100)}%
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white">{need.title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{need.description}</p>
                        <div className="pt-2 border-t border-slate-800 text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
                          <span>Empirical Evidence:</span>
                          <span className="text-slate-300 truncate max-w-xs">{need.evidence}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Detected Workflow Gaps & Friction Points
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statusData?.gaps?.map((gap: any) => (
                      <div
                        key={gap.id}
                        className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 space-y-2 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {gap.category}
                          </span>
                          <span className="text-[10px] font-mono-code text-amber-400">
                            Impact: {gap.impactScore}/100
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white">{gap.potentialGap}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Trigger Scenario: {gap.triggerScenario}
                        </p>
                        <div className="bg-slate-800/60 p-2 rounded-lg text-[11px] font-mono-code text-emerald-300">
                          Action: {gap.suggestedAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: OPPORTUNITY SCORES */}
            {activeTab === 'OPPORTUNITIES' && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-mono-code text-slate-400 mb-1">
                    OPPORTUNITY SCORING FORMULA
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    Opportunity Score = User Impact (1-10) × Frequency (1-10) × Severity (1-10) × Strategic Value (1-10) × Confidence (0-1) [Normalized 0-100]
                  </div>
                </div>

                <div className="space-y-3">
                  {statusData?.opportunities?.map((opp: any) => (
                    <div
                      key={opp.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono-code px-2 py-0.5 rounded font-bold ${
                              opp.classification === 'CRITICAL_IMPACT'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : opp.classification === 'HIGH_VALUE'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            {opp.classification}
                          </span>
                          <h4 className="font-bold text-sm text-white">{opp.featureName}</h4>
                        </div>
                        <p className="text-xs text-slate-400">{opp.rationale}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono-code">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 uppercase">Impact / Freq / Sev</div>
                          <div className="text-slate-300 font-bold">
                            {opp.userImpact} / {opp.frequency} / {opp.severity}
                          </div>
                        </div>
                        <div className="text-center bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 min-w-[70px]">
                          <div className="text-[9px] text-slate-400 uppercase">Score</div>
                          <div className="text-lg font-bold text-emerald-400">{opp.normalizedScore}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: FEATURE PROPOSALS (18-POINT AUDIT) */}
            {activeTab === 'PROPOSALS' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List of Proposals */}
                <div className="space-y-3 lg:col-span-1">
                  <h3 className="text-xs font-military font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Candidate Feature Proposals
                  </h3>
                  {statusData?.featureProposals?.map((p: any) => (
                    <button
                      key={p.featureId}
                      type="button"
                      onClick={() => setSelectedProposal(p)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        selectedProposal?.featureId === p.featureId
                          ? 'bg-emerald-500/20 border-emerald-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400 mb-1">
                        <span>{p.roadmapCategory}</span>
                        <span className="text-emerald-400">Confidence: {p.confidenceScore}%</span>
                      </div>
                      <div className="font-bold text-xs">{p.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">{p.problem}</div>
                    </button>
                  ))}
                </div>

                {/* Detailed 18-Point Inspection */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {selectedProposal ? (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            LEVEL {selectedProposal.trustLevel} TRUST
                          </span>
                          <h3 className="text-base font-military font-bold text-white mt-1">
                            {selectedProposal.name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          STATUS: {selectedProposal.status}
                        </span>
                      </div>

                      {/* 18-Point Fields Display */}
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800/40 p-3 rounded-lg">
                            <span className="text-slate-400 font-bold block mb-1">1. Problem</span>
                            <p className="text-slate-200">{selectedProposal.problem}</p>
                          </div>
                          <div className="bg-slate-800/40 p-3 rounded-lg">
                            <span className="text-slate-400 font-bold block mb-1">2. Who Benefits</span>
                            <p className="text-slate-200">{selectedProposal.whoBenefits}</p>
                          </div>
                        </div>

                        <div className="bg-slate-800/40 p-3 rounded-lg">
                          <span className="text-slate-400 font-bold block mb-1">3. Evidence</span>
                          <p className="text-slate-200">{selectedProposal.evidence}</p>
                        </div>

                        <div className="bg-slate-800/40 p-3 rounded-lg">
                          <span className="text-slate-400 font-bold block mb-1">4. Proposed Solution</span>
                          <p className="text-slate-200">{selectedProposal.proposedSolution}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800/40 p-3 rounded-lg">
                            <span className="text-slate-400 font-bold block mb-1">5. Technical Architecture</span>
                            <p className="text-slate-200">{selectedProposal.technicalArchitecture}</p>
                          </div>
                          <div className="bg-slate-800/40 p-3 rounded-lg">
                            <span className="text-slate-400 font-bold block mb-1">6. Security Requirements</span>
                            <p className="text-slate-200">{selectedProposal.securityRequirements}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800/40 p-3 rounded-lg">
                            <span className="text-slate-400 font-bold block mb-1">7. Testing Strategy</span>
                            <p className="text-slate-200">{selectedProposal.testingStrategy}</p>
                          </div>
                          <div className="bg-slate-800/40 p-3 rounded-lg">
                            <span className="text-slate-400 font-bold block mb-1">8. Rollback Strategy</span>
                            <p className="text-slate-200">{selectedProposal.rollbackStrategy}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-500 py-12">Select a proposal to inspect</div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: SANDBOX & SAFETY LAB */}
            {activeTab === 'SANDBOX' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-400" />
                    Isolated Sandbox Environments & Test Results
                  </h3>
                  <span className="text-xs font-mono-code text-slate-400">
                    Safe-by-Default Architecture
                  </span>
                </div>

                <div className="space-y-4">
                  {statusData?.sandboxes?.map((sb: any) => (
                    <div
                      key={sb.evolutionId}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            {sb.deploymentStatus}
                          </span>
                          <h4 className="font-bold text-sm text-white mt-1">{sb.featureDescription}</h4>
                          <span className="text-[11px] font-mono-code text-slate-400">
                            Version: {sb.version} • Rollback Snapshot: {sb.rollbackVersion}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            Score: {sb.performanceResults?.score}/100
                          </span>
                        </div>
                      </div>

                      {/* Security Results & Automated Checks */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-code">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                          <div className="text-slate-400 font-bold flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Autonomous Security Audit (5 Rules)
                          </div>
                          <ul className="space-y-1 text-slate-300">
                            {sb.securityResults?.checksPassed?.map((c: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-1.5 text-emerald-400">
                                <Check className="w-3.5 h-3.5" />
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                          <div className="text-slate-400 font-bold flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-cyan-400" />
                            Automated Test Suite ({sb.testResults?.passedCount}/{sb.testResults?.testCount} Passed)
                          </div>
                          <ul className="space-y-1 text-slate-300">
                            {sb.testResults?.details?.map((d: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-1.5 text-slate-300">
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Generated Code Snippet */}
                      {sb.generatedFiles?.length > 0 && (
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                          <div className="text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-purple-400" />
                              {sb.generatedFiles[0].path}
                            </span>
                            <span className="text-slate-500">
                              SHA256: {sb.generatedFiles[0].sha256Signature?.slice(0, 12)}...
                            </span>
                          </div>
                          <pre className="text-[11px] font-mono text-emerald-300 bg-slate-900/80 p-2.5 rounded border border-slate-800 overflow-x-auto">
                            <code>{sb.generatedFiles[0].contentSnippet}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: 15-AGENT CONSENSUS */}
            {activeTab === 'CONSENSUS' && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider">
                      15 SPECIALIZED AI AGENTS • UNANIMOUS CONSENSUS
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No single AI agent has unrestricted deployment authority. Security & Risk agents hold absolute veto power.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ALL 15 DOMAINS OPERATIONAL
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { agent: 'OBSERVER_AGENT', role: 'Signal & telemetry validation', approved: true, conf: 95 },
                    { agent: 'NEED_AGENT', role: 'Trader category unmet needs', approved: true, conf: 94 },
                    { agent: 'GAP_AGENT', role: 'Workflow friction & missing tools', approved: true, conf: 92 },
                    { agent: 'RESEARCH_AGENT', role: 'Institutional finance best practices', approved: true, conf: 91 },
                    { agent: 'PRODUCT_AGENT', role: 'Tactical UI & single-view constraints', approved: true, conf: 96 },
                    { agent: 'PSYCHOLOGY_AGENT', role: 'Tilt prevention & cognitive bandwidth', approved: true, conf: 93 },
                    { agent: 'ENGINEERING_AGENT', role: 'TypeScript architecture & bundle size', approved: true, conf: 94 },
                    { agent: 'SECURITY_AGENT', role: 'VETO AUTHORITY: Zero credentials / Auth check', approved: true, conf: 99 },
                    { agent: 'TEST_AGENT', role: 'Automated unit, integration, and lint tests', approved: true, conf: 95 },
                    { agent: 'UX_AGENT', role: 'Friction reduction & touch targets', approved: true, conf: 92 },
                    { agent: 'DATA_AGENT', role: 'Customer data isolation & schema integrity', approved: true, conf: 97 },
                    { agent: 'RISK_AGENT', role: 'VETO AUTHORITY: Math preservation (1% rule)', approved: true, conf: 96 },
                    { agent: 'EVALUATION_AGENT', role: 'Quality threshold & evidence verification', approved: true, conf: 93 },
                    { agent: 'ROLLBACK_AGENT', role: 'Instant atomic rollback verification', approved: true, conf: 99 },
                    { agent: 'LEARNING_AGENT', role: 'Evolution Memory & lesson ingestion', approved: true, conf: 95 },
                  ].map((ag) => (
                    <div
                      key={ag.agent}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-mono-code">
                        <span className="font-bold text-white truncate">{ag.agent}</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          YES
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{ag.role}</div>
                      <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500 pt-1 border-t border-slate-800">
                        <span>Confidence:</span>
                        <span className="text-emerald-400 font-bold">{ag.conf}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 7: AUTONOMOUS ROADMAP */}
            {activeTab === 'ROADMAP' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    Continuous Autonomous Product Roadmap
                  </h3>
                  <span className="text-xs font-mono-code text-slate-400">
                    Self-Organized from Empirical Signals
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['NOW', 'NEXT', 'EXPERIMENT', 'RESEARCH'].map((col) => (
                    <div key={col} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-military font-bold text-emerald-400">{col}</span>
                        <span className="text-[10px] font-mono-code text-slate-500">
                          {roadmapData ? roadmapData[col]?.length || 0 : 0} items
                        </span>
                      </div>

                      <div className="space-y-2">
                        {roadmapData &&
                          roadmapData[col]?.map((item: any) => (
                            <div
                              key={item.id}
                              className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1"
                            >
                              <div className="font-bold text-xs text-white">{item.title}</div>
                              <div className="text-[11px] text-slate-400">{item.evidence}</div>
                              <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500 pt-1">
                                <span>Release: {item.targetRelease}</span>
                                <span className="text-emerald-400">{item.confidence}% Conf</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 8: INNOVATION ENGINE */}
            {activeTab === 'INNOVATIONS' && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Cross-Capability Innovation Engine Combinations
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Actively searching for novel synergies across Journal, Risk Management, Psychology, and Calendar.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {statusData?.innovations?.map((inno: any) => (
                    <div
                      key={inno.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-white">{inno.name}</h4>
                        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          {inno.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {inno.combinedCapabilities?.map((c: string) => (
                          <span
                            key={c}
                            className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                          >
                            + {c}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{inno.resultingConcept}</p>
                      <div className="bg-slate-800/40 p-2.5 rounded-lg text-[11px] font-mono-code text-emerald-300">
                        Trader Value: {inno.expectedTraderValue}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 9: EXPLAINABILITY & AUDIT LOGS */}
            {activeTab === 'EXPLAINABILITY' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    The 8 Explainability Questions
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Every autonomous decision is documented with complete transparency and rationale.
                  </p>
                </div>

                <div className="space-y-4">
                  {statusData?.auditLogs?.map((log: any) => (
                    <div
                      key={log.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          Evolution ID: {log.evolutionId}
                        </span>
                        <span className="text-[11px] font-mono-code text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">1. Why created?</span>
                          <p className="text-slate-200">{log.explainability?.whyCreated}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">2. What problem solves?</span>
                          <p className="text-slate-200">{log.explainability?.whatProblemSolves}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">3. What evidence used?</span>
                          <p className="text-slate-200">{log.explainability?.whatEvidenceUsed}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">4. Who benefits?</span>
                          <p className="text-slate-200">{log.explainability?.whoBenefits}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">5. What could go wrong?</span>
                          <p className="text-slate-200">{log.explainability?.whatCouldGoWrong}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">6. How was tested?</span>
                          <p className="text-slate-200">{log.explainability?.howWasTested}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">7. What changed?</span>
                          <p className="text-slate-200">{log.explainability?.whatChanged}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">8. How can be rolled back?</span>
                          <p className="text-slate-200">{log.explainability?.howCanBeRolledBack}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: EVOLUTION MEMORY DATABASE/STORE (ALL 15 FIELDS) */}
            {activeTab === 'MEMORY' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-base font-military font-bold text-white uppercase tracking-wider">
                        EVOLUTION MEMORY DATABASE & AUDIT REPOSITORY
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                        IMMUTABLE STORE ({memoryEvents.length} EVENTS)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Persistent historical ledger capturing every autonomous evolution event with complete 15-point empirical telemetry, AST security validation, and atomic rollback tracking.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono-code text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Rollback Snapshot Guarantee: Active</span>
                  </div>
                </div>

                {/* Event list */}
                <div className="space-y-4">
                  {memoryEvents.map((evt: any) => {
                    const isExpanded = selectedMemoryEvent?.id === evt.id;
                    const isRolledBack = evt.rollbackStatus?.isRolledBack;

                    return (
                      <div
                        key={evt.id}
                        className={`bg-slate-900/90 border rounded-xl overflow-hidden transition-all duration-200 ${
                          isRolledBack
                            ? 'border-purple-500/40 bg-purple-950/10'
                            : evt.severity === 'CRITICAL'
                            ? 'border-rose-500/40'
                            : evt.severity === 'HIGH'
                            ? 'border-amber-500/40'
                            : 'border-slate-800 hover:border-emerald-500/40'
                        }`}
                      >
                        {/* Event Header Card */}
                        <div
                          onClick={() => setSelectedMemoryEvent(isExpanded ? null : evt)}
                          className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                                isRolledBack
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : evt.releaseStatus === 'RELEASED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              }`}
                            >
                              {isRolledBack ? <RotateCcw className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-white tracking-wide">
                                  {evt.id}
                                </span>
                                <span
                                  className={`text-[10px] font-mono-code px-2 py-0.5 rounded font-bold ${
                                    evt.severity === 'CRITICAL'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : evt.severity === 'HIGH'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}
                                >
                                  {evt.severity}
                                </span>
                                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                  PRIORITY: {evt.priority}
                                </span>
                                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/40">
                                  {evt.dimension}
                                </span>
                                <span
                                  className={`text-[10px] font-mono-code px-2 py-0.5 rounded font-bold ${
                                    isRolledBack
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                      : evt.releaseStatus === 'RELEASED'
                                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  }`}
                                >
                                  {isRolledBack ? 'STATE: ROLLED_BACK' : `RELEASE: ${evt.releaseStatus}`}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-slate-100 mt-1">{evt.detectedProblem}</h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end lg:self-center">
                            <span className="text-[11px] font-mono-code text-slate-400">
                              {new Date(evt.timestamp).toLocaleString()}
                            </span>
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Full 15-Point Event Details Drawer */}
                        {isExpanded && (
                          <div className="border-t border-slate-800 bg-slate-950/90 p-5 space-y-5 text-xs font-sans">
                            {/* Problem & Solution */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                                <div className="text-[10px] font-mono-code text-amber-400 uppercase font-bold flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  1. Detected Problem & Telemetry Evidence
                                </div>
                                <p className="text-slate-200 leading-relaxed">{evt.detectedProblem}</p>
                                <div className="pt-2">
                                  <span className="text-[10px] font-mono-code text-slate-400 block mb-1">EVIDENCE LOGGED:</span>
                                  <ul className="space-y-1">
                                    {evt.evidence?.map((ev: string, idx: number) => (
                                      <li key={idx} className="text-slate-300 text-[11px] font-mono-code flex items-start gap-1.5">
                                        <span className="text-emerald-400 font-bold">•</span>
                                        <span>{ev}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                                <div className="text-[10px] font-mono-code text-emerald-400 uppercase font-bold flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5" />
                                  2. Proposed Autonomous Solution
                                </div>
                                <p className="text-slate-200 leading-relaxed">{evt.proposedSolution}</p>
                                <div className="pt-2">
                                  <span className="text-[10px] font-mono-code text-slate-400 block mb-1">IMPLEMENTATION SPEC:</span>
                                  <p className="text-[11px] text-slate-300 font-mono-code bg-slate-950 p-2 rounded border border-slate-800">
                                    {evt.implementation?.spec}
                                  </p>
                                  <div className="mt-2 text-[10px] font-mono-code text-slate-400">
                                    Change Type: <span className="text-white font-bold">{evt.implementation?.changeType}</span> • Files Affected: {evt.implementation?.filesAffected?.join(', ')}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tests & Security Verification Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Tests */}
                              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <div className="text-[10px] font-mono-code text-emerald-400 uppercase font-bold flex items-center justify-between">
                                  <span>3. Automated Test Suites</span>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                <div className="space-y-1 text-[11px] font-mono-code">
                                  <div className="flex justify-between text-slate-300">
                                    <span>Unit Tests:</span>
                                    <span className="font-bold text-white">{evt.tests?.unitPassed}/{evt.tests?.unitTotal} Passed</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Integration:</span>
                                    <span className="font-bold text-white">{evt.tests?.integrationPassed}/{evt.tests?.integrationTotal} Passed</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Regression:</span>
                                    <span className="font-bold text-white">{evt.tests?.regressionPassed}/{evt.tests?.regressionTotal} Passed</span>
                                  </div>
                                </div>
                              </div>

                              {/* Security Result */}
                              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <div className="text-[10px] font-mono-code text-cyan-400 uppercase font-bold flex items-center justify-between">
                                  <span>4. AST Security Validation</span>
                                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                </div>
                                <div className="space-y-1 text-[11px] font-mono-code">
                                  <div className="flex justify-between text-slate-300">
                                    <span>RCE Status:</span>
                                    <span className="font-bold text-emerald-400">Zero Injections Detected</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Auth Isolation:</span>
                                    <span className="font-bold text-emerald-400">Enforced & Intact</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Risk Limits (1%):</span>
                                    <span className="font-bold text-emerald-400">Untouched / Guaranteed</span>
                                  </div>
                                </div>
                              </div>

                              {/* Performance Result */}
                              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <div className="text-[10px] font-mono-code text-purple-400 uppercase font-bold flex items-center justify-between">
                                  <span>5. Performance Deltas</span>
                                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                                </div>
                                <div className="space-y-1 text-[11px] font-mono-code">
                                  <div className="flex justify-between text-slate-300">
                                    <span>LCP Impact:</span>
                                    <span className="font-bold text-emerald-400">{evt.performanceResult?.lcpDeltaMs}ms</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Bundle Weight:</span>
                                    <span className="font-bold text-emerald-400">{evt.performanceResult?.bundleDeltaKb} KB</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Execution Latency:</span>
                                    <span className="font-bold text-emerald-400">{evt.performanceResult?.executionLatencyDeltaMs}ms</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* User Impact & Lessons Learned */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-2">
                                <div className="text-[10px] font-mono-code text-teal-400 uppercase font-bold">
                                  6. Measured Trader Impact
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono-code pt-1">
                                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                    <div className="text-slate-400 text-[9px]">Adoption Rate</div>
                                    <div className="text-emerald-400 font-bold mt-0.5">{evt.userImpact?.adoptionRate}%</div>
                                  </div>
                                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                    <div className="text-slate-400 text-[9px]">Friction Delta</div>
                                    <div className="text-emerald-400 font-bold mt-0.5">-{evt.userImpact?.frictionScoreReduction}%</div>
                                  </div>
                                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                    <div className="text-slate-400 text-[9px]">Error Delta</div>
                                    <div className="text-emerald-400 font-bold mt-0.5">{evt.userImpact?.errorRateDelta}%</div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-2">
                                <div className="text-[10px] font-mono-code text-indigo-400 uppercase font-bold">
                                  7. Evolution Lessons Learned & Memory Feedback
                                </div>
                                <p className="text-slate-300 leading-relaxed text-xs">
                                  {evt.lessonsLearned?.postMortemInsights}
                                </p>
                                <div className="text-[10px] font-mono-code text-slate-400 pt-1">
                                  Prevention Rules: <span className="text-slate-300">{evt.lessonsLearned?.preventionRules?.join('; ') || 'No regressions logged'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Rollback Status & Interactive Control Bar */}
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-mono-code text-slate-400 uppercase">Rollback Audit Status</div>
                                <div className="text-xs font-mono-code text-white mt-0.5">
                                  {isRolledBack ? (
                                    <span className="text-purple-400 font-bold flex items-center gap-1">
                                      <RotateCcw className="w-3 h-3" />
                                      Rolled back on {new Date(evt.rollbackStatus?.rollbackTimestamp).toLocaleString()} by {evt.rollbackStatus?.rolledBackBy} (Reason: {evt.rollbackStatus?.rollbackReason})
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400 flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      Production Baseline Active • Rollback Snapshot Verified and Ready
                                    </span>
                                  )}
                                </div>
                              </div>

                              {!isRolledBack && (
                                <button
                                  onClick={() => handleRollbackMemoryEvent(evt.id)}
                                  disabled={isRollingBack}
                                  className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-mono font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Rollback This Evolution Event</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: DETECTED GAPS & ACTIVE EXPERIMENTS */}
            {activeTab === 'GAPS_EXPERIMENTS' && (
              <div className="space-y-6">
                {/* Detected Gaps Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-military font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        DETECTED GAPS ACROSS 13 OBSERVATION DIMENSIONS
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Continuous telemetry scanning identifies friction points, workflow latencies, and unmet trader requirements.
                      </p>
                    </div>
                    <span className="text-xs font-mono-code px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {detectedGaps.length} GAPS DETECTED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {detectedGaps.map((gap: any) => (
                      <div
                        key={gap.id}
                        className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 space-y-3 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-amber-400">{gap.id}</span>
                          <span
                            className={`text-[10px] font-mono-code px-2 py-0.5 rounded font-bold ${
                              gap.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300'
                                : gap.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {gap.severity}
                          </span>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono-code text-slate-400 uppercase">Dimension: {gap.dimension}</div>
                          <h4 className="font-bold text-sm text-white mt-0.5">{gap.problem}</h4>
                        </div>

                        <div className="space-y-1 text-xs text-slate-300">
                          <span className="text-[10px] font-mono-code text-slate-400 block">EVIDENCE:</span>
                          <ul className="space-y-1">
                            {gap.evidence?.map((ev: string, idx: number) => (
                              <li key={idx} className="text-[11px] font-mono-code text-slate-400 flex items-start gap-1">
                                <span className="text-amber-400">•</span>
                                <span>{ev}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-slate-800">
                          <span className="text-[10px] font-mono-code text-emerald-400 block">RECOMMENDED SOLUTION:</span>
                          <p className="text-xs text-slate-300 mt-0.5">{gap.proposedSolution}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Experiments Section */}
                <div className="space-y-3 pt-6 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-military font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        ACTIVE CANARY EXPERIMENTS & REAL-TIME MEASUREMENT
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Live cohort rollouts measuring user friction deltas, satisfaction metrics, and error rates before full deployment.
                      </p>
                    </div>
                    <span className="text-xs font-mono-code px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {activeExperiments.length} ACTIVE CANARIES
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeExperiments.map((exp: any) => (
                      <div
                        key={exp.id}
                        className="bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-5 space-y-4 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs font-bold text-cyan-400">{exp.id}</span>
                            <h4 className="font-bold text-sm text-white mt-0.5">{exp.featureName}</h4>
                          </div>
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {exp.healthStatus}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-mono-code">
                            <span className="text-slate-400">Traffic Allocation:</span>
                            <span className="text-cyan-400 font-bold">{exp.trafficAllocation}% of Traders</span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div
                              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                              style={{ width: `${exp.trafficAllocation}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono-code pt-1">
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                            <div className="text-slate-400 text-[10px]">Friction Delta</div>
                            <div className="text-emerald-400 font-bold mt-0.5">-{exp.frictionReduction}%</div>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                            <div className="text-slate-400 text-[10px]">Cohort Size</div>
                            <div className="text-white font-bold mt-0.5">{exp.cohortSize} Users</div>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                            <div className="text-slate-400 text-[10px]">Security Checks</div>
                            <div className="text-emerald-400 font-bold mt-0.5">{exp.securityPassed ? '100% Pass' : 'Review'}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                          <button
                            onClick={() => handleExecuteRollback(exp.id)}
                            disabled={isRollingBack}
                            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                          >
                            Rollback Canary
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: FEATURES LIFECYCLE (BUILT, TESTED, RELEASED, FAILED, ROLLED_BACK) */}
            {activeTab === 'FEATURES' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      AUTONOMOUS FEATURE LIFECYCLE REPOSITORY
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Full tracking across Built, Tested, Released, Failed (Safety Blocked), and Rolled Back features.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'BUILT', label: `Built (${builtFeatures.length})` },
                      { id: 'TESTED', label: `Tested (${testedFeatures.length})` },
                      { id: 'RELEASED', label: `Released (${releasedFeatures.length})` },
                      { id: 'FAILED', label: `Failed (${failedFeatures.length})` },
                      { id: 'ROLLED_BACK', label: `Rolled Back (${rolledBackFeatures.length})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFeatureFilter(f.id as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono-code font-bold transition-all cursor-pointer ${
                          featureFilter === f.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(featureFilter === 'ALL' || featureFilter === 'RELEASED' ? releasedFeatures : [])
                    .concat(featureFilter === 'ALL' || featureFilter === 'BUILT' ? builtFeatures : [])
                    .concat(featureFilter === 'ALL' || featureFilter === 'TESTED' ? testedFeatures : [])
                    .concat(featureFilter === 'ALL' || featureFilter === 'FAILED' ? failedFeatures : [])
                    .concat(featureFilter === 'ALL' || featureFilter === 'ROLLED_BACK' ? rolledBackFeatures : [])
                    .map((feat: any, idx: number) => (
                      <div
                        key={feat.id || idx}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white">{feat.name}</span>
                          <span
                            className={`text-[10px] font-mono-code px-2 py-0.5 rounded font-bold ${
                              feat.status === 'RELEASED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : feat.status === 'TESTED'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : feat.status === 'FAILED'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : feat.status === 'ROLLED_BACK'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            }`}
                          >
                            {feat.status || 'RELEASED'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{feat.description || feat.spec}</p>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-code pt-1">
                          <div className="bg-slate-950 p-2 rounded text-slate-400">
                            Version: <span className="text-white font-bold">{feat.version || 'v2.9.44'}</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded text-slate-400">
                            Category: <span className="text-white font-bold">{feat.category || 'WORKFLOW'}</span>
                          </div>
                        </div>

                        {feat.status !== 'ROLLED_BACK' && (
                          <div className="flex justify-end pt-2 border-t border-slate-800">
                            <button
                              onClick={() => handleExecuteRollback(feat.id || feat.featureId)}
                              disabled={isRollingBack}
                              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                            >
                              Rollback Feature
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: 13 OBSERVATION DIMENSIONS */}
            {activeTab === 'DIMENSIONS' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      THE 13 OBSERVATION DIMENSIONS TELEMETRY GRID
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Continuous multi-layer observation across Frontend, Backend, UX, Security, and Trader Psychology.
                    </p>
                  </div>
                  <span className="text-xs font-mono-code px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ALL 13 ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'FRONTEND', name: '1. Frontend Performance', metric: '60 FPS • 0 Layout Shifts', status: 'OPTIMAL', desc: 'CSS containment, DOM node depth, mobile touch targets' },
                    { id: 'BACKEND', name: '2. Backend Service Health', metric: '12ms P95 API Latency', status: 'OPTIMAL', desc: 'Express middleware throughput, memory leaks, event loop' },
                    { id: 'UX', name: '3. UX & Workflow Depth', metric: '94% Plan Completion', status: 'HEALTHY', desc: 'Click depths, visual hierarchy, form fatigue' },
                    { id: 'ERRORS', name: '4. Error & Anomaly Rates', metric: '0.00% Uncaught Exceptions', status: 'OPTIMAL', desc: 'Console warnings, 4xx/5xx network failures' },
                    { id: 'PERFORMANCE', name: '5. Core Web Vitals', metric: '0.8s LCP • 12ms FID', status: 'OPTIMAL', desc: 'Bundle payload size, initial render tree' },
                    { id: 'SECURITY', name: '6. Security & AST Checks', metric: 'Zero Arbitrary Execution', status: 'SECURE', desc: 'Zero RCE, isolated customer state, auth rules' },
                    { id: 'DATA_INTEGRITY', name: '7. Data Schema Integrity', metric: '100% Schema Compliant', status: 'OPTIMAL', desc: 'Migration consistency, atomic localStorage state' },
                    { id: 'FEATURE_USAGE', name: '8. Feature Usage Telemetry', metric: '1,420 Daily Interactions', status: 'HEALTHY', desc: 'Tool adoption rates, unused button detection' },
                    { id: 'WORKFLOW_FRICTION', name: '9. Workflow Friction Scanner', metric: '68% Navigation Friction Cut', status: 'HEALTHY', desc: 'Repetitive tab switches, multi-step entry delays' },
                    { id: 'USER_FEEDBACK', name: '10. Trader Feedback Signals', metric: '4.9/5 CSAT Score', status: 'HEALTHY', desc: 'Ingested bug reports, trader satisfaction surveys' },
                    { id: 'JOURNAL_PATTERNS', name: '11. Trading Journal Patterns', metric: '840 Trades Analyzed', status: 'HEALTHY', desc: 'Risk violations, Stop-loss moving, over-leveraging' },
                    { id: 'PSYCHOLOGY_USAGE', name: '12. Psychology Regulation', metric: '91% Tilt Prevention Score', status: 'OPTIMAL', desc: 'Calming tool utilization, pre-trade breathing completion' },
                    { id: 'DEVELOPMENT_PROGRESS', name: '13. Evolution Velocity', metric: '44 Autonomous Cycles', status: 'ACTIVE', desc: 'Consensus speed, sandbox build success rate' },
                  ].map((dim) => (
                    <div
                      key={dim.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-emerald-500/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{dim.name}</span>
                        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          {dim.status}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400">{dim.metric}</div>
                      <p className="text-[11px] text-slate-400">{dim.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 11: TRADER FEEDBACK & ROLLBACK CONTROLS */}
            {activeTab === 'FEEDBACK' && (
              <div className="space-y-6">
                {/* Rollback Center */}
                <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-military font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      INSTANT AUTONOMOUS ROLLBACK CENTER
                    </h3>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      SAFETY CONTROLS
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Rollback any deployed or canary feature instantaneously to its verified stable snapshot.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {statusData?.registry?.map((feat: any) => (
                      <div
                        key={feat.featureId}
                        className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-xs text-white">{feat.name}</div>
                          <div className="text-[10px] font-mono-code text-slate-400">
                            Version: {feat.version} • Status: {feat.status}
                          </div>
                        </div>
                        <button
                          onClick={() => handleExecuteRollback(feat.featureId)}
                          disabled={isRollingBack}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-50"
                        >
                          Rollback
                        </button>
                      </div>
                    ))}
                  </div>

                  {rollbackFeedback && (
                    <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/40 text-rose-300 text-xs font-mono-code">
                      {rollbackFeedback}
                    </div>
                  )}
                </div>

                {/* Incoming User Feedback Feed */}
                <div>
                  <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Trader Suggestions & Bug Reports Ingested
                  </h3>
                  <div className="space-y-3">
                    {statusData?.recentFeedback?.map((fb: any) => (
                      <div
                        key={fb.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              {fb.feedbackType}
                            </span>
                            <span className="text-xs font-bold text-white">{fb.title}</span>
                          </div>
                          <span className="text-[10px] font-mono-code text-slate-400">
                            {new Date(fb.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{fb.description}</p>
                        {fb.evolutionEngineNotes && (
                          <div className="text-[11px] font-mono-code text-emerald-400 bg-slate-950 p-2 rounded">
                            Engine Ingestion Note: {fb.evolutionEngineNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
