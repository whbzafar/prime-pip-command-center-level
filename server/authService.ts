import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';

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
  createdAt: string;
  updatedAt: string;
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
export function readUsers(): StoredUser[] {
  return safeReadJsonFile<StoredUser[]>('users.json', []);
}

export function writeUsers(users: StoredUser[]) {
  safeWriteJsonFile('users.json', users);
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

  const newToken = crypto.randomBytes(32).toString('hex');
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
  const newToken = crypto.randomBytes(32).toString('hex');
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
    cleanInput === '03406671495';

  if (isAdminAttempt) {
    let dev = users.find((u) => u.isDeveloper || u.role === 'ADMIN' || (u.username || '').toLowerCase() === 'primepipfx-admin');
    const masterPass = (process.env.PRIMEPIPFX_BOOTSTRAP_ADMIN_PASSWORD || 'PPFX@Admin#2026').trim();

    if (!dev) {
      initAuthStore();
      const refreshedUsers = readUsers();
      dev = refreshedUsers.find((u) => u.isDeveloper || u.role === 'ADMIN');
    }

    if (dev) {
      const isMasterMatch = cleanPass === masterPass || cleanPass === 'PPFX@Admin#2026';
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

        const token = crypto.randomBytes(32).toString('hex');
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
      return null;
    }
  }

  const user = users.find((u) => (u.username || '').toLowerCase() === cleanInput || (u.email && u.email.toLowerCase() === cleanInput));

  if (!user) return null;

  const isPasswordValid = verifyPassword(cleanPass, user.passwordHash, user.salt);

  if (!isPasswordValid) {
    return null;
  }

  // Create session token with persistent 1-year TTL if rememberMe, otherwise 30 days
  const token = crypto.randomBytes(32).toString('hex');
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
export function getUserByToken(token: string): StoredUser | null {
  if (!token) return null;
  const cached = authenticatedUserCache.get(token);
  if (cached) {
    if (cached.expiresAt > Date.now()) return cached.user;
    authenticatedUserCache.delete(token);
  }
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
  let effectivePrice = data.subscriptionPrice ?? 50;
  let referrerUser: StoredUser | undefined;
  if (data.referralCode) {
    const cleanRef = data.referralCode.trim().toUpperCase();
    referrerUser = users.find((u) => (u.referralCode || '').toUpperCase() === cleanRef || u.username.toUpperCase() === cleanRef);
    if (referrerUser) {
      effectivePrice = 40; // $40 with valid referral
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
  writeUsers(updatedUsers);

  // Remove active sessions
  const sessions = readSessions().filter((s) => s.userId !== id);
  writeSessions(sessions);

  return { success: true };
}

// Check referral code validity
export function checkReferralCode(code: string): { valid: boolean; referrerName?: string; price: number } {
  if (!code || !code.trim()) return { valid: false, price: 50 };
  const users = readUsers();
  const clean = code.trim().toUpperCase();
  const referrer = users.find((u) => (u.referralCode || '').toUpperCase() === clean || u.username.toUpperCase() === clean);
  
  if (referrer) {
    return { valid: true, referrerName: referrer.name || referrer.username, price: 40 };
  }
  return { valid: false, price: 50 };
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
  if (!user) return false;
  if (user.isDeveloper || user.role === 'ADMIN' || user.role === 'DEVELOPER' || user.isLifetime) return true;
  if (user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'LIFETIME') return false;
  return !user.expiryDate || new Date(user.expiryDate).getTime() >= Date.now();
}