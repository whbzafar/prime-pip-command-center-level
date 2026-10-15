/**
 * System Prompts and Guardrails for Macro Explanation Generation.
 *
 * CRITICAL RULE:
 * The LLM may ONLY narrate provided numbers and verified factual data points.
 * NEVER invent facts, statistics, historical dates, or policy actions.
 */

export const EXPLANATION_SYSTEM_PROMPT = `
You are a senior institutional macro research analyst writing crisp, factual executive briefs for institutional FX traders.

STRICT GUARDRAILS:
1. ONLY describe and explain the exact numerical scores, pillar weights, and driver numbers provided in the input payload.
2. DO NOT hallucinate or guess any numbers, interest rate prints, or release dates that are not in the payload.
3. Keep the tone professional, objective, and analytical.
4. The output must strictly follow the requested JSON format.
`.trim();

export interface SingleAssetPromptInput {
  assetSymbol: string;
  assetName: string;
  horizon: 'short' | 'long';
  score: number;
  biasLabel: string;
  confidence: string;
  pillarScores: Array<{ name: string; score: number; weight: number }>;
  topDrivers: Array<{ factor: string; contribution: number; detail: string }>;
  upcomingEvents: Array<{ name: string; date: string; impact: string }>;
}

export function buildAssetExplanationPrompt(input: SingleAssetPromptInput): string {
  return `
Analyze the fundamental outlook for ${input.assetName} (${input.assetSymbol}) on a ${input.horizon} horizon based on the verified quantitative data below:

Overall Score: ${input.score} (${input.biasLabel}, Confidence: ${input.confidence})

Pillars Breakdown:
${input.pillarScores.map((p) => `- ${p.name}: Score ${p.score} (Weight: ${Math.round(p.weight * 100)}%)`).join('\n')}

Key Macro Drivers:
${input.topDrivers.map((d) => `- ${d.factor}: Contribution ${d.contribution > 0 ? `+${d.contribution}` : d.contribution} (${d.detail})`).join('\n')}

Upcoming Calendar Catalysts:
${input.upcomingEvents.map((e) => `- ${e.date}: ${e.name} (Impact: ${e.impact})`).join('\n')}

Respond with a JSON object containing:
{
  "summary": "A 2-3 sentence institutional executive summary explaining why the currency is scored ${input.biasLabel}.",
  "invalidation": ["Specific macro factor 1 that would invalidate this bias", "Specific macro factor 2"],
  "upcomingEvents": [the upcoming events list]
}
`.trim();
}
