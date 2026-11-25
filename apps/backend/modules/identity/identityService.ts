import crypto from 'crypto';
import type { Request, Response } from 'express';
import { invalidateAuthProfileCache } from '../../middleware/requireFirebaseAuth.js';
import {
  resolveProfileUuidByAuthUid,
  supabaseAdmin,
} from '../../services/dbService.js';
import { uploadToStorage } from '../../services/storageService.js';
import { createUserNotification } from '../notifications/notificationService.js';

const ALLOWED_DOC_TYPES = new Set([
  'NID',
  'Passport',
  'Birth Certificate',
  'Student ID',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5MB

interface InMemoryVerification {
  id: string;
  user_id: string;
  auth_uid: string;
  applicant_name?: string;
  applicant_email?: string;
  document_type: string;
  document_number: string;
  status: 'submitted' | 'under_review' | 'verified' | 'rejected';
  rejection_reason?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  documents: Array<{ id: string; doc_type: string; storage_path: string; public_url?: string }>;
}

const memoryVerifications = new Map<string, InMemoryVerification>();

function getAuthUid(res: Response): string | null {
  const uid = res.locals.auth?.uid;
  return typeof uid === 'string' && uid.trim() ? uid.trim() : null;
}

function sanitizeDocNumber(raw: unknown): string {
  return String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9\-/\s]/g, '')
    .slice(0, 40);
}

export const submitVerification = async (req: Request, res: Response) => {
  const uid = getAuthUid(res);
  if (!uid) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const documentType = String(req.body?.documentType || 'NID').trim();
  const documentNumber = sanitizeDocNumber(req.body?.documentNumber);
  const existingVerificationId =
    typeof req.body?.existingVerificationId === 'string' && req.body.existingVerificationId.trim()
      ? req.body.existingVerificationId.trim()
      : undefined;

  if (!ALLOWED_DOC_TYPES.has(documentType)) {
    res.status(400).json({ error: 'Unsupported document type.' });
    return;
  }
  if (!documentNumber || documentNumber.length < 4) {
    res.status(400).json({ error: 'Valid document number is required (minimum 4 characters).' });
    return;
  }

  const nowIso = new Date().toISOString();
  const profileUuid = await resolveProfileUuidByAuthUid(uid);

  if (supabaseAdmin && profileUuid) {
    try {
      const verificationId = existingVerificationId || crypto.randomUUID();

      if (existingVerificationId) {
        const { data: existing } = await supabaseAdmin
          .from('identity_verifications')
          .select('id, user_id')
          .eq('id', existingVerificationId)
          .maybeSingle();

        if (existing && existing.user_id !== profileUuid) {
          res.status(403).json({ error: 'Forbidden: Verification belongs to another account.' });
          return;
        }
      }

      const { data, error } = await supabaseAdmin
        .from('identity_verifications')
        .upsert({
          id: verificationId,
          user_id: profileUuid,
          document_type: documentType,
          document_number: documentNumber,
          status: 'submitted',
          updated_at: nowIso,
        })
        .select('*')
        .single();

      if (!error && data) {
        await supabaseAdmin
          .from('profiles')
          .update({
            citizen_verification_status: 'pending',
            citizen_doc_type: documentType,
            citizen_doc_number: documentNumber,
            updated_at: nowIso,
          })
          .eq('id', profileUuid);

        res.status(201).json({
          success: true,
          verification: {
            id: data.id,
            status: 'pending',
            documentType: data.document_type,
            documentNumber: data.document_number,
            updatedAt: data.updated_at,
          },
          source: 'supabase',
        });
        return;
      }
    } catch (err) {
      console.warn('Identity verification Supabase notice, using memory fallback:', err);
    }
  }

  const verificationId = existingVerificationId || `ver_${crypto.randomUUID()}`;
  const existingMem = memoryVerifications.get(verificationId);
  if (existingMem && existingMem.auth_uid !== uid) {
    res.status(403).json({ error: 'Forbidden: Verification belongs to another account.' });
    return;
  }

  const record: InMemoryVerification = {
    id: verificationId,
    user_id: profileUuid || uid,
    auth_uid: uid,
    applicant_email: res.locals.auth?.email ? String(res.locals.auth.email) : undefined,
    document_type: documentType,
    document_number: documentNumber,
    status: 'submitted',
    created_at: existingMem?.created_at || nowIso,
    updated_at: nowIso,
    documents: existingMem?.documents || [],
  };
  memoryVerifications.set(verificationId, record);

  res.status(201).json({
    success: true,
    verification: {
      id: record.id,
      status: 'pending',
      documentType: record.document_type,
      documentNumber: record.document_number,
      updatedAt: record.updated_at,
    },
    source: 'memory',
  });
};

