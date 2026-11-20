import { Request, Response } from 'express';
import { supabaseAdmin } from '../../services/dbService.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadToStorage } from '../../services/storageService.js'; // you need to implement this helper or use existing one

// Helper to get UID from middleware (set in res.locals.auth.uid)
const getUid = (req: Request): string => {
  // The requireFirebaseAuth middleware puts the auth payload in res.locals.auth
  // but TypeScript may not know it, so we cast.
  const anyReq = req as any;
  if (anyReq?.res?.locals?.auth?.uid) return anyReq.res.locals.auth.uid;
  throw new Error('Unauthenticated request');
};

export const submitVerification = async (req: Request, res: Response) => {
  try {
    const uid = getUid(req);
    const { existingVerificationId } = req.body || {};
    const { data, error } = await supabaseAdmin
      .from('identity_verifications')
      .upsert({
        id: existingVerificationId || uuidv4(),
        user_id: uid,
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .single();
    if (error) throw error;
    res.json({ verification: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const getVerificationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('identity_verifications')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json({ verification: data });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
};

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const uid = getUid(req);
    const { id } = req.params; // verificationId
    // Expect multer to have populated req.file
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const storagePath = `users/${uid}/kyc/${id}/${file.originalname}`;
    const publicUrl = await uploadToStorage(file.buffer, storagePath, file.mimetype);

    const { data, error } = await supabaseAdmin
      .from('identity_documents')
      .insert({
        verification_id: id,
        doc_type: req.body?.doc_type || 'unknown',
        storage_path: storagePath,
      })
      .single();
    if (error) throw error;
    res.json({ document: data, publicUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
