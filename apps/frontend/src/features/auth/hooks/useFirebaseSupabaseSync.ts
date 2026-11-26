import { useState, useEffect, useCallback, useRef } from 'react';
import {
  auth,
  onAuthStateChanged,
  syncUserProfileToFirestore,
  type FirebaseUser
} from '@/lib/firebase';
import { loadStoredData, saveStoredData } from '@/lib/supabase';
import {
  fetchAuthenticatedProfile,
  syncAuthenticatedProfile
} from '@/features/auth/services/authProfileApi';
import { User, UserRole, KycStatus, TrustLevel } from '@/types';
import { DEFAULT_AVATAR_URL, safeMediaSrc } from '@/shared/utils';

export interface SupabaseUserProfile {
  id: string;
  auth_uid: string;
  email: string;
  name: string;
  handle: string;
  avatar_url?: string | null;
  role: UserRole;
  active_roles?: string[];
  location?: string | null;
  phone?: string | null;
  trust_level?: TrustLevel;
  wallet_balance?: number;
  reward_points?: number;
  is_verified?: boolean;
  kyc_status?: KycStatus;
  created_at?: string;
  updated_at?: string;
  vendor_memberships?: Array<{
    id: string;
    store_id?: string;
    role?: string;
    stores?: {
      id: string;
      name: string;
      slug?: string;
      logo_url?: string;
    } | null;
  }>;
  [key: string]: unknown;
}

export interface UseFirebaseSupabaseSyncOptions {
  /**
   * If true, automatically provisions/creates a profile in Supabase
   * if the user is authenticated in Firebase but no profile exists yet.
   * Default: true
   */
  autoCreateMissing?: boolean;
  /**
   * If true, synchronizes the loaded profile to localStorage and dispatches
   * the global 'firebase-supabase-synced' event.
   * Default: true
   */
  autoPersistToStorage?: boolean;
  /**
   * If true, synchronizes profile to Firestore users/{uid} document.
   * Default: true
   */
  autoSyncFirestore?: boolean;
  /**
   * If true and Supabase is configured, listens for PostgreSQL Realtime changes
   * to this user's profile row.
   * Default: true
   */
  enableRealtime?: boolean;
  /**
   * Optional callback triggered on successful profile fetch & sync.
   */
  onSyncSuccess?: (profile: SupabaseUserProfile, firebaseUser: FirebaseUser) => void;
  /**
   * Optional callback triggered on sync error.
   */
  onSyncError?: (error: Error) => void;
}

export interface UseFirebaseSupabaseSyncReturn {
  /** The synchronized profile directly from Supabase PostgreSQL */
  supabaseProfile: SupabaseUserProfile | null;
  /** The active Firebase User */
  firebaseUser: FirebaseUser | null;
  /** Loading flag during auth resolution or database query */
  isLoading: boolean;
  /** True once identity is confirmed and cross-platform profile is active */
  isSynced: boolean;
  /** Error object if database sync failed */
  error: Error | null;
  /** Timestamp of the most recent successful sync */
  lastSyncedAt: Date | null;
  /** Manually trigger a fresh fetch from Supabase */
  refetch: () => Promise<SupabaseUserProfile | null>;
  /** Update profile fields in Supabase and sync across platforms */
  syncProfile: (payload: {
    name?: string;
    handle?: string;
    avatar?: string;
    location?: string;
    phone?: string;
  }) => Promise<SupabaseUserProfile | null>;
}

export const FIREBASE_SUPABASE_SYNC_EVENT = 'firebase-supabase-synced';

// Deduplicate concurrent fetches for the same Firebase UID across multiple hook consumers
const inFlightProfileFetches = new Map<string, Promise<any>>();

const logSyncDebug = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

/**
 * useFirebaseSupabaseSync
 *
 * Custom React hook that listens for Firebase authentication state changes
 * and automatically triggers a fetch for the corresponding user profile
 * from the Supabase database to ensure a seamless cross-platform identity state.
 */
