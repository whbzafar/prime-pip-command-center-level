import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config, validateBackendConfig } from './config.js';
import { logger } from './logger.js';

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client initialized with the SERVICE ROLE key.
 * This client bypasses RLS and is used exclusively by backend scheduled workflows.
 */
export function getDbClient(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  validateBackendConfig();

  try {
    supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    logger.info('[DB] Supabase service-role client initialized successfully.');
    return supabaseAdmin;
  } catch (err: any) {
    logger.error(`[DB] Failed to initialize Supabase client: ${err?.message || err}`);
    throw err;
  }
}
