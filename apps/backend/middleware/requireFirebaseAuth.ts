import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import { applicationDefault, cert, getApps, initializeApp, type AppOptions } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

export interface VerifiedFirebaseAuth {
  uid: string;
  email?: string;
  phoneNumber?: string;
  emailVerified?: boolean;
  role?: string;
  roles?: string[];
  profileId?: string;
  isVendor?: boolean;
  kycStatus?: string;
  trustLevel?: number;
}

interface CachedProfileAuthMeta {
  profileId?: string;
  role?: string;
  activeRoles?: string[];
  isVendor: boolean;
  kycStatus?: string;
  trustLevel?: number;
  expiresAt: number;
}

const AUTH_PROFILE_CACHE_TTL_MS = 30_000;
const authProfileCache = new Map<string, CachedProfileAuthMeta>();

export function invalidateAuthProfileCache(uid: string): void {
  if (uid) {
    authProfileCache.delete(uid);
  }
}

function hasExplicitFirebaseCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE ||
      process.env.GOOGLE_CLOUD_PROJECT
  );
}

// On Render Free Tier or Firebase Spark without service-account IAM, calling verifyIdToken(token, true)
// attempts a GCE metadata/IAM lookup. Default revocation check off unless credentials exist and disable cleanly on first IAM error.
let revocationCheckSupported = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS
);

export function resolveFirebaseProjectId(): string | null {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }
  const candidates = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(process.cwd(), '../firebase-applet-config.json'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { projectId?: string };
        if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
          return parsed.projectId;
        }
      }
    } catch {
      // Ignore malformed optional config file
    }
  }
  return 'gen-lang-client-0609196204';
}

export function getFirebaseAdminAuth() {
  const projectId = resolveFirebaseProjectId();
  if (!projectId) return null;

  if (getApps().length > 0) {
    return getAuth(getApps()[0]);
  }

  const options: AppOptions = { projectId };
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      options.credential = cert(parsed);
    } catch {
      // Ignore malformed optional service account JSON and verify JWTs via public Google keys
    }
  } else if (hasExplicitFirebaseCredentials()) {
    options.credential = applicationDefault();
  }

  const app = initializeApp(options);
  return getAuth(app);
}

async function verifyFirebaseIdTokenSafe(token: string): Promise<DecodedIdToken> {
  const firebaseAuth = getFirebaseAdminAuth();
  if (!firebaseAuth) {
    const err = new Error('Firebase Admin authentication is not configured.') as Error & { code?: string };
    err.code = 'app/not-configured';
    throw err;
  }

  if (!revocationCheckSupported) {
    return await firebaseAuth.verifyIdToken(token);
  }

  try {
    return await firebaseAuth.verifyIdToken(token, true);
  } catch (err: any) {
    const code = String(err?.code || '');
    const msg = String(err?.message || '').toLowerCase();
    const isRevokedOrExpired =
      code === 'auth/id-token-revoked' ||
      code === 'auth/id-token-expired' ||
      code === 'auth/argument-error' ||
      code === 'auth/user-disabled';
    const isIamOrCredentialError =
      !isRevokedOrExpired &&
      (msg.includes('permission') ||
        msg.includes('iam') ||
        msg.includes('credential') ||
        msg.includes('metadata') ||
        msg.includes('access token') ||
        code === 'auth/internal-error');

    if (isIamOrCredentialError) {
      revocationCheckSupported = false;
      return await firebaseAuth.verifyIdToken(token);
    }
    throw err;
  }
}

async function loadAuthoritativeRoleMeta(uid: string): Promise<CachedProfileAuthMeta | null> {
  if (!supabaseAdmin || !uid) return null;

  const cached = authProfileCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  try {
    let profileData: any = null;
    const joined = await supabaseAdmin
      .from('profiles')
      .select('id, role, active_roles, trust_level, vendor_memberships(id, status, stores(kyc_status, is_verified, status))')
      .eq('auth_uid', uid)
      .maybeSingle();

    if (!joined.error) {
      profileData = joined.data;
    } else {
      const plain = await supabaseAdmin
        .from('profiles')
        .select('id, role, active_roles, trust_level')
        .eq('auth_uid', uid)
        .maybeSingle();
      if (!plain.error) {
        profileData = plain.data;
      }
    }

    if (!profileData) return null;

    const activeRoles: string[] = Array.isArray(profileData.active_roles)
      ? profileData.active_roles.map((r: unknown) => String(r))
      : profileData.role
      ? [String(profileData.role)]
      : ['consumer'];

    const memberships = Array.isArray(profileData.vendor_memberships) ? profileData.vendor_memberships : [];
    const hasActiveMembership = memberships.some((m: any) => !m?.status || m.status === 'active');
    const latestKycStatus = memberships.find((m: any) => m?.stores?.kyc_status)?.stores?.kyc_status;

    const meta: CachedProfileAuthMeta = {
      profileId: profileData.id ? String(profileData.id) : undefined,
      role: profileData.role ? String(profileData.role) : 'consumer',
      activeRoles,
      isVendor: profileData.role === 'vendor' || activeRoles.includes('vendor') || hasActiveMembership,
      kycStatus: latestKycStatus ? String(latestKycStatus) : undefined,
      trustLevel: typeof profileData.trust_level === 'number' ? profileData.trust_level : undefined,
      expiresAt: Date.now() + AUTH_PROFILE_CACHE_TTL_MS,
    };
    authProfileCache.set(uid, meta);
    return meta;
  } catch {
    return null;
  }
}

