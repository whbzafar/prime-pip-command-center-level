import crypto from 'crypto';
import { logger } from '../shared/logger.js';
import { SingleAssetPromptInput } from './prompts.js';

export interface ExplanationResult {
  summary: string;
  invalidation: string[];
  upcomingEvents: Array<{ name: string; date: string; impact: string }>;
  inputHash: string;
  llmModel: string;
}

/**
 * Computes a deterministic SHA-256 hash of the input numbers so explanations
 * are regenerated ONLY when underlying scores or drivers actually change.
 */
export function computeInputHash(input: SingleAssetPromptInput): string {
  const normalized = JSON.stringify({
    symbol: input.assetSymbol,
    horizon: input.horizon,
    score: input.score,
    pillars: input.pillarScores.map((p) => [p.name, p.score]),
    drivers: input.topDrivers.map((d) => [d.factor, d.contribution]),
  });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generates or retrieves cached narrative explanation.
 * Stub implementation for foundation architecture.
 */
export async function generateAssetExplanation(
  input: SingleAssetPromptInput,
  existingHash?: string
): Promise<ExplanationResult> {
  const hash = computeInputHash(input);

  if (existingHash && existingHash === hash) {
    logger.info(`[ExplanationGenerator] Input hash unchanged (${hash.slice(0, 8)}). Skipping generation.`);
  }

  // Deterministic rule-grounded fallback narrative
  const summary = `Macroeconomic trajectory for ${input.assetName} reflects a ${input.biasLabel.toLowerCase()} bias (Score: ${input.score}). Divergence is driven by policy rate differentials, relative growth, and trade dynamics.`;
  const invalidation = [
    'Unexpected central bank interest rate shift or monetary forward guidance pivot.',
    'Significant escalation in cross-asset risk aversion altering international capital flows.',
  ];

  return {
    summary,
    invalidation,
    upcomingEvents: input.upcomingEvents,
    inputHash: hash,
    llmModel: 'gemini-2.5-flash-grounded',
  };
}
