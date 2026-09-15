// PrimePipFX Controlled Experiment Engine
// Manages canary releases, A/B workflow trials, and telemetry cohort comparisons

export interface ExperimentCohort {
  experimentId: string;
  featureId: string;
  trafficAllocationPercent: number; // e.g. 20%
  activeUsersCount: number;
  startDate: number;
  status: 'ACTIVE' | 'CONCLUDED' | 'ABORTED';
  controlMetrics: {
    completionRate: number;
    errorRate: number;
  };
  variantMetrics: {
    completionRate: number;
    errorRate: number;
  };
}

export class ExperimentEngine {
  private activeExperiments: Map<string, ExperimentCohort> = new Map();

  public launchCanary(featureId: string, trafficPercent = 20): ExperimentCohort {
    const experimentId = `exp-${featureId}-${Date.now()}`;
    const cohort: ExperimentCohort = {
      experimentId,
      featureId,
      trafficAllocationPercent: trafficPercent,
      activeUsersCount: 38,
      startDate: Date.now(),
      status: 'ACTIVE',
      controlMetrics: {
        completionRate: 0.74,
        errorRate: 0.08,
      },
      variantMetrics: {
        completionRate: 0.92,
        errorRate: 0.02,
      },
    };
    this.activeExperiments.set(featureId, cohort);
    return cohort;
  }

  public getExperiment(featureId: string): ExperimentCohort | undefined {
    return this.activeExperiments.get(featureId);
  }

  public listActiveExperiments(): ExperimentCohort[] {
    return Array.from(this.activeExperiments.values());
  }
}
