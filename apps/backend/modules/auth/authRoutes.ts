import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getFirebaseAdminAuth,
  invalidateAuthProfileCache,
  requireFirebaseAuth,
  requireRole,
  SUPER_ADMIN_EMAILS
} from '../../middleware/requireFirebaseAuth.js';
import { getRecentAuditEvents } from '../../middleware/audit.js';
import { supabaseAdmin } from '../../services/dbService.js';
import {
  createSignedAssetUrl,
  ensureStorageBucket,
  PRIVATE_ASSETS_BUCKET,
  sanitizeStorageFilename,
  uploadPublicImageBuffer
} from '../../services/storageService.js';

export const authRouter = Router();

function requireAdminDatabase(res: Response): boolean {
  if (supabaseAdmin) return true;
  res.status(503).json({ error: 'Profile database synchronization is not configured.' });
  return false;
}

function normalizePhoneInput(rawPhone: unknown): string | null {
  const trimmed = String(rawPhone || '').trim();
  if (!trimmed) return null;
  const compact = trimmed.replace(/[\s\-()]/g, '');
  if (/^01[3-9]\d{8}$/.test(compact)) {
    return `+88${compact}`;
  }
  if (/^8801[3-9]\d{8}$/.test(compact)) {
    return `+${compact}`;
  }
  if (/^\+8801[3-9]\d{8}$/.test(compact) || /^\+[1-9]\d{6,14}$/.test(compact)) {
    return compact.slice(0, 32);
  }
  return trimmed.slice(0, 32);
}

authRouter.get('/session', requireFirebaseAuth, (_req: Request, res: Response) => {
  res.json({
    success: true,
    auth: res.locals.auth,
  });
});

authRouter.get('/security-status', requireFirebaseAuth, (_req: Request, res: Response) => {
  const auth = res.locals.auth;
  res.json({
    success: true,
    security: {
      uid: auth.uid,
      email: auth.email || null,
      emailVerified: Boolean(auth.emailVerified),
      phoneNumber: auth.phoneNumber || null,
      role: auth.role || 'consumer',
      roles: auth.roles || ['consumer'],
      isVendor: Boolean(auth.isVendor),
      kycStatus: auth.kycStatus || 'none',
      trustLevel: auth.trustLevel ?? 1,
    },
  });
});

authRouter.get('/audit-log', requireFirebaseAuth, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const limit = Number(req.query?.limit || 100);
  const events = getRecentAuditEvents(Number.isFinite(limit) ? limit : 100);
  res.json({
    success: true,
    count: events.length,
    events,
  });
});

authRouter.post('/revoke-sessions', requireFirebaseAuth, async (_req: Request, res: Response) => {
  const uid = res.locals.auth.uid;
  invalidateAuthProfileCache(uid);

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    res.json({
      success: true,
      revokedAt: new Date().toISOString(),
      serverRevocationSkipped: true,
    });
    return;
  }

  try {
    await adminAuth.revokeRefreshTokens(uid);
    res.json({
      success: true,
      revokedAt: new Date().toISOString(),
      serverRevocationSkipped: false,
    });
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    // On Spark / Starter tier or Render without IAM credentials, complete local cache invalidation cleanly
    if (
      msg.includes('permission') ||
      msg.includes('iam') ||
      msg.includes('credential') ||
      msg.includes('metadata') ||
      msg.includes('access token')
    ) {
      res.json({
        success: true,
        revokedAt: new Date().toISOString(),
        serverRevocationSkipped: true,
      });
      return;
    }
    res.status(500).json({ error: 'Unable to revoke active refresh tokens.' });
  }
});

