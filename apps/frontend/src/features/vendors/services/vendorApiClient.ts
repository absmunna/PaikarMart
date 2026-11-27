import type { PublicProfileProjection } from '@paikarmart/shared';
import { API_BASE, apiRequest, getAuthHeaders } from '@/shared/services/apiClient';
import {
  BusinessDocument,
  BusinessRole,
  AdministrativeArea,
  KycStatus,
  PayoutAccount,
  SellerTier,
  TrustLevel,
  UserRole,
  VendorProfile,
} from '@/types';

export interface VendorKycSubmissionRequest {
  applicantId: string;
  storeName: string;
  legalEntityName: string;
  sellerTier: SellerTier;
  nidNumber: string;
  businessRegistrationNumber: string;
  taxIdentificationNumber: string;
  activeRoles: BusinessRole[];
  payoutAccount: PayoutAccount;
  documents: BusinessDocument[];
  location?: string;
}

export interface KycApplicationItem {
  id: string;
  applicantId: string;
  storeName: string;
  legalEntityName: string;
  sellerTier: SellerTier;
  nidNumber: string;
  businessRegNumber: string;
  taxIdentificationNumber: string;
  payoutProvider: string;
  payoutNumber: string;
  activeRoles: BusinessRole[];
  documents: BusinessDocument[];
  status: KycStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  vendorId: string;
}

export interface VendorAnalyticsSummary {
  vendorId: string;
  storeName: string;
  kycStatus: KycStatus;
  trustLevel: TrustLevel;
  sellerTier: SellerTier;
  commissionTier: string;
  metrics: {
    grossSalesBdt: number;
    escrowHeldBdt: number;
    netPayoutReadyBdt: number;
    completedEscrows: number;
    pendingEscrows: number;
    rating: number;
  };
}

export const vendorApiClient = {
  async registerVendorKyc(payload: VendorKycSubmissionRequest): Promise<{
    application: KycApplicationItem;
    vendorProfile: VendorProfile;
    message: string;
  }> {
    return await apiRequest('/api/vendors/register', {
      method: 'POST',
      json: true,
      body: JSON.stringify(payload),
    });
  },

  async fetchVendorAnalytics(vendorId: string, userId?: string): Promise<VendorAnalyticsSummary | null> {
    void userId;
    try {
      const res = await fetch(`${API_BASE}/api/vendors/${encodeURIComponent(vendorId)}/analytics`, {
        headers: await getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.analytics || null;
    } catch {
      return null;
    }
  },

  async fetchPublicStores(): Promise<VendorProfile[]> {
    try {
      const res = await fetch(`${API_BASE}/api/vendors/stores`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.stores || [];
    } catch {
      return [];
    }
  },

  async fetchPublicStoreById(storeId: string): Promise<VendorProfile | null> {
    try {
      const res = await fetch(`${API_BASE}/api/vendors/stores/${encodeURIComponent(storeId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.store || null;
    } catch {
      return null;
    }
  },

  async fetchPublicProfileByHandle(handle: string): Promise<PublicProfileProjection | null> {
    try {
      const res = await fetch(`${API_BASE}/api/vendors/profile/${encodeURIComponent(handle)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.profile || null;
    } catch {
      return null;
    }
  },

  async fetchKycQueue(requesterRole: UserRole): Promise<KycApplicationItem[]> {
    void requesterRole;
    const data = await apiRequest<{ applications?: KycApplicationItem[] }>('/api/vendors/kyc/queue');
    return data.applications || [];
  },

  async decideKycApplication(params: {
    applicationId: string;
    decision: 'approved' | 'rejected' | 'suspended';
    requesterRole: UserRole;
    reviewerEmail: string;
    note?: string;
  }): Promise<KycApplicationItem> {
    const data = await apiRequest<{ application: KycApplicationItem }>(
      `/api/vendors/kyc/${encodeURIComponent(params.applicationId)}/decision`,
      {
        method: 'POST',
        json: true,
        body: JSON.stringify({
          decision: params.decision,
          reviewerEmail: params.reviewerEmail,
          note: params.note,
        }),
      }
    );
    return data.application;
  },

  async fetchMyKycStatus(): Promise<{
    applications: KycApplicationItem[];
    latestStatus: KycStatus;
    verifiedStore?: Record<string, unknown> | null;
    isVendor: boolean;
  } | null> {
    try {
      const res = await fetch(`${API_BASE}/api/vendors/kyc/my-status`, {
        headers: await getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateStorefrontLocation(storeAddress: string, serviceArea: AdministrativeArea): Promise<void> {
    const res = await fetch(`${API_BASE}/api/vendors/storefront/location`, {
      method: 'PATCH',
      headers: await getAuthHeaders({ json: true }),
      body: JSON.stringify({ storeAddress, serviceArea }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Unable to save storefront location.');
  },

  async updateGovernanceRole(params: {
    email?: string;
    authUid?: string;
    role: UserRole;
  }): Promise<{ success: boolean; profile?: Record<string, unknown> | null }> {
    return await apiRequest('/api/vendors/governance/roles', {
      method: 'POST',
      json: true,
      body: JSON.stringify(params),
    });
  }
};

