import {
  SELLER_TIER_DEFINITIONS,
  TRUST_LEVEL_DEFINITIONS,
  isGovernanceRole,
  normalizeHandle,
  type BusinessRole,
  type KycStatus,
  type PublicProfileProjection,
  type SellerTier,
  type TrustLevel,
  type UserRole
} from '../../../../packages/shared/src/index.js';
import { getPersistentEscrowSummary } from '../wallet/walletService.js';
import { invalidateAuthProfileCache } from '../../middleware/requireFirebaseAuth.js';
import { isUuidString, resolveProfileUuidByAuthUid, supabaseAdmin } from '../../services/dbService.js';
import { isLiveDatabaseConfigured } from '../../config/env.js';

export interface ServerVendorDocument {
  id: string;
  type: 'Trade License' | 'NID / Passport' | 'TIN Certificate' | 'Vehicle Registration';
  fileName: string;
  fileUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
}

export interface ServerVendorProfile {
  id: string;
  handle: string;
  applicantId: string;
  storeName: string;
  legalEntityName: string;
  businessRegNumber: string;
  taxIdentificationNumber: string;
  nidNumber: string;
  sellerTier: SellerTier;
  kycStatus: KycStatus;
  trustLevel: TrustLevel;
  category: string;
  verified: boolean;
  status: 'active' | 'pending' | 'suspended';
  commissionTier: 'Standard 8%' | 'Wholesale 4%' | 'Enterprise 2.5%';
  rating: number;
  totalSales: number;
  location: string;
  isOpen?: boolean;
  openingHoursLabel?: string;
  coordinates?: { lat: number; lng: number };
  createdAt: string;
  activeRoles: BusinessRole[];
  documents: ServerVendorDocument[];
  payoutAccount: {
    type: 'Bank Account' | 'bKash Merchant' | 'Nagad Merchant' | 'Rocket';
    accountName: string;
    accountNumber: string;
    routingNumber?: string;
  };
}

export interface KycApplicationRecord {
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
  documents: ServerVendorDocument[];
  status: KycStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  vendorId: string;
}

const seededStores: ServerVendorProfile[] = [
  {
    id: 'store_dhaka_electro',
    handle: 'technova_bd_flagship',
    applicantId: 'usr_vendor_1',
    storeName: 'TechNova BD Flagship',
    legalEntityName: 'TechNova Bangladesh Ltd.',
    businessRegNumber: 'TRD-DHK-2025-4410',
    taxIdentificationNumber: 'TIN-880192837',
    nidNumber: '1991448273610',
    sellerTier: 'brand_seller',
    kycStatus: 'approved',
    trustLevel: 5,
    category: 'retail',
    verified: true,
    status: 'active',
    commissionTier: 'Standard 8%',
    rating: 4.9,
    totalSales: 482500,
    location: 'Bashundhara City, Dhaka',
    isOpen: true,
    openingHoursLabel: '10:00 AM – 9:30 PM',
    coordinates: { lat: 23.751, lng: 90.3905 },
    createdAt: '2026-01-12T08:00:00Z',
    activeRoles: ['retail_merchant', 'service_provider'],
    documents: [
      { id: 'doc_seed_1', type: 'Trade License', fileName: 'TechNova_Trade_2026.pdf', status: 'verified', uploadedAt: '2026-01-12' },
      { id: 'doc_seed_2', type: 'NID / Passport', fileName: 'Director_NID_Verified.jpg', status: 'verified', uploadedAt: '2026-01-12' }
    ],
    payoutAccount: {
      type: 'bKash Merchant',
      accountName: 'TechNova Bangladesh Ltd.',
      accountNumber: '01711-889900'
    }
  },
  {
    id: 'store_chawkbazar_bulk',
    handle: 'chawkbazar_wholesale_syndicate',
    applicantId: 'usr_vendor_2',
    storeName: 'Chawkbazar Wholesale Syndicate',
    legalEntityName: 'Al-Madina Textiles & Wholesale Co.',
    businessRegNumber: 'TRD-CHWK-2024-9012',
    taxIdentificationNumber: 'TIN-773399110',
    nidNumber: '1986441002938',
    sellerTier: 'wholesale_seller',
    kycStatus: 'approved',
    trustLevel: 6,
    category: 'wholesale',
    verified: true,
    status: 'active',
    commissionTier: 'Wholesale 4%',
    rating: 4.8,
    totalSales: 1940000,
    location: 'Chawkbazar, Old Dhaka',
    isOpen: true,
    openingHoursLabel: '8:30 AM – 8:00 PM',
    coordinates: { lat: 23.7152, lng: 90.3965 },
    createdAt: '2025-11-20T08:00:00Z',
    activeRoles: ['wholesale_supplier', 'retail_merchant'],
    documents: [
      { id: 'doc_seed_3', type: 'Trade License', fileName: 'Chawk_Trade_License.pdf', status: 'verified', uploadedAt: '2025-11-20' },
      { id: 'doc_seed_4', type: 'TIN Certificate', fileName: 'eTIN_773399110.pdf', status: 'verified', uploadedAt: '2025-11-20' }
    ],
    payoutAccount: {
      type: 'Bank Account',
      accountName: 'Al-Madina Textiles Co.',
      accountNumber: '110200334455',
      routingNumber: '090270012'
    }
  },
  {
    id: 'store_gazipur_factory',
    handle: 'gazipur_knitwear_oem_mills',
    applicantId: 'usr_vendor_3',
    storeName: 'Gazipur Knitwear OEM Mills',
    legalEntityName: 'Padma Apparel Exports Ltd.',
    businessRegNumber: 'EPB-EXP-2024-771',
    taxIdentificationNumber: 'TIN-662200441',
    nidNumber: '1982003948172',
    sellerTier: 'factory_seller',
    kycStatus: 'approved',
    trustLevel: 7,
    category: 'wholesale',
    verified: true,
    status: 'active',
    commissionTier: 'Enterprise 2.5%',
    rating: 4.95,
    totalSales: 6240000,
    location: 'BSCIC Industrial Area, Gazipur',
    isOpen: true,
    openingHoursLabel: '8:00 AM – 6:00 PM',
    coordinates: { lat: 23.9999, lng: 90.4203 },
    createdAt: '2025-09-05T08:00:00Z',
    activeRoles: ['wholesale_supplier', 'rideshare_driver'],
    documents: [
      { id: 'doc_seed_5', type: 'Trade License', fileName: 'EPB_Factory_License.pdf', status: 'verified', uploadedAt: '2025-09-05' },
      { id: 'doc_seed_6', type: 'NID / Passport', fileName: 'MD_Passport_Scan.pdf', status: 'verified', uploadedAt: '2025-09-05' }
    ],
    payoutAccount: {
      type: 'Bank Account',
      accountName: 'Padma Apparel Exports Ltd.',
      accountNumber: '205011229900',
      routingNumber: '125260431'
    }
  }
];