authRouter.get('/profile', requireFirebaseAuth, async (_req: Request, res: Response) => {
  if (!requireAdminDatabase(res)) return;
  const uid = res.locals.auth.uid;
  const joined = await supabaseAdmin!
    .from('profiles')
    .select('*, vendor_memberships(*, stores(*))')
    .eq('auth_uid', uid)
    .maybeSingle();

  const isSuperAdminEmail = Boolean(
    (res.locals.auth.email && SUPER_ADMIN_EMAILS.has(String(res.locals.auth.email).toLowerCase())) ||
    res.locals.auth.role === 'super_admin'
  );

  if (!joined.error) {
    const data = joined.data as Record<string, any> | null;
    if (data) {
      if (isSuperAdminEmail) {
        data.role = 'super_admin';
        data.active_roles = Array.from(new Set(['super_admin', 'admin', 'moderator', 'vendor', 'consumer', ...(data.active_roles || [])]));
        if (!data.name || data.name === 'PaikarMart User') data.name = 'PaikarMart';
        if (!data.handle) data.handle = '@paikarmart';
      }
      if (!data.kyc_status && Array.isArray(data.vendor_memberships)) {
        const storeKyc = data.vendor_memberships.find((m: any) => m?.stores?.kyc_status)?.stores?.kyc_status;
        if (storeKyc) {
          data.kyc_status = storeKyc;
        }
      }
    }
    res.json({ success: true, profile: data || null });
    return;
  }

  // Fallback if vendor_memberships/stores tables or PostgREST FK relationships are not yet provisioned
  const plain = await supabaseAdmin!
    .from('profiles')
    .select('*')
    .eq('auth_uid', uid)
    .maybeSingle();

  if (plain.error) {
    res.status(500).json({ error: 'Unable to load the authenticated profile.' });
    return;
  }

  const plainData = plain.data as Record<string, any> | null;
  if (plainData && isSuperAdminEmail) {
    plainData.role = 'super_admin';
    plainData.active_roles = Array.from(new Set(['super_admin', 'admin', 'moderator', 'vendor', 'consumer', ...(plainData.active_roles || [])]));
    if (!plainData.name || plainData.name === 'PaikarMart User') plainData.name = 'PaikarMart';
    if (!plainData.handle) plainData.handle = '@paikarmart';
  }

  res.json({ success: true, profile: plainData || null });
});

authRouter.put('/profile', requireFirebaseAuth, async (req: Request, res: Response) => {
  if (!requireAdminDatabase(res)) return;
  const uid = res.locals.auth.uid;
  const tokenEmail = String(res.locals.auth.email || '').trim().slice(0, 160);
  const bodyEmail = String(req.body?.email || '').trim().slice(0, 160);
  const email = tokenEmail || bodyEmail;
  const isSuperAdminEmail = Boolean(
    (email && SUPER_ADMIN_EMAILS.has(email.toLowerCase())) ||
    res.locals.auth.role === 'super_admin'
  );
  const name = isSuperAdminEmail && (!req.body?.name || req.body?.name === 'PaikarMart User')
    ? 'PaikarMart'
    : String(req.body?.name || (isSuperAdminEmail ? 'PaikarMart' : 'PaikarMart User')).trim().slice(0, 100);
  const defaultHandleSeed = isSuperAdminEmail ? 'paikarmart' : (email.includes('@') ? email.split('@')[0] : `user_${uid.slice(0, 8)}`);
  const rawHandle = String(req.body?.handle || defaultHandleSeed)
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  const handle = rawHandle.length >= 2 ? `@${rawHandle.slice(0, 63)}` : (isSuperAdminEmail ? '@paikarmart' : `@user_${uid.slice(0, 8)}`);
  const avatarUrl = String(req.body?.avatar || '').trim().slice(0, 512) || null;
  const location = String(req.body?.location || 'Dhaka, Bangladesh').trim().slice(0, 120);
  const phone = normalizePhoneInput(res.locals.auth.phoneNumber || req.body?.phone);
  const isVerifiedClaim = isSuperAdminEmail || Boolean(res.locals.auth.emailVerified || res.locals.auth.phoneNumber);

  const existing = await supabaseAdmin!
    .from('profiles')
    .select('id, role, active_roles, is_verified')
    .eq('auth_uid', uid)
    .maybeSingle();

  if (existing.error) {
    res.status(500).json({ error: 'Unable to check the authenticated profile.' });
    return;
  }

  const resolvedFallbackEmail = res.locals.auth.phoneNumber
    ? `phone_${uid.slice(0, 12)}@phone.paikarmart.local`
    : `firebase_${uid.slice(0, 12)}@paikarmart.local`;

  const payload: Record<string, unknown> = existing.data
    ? {
        name,
        handle,
        avatar_url: avatarUrl,
        location,
        ...(isSuperAdminEmail ? { role: 'super_admin', active_roles: Array.from(new Set(['super_admin', 'admin', 'moderator', 'vendor', 'consumer', ...(existing.data.active_roles || [])])) } : {}),
        ...(phone ? { phone } : {}),
        ...(isVerifiedClaim && !existing.data.is_verified ? { is_verified: true } : {}),
        updated_at: new Date().toISOString(),
      }
    : {
        auth_uid: uid,
        email: email || resolvedFallbackEmail,
        name,
        handle,
        avatar_url: avatarUrl,
        role: isSuperAdminEmail ? 'super_admin' : 'consumer',
        active_roles: isSuperAdminEmail ? ['super_admin', 'admin', 'moderator', 'vendor', 'consumer'] : ['consumer'],
        location,
        phone,
        trust_level: isSuperAdminEmail ? 5 : 1,
        wallet_balance: 0,
        reward_points: isSuperAdminEmail ? 25000 : 0,
        is_verified: isVerifiedClaim,
      };

  const result = existing.data
    ? await supabaseAdmin!.from('profiles').update(payload).eq('auth_uid', uid).select().single()
    : await supabaseAdmin!.from('profiles').insert(payload).select().single();

  if (result.error) {
    res.status(result.error.code === '23505' ? 409 : 500).json({ error: 'Unable to save the authenticated profile.' });
    return;
  }

  invalidateAuthProfileCache(uid);
  res.json({ success: true, profile: result.data });
});

