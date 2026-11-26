import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Client Adapter & Local Storage Bridge
 * Configured for Supabase Free Tier (PostgreSQL + PostgREST)
 * Uses authenticated backend proxies for privileged profile/ledger mutations.
 */

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  return {
    supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://xyzcompany.supabase.co',
    supabaseAnonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'public-anon-key-placeholder',
  };
};

export const isSupabaseConfigured = (): boolean => {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.supabaseUrl && !cfg.supabaseUrl.includes('xyzcompany') && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.includes('placeholder'));
};

const config = getSupabaseConfig();

export const supabase: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

const STORAGE_KEYS = {
  POSTS: 'paikarmart_posts_v1',
  COMMERCE: 'paikarmart_commerce_v1',
  ORDERS: 'paikarmart_orders_v1',
  BOOKINGS: 'paikarmart_bookings_v1',
  VENDOR: 'paikarmart_vendor_v1',
  USER: 'paikarmart_user_v1',
  NOTIFICATIONS: 'paikarmart_notifications_v1',
  ACTIVE_PROFILE_MODE: 'paikarmart_active_profile_mode_v1',
  PAIKARMART_DELEGATES: 'paikarmart_delegates_v1',
  USER_PERSONAL: 'paikarmart_user_personal_v1',
  USER_PAIKARMART_ORG: 'paikarmart_user_paikarmart_org_v1',
} as const;

const LEGACY_STORAGE_KEYS: Partial<Record<keyof typeof STORAGE_KEYS, string>> = {
  POSTS: 'nexsphere_posts_v1',
  COMMERCE: 'nexsphere_commerce_v1',
  ORDERS: 'nexsphere_orders_v1',
  BOOKINGS: 'nexsphere_bookings_v1',
  VENDOR: 'nexsphere_vendor_v1',
  USER: 'nexsphere_user_v1',
};

export const loadStoredData = <T>(key: keyof typeof STORAGE_KEYS, defaultValue: T): T => {
  try {
    const primary = localStorage.getItem(STORAGE_KEYS[key]);
    if (primary) {
      return JSON.parse(primary);
    }
    const legacyKey = LEGACY_STORAGE_KEYS[key];
    if (legacyKey) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        localStorage.setItem(STORAGE_KEYS[key], legacy);
        localStorage.removeItem(legacyKey);
        return JSON.parse(legacy);
      }
    }
  } catch (err) {
    console.warn('Failed to read from localStorage:', err);
  }
  return defaultValue;
};

export const saveStoredData = <T>(key: keyof typeof STORAGE_KEYS, value: T): void => {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch (err) {
    console.warn('Failed to write to localStorage:', err);
  }
};

export const clearStoredData = (key: keyof typeof STORAGE_KEYS): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS[key]);
    const legacyKey = LEGACY_STORAGE_KEYS[key];
    if (legacyKey) {
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // Ignore storage removal errors
  }
};
