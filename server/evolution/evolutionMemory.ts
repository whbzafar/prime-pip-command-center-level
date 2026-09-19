// PrimePipFX Evolution Memory Bank
// Persistent organizational intelligence repository and audit store (Section 16)

import fs from 'fs';
import path from 'path';
import { EvolutionEvent } from './evolutionTypes.js';

export interface EvolutionMemoryData {
  successfulImprovements: string[];
  failedExperiments: string[];
  rejectedIdeas: Array<{
    ideaTitle: string;
    rejectionReason: string;
    rejectedAt: number;
    requiredEvidenceForReconsideration: string;
  }>;
  commonTraderProblems: string[];
  knownTechnicalLimitations: string[];
  events: EvolutionEvent[];
  lastUpdated: number;
}

import { safeReadJsonFile, safeWriteJsonFile } from '../dataPath.js';

export class EvolutionMemory {
  private memory: EvolutionMemoryData;

  constructor() {
    this.memory = this.loadOrCreateStore();
  }

  private loadOrCreateStore(): EvolutionMemoryData {
    try {
      const parsed = safeReadJsonFile<EvolutionMemoryData | null>('evolution_memory_events.json', null);
      if (parsed && Array.isArray(parsed.events)) {
        return parsed;
      }
    } catch (err) {
      console.warn('[EvolutionMemory] Could not load existing memory file, initializing default seed:', err);
    }

    const defaultStore = this.getSeedStore();
    this.persistToDisk(defaultStore);
    return defaultStore;
  }

  private persistToDisk(store?: EvolutionMemoryData): void {
    try {
      const dataToSave = store || this.memory;
      safeWriteJsonFile('evolution_memory_events.json', dataToSave);
    } catch (err) {
      console.error('[EvolutionMemory] Failed to persist memory to disk:', err);
    }
  }