async function profileIdForUid(uid: string): Promise<string | null> {
  const result = await supabaseAdmin!.from('profiles').select('id').eq('auth_uid', uid).maybeSingle();
  return result.data?.id || null;
}

authRouter.get('/addresses', requireFirebaseAuth, async (_req: Request, res: Response) => {
  if (!requireAdminDatabase(res)) return;
  const profileId = await profileIdForUid(res.locals.auth.uid);
  if (!profileId) { res.status(404).json({ error: 'Profile not found.' }); return; }
  const result = await supabaseAdmin!.from('saved_addresses').select('*').eq('profile_id', profileId).order('is_default', { ascending: false }).order('created_at', { ascending: false });
  if (result.error) { res.status(500).json({ error: 'Unable to load saved addresses.' }); return; }
  res.json({ success: true, addresses: result.data || [] });
});

authRouter.post('/addresses', requireFirebaseAuth, async (req: Request, res: Response) => {
  if (!requireAdminDatabase(res)) return;
  const profileId = await profileIdForUid(res.locals.auth.uid);
  if (!profileId) { res.status(404).json({ error: 'Profile not found.' }); return; }
  const body = req.body || {};
  const payload = {
    profile_id: profileId,
    label: String(body.label || 'Home').slice(0, 80),
    recipient_name: String(body.recipientName || '').slice(0, 100),
    phone: String(body.phone || '').slice(0, 32),
    street_address: String(body.streetAddress || '').slice(0, 240),
    apartment: body.apartment ? String(body.apartment).slice(0, 100) : null,
    city: String(body.city || '').slice(0, 80),
    postal_code: body.postalCode ? String(body.postalCode).slice(0, 20) : null,
    tag: ['home', 'office', 'other'].includes(body.tag) ? body.tag : 'home',
    is_default: Boolean(body.isDefault),
    notes: body.notes ? String(body.notes).slice(0, 300) : null,
  };
  if (!payload.recipient_name || !payload.phone || !payload.street_address || !payload.city) {
    res.status(400).json({ error: 'Recipient, phone, street address, and city are required.' });
    return;
  }
  if (payload.is_default) await supabaseAdmin!.from('saved_addresses').update({ is_default: false }).eq('profile_id', profileId);
  const result = await supabaseAdmin!.from('saved_addresses').insert(payload).select().single();
  if (result.error) { res.status(500).json({ error: 'Unable to save address.' }); return; }
  res.status(201).json({ success: true, address: result.data });
});

authRouter.delete('/addresses/:id', requireFirebaseAuth, async (req: Request, res: Response) => {
  if (!requireAdminDatabase(res)) return;
  const profileId = await profileIdForUid(res.locals.auth.uid);
  if (!profileId) { res.status(404).json({ error: 'Profile not found.' }); return; }
  const result = await supabaseAdmin!.from('saved_addresses').delete().eq('id', req.params.id).eq('profile_id', profileId);
  if (result.error) { res.status(500).json({ error: 'Unable to delete address.' }); return; }
  res.json({ success: true });
});

