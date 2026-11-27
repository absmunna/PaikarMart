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
import { User, UserRole, PaikarMartDelegate } from '@/types';
import {
  CURRENT_USER,
  DEFAULT_PERSONAL_USER,
  PAIKARMART_SUPER_ADMIN_PROFILE,
  INITIAL_PAIKARMART_DELEGATES
} from '@/data/mockData';
import { loadStoredData, saveStoredData } from '@/lib/supabase';
import { safeMediaSrc } from '@/shared/utils';
import { revokeAllAuthSessions, syncAuthenticatedProfile } from '@/features/auth/services/authProfileApi';
import { vendorApiClient } from '@/features/vendors';
import {
  useFirebaseSupabaseSync,
  type SupabaseUserProfile
} from '@/features/auth/hooks/useFirebaseSupabaseSync';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  activeProfileMode: 'personal' | 'paikarmart';
  hasPaikarMartAccess: boolean;
  personalUser: User;
  paikarMartProfile: User;
  paikarMartDelegates: PaikarMartDelegate[];
  switchProfileMode: (mode: 'personal' | 'paikarmart') => void;
  grantPaikarMartAccess: (email: string, name?: string, role?: UserRole) => Promise<void>;
  revokePaikarMartAccess: (email: string) => Promise<void>;
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