  private getSeedStore(): EvolutionMemoryData {
    const now = Date.now();
    const oneDay = 86400000;

    const seedEvents: EvolutionEvent[] = [
      {
        id: 'EVO-2026-001',
        timestamp: now - oneDay * 5,
        detectedProblem: 'Pre-Trade Lot Size Calculation Redundancy & Manual Keying Errors',
        evidence: [
          'Observed 27 rapid calculator-to-plan workflow bounces per day',
          '34% of order tickets showed manually mistyped lot sizes requiring cancellation',
          'Average dwell time between calculation and order preparation was 14.8 seconds',
        ],
        severity: 'MEDIUM',
        priority: 'P1',
        dimension: 'WORKFLOW_FRICTION',
        proposedSolution: 'Autonomous One-Click Lot Transfer Pipeline linking LotSizeCalculator directly to PreTradePlan with persistent memory slot',
        implementation: {
          spec: 'Implement shared state memory slot primepipfx_active_lot_bridge and one-click import button',
          changeType: 'SAFE_LOW_RISK',
          category: 'NON_CRITICAL_UX',
          filesAffected: ['src/components/LotSizeCalculator.tsx', 'src/components/PreTradePlan.tsx'],
          configDiff: '+ import { setLotBridge } from "../utils/lotBridge";\n+ <button onClick={() => transferLot(rec)}>TRANSFER TO TICKET</button>',
          autonomousExecutionAllowed: true,
          requiresElevationApproval: false,
        },
        tests: {
          unitPassed: 8,
          unitTotal: 8,
          integrationPassed: 4,
          integrationTotal: 4,
          regressionPassed: 12,
          regressionTotal: 12,
          assertions: [
            'Calculated lot is securely passed without precision loss',
            'Cross-account lot values do not leak into another trader account',
            'Fallback default remains 0.01 lot on empty memory',
          ],
          status: 'PASSED',
        },
        securityResult: {
          passed: true,
          checksPassed: [
            'Zero external network egress calls',
            'No eval or arbitrary code execution',
            'Account isolation preserved via activeAccount.id token tagging',
          ],
          violations: [],
          authBoundaryIntact: true,
          riskBoundaryIntact: true,
          elevationRequired: false,
          status: 'PASSED',
          auditTimestamp: now - oneDay * 5 + 3600000,
        },
        performanceResult: {
          lcpDeltaMs: -12,
          bundleDeltaKb: 1.4,
          executionLatencyDeltaMs: 0.2,
          memoryDeltaMb: 0.1,
          passed: true,
        },
        releaseStatus: 'RELEASED',
        rollbackStatus: {
          isRolledBack: false,
        },
        userImpact: {
          metricDeltas: {
            'Time-to-Execution': '-68% (from 14.8s to 4.7s)',
            'Keying Error Rate': '-92% reduction in miscalculated position tickets',
            'Trader Satisfaction': '+28% positive feedback',
          },
          adoptionRate: '94.2% active traders',
          errorRateDelta: '-92%',
          frictionScoreReduction: '74%',
        },
        lessonsLearned: {
          postMortemInsights: [
            'Direct memory bridge between analytical tools and execution planning yields immediate cognitive relief',
            'Safe low-risk changes with zero financial recalculation can be promoted autonomously with high trader trust',
          ],
          modelMemoryFeedback: 'Recommend linking risk challenge goals to identical execution bridge in future cycles.',
          preventionRules: ['Always provide explicit visual confirmation tag when lot size is imported from bridge.'],
        },
      },
      {
        id: 'EVO-2026-002',
        timestamp: now - oneDay * 3,
        detectedProblem: 'Post-Loss Revenge Over-Trading Loop & Rapid Position Doubling',
        evidence: [
          'Observed 19 occurrences of traders initiating second positions within 3.5 minutes of a stop-loss hit',
          'Average risk per trade jumped from 1.0% to 2.4% on revenge attempts',
          'Drawdown severity tripled on consecutive tilt executions',
        ],
        severity: 'CRITICAL',
        priority: 'P0',
        dimension: 'TRADING_JOURNAL_PATTERNS',
        proposedSolution: 'Post-Loss Cooling Interlock with Autonomous Parasympathetic Breathing Screen & Forced 5-Minute Reflection Gate',
        implementation: {
          spec: 'Detect consecutive stop-loss closures; surface mandatory grounding modal with box-breathing timer before unlocking trade ticket',
          changeType: 'SAFE_LOW_RISK',
          category: 'EDUCATIONAL_CONTENT',
          filesAffected: ['src/components/psychology/PsychologyCenter.tsx', 'src/components/MainDashboard.tsx'],
          configDiff: '+ if (metrics.consecutiveLosses >= 2) promptPostLossResetModal();',
          autonomousExecutionAllowed: true,
          requiresElevationApproval: false,
        },
        tests: {
          unitPassed: 14,
          unitTotal: 14,
          integrationPassed: 6,
          integrationTotal: 6,
          regressionPassed: 18,
          regressionTotal: 18,
          assertions: [
            'Post-loss modal triggers only on realized consecutive losses',
            'Emergency override key remains accessible to user for regulatory freedom',
            'Breathing orb smoothly down-regulates visual frame rate without CPU lockup',
          ],
          status: 'PASSED',
        },
        securityResult: {
          passed: true,
          checksPassed: [
            'No modification of backend risk limits without admin signature',
            'Pure client-side UX grounding pattern',
            'Zero credential or token interception',
          ],
          violations: [],
          authBoundaryIntact: true,
          riskBoundaryIntact: true,
          elevationRequired: false,
          status: 'PASSED',
          auditTimestamp: now - oneDay * 3 + 4200000,
        },
        performanceResult: {
          lcpDeltaMs: 4,
          bundleDeltaKb: 3.2,
          executionLatencyDeltaMs: 0.4,
          memoryDeltaMb: 0.3,
          passed: true,
        },
        releaseStatus: 'RELEASED',
        rollbackStatus: {
          isRolledBack: false,
        },
        userImpact: {
          metricDeltas: {
            'Revenge Trades per Week': '-76% reduction across cohort',
            'Average Loss per Day': '-42% capital saved',
            'Psychological Readiness Score': '+31% post-session recovery',
          },
          adoptionRate: '87.5% active traders',
          errorRateDelta: '-76%',
          frictionScoreReduction: '61%',
        },
        lessonsLearned: {
          postMortemInsights: [
            'Traders actively appreciate mandatory cooling when framed as capital protection rather than restrictive paternalism',
            'Audio binaural tones accelerate parasympathetic calm significantly faster than silent timers',
          ],
          modelMemoryFeedback: 'Incorporate trader self-reported stress tier into breathing cycle duration.',
          preventionRules: ['Do not hard-lock account unless requested in risk rules; maintain trader agency.'],
        },
      },
      {
        id: 'EVO-2026-003',
        timestamp: now - oneDay * 2,
        detectedProblem: 'High-Impact NFP & CPI Macro Announcement Spread Spike Vulnerability',
        evidence: [
          'Detected 14 instances of severe slippage during 13:30 GMT news release windows',
          'Traders reported spread widening from 0.8 pips to 6.2 pips on XAUUSD and EURUSD',
          'Economic Calendar lacked an immediate pre-trade visual indicator badge on active order screens',
        ],
        severity: 'HIGH',
        priority: 'P1',
        dimension: 'WORKFLOW_FRICTION',
        proposedSolution: 'Autonomous Economic News Proximity Shield with Real-Time Event Proximity Badge on Pre-Trade HUD',
        implementation: {
          spec: 'Read active calendar cache; compute time delta to nearest HIGH impact event; display glowing caution badge if < 30 minutes',
          changeType: 'SAFE_LOW_RISK',
          category: 'UI_CONFIGURATION',
          filesAffected: ['src/components/PreTradePlan.tsx', 'src/components/FundamentalCalendar.tsx'],
          configDiff: '+ const highImpactEventNearby = checkUpcomingHighImpactWindow(30);\n+ <NewsSpreadShield active={highImpactEventNearby} />',
          autonomousExecutionAllowed: true,
          requiresElevationApproval: false,
        },
        tests: {
          unitPassed: 10,
          unitTotal: 10,
          integrationPassed: 5,
          integrationTotal: 5,
          regressionPassed: 15,
          regressionTotal: 15,
          assertions: [
            'Accurately calculates time in PKT and GMT without timezone drift',
            'Correctly classifies HIGH impact red folder events vs low impact',
            'Non-intrusive banner does not obstruct order execution confirmation',
          ],
          status: 'PASSED',
        },
        securityResult: {
          passed: true,
          checksPassed: [
            'Cached event data used safely without arbitrary remote script execution',
            'No direct financial calculations modified',
            'Read-only calendar inspection',
          ],
          violations: [],
          authBoundaryIntact: true,
          riskBoundaryIntact: true,
          elevationRequired: false,
          status: 'PASSED',
          auditTimestamp: now - oneDay * 2 + 3000000,
        },
        performanceResult: {
          lcpDeltaMs: 2,
          bundleDeltaKb: 2.1,
          executionLatencyDeltaMs: 0.1,
          memoryDeltaMb: 0.2,
          passed: true,
        },
        releaseStatus: 'CANARY_50',
        rollbackStatus: {
          isRolledBack: false,
        },
        userImpact: {
          metricDeltas: {
            'Slippage Incidents': '-54% in canary cohort',
            'Unplanned News Entries': '-63% reduction',
            'Risk Rule Compliance': '+19% improvement',
          },
          adoptionRate: '50% (Canary phase)',
          errorRateDelta: '-54%',
          frictionScoreReduction: '48%',
        },
        lessonsLearned: {
          postMortemInsights: [
            'Proactive context-sensitive alerts prevent impulsive trades far better than retrospective post-trade reviews',
          ],
          modelMemoryFeedback: 'Expand news proximity alerts to audio notification 5 minutes prior to release.',
          preventionRules: ['Always display currency symbol tag next to affected instrument.'],
        },
      },
      {
        id: 'EVO-2026-004',
        timestamp: now - oneDay * 1,
        detectedProblem: 'Dangerous Automated Martingale Lot Sizing Proposal (Attempted Feature)',
        evidence: [
          'Proposal submitted to double lot sizing after each consecutive loss to recoup drawdown',
          'Mathematical projection proved 100% account blowout probability within 6 losing trades',
        ],
        severity: 'CRITICAL',
        priority: 'P0',
        dimension: 'SECURITY',
        proposedSolution: 'Banned & Blocked permanently under Institutional Risk Preservation Mandate',
        implementation: {
          spec: 'Martingale algorithmic scaling engine proposal',
          changeType: 'ELEVATED_CRITICAL',
          protectedDomain: 'FINANCIAL_CALCULATIONS',
          filesAffected: ['src/utils/calculations.ts'],
          autonomousExecutionAllowed: false,
          requiresElevationApproval: true,
        },
        tests: {
          unitPassed: 0,
          unitTotal: 6,
          integrationPassed: 0,
          integrationTotal: 4,
          regressionPassed: 0,
          regressionTotal: 10,
          assertions: ['Risk limit invariant: Maximum single trade risk must never exceed 5%'],
          status: 'FAILED',
        },
        securityResult: {
          passed: false,
          checksPassed: ['Static scanner executed correctly'],
          violations: [
            'Security violation: Code modifies protected financial calculation & risk limits',
            'Financial invariant breached: Martingale algorithm guarantees eventual ruin',
            'Elevated permission rejected by Autonomous Risk Guardian',
          ],
          authBoundaryIntact: true,
          riskBoundaryIntact: false,
          elevationRequired: true,
          status: 'BLOCKED_CRITICAL',
          auditTimestamp: now - oneDay * 1 + 1000000,
        },
        performanceResult: {
          lcpDeltaMs: 0,
          bundleDeltaKb: 0,
          executionLatencyDeltaMs: 0,
          memoryDeltaMb: 0,
          passed: false,
        },
        releaseStatus: 'REJECTED',
        rollbackStatus: {
          isRolledBack: true,
          rollbackTimestamp: now - oneDay * 1 + 1200000,
          rollbackReason: 'Violates core risk preservation policy. Banned mathematically.',
          rollbackAuthor: 'Autonomous Security & Risk Guardian',
          rollbackSnapshotId: 'snap-rejection-martingale',
        },
        userImpact: {
          metricDeltas: {
            'Account Blowout Prevention': '100% accounts protected from catastrophic ruin',
          },
          adoptionRate: '0% (Blocked)',
          errorRateDelta: 'N/A',
          frictionScoreReduction: '0%',
        },
        lessonsLearned: {
          postMortemInsights: [
            'Autonomous engine must have immutable hardcoded guardrails that reject high-risk financial changes even if suggested in user feedback',
          ],
          modelMemoryFeedback: 'Permanent anti-pattern entry placed into Evolution Memory Bank.',
          preventionRules: [
            'Never allow automatic risk percentage increases after losses under any circumstance',
          ],
        },
      },
      {
        id: 'EVO-2026-005',
        timestamp: now - 3600000 * 4,
        detectedProblem: 'Mobile Dwell Friction & Crowded Typography in Psychology Center Session Runner',
        evidence: [
          'On mobile viewports (< 480px), step buttons wrapped onto 3 lines',
          '12% of mobile traders abandoned 8-step calming sessions at Step 4 due to cramped button spacing',
        ],
        severity: 'LOW',
        priority: 'P2',
        dimension: 'UX',
        proposedSolution: 'Responsive Stepper Navigation with Sticky Bottom Action Bar and Touch-Target Expansion (48px)',
        implementation: {
          spec: 'Implement mobile-first responsive bottom navigation pill bar with 48px minimum touch target and auto-scrolling',
          changeType: 'SAFE_LOW_RISK',
          category: 'UI_CONFIGURATION',
          filesAffected: ['src/components/psychology/CategorySessionsModal.tsx'],
          configDiff: '+ <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur py-3 px-4 flex items-center justify-between">',
          autonomousExecutionAllowed: true,
          requiresElevationApproval: false,
        },
        tests: {
          unitPassed: 6,
          unitTotal: 6,
          integrationPassed: 4,
          integrationTotal: 4,
          regressionPassed: 8,
          regressionTotal: 8,
          assertions: [
            'Touch targets pass WCAG AA minimum 44px (measured at 48px)',
            'Labels fit on a single line without wrapping or ellipsis',
            'Sticky bar adheres smoothly without viewport jitter',
          ],
          status: 'PASSED',
        },
        securityResult: {
          passed: true,
          checksPassed: ['Pure styling & layout refactor', 'No dynamic code execution', 'Zero sensitive scope changes'],
          violations: [],
          authBoundaryIntact: true,
          riskBoundaryIntact: true,
          elevationRequired: false,
          status: 'PASSED',
          auditTimestamp: now - 3600000 * 3,
        },
        performanceResult: {
          lcpDeltaMs: -8,
          bundleDeltaKb: 0.8,
          executionLatencyDeltaMs: 0.1,
          memoryDeltaMb: 0.05,
          passed: true,
        },
        releaseStatus: 'RELEASED',
        rollbackStatus: {
          isRolledBack: false,
        },
        userImpact: {
          metricDeltas: {
            'Mobile Session Completion Rate': '+36% (from 58% to 94%)',
            'Touch Misses / Mis-clicks': '-88% reduction',
            'User UX Rating': '+22% positive',
          },
          adoptionRate: '100% mobile users',
          errorRateDelta: '-88%',
          frictionScoreReduction: '52%',
        },
        lessonsLearned: {
          postMortemInsights: [
            'Psychological calming tools require generous physical negative space and effortless mobile touch ergonomics to be effective during heightened emotional states',
          ],
          modelMemoryFeedback: 'Apply sticky bottom navigation pattern to Pre-Trade Plan on mobile.',
          preventionRules: ['Always test viewport widths at 360px and 390px before deploying UI changes.'],
        },
      },
    ];

    return {
      successfulImprovements: [
        'One-Click Lot Size Memory Bridge (Cycle 41)',
        'Pre-Trade Checklist Hard Stop Invariant (Cycle 39)',
        'High-Impact News Spike Spread Indicator (Cycle 42)',
        'Responsive Calming Stepper Ergonomics (Cycle 43)',
      ],
      failedExperiments: [
        'Auto-Closure on 2% Drawdown (Rolled back due to trader preference for manual stop adjustment)',
      ],
      rejectedIdeas: [
        {
          ideaTitle: 'Automated Martingale Lot Scaling',
          rejectionReason: 'Violates institutional risk preservation mandates. Banned mathematically.',
          rejectedAt: now - oneDay * 7,
          requiredEvidenceForReconsideration: 'None — permanently rejected under financial safety rules.',
        },
        {
          ideaTitle: 'Public Trader PnL Leaderboard with Dollar Amounts',
          rejectionReason: 'Triggers toxic social comparison and encourages over-leveraging.',
          rejectedAt: now - oneDay * 4,
          requiredEvidenceForReconsideration: 'Must be anonymized and measured solely by R-multiple discipline.',
        },
      ],
      commonTraderProblems: [
        'Revenge trading within 5 minutes of stop-loss exit',
        'Over-leveraging on Asian session low-volatility pairs',
        'Manually keying numbers across calculators and order tickets',
        'Trading through high-impact red folder news announcements without spread allowance',
      ],
      knownTechnicalLimitations: [
        'Client dev server runs in sandboxed container on port 3000',
        'Direct broker API execution requires explicit user authorization and cannot be autonomous',
        'Arbitrary remote code execution is strictly prohibited by security policy',
      ],
      events: seedEvents,
      lastUpdated: now,
    };
  }

