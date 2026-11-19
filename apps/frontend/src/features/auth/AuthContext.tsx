import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  signInWithGoogle as firebaseGoogleSignIn, 
  signOutFirebase, 
  onAuthStateChanged,
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
import { syncAuthenticatedProfile, fetchAuthenticatedProfile } from '@/features/auth/services/authProfileApi';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  loading: boolean;
  isFirebaseReady: boolean;
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
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
  const [loading, setLoading] = useState<boolean>(true);
  const isFirebaseReady = isFirebaseConfigured();

  useEffect(() => {
    void validateFirestoreConnection();

    console.log('[AuthContext:Lifecycle] Initializing onAuthStateChanged subscriber...');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AuthContext:onAuthStateChanged] Event fired. Firebase User:', user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      } : null);

      setFirebaseUser(user);

      if (user) {
        // Load whatever state is stored locally to avoid clobbering role, vendor, or balance
        const stored = loadStoredData<User>('USER', CURRENT_USER);

        // Attempt to fetch fresh profile from backend (Supabase PostgreSQL)
        let backendProfile: any = null;
        try {
          backendProfile = await fetchAuthenticatedProfile();
          console.log('[AuthContext:onAuthStateChanged] Fetched backend profile:', backendProfile);
        } catch (fetchErr) {
          console.warn('[AuthContext:onAuthStateChanged] Backend profile fetch warning:', fetchErr);
        }

        const resolvedRole: UserRole = (backendProfile?.role as UserRole) || stored.role || 'consumer';
        const isVendorUser = Boolean(
          resolvedRole === 'vendor' ||
          stored.isVendor ||
          (Array.isArray(backendProfile?.vendor_memberships) && backendProfile.vendor_memberships.length > 0)
        );
        const resolvedHandle = user.email
          ? `@${user.email.split('@')[0]}`
          : stored.handle || `@user_${user.uid.slice(0, 6)}`;

        const syncedUser: User = {
          ...stored,
          id: user.uid,
          name: user.displayName || backendProfile?.name || stored.name || 'PaikarMart User',
          email: user.email || backendProfile?.email || stored.email || '',
          handle: resolvedHandle,
          avatar: user.photoURL || backendProfile?.avatar_url || stored.avatar,
          role: resolvedRole,
          isVendor: isVendorUser,
          kycStatus: backendProfile?.kyc_status || stored.kycStatus || 'none',
          vendorProfile: stored.vendorProfile,
          balance: typeof backendProfile?.wallet_balance === 'number' ? backendProfile.wallet_balance : (stored.balance ?? 0),
          rewardPoints: typeof backendProfile?.reward_points === 'number' ? backendProfile.reward_points : (stored.rewardPoints ?? 0),
          location: backendProfile?.location || stored.location || 'Dhaka, Bangladesh',
        };

        console.log('[AuthContext:onAuthStateChanged] Persisting synced user to state and localStorage:', {
          id: syncedUser.id,
          name: syncedUser.name,
          role: syncedUser.role,
          isVendor: syncedUser.isVendor,
          balance: syncedUser.balance,
        });

        setCurrentUser(syncedUser);
        saveStoredData('USER', syncedUser);

        // Background sync to backend and Firestore
        void syncAuthenticatedProfile({
          name: syncedUser.name,
          handle: syncedUser.handle,
          avatar: syncedUser.avatar,
          location: syncedUser.location,
        }).catch((err) => console.warn('[AuthContext] Backend sync warning:', err));

        void syncUserProfileToFirestore({
          id: user.uid,
          email: user.email || '',
          name: syncedUser.name,
          handle: resolvedHandle,
          role: resolvedRole,
          avatar: syncedUser.avatar,
          location: syncedUser.location,
          emailVerified: user.emailVerified,
        }).catch((err) => console.warn('[AuthContext] Firestore sync warning:', err));
      } else {
        console.log('[AuthContext:onAuthStateChanged] No authenticated user detected (Guest mode active).');
      }

      setLoading(false);
    });

    return () => {
      console.log('[AuthContext:Lifecycle] Cleaning up onAuthStateChanged subscriber.');
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthContext:GoogleSignIn] Initiating signInWithGoogle popup...');
      setLoading(true);
      const user = await firebaseGoogleSignIn();
      console.log('[AuthContext:GoogleSignIn] Firebase popup completed. User:', user ? { uid: user.uid, email: user.email } : null);

      if (user) {
        let backendProfile: any = null;
        try {
          backendProfile = await fetchAuthenticatedProfile();
          console.log('[AuthContext:GoogleSignIn] Fetched backend profile:', backendProfile);
        } catch {
          // ignore
        }

        const stored = loadStoredData<User>('USER', CURRENT_USER);
        const resolvedRole: UserRole = (backendProfile?.role as UserRole) || stored.role || 'consumer';
        const isVendorUser = Boolean(
          resolvedRole === 'vendor' ||
          stored.isVendor ||
          (Array.isArray(backendProfile?.vendor_memberships) && backendProfile.vendor_memberships.length > 0)
        );
        const resolvedHandle = user.email ? `@${user.email.split('@')[0]}` : '@user';

        const syncedUser: User = {
          ...stored,
          id: user.uid,
          name: user.displayName || backendProfile?.name || stored.name || 'Google User',
          email: user.email || backendProfile?.email || stored.email || '',
          handle: resolvedHandle,
          avatar: user.photoURL || backendProfile?.avatar_url || stored.avatar,
          role: resolvedRole,
          isVendor: isVendorUser,
          balance: typeof backendProfile?.wallet_balance === 'number' ? backendProfile.wallet_balance : (stored.balance ?? 0),
          location: stored.location || 'Dhaka, Bangladesh',
        };

        console.log('[AuthContext:GoogleSignIn] Setting currentUser and saving to storage:', syncedUser);
        setCurrentUser(syncedUser);
        saveStoredData('USER', syncedUser);

        void syncAuthenticatedProfile({
          name: syncedUser.name,
          handle: resolvedHandle,
          avatar: syncedUser.avatar,
          location: syncedUser.location,
        }).catch((err) => console.warn('[AuthContext:GoogleSignIn] Profile API sync warning:', err));

        void syncUserProfileToFirestore({
          id: user.uid,
          email: user.email || '',
          name: syncedUser.name,
          handle: resolvedHandle,
          role: resolvedRole,
          avatar: syncedUser.avatar,
          location: syncedUser.location,
          emailVerified: user.emailVerified,
        }).catch((err) => console.warn('[AuthContext:GoogleSignIn] Firestore sync warning:', err));
      }
    } catch (err) {
      console.error('[AuthContext:GoogleSignIn] Google Sign-in error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, selectedRole: UserRole = 'consumer') => {
    try {
      console.log('[AuthContext:Register] Starting email registration for:', { email, name, selectedRole });
      setLoading(true);
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

        void syncAuthenticatedProfile({
          name: newUser.name,
          handle: newUser.handle,
          avatar: newUser.avatar,
          location: newUser.location,
        }).catch((err) => console.warn('[AuthContext:Register] Profile API sync warning:', err));

        void syncUserProfileToFirestore({
          id: creds.user.uid,
          email: email,
          name: name,
          handle: newUser.handle,
          role: selectedRole,
          avatar: newUser.avatar,
          location: newUser.location,
          emailVerified: creds.user.emailVerified,
        }).catch((err) => console.warn('[AuthContext:Register] Firestore sync warning:', err));
      }
    } catch (err) {
      console.error('[AuthContext:Register] Email Registration Failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      console.log('[AuthContext:Login] Attempting email sign-in for:', email);
      setLoading(true);
      const creds = await signInWithEmailAndPassword(auth, email, pass);
      console.log('[AuthContext:Login] Firebase credentials validated. User UID:', creds.user.uid);

      if (creds.user) {
        let backendProfile: any = null;
        try {
          backendProfile = await fetchAuthenticatedProfile();
          console.log('[AuthContext:Login] Backend profile on login:', backendProfile);
        } catch (fetchErr) {
          console.warn('[AuthContext:Login] Backend profile fetch warning:', fetchErr);
        }

        const stored = loadStoredData<User>('USER', CURRENT_USER);
        const resolvedRole: UserRole = (backendProfile?.role as UserRole) || stored.role || 'consumer';
        const isVendorUser = Boolean(
          resolvedRole === 'vendor' ||
          stored.isVendor ||
          (Array.isArray(backendProfile?.vendor_memberships) && backendProfile.vendor_memberships.length > 0)
        );

        const loggedInUser: User = {
          ...stored,
          id: creds.user.uid,
          name: creds.user.displayName || backendProfile?.name || stored.name || 'Registered User',
          email: email,
          handle: `@${email.split('@')[0]}`,
          role: resolvedRole,
          isVendor: isVendorUser,
          kycStatus: backendProfile?.kyc_status || stored.kycStatus,
          balance: typeof backendProfile?.wallet_balance === 'number' ? backendProfile.wallet_balance : (stored.balance ?? 0),
        };

        console.log('[AuthContext:Login] Setting loggedInUser and persisting:', loggedInUser);
        setCurrentUser(loggedInUser);
        saveStoredData('USER', loggedInUser);

        void syncAuthenticatedProfile({
          name: loggedInUser.name,
          handle: loggedInUser.handle,
          location: loggedInUser.location,
        }).catch((err) => console.warn('[AuthContext:Login] Profile API sync warning:', err));
      }
    } catch (err) {
      console.error('[AuthContext:Login] Email Login Failed:', err);
      throw err;
    } finally {
      setLoading(false);
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
      setFirebaseUser({ ...auth.currentUser });
    }
  };

  const signOut = async () => {
    try {
      console.log('[AuthContext:SignOut] Signing out of Firebase...');
      setLoading(true);
      await signOutFirebase();
      setFirebaseUser(null);
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
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        setCurrentUser,
        loading,
        isFirebaseReady,
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
