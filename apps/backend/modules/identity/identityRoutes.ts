import { Router } from 'express';
import multer from 'multer';
import { submitVerification, getVerificationStatus, uploadDocument } from './identityService.js';
import { ensureAuth } from '../../middleware/requireFirebaseAuth.js';

const router = Router();
router.use(ensureAuth);

// Start or update KYC verification
router.post('/verification', submitVerification);

// Get verification status by ID
router.get('/verification/:id', getVerificationStatus);

// Upload a document for a verification (multipart/form-data)
router.post('/verification/:id/document', multer().single('file'), uploadDocument);

export default router;
