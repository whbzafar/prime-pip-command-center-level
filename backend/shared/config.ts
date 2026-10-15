import dotenv from 'dotenv';
dotenv.config();

/**
 * Validated backend environment configuration.
 * Secrets must only be set via environment variables and GitHub Secrets.
 */
export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
  },
  model: {
    activeVersion: process.env.PRO_FUNDAMENTALS_MODEL_VERSION || 'v0.1-initial',
  },
  collectors: {
    fredApiKey: process.env.FRED_API_KEY || '',
    cftcAppToken: process.env.CFTC_APP_TOKEN || '',
  },
  llm: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    defaultModel: process.env.PRO_FUNDAMENTALS_LLM_MODEL || 'gemini-2.5-flash',
  },
  isProduction: process.env.NODE_ENV === 'production',
};

export function validateBackendConfig(): void {
  const missing: string[] = [];
  if (!config.supabase.url) missing.push('SUPABASE_URL');
  if (!config.supabase.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)');

  if (missing.length > 0) {
    throw new Error(
      `[ProFundamentals:Config] Missing required environment variables: ${missing.join(', ')}.\n` +
      'Please ensure .env or GitHub Secrets provide these keys before running backend jobs.'
    );
  }
}
