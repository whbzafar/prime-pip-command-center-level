import crypto from "crypto";
import { readUsers, writeUsers } from "./authService.js";
import type { StoredUser } from "./authService.js";

const LEGACY_STUDENTS_URL =
  "https://kvdb.io/2ST3F4wjgBy2qEaTquQPuU/primepipfx_students_v1";

let lastSyncAt = 0;
let syncPromise: Promise<number> | null = null;

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return { passwordHash, salt };
}

/**
 * Transitional migration bridge for the legacy Admin-created student registry.
 * It runs server-side only and converts legacy plaintext passwords into hashes
 * in the server auth store. Once all accounts are migrated, the legacy registry
 * can be retired.
 */
export async function syncLegacyStudentsToServer(force = false): Promise<number> {
  if (!force && Date.now() - lastSyncAt < 15000) return 0;
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const response = await fetch(LEGACY_STUDENTS_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`Legacy student registry returned HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload)) return 0;

      const users = readUsers();
      const byUsername = new Map(users.map((u) => [u.username.toLowerCase(), u]));
      let changed = 0;

      for (const legacy of payload) {
        if (!legacy || typeof legacy.username !== "string") continue;
        const username = legacy.username.trim().toLowerCase();
        if (!username || username === "primepipfx-admin" || username === "admin" || username === "developer") continue;

        const password = typeof legacy.password === "string" ? legacy.password :
          typeof legacy.originalPassword === "string" ? legacy.originalPassword : "";
        let user = byUsername.get(username);

        if (!user) {
          if (!password) continue;
          const { passwordHash, salt } = hashPassword(password);
          user = {
            id: typeof legacy.id === "string" && legacy.id ? legacy.id : `cust-legacy-${username}`,
            name: typeof legacy.name === "string" && legacy.name ? legacy.name : username,
            username,
            passwordHash,
            salt,
            role: "CUSTOMER",
            subscriptionStatus: legacy.subscriptionStatus || "ACTIVE",
            subscriptionPrice: Number(legacy.subscriptionPrice ?? 50),
            startDate: legacy.startDate || new Date().toISOString().slice(0,10),
            expiryDate: legacy.expiryDate || "2099-12-31",
            isLifetime: Boolean(legacy.isLifetime),
            paymentStatus: legacy.paymentStatus || "VERIFIED",
            referralCode: legacy.referralCode,
            referredBy: legacy.referredBy,
            adminNotes: legacy.adminNotes,
            isDeveloper: false,
            phone: legacy.phone,
            mustChangePassword: Boolean(legacy.mustChangePassword),
            hasCompletedOnboarding: legacy.hasCompletedOnboarding,
            needsOnboarding: legacy.needsOnboarding,
            showActiveStatus: legacy.showActiveStatus !== false,
            tradingFocus: legacy.tradingFocus,
            experienceLevel: legacy.experienceLevel,
            traderStatus: legacy.traderStatus,
            createdAt: legacy.createdAt || new Date().toISOString(),
            updatedAt: legacy.updatedAt || new Date().toISOString(),
          } as StoredUser;
          users.push(user);
          byUsername.set(username, user);
          changed++;
        } else if (password) {
          let isMatch = false;
          if (user.passwordHash && user.salt) {
            isMatch = crypto.pbkdf2Sync(password, user.salt, 10000, 64, "sha512").toString("hex") === user.passwordHash;
          }
          if (!isMatch) {
            const { passwordHash, salt } = hashPassword(password);
            user.passwordHash = passwordHash;
            user.salt = salt;
            user.updatedAt = new Date().toISOString();
            changed++;
          }
        }
      }

      if (changed) writeUsers(users);
      lastSyncAt = Date.now();
      return changed;
    } catch (error) {
      console.warn("[LEGACY AUTH MIGRATION] sync skipped:", error);
      return 0;
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}
