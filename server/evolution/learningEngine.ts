// PrimePipFX Autonomous Learning Engine
// Synthesizes verified outcomes, feedback, and telemetry to refine future cycles (Section 16 & 21)

import { EvolutionMemory } from './evolutionMemory.js';
import { OutcomeEvaluation } from './evaluationEngine.js';

export class LearningEngine {
  constructor(private memory: EvolutionMemory) {}

  public processEvaluation(evaluation: OutcomeEvaluation, featureName: string): void {
    if (evaluation.verdict === 'IMPROVEMENT_CONFIRMED') {
      this.memory.recordSuccess(`${featureName} (Confirmed +${evaluation.metricsMeasured.adoptionRate} adoption)`);
    } else if (evaluation.verdict === 'DEGRADATION_DETECTED') {
      this.memory.recordRejection(
        featureName,
        `Automated rollback triggered: ${evaluation.metricsMeasured.errorRateChange}`
      );
    }
  }
}
