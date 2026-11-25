import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

export const PUBLIC_MEDIA_BUCKET = 'paikarmart-avatars';
export const PRIVATE_ASSETS_BUCKET = 'paikarmart-kyc-docs';

export function sanitizeStorageFilename(originalName: string): string {
  const cleaned = String(originalName || 'file.bin')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\0/g, '')
    .replace(/\.\.+/g, '.')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^[._-]+/, '');
  return cleaned.slice(-80) || `asset_${Date.now()}.bin`;
}

export async function ensureStorageBucket(
  bucketId: string,
  isPublic: boolean,
  maxBytes: number,
  allowedMimeTypes: string[]
): Promise<boolean> {
  if (!supabaseAdmin) return false;
  try {
    const { data: existing, error: getError } = await supabaseAdmin.storage.getBucket(bucketId);
    if (existing && !getError) return true;

    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketId, {
      public: isPublic,
      fileSizeLimit: maxBytes,
      allowedMimeTypes,
    });
    if (!createError) return true;
    return String(createError.message || '').toLowerCase().includes('already exists');
  } catch {
    return false;
  }
}

/**
 * Upload a file buffer to Supabase Storage (Free Tier).
 * Falls back cleanly to a local placeholder path if Supabase Storage is not configured.
 */
export async function uploadToStorage(
  buffer: Buffer | Uint8Array,
  storagePath: string,
  mimeType: string,
  bucket: string = PRIVATE_ASSETS_BUCKET
): Promise<string> {
  if (!supabaseAdmin) {
    return `local-fallback://${bucket}/${storagePath}`;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }

  const { data: publicData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

export interface StoredFileDescriptor {
  bucket: string;
  storagePath: string;
  publicUrl: string | null;
  isPrivate: boolean;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

export async function uploadPublicImageBuffer(params: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  ownerUid: string;
  purpose: string;
}): Promise<StoredFileDescriptor> {
  const safeName = sanitizeStorageFilename(params.originalName);
  const safePurpose = params.purpose.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'images';
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const storagePath = `users/${params.ownerUid}/${safePurpose}/${uniqueSuffix}-${safeName}`;

  if (!supabaseAdmin) {
    return {
      bucket: PUBLIC_MEDIA_BUCKET,
      storagePath,
      publicUrl: `local-fallback://${PUBLIC_MEDIA_BUCKET}/${storagePath}`,
      isPrivate: false,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.byteLength,
      originalName: safeName,
    };
  }

  await ensureStorageBucket(PUBLIC_MEDIA_BUCKET, true, 5 * 1024 * 1024, [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);

  const { data, error } = await supabaseAdmin.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .upload(storagePath, params.buffer, {
      contentType: params.mimeType,
      upsert: false,
    });

  if (error || !data) {
    throw new Error(`Storage image upload failed: ${error?.message || 'Unknown error'}`);
  }

  const { data: publicData } = supabaseAdmin.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .getPublicUrl(data.path);

  return {
    bucket: PUBLIC_MEDIA_BUCKET,
    storagePath: data.path,
    publicUrl: publicData.publicUrl,
    isPrivate: false,
    mimeType: params.mimeType,
    sizeBytes: params.buffer.byteLength,
    originalName: safeName,
  };
}

export async function uploadPrivateDigitalBuffer(params: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  ownerUid: string;
}): Promise<StoredFileDescriptor> {
  const safeName = sanitizeStorageFilename(params.originalName);
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const storagePath = `users/${params.ownerUid}/digital/${uniqueSuffix}-${safeName}`;

  if (!supabaseAdmin) {
    return {
      bucket: PRIVATE_ASSETS_BUCKET,
      storagePath,
      publicUrl: null,
      isPrivate: true,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.byteLength,
      originalName: safeName,
    };
  }

  await ensureStorageBucket(PRIVATE_ASSETS_BUCKET, false, 15 * 1024 * 1024, [
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

  const { data, error } = await supabaseAdmin.storage
    .from(PRIVATE_ASSETS_BUCKET)
    .upload(storagePath, params.buffer, {
      contentType: params.mimeType,
      upsert: false,
    });

  if (error || !data) {
    throw new Error(`Private digital upload failed: ${error?.message || 'Unknown error'}`);
  }

  return {
    bucket: PRIVATE_ASSETS_BUCKET,
    storagePath: data.path,
    publicUrl: null,
    isPrivate: true,
    mimeType: params.mimeType,
    sizeBytes: params.buffer.byteLength,
    originalName: safeName,
  };
}

export async function createSignedAssetUrl(
  bucket: string,
  storagePath: string,
  expiresInSeconds = 900
): Promise<{ signedUrl: string; expiresIn: number; expiresAt: string }> {
  const safeExpiry = Math.min(3600, Math.max(60, Math.floor(expiresInSeconds || 900)));
  const expiresAt = new Date(Date.now() + safeExpiry * 1000).toISOString();

  if (!supabaseAdmin) {
    const token = crypto.randomBytes(12).toString('hex');
    return {
      signedUrl: `local-signed://${bucket}/${storagePath}?token=${token}&expires=${safeExpiry}`,
      expiresIn: safeExpiry,
      expiresAt,
    };
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storagePath, safeExpiry);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message || 'Unknown error'}`);
  }

  return {
    signedUrl: data.signedUrl,
    expiresIn: safeExpiry,
    expiresAt,
  };
}

export async function deleteFromStorage(bucket: string, storagePath: string): Promise<boolean> {
  if (!supabaseAdmin) return true;
  const { error } = await supabaseAdmin.storage.from(bucket).remove([storagePath]);
  return !error;
}
