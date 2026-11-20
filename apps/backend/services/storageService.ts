import { supabaseAdmin } from './dbService.js';

/**
 * Upload a file buffer to Supabase Storage.
 * @param buffer - Buffer or Uint8Array containing file data.
 * @param path - Destination path inside the bucket (e.g. 'users/uid/kyc/file.pdf').
 * @param mimeType - MIME type of the file (e.g. 'application/pdf').
 * @param bucket - Optional bucket name; defaults to 'public'.
 * @returns Public URL of the uploaded file.
 */
export async function uploadToStorage(
  buffer: Buffer | Uint8Array,
  path: string,
  mimeType: string,
  bucket: string = 'public',
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }

  const { data: publicData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}
