import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
} from '@/lib/firebase';
import type { PaikarMartDelegate, TeamPageRole, UserRole, VendorDelegate } from '@/types';

const PRIMARY_OWNER_EMAIL = 'abs.munna1@gmail.com';
const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

function toSafeSlug(raw: string, prefix: string, maxLen = 128): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const id = `${prefix}_${cleaned || 'member'}`.slice(0, maxLen);
  return VALID_ID_REGEX.test(id) ? id : `${prefix}_${Date.now()}`.slice(0, maxLen);
}

function hashEmailSuffix(email: string): string {
  let hash = 2166136261;
  for (let i = 0; i < email.length; i += 1) {
    hash ^= email.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function makePaikarMartDelegateId(email: string): string {
  const normalized = email.trim().toLowerCase();
  const suffix = hashEmailSuffix(normalized);
  return toSafeSlug(`${normalized}_${suffix}`, 'pm_del', 120);
}

export function makeVendorDelegateId(vendorId: string, email: string): string {
  const cleanVendor = vendorId.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const normalized = email.trim().toLowerCase();
  const suffix = hashEmailSuffix(`${cleanVendor}:${normalized}`);
  return toSafeSlug(`${cleanVendor}_${normalized}_${suffix}`, 'vd_del', 124);
}

function formatFirestoreDate(value: unknown, fallback?: string): string {
  if (value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString().split('T')[0];
  }
  if (typeof value === 'string' && value.trim()) {
    return value.slice(0, 10);
  }
  return fallback || new Date().toISOString().split('T')[0];
}

function canUseVerifiedFirestore(): boolean {
  return Boolean(
    isFirebaseConfigured() &&
      auth.currentUser &&
      auth.currentUser.emailVerified &&
      auth.currentUser.email
  );
}

export function subscribePaikarMartDelegates(
  onUpdate: (delegates: PaikarMartDelegate[]) => void
): Unsubscribe {
  if (!canUseVerifiedFirestore() || !auth.currentUser?.email) {
    return () => undefined;
  }

  const cleanEmail = auth.currentUser.email.trim().toLowerCase();
  const isBootstrapOwner = cleanEmail === PRIMARY_OWNER_EMAIL;
  const colRef = collection(db, 'paikarmart_delegates');
  const q = isBootstrapOwner ? colRef : query(colRef, where('email', '==', cleanEmail));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: PaikarMartDelegate[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: String(data.id || docSnap.id),
          email: String(data.email || '').toLowerCase(),
          name: String(data.name || 'Team Member'),
          role: (data.role || 'admin') as UserRole,
          pageRole: (data.pageRole || 'admin') as TeamPageRole,
          status: (data.status === 'invited' ? 'invited' : 'active') as 'active' | 'invited',
          addedBy: String(data.addedBy || PRIMARY_OWNER_EMAIL),
          addedAt: formatFirestoreDate(data.createdAt),
        };
      });
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'paikarmart_delegates');
      } catch (wrapped) {
        console.warn('[teamAccessFirestore] PaikarMart delegates listener warning:', wrapped);
      }
    }
  );
}