const vendorStoreRegistry = new Map<string, ServerVendorProfile>(
  seededStores.map((s) => [s.id, s])
);

const kycApplicationQueue: KycApplicationRecord[] = [
  {
    id: 'KYC-2026-104',
    applicantId: 'usr_pending_1',
    storeName: 'Sylhet Organic Tea & Spices',
    legalEntityName: 'Surma Agro Valley Traders',
    sellerTier: 'wholesale_seller',
    nidNumber: '1993558102934',
    businessRegNumber: 'TRD-SYL-2026-3318',
    taxIdentificationNumber: 'TIN-551109234',
    payoutProvider: 'bKash Merchant',
    payoutNumber: '01819-445566',
    activeRoles: ['retail_merchant', 'wholesale_supplier'],
    documents: [
      { id: 'doc_q_1', type: 'Trade License', fileName: 'Sylhet_CityCorp_License.pdf', status: 'pending', uploadedAt: '2026-11-11' },
      { id: 'doc_q_2', type: 'NID / Passport', fileName: 'Proprietor_NID_1993.jpg', status: 'pending', uploadedAt: '2026-11-11' }
    ],
    status: 'under_review',
    submittedAt: '2026-11-11T14:22:00Z',
    vendorId: 'store_sylhet_tea'
  }
];

export interface VendorSubmissionPayload {
  applicantId?: string;
  handle?: string;
  storeName?: string;
  tradingName?: string;
  legalEntityName?: string;
  sellerTier?: SellerTier;
  category?: string;
  nidNumber?: string;
  businessRegistrationNumber?: string;
  taxIdentificationNumber?: string;
  activeRoles?: BusinessRole[];
  payoutAccount?: {
    type: 'Bank Account' | 'bKash Merchant' | 'Nagad Merchant' | 'Rocket';
    accountName?: string;
    accountNumber: string;
    routingNumber?: string;
  };
  documents?: ServerVendorDocument[];
  location?: string;
}

export function computeTrustLevel(payload: {
  nidNumber?: string;
  businessRegNumber?: string;
  taxIdentificationNumber?: string;
  sellerTier?: SellerTier;
}): TrustLevel {
  let level: TrustLevel = 2;
  if (payload.nidNumber && payload.nidNumber.trim().length >= 8) {
    level = 4;
  }
  if (
    level >= 4 &&
    payload.businessRegNumber &&
    payload.businessRegNumber.trim().length >= 5 &&
    payload.taxIdentificationNumber &&
    payload.taxIdentificationNumber.trim().length >= 5
  ) {
    level = 5;
  }
  if (
    level >= 5 &&
    (payload.sellerTier === 'factory_seller' || payload.sellerTier === 'importer')
  ) {
    level = 6;
  }
  if (level >= 5 && payload.sellerTier === 'exporter') {
    level = 7;
  }
  return level;
}

