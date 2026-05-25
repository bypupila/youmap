create table if not exists public.viewer_account_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  username text,
  country_code text,
  city text,
  reason text,
  deleted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists viewer_account_deletions_deleted_at_idx
  on public.viewer_account_deletions (deleted_at desc);