export const getVerificationStatus = async (req: Request, res: Response) => {
  const uid = getAuthUid(res);
  if (!uid) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const id = String(req.params.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Verification ID is required.' });
    return;
  }

  const profileUuid = await resolveProfileUuidByAuthUid(uid);

  if (supabaseAdmin && profileUuid) {
    try {
      const { data, error } = await supabaseAdmin
        .from('identity_verifications')
        .select('*')
        .eq('id', id)
        .eq('user_id', profileUuid)
        .maybeSingle();

      if (!error && data) {
        res.json({
          success: true,
          verification: {
            id: data.id,
            status: data.status === 'submitted' ? 'pending' : data.status,
            documentType: data.document_type,
            documentNumber: data.document_number,
            verifiedAt: data.verified_at,
            rejectionReason: data.rejection_reason,
          },
        });
        return;
      }
    } catch {
      // fall through to memory check
    }
  }

  const mem = memoryVerifications.get(id);
  if (!mem) {
    res.status(404).json({ error: 'Verification record not found.' });
    return;
  }
  if (mem.auth_uid !== uid) {
    res.status(403).json({ error: 'Forbidden: Access denied.' });
    return;
  }

  res.json({
    success: true,
    verification: {
      id: mem.id,
      status: mem.status === 'submitted' ? 'pending' : mem.status,
      documentType: mem.document_type,
      documentNumber: mem.document_number,
      verifiedAt: mem.verified_at,
    },
  });
};

export const uploadDocument = async (req: Request, res: Response) => {
  const uid = getAuthUid(res);
  if (!uid) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const id = String(req.params.id || '').trim();
  const docSide = String(req.body?.doc_type || req.body?.docType || 'front').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
  const fileName = String(req.body?.fileName || 'document.jpg').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const mimeType = String(req.body?.mimeType || 'image/jpeg').trim();
  const dataBase64 = typeof req.body?.dataBase64 === 'string' ? req.body.dataBase64 : '';

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: 'Invalid file type. Allowed: JPEG, PNG, WEBP, PDF.' });
    return;
  }
  if (!dataBase64) {
    res.status(400).json({ error: 'Document payload (dataBase64) is required.' });
    return;
  }

  const cleanBase64 = dataBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  if (!buffer.length || buffer.length > MAX_DOC_BYTES) {
    res.status(400).json({ error: 'Document size must be between 1 byte and 5MB.' });
    return;
  }

  const profileUuid = await resolveProfileUuidByAuthUid(uid);
  const storagePath = `users/${uid}/kyc/${id}/${Date.now()}_${fileName}`;

  if (supabaseAdmin && profileUuid) {
    try {
      const { data: ownerCheck } = await supabaseAdmin
        .from('identity_verifications')
        .select('id, user_id')
        .eq('id', id)
        .maybeSingle();

      if (!ownerCheck) {
        res.status(404).json({ error: 'Verification record not found.' });
        return;
      }
      if (ownerCheck.user_id !== profileUuid) {
        res.status(403).json({ error: 'Forbidden: Verification belongs to another account.' });
        return;
      }

      const publicUrl = await uploadToStorage(buffer, storagePath, mimeType, 'paikarmart-kyc-docs');
      const { data, error } = await supabaseAdmin
        .from('identity_documents')
        .insert({
          verification_id: id,
          doc_type: docSide || 'front',
          storage_path: storagePath,
        })
        .select('*')
        .single();

      if (!error && data) {
        res.status(201).json({ success: true, document: data, publicUrl });
        return;
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Document upload failed.' });
      return;
    }
  }

  const mem = memoryVerifications.get(id);
  if (!mem) {
    res.status(404).json({ error: 'Verification record not found.' });
    return;
  }
  if (mem.auth_uid !== uid) {
    res.status(403).json({ error: 'Forbidden: Verification belongs to another account.' });
    return;
  }

  const docEntry = {
    id: `doc_${crypto.randomUUID()}`,
    doc_type: docSide || 'front',
    storage_path: storagePath,
    public_url: `local-fallback://paikarmart-kyc-docs/${storagePath}`,
  };
  mem.documents.push(docEntry);
  mem.updated_at = new Date().toISOString();

  res.status(201).json({ success: true, document: docEntry, publicUrl: docEntry.public_url });
};

export const listPendingVerifications = async (_req: Request, res: Response) => {
  const results: Array<Record<string, any>> = [];
  const seenIds = new Set<string>();

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('identity_verifications')
        .select('id, user_id, document_type, document_number, status, rejection_reason, verified_at, created_at, updated_at, profile:profiles(auth_uid, name, email, handle), documents:identity_documents(id, doc_type, storage_path)')
        .in('status', ['submitted', 'under_review', 'pending'])
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && Array.isArray(data)) {
        for (const row of data as any[]) {
          const prof = Array.isArray(row.profile) ? row.profile[0] : row.profile;
          seenIds.add(String(row.id));
          results.push({
            id: String(row.id),
            userId: String(row.user_id),
            authUid: prof?.auth_uid ? String(prof.auth_uid) : undefined,
            userName: prof?.name ? String(prof.name) : 'PaikarMart Citizen',
            userEmail: prof?.email ? String(prof.email) : undefined,
            userHandle: prof?.handle ? String(prof.handle) : undefined,
            documentType: String(row.document_type),
            documentNumber: String(row.document_number),
            status: row.status === 'submitted' ? 'pending' : String(row.status),
            rejectionReason: row.rejection_reason || undefined,
            documents: Array.isArray(row.documents) ? row.documents : [],
            createdAt: String(row.created_at),
            updatedAt: String(row.updated_at),
            source: 'supabase',
          });
        }
      }
    } catch {
      // Fall through to memory queue
    }
  }

  for (const mem of memoryVerifications.values()) {
    if (seenIds.has(mem.id)) continue;
    if (mem.status === 'submitted' || mem.status === 'under_review') {
      results.push({
        id: mem.id,
        userId: mem.user_id,
        authUid: mem.auth_uid,
        userName: mem.applicant_name || 'PaikarMart Citizen',
        userEmail: mem.applicant_email,
        documentType: mem.document_type,
        documentNumber: mem.document_number,
        status: mem.status === 'submitted' ? 'pending' : mem.status,
        rejectionReason: mem.rejection_reason,
        documents: mem.documents,
        createdAt: mem.created_at,
        updatedAt: mem.updated_at,
        source: 'memory',
      });
    }
  }

  res.json({ success: true, verifications: results });
};