authRouter.patch('/addresses/:id/default', requireFirebaseAuth, async (req: Request, res: Response) => {
  if (!requireAdminDatabase(res)) return;
  const profileId = await profileIdForUid(res.locals.auth.uid);
  if (!profileId) { res.status(404).json({ error: 'Profile not found.' }); return; }
  await supabaseAdmin!.from('saved_addresses').update({ is_default: false }).eq('profile_id', profileId);
  const result = await supabaseAdmin!.from('saved_addresses').update({ is_default: true }).eq('id', req.params.id).eq('profile_id', profileId).select().single();
  if (result.error) { res.status(500).json({ error: 'Unable to set the default address.' }); return; }
  res.json({ success: true, address: result.data });
});

const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

authRouter.post('/upload-asset', requireFirebaseAuth, async (req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.status(503).json({
      error: 'Cloud asset storage is not configured.',
      code: 'STORAGE_NOT_CONFIGURED',
    });
    return;
  }

  const uid = res.locals.auth.uid;
  const folder = req.body?.folder === 'avatars' ? 'avatars' : req.body?.folder === 'documents' ? 'documents' : null;
  if (!folder) {
    res.status(400).json({ error: 'Invalid upload folder. Expected "avatars" or "documents".' });
    return;
  }

  const contentType = String(req.body?.contentType || '').trim().toLowerCase();
  const allowedMimes = folder === 'avatars' ? AVATAR_MIME_TYPES : DOCUMENT_MIME_TYPES;
  if (!allowedMimes.has(contentType)) {
    res.status(400).json({ error: 'Unsupported file format. Use JPG, PNG, WebP, or PDF (documents only).' });
    return;
  }

  const rawBase64 = String(req.body?.dataBase64 || '').trim();
  const cleanedBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
  if (!cleanedBase64) {
    res.status(400).json({ error: 'Encoded file payload is required.' });
    return;
  }

  const fileBuffer = Buffer.from(cleanedBase64, 'base64');
  const maxBytes = folder === 'avatars' ? 2 * 1024 * 1024 : 6 * 1024 * 1024;
  if (fileBuffer.byteLength === 0 || fileBuffer.byteLength > maxBytes) {
    res.status(413).json({
      error: folder === 'avatars'
        ? 'Avatar image must be 2 MB or smaller.'
        : 'KYC document file must be 6 MB or smaller.',
    });
    return;
  }

  const rawFileName = String(req.body?.fileName || (contentType === 'application/pdf' ? 'document.pdf' : 'image.jpg'));

  if (folder === 'avatars') {
    try {
      const uploaded = await uploadPublicImageBuffer({
        buffer: fileBuffer,
        mimeType: contentType,
        originalName: rawFileName,
        ownerUid: uid,
        purpose: 'avatars',
      });
      res.status(201).json({
        success: true,
        storageProvider: 'supabase',
        url: uploaded.publicUrl,
        path: uploaded.storagePath,
      });
      return;
    } catch {
      res.status(502).json({ error: 'Failed to store uploaded file.', code: 'STORAGE_UPLOAD_FAILED' });
      return;
    }
  }

  const safeName = sanitizeStorageFilename(rawFileName);
  const objectPath = `users/${uid}/documents/${Date.now()}-${safeName}`;
  const bucketReady = await ensureStorageBucket(PRIVATE_ASSETS_BUCKET, false, maxBytes, Array.from(allowedMimes));
  if (!bucketReady) {
    res.status(503).json({ error: 'Storage bucket initialization failed.', code: 'STORAGE_BUCKET_ERROR' });
    return;
  }

  const uploadResult = await supabaseAdmin.storage.from(PRIVATE_ASSETS_BUCKET).upload(objectPath, fileBuffer, {
    contentType,
    upsert: false,
  });

  if (uploadResult.error) {
    res.status(502).json({ error: 'Failed to store uploaded file.', code: 'STORAGE_UPLOAD_FAILED' });
    return;
  }

  try {
    const signed = await createSignedAssetUrl(PRIVATE_ASSETS_BUCKET, objectPath, 60 * 60);
    res.status(201).json({
      success: true,
      storageProvider: 'supabase',
      url: signed.signedUrl,
      path: objectPath,
    });
  } catch {
    res.status(502).json({ error: 'Unable to generate secure document link.', code: 'SIGNED_URL_FAILED' });
  }
});

