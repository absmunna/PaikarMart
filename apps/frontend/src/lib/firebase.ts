import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  EmailAuthProvider,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  linkWithPopup,
  unlink,
  updatePassword,
  reauthenticateWithCredential,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  type ConfirmationResult,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { normalizeHandle } from '@paikarmart/shared';
import rawFirebaseConfig from '@firebase-config';

export interface FirebaseAuthConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  firestoreDatabaseId?: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const readViteEnv = (key: string): string => {
  const val = (import.meta as any).env?.[key];
  return typeof val === 'string' ? val.trim() : '';
};

const API_BASE = readViteEnv('VITE_API_BASE_URL').replace(/\/$/, '');

export const firebaseConfig: FirebaseAuthConfig = {
  apiKey: readViteEnv('VITE_FIREBASE_API_KEY') || rawFirebaseConfig?.apiKey || '',
  authDomain: readViteEnv('VITE_FIREBASE_AUTH_DOMAIN') || rawFirebaseConfig?.authDomain || '',
  projectId: readViteEnv('VITE_FIREBASE_PROJECT_ID') || rawFirebaseConfig?.projectId || '',
  firestoreDatabaseId:
    readViteEnv('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || rawFirebaseConfig?.firestoreDatabaseId || '(default)',
  storageBucket: readViteEnv('VITE_FIREBASE_STORAGE_BUCKET') || rawFirebaseConfig?.storageBucket || '',
  messagingSenderId: readViteEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || rawFirebaseConfig?.messagingSenderId || '',
  appId: readViteEnv('VITE_FIREBASE_APP_ID') || rawFirebaseConfig?.appId || '',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIzaSy'));
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth & Firestore (bound strictly to provisioned firestoreDatabaseId)
export const auth = getAuth(app);
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionValidated = false;

export const validateFirestoreConnection = async (): Promise<void> => {
  if (connectionValidated || !isFirebaseConfigured()) return;
  connectionValidated = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: Firestore client is offline.');
    }
  }
};

export const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Firebase Google Sign-In Error:', error);
    throw error;
  }
};

export const signOutFirebase = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase Sign-Out Error:', error);
    throw error;
  }
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim());
};

/**
 * Normalizes Bangladesh local/international phone inputs (01XXXXXXXXX, 8801XXXXXXXXX, +8801XXXXXXXXX)
 * or valid E.164 international phone strings to strict E.164 format required by Firebase Phone Auth.
 */
export function normalizeBdPhoneE164(rawPhone: string): string {
  const cleaned = rawPhone.replace(/[\s\-()]/g, '').trim();
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `+88${cleaned}`;
  }
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return cleaned;
  }
  const err = new Error('Invalid phone number format. Enter a valid 11-digit BD number (01XXXXXXXXX) or +E.164 number.') as Error & {
    code?: string;
  };
  err.code = 'INVALID_PHONE';
  throw err;
}

declare global {
  interface Window {
    __pmRecaptchaVerifier?: RecaptchaVerifier | null;
  }
}

export function clearPhoneRecaptcha(): void {
  if (typeof window === 'undefined') return;
  try {
    window.__pmRecaptchaVerifier?.clear();
  } catch {
    // Ignore already-cleared widget errors
  } finally {
    window.__pmRecaptchaVerifier = null;
  }
}

export function setupPhoneRecaptcha(containerId = 'pm-recaptcha-container'): RecaptchaVerifier {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Phone verification requires a browser environment.');
  }

  clearPhoneRecaptcha();

  let containerEl = document.getElementById(containerId);
  if (!containerEl) {
    containerEl = document.createElement('div');
    containerEl.id = containerId;
    containerEl.className = 'sr-only';
    document.body.appendChild(containerEl);
  } else {
    containerEl.innerHTML = '';
  }

  const verifier = new RecaptchaVerifier(auth, containerEl, {
    size: 'invisible',
  });
  window.__pmRecaptchaVerifier = verifier;
  return verifier;
}

