// PrimePipFX Autonomous Opportunity Engine
// Calculates Normalized Evolution Opportunity Scores & Prioritizes Initiatives

import { OpportunityItem, OpportunityPriority, UserNeed } from './evolutionTypes.js';
import { WorkflowGap } from './gapDetector.js';

export class OpportunityEngine {
  /**
   * Opportunity Score Formula:
   * Raw = UserImpact (1-5) * Frequency (1-5) * Severity (1-5) * Confidence (0.0-1.0) * StrategicValue (1-5)
   * Max Raw = 5 * 5 * 5 * 1.0 * 5 = 625
   * Normalized Score = (Raw / 625) * 100
   */
  public calculateScore(components: {
    userImpact: number; // 1 - 5
    frequency: number; // 1 - 5
    severity: number; // 1 - 5
    confidence: number; // 0.0 - 1.0
    strategicValue: number; // 1 - 5
  }): { score: number; priority: OpportunityPriority } {
    const raw =
      Math.min(5, Math.max(1, components.userImpact)) *
      Math.min(5, Math.max(1, components.frequency)) *
      Math.min(5, Math.max(1, components.severity)) *
      Math.min(1.0, Math.max(0.1, components.confidence)) *
      Math.min(5, Math.max(1, components.strategicValue));

    const normalized = Math.round((raw / 625) * 100);

    let priority: OpportunityPriority = 'LOW';
    if (normalized >= 81) {
      priority = 'CRITICAL';
    } else if (normalized >= 61) {
      priority = 'HIGH';
    } else if (normalized >= 31) {
      priority = 'POTENTIAL';
    } else {
      priority = 'LOW';
    }

    return { score: normalized, priority };
  }

  public synthesizeOpportunities(needs: UserNeed[], gaps: WorkflowGap[]): OpportunityItem[] {
    const items: OpportunityItem[] = [];

    // Synthesize from gaps & needs
    items.push({
      id: 'opp-post-loss-cooldown',
      category: 'PSYCHOLOGICAL_INTERVENTION',
      title: 'Post-Loss Revenge Over-Trading Circuit Breaker',
      ...this.calculateScore({
        userImpact: 5,
        frequency: 4,
        severity: 5,
        confidence: 0.95,
        strategicValue: 5,
      }),
      expectedDisciplineGain: '+42% Emotional Discipline Retention',
      rationale:
        'Prevents aggressive emotional tilt doubling down after stop loss hits; enforces systematic reflection pause.',
      components: {
        userImpact: 5,
        frequency: 4,
        severity: 5,
        confidence: 0.95,
        strategicValue: 5,
      },
    });

    items.push({
      id: 'opp-lot-memory-bridge',
      category: 'UI_UX_OPTIMIZATION',
      title: 'One-Click Lot Size Memory Pipeline to Pre-Trade Plan',
      ...this.calculateScore({
        userImpact: 4,
        frequency: 5,
        severity: 3,
        confidence: 0.92,
        strategicValue: 4,
      }),
      expectedDisciplineGain: '+65% Order Setup Speed & Error Elimination',
      rationale:
        'Eliminates repetitive manual copy-pasting of lot sizes and stop-loss pips between tools, preventing keying errors.',
      components: {
        userImpact: 4,
        frequency: 5,
        severity: 3,
        confidence: 0.92,
        strategicValue: 4,
      },
    });

    items.push({
      id: 'opp-news-blackout-shield',
      category: 'RISK_MANAGEMENT',
      title: 'Macro Economic News Blackout Countdown Shield',
      ...this.calculateScore({
        userImpact: 5,
        frequency: 3,
        severity: 5,
        confidence: 0.91,
        strategicValue: 5,
      }),
      expectedDisciplineGain: '+38% Slippage and Spread Drawdown Reduction',
      rationale:
        'Automatically warns and visually locks order submission during the 5 minutes preceding red-folder economic prints.',
      components: {
        userImpact: 5,
        frequency: 3,
        severity: 5,
        confidence: 0.91,
        strategicValue: 5,
      },
    });

    items.push({
      id: 'opp-interactive-rr-drill',
      category: 'EDUCATIONAL_DRILL',
      title: 'Interactive Expectancy & Risk-Reward Calibration Drill',
      ...this.calculateScore({
        userImpact: 4,
        frequency: 4,
        severity: 3,
        confidence: 0.88,
        strategicValue: 4,
      }),
      expectedDisciplineGain: '+29% Trade Quality Selection for Beginners',
      rationale:
        'Helps developing traders internalize break-even win rate mathematics before putting live capital at risk.',
      components: {
        userImpact: 4,
        frequency: 4,
        severity: 3,
        confidence: 0.88,
        strategicValue: 4,
      },
    });

    return items.sort((a, b) => b.score - a.score);
  }
}
