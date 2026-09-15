// PrimePipFX Self-Evolving Trading Intelligence Platform
// Central Data Types and Schema Definitions

export type TraderExperienceLevel =
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED'
  | 'PROFESSIONAL'
  | 'PROP_TRADER'
  | 'INVESTOR'
  | 'MANUAL_TRADER'
  | 'SYSTEMATIC_TRADER';

export type EvolutionTrustLevel =
  | 0 // Level 0 — OBSERVE: analyze data & identify opportunities
  | 1 // Level 1 — CONTENT: generate educational/behavioral content
  | 2 // Level 2 — UI/WORKFLOW: generate and test low-risk interface improvements
  | 3; // Level 3 — SOFTWARE: sandbox generation, automated test, canary deployment

export type OpportunityPriority = 'LOW' | 'POTENTIAL' | 'HIGH' | 'CRITICAL';

// ----------------------------------------------------
// 13 OBSERVATION DIMENSIONS
// ----------------------------------------------------
export type ObservationDimension =
  | 'FRONTEND'
  | 'BACKEND'
  | 'UX'
  | 'ERRORS'
  | 'PERFORMANCE'
  | 'SECURITY'
  | 'DATA_INTEGRITY'
  | 'FEATURE_USAGE'
  | 'WORKFLOW_FRICTION'
  | 'USER_FEEDBACK'
  | 'TRADING_JOURNAL_PATTERNS'
  | 'PSYCHOLOGY_USAGE'
  | 'DEVELOPMENT_PROGRESS';

// ----------------------------------------------------
// 17-STAGE EVOLUTION PIPELINE
// ----------------------------------------------------
export type PipelineStage =
  | 'OBSERVE'
  | 'ANALYZE'
  | 'DETECT_GAP'
  | 'PRIORITIZE'
  | 'GENERATE_SOLUTION'
  | 'DESIGN'
  | 'BUILD_SANDBOX_VERSION'
  | 'RUN_TESTS'
  | 'SECURITY_VALIDATION'
  | 'DATA_VALIDATION'
  | 'PERFORMANCE_VALIDATION'
  | 'CANARY'
  | 'MEASURE'
  | 'RELEASE'
  | 'MONITOR'
  | 'ROLLBACK_IF_NECESSARY'
  | 'LEARN';

// ----------------------------------------------------
// SAFETY CLASSIFICATION & GUARDRAILS
// ----------------------------------------------------
export type ChangeRiskClassification = 'SAFE_LOW_RISK' | 'ELEVATED_CRITICAL';

export type SafeChangeCategory =
  | 'CONTENT_IMPROVEMENT'
  | 'UI_CONFIGURATION'
  | 'FEATURE_FLAG'
  | 'EDUCATIONAL_CONTENT'
  | 'NON_CRITICAL_UX';

export type ElevatedProtectedDomain =
  | 'AUTHENTICATION'
  | 'PAYMENTS'
  | 'FINANCIAL_CALCULATIONS'
  | 'RISK_LIMITS'
  | 'CUSTOMER_ISOLATION'
  | 'ARBITRARY_CODE_EXECUTION'
  | 'UNTRUSTED_CODE_DOWNLOAD';

// ----------------------------------------------------
// EVOLUTION MEMORY EVENT SCHEMA
// ----------------------------------------------------
export interface EvolutionEvent {
  id: string;
  timestamp: number;
  detectedProblem: string;
  evidence: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  dimension: ObservationDimension;
  proposedSolution: string;
  implementation: {
    spec: string;
    changeType: ChangeRiskClassification;
    category?: SafeChangeCategory;
    protectedDomain?: ElevatedProtectedDomain;
    filesAffected: string[];
    configDiff?: string;
    autonomousExecutionAllowed: boolean;
    requiresElevationApproval: boolean;
    elevationApprovedBy?: string;
    elevationApprovedAt?: number;
  };
  tests: {
    unitPassed: number;
    unitTotal: number;
    integrationPassed: number;
    integrationTotal: number;
    regressionPassed: number;
    regressionTotal: number;
    assertions: string[];
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
  };
  securityResult: {
    passed: boolean;
    checksPassed: string[];
    violations: string[];
    authBoundaryIntact: boolean;
    riskBoundaryIntact: boolean;
    elevationRequired: boolean;
    status: 'PASSED' | 'BLOCKED_CRITICAL' | 'ELEVATION_REQUIRED';
    auditTimestamp: number;
  };
  performanceResult: {
    lcpDeltaMs: number;
    bundleDeltaKb: number;
    executionLatencyDeltaMs: number;
    memoryDeltaMb: number;
    passed: boolean;
  };
  releaseStatus:
    | 'PLANNED'
    | 'SANDBOX'
    | 'CANARY_10'
    | 'CANARY_50'
    | 'RELEASED'
    | 'ROLLED_BACK'
    | 'REJECTED';
  rollbackStatus: {
    isRolledBack: boolean;
    rollbackTimestamp?: number;
    rollbackReason?: string;
    rollbackAuthor?: string;
    rollbackSnapshotId?: string;
  };
  userImpact: {
    metricDeltas: Record<string, string>;
    adoptionRate: string;
    errorRateDelta: string;
    frictionScoreReduction: string;
  };
  lessonsLearned: {
    postMortemInsights: string[];
    modelMemoryFeedback: string;
    preventionRules: string[];
  };
}

