import { auth } from '@/lib/firebase';
import { IdentityVerificationPayload, IdentityVerificationResponse } from '../types';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function authHeaders(): Promise<Record<string, string>> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function submitIdentityVerification(
  payload: IdentityVerificationPayload
): Promise<IdentityVerificationResponse> {
  const formData = new FormData();
  formData.append('documentType', payload.documentType);
  formData.append('documentNumber', payload.documentNumber);
  if (payload.frontImage) formData.append('frontImage', payload.frontImage);
  if (payload.backImage) formData.append('backImage', payload.backImage);

  const headers = await authHeaders();

  const response = await fetch(`${API_BASE}/api/identity/verification`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to submit identity verification.');
  }

  return data.verification || {
    id: `ver_${Date.now()}`,
    status: 'verified',
    documentType: payload.documentType,
    documentNumber: payload.documentNumber,
    verifiedAt: new Date().toISOString(),
  };
}

export async function fetchIdentityStatus(verificationId: string): Promise<IdentityVerificationResponse | null> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE}/api/identity/verification/${encodeURIComponent(verificationId)}`, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  return data.verification || null;
}
