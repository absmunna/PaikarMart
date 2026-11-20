import { useState, useEffect, useCallback, useRef } from 'react';
import {
  auth,
  onAuthStateChanged,
  syncUserProfileToFirestore,
  type FirebaseUser
} from '@/lib/firebase';
import { supabase, isSupabaseConfigured, loadStoredData, saveStoredData } from '@/lib/supabase';
import {
  fetchAuthenticatedProfile,
  syncAuthenticatedProfile
} from '@/features/auth/services/authProfileApi';
import { User, UserRole, KycStatus, TrustLevel } from '@/types';
import { CURRENT_USER } from '@/data/mockData';

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

  /**
   * Reconcile and transform raw backend Supabase data into a typed profile
   */
  const mapRawToSupabaseProfile = useCallback((raw: any, fUser: FirebaseUser): SupabaseUserProfile => {
    const rawRole = raw?.role as UserRole;
    const resolvedRole: UserRole =
      rawRole === 'vendor' || rawRole === 'super_admin' || rawRole === 'admin' || rawRole === 'moderator'
        ? rawRole
        : 'consumer';

    return {
      id: raw?.id || fUser.uid,
      auth_uid: raw?.auth_uid || fUser.uid,
      email: raw?.email || fUser.email || '',
      name: raw?.name || fUser.displayName || 'PaikarMart User',
      handle: raw?.handle || (fUser.email ? `@${fUser.email.split('@')[0]}` : `@user_${fUser.uid.slice(0, 6)}`),
      avatar_url: raw?.avatar_url || fUser.photoURL || null,
      role: resolvedRole,
      active_roles: Array.isArray(raw?.active_roles) ? raw.active_roles : [resolvedRole],
      location: raw?.location || 'Dhaka, Bangladesh',
      phone: raw?.phone || fUser.phoneNumber || null,
      trust_level: typeof raw?.trust_level === 'number' ? (raw.trust_level as TrustLevel) : 1,
      wallet_balance: typeof raw?.wallet_balance === 'number' ? raw.wallet_balance : 0,
      reward_points: typeof raw?.reward_points === 'number' ? raw.reward_points : 0,
      is_verified: raw?.is_verified ?? Boolean(fUser.emailVerified),
      kyc_status: (raw?.kyc_status as KycStatus) || 'none',
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
      const stored = loadStoredData<User>('USER', CURRENT_USER);
      const isVendorUser = Boolean(
        profile.role === 'vendor' ||
        stored.isVendor ||
        (Array.isArray(profile.vendor_memberships) && profile.vendor_memberships.length > 0)
      );

      const mergedUser: User = {
        ...stored,
        id: fUser.uid,
        name: profile.name,
        email: profile.email || stored.email,
        handle: profile.handle,
        avatar: profile.avatar_url || stored.avatar,
        role: profile.role,
        isVendor: isVendorUser,
        kycStatus: profile.kyc_status || stored.kycStatus,
        trustLevel: profile.trust_level ?? stored.trustLevel,
        balance: profile.wallet_balance ?? stored.balance ?? 0,
        rewardPoints: profile.reward_points ?? stored.rewardPoints ?? 0,
        location: profile.location || stored.location || 'Dhaka, Bangladesh',
        phone: profile.phone || stored.phone,
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
      console.log('[useFirebaseSupabaseSync:Fetch] Triggering Supabase profile fetch for UID:', uid);

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
          console.log('[useFirebaseSupabaseSync:Fetch] Profile received from backend proxy:', rawProfile);
        } catch (err: any) {
          console.warn('[useFirebaseSupabaseSync:Fetch] Backend proxy query failed:', err);
          fetchError = err instanceof Error ? err : new Error(String(err));
        }

        // Secondary Strategy: Direct Supabase Client Query if backend didn't return data & Supabase is configured
        if (!rawProfile && isSupabaseConfigured()) {
          try {
            console.log('[useFirebaseSupabaseSync:Fetch] Attempting direct Supabase client query...');
            let { data, error: sbError } = await supabase
              .from('profiles')
              .select('*, vendor_memberships(*, stores(*))')
              .eq('auth_uid', uid)
              .maybeSingle();

            if (sbError) {
              const fallback = await supabase
                .from('profiles')
                .select('*')
                .eq('auth_uid', uid)
                .maybeSingle();
              data = fallback.data;
              sbError = fallback.error;
            }

            if (!sbError && data) {
              rawProfile = data;
              fetchError = null;
              console.log('[useFirebaseSupabaseSync:Fetch] Direct Supabase query succeeded:', rawProfile);
            } else if (!sbError && data === null) {
              confirmedMissing = true;
            } else if (sbError) {
              console.warn('[useFirebaseSupabaseSync:Fetch] Direct Supabase query notice:', sbError.message);
            }
          } catch (directErr) {
            console.warn('[useFirebaseSupabaseSync:Fetch] Direct Supabase client error:', directErr);
          }
        }

        // Auto-Provision Strategy: Only when a lookup confirmed no profile exists yet in Supabase
        if (!rawProfile && confirmedMissing && autoCreateMissing) {
          try {
            console.log('[useFirebaseSupabaseSync:Fetch] No Supabase profile found. Auto-provisioning profile...');
            const initialName = userToFetch.displayName || 'PaikarMart User';
            const initialHandle = userToFetch.email ? `@${userToFetch.email.split('@')[0]}` : `@user_${uid.slice(0, 6)}`;
            const initialAvatar = userToFetch.photoURL || undefined;

            rawProfile = await syncAuthenticatedProfile({
              name: initialName,
              handle: initialHandle,
              avatar: initialAvatar,
              location: 'Dhaka, Bangladesh',
            });
            fetchError = null;
            console.log('[useFirebaseSupabaseSync:Fetch] Auto-provisioned Supabase profile:', rawProfile);
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
      console.log('[useFirebaseSupabaseSync:refetch] No authenticated Firebase user to fetch for.');
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
        console.log('[useFirebaseSupabaseSync:syncProfile] Updating profile with payload:', payload);
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
    console.log('[useFirebaseSupabaseSync] Initializing onAuthStateChanged listener...');
    setIsLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(
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
      console.log('[useFirebaseSupabaseSync] Cleaning up onAuthStateChanged listener.');
      unsubscribe();
    };
  }, [fetchProfileFromSupabase]);

  /**
   * Effect 2: Supabase Realtime subscription for live profile updates
   */
  useEffect(() => {
    if (!enableRealtime || !isSupabaseConfigured() || !firebaseUser?.uid) {
      return;
    }

    const uid = firebaseUser.uid;
    console.log('[useFirebaseSupabaseSync:Realtime] Subscribing to postgres_changes for auth_uid:', uid);

    const channelName = `profiles-sync-${uid}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `auth_uid=eq.${uid}`,
        },
        (change) => {
          console.log('[useFirebaseSupabaseSync:Realtime] Postgres change received:', change);
          void refetch();
        }
      )
      .subscribe((status) => {
        console.log('[useFirebaseSupabaseSync:Realtime] Channel status:', status);
      });

    return () => {
      console.log('[useFirebaseSupabaseSync:Realtime] Unsubscribing channel:', channelName);
      void supabase.removeChannel(channel);
    };
  }, [enableRealtime, firebaseUser?.uid, refetch]);

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
