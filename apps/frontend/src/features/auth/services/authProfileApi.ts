import { SavedAddress } from '@/types';
import { API_BASE, apiRequest, getAuthHeaders } from '@/shared/services/apiClient';

export async function syncAuthenticatedProfile(payload: { name: string; handle?: string; avatar?: string; location?: string; phone?: string }): Promise<unknown | null> {
  try {
    const data = await apiRequest<{ profile?: unknown }>('/api/auth/profile', {
      method: 'PUT',
      json: true,
      body: JSON.stringify(payload),
    });
    return data.profile || null;
  } catch (err: any) {
    throw new Error(err?.message || 'Profile sync failed.');
  }
}

export async function fetchSavedAddresses(): Promise<SavedAddress[]> {
  const data = await apiRequest<{ addresses?: any[] }>('/api/auth/addresses', { requireAuth: true });
  return (data.addresses || []).map((item: any) => ({ id: item.id, label: item.label, recipientName: item.recipient_name, phone: item.phone, streetAddress: item.street_address, apartment: item.apartment || undefined, city: item.city, division: item.division || undefined, district: item.district || undefined, upazila: item.upazila || undefined, thana: item.thana || undefined, postalCode: item.postal_code || undefined, tag: item.tag, isDefault: item.is_default, notes: item.notes || undefined }));
}

export async function createSavedAddress(address: Omit<SavedAddress, 'id'>): Promise<SavedAddress> {
  const data = await apiRequest<{ address: any }>('/api/auth/addresses', {
    method: 'POST',
    json: true,
    body: JSON.stringify(address),
  });
  const item = data.address;
  return { id: item.id, label: item.label, recipientName: item.recipient_name, phone: item.phone, streetAddress: item.street_address, apartment: item.apartment || undefined, city: item.city, division: item.division || undefined, district: item.district || undefined, upazila: item.upazila || undefined, thana: item.thana || undefined, postalCode: item.postal_code || undefined, tag: item.tag, isDefault: item.is_default, notes: item.notes || undefined };
}

export async function deleteSavedAddress(id: string): Promise<void> {
  await apiRequest(`/api/auth/addresses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function setDefaultSavedAddress(id: string): Promise<SavedAddress> {
  const data = await apiRequest<{ address: any }>(`/api/auth/addresses/${encodeURIComponent(id)}/default`, {
    method: 'PATCH',
  });
  const item = data.address;
  return { id: item.id, label: item.label, recipientName: item.recipient_name, phone: item.phone, streetAddress: item.street_address, apartment: item.apartment || undefined, city: item.city, division: item.division || undefined, district: item.district || undefined, upazila: item.upazila || undefined, thana: item.thana || undefined, postalCode: item.postal_code || undefined, tag: item.tag, isDefault: item.is_default, notes: item.notes || undefined };
}

export async function fetchAuthenticatedProfile(): Promise<unknown | null> {
  const data = await apiRequest<{ profile?: unknown }>('/api/auth/profile');
  return data.profile || null;
}

export async function fetchAuthSecurityStatus(): Promise<{
  uid: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  role: string;
  roles: string[];
  isVendor: boolean;
  kycStatus: string;
  trustLevel: number;
} | null> {
  const response = await fetch(`${API_BASE}/api/auth/security-status`, { headers: await getAuthHeaders() });
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  return data?.security || null;
}

export async function revokeAllAuthSessions(): Promise<{
  success: boolean;
  revokedAt?: string;
  serverRevocationSkipped?: boolean;
}> {
  return await apiRequest('/api/auth/revoke-sessions', {
    method: 'POST',
    json: true,
  });
}

export async function promoteToSellerApi(payload: {
  shopName: string;
  type?: 'retail' | 'wholesale' | 'service';
  address?: string;
}): Promise<{
  success: boolean;
  activeRoles: string[];
  user: Record<string, any>;
}> {
  return await apiRequest('/api/auth/promote-seller', {
    method: 'POST',
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function promoteToCreatorApi(payload?: {
  channelName?: string;
}): Promise<{
  success: boolean;
  activeRoles: string[];
  user: Record<string, any>;
}> {
  return await apiRequest('/api/auth/promote-creator', {
    method: 'POST',
    json: true,
    body: JSON.stringify(payload || {}),
  });
}

export async function updateFirebaseIdentityProfile(payload: {
  name: string;
  handle?: string;
  role: any;
  avatar?: string;
  location?: string;
  phone?: string;
}): Promise<void> {
  const { auth, updateProfile, updateUserProfileToFirestore } = await import('@/lib/firebase');
  const fUser = auth.currentUser;
  if (!fUser) return;

  await updateProfile(fUser, {
    displayName: payload.name,
    ...(payload.avatar ? { photoURL: payload.avatar } : {}),
  }).catch(() => {});

  await updateUserProfileToFirestore({
    id: fUser.uid,
    email: fUser.email || '',
    name: payload.name,
    handle: payload.handle,
    role: payload.role,
    avatar: payload.avatar,
    location: payload.location,
    emailVerified: fUser.emailVerified,
  }).catch((err) => console.warn('Firestore user profile sync warning:', err));
}

export async function uploadProfileAvatarAsset(file: File, userId: string): Promise<string | null> {
  const { uploadProfileAvatar } = await import('@/lib/firebase');
  return await uploadProfileAvatar(file, userId);
}

export async function uploadComplianceVaultAsset(
  file: File,
  ownerId: string,
  folder: 'avatars' | 'documents' | 'videos' = 'documents'
): Promise<string | null> {
  const { uploadUserAsset } = await import('@/lib/firebase');
  return await uploadUserAsset(file, ownerId, folder);
}


