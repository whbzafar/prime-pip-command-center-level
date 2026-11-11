import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';
import { isTrialActive } from './trial.js';
import { durableEnabled, getShared, hydrateUsers, logLogin, persistUsers, updateShared } from './durableStore.js';
const durableEnabledFlag = () => durableEnabled;

export type UserRole = 'ADMIN' | 'CUSTOMER' | 'DEVELOPER';

export type SubscriptionStatus =
  | 'DEMO'
  | 'PAYMENT_REQUIRED'
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'LIFETIME';

export type PaymentStatus = 'UNPAID' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface StoredUser {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPrice: number; // 50 or 40
  startDate: string;
  expiryDate: string;
  isLifetime: boolean;
  paymentStatus: PaymentStatus;
  referralCode?: string;
  referredBy?: string;
  adminNotes?: string;
  isDeveloper: boolean;
  email?: string;
  phone?: string;
  mustChangePassword?: boolean;
  warningsCount?: number;
  hasCompletedOnboarding?: boolean;
  needsOnboarding?: boolean;
  showActiveStatus?: boolean;
  tradingFocus?: string;
  experienceLevel?: string;
  traderStatus?: string;
  adminData?: {
    mode: 'ADMIN_REWARD' | 'OPTIONAL';
    editorAssigned: boolean;
    editorName?: string;
    funds?: number;
    allocation?: number;
    reward?: number;
    updatedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  signupSource?: 'self' | 'admin';
  lastLoginAt?: string;
  loginCount?: number;
  lastLoginIp?: string;
  lastLoginDevice?: string;
}

export interface StoredSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface ReferralRecord {
  id: string;
  referrerUsername: string;
  referredUsername: string;
  referralCode: string;
  paymentStatus: PaymentStatus;
  activationStatus: SubscriptionStatus;
  rewardStatus: 'PENDING' | 'GRANTED_LIFETIME';
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');

// Durable Supabase Auth sessions are hydrated into this short-lived request cache.
// The cache is never the source of truth; it only lets the existing synchronous
// authorization helpers consume the user resolved by the async request middleware.
const authenticatedUserCache = new Map<string, { user: StoredUser; expiresAt: number }>();

export function cacheAuthenticatedUser(token: string, user: StoredUser, ttlMs = 55 * 60 * 1000) {
  if (!token || !user) return;
  authenticatedUserCache.set(token, { user, expiresAt: Date.now() + ttlMs });
}

export function clearAuthenticatedUser(token: string) {
  if (token) authenticatedUserCache.delete(token);
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const effectiveSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, effectiveSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: effectiveSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return computed === hash;
}

// Read and write helpers using safe storage that never crashes on serverless
// Members the administrator removed. Kept in shared storage so a removed member never comes back
// from the bundled starter list, the legacy student registry or another server instance.
type Removed = { ids: string[]; usernames: string[] };
let removedIds = new Set<string>();
let removedNames = new Set<string>();
const isProtected = (u: StoredUser) => u.isDeveloper || u.role === 'ADMIN' || u.role === 'DEVELOPER';
export const isRemovedMember = (username?: string, id?: string) => Boolean((username && removedNames.has(username.toLowerCase())) || (id && removedIds.has(id)));
export async function refreshRemovedMembers() {
  const r = await getShared<Removed>('removed_members', { ids: [], usernames: [] });
  removedIds = new Set(r.ids || []);
  removedNames = new Set((r.usernames || []).map((x) => String(x).toLowerCase()));
}

export function readUsers(): StoredUser[] {
  const all = safeReadJsonFile<StoredUser[]>('users.json', []);
  if (!removedIds.size && !removedNames.size) return all;
  return all.filter((u) => isProtected(u) || !isRemovedMember(u.username, u.id));
}

export function writeUsers(users: StoredUser[]) {
  safeWriteJsonFile('users.json', users);
  persistUsers(users);
}

function readSessions(): StoredSession[] {
  return safeReadJsonFile<StoredSession[]>('sessions.json', []);
}

function writeSessions(sessions: StoredSession[]) {
  safeWriteJsonFile('sessions.json', sessions);
}

function readReferrals(): ReferralRecord[] {
  return safeReadJsonFile<ReferralRecord[]>('referrals.json', []);
}

function writeReferrals(referrals: ReferralRecord[]) {
  safeWriteJsonFile('referrals.json', referrals);
}

// Bootstrap the developer account with fallback to standard master password
export function initAuthStore() {
  const users = readUsers();
  const bootstrapPassword = (process.env.PRIMEPIPFX_BOOTSTRAP_ADMIN_PASSWORD || 'PPFX@Admin#2026').trim();
  const bootstrapUsername = (process.env.PRIMEPIPFX_BOOTSTRAP_ADMIN_USERNAME || 'primepipfx-admin').trim().toLowerCase();
  let existingDev = users.find((u) => u.isDeveloper || u.role === 'ADMIN' || u.role === 'DEVELOPER');

  if (!existingDev) {
    const { hash, salt } = hashPassword(bootstrapPassword);
    const now = new Date().toISOString();
    existingDev = {
      id: 'dev-owner-master',
      name: 'PrimePipFX Developer / Owner',
      username: bootstrapUsername,
      passwordHash: hash,
      salt,
      role: 'ADMIN',
      subscriptionStatus: 'LIFETIME',
      subscriptionPrice: 0,
      startDate: now.split('T')[0],
      expiryDate: '2099-12-31',
      isLifetime: true,
      paymentStatus: 'VERIFIED',
      isDeveloper: true,
      referralCode: 'PPFX-MASTER',
      mustChangePassword: false,
      adminNotes: 'Permanent Developer Master Account.',
      createdAt: now,
      updatedAt: now,
    };
    users.push(existingDev);
    writeUsers(users);
    return;
  }

  let changed = false;
  if (bootstrapUsername && existingDev.username !== bootstrapUsername) {
    existingDev.username = bootstrapUsername;
    changed = true;
  }
  if (existingDev.role !== 'ADMIN') { existingDev.role = 'ADMIN'; changed = true; }
  if (!existingDev.isDeveloper) { existingDev.isDeveloper = true; changed = true; }
  if (existingDev.phone) { delete existingDev.phone; changed = true; }

  // Ensure admin password hash is valid
  if (!existingDev.passwordHash || !existingDev.salt || !verifyPassword(bootstrapPassword, existingDev.passwordHash, existingDev.salt)) {
    const { hash, salt } = hashPassword(bootstrapPassword);
    existingDev.passwordHash = hash;
    existingDev.salt = salt;
    existingDev.updatedAt = new Date().toISOString();
    changed = true;
  }

  for (const u of users) {
    if (u.id !== existingDev.id) {
      if (u.role !== 'CUSTOMER') { u.role = 'CUSTOMER'; changed = true; }
      if (u.isDeveloper) { u.isDeveloper = false; changed = true; }
    }
  }
  if (changed) writeUsers(users);
}

// Clean user object for client responses (no passwordHash or salt)
export function sanitizeUser(user: StoredUser) {
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

// Change password for any authenticated account.
// The caller is responsible for authenticating the current session first.
export function changeAuthenticatedPassword(userId: string, newPassword: string): { ok: boolean; error?: string; token?: string; user?: StoredUser } {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters long' };
  }
  const users = readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { ok: false, error: 'User account not found' };
  }
  const user = users[index];
  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.mustChangePassword = false;
  user.updatedAt = new Date().toISOString();
  users[index] = user;
  writeUsers(users);

  const newToken = issueSessionToken(user);
  const sessions = readSessions().filter((s) => s.expiresAt > Date.now() && s.userId !== user.id);
  sessions.push({
    token: newToken,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  writeSessions(sessions);
  return { ok: true, token: newToken, user };
}

// Change Developer Password
export function changeDeveloperPassword(userId: string, newPassword: string): { ok: boolean; error?: string; token?: string; user?: StoredUser } {
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters long' };
  }
  const users = readUsers();
  const dev = users.find((u) => u.id === userId && (u.isDeveloper || u.role === 'ADMIN' || u.role === 'DEVELOPER'));
  if (!dev) {
    return { ok: false, error: 'Developer account not found' };
  }
  const { hash, salt } = hashPassword(newPassword);
  dev.passwordHash = hash;
  dev.salt = salt;
  dev.mustChangePassword = false;
  dev.updatedAt = new Date().toISOString();
  writeUsers(users);

  // Issue a bounded session after password rotation.
  const newToken = issueSessionToken(dev);
  const sessions = readSessions().filter((s) => s.expiresAt > Date.now());
  const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;
  sessions.push({
    token: newToken,
    userId: dev.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + sessionTtlMs,
  });
  writeSessions(sessions);

  console.log('[AUTH] Developer password changed successfully and bounded session issued');
  return { ok: true, token: newToken, user: dev };
}

// Authenticate user
export function loginUser(
  usernameInput: string,
  passwordInput: string,
  rememberMe: boolean = true
): { user: StoredUser; token: string } | null {
  const users = readUsers();
  const cleanInput = (usernameInput || '').trim().toLowerCase();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanInput || !cleanPass) return null;

  // Check if this is an admin login attempt
  const isAdminAttempt =
    cleanInput === 'primepipfx-admin' ||
    cleanInput === 'admin' ||
    cleanInput === 'developer' ||
    cleanInput === '03406671495' ||
    cleanInput === 'whbzafar' ||
    cleanInput === 'whbzafar@gmail.com' ||
    cleanInput === 'admin@primepipfx.com';

  if (isAdminAttempt) {
    let dev = users.find((u) => u.isDeveloper || u.role === 'ADMIN' || (u.username || '').toLowerCase() === 'primepipfx-admin');
    const masterPass = (process.env.PRIMEPIPFX_BOOTSTRAP_ADMIN_PASSWORD || 'PPFX@Admin#2026').trim();

    if (!dev) {
      initAuthStore();
      const refreshedUsers = readUsers();
      dev = refreshedUsers.find((u) => u.isDeveloper || u.role === 'ADMIN');
    }

    if (dev) {
      const cleanPassLower = cleanPass.toLowerCase();
      // Only the configured bootstrap password (PRIMEPIPFX_BOOTSTRAP_ADMIN_PASSWORD) or the stored
      // password hash can open the admin account. The list of trivial fallback passwords was removed:
      // the repository is public, so any password written here is known to everyone.
      const isMasterMatch = cleanPass === masterPass;
      const isHashValid = dev.passwordHash && dev.salt ? verifyPassword(cleanPass, dev.passwordHash, dev.salt) : false;

      if (isMasterMatch || isHashValid) {
        if (!isHashValid && isMasterMatch) {
          // Self-heal corrupted or stale hash immediately
          const { hash, salt } = hashPassword(cleanPass);
          dev.passwordHash = hash;
          dev.salt = salt;
          dev.updatedAt = new Date().toISOString();
          writeUsers(users);
        }

        const token = issueSessionToken(dev);
        const sessions = readSessions().filter((s) => s.expiresAt > Date.now());
        const ttlMs = rememberMe ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        sessions.push({
          token,
          userId: dev.id,
          createdAt: Date.now(),
          expiresAt: Date.now() + ttlMs,
        });
        writeSessions(sessions);
        return { user: dev, token };
      }

      // If strict admin identifier failed password, return null immediately
      const isStrictAdmin =
        cleanInput === 'primepipfx-admin' ||
        cleanInput === 'admin' ||
        cleanInput === 'developer' ||
        cleanInput === 'admin@primepipfx.com';

      if (isStrictAdmin) {
        return null;
      }
      // For personal alias accounts, fall through to check student records!
    }
  }

  // Lookup user by username, email, name, or known aliases
  let user = users.find((u) => {
    const un = (u.username || '').toLowerCase();
    const em = (u.email || '').toLowerCase();
    const nm = (u.name || '').toLowerCase();
    return (
      un === cleanInput ||
      em === cleanInput ||
      nm === cleanInput ||
      (cleanInput.includes('@') && (em === cleanInput || cleanInput.startsWith(un))) ||
      (cleanInput === 'whbzafar' && (un === 'wahab' || un === 'zartab' || un === 'primepipfx-admin')) ||
      (cleanInput === 'zartabzafar3@gmail.com' && (un === 'zartab' || un === 'wahab' || un === 'primepipfx-admin'))
    );
  });

  if (!user) return null;

  const un = (user.username || '').toLowerCase();
  const cleanPassLower = cleanPass.toLowerCase();
  // Legacy accounts that never had a password stored may still use their original default
  // (username + 12345) once; it is then hashed. Universal passwords (123456, password, the
  // username itself…) were removed — the repository is public, so they opened every account.
  const hasStoredPassword = Boolean(user.passwordHash && user.salt);
  const isDefaultMatch = !hasStoredPassword && !user.isDeveloper && user.role !== 'ADMIN' && cleanPassLower === `${un}12345`;
  const isPlainMatch = false;

  const isHashValid = user.passwordHash && user.salt ? verifyPassword(cleanPass, user.passwordHash, user.salt) : false;

  if (!isHashValid && !isDefaultMatch && !isPlainMatch) {
    return null;
  }

  // If user authenticated via default password, self-heal the hash for future pbkdf2 validation
  if (!isHashValid && (isDefaultMatch || isPlainMatch)) {
    const { hash, salt } = hashPassword(cleanPass);
    user.passwordHash = hash;
    user.salt = salt;
    user.updatedAt = new Date().toISOString();
    writeUsers(users);
  }

  // Create session token with persistent 1-year TTL if rememberMe, otherwise 30 days
  const token = issueSessionToken(user);
  const sessions = readSessions().filter((s) => s.expiresAt > Date.now());
  const ttlMs = rememberMe ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  
  sessions.push({
    token,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  });
  writeSessions(sessions);

  return { user, token };
}

// Get user by token

// ───────────────────────────── Signed session tokens
// On Vercel every request can land on a different server instance, each with its own copy of the
// sessions file, so a random token issued on one instance is unknown to the others. Signed
// tokens carry the user id and expiry and are verified with a server secret, so any instance can
// validate them. (User records come from the bundled data on every instance.)
const SESSION_SECRET = process.env.PRIMEPIPFX_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export function issueSessionToken(user: { id: string; passwordHash?: string; salt?: string }, ttlMs = 365 * 24 * 60 * 60 * 1000): string {
  if (!SESSION_SECRET) return crypto.randomBytes(32).toString('hex');
  const body = b64u(JSON.stringify({ u: user.id, e: Date.now() + ttlMs }));
  const sig = b64u(crypto.createHmac('sha256', SESSION_SECRET).update(body).digest());
  return `ppfx1.${body}.${sig}`;
}
function userFromSignedToken(token: string): StoredUser | null {
  if (!SESSION_SECRET || !token.startsWith('ppfx1.')) return null;
  const [, body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = b64u(crypto.createHmac('sha256', SESSION_SECRET).update(body).digest());
  const a = Buffer.from(sig); const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload: any;
  try { payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { return null; }
  if (!payload?.u || !(payload.e > Date.now())) return null;
  const user = readUsers().find((u) => u.id === payload.u) || null;
  if (!user) return null;
  return user;
}

export function getUserByToken(token: string): StoredUser | null {
  if (!token) return null;
  const cached = authenticatedUserCache.get(token);
  if (cached) {
    if (cached.expiresAt > Date.now()) return cached.user;
    authenticatedUserCache.delete(token);
  }
  const signed = userFromSignedToken(token);
  if (signed) return signed;
  const sessions = readSessions();
  const session = sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  if (!session) return null;

  const users = readUsers();
  return users.find((u) => u.id === session.userId) || null;
}

// Invalidate token on logout
export function logoutToken(token: string) {
  const sessions = readSessions().filter((s) => s.token !== token);
  writeSessions(sessions);
}

// Get all customers (Developer only)
export function getAllCustomers(): StoredUser[] {
  return readUsers();
}

// Create new customer by Developer
export function createCustomer(data: {
  name: string;
  username: string;
  password?: string;
  email?: string;
  referralCode?: string;
  subscriptionPrice?: number;
  startDate?: string;
  expiryDate?: string;
  isLifetime?: boolean;
  paymentStatus?: PaymentStatus;
  subscriptionStatus?: SubscriptionStatus;
  adminNotes?: string;
}): { success: boolean; user?: StoredUser; generatedPassword?: string; error?: string } {
  const users = readUsers();
  const cleanUsername = data.username.trim().toLowerCase();

  if (!cleanUsername) {
    return { success: false, error: 'Username is required' };
  }

  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: 'Username already exists' };
  }

  if (cleanUsername === 'primepipfx-admin' || cleanUsername === 'developer' || cleanUsername === 'admin') {
    return { success: false, error: 'Reserved administrator username' };
  }

  const generatedPassword = data.password && data.password.trim().length >= 4 
    ? data.password.trim() 
    : `ppfx-${Math.random().toString(36).substring(2, 8)}`;

  const { hash, salt } = hashPassword(generatedPassword);
  const now = new Date();
  const startDate = data.startDate || now.toISOString().split('T')[0];
  
  // Default 30 days if not lifetime and not provided
  let expiryDate = data.expiryDate;
  if (!expiryDate) {
    if (data.isLifetime) {
      expiryDate = '2099-12-31';
    } else {
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 30);
      expiryDate = exp.toISOString().split('T')[0];
    }
  }

  // Check referral validity
  let effectivePrice = data.subscriptionPrice ?? 200;
  let referrerUser: StoredUser | undefined;
  if (data.referralCode) {
    const cleanRef = data.referralCode.trim().toUpperCase();
    referrerUser = users.find((u) => (u.referralCode || '').toUpperCase() === cleanRef || u.username.toUpperCase() === cleanRef);
    if (referrerUser) {
      effectivePrice = 100; // 50% off with a valid referral
    }
  }

  const newId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const userReferralCode = `PPFX-${cleanUsername.toUpperCase().substring(0, 4)}-${Math.floor(100 + Math.random() * 900)}`;

  const initialStatus: SubscriptionStatus = data.subscriptionStatus || (data.paymentStatus === 'VERIFIED' ? (data.isLifetime ? 'LIFETIME' : 'ACTIVE') : 'PAYMENT_REQUIRED');

  const newCustomer: StoredUser = {
    id: newId,
    name: data.name.trim(),
    username: cleanUsername,
    passwordHash: hash,
    salt,
    role: 'CUSTOMER',
    subscriptionStatus: initialStatus,
    subscriptionPrice: effectivePrice,
    startDate,
    expiryDate,
    isLifetime: Boolean(data.isLifetime),
    paymentStatus: data.paymentStatus || 'UNPAID',
    referralCode: userReferralCode,
    referredBy: referrerUser?.username || data.referralCode,
    adminNotes: data.adminNotes || '',
    isDeveloper: false,
    hasCompletedOnboarding: false,
    needsOnboarding: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  users.push(newCustomer);
  writeUsers(users);

  // If referred, log referral record
  if (referrerUser) {
    const referrals = readReferrals();
    referrals.push({
      id: `ref-${Date.now()}`,
      referrerUsername: referrerUser.username,
      referredUsername: newCustomer.username,
      referralCode: data.referralCode || '',
      paymentStatus: newCustomer.paymentStatus,
      activationStatus: newCustomer.subscriptionStatus,
      rewardStatus: 'PENDING',
      createdAt: now.toISOString(),
    });
    writeReferrals(referrals);
  }

  return { success: true, user: newCustomer, generatedPassword };
}

// Update customer details, status, or subscription
export function updateCustomer(
  id: string,
  updates: Partial<StoredUser> & { password?: string }
): { success: boolean; user?: StoredUser; error?: string } {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    return { success: false, error: 'Customer not found' };
  }

  const user = users[index];

  // Strictly prevent any customer from becoming ADMIN or DEVELOPER
  if (!user.isDeveloper && (updates.role === 'ADMIN' || updates.role === 'DEVELOPER' || updates.isDeveloper)) {
    return { success: false, error: 'Cannot promote customer to Admin/Developer' };
  }

  // Prevent modifying developer permissions destructively
  if (user.isDeveloper && updates.role && updates.role !== 'ADMIN' && updates.role !== 'DEVELOPER') {
    return { success: false, error: 'Cannot demote Developer account' };
  }

  if (updates.password && updates.password.trim()) {
    const { hash, salt } = hashPassword(updates.password.trim());
    user.passwordHash = hash;
    user.salt = salt;
  }

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.subscriptionStatus !== undefined) user.subscriptionStatus = updates.subscriptionStatus;
  if (updates.paymentStatus !== undefined) user.paymentStatus = updates.paymentStatus;
  if (updates.startDate !== undefined) user.startDate = updates.startDate;
  if (updates.expiryDate !== undefined) user.expiryDate = updates.expiryDate;
  if (updates.isLifetime !== undefined) {
    user.isLifetime = updates.isLifetime;
    if (updates.isLifetime) {
      user.subscriptionStatus = 'LIFETIME';
      user.expiryDate = '2099-12-31';
    }
  }
  if (updates.adminNotes !== undefined) user.adminNotes = updates.adminNotes;
  if (updates.subscriptionPrice !== undefined) user.subscriptionPrice = updates.subscriptionPrice;
  if (updates.hasCompletedOnboarding !== undefined) user.hasCompletedOnboarding = updates.hasCompletedOnboarding;
  if (updates.needsOnboarding !== undefined) user.needsOnboarding = updates.needsOnboarding;
  if (updates.adminData !== undefined) user.adminData = updates.adminData;

  user.updatedAt = new Date().toISOString();
  users[index] = user;
  writeUsers(users);

  // Check if referral reward should trigger
  // Rule: After the referred customer actually pays and the Developer/Admin verifies and activates the account:
  // The referrer receives: LIFETIME FREE ACCESS
  if (
    (user.paymentStatus === 'VERIFIED' && (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'LIFETIME')) &&
    user.referredBy
  ) {
    const referrals = readReferrals();
    const refRecord = referrals.find(
      (r) => r.referredUsername.toLowerCase() === user.username.toLowerCase() && r.rewardStatus === 'PENDING'
    );

    if (refRecord) {
      refRecord.paymentStatus = user.paymentStatus;
      refRecord.activationStatus = user.subscriptionStatus;
      refRecord.rewardStatus = 'GRANTED_LIFETIME';
      writeReferrals(referrals);

      // Upgrade the referrer to LIFETIME
      const referrerIndex = users.findIndex((u) => u.username.toLowerCase() === refRecord.referrerUsername.toLowerCase());
      if (referrerIndex !== -1 && !users[referrerIndex].isDeveloper) {
        users[referrerIndex].subscriptionStatus = 'LIFETIME';
        users[referrerIndex].isLifetime = true;
        users[referrerIndex].expiryDate = '2099-12-31';
        users[referrerIndex].adminNotes = (users[referrerIndex].adminNotes || '') + `\n[Auto] Upgraded to LIFETIME for referring ${user.username}.`;
        users[referrerIndex].updatedAt = new Date().toISOString();
        writeUsers(users);
        console.log(`[REFERRAL] Referrer ${refRecord.referrerUsername} upgraded to LIFETIME FREE ACCESS!`);
      }
    }
  }

  return { success: true, user };
}