export function submitVendorKycApplication(payload: VendorSubmissionPayload): {
  application: KycApplicationRecord;
  vendorProfile: ServerVendorProfile;
  trustMeta: (typeof TRUST_LEVEL_DEFINITIONS)[TrustLevel];
} {
  const storeName = (payload.storeName || payload.tradingName || 'Verified Merchant Store').trim();
  const sellerTier: SellerTier = payload.sellerTier || 'retail_seller';
  const tierMeta =
    SELLER_TIER_DEFINITIONS.find((t) => t.tier === sellerTier) || SELLER_TIER_DEFINITIONS[0];

  const nidNumber = (payload.nidNumber || '').trim();
  const businessRegNumber = (payload.businessRegistrationNumber || `TRD-2026-${Math.floor(1000 + Math.random() * 9000)}`).trim();
  const taxIdentificationNumber = (payload.taxIdentificationNumber || '').trim();

  const docs: ServerVendorDocument[] =
    Array.isArray(payload.documents) && payload.documents.length > 0
      ? payload.documents.map((d, i) => ({
          id: d.id || `doc_${Date.now()}_${i}`,
          type: d.type,
          fileName: d.fileName,
          ...(typeof d.fileUrl === 'string' && d.fileUrl.startsWith('https://')
            ? { fileUrl: d.fileUrl.slice(0, 512) }
            : {}),
          status: 'pending' as const,
          uploadedAt: new Date().toISOString().split('T')[0]
        }))
      : [
          {
            id: `doc_${Date.now()}_nid`,
            type: 'NID / Passport',
            fileName: `NID_${nidNumber || 'Submitted'}.jpg`,
            status: 'pending' as const,
            uploadedAt: new Date().toISOString().split('T')[0]
          },
          {
            id: `doc_${Date.now()}_trd`,
            type: 'Trade License',
            fileName: `${businessRegNumber}.pdf`,
            status: 'pending' as const,
            uploadedAt: new Date().toISOString().split('T')[0]
          }
        ];

  const hasCompleteCredentials = nidNumber.length >= 10 && businessRegNumber.length >= 5;
  // Zero Demo-Bypass Rule: Merchant KYC must always be reviewed and approved by Platform Governance.
  const kycStatus: KycStatus = hasCompleteCredentials ? 'under_review' : 'submitted';
  const trustLevel = computeTrustLevel({
    nidNumber,
    businessRegNumber,
    taxIdentificationNumber,
    sellerTier
  });

  const vendorId = `vnd_${Date.now()}`;
  const vendorHandle = normalizeHandle(payload.handle || storeName);
  const vendorProfile: ServerVendorProfile = {
    id: vendorId,
    handle: vendorHandle,
    applicantId: payload.applicantId || 'user_me',
    storeName,
    legalEntityName: (payload.legalEntityName || storeName).trim(),
    businessRegNumber,
    taxIdentificationNumber: taxIdentificationNumber || 'TIN-PENDING',
    nidNumber: nidNumber || 'NID-PENDING',
    sellerTier,
    kycStatus,
    trustLevel,
    category: payload.category || (sellerTier.includes('wholesale') || sellerTier === 'factory_seller' ? 'wholesale' : 'retail'),
    verified: false,
    status: 'pending',
    commissionTier: tierMeta.commissionLabel,
    rating: 5.0,
    totalSales: 0,
    location: payload.location || 'Dhaka Central Commercial Hub',
    isOpen: true,
    openingHoursLabel: '9:00 AM – 9:00 PM',
    createdAt: new Date().toISOString(),
    activeRoles: payload.activeRoles && payload.activeRoles.length > 0 ? payload.activeRoles : ['retail_merchant'],
    documents: docs,
    payoutAccount: {
      type: payload.payoutAccount?.type || 'bKash Merchant',
      accountName: payload.payoutAccount?.accountName || storeName,
      accountNumber: payload.payoutAccount?.accountNumber || '01700000000',
      routingNumber: payload.payoutAccount?.routingNumber
    }
  };

  vendorStoreRegistry.set(vendorId, vendorProfile);

  const application: KycApplicationRecord = {
    id: `KYC-${Date.now().toString().slice(-6)}`,
    applicantId: vendorProfile.applicantId,
    storeName: vendorProfile.storeName,
    legalEntityName: vendorProfile.legalEntityName,
    sellerTier,
    nidNumber: vendorProfile.nidNumber,
    businessRegNumber: vendorProfile.businessRegNumber,
    taxIdentificationNumber: vendorProfile.taxIdentificationNumber,
    payoutProvider: vendorProfile.payoutAccount.type,
    payoutNumber: vendorProfile.payoutAccount.accountNumber,
    activeRoles: vendorProfile.activeRoles,
    documents: docs,
    status: kycStatus,
    submittedAt: new Date().toISOString(),
    reviewedAt: undefined,
    reviewedBy: undefined,
    vendorId
  };

  kycApplicationQueue.unshift(application);

  return {
    application,
    vendorProfile,
    trustMeta: TRUST_LEVEL_DEFINITIONS[trustLevel]
  };
}