export const reviewVerification = async (req: Request, res: Response) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Verification ID is required.' });
    return;
  }

  const rawDecision = String(req.body?.decision || req.body?.action || '').trim().toLowerCase();
  const normalizedDecision: 'verified' | 'rejected' | null =
    rawDecision === 'verified' || rawDecision === 'approved' || rawDecision === 'approve'
      ? 'verified'
      : rawDecision === 'rejected' || rawDecision === 'reject'
      ? 'rejected'
      : null;

  if (!normalizedDecision) {
    res.status(400).json({ error: 'Decision must be verified/approved or rejected.' });
    return;
  }

  const rejectionReason = normalizedDecision === 'rejected'
    ? String(req.body?.rejectionReason || req.body?.note || 'Document verification declined by governance team.').trim().slice(0, 300)
    : null;
  const nowIso = new Date().toISOString();

  if (supabaseAdmin) {
    try {
      const { data: updated, error } = await supabaseAdmin
        .from('identity_verifications')
        .update({
          status: normalizedDecision,
          rejection_reason: rejectionReason,
          verified_at: normalizedDecision === 'verified' ? nowIso : null,
          updated_at: nowIso,
        })
        .eq('id', id)
        .select('id, user_id, document_type, document_number, status, rejection_reason, verified_at, updated_at')
        .maybeSingle();

      if (!error && updated) {
        const { data: profileRow } = await supabaseAdmin
          .from('profiles')
          .select('id, auth_uid, trust_level')
          .eq('id', updated.user_id)
          .maybeSingle();

        const nextTrust = normalizedDecision === 'verified'
          ? Math.max(Number(profileRow?.trust_level || 1), 4)
          : Number(profileRow?.trust_level || 1);

        await supabaseAdmin
          .from('profiles')
          .update({
            citizen_verification_status: normalizedDecision,
            ...(normalizedDecision === 'verified' ? { is_verified: true, trust_level: nextTrust } : {}),
            updated_at: nowIso,
          })
          .eq('id', updated.user_id);

        if (profileRow?.auth_uid) {
          invalidateAuthProfileCache(String(profileRow.auth_uid));
          void createUserNotification({
            authUid: String(profileRow.auth_uid),
            type: 'system',
            title: normalizedDecision === 'verified' ? 'Identity KYC Verified' : 'Identity KYC Needs Attention',
            message:
              normalizedDecision === 'verified'
                ? `Your ${updated.document_type} verification has been approved (Trust Level ${nextTrust}).`
                : `Your ${updated.document_type} verification was declined: ${rejectionReason}`,
            actionTab: 'profile',
            linkId: updated.id,
          });
        }

        res.json({
          success: true,
          verification: {
            id: updated.id,
            status: updated.status,
            documentType: updated.document_type,
            documentNumber: updated.document_number,
            verifiedAt: updated.verified_at,
            rejectionReason: updated.rejection_reason,
          },
          source: 'supabase',
        });
        return;
      }
    } catch {
      // Fall through to memory record check
    }
  }

  const mem = memoryVerifications.get(id);
  if (!mem) {
    res.status(404).json({ error: 'Verification record not found.' });
    return;
  }

  mem.status = normalizedDecision;
  mem.rejection_reason = rejectionReason || undefined;
  mem.verified_at = normalizedDecision === 'verified' ? nowIso : undefined;
  mem.updated_at = nowIso;
  invalidateAuthProfileCache(mem.auth_uid);

  void createUserNotification({
    authUid: mem.auth_uid,
    type: 'system',
    title: normalizedDecision === 'verified' ? 'Identity KYC Verified' : 'Identity KYC Needs Attention',
    message:
      normalizedDecision === 'verified'
        ? `Your ${mem.document_type} verification has been approved.`
        : `Your ${mem.document_type} verification was declined: ${rejectionReason}`,
    actionTab: 'profile',
    linkId: mem.id,
  });

  res.json({
    success: true,
    verification: {
      id: mem.id,
      status: mem.status,
      documentType: mem.document_type,
      documentNumber: mem.document_number,
      verifiedAt: mem.verified_at,
      rejectionReason: mem.rejection_reason,
    },
    source: 'memory',
  });
};