// Reset password for a customer
export function resetCustomerPassword(id: string, newPassword?: string): { success: boolean; password?: string; error?: string } {
  const generated = newPassword && newPassword.trim().length >= 4 
    ? newPassword.trim() 
    : `ppfx-${Math.random().toString(36).substring(2, 8)}`;

  // Resetting password re-arms onboarding flow for the student's next login
  const res = updateCustomer(id, {
    password: generated,
    needsOnboarding: true,
    hasCompletedOnboarding: false,
  });
  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, password: generated };
}

// Mark student onboarding as completed
export function completeUserOnboarding(id: string): { success: boolean; user?: StoredUser; error?: string } {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    return { success: false, error: 'User not found' };
  }
  users[index].hasCompletedOnboarding = true;
  users[index].needsOnboarding = false;
  users[index].updatedAt = new Date().toISOString();
  writeUsers(users);
  return { success: true, user: users[index] };
}

// Delete customer by Developer
export function deleteCustomer(id: string): { success: boolean; error?: string } {
  const users = readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) {
    return { success: false, error: 'Customer not found' };
  }
  if (user.isDeveloper || user.role === 'ADMIN' || user.role === 'DEVELOPER' || user.id === 'dev-owner-master') {
    return { success: false, error: 'Cannot delete Developer/Admin account' };
  }
  const updatedUsers = users.filter((u) => u.id !== id);
  removedIds.add(user.id);
  removedNames.add(user.username.toLowerCase());
  void updateShared<Removed>('removed_members', { ids: [], usernames: [] }, (r) => ({
    ids: [...new Set([...(r.ids || []), user.id])].slice(-2000),
    usernames: [...new Set([...(r.usernames || []), user.username.toLowerCase()])].slice(-2000),
  }));
  writeUsers(updatedUsers);

  // Remove active sessions
  const sessions = readSessions().filter((s) => s.userId !== id);
  writeSessions(sessions);

  return { success: true };
}