export async function syncKycSubmissionToDatabase(
  applicantAuthUid: string,
  vendorProfile: ServerVendorProfile
): Promise<void> {
  if (!supabaseAdmin || !applicantAuthUid) return;
  try {
    const profileUuid = await resolveProfileUuidByAuthUid(applicantAuthUid);
    if (!profileUuid) return;

    const mappedCategory = ['wholesale', 'retail', 'restaurant', 'services', 'rideshare', 'grocery'].includes(
      vendorProfile.category
    )
      ? vendorProfile.category
      : 'retail';

    await supabaseAdmin
      .from('private_user_details')
      .upsert(
        {
          profile_id: profileUuid,
          nid_passport_number: vendorProfile.nidNumber,
          tax_identification_no: vendorProfile.taxIdentificationNumber,
          payout_bank_name: vendorProfile.payoutAccount.type,
          payout_account_no: vendorProfile.payoutAccount.accountNumber,
          payout_routing_no: vendorProfile.payoutAccount.routingNumber || null,
        },
        { onConflict: 'profile_id' }
      );

    const storeHandle = `${normalizeHandle(vendorProfile.handle || vendorProfile.storeName).slice(0, 48)}_${profileUuid.slice(0, 6)}`;
    const { data: existingStore } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('owner_id', profileUuid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let storeId = existingStore?.id ? String(existingStore.id) : null;
    if (storeId) {
      await supabaseAdmin
        .from('stores')
        .update({
          store_name: vendorProfile.storeName,
          legal_entity_name: vendorProfile.legalEntityName,
          business_reg_no: vendorProfile.businessRegNumber,
          tax_id: vendorProfile.taxIdentificationNumber,
          seller_tier: vendorProfile.sellerTier,
          kyc_status: vendorProfile.kycStatus,
          category: mappedCategory,
          commission_tier: vendorProfile.commissionTier,
          status: 'pending',
          is_verified: false,
        })
        .eq('id', storeId);
    } else {
      const inserted = await supabaseAdmin
        .from('stores')
        .insert({
          owner_id: profileUuid,
          handle: storeHandle,
          store_name: vendorProfile.storeName,
          legal_entity_name: vendorProfile.legalEntityName,
          business_reg_no: vendorProfile.businessRegNumber,
          tax_id: vendorProfile.taxIdentificationNumber,
          seller_tier: vendorProfile.sellerTier,
          kyc_status: vendorProfile.kycStatus,
          category: mappedCategory,
          commission_tier: vendorProfile.commissionTier,
          status: 'pending',
          is_verified: false,
        })
        .select('id')
        .maybeSingle();
      storeId = inserted.data?.id ? String(inserted.data.id) : null;
    }

    if (storeId) {
      await supabaseAdmin
        .from('vendor_memberships')
        .upsert(
          {
            store_id: storeId,
            profile_id: profileUuid,
            active_roles: vendorProfile.activeRoles,
            status: 'pending',
            is_primary: true,
          },
          { onConflict: 'store_id,profile_id' }
        );
    }

    invalidateAuthProfileCache(applicantAuthUid);
  } catch (err) {
    console.warn('[vendorService] Non-fatal Supabase KYC submission sync warning:', err);
  }
}

export async function getKycApplicationsForUser(applicantAuthUid: string): Promise<{
  applications: KycApplicationRecord[];
  latestStatus: KycStatus;
  verifiedStore?: Record<string, unknown> | null;
}> {
  const memApps = kycApplicationQueue.filter((app) => app.applicantId === applicantAuthUid);
  let dbStore: Record<string, unknown> | null = null;

  if (supabaseAdmin && applicantAuthUid) {
    try {
      const profileUuid = await resolveProfileUuidByAuthUid(applicantAuthUid);
      if (profileUuid) {
        const { data } = await supabaseAdmin
          .from('stores')
          .select('id, store_name, kyc_status, seller_tier, is_verified, status, commission_tier, created_at')
          .eq('owner_id', profileUuid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          dbStore = data;
        }
      }
    } catch {
      // Non-fatal fallback to in-memory status
    }
  }

  const latestStatus =
    (dbStore?.kyc_status as KycStatus | undefined) ||
    memApps[0]?.status ||
    'none';

  return {
    applications: memApps,
    latestStatus,
    verifiedStore: dbStore,
  };
}

function mapDbStoreToVendorProfile(
  row: Record<string, any>,
  ownerProfile?: Record<string, any> | null,
  privateDetail?: Record<string, any> | null,
  activeRoles?: string[]
): ServerVendorProfile {
  const sellerTier = (row.seller_tier || 'retail_seller') as SellerTier;
  const kycStatus = (row.kyc_status || (row.is_verified ? 'approved' : 'submitted')) as KycStatus;
  const nidNumber = String(privateDetail?.nid_passport_number || 'NID-ON-FILE');
  const businessRegNumber = String(row.business_reg_no || 'REG-ON-FILE');
  const taxIdentificationNumber = String(row.tax_id || privateDetail?.tax_identification_no || 'TIN-ON-FILE');
  const trustLevel = Number(
    ownerProfile?.trust_level ||
      computeTrustLevel({ nidNumber, businessRegNumber, taxIdentificationNumber, sellerTier })
  ) as TrustLevel;

  return {
    id: String(row.id),
    handle: String(row.handle || normalizeHandle(String(row.store_name || 'store'))),
    applicantId: String(ownerProfile?.auth_uid || row.owner_id || ''),
    storeName: String(row.store_name || 'Verified Merchant Store'),
    legalEntityName: String(row.legal_entity_name || row.store_name || ''),
    businessRegNumber,
    taxIdentificationNumber,
    nidNumber,
    sellerTier,
    kycStatus,
    trustLevel,
    category: String(row.category || 'retail'),
    verified: Boolean(row.is_verified),
    status: (row.status || 'pending') as ServerVendorProfile['status'],
    commissionTier: (row.commission_tier || 'Standard 8%') as ServerVendorProfile['commissionTier'],
    rating: Number(row.rating ?? 5.0),
    totalSales: Number(row.total_sales ?? 0),
    location: String(ownerProfile?.location || 'Dhaka, Bangladesh'),
    isOpen: row.is_open !== false,
    openingHoursLabel: String(row.opening_hours_label || '9:00 AM – 9:00 PM'),
    coordinates:
      row.lat != null && row.lng != null ? { lat: Number(row.lat), lng: Number(row.lng) } : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    activeRoles: (Array.isArray(activeRoles) && activeRoles.length > 0
      ? activeRoles
      : ['retail_merchant']) as BusinessRole[],
    documents: [],
    payoutAccount: {
      type: (privateDetail?.payout_bank_name || 'bKash Merchant') as ServerVendorProfile['payoutAccount']['type'],
      accountName: String(row.legal_entity_name || row.store_name || ''),
      accountNumber: String(privateDetail?.payout_account_no || '01700000000'),
      routingNumber: privateDetail?.payout_routing_no ? String(privateDetail.payout_routing_no) : undefined,
    },
  };
}

export async function listKycQueue(requesterRole?: UserRole): Promise<{
  authorized: boolean;
  applications: KycApplicationRecord[];
}> {
  if (!isGovernanceRole(requesterRole)) {
    return { authorized: false, applications: [] };
  }

  if (supabaseAdmin) {
    try {
      const { data: storesRows, error } = await supabaseAdmin
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(storesRows) && storesRows.length > 0) {
        const ownerIds = Array.from(new Set(storesRows.map((s: any) => String(s.owner_id)).filter(Boolean)));
        const [{ data: profileRows }, { data: privateRows }, { data: membershipRows }] = await Promise.all([
          supabaseAdmin.from('profiles').select('id, auth_uid, name, email, trust_level, location').in('id', ownerIds),
          supabaseAdmin.from('private_user_details').select('*').in('profile_id', ownerIds),
          supabaseAdmin.from('vendor_memberships').select('store_id, profile_id, active_roles').in('profile_id', ownerIds),
        ]);

        const profileById = new Map((profileRows || []).map((p: any) => [String(p.id), p]));
        const privateByProfile = new Map((privateRows || []).map((d: any) => [String(d.profile_id), d]));
        const rolesByStore = new Map((membershipRows || []).map((m: any) => [String(m.store_id), m.active_roles]));

        const dbApps: KycApplicationRecord[] = storesRows.map((row: any) => {
          const prof = profileById.get(String(row.owner_id));
          const priv = privateByProfile.get(String(row.owner_id));
          const roles = (rolesByStore.get(String(row.id)) || ['retail_merchant']) as BusinessRole[];
          return {
            id: String(row.id),
            applicantId: String(prof?.auth_uid || row.owner_id),
            storeName: String(row.store_name),
            legalEntityName: String(row.legal_entity_name || row.store_name),
            sellerTier: (row.seller_tier || 'retail_seller') as SellerTier,
            nidNumber: String(priv?.nid_passport_number || 'NID-ON-FILE'),
            businessRegNumber: String(row.business_reg_no || 'REG-ON-FILE'),
            taxIdentificationNumber: String(row.tax_id || priv?.tax_identification_no || 'TIN-ON-FILE'),
            payoutProvider: String(priv?.payout_bank_name || 'bKash Merchant'),
            payoutNumber: String(priv?.payout_account_no || '01700000000'),
            activeRoles: roles,
            documents: [],
            status: (row.kyc_status || (row.is_verified ? 'approved' : 'under_review')) as KycStatus,
            submittedAt: String(row.created_at || new Date().toISOString()),
            vendorId: String(row.id),
          };
        });

        // Merge any newly added in-memory entries whose applicantId isn't already represented by a DB row
        const seenApplicants = new Set(dbApps.map((a) => `${a.applicantId}:${a.storeName}`));
        const extraMem = kycApplicationQueue.filter(
          (m) => !seenApplicants.has(`${m.applicantId}:${m.storeName}`)
        );
        return { authorized: true, applications: [...dbApps, ...extraMem] };
      }
    } catch {
      // Fallback cleanly to memory queue below
    }
  }

  return { authorized: true, applications: kycApplicationQueue };
}

