import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  auth, 
  signInWithGoogle as firebaseGoogleSignIn, 
  signOutFirebase, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordReset,
  updateProfile,
  sendEmailVerification,
  syncUserProfileToFirestore,
  validateFirestoreConnection,
  isFirebaseConfigured,
  type FirebaseUser 
} from '@/lib/firebase';
import { User, UserRole } from '@/types';
import { CURRENT_USER } from '@/data/mockData';
import { loadStoredData, saveStoredData } from '@/lib/supabase';
import { syncAuthenticatedProfile } from '@/features/auth/services/authProfileApi';
import {
  useFirebaseSupabaseSync,
  type SupabaseUserProfile
} from '@/features/auth/hooks/useFirebaseSupabaseSync';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  supabaseProfile: SupabaseUserProfile | null;
  isSynced: boolean;
  syncError: Error | null;
  lastSyncedAt: Date | null;
  loading: boolean;
  isFirebaseReady: boolean;
  refetchProfile: () => Promise<SupabaseUserProfile | null>;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, selectedRole?: UserRole) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendEmailVerificationSignal: () => Promise<void>;
  reloadUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const storedUser = loadStoredData<User>('USER', CURRENT_USER);
    console.log('[AuthContext:Init] Hydrating stored user from localStorage:', {
      id: storedUser?.id,
      name: storedUser?.name,
      email: storedUser?.email,
      role: storedUser?.role,
      isVendor: storedUser?.isVendor,
      balance: storedUser?.balance,
    });
    return storedUser;
  });
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const isFirebaseReady = isFirebaseConfigured();

  const handleSyncSuccess = useCallback((profile: SupabaseUserProfile, user: FirebaseUser) => {
    const stored = loadStoredData<User>('USER', CURRENT_USER);
    const resolvedRole: UserRole = profile.role || stored.role || 'consumer';
    const isVendorUser = Boolean(
      resolvedRole === 'vendor' ||
      stored.isVendor ||
      (Array.isArray(profile.vendor_memberships) && profile.vendor_memberships.length > 0)
    );

    const syncedUser: User = {
      ...stored,
      id: user.uid,
      name: user.displayName || profile.name || stored.name || 'PaikarMart User',
      email: user.email || profile.email || stored.email || '',
      handle: profile.handle || (user.email ? `@${user.email.split('@')[0]}` : stored.handle || `@user_${user.uid.slice(0, 6)}`),
      avatar: user.photoURL || profile.avatar_url || stored.avatar,
      role: resolvedRole,
      isVendor: isVendorUser,
      kycStatus: profile.kyc_status || stored.kycStatus || 'none',
      trustLevel: profile.trust_level ?? stored.trustLevel,
      vendorProfile: stored.vendorProfile,
      balance: typeof profile.wallet_balance === 'number' ? profile.wallet_balance : (stored.balance ?? 0),
      rewardPoints: typeof profile.reward_points === 'number' ? profile.reward_points : (stored.rewardPoints ?? 0),
      location: profile.location || stored.location || 'Dhaka, Bangladesh',
      phone: profile.phone || stored.phone,
    };

    console.log('[AuthContext:FirebaseSupabaseSync] Cross-platform identity synced:', {
      id: syncedUser.id,
      name: syncedUser.name,
      role: syncedUser.role,
      isVendor: syncedUser.isVendor,
      balance: syncedUser.balance,
    });

    setCurrentUser(syncedUser);
    saveStoredData('USER', syncedUser);
  }, []);

  const handleSyncError = useCallback((err: Error) => {
    console.warn('[AuthContext:FirebaseSupabaseSync] Supabase sync fallback active:', err.message);
    const activeFirebaseUser = auth.currentUser;
    if (!activeFirebaseUser) return;

    const stored = loadStoredData<User>('USER', CURRENT_USER);
    const fallbackHandle = activeFirebaseUser.email
      ? `@${activeFirebaseUser.email.split('@')[0]}`
      : stored.handle || `@user_${activeFirebaseUser.uid.slice(0, 6)}`;

    const fallbackUser: User = {
      ...stored,
      id: activeFirebaseUser.uid,
      name: activeFirebaseUser.displayName || stored.name || 'PaikarMart User',
      email: activeFirebaseUser.email || stored.email || '',
      handle: fallbackHandle,
      avatar: activeFirebaseUser.photoURL || stored.avatar,
    };

    setCurrentUser(fallbackUser);
    saveStoredData('USER', fallbackUser);
  }, []);

  const {
    firebaseUser,
    supabaseProfile,
    isLoading: syncLoading,
    isSynced,
    error: syncError,
    lastSyncedAt,
    refetch: refetchProfile,
  } = useFirebaseSupabaseSync({
    autoCreateMissing: true,
    autoPersistToStorage: true,
    autoSyncFirestore: true,
    enableRealtime: true,
    onSyncSuccess: handleSyncSuccess,
    onSyncError: handleSyncError,
  });

  useEffect(() => {
    void validateFirestoreConnection();
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthContext:GoogleSignIn] Initiating signInWithGoogle popup...');
      setActionLoading(true);
      const user = await firebaseGoogleSignIn();
      console.log('[AuthContext:GoogleSignIn] Firebase popup completed. User:', user ? { uid: user.uid, email: user.email } : null);

      if (user) {
        await refetchProfile();
      }
    } catch (err) {
      console.error('[AuthContext:GoogleSignIn] Google Sign-in error:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, selectedRole: UserRole = 'consumer') => {
    try {
      console.log('[AuthContext:Register] Starting email registration for:', { email, name, selectedRole });
      setActionLoading(true);
      const creds = await createUserWithEmailAndPassword(auth, email, pass);
      console.log('[AuthContext:Register] Firebase Auth User successfully created. UID:', creds.user.uid);

      if (creds.user) {
        await updateProfile(creds.user, { displayName: name });
        console.log('[AuthContext:Register] Firebase displayName updated to:', name);

        const stored = loadStoredData<User>('USER', CURRENT_USER);
        const newUser: User = {
          ...stored,
          id: creds.user.uid,
          name: name,
          email: email,
          handle: `@${email.split('@')[0]}`,
          role: selectedRole,
          isVendor: selectedRole === 'vendor',
        };

        console.log('[AuthContext:Register] Setting and persisting new user:', newUser);
        setCurrentUser(newUser);
        saveStoredData('USER', newUser);

        await syncAuthenticatedProfile({
          name: newUser.name,
          handle: newUser.handle,
          avatar: newUser.avatar,
          location: newUser.location,
        }).catch((err) => console.warn('[AuthContext:Register] Profile API sync warning:', err));

        await syncUserProfileToFirestore({
          id: creds.user.uid,
          email: email,
          name: name,
          handle: newUser.handle,
          role: selectedRole,
          avatar: newUser.avatar,
          location: newUser.location,
          emailVerified: creds.user.emailVerified,
        }).catch((err) => console.warn('[AuthContext:Register] Firestore sync warning:', err));

        await refetchProfile();
      }
    } catch (err) {
      console.error('[AuthContext:Register] Email Registration Failed:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      console.log('[AuthContext:Login] Attempting email sign-in for:', email);
      setActionLoading(true);
      const creds = await signInWithEmailAndPassword(auth, email, pass);
      console.log('[AuthContext:Login] Firebase credentials validated. User UID:', creds.user.uid);

      if (creds.user) {
        await refetchProfile();
      }
    } catch (err) {
      console.error('[AuthContext:Login] Email Login Failed:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const sendEmailVerificationSignal = async () => {
    if (auth.currentUser) {
      console.log('[AuthContext:EmailVerification] Sending verification email to:', auth.currentUser.email);
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      console.log('[AuthContext:Reload] Reloading auth.currentUser...');
      await auth.currentUser.reload();
      console.log('[AuthContext:Reload] Reload complete. emailVerified:', auth.currentUser.emailVerified);
      await refetchProfile();
    }
  };

  const signOut = async () => {
    try {
      console.log('[AuthContext:SignOut] Signing out of Firebase...');
      setActionLoading(true);
      await signOutFirebase();
      const guestUser: User = {
        ...CURRENT_USER,
        role: 'consumer',
        isVendor: false,
        kycStatus: 'none',
        vendorProfile: undefined,
        balance: 0,
      };
      console.log('[AuthContext:SignOut] Resetting currentUser to guest state:', guestUser);
      setCurrentUser(guestUser);
      saveStoredData('USER', guestUser);
    } catch (err) {
      console.error('[AuthContext:SignOut] Sign-out failed:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        setCurrentUser,
        supabaseProfile,
        isSynced,
        syncError,
        lastSyncedAt,
        loading: actionLoading || syncLoading,
        isFirebaseReady,
        refetchProfile,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        sendPasswordReset,
        sendEmailVerificationSignal,
        reloadUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