  public getMemory(): EvolutionMemoryData {
    return this.memory;
  }

  public getEvents(): EvolutionEvent[] {
    return this.memory.events;
  }

  public getEventById(id: string): EvolutionEvent | undefined {
    return this.memory.events.find((e) => e.id === id);
  }

  public addEvent(event: EvolutionEvent): void {
    const existingIndex = this.memory.events.findIndex((e) => e.id === event.id);
    if (existingIndex >= 0) {
      this.memory.events[existingIndex] = event;
    } else {
      this.memory.events.unshift(event);
    }

    if (event.releaseStatus === 'RELEASED') {
      if (!this.memory.successfulImprovements.includes(event.proposedSolution)) {
        this.memory.successfulImprovements.unshift(event.proposedSolution);
      }
    } else if (event.releaseStatus === 'REJECTED') {
      this.recordRejection(event.proposedSolution, event.securityResult.violations.join('; ') || 'Safety rejection');
    }

    this.memory.lastUpdated = Date.now();
    this.persistToDisk();
  }

  public rollbackEvent(
    eventId: string,
    reason: string,
    author: string = 'Admin Operator'
  ): { success: boolean; event?: EvolutionEvent; error?: string } {
    const event = this.memory.events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, error: `Event ${eventId} not found in Evolution Memory.` };
    }

    event.releaseStatus = 'ROLLED_BACK';
    event.rollbackStatus = {
      isRolledBack: true,
      rollbackTimestamp: Date.now(),
      rollbackReason: reason,
      rollbackAuthor: author,
      rollbackSnapshotId: `snap-${eventId}-${Date.now()}`,
    };

    if (!this.memory.failedExperiments.includes(event.proposedSolution)) {
      this.memory.failedExperiments.unshift(`${event.proposedSolution} (Rolled back: ${reason})`);
    }

    this.memory.lastUpdated = Date.now();
    this.persistToDisk();
    return { success: true, event };
  }

  public recordSuccess(improvementName: string): void {
    if (!this.memory.successfulImprovements.includes(improvementName)) {
      this.memory.successfulImprovements.unshift(improvementName);
    }
    this.memory.lastUpdated = Date.now();
    this.persistToDisk();
  }

  public recordRejection(ideaTitle: string, reason: string): void {
    if (!this.memory.rejectedIdeas.some((i) => i.ideaTitle.toLowerCase() === ideaTitle.toLowerCase())) {
      this.memory.rejectedIdeas.unshift({
        ideaTitle,
        rejectionReason: reason,
        rejectedAt: Date.now(),
        requiredEvidenceForReconsideration: 'Empirical quantitative proof of zero capital ruin risk & Admin approval',
      });
    }
    this.memory.lastUpdated = Date.now();
    this.persistToDisk();
  }

  public isPreviouslyRejected(conceptName: string): boolean {
    return this.memory.rejectedIdeas.some((item) =>
      conceptName.toLowerCase().includes(item.ideaTitle.toLowerCase())
    );
  }
}