export const SUPER_ADMIN_EMAILS = new Set([
  'abs.munna1@gmail.com',
  'superadmin@paikarmart.com',
  'admin@paikarmart.com',
  'root.admin@paikarmart.com'
]);

async function buildVerifiedAuthContext(decoded: DecodedIdToken): Promise<VerifiedFirebaseAuth> {
  const claims = decoded as DecodedIdToken & { role?: string; roles?: string[] };
  const dbMeta = await loadAuthoritativeRoleMeta(decoded.uid);
  const isSuperAdminEmail = Boolean(decoded.email && SUPER_ADMIN_EMAILS.has(decoded.email.toLowerCase()));

  const mergedRoles = Array.from(
    new Set([
      ...(isSuperAdminEmail ? ['super_admin', 'admin', 'moderator', 'vendor', 'consumer'] : []),
      ...(dbMeta?.role ? [dbMeta.role] : []),
      ...(dbMeta?.activeRoles || []),
      ...(claims.role ? [claims.role] : []),
      ...(Array.isArray(claims.roles) ? claims.roles : []),
    ])
  );

  return {
    uid: decoded.uid,
    email: decoded.email,
    phoneNumber: decoded.phone_number,
    emailVerified: decoded.email_verified,
    role: isSuperAdminEmail ? 'super_admin' : (dbMeta?.role || claims.role || 'consumer'),
    roles: mergedRoles.length > 0 ? mergedRoles : undefined,
    profileId: dbMeta?.profileId,
    isVendor: isSuperAdminEmail || (dbMeta?.isVendor ?? (claims.role === 'vendor')),
    kycStatus: isSuperAdminEmail ? 'approved' : dbMeta?.kycStatus,
    trustLevel: isSuperAdminEmail ? 5 : dbMeta?.trustLevel,
  };
}

export function isPrivilegedRole(auth?: VerifiedFirebaseAuth): boolean {
  if (!auth) return false;
  const privileged = new Set(['admin', 'super_admin', 'moderator']);
  if (auth.role && privileged.has(auth.role)) return true;
  return Array.isArray(auth.roles) && auth.roles.some((r) => privileged.has(r));
}

export function requireRole(allowedRoles: string | string[]) {
  const allowed = new Set(Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]);
  return (_req: Request, res: Response, next: NextFunction) => {
    const auth = res.locals.auth as VerifiedFirebaseAuth | undefined;
    if (!auth) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const userRoles = [auth.role, ...(auth.roles || [])].filter(Boolean) as string[];
    if (userRoles.includes('super_admin')) {
      next();
      return;
    }
    if (allowed.has('vendor') && auth.isVendor) {
      next();
      return;
    }
    if (userRoles.some((r) => allowed.has(r))) {
      next();
      return;
    }
    res.status(403).json({
      error: 'Forbidden: Insufficient permissions for this action.',
      requiredRoles: Array.from(allowed),
    });
  };
}

export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  try {
    const decoded = await verifyFirebaseIdTokenSafe(match[1]);
    res.locals.auth = await buildVerifiedAuthContext(decoded);
    next();
  } catch (error) {
    const code = (error as { code?: string })?.code || '';
    if (code.startsWith('app/') || code.includes('network')) {
      res.status(503).json({ error: 'Firebase Admin credentials or verification service are unavailable.' });
      return;
    }
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export const ensureAuth = requireFirebaseAuth;

export async function optionalFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    next();
    return;
  }
  try {
    const decoded = await verifyFirebaseIdTokenSafe(match[1]);
    res.locals.auth = await buildVerifiedAuthContext(decoded);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

