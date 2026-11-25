import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  auth, 
  signInWithGoogle as firebaseGoogleSignIn, 
  signOutFirebase, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordReset,
  updateProfile,
  sendEmailVerification,
  requestPhoneOtpConfirmation,
  requestLinkPhoneOtpConfirmation,
  linkGoogleToCurrentUser,
  unlinkAuthProvider,
  changePasswordWithReauth,
  clearPhoneRecaptcha,
  syncUserProfileToFirestore,
  validateFirestoreConnection,
  isFirebaseConfigured,
  type ConfirmationResult,
  type FirebaseUser 
} from '@/lib/firebase';
import { User, UserRole } from '@/types';
import { CURRENT_USER } from '@/data/mockData';
import { loadStoredData, saveStoredData } from '@/lib/supabase';
import { safeMediaSrc } from '@/shared/utils';
import { revokeAllAuthSessions, syncAuthenticatedProfile } from '@/features/auth/services/authProfileApi';
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
  pendingPhoneNumber: string | null;
  refetchProfile: () => Promise<SupabaseUserProfile | null>;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, selectedRole?: UserRole) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  sendPhoneOtp: (phone: string, containerId?: string) => Promise<string>;
  verifyPhoneOtp: (otpCode: string) => Promise<void>;
  clearPhoneOtpSession: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  sendEmailVerificationSignal: () => Promise<void>;
  reloadUser: () => Promise<void>;
  sendLinkPhoneOtp: (phone: string, containerId?: string) => Promise<string>;
  verifyLinkPhoneOtp: (otpCode: string) => Promise<void>;
  linkGoogleProvider: () => Promise<void>;
  unlinkProvider: (providerId: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  revokeAllSessions: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EXPECTED_AUTH_ERROR_CODES = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-email',
  'auth/email-already-in-use',
  'auth/weak-password',
  'auth/too-many-requests',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/popup-blocked',
  'auth/user-disabled',
  'auth/operation-not-allowed',
  'auth/invalid-verification-code',
  'auth/code-expired',
]);

