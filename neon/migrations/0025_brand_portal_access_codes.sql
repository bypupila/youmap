alter table public.brand_portal_links
  add column if not exists access_email text,
  add column if not exists access_code_hash text,
  add column if not exists require_access_code boolean not null default false,
  add column if not exists access_granted_count integer not null default 0,
  add column if not exists last_access_granted_at timestamptz;

create index if not exists brand_portal_links_access_email_idx
  on public.brand_portal_links (lower(access_email))
  where access_email is not null;
