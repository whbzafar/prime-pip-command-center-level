/**
 * PRIME PIP FX COMMAND CENTER — Security & Data Governance Audit Logger
 * Immutable audit logging for administrative, data pipeline, and security actions.
 *
 * Rules:
 * - Never store passwords, tokens, or private credentials.
 * - Append-only record keeping.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebaseConfig';
import { AuditLogRecord, AuditResult, UserRole } from '../../types/financialDatabaseTypes';

const IN_MEMORY_AUDIT_LOGS: AuditLogRecord[] = [];

export class AuditLogger {
  /**
   * Logs a security or data action.
   */
  public static async log(entry: {
    userId: string;
    role: UserRole;
    action: AuditLogRecord['action'];
    resource: string;
    resourceId: string;
    result: AuditResult;
    metadata?: Record<string, any>;
  }): Promise<AuditLogRecord> {
    // Sanitize metadata to strip any sensitive key terms
    const sanitizedMeta: Record<string, any> = {};
    if (entry.metadata) {
      for (const [key, value] of Object.entries(entry.metadata)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('apikey') ||
          lowerKey.includes('credential')
        ) {
          sanitizedMeta[key] = '[REDACTED_SENSITIVE_FIELD]';
        } else {
          sanitizedMeta[key] = value;
        }
      }
    }

    const logRecord: AuditLogRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: entry.userId,
      role: entry.role,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      timestamp: new Date().toISOString(),
      result: entry.result,
      metadata: sanitizedMeta,
    };

    // Store in in-memory ring buffer
    IN_MEMORY_AUDIT_LOGS.unshift(logRecord);
    if (IN_MEMORY_AUDIT_LOGS.length > 500) {
      IN_MEMORY_AUDIT_LOGS.pop();
    }

    // Attempt persistent Firestore write
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'auditLogs', logRecord.id), logRecord);
      } catch (err) {
        // Fallback gracefully without breaking operation
        console.warn('[AuditLogger] Could not persist to Firestore auditLogs:', err);
      }
    }

    return logRecord;
  }

  /**
   * Retrieves recent audit logs.
   */
  public static getRecentLogs(limit: number = 50): AuditLogRecord[] {
    return IN_MEMORY_AUDIT_LOGS.slice(0, limit);
  }
}
