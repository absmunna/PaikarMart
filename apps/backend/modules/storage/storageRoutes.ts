import crypto from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { isPrivilegedRole, requireFirebaseAuth, requireRole } from '../../middleware/requireFirebaseAuth.js';
import { resolveProfileUuidByAuthUid, supabaseAdmin } from '../../services/dbService.js';
import {
  createSignedAssetUrl,
  deleteFromStorage,
  uploadPrivateDigitalBuffer,
  uploadPublicImageBuffer,
} from '../../services/storageService.js';

export const storageRouter = Router();

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_DIGITAL_BYTES = 15 * 1024 * 1024; // 15 MB

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const DIGITAL_MIME_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/epub+zip',
  'audio/mpeg',
  'video/mp4',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_PURPOSES = new Set(['avatars', 'products', 'images', 'banners']);

export interface FileAssetRecord {
  id: string;
  ownerUid: string;
  profileId?: string;
  purpose: string;
  bucket: string;
  storagePath: string;
  url: string | null;
  isPrivate: boolean;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  createdAt: string;
}

const memoryFileRegistry = new Map<string, FileAssetRecord>();

function mapDbFileAsset(row: Record<string, any>): FileAssetRecord {
  const isPrivate = Boolean(row.is_private);
  return {
    id: String(row.id),
    ownerUid: String(row.owner_uid),
    profileId: row.profile_id ? String(row.profile_id) : undefined,
    purpose: String(row.purpose || 'images'),
    bucket: String(row.bucket),
    storagePath: String(row.storage_path),
    url: isPrivate ? null : (row.public_url ? String(row.public_url) : null),
    isPrivate,
    mimeType: String(row.mime_type || 'application/octet-stream'),
    sizeBytes: Number(row.size_bytes || 0),
    originalName: String(row.original_name || 'file.bin'),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function decodeBase64Payload(raw: unknown): Buffer | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const cleaned = raw.trim().replace(/^data:[^;]+;base64,/, '');
  if (!cleaned) return null;
  try {
    const buffer = Buffer.from(cleaned, 'base64');
    return buffer.byteLength > 0 ? buffer : null;
  } catch {
    return null;
  }
}

async function persistFileAsset(record: FileAssetRecord): Promise<FileAssetRecord> {
  memoryFileRegistry.set(record.id, record);

  if (!supabaseAdmin) return record;
  try {
    const { data, error } = await supabaseAdmin
      .from('file_assets')
      .insert({
        id: record.id,
        owner_uid: record.ownerUid,
        profile_id: record.profileId || null,
        purpose: record.purpose,
        bucket: record.bucket,
        storage_path: record.storagePath,
        public_url: record.isPrivate ? null : record.url,
        mime_type: record.mimeType,
        size_bytes: record.sizeBytes,
        original_name: record.originalName,
        is_private: record.isPrivate,
      })
      .select('*')
      .maybeSingle();

    if (!error && data) {
      const mapped = mapDbFileAsset(data);
      memoryFileRegistry.set(mapped.id, mapped);
      return mapped;
    }
  } catch {
    // Graceful fallback to memory registry when table not yet provisioned
  }
  return record;
}

async function findFileAssetById(id: string): Promise<FileAssetRecord | null> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('file_assets')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) {
        return mapDbFileAsset(data);
      }
    } catch {
      // Fallback to in-memory registry
    }
  }
  return memoryFileRegistry.get(id) || null;
}