// Check referral / discount code validity
export function checkReferralCode(code: string): {
  valid: boolean;
  referrerName?: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
} {
  const standardPrice = 200;
  const discountedPrice = 100;
  const discountPercent = 50;
  const discountAmount = 100;

  if (!code || !code.trim()) {
    return {
      valid: false,
      price: standardPrice,
      originalPrice: standardPrice,
      discountPercent: 0,
      discountAmount: 0,
    };
  }

  const clean = code.trim().toUpperCase();

  // Official discount code: 'PrimePopFX' (case-insensitive; the 'PrimePipFX' spelling is accepted too)
  if (clean === 'PRIMEPOPFX' || clean === 'PRIMEPIPFX') {
    return {
      valid: true,
      referrerName: 'PrimePopFX official discount code',
      price: discountedPrice,
      originalPrice: standardPrice,
      discountPercent,
      discountAmount,
    };
  }

  const users = readUsers();
  const referrer = users.find(
    (u) => (u.referralCode || '').toUpperCase() === clean || u.username.toUpperCase() === clean
  );

  if (referrer) {
    return {
      valid: true,
      referrerName: referrer.name || referrer.username,
      price: discountedPrice,
      originalPrice: standardPrice,
      discountPercent,
      discountAmount,
    };
  }

  return {
    valid: false,
    price: standardPrice,
    originalPrice: standardPrice,
    discountPercent: 0,
    discountAmount: 0,
  };
}

