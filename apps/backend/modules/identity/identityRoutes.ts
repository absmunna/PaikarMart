import { Router } from 'express';
import {
  submitVerification,
  getVerificationStatus,
  uploadDocument,
  listPendingVerifications,
  reviewVerification,
} from './identityService.js';
import { requireFirebaseAuth, requireRole } from '../../middleware/requireFirebaseAuth.js';

const router = Router();

// All personal identity / KYC endpoints require verified Firebase Auth
router.use(requireFirebaseAuth);

// Admin / Moderator Citizen KYC review queue
router.get('/verifications/pending', requireRole(['moderator', 'admin', 'super_admin']), listPendingVerifications);
router.get('/pending', requireRole(['moderator', 'admin', 'super_admin']), listPendingVerifications);
router.patch('/verifications/:id/review', requireRole(['moderator', 'admin', 'super_admin']), reviewVerification);
router.post('/verifications/:id/review', requireRole(['moderator', 'admin', 'super_admin']), reviewVerification);

// Start or update citizen KYC verification
router.post('/verification', submitVerification);

// Get verification status by ID (owner-scoped)
router.get('/verification/:id', getVerificationStatus);

// Upload a KYC document (base64 validated payload -> Supabase Storage)
router.post('/verification/:id/document', uploadDocument);

export default router;
