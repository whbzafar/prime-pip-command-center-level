import { describe, expect, it } from 'vitest';
import { verifyGithubOidc } from './githubOidc';
describe('github oidc', () => {
  it('rejects malformed and unsigned tokens', async () => {
    const want = { audience: 'a', repository: 'r', workflowFile: 'w.yml', ref: 'refs/heads/main' };
    expect((await verifyGithubOidc('x', want)).ok).toBe(false);
    const fake = [{ alg: 'none' }, { iss: 'x' }].map((o) => Buffer.from(JSON.stringify(o)).toString('base64url')).join('.') + '.sig';
    expect((await verifyGithubOidc(fake, want)).ok).toBe(false);
  });
});