export async function decideKycApplication(params: {
  applicationId: string;
  decision: 'approved' | 'rejected' | 'suspended';
  reviewerEmail: string;
  requesterRole?: UserRole;
  note?: string;
}): Promise<{ ok: boolean; statusCode: number; error?: string; application?: KycApplicationRecord }> {
  if (!isGovernanceRole(params.requesterRole)) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Admin or Super Admin governance permissions required to approve merchant KYC.'
    };
  }

  let app = kycApplicationQueue.find((a) => a.id === params.applicationId || a.vendorId === params.applicationId);

  if (!app && supabaseAdmin && isUuidString(params.applicationId)) {
    const { data: storeRow } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', params.applicationId)
      .maybeSingle();

    if (storeRow) {
      const { data: ownerProf } = await supabaseAdmin
        .from('profiles')
        .select('auth_uid, name')
        .eq('id', storeRow.owner_id)
        .maybeSingle();
      app = {
        id: String(storeRow.id),
        applicantId: String(ownerProf?.auth_uid || storeRow.owner_id),
        storeName: String(storeRow.store_name),
        legalEntityName: String(storeRow.legal_entity_name || storeRow.store_name),
        sellerTier: (storeRow.seller_tier || 'retail_seller') as SellerTier,
        nidNumber: 'ON-FILE',
        businessRegNumber: String(storeRow.business_reg_no || ''),
        taxIdentificationNumber: String(storeRow.tax_id || ''),
        payoutProvider: 'bKash Merchant',
        payoutNumber: '',
        activeRoles: ['retail_merchant'],
        documents: [],
        status: params.decision,
        submittedAt: String(storeRow.created_at || new Date().toISOString()),
        vendorId: String(storeRow.id),
      };
    }
  }

  if (!app) {
    return { ok: false, statusCode: 404, error: 'KYC application record not found.' };
  }

  app.status = params.decision;
  app.reviewedAt = new Date().toISOString();
  app.reviewedBy = params.reviewerEmail || 'Platform Governance';
  app.reviewNote = params.note;
  app.documents = app.documents.map((doc) => ({
    ...doc,
    status: params.decision === 'approved' ? 'verified' : params.decision === 'rejected' ? 'rejected' : 'pending'
  }));

  const store = vendorStoreRegistry.get(app.vendorId);
  if (store) {
    store.kycStatus = params.decision;
    store.verified = params.decision === 'approved';
    store.status = params.decision === 'approved' ? 'active' : params.decision === 'suspended' ? 'suspended' : 'pending';
    store.documents = app.documents;
    if (params.decision === 'approved') {
      store.trustLevel = computeTrustLevel({
        nidNumber: store.nidNumber,
        businessRegNumber: store.businessRegNumber,
        taxIdentificationNumber: store.taxIdentificationNumber,
        sellerTier: store.sellerTier
      });
    }
  } else if (params.decision === 'approved') {
    const newStore: ServerVendorProfile = {
      id: app.vendorId,
      handle: normalizeHandle(app.storeName),
      applicantId: app.applicantId,
      storeName: app.storeName,
      legalEntityName: app.legalEntityName,
      businessRegNumber: app.businessRegNumber,
      taxIdentificationNumber: app.taxIdentificationNumber,
      nidNumber: app.nidNumber,
      sellerTier: app.sellerTier,
      kycStatus: 'approved',
      trustLevel: 5,
      category: app.sellerTier.includes('wholesale') ? 'wholesale' : 'retail',
      verified: true,
      status: 'active',
      commissionTier: app.sellerTier === 'wholesale_seller' ? 'Wholesale 4%' : 'Standard 8%',
      rating: 5.0,
      totalSales: 0,
      location: 'Sylhet & Dhaka Logistics Network',
      isOpen: true,
      openingHoursLabel: '9:00 AM – 9:00 PM',
      createdAt: app.submittedAt,
      activeRoles: app.activeRoles,
      documents: app.documents,
      payoutAccount: {
        type: 'bKash Merchant',
        accountName: app.storeName,
        accountNumber: app.payoutNumber
      }
    };
    vendorStoreRegistry.set(app.vendorId, newStore);
  }

  return { ok: true, statusCode: 200, application: app };
}

