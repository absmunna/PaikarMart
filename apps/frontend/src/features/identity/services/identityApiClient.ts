import { auth } from '@/lib/firebase';
import { IdentityVerificationPayload, IdentityVerificationResponse } from '../types';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function authHeaders(): Promise<Record<string, string>> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read document file.'));
    reader.readAsDataURL(file);
  });
}

export async function submitIdentityVerification(
  payload: IdentityVerificationPayload
): Promise<IdentityVerificationResponse> {
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

  const verification: IdentityVerificationResponse = data.verification || {
    id: `ver_${Date.now()}`,
    status: 'pending',
    documentType: payload.documentType,
    documentNumber: payload.documentNumber,
    verifiedAt: new Date().toISOString(),
  };

  if (payload.frontImage && verification.id) {
    const dataBase64 = await fileToBase64(payload.frontImage);
    await fetch(`${API_BASE}/api/identity/verification/${encodeURIComponent(verification.id)}/document`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doc_type: 'front',
        fileName: payload.frontImage.name,
        mimeType: payload.frontImage.type || 'image/jpeg',
        dataBase64,
      }),
    }).catch(() => null);
  }

  return verification;
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

export interface PendingCitizenVerificationItem {
  id: string;
  userId: string;
  authUid?: string;
  userName: string;
  userEmail?: string;
  userHandle?: string;
  documentType: string;
  documentNumber: string;
  status: 'pending' | 'under_review' | 'verified' | 'rejected';
  rejectionReason?: string;
  documents?: Array<{ id: string; doc_type: string; storage_path: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface FlaggedPostModerationItem {
  id: string;
  authorUid: string;
  contentExcerpt: string;
  flaggedKeywords: string[];
  status: 'pending_human_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export async function fetchPendingCitizenVerifications(): Promise<PendingCitizenVerificationItem[]> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE}/api/identity/verifications/pending`, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  return Array.isArray(data.verifications) ? data.verifications : [];
}

export async function reviewCitizenVerification(
  verificationId: string,
  decision: 'verified' | 'rejected',
  rejectionReason?: string
): Promise<PendingCitizenVerificationItem> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE}/api/identity/verifications/${encodeURIComponent(verificationId)}/review`, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decision, rejectionReason }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Unable to process citizen verification decision.');
  }
  return data.verification;
}

export async function fetchFlaggedPostsForModeration(): Promise<FlaggedPostModerationItem[]> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE}/api/ai/moderation/posts`, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  return Array.isArray(data.posts) ? data.posts : [];
}

export async function reviewFlaggedPost(
  postId: string,
  decision: 'approved' | 'rejected'
): Promise<FlaggedPostModerationItem> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE}/api/ai/moderation/posts/${encodeURIComponent(postId)}/review`, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decision }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Unable to update flagged post decision.');
  }
  return data.post;
}