export async function requestPhoneOtpConfirmation(
  rawPhone: string,
  containerId = 'pm-recaptcha-container'
): Promise<{ confirmation: ConfirmationResult; normalizedPhone: string }> {
  const normalizedPhone = normalizeBdPhoneE164(rawPhone);
  const verifier = setupPhoneRecaptcha(containerId);
  try {
    const confirmation = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
    return { confirmation, normalizedPhone };
  } catch (err) {
    clearPhoneRecaptcha();
    throw err;
  }
}

export async function requestLinkPhoneOtpConfirmation(
  rawPhone: string,
  containerId = 'pm-link-recaptcha-container'
): Promise<{ confirmation: ConfirmationResult; normalizedPhone: string }> {
  if (!auth.currentUser) {
    throw new Error('Authentication required to link a phone number.');
  }
  const normalizedPhone = normalizeBdPhoneE164(rawPhone);
  const verifier = setupPhoneRecaptcha(containerId);
  try {
    const confirmation = await linkWithPhoneNumber(auth.currentUser, normalizedPhone, verifier);
    return { confirmation, normalizedPhone };
  } catch (err) {
    clearPhoneRecaptcha();
    throw err;
  }
}

export async function linkGoogleToCurrentUser(): Promise<FirebaseUser> {
  if (!auth.currentUser) {
    throw new Error('Authentication required to link Google sign-in.');
  }
  const result = await linkWithPopup(auth.currentUser, googleProvider);
  return result.user;
}

export async function unlinkAuthProvider(providerId: string): Promise<FirebaseUser> {
  if (!auth.currentUser) {
    throw new Error('Authentication required.');
  }
  if ((auth.currentUser.providerData?.length || 0) <= 1) {
    throw new Error('Cannot unlink your only remaining sign-in method.');
  }
  return unlink(auth.currentUser, providerId);
}

export async function changePasswordWithReauth(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('Email account required to update password.');
  }
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

function sanitizeFirestoreHandle(rawHandle: string | undefined, email: string, uid: string): string {
  const fallbackSlug = email.includes('@') ? email.split('@')[0] : `user_${uid.slice(0, 6)}`;
  const normalized = normalizeHandle(rawHandle || fallbackSlug)
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  if (normalized.length >= 2) return normalized;
  return `user_${uid.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8) || '01'}`;
}

export const syncUserProfileToFirestore = async (user: {
  id: string;
  email: string;
  name: string;
  handle?: string;
  role: string;
  avatar?: string;
  location?: string;
  emailVerified?: boolean;
}) => {
  if (!isFirebaseConfigured()) return;

  const safeId = user.id.slice(0, 128);
  const fallbackEmail = `phone_${safeId.slice(0, 12)}@phone.paikarmart.local`;
  const rawEmail = (user.email || '').trim();
  const safeEmail = (rawEmail.length >= 3 ? rawEmail : fallbackEmail).slice(0, 160);
  const safeName = (user.name || 'PaikarMart User').trim().slice(0, 100) || 'PaikarMart User';
  const safeHandle = sanitizeFirestoreHandle(user.handle, safeEmail, safeId);
  const safeAvatar = (user.avatar || '').slice(0, 512);
  const safeLocation = (user.location || 'Dhaka, Bangladesh').slice(0, 120);
  const safeRole = 'consumer';

  const userPath = `users/${safeId}`;
  try {
    const userRef = doc(db, 'users', safeId);
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        id: safeId,
        email: safeEmail,
        name: safeName,
        handle: safeHandle,
        role: safeRole,
        ...(safeAvatar ? { avatar: safeAvatar } : {}),
        location: safeLocation,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.WRITE, userPath);
    } catch (wrappedErr) {
      console.warn('Firestore User Profile Sync Warning:', wrappedErr);
    }
  }

  // Sync Zero-PII public handle profile card when email is verified
  if (user.emailVerified) {
    const publicPath = `public_profiles/${safeHandle}`;
    try {
      const publicRef = doc(db, 'public_profiles', safeHandle);
      const publicSnap = await getDoc(publicRef);
      if (!publicSnap.exists()) {
        await setDoc(publicRef, {
          handle: safeHandle,
          ownerId: safeId,
          displayName: safeName,
          ...(safeAvatar ? { avatar: safeAvatar } : {}),
          location: safeLocation,
          verified: false,
          trustLevel: 1,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, publicPath);
      } catch (wrappedErr) {
        console.warn('Firestore Public Handle Sync Warning:', wrappedErr);
      }
    }
  }
};

