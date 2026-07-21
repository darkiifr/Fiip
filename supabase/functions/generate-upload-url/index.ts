import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { resolveRequestUser } from '../_shared/request-auth.ts';
import { getR2Bucket, getR2Client } from '../_shared/r2.ts';

const MAX_UPLOAD_URL_SECONDS = 5 * 60;

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const supabase = createAdminClient();
    const user = await resolveRequestUser(req, supabase);
    const body = await req.json().catch(() => ({}));
    const fileType = String(body.fileType || 'application/octet-stream').slice(0, 255);
    const fileName = String(body.encryptedFileName || body.fileName || '').slice(0, 4000);
    const expectedSize = Number(body.fileSize || 0);
    const noteId = body.noteId ? String(body.noteId) : null;
    if (!Number.isFinite(expectedSize) || expectedSize <= 0) {
      return jsonResponse({ error: 'Invalid file size' }, { status: 400 });
    }

    const fileId = crypto.randomUUID();
    const fileKey = `${user.id}/${fileId}`;
    const { error } = await supabase.rpc('fiip_begin_file_upload', {
      p_owner_id: user.id,
      p_file_id: fileId,
      p_note_id: noteId,
      p_file_key: fileKey,
      p_file_name: fileName,
      p_file_type: fileType,
      p_file_size: expectedSize,
    });
    if (error) throw error;

    const command = new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: fileKey,
      ContentType: fileType,
      ContentLength: expectedSize,
    });
    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: MAX_UPLOAD_URL_SECONDS });
    return jsonResponse({ fileId, fileKey, uploadUrl, expiresIn: MAX_UPLOAD_URL_SECONDS });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload URL failed';
    const status = message.includes('LIMIT_EXCEEDED') ? 413 : 401;
    return jsonResponse({ error: message }, { status });
  }
});