const logAuthDebug = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const logAuthFailure = (scope: string, err: unknown) => {
  const code = (err as { code?: string } | null)?.code;
  if (code && EXPECTED_AUTH_ERROR_CODES.has(code)) {
    console.warn(`${scope} (${code}):`, (err as Error)?.message || err);
  } else {
    console.error(`${scope}:`, err);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProfileMode, setActiveProfileMode] = useState<'personal' | 'paikarmart'>(() => {
    return loadStoredData<'personal' | 'paikarmart'>('ACTIVE_PROFILE_MODE', 'personal');
  });

  const [paikarMartDelegates, setPaikarMartDelegates] = useState<PaikarMartDelegate[]>(() => {
    return loadStoredData<PaikarMartDelegate[]>('PAIKARMART_DELEGATES', INITIAL_PAIKARMART_DELEGATES);
  });

  const [personalUser, setPersonalUser] = useState<User>(() => {
    const stored = loadStoredData<User>('USER_PERSONAL', DEFAULT_PERSONAL_USER);
    return {
      ...stored,
      avatar: safeMediaSrc(stored?.avatar, DEFAULT_PERSONAL_USER.avatar),
    };
  });

  const [paikarMartProfile, setPaikarMartProfile] = useState<User>(() => {
    const stored = loadStoredData<User>('USER_PAIKARMART_ORG', PAIKARMART_SUPER_ADMIN_PROFILE);
    return {
      ...stored,
      avatar: safeMediaSrc(stored?.avatar, PAIKARMART_SUPER_ADMIN_PROFILE.avatar),
    };
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const storedMode = loadStoredData<'personal' | 'paikarmart'>('ACTIVE_PROFILE_MODE', 'personal');
    if (storedMode === 'paikarmart') {
      const storedOrg = loadStoredData<User>('USER_PAIKARMART_ORG', PAIKARMART_SUPER_ADMIN_PROFILE);
      return {
        ...storedOrg,
        avatar: safeMediaSrc(storedOrg?.avatar, PAIKARMART_SUPER_ADMIN_PROFILE.avatar),
      };
    }
    const storedPersonal = loadStoredData<User>('USER_PERSONAL', DEFAULT_PERSONAL_USER);
    return {
      ...storedPersonal,
      avatar: safeMediaSrc(storedPersonal?.avatar, DEFAULT_PERSONAL_USER.avatar),
    };
  });

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const phoneConfirmationRef = useRef<ConfirmationResult | null>(null);
  const isFirebaseReady = isFirebaseConfigured();

  const SUPER_ADMIN_EMAILS = new Set([
    'abs.munna1@gmail.com',
    'superadmin@paikarmart.com',
    'admin@paikarmart.com',
    'root.admin@paikarmart.com'
  ]);

  const currentEmail = (auth.currentUser?.email || personalUser?.email || '').toLowerCase();
  const hasPaikarMartAccess = Boolean(
    !auth.currentUser || // In dev/preview or root owner mode
    currentEmail === 'abs.munna1@gmail.com' ||
    SUPER_ADMIN_EMAILS.has(currentEmail) ||
    paikarMartDelegates.some((d) => d.email.toLowerCase() === currentEmail && d.status === 'active')
  );

  const switchProfileMode = useCallback((mode: 'personal' | 'paikarmart') => {
    setActiveProfileMode(mode);
    saveStoredData('ACTIVE_PROFILE_MODE', mode);
    if (mode === 'paikarmart') {
      logAuthDebug('[AuthContext:ProfileSwitch] Switched active profile to PaikarMart (Super Admin Organization)');
      setCurrentUser(paikarMartProfile);
      saveStoredData('USER', paikarMartProfile);
    } else {
      logAuthDebug('[AuthContext:ProfileSwitch] Switched active profile to Personal Account');
      setCurrentUser(personalUser);
      saveStoredData('USER', personalUser);
    }
  }, [paikarMartProfile, personalUser]);

  const grantPaikarMartAccess = useCallback(async (email: string, name?: string, role: UserRole = 'admin') => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name?.trim() || cleanEmail.split('@')[0];
    const newDelegate: PaikarMartDelegate = {
      id: `del_${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      role,
      addedAt: new Date().toISOString().split('T')[0],
      addedBy: auth.currentUser?.email || 'abs.munna1@gmail.com',
      status: 'active'
    };

    setPaikarMartDelegates((prev) => {
      const filtered = prev.filter((d) => d.email.toLowerCase() !== cleanEmail);
      const updated = [newDelegate, ...filtered];
      saveStoredData('PAIKARMART_DELEGATES', updated);
      return updated;
    });

    try {
      await vendorApiClient.updateGovernanceRole({ email: cleanEmail, role });
    } catch (err) {
      logAuthDebug('[AuthContext:grantPaikarMartAccess] Backend governance sync notice:', err);
    }
  }, []);

  const revokePaikarMartAccess = useCallback(async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'abs.munna1@gmail.com') {
      throw new Error('Cannot revoke primary owner access from abs.munna1@gmail.com');
    }
    setPaikarMartDelegates((prev) => {
      const updated = prev.filter((d) => d.email.toLowerCase() !== cleanEmail);
      saveStoredData('PAIKARMART_DELEGATES', updated);
      return updated;
    });

    try {
      await vendorApiClient.updateGovernanceRole({ email: cleanEmail, role: 'consumer' });
    } catch (err) {
      logAuthDebug('[AuthContext:revokePaikarMartAccess] Backend governance revoke notice:', err);
    }
  }, []);

  const handleSyncSuccess = useCallback((profile: SupabaseUserProfile, user: FirebaseUser) => {
    const isVendorUser = Boolean(
      profile.role === 'vendor' ||
      (Array.isArray(profile.vendor_memberships) && profile.vendor_memberships.length > 0)
    );

    // Personal Account Identity (User's personal presence)
    const syncedPersonal: User = {
      id: user.uid,
      name: user.displayName || profile.name || (user.email ? user.email.split('@')[0] : 'Munna'),
      email: user.email || profile.email || '',
      handle: profile.handle || (user.email ? `@${user.email.split('@')[0]}` : `@user_${user.uid.slice(0, 6)}`),
      avatar: safeMediaSrc(user.photoURL || profile.avatar_url, DEFAULT_PERSONAL_USER.avatar),
      role: profile.role || 'consumer',
      isVendor: isVendorUser,
      profileType: 'personal',
      kycStatus: profile.kyc_status || 'none',
      trustLevel: profile.trust_level ?? 1,
      location: profile.location || 'Dhaka, Bangladesh',
      phone: profile.phone || user.phoneNumber || undefined,
      balance: typeof profile.wallet_balance === 'number' ? profile.wallet_balance : 0,
      rewardPoints: typeof profile.reward_points === 'number' ? profile.reward_points : 0,
    };

    setPersonalUser(syncedPersonal);
    saveStoredData('USER_PERSONAL', syncedPersonal);

    // If currently acting as PaikarMart Organization, keep active persona as PaikarMart
    const currentMode = loadStoredData<'personal' | 'paikarmart'>('ACTIVE_PROFILE_MODE', 'personal');
    if (currentMode === 'paikarmart') {
      setCurrentUser(paikarMartProfile);
      saveStoredData('USER', paikarMartProfile);
    } else {
      setCurrentUser(syncedPersonal);
      saveStoredData('USER', syncedPersonal);
    }

    logAuthDebug('[AuthContext:SyncSuccess] Cross-platform identity synced for personal profile:', {
      uid: user.uid,
      email: user.email,
      mode: currentMode
    });
  }, [paikarMartProfile]);

  const handleSyncError = useCallback((err: Error) => {
    console.warn('[AuthContext:FirebaseSupabaseSync] Supabase sync fallback active:', err.message);
    const activeFirebaseUser = auth.currentUser;
    if (!activeFirebaseUser) return;

    const fallbackPersonal: User = {
      id: activeFirebaseUser.uid,
      name: activeFirebaseUser.displayName || (activeFirebaseUser.email ? activeFirebaseUser.email.split('@')[0] : 'Munna'),
      email: activeFirebaseUser.email || '',
      handle: activeFirebaseUser.email ? `@${activeFirebaseUser.email.split('@')[0]}` : `@user_${activeFirebaseUser.uid.slice(0, 6)}`,
      avatar: safeMediaSrc(activeFirebaseUser.photoURL, DEFAULT_PERSONAL_USER.avatar),
      role: 'consumer',
      isVendor: false,
      profileType: 'personal',
      kycStatus: 'none',
      trustLevel: 1,
      location: 'Dhaka, Bangladesh',
      balance: 0,
      rewardPoints: 0,
      phone: activeFirebaseUser.phoneNumber || undefined,
    };

    setPersonalUser(fallbackPersonal);
    saveStoredData('USER_PERSONAL', fallbackPersonal);

    const currentMode = loadStoredData<'personal' | 'paikarmart'>('ACTIVE_PROFILE_MODE', 'personal');
    if (currentMode === 'paikarmart') {
      setCurrentUser(paikarMartProfile);
      saveStoredData('USER', paikarMartProfile);
    } else {
      setCurrentUser(fallbackPersonal);
      saveStoredData('USER', fallbackPersonal);
    }
  }, [paikarMartProfile]);

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
      logAuthDebug('[AuthContext:GoogleSignIn] Initiating signInWithGoogle popup...');
      setActionLoading(true);
      const user = await firebaseGoogleSignIn();
      logAuthDebug('[AuthContext:GoogleSignIn] Firebase popup completed. User:', user ? { uid: user.uid } : null);

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
      logAuthDebug('[AuthContext:Register] Starting email registration for role:', selectedRole);
      setActionLoading(true);
      const creds = await createUserWithEmailAndPassword(auth, email, pass);
      logAuthDebug('[AuthContext:Register] Firebase Auth User successfully created. UID:', creds.user.uid);

      if (creds.user) {
        await updateProfile(creds.user, { displayName: name });
        logAuthDebug('[AuthContext:Register] Firebase displayName updated.');

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

        logAuthDebug('[AuthContext:Register] Setting and persisting new user profile.');
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
      logAuthDebug('[AuthContext:Login] Attempting email sign-in...');
      setActionLoading(true);
      const creds = await signInWithEmailAndPassword(auth, email, pass);
      logAuthDebug('[AuthContext:Login] Firebase credentials validated. User UID:', creds.user.uid);

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
      logAuthDebug('[AuthContext:EmailVerification] Sending verification email.');
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      logAuthDebug('[AuthContext:Reload] Reloading auth.currentUser...');
      await auth.currentUser.reload();
      logAuthDebug('[AuthContext:Reload] Reload complete. emailVerified:', auth.currentUser.emailVerified);
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
      logAuthDebug('[AuthContext:SignOut] Signing out of Firebase...');
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
      logAuthDebug('[AuthContext:SignOut] Resetting currentUser to guest state.');
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
        activeProfileMode,
        hasPaikarMartAccess,
        personalUser,
        paikarMartProfile,
        paikarMartDelegates,
        switchProfileMode,
        grantPaikarMartAccess,
        revokePaikarMartAccess,
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
