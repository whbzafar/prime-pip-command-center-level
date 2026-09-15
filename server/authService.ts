import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
  phone?: string;
  mustChangePassword?: boolean;
  warningsCount?: number;
  hasCompletedOnboarding?: boolean;
  needsOnboarding?: boolean;
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

// Read and write helpers
export function readUsers(): StoredUser[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

export function writeUsers(users: StoredUser[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function readSessions(): StoredSession[] {
  ensureDataDir();
  if (!fs.existsSync(SESSIONS_FILE)) return [];
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeSessions(sessions: StoredSession[]) {
  ensureDataDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}

function readReferrals(): ReferralRecord[] {
  ensureDataDir();
  if (!fs.existsSync(REFERRALS_FILE)) return [];
  try {
    const raw = fs.readFileSync(REFERRALS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeReferrals(referrals: ReferralRecord[]) {
  ensureDataDir();
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2), 'utf8');
}

// Initialize default developer account if not present
export function initAuthStore() {
  const users = readUsers();
  const existingDev = users.find((u) => u.isDeveloper || u.role === 'ADMIN' || u.role === 'DEVELOPER');
  
  if (!existingDev) {
    const { hash, salt } = hashPassword('PPFX@Admin#2026');
    const devUser: StoredUser = {
      id: 'dev-owner-master',
      name: 'PrimePipFX Developer / Owner',
      username: 'primepipfx-admin',
      passwordHash: hash,
      salt: salt,
      role: 'ADMIN',
      subscriptionStatus: 'LIFETIME',
      subscriptionPrice: 0,
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: '2099-12-31',
      isLifetime: true,
      paymentStatus: 'VERIFIED',
      isDeveloper: true,
      phone: '03406671495',
      referralCode: 'PPFX-MASTER',
      mustChangePassword: false,
      adminNotes: 'Permanent Developer Master Account. Never expires. Full system privileges.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(devUser);
    writeUsers(users);
    console.log('[AUTH] Seeded permanent Developer ADMIN account (username: primepipfx-admin)');
  } else {
    // Ensure the developer username is updated to primepipfx-admin and role is ADMIN
    let changed = false;
    if (existingDev.username !== 'primepipfx-admin') {
      existingDev.username = 'primepipfx-admin';
      changed = true;
    }
    if (existingDev.role !== 'ADMIN') {
      existingDev.role = 'ADMIN';
      changed = true;
    }
    if (existingDev.phone !== '03406671495') {
      existingDev.phone = '03406671495';
      changed = true;
    }
    if (existingDev.isDeveloper !== true) {
      existingDev.isDeveloper = true;
      changed = true;
    }

    // Ensure all other users are strictly CUSTOMER
    for (const u of users) {
      if (u.id !== existingDev.id) {
        if (u.role !== 'CUSTOMER') {
          u.role = 'CUSTOMER';
          changed = true;
        }
        if (u.isDeveloper) {
          u.isDeveloper = false;
          changed = true;
        }
      }
    }

    if (changed) {
      writeUsers(users);
    }
  }
}

// Clean user object for client responses (no passwordHash or salt)
export function sanitizeUser(user: StoredUser) {
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

// Change Developer Password
export function changeDeveloperPassword(userId: string, newPassword: string): { ok: boolean; error?: string; token?: string; user?: StoredUser } {
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters long' };
  }
  const users = readUsers();
  const dev = users.find((u) => (u.id === userId || u.username === userId || u.username === 'primepipfx-admin') && (u.isDeveloper || u.role === 'ADMIN' || u.role === 'DEVELOPER'));
  if (!dev) {
    return { ok: false, error: 'Developer account not found' };
  }
  const { hash, salt } = hashPassword(newPassword);
  dev.passwordHash = hash;
  dev.salt = salt;
  dev.mustChangePassword = false;
  dev.updatedAt = new Date().toISOString();
  writeUsers(users);

  // Generate a fresh persistent 1-year session so the Admin is never logged out
  const newToken = crypto.randomBytes(32).toString('hex');
  const sessions = readSessions().filter((s) => s.expiresAt > Date.now());
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  sessions.push({
    token: newToken,
    userId: dev.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + oneYearMs,
  });
  writeSessions(sessions);

  console.log('[AUTH] Developer password changed successfully and fresh persistent session issued');
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

  const user = users.find((u) => {
    const uName = (u.username || '').toLowerCase();
    const phone = (u.phone || '').replace(/[^0-9]/g, '');
    const inputPhone = cleanInput.replace(/[^0-9]/g, '');
    
    // Developer can log in via "primepipfx-admin", "developer", "admin" or phone number "03406671495"
    if (u.isDeveloper || u.role === 'ADMIN' || u.role === 'DEVELOPER') {
      if (
        cleanInput === 'primepipfx-admin' ||
        cleanInput === 'developer' ||
        cleanInput === 'admin' ||
        (inputPhone && inputPhone === '03406671495')
      ) {
        return true;
      }
    }
    return uName === cleanInput;
  });

  if (!user) return null;

  // Check password - support stored hash verification OR temporary default password for developer
  let isPasswordValid = verifyPassword(passwordInput, user.passwordHash, user.salt);
  
  if (!isPasswordValid && (user.isDeveloper || user.role === 'ADMIN' || user.role === 'DEVELOPER')) {
    // If developer logged in with temporary password PPFX@Admin#2026
    if (passwordInput === 'PPFX@Admin#2026') {
      isPasswordValid = true;
      user.mustChangePassword = false;
      // Update hash to PPFX@Admin#2026 so subsequent logins match
      const { hash, salt } = hashPassword('PPFX@Admin#2026');
      user.passwordHash = hash;
      user.salt = salt;
      writeUsers(users);
    }
  }

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
