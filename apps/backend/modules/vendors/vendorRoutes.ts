import { Router } from 'express';
import type { Request, Response } from 'express';
import { type UserRole } from '../../../../packages/shared/src/index.js';
import {
  decideKycApplication,
  getKycApplicationsForUser,
  getPublicProfileByHandle,
  getPublicStoreById,
  getStoreOwnerId,
  getVendorAnalytics,
  listKycQueue,
  listPublicStores,
  submitVendorKycApplication,
  syncKycDecisionToDatabase,
  syncKycSubmissionToDatabase,
  updateGovernanceRoleInDb
} from './vendorService.js';
import { isPrivilegedRole, requireFirebaseAuth, requireRole } from '../../middleware/requireFirebaseAuth.js';
import { createUserNotification } from '../notifications/notificationService.js';

export const vendorRouter = Router();

function extractRequesterRole(res: Response): UserRole | undefined {
  const auth = res.locals.auth;
  const raw = String(auth?.role || auth?.roles?.find((role: string) => ['consumer', 'vendor', 'moderator', 'admin', 'super_admin'].includes(role)) || '').trim();
  if (['consumer', 'vendor', 'moderator', 'admin', 'super_admin'].includes(raw)) {
    return raw as UserRole;
  }
  return undefined;
}

vendorRouter.post('/register', requireFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { autoApproveDemo: _ignored, ...safeBody } = req.body || {};
    const applicantUid = res.locals.auth.uid;
    const result = submitVendorKycApplication({ ...safeBody, applicantId: applicantUid });
    await syncKycSubmissionToDatabase(applicantUid, result.vendorProfile);
    res.status(201).json({
      success: true,
      message: 'KYC documents submitted to Governance Queue for verification.',
      application: result.application,
      vendorProfile: result.vendorProfile,
      trustMeta: result.trustMeta
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to register vendor KYC application.' });
  }
});

vendorRouter.get('/kyc/my-status', requireFirebaseAuth, async (_req: Request, res: Response) => {
  const uid = res.locals.auth.uid;
  const statusData = await getKycApplicationsForUser(uid);
  res.json({
    success: true,
    ...statusData,
    authRole: res.locals.auth.role,
    isVendor: Boolean(res.locals.auth.isVendor),
  });
});

vendorRouter.get('/stores', async (_req: Request, res: Response) => {
  const stores = await listPublicStores();
  res.json({ success: true, stores });
});

vendorRouter.get('/stores/:storeId', async (req: Request, res: Response) => {
  const store = await getPublicStoreById(req.params.storeId);
  if (!store) {
    res.status(404).json({ error: 'Storefront not found.' });
    return;
  }
  res.json({ success: true, store });
});

// Zero-PII Unified Public @handle Profile Endpoint
vendorRouter.get('/profile/:handle', async (req: Request, res: Response) => {
  const profile = await getPublicProfileByHandle(req.params.handle);
  if (!profile) {
    res.status(404).json({ error: 'Public handle profile not found.' });
    return;
  }
  res.json({ success: true, profile });
});

vendorRouter.get('/:vendorId/analytics', requireFirebaseAuth, requireRole(['vendor', 'moderator', 'admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.auth.uid;
    const ownerId = await getStoreOwnerId(req.params.vendorId);
    if (ownerId && ownerId !== userId && !isPrivilegedRole(res.locals.auth)) {
      res.status(403).json({ error: 'Forbidden: Not authorized to view analytics for this store.' });
      return;
    }
    const analytics = await getVendorAnalytics(req.params.vendorId, userId);
    res.json({ success: true, analytics });
  } catch {
    res.status(503).json({ error: 'Vendor analytics service temporarily unavailable.' });
  }
});

vendorRouter.get('/kyc/queue', requireFirebaseAuth, requireRole(['moderator', 'admin', 'super_admin']), async (_req: Request, res: Response) => {
  const requesterRole = extractRequesterRole(res);
  const queueResult = await listKycQueue(requesterRole);
  if (!queueResult.authorized) {
    res.status(403).json({
      error: 'Forbidden: Governance role (moderator, admin, or super_admin) required.'
    });
    return;
  }
  res.json({ success: true, applications: queueResult.applications });
});

vendorRouter.post('/kyc/:applicationId/decision', requireFirebaseAuth, requireRole(['moderator', 'admin', 'super_admin']), async (req: Request, res: Response) => {
  const requesterRole = extractRequesterRole(res);
  const decision = req.body?.decision;
  if (!['approved', 'rejected', 'suspended'].includes(decision)) {
    res.status(400).json({ error: 'Decision must be approved, rejected, or suspended.' });
    return;
  }

  const outcome = await decideKycApplication({
    applicationId: req.params.applicationId,
    decision,
    reviewerEmail: String(res.locals.auth.email || res.locals.auth.uid),
    requesterRole,
    note: req.body?.note
  });

  if (!outcome.ok || !outcome.application) {
    res.status(outcome.statusCode).json({ error: outcome.error });
    return;
  }

  await syncKycDecisionToDatabase(outcome.application);

  if (outcome.application.applicantId) {
    const statusLabel =
      decision === 'approved'
        ? 'Merchant KYC Approved'
        : decision === 'rejected'
        ? 'Merchant KYC Needs Attention'
        : 'Merchant Account Suspended';
    void createUserNotification({
      authUid: outcome.application.applicantId,
      type: 'system',
      title: statusLabel,
      message: `Governance decision for ${outcome.application.storeName}: ${decision.toUpperCase()}.`,
      actionTab: 'vendor-dash',
      linkId: outcome.application.id,
    });
  }

  res.json({ success: true, application: outcome.application });
});

vendorRouter.post('/governance/roles', requireFirebaseAuth, requireRole('super_admin'), async (req: Request, res: Response) => {
  const { email, authUid, role } = req.body || {};
  if (!['consumer', 'vendor', 'moderator', 'admin', 'super_admin'].includes(role)) {
    res.status(400).json({ error: 'Invalid governance role specified.' });
    return;
  }

  const result = await updateGovernanceRoleInDb({
    targetEmail: typeof email === 'string' ? email : undefined,
    targetAuthUid: typeof authUid === 'string' ? authUid : undefined,
    newRole: role as UserRole,
  });

  if (!result.ok) {
    res.status(result.statusCode).json({ error: result.error });
    return;
  }

  res.json({
    success: true,
    profile: result.profile || null,
  });
});

