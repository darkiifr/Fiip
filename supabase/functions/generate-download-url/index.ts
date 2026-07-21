import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { resolveRequestUser } from '../_shared/request-auth.ts';
import { getR2Bucket, getR2Client } from '../_shared/r2.ts';

const MAX_DOWNLOAD_URL_SECONDS = 10 * 60;

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const supabase = createAdminClient();
    const user = await resolveRequestUser(req, supabase);
    const { fileId } = await req.json();
    if (!fileId) return jsonResponse({ error: 'Missing fileId' }, { status: 400 });

    const { data: file, error } = await supabase
      .from('files')
      .select('id, owner_id, file_key, file_type, file_size, status')
      .eq('id', fileId)
      .eq('owner_id', user.id)
      .eq('status', 'confirmed')
      .single();
    if (error || !file) return jsonResponse({ error: 'File not found' }, { status: 404 });

    const downloadUrl = await getSignedUrl(getR2Client(), new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: file.file_key,
    }), { expiresIn: MAX_DOWNLOAD_URL_SECONDS });
    return jsonResponse({ downloadUrl, expiresIn: MAX_DOWNLOAD_URL_SECONDS, file });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Download URL failed' }, { status: 401 });
  }
});