export function useFirebaseSupabaseSync(
  options: UseFirebaseSupabaseSyncOptions = {}
): UseFirebaseSupabaseSyncReturn {
  const {
    autoCreateMissing = true,
    autoPersistToStorage = true,
    autoSyncFirestore = true,
    enableRealtime = true,
    onSyncSuccess,
    onSyncError,
  } = options;

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [supabaseProfile, setSupabaseProfile] = useState<SupabaseUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // References to keep callbacks current without re-triggering effects
  const onSyncSuccessRef = useRef(onSyncSuccess);
  onSyncSuccessRef.current = onSyncSuccess;
  const onSyncErrorRef = useRef(onSyncError);
  onSyncErrorRef.current = onSyncError;

const SUPER_ADMIN_EMAILS = new Set([
  'abs.munna1@gmail.com',
  'superadmin@paikarmart.com',
  'admin@paikarmart.com',
  'root.admin@paikarmart.com'
]);

  /**
   * Reconcile and transform raw backend Supabase data into a typed profile
   */
  const mapRawToSupabaseProfile = useCallback((raw: any, fUser: FirebaseUser): SupabaseUserProfile => {
    const isSuperAdminEmail = Boolean(fUser.email && SUPER_ADMIN_EMAILS.has(fUser.email.toLowerCase()));
    const rawRole = raw?.role as UserRole;
    const resolvedRole: UserRole = isSuperAdminEmail
      ? 'super_admin'
      : (rawRole === 'vendor' || rawRole === 'super_admin' || rawRole === 'admin' || rawRole === 'moderator'
        ? rawRole
        : 'consumer');

    const resolvedName = isSuperAdminEmail && (!raw?.name || raw?.name === 'PaikarMart User')
      ? 'PaikarMart'
      : (raw?.name || fUser.displayName || (isSuperAdminEmail ? 'PaikarMart' : 'PaikarMart User'));

    const resolvedHandle = isSuperAdminEmail && (!raw?.handle || raw?.handle.startsWith('@user_'))
      ? '@paikarmart'
      : (raw?.handle || (fUser.email ? `@${fUser.email.split('@')[0]}` : `@user_${fUser.uid.slice(0, 6)}`));

    return {
      id: raw?.id || fUser.uid,
      auth_uid: raw?.auth_uid || fUser.uid,
      email: raw?.email || fUser.email || '',
      name: resolvedName,
      handle: resolvedHandle,
      avatar_url: raw?.avatar_url || fUser.photoURL || null,
      role: resolvedRole,
      active_roles: Array.isArray(raw?.active_roles)
        ? (isSuperAdminEmail && !raw.active_roles.includes('super_admin') ? ['super_admin', ...raw.active_roles] : raw.active_roles)
        : (isSuperAdminEmail ? ['super_admin', 'admin', 'moderator', 'vendor', 'consumer'] : [resolvedRole]),
      location: raw?.location || 'Dhaka, Bangladesh',
      phone: raw?.phone || fUser.phoneNumber || null,
      trust_level: isSuperAdminEmail ? 5 : (typeof raw?.trust_level === 'number' ? (raw.trust_level as TrustLevel) : 1),
      wallet_balance: typeof raw?.wallet_balance === 'number' ? raw.wallet_balance : (isSuperAdminEmail ? 500000 : 0),
      reward_points: typeof raw?.reward_points === 'number' ? raw.reward_points : (isSuperAdminEmail ? 25000 : 0),
      is_verified: isSuperAdminEmail || (raw?.is_verified ?? Boolean(fUser.emailVerified)),
      kyc_status: isSuperAdminEmail ? 'approved' : ((raw?.kyc_status as KycStatus) || 'none'),
      created_at: raw?.created_at,
      updated_at: raw?.updated_at,
      vendor_memberships: Array.isArray(raw?.vendor_memberships) ? raw.vendor_memberships : [],
    };
  }, []);

  /**
   * Persist the profile across local storage and broadcast to listeners
   */
  const broadcastAndPersistProfile = useCallback(
    (profile: SupabaseUserProfile, fUser: FirebaseUser) => {
      const stored = loadStoredData<Partial<User>>('USER', {});
      const isVendorUser = Boolean(
        profile.role === 'vendor' ||
        stored.isVendor ||
        (Array.isArray(profile.vendor_memberships) && profile.vendor_memberships.length > 0)
      );

      const mergedUser: User = {
        id: fUser.uid,
        name: profile.name,
        email: profile.email || stored.email,
        handle: profile.handle,
        avatar: safeMediaSrc(profile.avatar_url || stored.avatar, DEFAULT_AVATAR_URL),
        role: profile.role,
        isVendor: isVendorUser,
        kycStatus: profile.kyc_status || stored.kycStatus || 'none',
        trustLevel: profile.trust_level ?? stored.trustLevel ?? 1,
        balance: typeof profile.wallet_balance === 'number' ? profile.wallet_balance : 0,
        rewardPoints: typeof profile.reward_points === 'number' ? profile.reward_points : 0,
        location: profile.location || stored.location || 'Dhaka, Bangladesh',
        phone: profile.phone || stored.phone,
        transactions: Array.isArray(stored.transactions) ? stored.transactions : [],
      };

      if (autoPersistToStorage) {
        saveStoredData('USER', mergedUser);
      }

      if (autoSyncFirestore) {
        void syncUserProfileToFirestore({
          id: fUser.uid,
          email: fUser.email || profile.email,
          name: profile.name,
          handle: profile.handle,
          role: profile.role,
          avatar: profile.avatar_url || mergedUser.avatar,
          location: profile.location || mergedUser.location,
          emailVerified: fUser.emailVerified,
        }).catch((fsErr) => {
          console.warn('[useFirebaseSupabaseSync] Firestore mirror sync warning:', fsErr);
        });
      }

      // Dispatch window event for other components and context providers
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(FIREBASE_SUPABASE_SYNC_EVENT, {
            detail: {
              profile,
              user: mergedUser,
              firebaseUser: fUser,
              timestamp: new Date().toISOString(),
            },
          })
        );
      }
    },
    [autoPersistToStorage, autoSyncFirestore]
  );

  /**
   * Fetch user profile from Supabase with fallback strategies and in-flight deduplication
   */
  const fetchProfileFromSupabase = useCallback(
    async (userToFetch: FirebaseUser, forceFresh = false): Promise<SupabaseUserProfile | null> => {
      const uid = userToFetch.uid;
      logSyncDebug('[useFirebaseSupabaseSync:Fetch] Triggering Supabase profile fetch for UID:', uid);

      let fetchError: Error | null = null;

      const executeFetch = async (): Promise<any> => {
        let rawProfile: any = null;
        let confirmedMissing = false;

        // Primary Strategy: Authenticated Backend Proxy using verified Firebase ID token
        try {
          rawProfile = await fetchAuthenticatedProfile();
          if (rawProfile === null) {
            confirmedMissing = true;
          }
          logSyncDebug('[useFirebaseSupabaseSync:Fetch] Profile received from backend proxy.');
        } catch (err: any) {
          console.warn('[useFirebaseSupabaseSync:Fetch] Backend proxy query failed:', err);
          fetchError = err instanceof Error ? err : new Error(String(err));
        }

        // Backend /api/auth/profile is the authoritative bridge to Supabase under Firebase-first auth.
        // Direct client-side PostgREST queries to `profiles` are skipped because RLS enforces auth.uid().

        // Auto-Provision Strategy: Only when a lookup confirmed no profile exists yet in Supabase
        if (!rawProfile && confirmedMissing && autoCreateMissing) {
          try {
            logSyncDebug('[useFirebaseSupabaseSync:Fetch] No Supabase profile found. Auto-provisioning profile...');
            const isSuperAdminEmail = Boolean(userToFetch.email && SUPER_ADMIN_EMAILS.has(userToFetch.email.toLowerCase()));
            const initialName = isSuperAdminEmail ? 'PaikarMart' : (userToFetch.displayName || 'PaikarMart User');
            const initialHandle = isSuperAdminEmail ? '@paikarmart' : (userToFetch.email ? `@${userToFetch.email.split('@')[0]}` : `@user_${uid.slice(0, 6)}`);
            const initialAvatar = userToFetch.photoURL || undefined;

            rawProfile = await syncAuthenticatedProfile({
              name: initialName,
              handle: initialHandle,
              avatar: initialAvatar,
              location: 'Dhaka, Bangladesh',
              phone: userToFetch.phoneNumber || undefined,
            });
            fetchError = null;
            logSyncDebug('[useFirebaseSupabaseSync:Fetch] Auto-provisioned Supabase profile.');
          } catch (provisionErr) {
            console.warn('[useFirebaseSupabaseSync:Fetch] Auto-provisioning notice:', provisionErr);
          }
        }

        return rawProfile;
      };

      let promise = !forceFresh ? inFlightProfileFetches.get(uid) : undefined;
      if (!promise) {
        promise = executeFetch().finally(() => {
          inFlightProfileFetches.delete(uid);
        });
        inFlightProfileFetches.set(uid, promise);
      }

      const rawProfile = await promise;

      if (rawProfile) {
        const mappedProfile = mapRawToSupabaseProfile(rawProfile, userToFetch);
        setSupabaseProfile(mappedProfile);
        setIsSynced(true);
        setError(null);
        setLastSyncedAt(new Date());

        broadcastAndPersistProfile(mappedProfile, userToFetch);
        onSyncSuccessRef.current?.(mappedProfile, userToFetch);
        return mappedProfile;
      }

      if (fetchError) {
        setError(fetchError);
        onSyncErrorRef.current?.(fetchError);
      }
      return null;
    },
    [autoCreateMissing, mapRawToSupabaseProfile, broadcastAndPersistProfile]
  );

  /**
   * Refetch function exposed to callers
   */
  const refetch = useCallback(async (): Promise<SupabaseUserProfile | null> => {
    const currentAuthUser = auth.currentUser || firebaseUser;
    if (!currentAuthUser) {
      logSyncDebug('[useFirebaseSupabaseSync:refetch] No authenticated Firebase user to fetch for.');
      setSupabaseProfile(null);
      setIsSynced(false);
      return null;
    }
    setIsLoading(true);
    try {
      return await fetchProfileFromSupabase(currentAuthUser, true);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser, fetchProfileFromSupabase]);

  /**
   * Profile mutation helper that updates Supabase and cross-syncs
   */
  const syncProfile = useCallback(
    async (payload: {
      name?: string;
      handle?: string;
      avatar?: string;
      location?: string;
      phone?: string;
    }): Promise<SupabaseUserProfile | null> => {
      const currentAuthUser = auth.currentUser || firebaseUser;
      if (!currentAuthUser) {
        throw new Error('Cannot update profile: No active Firebase session.');
      }

      setIsLoading(true);
      setError(null);

      try {
        logSyncDebug('[useFirebaseSupabaseSync:syncProfile] Updating profile...');
        const updatedRaw = await syncAuthenticatedProfile({
          name: payload.name || supabaseProfile?.name || currentAuthUser.displayName || 'PaikarMart User',
          handle: payload.handle || supabaseProfile?.handle,
          avatar: payload.avatar || supabaseProfile?.avatar_url || currentAuthUser.photoURL || undefined,
          location: payload.location || supabaseProfile?.location || 'Dhaka, Bangladesh',
          phone: payload.phone || supabaseProfile?.phone || undefined,
        });

        const mapped = mapRawToSupabaseProfile(updatedRaw, currentAuthUser);
        setSupabaseProfile(mapped);
        setIsSynced(true);
        setLastSyncedAt(new Date());
        broadcastAndPersistProfile(mapped, currentAuthUser);
        onSyncSuccessRef.current?.(mapped, currentAuthUser);
        return mapped;
      } catch (err: any) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        console.error('[useFirebaseSupabaseSync:syncProfile] Profile mutation failed:', errorObj);
        setError(errorObj);
        onSyncErrorRef.current?.(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [firebaseUser, supabaseProfile, mapRawToSupabaseProfile, broadcastAndPersistProfile]
  );

  /**
   * Effect 1: Listen for Firebase Auth state changes
   */
  useEffect(() => {
    logSyncDebug('[useFirebaseSupabaseSync] Initializing onAuthStateChanged listener...');
    setIsLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      logSyncDebug(
        '[useFirebaseSupabaseSync:onAuthStateChanged] Event detected. User UID:',
        user ? user.uid : 'null (Signed out)'
      );

      setFirebaseUser(user);

      if (user) {
        try {
          await fetchProfileFromSupabase(user);
        } catch (err: any) {
          console.error('[useFirebaseSupabaseSync] Profile fetch on auth state change failed:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        // User logged out: Reset Supabase profile and identity state
        setSupabaseProfile(null);
        setIsSynced(false);
        setError(null);
        setIsLoading(false);
      }
    });

    return () => {
      logSyncDebug('[useFirebaseSupabaseSync] Cleaning up onAuthStateChanged listener.');
      unsubscribe();
    };
  }, [fetchProfileFromSupabase]);

  // Supabase client-side Realtime on `profiles` is intentionally omitted because
  // Firebase-first auth does not mint Supabase JWTs for RLS-protected private profile rows.
  void enableRealtime;

  return {
    supabaseProfile,
    firebaseUser,
    isLoading,
    isSynced,
    error,
    lastSyncedAt,
    refetch,
    syncProfile,
  };
}

export default useFirebaseSupabaseSync;