export async function syncKycDecisionToDatabase(application: KycApplicationRecord): Promise<void> {
  if (!supabaseAdmin || !application.applicantId) return;
  try {
    const profileUuid = await resolveProfileUuidByAuthUid(application.applicantId);
    if (!profileUuid) return;

    const isApproved = application.status === 'approved';
    const membershipStatus = isApproved
      ? 'active'
      : application.status === 'suspended'
      ? 'suspended'
      : 'revoked';

    await supabaseAdmin
      .from('stores')
      .update({
        kyc_status: application.status,
        is_verified: isApproved,
        status: isApproved ? 'active' : application.status === 'suspended' ? 'suspended' : 'pending',
      })
      .eq('owner_id', profileUuid);

    await supabaseAdmin
      .from('vendor_memberships')
      .update({
        status: membershipStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileUuid);

    if (isApproved) {
      const { data: profileRow } = await supabaseAdmin
        .from('profiles')
        .select('role, active_roles, trust_level')
        .eq('id', profileUuid)
        .maybeSingle();

      const existingRoles = Array.isArray(profileRow?.active_roles) ? profileRow.active_roles : ['consumer'];
      const nextActiveRoles = Array.from(new Set([...existingRoles, 'vendor']));
      const nextRole =
        profileRow?.role && ['moderator', 'admin', 'super_admin'].includes(profileRow.role)
          ? profileRow.role
          : 'vendor';
      const nextTrust = Math.max(Number(profileRow?.trust_level || 1), 5);

      await supabaseAdmin
        .from('profiles')
        .update({
          role: nextRole,
          active_roles: nextActiveRoles,
          trust_level: nextTrust,
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileUuid);
    }

    invalidateAuthProfileCache(application.applicantId);
  } catch (err) {
    console.warn('[vendorService] Non-fatal Supabase KYC decision sync warning:', err);
  }
}

export async function updateGovernanceRoleInDb(params: {
  targetEmail?: string;
  targetAuthUid?: string;
  newRole: UserRole;
}): Promise<{ ok: boolean; statusCode: number; error?: string; profile?: Record<string, unknown> }> {
  if (!supabaseAdmin) {
    return { ok: true, statusCode: 200 };
  }

  let query = supabaseAdmin.from('profiles').select('id, auth_uid, email, name, role, active_roles');
  if (params.targetAuthUid) {
    query = query.eq('auth_uid', params.targetAuthUid);
  } else if (params.targetEmail) {
    query = query.ilike('email', params.targetEmail.trim());
  } else {
    return { ok: false, statusCode: 400, error: 'Target email or user ID is required.' };
  }

  const { data: target, error } = await query.maybeSingle();
  if (error || !target) {
    return {
      ok: false,
      statusCode: 404,
      error: 'No registered user profile matched that email in Supabase yet.',
    };
  }

  const nextActiveRoles =
    params.newRole === 'consumer'
      ? ['consumer']
      : Array.from(new Set([...(Array.isArray(target.active_roles) ? target.active_roles : ['consumer']), params.newRole]));

  const updated = await supabaseAdmin
    .from('profiles')
    .update({
      role: params.newRole,
      active_roles: nextActiveRoles,
      updated_at: new Date().toISOString(),
    })
    .eq('id', target.id)
    .select('id, auth_uid, email, name, role, active_roles')
    .single();

  if (updated.error) {
    return { ok: false, statusCode: 500, error: 'Unable to update governance role in Supabase.' };
  }

  if (target.auth_uid) {
    invalidateAuthProfileCache(String(target.auth_uid));
  }

  return { ok: true, statusCode: 200, profile: updated.data };
}

export type PublicStoreSummary = Omit<
  ServerVendorProfile,
  'nidNumber' | 'taxIdentificationNumber' | 'businessRegNumber' | 'payoutAccount' | 'documents' | 'applicantId'
>;

function sanitizePublicStore(store: ServerVendorProfile): PublicStoreSummary {
  const {
    nidNumber: _nid,
    taxIdentificationNumber: _tin,
    businessRegNumber: _reg,
    payoutAccount: _payout,
    documents: _docs,
    applicantId: _applicantId,
    ...publicFields
  } = store;
  return publicFields;
}

export async function isStoreOwnedByUser(storeId: string | undefined, uid: string | undefined): Promise<boolean> {
  if (!storeId || !uid) return false;
  const memStore = vendorStoreRegistry.get(storeId);
  if (memStore && memStore.applicantId === uid) return true;

  if (supabaseAdmin) {
    try {
      const { data: storeRow } = await (isUuidString(storeId)
        ? supabaseAdmin.from('stores').select('owner_id').eq('id', storeId).maybeSingle()
        : supabaseAdmin.from('stores').select('owner_id').eq('handle', storeId).maybeSingle());
      if (storeRow?.owner_id) {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('auth_uid')
          .eq('id', storeRow.owner_id)
          .maybeSingle();
        if (prof?.auth_uid === uid) return true;
      }
    } catch {
      // Fallback cleanly
    }
  }

  return false;
}

export async function getStoreOwnerId(storeId: string): Promise<string | null> {
  if (supabaseAdmin) {
    try {
      const { data: storeRow } = await (isUuidString(storeId)
        ? supabaseAdmin.from('stores').select('owner_id').eq('id', storeId).maybeSingle()
        : supabaseAdmin.from('stores').select('owner_id').eq('handle', storeId).maybeSingle());
      if (storeRow?.owner_id) {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('auth_uid')
          .eq('id', storeRow.owner_id)
          .maybeSingle();
        if (prof?.auth_uid) return String(prof.auth_uid);
      }
    } catch {
      // Fallback below
    }
  }
  return vendorStoreRegistry.get(storeId)?.applicantId || null;
}

export async function listPublicStores(): Promise<PublicStoreSummary[]> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('stores')
        .select('*')
        .eq('is_verified', true)
        .neq('status', 'suspended')
        .order('total_sales', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => sanitizePublicStore(mapDbStoreToVendorProfile(row)));
      }
    } catch {
      // Fallback cleanly if table/network unavailable
    }
  }

  if (isLiveDatabaseConfigured() && supabaseAdmin) {
    // Allow seeded showcase only if DB has zero verified stores yet so empty storefronts still render
    return Array.from(vendorStoreRegistry.values())
      .filter((s) => s.status !== 'suspended' && s.verified)
      .map(sanitizePublicStore);
  }

  return Array.from(vendorStoreRegistry.values())
    .filter((s) => s.status !== 'suspended' && s.verified)
    .map(sanitizePublicStore);
}

