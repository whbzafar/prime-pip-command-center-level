export type AssetClass = 'currency' | 'commodity' | 'crypto' | 'index' | 'stock';
export type Horizon = 'short' | 'long';
export type IndicatorFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'event';
export type IndicatorPolarity = 'higher_bullish' | 'higher_bearish' | 'contrarian_extreme' | 'neutral_context';
export type ImpactLevel = 'low' | 'medium' | 'high';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type JobStatus = 'success' | 'partial' | 'failed';
export type QualityFlagType = 'stale' | 'out_of_range' | 'missing' | 'suspicious_jump';

export interface DataSourceRecord {
  id: string;
  name: string;
  base_url: string;
  license_note: string;
  commercial_use_ok: boolean;
  rate_limit_note?: string;
  is_active: boolean;
}

export interface AssetRecord {
  id: string;
  asset_class: AssetClass;
  symbol: string;
  name: string;
  metadata: Record<string, any>;
  is_active: boolean;
}

export interface PillarRecord {
  id: string;
  asset_class: AssetClass;
  code: string;
  name: string;
  description: string;
  sort_order: number;
}

export interface PillarWeightRecord {
  id: string;
  model_version_id: string;
  asset_class: AssetClass;
  pillar_id: string;
  horizon: Horizon;
  weight: number;
}

export interface IndicatorRecord {
  id: string;
  asset_id: string;
  pillar_id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  frequency: IndicatorFrequency;
  polarity: IndicatorPolarity;
  source_id: string;
  source_series_id: string;
  normalization_window_years: number;
  weight_in_pillar: number;
  is_active: boolean;
}

export interface ObservationRecord {
  id?: string;
  indicator_id: string;
  period_date: string; // YYYY-MM-DD
  value: number;
  released_at: string; // ISO 8601
  ingested_at?: string;
  is_revision?: boolean;
}

export interface EconomicEventRecord {
  id?: string;
  asset_id?: string | null;
  name: string;
  scheduled_at: string;
  impact: ImpactLevel;
  previous_value?: number | null;
  forecast_value?: number | null;
  actual_value?: number | null;
  source_id?: string | null;
}

export interface IndicatorScoreRecord {
  id?: string;
  indicator_id: string;
  computed_at: string;
  model_version_id: string;
  raw_value: number;
  z_score: number;
  score: number; // -100 to +100
}

export interface PillarScoreRecord {
  id?: string;
  asset_id: string;
  pillar_id: string;
  horizon: Horizon;
  computed_at: string;
  model_version_id: string;
  score: number; // -100 to +100
}

export interface AssetScoreRecord {
  id?: string;
  asset_id: string;
  horizon: Horizon;
  computed_at: string;
  model_version_id: string;
  score: number; // -100 to +100
  confidence: ConfidenceLevel;
  confidence_detail: {
    pillar_agreement?: number;
    freshness_ratio?: number;
    regime_stability?: number;
    [key: string]: any;
  };
}

export interface DriverRecord {
  id?: string;
  asset_id: string;
  horizon: Horizon;
  computed_at: string;
  model_version_id: string;
  indicator_id: string;
  pillar_id: string;
  contribution: number;
  rank: number;
  detail_data: Record<string, any>;
}

export interface ExplanationRecord {
  id?: string;
  asset_id: string;
  horizon: Horizon;
  computed_at: string;
  model_version_id: string;
  summary: string;
  invalidation: string[];
  upcoming_events: Array<{ name: string; date: string; impact: string }>;
  llm_model: string;
  input_hash: string;
}

export interface PairExplanationRecord {
  id?: string;
  base_asset_id: string;
  quote_asset_id: string;
  horizon: Horizon;
  computed_at: string;
  model_version_id: string;
  summary: string;
  invalidation: string[];
  upcoming_events: Array<{ name: string; date: string; impact: string }>;
  llm_model: string;
  input_hash: string;
}

export interface IngestionRunRecord {
  id?: string;
  job_name: string;
  started_at: string;
  finished_at?: string;
  status: JobStatus;
  rows_written: number;
  error_message?: string | null;
}

export interface DataQualityFlagRecord {
  id?: string;
  indicator_id: string;
  observation_id?: string | null;
  flag_type: QualityFlagType;
  details: Record<string, any>;
  created_at: string;
  resolved_at?: string | null;
}
