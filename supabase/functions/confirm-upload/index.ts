import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { resolveRequestUser } from '../_shared/request-auth.ts';
import { headR2Object } from '../_shared/r2.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const supabase = createAdminClient();
    const user = await resolveRequestUser(req, supabase);
    const { fileId, checksum } = await req.json();
    if (!fileId) return jsonResponse({ error: 'Missing fileId' }, { status: 400 });

    const { data: file, error: readError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('owner_id', user.id)
      .single();
    if (readError || !file) return jsonResponse({ error: 'File not found' }, { status: 404 });

    const head = await headR2Object(file.file_key);
    const actualSize = Number(head.ContentLength || 0);
    if (actualSize !== Number(file.file_size)) {
      await supabase.from('files').update({ status: 'failed' }).eq('id', file.id);
      return jsonResponse({ error: 'Uploaded size mismatch' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('files')
      .update({
        status: 'confirmed',
        encrypted_checksum: checksum ? String(checksum) : file.encrypted_checksum,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', file.id)
      .eq('owner_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return jsonResponse({ file: data });
  } catch {
    return jsonResponse({ error: 'Authentification requise pour confirmer cet envoi.' }, { status: 401 });
  }
});