export async function upsertPaikarMartDelegateInFirestore(params: {
  email: string;
  name: string;
  role: UserRole;
  pageRole: TeamPageRole;
  addedBy: string;
}): Promise<boolean> {
  if (!canUseVerifiedFirestore()) {
    return false;
  }

  const cleanEmail = params.email.trim().toLowerCase().slice(0, 160);
  if (cleanEmail.length < 3 || !cleanEmail.includes('@')) {
    throw new Error('Valid email address is required.');
  }

  const delegateId = makePaikarMartDelegateId(cleanEmail);
  const path = `paikarmart_delegates/${delegateId}`;
  const docRef = doc(db, 'paikarmart_delegates', delegateId);

  const safeName = (params.name.trim() || cleanEmail.split('@')[0] || 'Team Member').slice(0, 100);
  const safeAddedBy = (params.addedBy.trim().toLowerCase() || PRIMARY_OWNER_EMAIL).slice(0, 160);

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        name: safeName,
        role: params.role,
        pageRole: params.pageRole,
        status: 'active',
        addedBy: safeAddedBy,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id: delegateId,
        email: cleanEmail,
        name: safeName,
        role: params.role,
        pageRole: params.pageRole,
        status: 'active',
        addedBy: safeAddedBy,
        createdAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePaikarMartDelegateFromFirestore(email: string): Promise<boolean> {
  if (!canUseVerifiedFirestore()) {
    return false;
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || cleanEmail === PRIMARY_OWNER_EMAIL) {
    return false;
  }

  const delegateId = makePaikarMartDelegateId(cleanEmail);
  const path = `paikarmart_delegates/${delegateId}`;

  try {
    const docRef = doc(db, 'paikarmart_delegates', delegateId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await deleteDoc(docRef);
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeVendorDelegates(
  onUpdate: (delegates: VendorDelegate[]) => void
): Unsubscribe {
  if (!canUseVerifiedFirestore() || !auth.currentUser?.email) {
    return () => undefined;
  }

  const uid = auth.currentUser.uid;
  const cleanEmail = auth.currentUser.email.trim().toLowerCase();
  const colRef = collection(db, 'vendor_delegates');

  const ownedMap = new Map<string, VendorDelegate>();
  const sharedMap = new Map<string, VendorDelegate>();

  const emitMerged = () => {
    const merged = new Map<string, VendorDelegate>();
    ownedMap.forEach((v, k) => merged.set(k, v));
    sharedMap.forEach((v, k) => merged.set(k, v));
    onUpdate(Array.from(merged.values()));
  };

  const mapSnap = (docSnap: any): VendorDelegate => {
    const data = docSnap.data();
    return {
      id: String(data.id || docSnap.id),
      vendorId: String(data.vendorId || ''),
      vendorName: String(data.vendorName || 'Vendor Store'),
      ownerId: String(data.ownerId || ''),
      email: String(data.email || '').toLowerCase(),
      name: String(data.name || 'Team Member'),
      pageRole: (data.pageRole || 'editor') as TeamPageRole,
      status: (data.status || 'active') as 'active' | 'invited' | 'revoked',
      addedBy: String(data.addedBy || ''),
      addedAt: formatFirestoreDate(data.createdAt),
    };
  };

  const unsubOwned = onSnapshot(
    query(colRef, where('ownerId', '==', uid)),
    (snapshot) => {
      ownedMap.clear();
      snapshot.docs.forEach((d) => ownedMap.set(d.id, mapSnap(d)));
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'vendor_delegates(owned)');
      } catch (wrapped) {
        console.warn('[teamAccessFirestore] Vendor owned delegates warning:', wrapped);
      }
    }
  );

  const unsubShared = onSnapshot(
    query(colRef, where('email', '==', cleanEmail)),
    (snapshot) => {
      sharedMap.clear();
      snapshot.docs.forEach((d) => sharedMap.set(d.id, mapSnap(d)));
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'vendor_delegates(shared)');
      } catch (wrapped) {
        console.warn('[teamAccessFirestore] Vendor shared delegates warning:', wrapped);
      }
    }
  );

  return () => {
    unsubOwned();
    unsubShared();
  };
}

export async function upsertVendorDelegateInFirestore(params: {
  vendorId: string;
  vendorName: string;
  ownerId: string;
  email: string;
  name: string;
  pageRole: TeamPageRole;
  addedBy: string;
}): Promise<boolean> {
  if (!canUseVerifiedFirestore() || !auth.currentUser) {
    return false;
  }

  const cleanEmail = params.email.trim().toLowerCase().slice(0, 160);
  const cleanVendorId = params.vendorId.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  if (cleanEmail.length < 3 || !cleanEmail.includes('@') || !cleanVendorId) {
    throw new Error('Valid vendor ID and email address are required.');
  }

  const delegateId = makeVendorDelegateId(cleanVendorId, cleanEmail);
  const path = `vendor_delegates/${delegateId}`;
  const docRef = doc(db, 'vendor_delegates', delegateId);

  const safeName = (params.name.trim() || cleanEmail.split('@')[0] || 'Team Member').slice(0, 100);
  const safeVendorName = (params.vendorName.trim() || 'Vendor Store').slice(0, 120);
  const safeOwnerId = auth.currentUser.uid.slice(0, 128);
  const safeAddedBy = (params.addedBy.trim().toLowerCase() || auth.currentUser.email || '').slice(0, 160);

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        name: safeName,
        pageRole: params.pageRole,
        status: 'active',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id: delegateId,
        vendorId: cleanVendorId,
        vendorName: safeVendorName,
        ownerId: safeOwnerId,
        email: cleanEmail,
        name: safeName,
        pageRole: params.pageRole,
        status: 'active',
        addedBy: safeAddedBy,
        createdAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteVendorDelegateFromFirestore(
  vendorId: string,
  email: string
): Promise<boolean> {
  if (!canUseVerifiedFirestore()) {
    return false;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanVendorId = vendorId.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  if (!cleanEmail || !cleanVendorId) return false;

  const delegateId = makeVendorDelegateId(cleanVendorId, cleanEmail);
  const path = `vendor_delegates/${delegateId}`;

  try {
    const docRef = doc(db, 'vendor_delegates', delegateId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await deleteDoc(docRef);
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
