import type { StoredUser } from './authService.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

export const isSupabaseAuthEnabled = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_SECRET_KEY);

function authHeaders(key = SUPABASE_PUBLISHABLE_KEY) {
  return { apikey: key, 'Content-Type': 'application/json' };
}
function adminHeaders() {
  return { ...authHeaders(SUPABASE_SECRET_KEY), Authorization: `Bearer ${SUPABASE_SECRET_KEY}` };
}
function authEmail(username: string) {
  return `${username.trim().toLowerCase()}@auth.primepipfx.local`;
}
async function supaFetch(path: string, init: RequestInit = {}, admin = false) {
  const key = admin ? SUPABASE_SECRET_KEY : SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error('Supabase Auth is not configured.');
  const headers = { ...(admin ? adminHeaders() : authHeaders()), ...(init.headers || {}) };
  return fetch(`${SUPABASE_URL}${path}`, { ...init, headers });
}
async function readJson(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : null; } catch { return { message: text }; }
}
function profileToStoredUser(row: any): StoredUser {
  return {
    id: row.legacy_user_id, name: row.name || row.username, username: row.username,
    passwordHash: '', salt: '', role: row.role || 'CUSTOMER',
    subscriptionStatus: row.subscription_status || 'DEMO', subscriptionPrice: Number(row.subscription_price ?? 50),
    startDate: row.start_date || new Date().toISOString().slice(0, 10), expiryDate: row.expiry_date || '2099-12-31',
    isLifetime: Boolean(row.is_lifetime), paymentStatus: row.payment_status || 'UNPAID',
    referralCode: row.referral_code || undefined, referredBy: row.referred_by || undefined,
    adminNotes: row.admin_notes || undefined, isDeveloper: Boolean(row.is_developer), phone: row.phone || undefined,
    mustChangePassword: Boolean(row.must_change_password), warningsCount: Number(row.warnings_count || 0),
    hasCompletedOnboarding: Boolean(row.has_completed_onboarding), needsOnboarding: Boolean(row.needs_onboarding),
    showActiveStatus: row.show_active_status !== false, tradingFocus: row.trading_focus || undefined,
    experienceLevel: row.experience_level || undefined, traderStatus: row.trader_status || undefined,
    createdAt: row.created_at || new Date().toISOString(), updatedAt: row.updated_at || new Date().toISOString(),
  };
}
function storedUserToProfile(user: StoredUser, authUserId: string) {
  return {
    auth_user_id: authUserId, legacy_user_id: user.id, username: user.username, name: user.name, role: user.role,
    subscription_status: user.subscriptionStatus, subscription_price: user.subscriptionPrice, start_date: user.startDate,
    expiry_date: user.expiryDate || null, is_lifetime: user.isLifetime, payment_status: user.paymentStatus,
    referral_code: user.referralCode || null, referred_by: user.referredBy || null, admin_notes: user.adminNotes || null,
    is_developer: user.isDeveloper, phone: user.phone || null, must_change_password: Boolean(user.mustChangePassword),
    warnings_count: Number(user.warningsCount || 0), has_completed_onboarding: Boolean(user.hasCompletedOnboarding),
    needs_onboarding: Boolean(user.needsOnboarding), show_active_status: user.showActiveStatus !== false,
    trading_focus: user.tradingFocus || null, experience_level: user.experienceLevel || null,
    trader_status: user.traderStatus || null, updated_at: user.updatedAt,
  };
}
export async function getProfileByUsername(username: string): Promise<StoredUser | null> {
  if (!isSupabaseAuthEnabled) return null;
  const url = new URL(`${SUPABASE_URL}/rest/v1/primepipfx_users`);
  url.searchParams.set('username', `eq.${username.trim().toLowerCase()}`); url.searchParams.set('limit', '1');
  const response = await supaFetch(url.pathname + url.search, {}, true);
  if (!response.ok) return null;
  const rows = await readJson(response);
  return Array.isArray(rows) && rows[0] ? profileToStoredUser(rows[0]) : null;
}
async function upsertProfile(user: StoredUser, authUserId: string) {
  const response = await supaFetch('/rest/v1/primepipfx_users?on_conflict=legacy_user_id', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(storedUserToProfile(user, authUserId)),
  }, true);
  if (!response.ok) throw new Error(`Profile upsert failed (${response.status}).`);
}
async function createOrFindAuthUser(user: StoredUser, password: string): Promise<string> {
  const response = await supaFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: authEmail(user.username), password, email_confirm: true,
      user_metadata: { username: user.username, name: user.name },
      app_metadata: { legacy_user_id: user.id, role: user.role },
    }),
  }, true);
  if (response.ok) { const body = await readJson(response); return body?.user?.id || ''; }
  const body = await readJson(response);
  if (body?.msg === 'A user with this email address has already been registered' || body?.code === 'email_exists') return '';
  throw new Error(body?.message || body?.msg || 'Unable to create Supabase Auth user.');
}
async function signIn(username: string, password: string) {
  const response = await supaFetch('/auth/v1/token?grant_type=password', {
    method: 'POST', body: JSON.stringify({ email: authEmail(username), password }),
  });
  const body = await readJson(response);
  return response.ok ? body : null;
}
export async function authenticatePrimePipfx(username: string, password: string, localUser?: StoredUser | null) {
  if (!isSupabaseAuthEnabled) return null;
  const cleanUsername = username.trim().toLowerCase();
  let profile = await getProfileByUsername(cleanUsername);
  let authUserId = '';
  if (localUser) authUserId = await createOrFindAuthUser(localUser, password);
  const session = await signIn(cleanUsername, password);
  if (!session?.access_token) return null;
  authUserId = session.user?.id || authUserId;
  if (!profile && localUser && authUserId) { await upsertProfile(localUser, authUserId); profile = localUser; }
  if (!profile && authUserId) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/primepipfx_users`);
    url.searchParams.set('auth_user_id', `eq.${authUserId}`); url.searchParams.set('limit', '1');
    const p = await supaFetch(url.pathname + url.search, {}, true);
    const rows = p.ok ? await readJson(p) : [];
    if (Array.isArray(rows) && rows[0]) profile = profileToStoredUser(rows[0]);
  }
  if (!profile) return null;
  return { user: profile, accessToken: session.access_token, refreshToken: session.refresh_token, expiresIn: session.expires_in || 3600 };
}
export async function refreshSupabaseSession(refreshToken: string) {
  if (!isSupabaseAuthEnabled || !refreshToken) return null;
  const response = await supaFetch('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const body = await readJson(response);
  return response.ok && body?.access_token ? body : null;
}
export async function getUserFromSupabaseAccessToken(accessToken: string): Promise<StoredUser | null> {
  if (!isSupabaseAuthEnabled || !accessToken) return null;
  const response = await supaFetch('/auth/v1/user', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return null;
  const authUser = await readJson(response);
  if (!authUser?.id) return null;
  const url = new URL(`${SUPABASE_URL}/rest/v1/primepipfx_users`);
  url.searchParams.set('auth_user_id', `eq.${authUser.id}`); url.searchParams.set('limit', '1');
  const profileResponse = await supaFetch(url.pathname + url.search, {}, true);
  if (!profileResponse.ok) return null;
  const rows = await readJson(profileResponse);
  return Array.isArray(rows) && rows[0] ? profileToStoredUser(rows[0]) : null;
}
export async function syncPrimePipfxUser(user: StoredUser) {
  if (!isSupabaseAuthEnabled) return;
  const lookup = new URL(`${SUPABASE_URL}/rest/v1/primepipfx_users`);
  lookup.searchParams.set('legacy_user_id', `eq.${user.id}`); lookup.searchParams.set('limit', '1');
  const lookupResponse = await supaFetch(lookup.pathname + lookup.search, {}, true);
  const rows = lookupResponse.ok ? await readJson(lookupResponse) : [];
  const authUserId = Array.isArray(rows) && rows[0]?.auth_user_id;
  if (!authUserId) return;
  const url = new URL(`${SUPABASE_URL}/rest/v1/primepipfx_users`);
  url.searchParams.set('legacy_user_id', `eq.${user.id}`);
  const response = await supaFetch(url.pathname + url.search, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(storedUserToProfile(user, authUserId)),
  }, true);
  if (!response.ok) console.warn('[AUTH] Supabase profile sync failed:', response.status);
}

export async function provisionPrimePipfxUser(user: StoredUser, password: string) {
  if (!isSupabaseAuthEnabled || !password) return;
  const authId = await createOrFindAuthUser(user, password);
  if (authId) await upsertProfile(user, authId);
  else {
    const session = await signIn(user.username, password);
    if (session?.user?.id) await upsertProfile(user, session.user.id);
  }
}

export async function provisionBootstrapAdmin(username: string, password: string) {
  if (!isSupabaseAuthEnabled || password.length < 12) return;
  const user: StoredUser = {
    id: 'dev-owner-master', name: 'PrimePipFX Developer / Owner', username: username.toLowerCase(),
    passwordHash: '', salt: '', role: 'ADMIN', subscriptionStatus: 'LIFETIME', subscriptionPrice: 0,
    startDate: new Date().toISOString().slice(0,10), expiryDate: '2099-12-31', isLifetime: true,
    paymentStatus: 'VERIFIED', isDeveloper: true, referralCode: 'PPFX-MASTER',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const authId = await createOrFindAuthUser(user, password);
  if (authId) await upsertProfile(user, authId);
}