export const updateUserProfileToFirestore = async (user: {
  id: string;
  email: string;
  name: string;
  handle?: string;
  role: string;
  avatar?: string;
  location?: string;
  emailVerified?: boolean;
}): Promise<void> => {
  if (!isFirebaseConfigured()) return;

  const safeId = user.id.slice(0, 128);
  const safeHandle = sanitizeFirestoreHandle(user.handle, user.email || '', safeId);
  const payload = {
    id: safeId,
    email: (user.email || '').slice(0, 160),
    name: (user.name || 'PaikarMart User').trim().slice(0, 100),
    handle: safeHandle,
    avatar: (user.avatar || '').slice(0, 512),
    location: (user.location || 'Dhaka, Bangladesh').slice(0, 120),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', safeId), payload, { merge: true });
    if (user.emailVerified) {
      await setDoc(doc(db, 'public_profiles', safeHandle), {
        handle: safeHandle,
        ownerId: safeId,
        displayName: payload.name,
        avatar: payload.avatar,
        location: payload.location,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore profile update warning:', err);
  }
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

export const uploadUserAsset = async (
  file: File,
  userId: string,
  folder: 'avatars' | 'documents' | 'videos'
): Promise<string | null> => {
  const targetFolder: 'avatars' | 'documents' = folder === 'avatars' ? 'avatars' : 'documents';
  const maxBytes = targetFolder === 'avatars' ? 2 * 1024 * 1024 : 6 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      targetFolder === 'avatars'
        ? 'Profile photo must be 2 MB or smaller.'
        : 'Document size must be 6 MB or smaller.'
    );
  }

  // Primary Spark-Free storage path: upload via authenticated backend to Supabase Free Storage (no Blaze billing required)
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      const dataBase64 = await fileToBase64(file);
      const response = await fetch(`${API_BASE}/api/auth/upload-asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          folder: targetFolder,
          fileName: file.name,
          contentType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          dataBase64,
        }),
      });

      if (response.ok) {
        const data = (await response.json().catch(() => ({}))) as { url?: string };
        if (data?.url) return data.url;
      }

      if (response.status !== 503 && response.status !== 404) {
        const errPayload = (await response.json().catch(() => ({}))) as { error?: string };
        if (errPayload?.error) {
          throw new Error(errPayload.error);
        }
      }
    } catch (err) {
      // Surface validation/upload limit errors directly; allow storage-unconfigured fallback cleanly
      if (err instanceof Error && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }
  }

  // Optional Firebase Storage fallback only when explicitly enabled on a Blaze-upgraded project
  if (readViteEnv('VITE_ENABLE_FIREBASE_STORAGE') === 'true' && isFirebaseConfigured() && firebaseConfig.storageBucket) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const objectRef = storageRef(getStorage(app), `users/${userId}/${folder}/${Date.now()}-${safeName}`);
    await uploadBytes(objectRef, file, { contentType: file.type || 'image/jpeg' });
    return getDownloadURL(objectRef);
  }

  return null;
};

export const uploadProfileAvatar = async (file: File, userId: string): Promise<string | null> => {
  return uploadUserAsset(file, userId, 'avatars');
};

export {
  EmailAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  linkWithPopup,
  unlink,
  updatePassword,
  reauthenticateWithCredential,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
};
export type { ConfirmationResult, FirebaseUser };
