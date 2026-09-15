// PrimePipFX Autonomous Rollout Manager
// Enforces Section 13: Feature Trust Levels (0: OBSERVE, 1: CONTENT, 2: UI/WORKFLOW, 3: SOFTWARE)
// with absolute blocking gates for High-Risk features

import { EvolutionTrustLevel, FeatureProposal } from './evolutionTypes.js';

export interface RolloutEligibility {
  allowed: boolean;
  trustLevel: EvolutionTrustLevel;
  requiredTrustLevel: EvolutionTrustLevel;
  isHighRisk: boolean;
  reason: string;
}

export class RolloutManager {
  private currentTrustLevel: EvolutionTrustLevel = 2; // Default to Level 2: UI/WORKFLOW

  private highRiskCategories = [
    'BROKER_EXECUTION',
    'ORDER_CANCELLATION',
    'ACCOUNT_PERMISSIONS',
    'FINANCIAL_CALCULATION',
    'RISK_LIMITS',
    'AUTHENTICATION',
    'PAYMENTS',
    'PRIVACY_SECURITY',
  ];

  public setTrustLevel(level: EvolutionTrustLevel): void {
    this.currentTrustLevel = level;
  }

  public getTrustLevel(): EvolutionTrustLevel {
    return this.currentTrustLevel;
  }

  public checkEligibility(proposal: FeatureProposal): RolloutEligibility {
    // 1. Detect if High Risk
    const isHighRisk = this.highRiskCategories.some(
      (cat) =>
        proposal.category.toUpperCase().includes(cat) ||
        proposal.title.toUpperCase().includes(cat) ||
        proposal.summary.toUpperCase().includes(cat)
    );

    let requiredTrustLevel: EvolutionTrustLevel = 2;
    if (proposal.category.includes('EDUCATIONAL') || proposal.category.includes('CONTENT')) {
      requiredTrustLevel = 1;
    } else if (proposal.complexity === 'HIGH' || isHighRisk) {
      requiredTrustLevel = 3;
    } else {
      requiredTrustLevel = 2;
    }

    if (isHighRisk) {
      return {
        allowed: false,
        trustLevel: this.currentTrustLevel,
        requiredTrustLevel: 3,
        isHighRisk: true,
        reason:
          'BLOCKED: High-risk financial execution, risk limit, or auth modification requires explicit human administrator verification.',
      };
    }

    const allowed = this.currentTrustLevel >= requiredTrustLevel;

    return {
      allowed,
      trustLevel: this.currentTrustLevel,
      requiredTrustLevel,
      isHighRisk: false,
      reason: allowed
        ? `Permitted under Trust Level ${this.currentTrustLevel}`
        : `Requires Trust Level ${requiredTrustLevel} (Current: ${this.currentTrustLevel})`,
    };
  }
}
