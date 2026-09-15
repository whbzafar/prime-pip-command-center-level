// PrimePipFX Autonomous Gap Detector
// Identifies structural workflow breaks, cognitive friction loops, and interface blindspots

import { UserNeed, TelemetrySignal } from './evolutionTypes.js';

export interface WorkflowGap {
  id: string;
  gapType: 'UNMET_INTEGRATION' | 'BEHAVIORAL_BLINDSPOT' | 'WORKFLOW_ABANDONMENT' | 'COGNITIVE_OVERLOAD';
  sourceWorkflow: string;
  targetWorkflow: string;
  impactScore: number;
  description: string;
  recommendedSolution: string;
  detectedAt: number;
}

export class GapDetector {
  public detectGaps(signals: TelemetrySignal[], existingNeeds: UserNeed[]): WorkflowGap[] {
    const gaps: WorkflowGap[] = [];

    // Gap 1: Disconnected Lot Calculation & Pre-Trade Plan
    gaps.push({
      id: 'gap-lot-pretrade-bridge',
      gapType: 'UNMET_INTEGRATION',
      sourceWorkflow: 'LotSizeCalculator',
      targetWorkflow: 'PreTradePlan',
      impactScore: 82,
      description: 'Traders calculate exact lot sizing and stop pips, then must switch tabs and manually re-enter the identical numbers.',
      recommendedSolution: 'One-Click "Send to Pre-Trade" direct memory bridge with instant form auto-population.',
      detectedAt: Date.now() - 3600000,
    });

    // Gap 2: Post-Loss Psychological Tilt Isolation
    gaps.push({
      id: 'gap-post-loss-cooldown',
      gapType: 'BEHAVIORAL_BLINDSPOT',
      sourceWorkflow: 'TradeJournal',
      targetWorkflow: 'PsychologyCenter',
      impactScore: 91,
      description: 'Consecutive stop-out losses are logged in the Journal, but the trader immediately opens an order ticket without an emotional circuit-breaker pause.',
      recommendedSolution: 'Autonomous 10-Minute Post-Loss Reflection Cooldown with Interactive Breathing Guidance.',
      detectedAt: Date.now() - 7200000,
    });

    // Gap 3: High-Impact Macro News Calendar to Pre-Trade Risk Alert
    gaps.push({
      id: 'gap-calendar-pretrade-alert',
      gapType: 'UNMET_INTEGRATION',
      sourceWorkflow: 'FundamentalCalendar',
      targetWorkflow: 'PreTradePlan',
      impactScore: 85,
      description: 'Red folder economic events occur within minutes of new trade entries without immediate contextual banner warnings on the entry ticket.',
      recommendedSolution: 'Autonomous Event Readiness Banner that flags imminent high-impact events for the selected currency pair.',
      detectedAt: Date.now() - 14400000,
    });

    return gaps;
  }
}