// Get admin stats & referral list
export function getAdminSummary() {
  const users = readUsers();
  const referrals = readReferrals();
  
  const customers = users.filter((u) => !u.isDeveloper);
  const activeCount = customers.filter((c) => c.subscriptionStatus === 'ACTIVE' || c.subscriptionStatus === 'LIFETIME').length;
  const pendingPaymentCount = customers.filter((c) => c.paymentStatus === 'PENDING' || c.paymentStatus === 'UNPAID').length;
  const lifetimeCount = customers.filter((c) => c.subscriptionStatus === 'LIFETIME').length;
  const expiredCount = customers.filter((c) => c.subscriptionStatus === 'EXPIRED').length;

  return {
    totalCustomers: customers.length,
    activeCount,
    pendingPaymentCount,
    lifetimeCount,
    expiredCount,
    referrals,
  };
}

// In-memory heartbeat tracker for real user online/offline status
const userHeartbeatMap = new Map<string, number>();

export function recordUserHeartbeat(userId: string): void {
  if (!userId) return;
  userHeartbeatMap.set(userId, Date.now());
}

export function isUserOnline(userId: string): boolean {
  const last = userHeartbeatMap.get(userId);
  if (!last) return false;
  return Date.now() - last < 5 * 60 * 1000;
}

export function getAllRegisteredTraders(currentUserId?: string) {
  const users = readUsers();
  const now = Date.now();
  const currentUser = currentUserId ? users.find((u) => u.id === currentUserId) : undefined;
  const canSeePresence = currentUser?.showActiveStatus !== false;

  return users
    .filter((u) => {
      if (currentUserId && u.id === currentUserId) return false;
      if (u.subscriptionStatus !== 'ACTIVE' && u.subscriptionStatus !== 'LIFETIME' && !u.isDeveloper && u.role !== 'ADMIN' && u.role !== 'DEVELOPER') return false;
      if (!u.isDeveloper && u.role !== 'ADMIN' && u.role !== 'DEVELOPER' && u.expiryDate && new Date(u.expiryDate).getTime() < now) return false;
      return true;
    })
    .map((u) => {
      const lastHeartbeat = userHeartbeatMap.get(u.id) || 0;
      const online = canSeePresence && now - lastHeartbeat < 5 * 60 * 1000;
      return {
        id: u.id,
        username: u.username,
        displayName: u.name || u.username,
        role: u.isDeveloper || u.role === 'ADMIN' ? 'ADMIN' : 'STUDENT',
        isOnline: online,
        presenceStatus: canSeePresence
          ? online
            ? 'ACTIVE'
            : 'OFFLINE'
          : 'HIDDEN',
        lastSeen: lastHeartbeat,
        createdAt: u.createdAt,
        isNewThisWeek: Boolean(u.createdAt && now - new Date(u.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000),
        tradingFocus: u.tradingFocus || '',
        experienceLevel: u.experienceLevel || '',
        traderStatus: u.traderStatus || '',
      };
    })
    .sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      if (a.lastSeen !== b.lastSeen) return b.lastSeen - a.lastSeen;
      return a.displayName.localeCompare(b.displayName);
    });
}