export interface DimensionMetricSnapshot {
  dimension: ObservationDimension;
  name: string;
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OPTIMAL';
  currentValue: string;
  targetValue: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  anomalyCount: number;
  lastUpdated: number;
  sampleEvidence: string;
}

export interface TelemetrySignal {
  userId: string;
  dimension?: ObservationDimension;
  signalType:
    | 'TOOL_SWITCH'
    | 'CALCULATION_PERFORMED'
    | 'ORDER_PREPARED'
    | 'WORKFLOW_ABANDONED'
    | 'REPEATED_CORRECTION'
    | 'SLIPPAGE_DETECTED'
    | 'POST_LOSS_RAPID_ENTRY'
    | 'PSYCHOLOGY_CHECKIN'
    | 'TIME_IN_TOOL'
    | 'RUNTIME_ERROR'
    | 'LATENCY_SPIKE'
    | 'AUTH_ANOMALY'
    | 'DATA_VALIDATION_FAILURE';
  workflow: string;
  context?: Record<string, any>;
  durationMs?: number;
  timestamp: number;
}

export interface UserNeed {
  id: string;
  type:
    | 'MISSING_WORKFLOW'
    | 'COGNITIVE_FRICTION'
    | 'PSYCHOLOGICAL_DRIFT'
    | 'RISK_BLINDSPOT'
    | 'EDUCATIONAL_GAP';
  title: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  detectionSource: string;
  description: string;
  affectedUsersCount: number;
  recommendedAction: string;
  detectedAt: number;
  // Explicit Explainability Manifest
  whyThisChange: string;
  evidence: string[];
  expectedBenefit: string;
  risk: string;
  requiredImplementation: string;
  testPlan: string;
  successMetric: string;
}

export interface OpportunityItem {
  id: string;
  category:
    | 'PSYCHOLOGICAL_INTERVENTION'
    | 'RISK_MANAGEMENT'
    | 'EDUCATIONAL_DRILL'
    | 'UI_UX_OPTIMIZATION'
    | 'ANALYTICS_ENHANCEMENT';
  title: string;
  score: number; // 0 - 100 Normalized Opportunity Score
  priority: OpportunityPriority;
  components: {
    userImpact: number; // 1 - 5
    frequency: number; // 1 - 5
    severity: number; // 1 - 5
    confidence: number; // 0.0 - 1.0
    strategicValue: number; // 1 - 5
  };
  expectedDisciplineGain: string;
  rationale: string;
}

export interface FeatureProposal {
  id: string;
  title: string;
  category: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  status:
    | 'PENDING'
    | 'IN_SANDBOX'
    | 'VERIFIED_IN_SANDBOX'
    | 'CONSENSUS_APPROVED'
    | 'CANARY_EXPERIMENT'
    | 'DEPLOYED'
    | 'ROLLED_BACK'
    | 'REJECTED';
  summary: string;
  targetAudience: TraderExperienceLevel[];
  problem: string;
  whoBenefits: string;
  evidence: string;
  currentLimitation: string;
  proposedSolution: string;
  userExperience: string;
  technicalArchitecture: string;
  dataRequirements: string;
  securityRequirements: string;
  privacyRequirements: string;
  dependencies: string[];
  potentialRisks: string;
  testingStrategy: string;
  successMetrics: string;
  rollbackStrategy: string;
  confidenceScore: number;
  consensusVotes: {
    totalAgents: number;
    approvals: number;
    rejections: number;
    consensusStatus: string;
    dissentingOpinions?: string[];
  };
  spec?: Record<string, any>;
  createdAt: number;
  deployedAt?: number;
}

export interface SandboxEvaluation {
  id: string;
  proposalId: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED_SECURITY';
  isolationEnforced: boolean;
  compilationResult: {
    success: boolean;
    buildTimeMs: number;
    diagnostics?: string[];
  };
  securityResults: {
    checksPassed: string[];
    violations: string[];
  };
  testResults: {
    passedCount: number;
    testCount: number;
    details: string[];
  };
  generatedFiles: Array<{
    path: string;
    lines: number;
    astHash?: string;
  }>;
}

export interface AgentConsensusLog {
  id: string;
  proposalId: string;
  timestamp: number;
  verdict: 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
  quorum: string;
  agents: Array<{
    name: string;
    role: string;
    vote: 'APPROVE' | 'REJECT' | 'ABSTAIN';
    comment: string;
  }>;
}

export interface TraderExperienceProfile {
  userId: string;
  experienceLevel: TraderExperienceLevel;
  cognitiveLoadScore: number; // 0 - 100
  primaryWorkflows: string[];
  frequentlyUsedFeatures: string[];
  rarelyUsedFeatures: string[];
  frictionPointsDetected: Array<{
    name: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    autoFixAvailable: boolean;
    description?: string;
  }>;
  adaptiveFeaturesActive: Array<{
    name: string;
    status: 'ENABLED' | 'STANDBY';
  }>;
  privacyConsent: {
    anonymousTelemetry: boolean;
    workflowOptimization: boolean;
    aiCoachingAdaptation: boolean;
  };
  learningProgress: {
    completedDrills: string[];
    recommendedDrills: string[];
    rrComprehensionScore: number;
  };
  updatedAt: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: number;
  action: string;
  actor: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'REVERTED';
}