export async function getPublicStoreById(storeId: string): Promise<PublicStoreSummary | null> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await (isUuidString(storeId)
        ? supabaseAdmin.from('stores').select('*').eq('id', storeId).maybeSingle()
        : supabaseAdmin.from('stores').select('*').eq('handle', storeId).maybeSingle());

      if (!error && data && data.status !== 'suspended' && data.is_verified) {
        return sanitizePublicStore(mapDbStoreToVendorProfile(data));
      }
    } catch {
      // Fallback to registry
    }
  }

  const store = vendorStoreRegistry.get(storeId);
  if (!store || store.status === 'suspended' || !store.verified) return null;
  return sanitizePublicStore(store);
}

/**
 * Strictly Zero-PII Public Profile Projection lookup by @handle or storeId.
 * Strips nidNumber, taxIdentificationNumber, businessRegNumber, payoutAccount, and emails.
 */
export async function getPublicProfileByHandle(handleOrId: string): Promise<PublicProfileProjection | null> {
  const normalized = normalizeHandle(handleOrId);

  if (supabaseAdmin) {
    try {
      const cleanId = handleOrId.trim();
      const { data: storeRow } = await (isUuidString(cleanId)
        ? supabaseAdmin
            .from('stores')
            .select('*')
            .or(`id.eq.${cleanId},handle.eq.${normalized}`)
            .neq('status', 'suspended')
            .maybeSingle()
        : supabaseAdmin
            .from('stores')
            .select('*')
            .ilike('handle', normalized)
            .neq('status', 'suspended')
            .maybeSingle());

      if (storeRow) {
        const { data: ownerProf } = await supabaseAdmin
          .from('profiles')
          .select('trust_level, location')
          .eq('id', storeRow.owner_id)
          .maybeSingle();

        return {
          handle: String(storeRow.handle || normalized),
          storeId: String(storeRow.id),
          displayName: String(storeRow.store_name),
          location: String(ownerProf?.location || 'Dhaka, Bangladesh'),
          verified: Boolean(storeRow.is_verified),
          trustLevel: Number(ownerProf?.trust_level || 5) as TrustLevel,
          sellerTier: (storeRow.seller_tier || 'retail_seller') as SellerTier,
          category: String(storeRow.category || 'retail'),
          rating: Number(storeRow.rating ?? 5.0),
          activeRoles: ['retail_merchant'],
          isOpen: storeRow.is_open !== false,
          openingHoursLabel: String(storeRow.opening_hours_label || '9:00 AM – 9:00 PM'),
          coordinates:
            storeRow.lat != null && storeRow.lng != null
              ? { lat: Number(storeRow.lat), lng: Number(storeRow.lng) }
              : undefined,
        };
      }
    } catch {
      // Fallback cleanly to showcase registry
    }
  }

  const matched = Array.from(vendorStoreRegistry.values()).find(
    (s) =>
      s.status !== 'suspended' &&
      (s.id === handleOrId ||
        s.applicantId === handleOrId ||
        s.handle === normalized ||
        normalizeHandle(s.storeName) === normalized)
  );

  if (!matched) return null;

  return {
    handle: matched.handle || normalizeHandle(matched.storeName),
    storeId: matched.id,
    displayName: matched.storeName,
    location: matched.location,
    verified: matched.verified,
    trustLevel: matched.trustLevel,
    sellerTier: matched.sellerTier,
    category: matched.category,
    rating: matched.rating,
    activeRoles: matched.activeRoles,
    isOpen: matched.isOpen ?? true,
    openingHoursLabel: matched.openingHoursLabel || '9:00 AM – 9:00 PM',
    coordinates: matched.coordinates
  };
}