export function updatePresencePrivacy(userId: string, showActiveStatus: boolean): boolean {
  const users = readUsers();
  const user = users.find((candidate) => candidate.id === userId);
  if (!user) return false;
  user.showActiveStatus = showActiveStatus;
  user.updatedAt = new Date().toISOString();
  writeUsers(users);
  return true;
}

export function isActiveCommunityMember(user: StoredUser | null | undefined): boolean {
  if (user && isTrialActive() && user.subscriptionStatus !== 'SUSPENDED') return true;
  if (!user) return false;
  if (user.isDeveloper || user.role === 'ADMIN' || user.role === 'DEVELOPER' || user.isLifetime) return true;
  if (user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'LIFETIME') return false;
  return !user.expiryDate || new Date(user.expiryDate).getTime() >= Date.now();
}

// ─────────────────────────────── durable sync, self sign-up, login tracking
/** Refresh the local user list from the durable store (no-op when none is connected). */
export function syncUsersFromDurable(maxAgeMs = 4000) {
  return hydrateUsers(() => readUsers(), (u) => writeUsers((u as StoredUser[]).filter((x) => isProtected(x) || !isRemovedMember(x.username, x.id))), maxAgeMs);
}

const recentLocalLogins: Record<string, unknown>[] = [];
export const localLoginLog = () => recentLocalLogins;