const handleImageUpload = async (req: Request, res: Response) => {
  const uid = res.locals.auth.uid;
  const contentType = String(req.body?.contentType || req.body?.mimeType || '').trim().toLowerCase();
  if (!IMAGE_MIME_TYPES.has(contentType)) {
    res.status(400).json({ error: 'Unsupported image format. Allowed: JPEG, PNG, WebP, GIF.' });
    return;
  }

  const buffer = decodeBase64Payload(req.body?.dataBase64);
  if (!buffer) {
    res.status(400).json({ error: 'Valid base64 image payload (dataBase64) is required.' });
    return;
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: 'Image size exceeds the 2 MB limit.' });
    return;
  }

  const rawPurpose = String(req.body?.purpose || 'images').trim().toLowerCase();
  const purpose = ALLOWED_PURPOSES.has(rawPurpose) ? rawPurpose : 'images';
  const fileName = String(req.body?.fileName || 'image.jpg');

  try {
    const uploaded = await uploadPublicImageBuffer({
      buffer,
      mimeType: contentType,
      originalName: fileName,
      ownerUid: uid,
      purpose,
    });
    const profileId = await resolveProfileUuidByAuthUid(uid);
    const saved = await persistFileAsset({
      id: crypto.randomUUID(),
      ownerUid: uid,
      profileId: profileId || undefined,
      purpose,
      bucket: uploaded.bucket,
      storagePath: uploaded.storagePath,
      url: uploaded.publicUrl,
      isPrivate: false,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      originalName: uploaded.originalName,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      ok: true,
      success: true,
      file: saved,
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Failed to store uploaded image.' });
  }
};

// Public image upload (2 MB max, authenticated users only)
storageRouter.post('/upload/image', requireFirebaseAuth, handleImageUpload);
storageRouter.post('/upload', requireFirebaseAuth, handleImageUpload);

// Private digital product / secure document upload (15 MB max, vendor/admin/moderator only, signed URLs only)
storageRouter.post(
  '/upload/digital',
  requireFirebaseAuth,
  requireRole(['vendor', 'moderator', 'admin', 'super_admin']),
  async (req: Request, res: Response) => {
    const uid = res.locals.auth.uid;
    const contentType = String(req.body?.contentType || req.body?.mimeType || '').trim().toLowerCase();
    if (!DIGITAL_MIME_TYPES.has(contentType)) {
      res.status(400).json({ error: 'Unsupported digital asset format.' });
      return;
    }

    const buffer = decodeBase64Payload(req.body?.dataBase64);
    if (!buffer) {
      res.status(400).json({ error: 'Valid base64 file payload (dataBase64) is required.' });
      return;
    }
    if (buffer.byteLength > MAX_DIGITAL_BYTES) {
      res.status(413).json({ error: 'Digital asset exceeds the 15 MB limit.' });
      return;
    }

    const fileName = String(req.body?.fileName || 'digital-asset.pdf');

    try {
      const uploaded = await uploadPrivateDigitalBuffer({
        buffer,
        mimeType: contentType,
        originalName: fileName,
        ownerUid: uid,
      });
      const profileId = await resolveProfileUuidByAuthUid(uid);
      const saved = await persistFileAsset({
        id: crypto.randomUUID(),
        ownerUid: uid,
        profileId: profileId || undefined,
        purpose: 'digital_product',
        bucket: uploaded.bucket,
        storagePath: uploaded.storagePath,
        url: null,
        isPrivate: true,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        originalName: uploaded.originalName,
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({
        ok: true,
        success: true,
        message: 'Private asset uploaded. Request a temporary signed URL to download.',
        file: {
          ...saved,
          url: null,
        },
      });
    } catch (err: any) {
      res.status(502).json({ error: err?.message || 'Failed to store private digital asset.' });
    }
  }
);

// Generate temporary signed URL for a private asset (owner or governance role only)
storageRouter.get('/file/:id/signed-url', requireFirebaseAuth, async (req: Request, res: Response) => {
  const uid = res.locals.auth.uid;
  const file = await findFileAssetById(String(req.params.id || '').trim());
  if (!file) {
    res.status(404).json({ error: 'File asset not found.' });
    return;
  }

  const isOwner = file.ownerUid === uid;
  const isPrivileged = isPrivilegedRole(res.locals.auth);
  if (!isOwner && !isPrivileged) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to generate a download link for this asset.' });
    return;
  }

  const requestedExpiry = Number(req.query?.expiresIn || 900);
  try {
    const signed = await createSignedAssetUrl(
      file.bucket,
      file.storagePath,
      Number.isFinite(requestedExpiry) ? requestedExpiry : 900
    );
    res.json({
      ok: true,
      success: true,
      fileId: file.id,
      fileName: file.originalName,
      ...signed,
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Unable to generate signed download URL.' });
  }
});

// File metadata retrieval (private assets keep url strictly null and require owner/admin)
storageRouter.get('/file/:id', requireFirebaseAuth, async (req: Request, res: Response) => {
  const uid = res.locals.auth.uid;
  const file = await findFileAssetById(String(req.params.id || '').trim());
  if (!file) {
    res.status(404).json({ error: 'File asset not found.' });
    return;
  }

  if (file.isPrivate && file.ownerUid !== uid && !isPrivilegedRole(res.locals.auth)) {
    res.status(403).json({ error: 'Forbidden: Private file metadata is restricted.' });
    return;
  }

  res.json({
    ok: true,
    success: true,
    file: {
      ...file,
      url: file.isPrivate ? null : file.url,
    },
  });
});

// Owner or admin/super_admin delete
storageRouter.delete('/file/:id', requireFirebaseAuth, async (req: Request, res: Response) => {
  const uid = res.locals.auth.uid;
  const id = String(req.params.id || '').trim();
  const file = await findFileAssetById(id);
  if (!file) {
    res.status(404).json({ error: 'File asset not found.' });
    return;
  }

  const role = String(res.locals.auth.role || '');
  const isOwner = file.ownerUid === uid;
  const isAdmin = role === 'admin' || role === 'super_admin';
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: 'Forbidden: You cannot delete another user’s files.' });
    return;
  }

  await deleteFromStorage(file.bucket, file.storagePath);
  memoryFileRegistry.delete(id);

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('file_assets').delete().eq('id', id);
    } catch {
      // Ignore if table not provisioned
    }
  }

  res.json({ ok: true, success: true, message: 'File asset deleted.' });
});

export default storageRouter;