export async function getVendorAnalytics(vendorId: string, userId = 'user_me') {
  let store: ServerVendorProfile | undefined = vendorStoreRegistry.get(vendorId);

  if (supabaseAdmin) {
    try {
      const { data: storeRow } = await (isUuidString(vendorId)
        ? supabaseAdmin.from('stores').select('*').eq('id', vendorId).maybeSingle()
        : supabaseAdmin.from('stores').select('*').eq('handle', vendorId).maybeSingle());
      if (storeRow) {
        store = mapDbStoreToVendorProfile(storeRow);
      }
    } catch {
      // Keep registry fallback
    }
  }

  const escrowSummary = await getPersistentEscrowSummary(userId);
  const grossSalesBdt = (store?.totalSales || 0) + escrowSummary.summary.totalReleased;
  const escrowHeldBdt = escrowSummary.summary.totalHeld;
  const completedEscrows = escrowSummary.escrows.filter((e) => e.status === 'released').length;
  const pendingEscrows = escrowSummary.escrows.filter((e) => e.status === 'held').length;
  const commissionRate =
    store?.commissionTier === 'Enterprise 2.5%'
      ? 0.025
      : store?.commissionTier === 'Wholesale 4%'
      ? 0.04
      : 0.08;

  return {
    vendorId,
    storeName: store?.storeName || 'PaikarMart Merchant Store',
    kycStatus: store?.kycStatus || 'approved',
    trustLevel: store?.trustLevel || 5,
    sellerTier: store?.sellerTier || 'retail_seller',
    commissionTier: store?.commissionTier || 'Standard 8%',
    metrics: {
      grossSalesBdt,
      escrowHeldBdt,
      netPayoutReadyBdt: Math.round(grossSalesBdt * (1 - commissionRate)),
      completedEscrows,
      pendingEscrows,
      rating: store?.rating || 5.0
    }
  };
}
