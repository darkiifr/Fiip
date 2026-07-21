import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { getEnv } from '../_shared/env.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  const authorization = req.headers.get('Authorization') || '';
  if (authorization !== `Bearer ${getEnv('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return jsonResponse({ error: 'Forbidden' }, { status: 403 });
  }

  const { backupId, confirm, adminId } = await req.json().catch(() => ({}));
  if (!backupId || confirm !== 'RESTORE_BACKUP') {
    return jsonResponse({ error: 'Explicit confirmation required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: backup, error: backupError } = await supabase
    .from('backup_runs')
    .select('id, status')
    .eq('id', backupId)
    .eq('status', 'complete')
    .single();
  if (backupError || !backup) {
    return jsonResponse({ error: 'Completed backup not found' }, { status: 404 });
  }

  const githubOwner = getEnv('FIIP_GITHUB_OWNER');
  const githubRepo = getEnv('FIIP_GITHUB_REPO');
  const dispatch = await fetch(
    `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/postgres-b2-restore.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${getEnv('GITHUB_BACKUP_RESTORE_TOKEN')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'fiip-restore-function',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          backup_id: String(backupId),
          admin_id: String(adminId || 'fiip-admin'),
        },
      }),
    },
  );
  if (!dispatch.ok) {
    const detail = await dispatch.text();
    return jsonResponse({ error: `GitHub dispatch failed (${dispatch.status})`, detail }, { status: 502 });
  }

  await supabase.from('audit_log').insert({
    admin_id: String(adminId || 'fiip-admin'),
    action: 'restore_backup_requested',
    target_table: 'backup_runs',
    target_id: String(backupId),
    details: { status: 'queued' },
  });

  return jsonResponse({
    accepted: true,
    backupId,
    message: 'Protected restore workflow dispatched.',
  }, { status: 202 });
});
