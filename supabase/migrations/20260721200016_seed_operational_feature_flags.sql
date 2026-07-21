-- Register the production feature controls consumed by Fiip clients.

insert into public.feature_flags (
  feature_key,
  scope,
  status,
  message,
  reason,
  enabled_for,
  updated_at
) values
  ('global_maintenance', 'all', 'enabled', '', '', '[]'::jsonb, timezone('utc'::text, now())),
  ('app_maintenance', 'app', 'enabled', '', '', '[]'::jsonb, timezone('utc'::text, now())),
  ('mobile_maintenance', 'mobile', 'enabled', '', '', '[]'::jsonb, timezone('utc'::text, now())),
  ('site_maintenance', 'site', 'enabled', '', '', '[]'::jsonb, timezone('utc'::text, now())),
  ('site_announcement', 'site', 'enabled', '', '', '[]'::jsonb, timezone('utc'::text, now()))
on conflict (feature_key) do nothing;