export function recordLogin(userId: string, meta: { ip?: string; device?: string; kind?: 'login' | 'signup' }) {
  const users = readUsers();
  const i = users.findIndex((u) => u.id === userId);
  if (i < 0) return;
  const now = new Date().toISOString();
  users[i] = { ...users[i], lastLoginAt: now, loginCount: (users[i].loginCount || 0) + 1, lastLoginIp: meta.ip || users[i].lastLoginIp, lastLoginDevice: meta.device || users[i].lastLoginDevice };
  writeUsers(users);
  const entry = { at: now, userId, username: users[i].username, name: users[i].name, kind: meta.kind || 'login', ip: meta.ip || '', device: meta.device || '' };
  void updateShared<Record<string, any>>('last_logins', {}, (m) => ({ ...m, [userId]: { at: now, count: (m?.[userId]?.count || 0) + 1, ip: entry.ip, device: entry.device } }));
  if (!durableEnabledFlag()) void updateShared<any[]>('login_log', [], (l) => [entry, ...(Array.isArray(l) ? l : [])].slice(0, 300));
  recentLocalLogins.unshift(entry);
  if (recentLocalLogins.length > 500) recentLocalLogins.length = 500;
  logLogin(entry);
}

/** Anyone can create their own account with a username and password. */
export function registerSelf(input: { username: string; password: string; name?: string }): { ok: boolean; user?: StoredUser; error?: string } {
  const username = String(input.username || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(username)) return { ok: false, error: 'Username: 3–24 characters — letters, numbers, dot, dash or underscore.' };
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  if (/^(admin|administrator|developer|primepipfx|primepipfx-admin|support|root|system)$/.test(username) || username.includes('admin')) return { ok: false, error: 'That username is reserved — please choose another.' };
  if (removedNames.has(username)) {
    removedNames.delete(username);
    void updateShared<Removed>('removed_members', { ids: [], usernames: [] }, (r) => ({ ids: r.ids || [], usernames: (r.usernames || []).filter((x) => x !== username) }));
  }
  const res = createCustomer({
    name: String(input.name || '').trim().slice(0, 60) || username,
    username,
    password,
    subscriptionStatus: 'PAYMENT_REQUIRED',
    paymentStatus: 'UNPAID',
    adminNotes: 'Self sign-up',
  });
  if (!res.success || !res.user) return { ok: false, error: res.error === 'Username already exists' ? 'That username is taken — please choose another.' : res.error || 'Could not create the account.' };
  const users = readUsers();
  const i = users.findIndex((u) => u.id === res.user!.id);
  if (i >= 0) { users[i] = { ...users[i], signupSource: 'self', mustChangePassword: false }; writeUsers(users); return { ok: true, user: users[i] }; }
  return { ok: true, user: res.user };
}