const logAuthFailure = (scope: string, err: unknown) => {
  const code = (err as { code?: string } | null)?.code;
  if (code && EXPECTED_AUTH_ERROR_CODES.has(code)) {
    console.warn(`${scope} (${code}):`, (err as Error)?.message || err);
  } else {
    console.error(`${scope}:`, err);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const storedUser = loadStoredData<User>('USER', CURRENT_USER);
    return {
      ...storedUser,
      avatar: safeMediaSrc(storedUser?.avatar, CURRENT_USER.avatar),
    };
  });
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const phoneConfirmationRef = useRef<ConfirmationResult | null>(null);
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
      avatar: safeMediaSrc(user.photoURL || profile.avatar_url || stored.avatar, CURRENT_USER.avatar),
      role: resolvedRole,
      isVendor: isVendorUser,
      kycStatus: profile.kyc_status || stored.kycStatus || 'none',
      trustLevel: profile.trust_level ?? stored.trustLevel,
      vendorProfile: stored.vendorProfile,
      balance: typeof profile.wallet_balance === 'number' ? profile.wallet_balance : (stored.balance ?? 0),
      rewardPoints: typeof profile.reward_points === 'number' ? profile.reward_points : (stored.rewardPoints ?? 0),
      location: profile.location || stored.location || 'Dhaka, Bangladesh',
      phone: profile.phone || user.phoneNumber || stored.phone,
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
      avatar: safeMediaSrc(activeFirebaseUser.photoURL || stored.avatar, CURRENT_USER.avatar),
      phone: activeFirebaseUser.phoneNumber || stored.phone,
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
      logAuthFailure('[AuthContext:GoogleSignIn] Google Sign-in rejected', err);
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
      logAuthFailure('[AuthContext:Register] Email Registration Rejected', err);
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
      logAuthFailure('[AuthContext:Login] Email Login Rejected', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const sendPhoneOtp = async (phone: string, containerId = 'pm-recaptcha-container'): Promise<string> => {
    try {
      setActionLoading(true);
      const { confirmation, normalizedPhone } = await requestPhoneOtpConfirmation(phone, containerId);
      phoneConfirmationRef.current = confirmation;
      setPendingPhoneNumber(normalizedPhone);
      return normalizedPhone;
    } finally {
      setActionLoading(false);
    }
  };

  const verifyPhoneOtp = async (otpCode: string): Promise<void> => {
    const confirmation = phoneConfirmationRef.current;
    if (!confirmation) {
      const err = new Error('OTP session expired. Please request a new code.') as Error & { code?: string };
      err.code = 'auth/code-expired';
      throw err;
    }
    try {
      setActionLoading(true);
      const result = await confirmation.confirm(otpCode.trim());
      phoneConfirmationRef.current = null;
      setPendingPhoneNumber(null);
      clearPhoneRecaptcha();
      if (result.user) {
        await refetchProfile();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const clearPhoneOtpSession = useCallback(() => {
    phoneConfirmationRef.current = null;
    setPendingPhoneNumber(null);
    clearPhoneRecaptcha();
  }, []);

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

  const sendLinkPhoneOtp = async (phone: string, containerId = 'pm-link-recaptcha-container'): Promise<string> => {
    try {
      setActionLoading(true);
      const { confirmation, normalizedPhone } = await requestLinkPhoneOtpConfirmation(phone, containerId);
      phoneConfirmationRef.current = confirmation;
      setPendingPhoneNumber(normalizedPhone);
      return normalizedPhone;
    } finally {
      setActionLoading(false);
    }
  };

  const verifyLinkPhoneOtp = async (otpCode: string): Promise<void> => {
    const confirmation = phoneConfirmationRef.current;
    if (!confirmation) {
      const err = new Error('OTP session expired. Please request a new code.') as Error & { code?: string };
      err.code = 'auth/code-expired';
      throw err;
    }
    try {
      setActionLoading(true);
      const result = await confirmation.confirm(otpCode.trim());
      phoneConfirmationRef.current = null;
      setPendingPhoneNumber(null);
      clearPhoneRecaptcha();
      if (result.user) {
        await result.user.reload();
        if (result.user.phoneNumber) {
          await syncAuthenticatedProfile({
            name: currentUser.name || result.user.displayName || 'PaikarMart User',
            phone: result.user.phoneNumber,
          }).catch(() => undefined);
        }
        await refetchProfile();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const linkGoogleProvider = async (): Promise<void> => {
    try {
      setActionLoading(true);
      const updatedUser = await linkGoogleToCurrentUser();
      await updatedUser.reload();
      await refetchProfile();
    } finally {
      setActionLoading(false);
    }
  };

  const unlinkProvider = async (providerId: string): Promise<void> => {
    try {
      setActionLoading(true);
      const updatedUser = await unlinkAuthProvider(providerId);
      await updatedUser.reload();
      await refetchProfile();
    } finally {
      setActionLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      setActionLoading(true);
      await changePasswordWithReauth(currentPassword, newPassword);
    } finally {
      setActionLoading(false);
    }
  };

  const revokeAllSessions = async (): Promise<void> => {
    try {
      setActionLoading(true);
      await revokeAllAuthSessions().catch(() => undefined);
      await signOut();
    } finally {
      setActionLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('[AuthContext:SignOut] Signing out of Firebase...');
      setActionLoading(true);
      clearPhoneOtpSession();
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
        pendingPhoneNumber,
        refetchProfile,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        sendPhoneOtp,
        verifyPhoneOtp,
        clearPhoneOtpSession,
        sendPasswordReset,
        sendEmailVerificationSignal,
        reloadUser,
        sendLinkPhoneOtp,
        verifyLinkPhoneOtp,
        linkGoogleProvider,
        unlinkProvider,
        changePassword,
        revokeAllSessions,
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
