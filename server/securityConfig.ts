import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

function requireProductionSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length < 32) {
    throw new Error(`Missing or weak ${name}. Set a random secret of at least 32 characters in production.`);
  }
  return value;
}

/**
 * Returns the server-side secret used to derive/validate auth material.
 * Never expose this value to the browser.
 */
export function getAuthSecret(): string {
  const configured = process.env.PRIMEPIPFX_AUTH_SECRET;
  if (configured && configured.trim().length >= 32) return configured;

  if (isProduction) {
    return requireProductionSecret('PRIMEPIPFX_AUTH_SECRET');
  }

  // Development-only fallback. It is intentionally process-local and is never
  // accepted as a production credential.
  return crypto.createHash('sha256').update('primepipfx-dev-auth').digest('hex');
}

export function getSessionTtlMs(rememberMe: boolean): number {
  const configured = Number(process.env.PRIMEPIPFX_SESSION_TTL_SECONDS);
  const defaultSeconds = rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
  const seconds = Number.isFinite(configured) && configured >= 900 ? configured : defaultSeconds;
  return seconds * 1000;
}