// Server-side Seller Role Promotion (replaces untrusted client role elevation)
authRouter.post('/promote-seller', requireFirebaseAuth, async (req: Request, res: Response) => {
  const uid = res.locals.auth.uid;
  const currentRole = String(res.locals.auth.role || 'consumer');
  const currentRoles = Array.isArray(res.locals.auth.roles) ? res.locals.auth.roles : [currentRole];

  if (currentRole === 'admin' || currentRole === 'super_admin' || currentRoles.includes('admin') || currentRoles.includes('super_admin')) {
    res.status(400).json({ error: 'Admin accounts cannot be converted via promote-seller.' });
    return;
  }

  const rawShopName = String(req.body?.shopName || '').trim().slice(0, 100);
  if (rawShopName.length < 2) {
    res.status(400).json({ error: 'shopName is required (minimum 2 characters).' });
    return;
  }

  const shopType = ['retail', 'wholesale', 'service'].includes(req.body?.type)
    ? String(req.body.type)
    : 'retail';
  const address = String(req.body?.address || '').trim().slice(0, 240);

  if (!supabaseAdmin) {
    const mergedRoles = Array.from(new Set([...currentRoles, 'consumer', 'vendor']));
    invalidateAuthProfileCache(uid);
    res.json({
      success: true,
      mode: 'memory_fallback',
      message: 'Seller role activated.',
      activeRoles: mergedRoles,
      user: {
        uid,
        email: res.locals.auth.email || `${uid}@paikarmart.local`,
        role: currentRole === 'moderator' ? 'moderator' : 'vendor',
        roles: mergedRoles,
        isVendor: true,
        seller: { shopName: rawShopName, type: shopType, address },
      },
    });
    return;
  }

  try {
    const existing = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, handle, role, active_roles, location')
      .eq('auth_uid', uid)
      .maybeSingle();

    if (existing.error) {
      res.status(500).json({ error: 'Unable to verify user profile for seller promotion.' });
      return;
    }

    const dbRole = String(existing.data?.role || currentRole || 'consumer');
    if (dbRole === 'admin' || dbRole === 'super_admin') {
      res.status(400).json({ error: 'Admin accounts cannot be converted via promote-seller.' });
      return;
    }

    const nextRole = dbRole === 'consumer' ? 'vendor' : dbRole;
    const existingActiveRoles = Array.isArray(existing.data?.active_roles)
      ? existing.data.active_roles.map((r: unknown) => String(r))
      : ['consumer'];
    const mergedRoles = Array.from(new Set([...existingActiveRoles, 'vendor']));
    const nowIso = new Date().toISOString();

    let updatedProfile: Record<string, any> | null = null;
    if (existing.data) {
      const upd = await supabaseAdmin
        .from('profiles')
        .update({
          role: nextRole,
          active_roles: mergedRoles,
          location: address || existing.data.location || 'Dhaka, Bangladesh',
          updated_at: nowIso,
        })
        .eq('auth_uid', uid)
        .select('*')
        .single();
      if (upd.error) {
        res.status(500).json({ error: 'Failed to promote account to seller.' });
        return;
      }
      updatedProfile = upd.data;
    } else {
      const fallbackEmail = res.locals.auth.email
        ? String(res.locals.auth.email).trim().slice(0, 160)
        : `firebase_${uid.slice(0, 12)}@paikarmart.local`;
      const seedHandle = `seller_${uid.slice(0, 8)}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const ins = await supabaseAdmin
        .from('profiles')
        .insert({
          auth_uid: uid,
          email: fallbackEmail,
          name: rawShopName,
          handle: `@${seedHandle}`,
          role: 'vendor',
          active_roles: mergedRoles,
          location: address || 'Dhaka, Bangladesh',
          trust_level: 1,
          wallet_balance: 0,
          reward_points: 0,
          is_verified: Boolean(res.locals.auth.emailVerified || res.locals.auth.phoneNumber),
        })
        .select('*')
        .single();
      if (ins.error) {
        res.status(500).json({ error: 'Failed to create seller profile.' });
        return;
      }
      updatedProfile = ins.data;
    }

    invalidateAuthProfileCache(uid);
    res.json({
      success: true,
      message: 'Seller role activated.',
      activeRoles: mergedRoles,
      user: {
        uid,
        profileId: updatedProfile?.id,
        email: updatedProfile?.email || res.locals.auth.email,
        name: updatedProfile?.name || rawShopName,
        role: updatedProfile?.role || nextRole,
        roles: mergedRoles,
        isVendor: true,
        seller: { shopName: rawShopName, type: shopType, address },
      },
    });
  } catch {
    res.status(500).json({ error: 'Seller promotion failed.' });
  }
});

// Server-side Creator Role Promotion
authRouter.post('/promote-creator', requireFirebaseAuth, async (req: Request, res: Response) => {
  const uid = res.locals.auth.uid;
  const currentRole = String(res.locals.auth.role || 'consumer');
  const currentRoles = Array.isArray(res.locals.auth.roles) ? res.locals.auth.roles : [currentRole];

  if (currentRole === 'admin' || currentRole === 'super_admin' || currentRoles.includes('admin') || currentRoles.includes('super_admin')) {
    res.status(400).json({ error: 'Admin accounts cannot be converted via promote-creator.' });
    return;
  }

  const channelName = String(req.body?.channelName || '').trim().slice(0, 100);

  if (!supabaseAdmin) {
    const mergedRoles = Array.from(new Set([...currentRoles, 'consumer', 'creator']));
    invalidateAuthProfileCache(uid);
    res.json({
      success: true,
      mode: 'memory_fallback',
      message: 'Creator capability activated.',
      activeRoles: mergedRoles,
      user: {
        uid,
        email: res.locals.auth.email || `${uid}@paikarmart.local`,
        role: currentRole,
        roles: mergedRoles,
        isCreator: true,
        channelName: channelName || undefined,
      },
    });
    return;
  }

  try {
    const existing = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, role, active_roles')
      .eq('auth_uid', uid)
      .maybeSingle();

    if (existing.error) {
      res.status(500).json({ error: 'Unable to verify user profile for creator promotion.' });
      return;
    }

    const dbRole = String(existing.data?.role || currentRole || 'consumer');
    if (dbRole === 'admin' || dbRole === 'super_admin') {
      res.status(400).json({ error: 'Admin accounts cannot be converted via promote-creator.' });
      return;
    }

    const existingActiveRoles = Array.isArray(existing.data?.active_roles)
      ? existing.data.active_roles.map((r: unknown) => String(r))
      : ['consumer'];
    const mergedRoles = Array.from(new Set([...existingActiveRoles, 'creator']));

    let updatedProfile: Record<string, any> | null = existing.data;
    if (existing.data) {
      const upd = await supabaseAdmin
        .from('profiles')
        .update({
          active_roles: mergedRoles,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_uid', uid)
        .select('*')
        .single();
      if (upd.error) {
        res.status(500).json({ error: 'Failed to activate creator capability.' });
        return;
      }
      updatedProfile = upd.data;
    } else {
      const fallbackEmail = res.locals.auth.email
        ? String(res.locals.auth.email).trim().slice(0, 160)
        : `firebase_${uid.slice(0, 12)}@paikarmart.local`;
      const seedHandle = `creator_${uid.slice(0, 8)}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const ins = await supabaseAdmin
        .from('profiles')
        .insert({
          auth_uid: uid,
          email: fallbackEmail,
          name: channelName || 'PaikarMart Creator',
          handle: `@${seedHandle}`,
          role: 'consumer',
          active_roles: mergedRoles,
          trust_level: 1,
          wallet_balance: 0,
          reward_points: 0,
          is_verified: Boolean(res.locals.auth.emailVerified || res.locals.auth.phoneNumber),
        })
        .select('*')
        .single();
      if (ins.error) {
        res.status(500).json({ error: 'Failed to create creator profile.' });
        return;
      }
      updatedProfile = ins.data;
    }

    invalidateAuthProfileCache(uid);
    res.json({
      success: true,
      message: 'Creator capability activated.',
      activeRoles: mergedRoles,
      user: {
        uid,
        profileId: updatedProfile?.id,
        email: updatedProfile?.email || res.locals.auth.email,
        name: updatedProfile?.name || channelName || 'Creator',
        role: updatedProfile?.role || dbRole,
        roles: mergedRoles,
        isCreator: true,
        channelName: channelName || undefined,
      },
    });
  } catch {
    res.status(500).json({ error: 'Creator promotion failed.' });
  }
});
