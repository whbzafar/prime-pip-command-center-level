/**
 * Verifies a GitHub Actions OIDC token (RS256 JWT signed by token.actions.githubusercontent.com).
 * Lets the hourly SBT job prove it is THIS repository's sbt-levels workflow on the main branch —
 * no shared secret needed. Pull requests from forks cannot obtain such a token.
 */
import crypto from 'crypto';

const ISSUER = 'https://token.actions.githubusercontent.com';
let jwks: { at: number; keys: any[] } | null = null;
async function keys() {
  if (jwks && Date.now() - jwks.at < 3_600_000) return jwks.keys;
  const j = await fetch(`${ISSUER}/.well-known/jwks`, { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
  jwks = { at: Date.now(), keys: j.keys || [] };
  return jwks.keys;
}
const b64 = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export interface OidcExpect { audience: string; repository: string; workflowFile: string; ref: string }
export async function verifyGithubOidc(token: string, want: OidcExpect): Promise<{ ok: true; claims: any } | { ok: false; error: string }> {
  try {
    const [h, p, s] = String(token || '').split('.');
    if (!h || !p || !s) return { ok: false, error: 'malformed token' };
    const header = JSON.parse(b64(h).toString('utf8'));
    const claims = JSON.parse(b64(p).toString('utf8'));
    if (header.alg !== 'RS256') return { ok: false, error: 'bad alg' };
    let jwk = (await keys()).find((k: any) => k.kid === header.kid);
    if (!jwk) { jwks = null; jwk = (await keys()).find((k: any) => k.kid === header.kid); }
    if (!jwk) return { ok: false, error: 'unknown key' };
    const okSig = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), crypto.createPublicKey({ key: jwk, format: 'jwk' }), b64(s));
    if (!okSig) return { ok: false, error: 'bad signature' };
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== ISSUER) return { ok: false, error: 'bad issuer' };
    if (claims.aud !== want.audience) return { ok: false, error: 'bad audience' };
    if (!(claims.exp > now) || (claims.nbf && claims.nbf > now + 60)) return { ok: false, error: 'expired' };
    if (claims.repository !== want.repository) return { ok: false, error: 'wrong repository' };
    if (claims.ref !== want.ref) return { ok: false, error: 'wrong branch' };
    if (!String(claims.workflow_ref || '').startsWith(`${want.repository}/.github/workflows/${want.workflowFile}@`)) return { ok: false, error: 'wrong workflow' };
    if (claims.event_name === 'pull_request' || claims.event_name === 'pull_request_target') return { ok: false, error: 'pull requests not allowed' };
    return { ok: true, claims };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}
