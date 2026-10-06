/**
 * PRIME PIP FX COMMAND CENTER — High-Performance Firestore Repository
 * Implements optimized queries, pagination, and strict separation between:
 * 1. RAW/OFFICIAL OBSERVATIONS
 * 2. CALCULATED SCORES
 * 3. AI-GENERATED ANALYSIS
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  setDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebaseConfig';
import {
  ObservationRecord,
  EconomicReleaseRecord,
  RevisionRecord,
  ValidationResultRecord,
  MarketScoreRecord,
  CurrencyScoreRecord,
  PairScoreRecord,
  CommodityScoreRecord,
  AiAnalysisRecord,
  AssetRecord,
  IndicatorRecord,
  IndicatorCategory,
  AssetType,
  ValidationStatus,
} from '../../types/financialDatabaseTypes';
import {
  OFFICIAL_ASSETS,
  OFFICIAL_INDICATORS,
  OFFICIAL_CURRENCIES,
  OFFICIAL_DATA_SOURCES,
  OFFICIAL_DATA_PROVIDERS,
} from './initializationService';

export class FinancialDataRepository {
  // ==========================================
  // 1. ASSETS & INDICATORS
  // ==========================================

  public static async getAssets(assetType?: AssetType): Promise<AssetRecord[]> {
    if (!isFirebaseConfigured || !db) {
      return assetType ? OFFICIAL_ASSETS.filter((a) => a.assetType === assetType) : OFFICIAL_ASSETS;
    }
    try {
      const coll = collection(db, 'assets');
      const q = assetType ? query(coll, where('assetType', '==', assetType)) : query(coll);
      const snap = await getDocs(q);
      if (snap.empty) {
        return assetType ? OFFICIAL_ASSETS.filter((a) => a.assetType === assetType) : OFFICIAL_ASSETS;
      }
      return snap.docs.map((d) => d.data() as AssetRecord);
    } catch {
      return assetType ? OFFICIAL_ASSETS.filter((a) => a.assetType === assetType) : OFFICIAL_ASSETS;
    }
  }

  public static async getIndicators(category?: IndicatorCategory): Promise<IndicatorRecord[]> {
    if (!isFirebaseConfigured || !db) {
      return category ? OFFICIAL_INDICATORS.filter((i) => i.category === category) : OFFICIAL_INDICATORS;
    }
    try {
      const coll = collection(db, 'indicators');
      const q = category ? query(coll, where('category', '==', category)) : query(coll);
      const snap = await getDocs(q);
      if (snap.empty) {
        return category ? OFFICIAL_INDICATORS.filter((i) => i.category === category) : OFFICIAL_INDICATORS;
      }
      return snap.docs.map((d) => d.data() as IndicatorRecord);
    } catch {
      return category ? OFFICIAL_INDICATORS.filter((i) => i.category === category) : OFFICIAL_INDICATORS;
    }
  }

  // ==========================================
  // 2. OFFICIAL OBSERVATIONS
  // ==========================================

  public static async getObservations(params?: {
    indicatorId?: string;
    assetId?: string;
    currency?: string;
    validationStatus?: ValidationStatus;
    limitCount?: number;
  }): Promise<ObservationRecord[]> {
    if (!isFirebaseConfigured || !db) {
      return [];
    }
    try {
      const coll = collection(db, 'observations');
      const constraints: any[] = [];
      if (params?.indicatorId) constraints.push(where('indicatorId', '==', params.indicatorId));
      if (params?.currency) constraints.push(where('currency', '==', params.currency));
      if (params?.validationStatus) constraints.push(where('validationStatus', '==', params.validationStatus));
      if (params?.limitCount) constraints.push(firestoreLimit(params.limitCount));

      const q = query(coll, ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as ObservationRecord);
    } catch (err) {
      console.warn('[FinancialDataRepository] Query failed:', err);
      return [];
    }
  }

  public static async getHistoricalObservations(
    indicatorId: string,
    limitCount: number = 24
  ): Promise<ObservationRecord[]> {
    return this.getObservations({ indicatorId, limitCount });
  }

  public static async saveObservation(obs: ObservationRecord): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    await setDoc(doc(db, 'observations', obs.id), obs, { merge: true });
  }

  // ==========================================
  // 3. ECONOMIC RELEASES & REVISIONS
  // ==========================================

  public static async getRevisions(observationId: string): Promise<RevisionRecord[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const q = query(collection(db, 'revisions'), where('observationId', '==', observationId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as RevisionRecord);
    } catch {
      return [];
    }
  }

  public static async saveRevision(rev: RevisionRecord): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    await setDoc(doc(db, 'revisions', rev.id), rev, { merge: true });
  }

  // ==========================================
  // 4. CALCULATED SCORES (SEPARATED FROM RAW DATA)
  // ==========================================

  public static async saveCurrencyScore(score: CurrencyScoreRecord): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    await setDoc(doc(db, 'currencyScores', score.id), score, { merge: true });
  }

  public static async getCurrencyScores(): Promise<CurrencyScoreRecord[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const snap = await getDocs(collection(db, 'currencyScores'));
      return snap.docs.map((d) => d.data() as CurrencyScoreRecord);
    } catch {
      return [];
    }
  }

  // ==========================================
  // 5. AI-GENERATED ANALYSIS (STRICTLY ISOLATED)
  // ==========================================

  public static async saveAiAnalysis(analysis: AiAnalysisRecord): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    await setDoc(doc(db, 'aiAnalysis', analysis.id), analysis, { merge: true });
  }

  public static async getLatestAiAnalysis(targetId: string): Promise<AiAnalysisRecord | null> {
    if (!isFirebaseConfigured || !db) return null;
    try {
      const q = query(collection(db, 'aiAnalysis'), where('targetId', '==', targetId), firestoreLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as AiAnalysisRecord;
    } catch {
      return null;
    }
  }
}
