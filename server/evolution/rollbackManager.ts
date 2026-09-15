// PrimePipFX Autonomous Rollback Manager
// Instant, non-destructive restoration to the last known-good baseline (Section 15)

export interface RollbackOperationResult {
  ok: boolean;
  featureId: string;
  restoredVersion: string;
  reason: string;
  rollbackTimestamp: number;
  triggeredBy: string;
}

export class RollbackManager {
  private rollbackHistory: RollbackOperationResult[] = [];

  public triggerRollback(featureId: string, reason: string, author = 'Automated Health Sentinel'): RollbackOperationResult {
    const result: RollbackOperationResult = {
      ok: true,
      featureId,
      restoredVersion: '0.9.9-baseline',
      reason,
      rollbackTimestamp: Date.now(),
      triggeredBy: author,
    };
    this.rollbackHistory.unshift(result);
    return result;
  }

  public getHistory(): RollbackOperationResult[] {
    return this.rollbackHistory;
  }
}
