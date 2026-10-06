/**
 * PRIME PIP FX COMMAND CENTER — Data Synchronization Architecture
 * Coordinates multi-provider batch sync jobs, tracks accept/reject rates, and ensures full auditability.
 *
 * Rules:
 * - Must NEVER report SUCCESS if the synchronization failed.
 * - Missing values remain null.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebaseConfig';
import { SyncJobRecord, SyncJobStatus } from '../../types/financialDatabaseTypes';
import { AuditLogger } from './auditService';

const IN_MEMORY_SYNC_JOBS: SyncJobRecord[] = [];

export class DataSyncEngine {
  /**
   * Starts a new synchronization batch tracking record.
   */
  public static async startSyncJob(providerName: string, requestedCount: number = 0): Promise<SyncJobRecord> {
    const job: SyncJobRecord = {
      id: `sync_${providerName.toLowerCase()}_${Date.now()}`,
      provider: providerName,
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: 'RUNNING',
      recordsRequested: requestedCount,
      recordsReceived: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errorCount: 0,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    };

    IN_MEMORY_SYNC_JOBS.unshift(job);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'syncJobs', job.id), job);
      } catch (err) {
        console.warn('[DataSyncEngine] Failed to save running syncJob to Firestore:', err);
      }
    }

    return job;
  }

  /**
   * Concludes a sync job and computes final status.
   * STRICT: Never reports SUCCESS if errors occurred or rejected records > 0!
   */
  public static async finishSyncJob(
    jobId: string,
    stats: {
      recordsReceived: number;
      recordsAccepted: number;
      recordsRejected: number;
      recordsUpdated: number;
      recordsSkipped: number;
      errorCount: number;
      errorMessage?: string | null;
    },
    userId: string = 'system_daemon'
  ): Promise<SyncJobRecord> {
    const completedAt = new Date().toISOString();

    let finalStatus: SyncJobStatus = 'SUCCESS';
    if (stats.errorCount > 0 && stats.recordsAccepted === 0) {
      finalStatus = 'FAILED';
    } else if (stats.errorCount > 0 || stats.recordsRejected > 0) {
      finalStatus = 'PARTIAL_SUCCESS';
    } else if (stats.recordsReceived === 0 && stats.errorMessage) {
      finalStatus = 'FAILED';
    }

    const updatedJob: SyncJobRecord = {
      id: jobId,
      provider: jobId.split('_')[1] || 'UNKNOWN',
      startedAt: IN_MEMORY_SYNC_JOBS.find((j) => j.id === jobId)?.startedAt || completedAt,
      completedAt,
      status: finalStatus,
      recordsRequested: IN_MEMORY_SYNC_JOBS.find((j) => j.id === jobId)?.recordsRequested || stats.recordsReceived,
      recordsReceived: stats.recordsReceived,
      recordsAccepted: stats.recordsAccepted,
      recordsRejected: stats.recordsRejected,
      recordsUpdated: stats.recordsUpdated,
      recordsSkipped: stats.recordsSkipped,
      errorCount: stats.errorCount,
      errorMessage: stats.errorMessage || null,
      createdAt: IN_MEMORY_SYNC_JOBS.find((j) => j.id === jobId)?.createdAt || completedAt,
    };

    // Update in-memory registry
    const idx = IN_MEMORY_SYNC_JOBS.findIndex((j) => j.id === jobId);
    if (idx >= 0) {
      IN_MEMORY_SYNC_JOBS[idx] = updatedJob;
    } else {
      IN_MEMORY_SYNC_JOBS.unshift(updatedJob);
    }

    // Persist to Firestore
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'syncJobs', jobId), updatedJob, { merge: true });
      } catch (err) {
        console.warn('[DataSyncEngine] Failed to persist finished syncJob:', err);
      }
    }

    // Audit log this sync execution
    await AuditLogger.log({
      userId,
      role: 'ADMIN',
      action: 'SYNC_EXECUTION',
      resource: 'syncJobs',
      resourceId: jobId,
      result: finalStatus === 'FAILED' ? 'FAILURE' : 'SUCCESS',
      metadata: {
        provider: updatedJob.provider,
        status: finalStatus,
        recordsAccepted: stats.recordsAccepted,
        recordsRejected: stats.recordsRejected,
        errorCount: stats.errorCount,
      },
    });

    return updatedJob;
  }

  public static getSyncHistory(limit: number = 20): SyncJobRecord[] {
    return IN_MEMORY_SYNC_JOBS.slice(0, limit);
  }
}
