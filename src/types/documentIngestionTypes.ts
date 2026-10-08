/**
 * PRIME PIP FX COMMAND CENTER — Universal Fundamental Document Ingestion Engine
 * Type Definitions & Contracts
 */

export type DocumentClassification =
  | 'TEXT_PDF'
  | 'SCANNED_PDF'
  | 'MIXED_PDF'
  | 'IMAGE'
  | 'UNSUPPORTED';

export type ExtractionMethod =
  | 'NATIVE_PDF_TEXT'
  | 'NATIVE_PDF_TABLE'
  | 'PAGE_RENDER_OCR'
  | 'IMAGE_VISION_OCR'
  | 'MANUAL_CORRECTION';

export type ConfidenceTier =
  | 'HIGH' // >= 0.95
  | 'REVIEW_RECOMMENDED' // 0.80 - 0.94
  | 'MANUAL_VERIFICATION_REQUIRED'; // < 0.80

export type ExtractionItemStatus =
  | 'VALID'
  | 'WARNING'
  | 'MISSING'
  | 'INVALID'
  | 'MANUALLY_CORRECTED';

export interface CanonicalIndicatorDefinition {
  id: string;
  name: string;
  shortLabel: string;
  asset: string; // e.g. 'USD', 'EUR', 'GOLD', 'US30'
  category: string;
  unit: string;
  frequency: string;
  directionRule: 'HIGHER_IS_BULLISH' | 'HIGHER_IS_BEARISH' | 'RANGE_BOUND';
  aliases: string[];
  expectedMin?: number;
  expectedMax?: number;
}

export interface RawExtractedItem {
  id: string;
  matchedIndicatorId: string;
  canonicalName: string;
  originalName: string;
  asset: string;
  category: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  revisedPrevious: number | null;
  unit: string;
  period: string;
  releaseDate?: string;
  source: string;
  pageNumber: number;
  extractionMethod: ExtractionMethod;
  confidence: number; // 0.00 - 1.00
  confidenceTier: ConfidenceTier;
  status: ExtractionItemStatus;
  validationMessages: string[];
  isManuallyCorrected: boolean;
  rawTextRow?: string;
}

export interface DocumentIngestionSession {
  id: string;
  fileName: string;
  fileSizeText: string;
  mimeType: string;
  classification: DocumentClassification;
  pageCount: number;
  targetAsset: string;
  extractedCount: number;
  totalExpected: number;
  items: RawExtractedItem[];
  missingIndicators: string[];
  validationStatus: 'COMPLETE' | 'PARTIAL' | 'NEEDS_REVIEW' | 'FAILED';
  overallConfidence: number;
  createdAt: string;
  diagnosticLogs: string[];
}
