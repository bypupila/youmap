create table if not exists public.auth_login_attempts (
  id bigserial primary key,
  identifier_hash text not null,
  ip_hash text null,
  created_at timestamptz not null default now()
);

create index if not exists auth_login_attempts_identifier_created_idx
  on public.auth_login_attempts (identifier_hash, created_at desc);

create index if not exists auth_login_attempts_ip_created_idx
  on public.auth_login_attempts (ip_hash, created_at desc);

create index if not exists auth_login_attempts_created_idx
  on public.auth_login_attempts (created_at desc);

create table if not exists public.security_request_rate_limits (
  id bigserial primary key,
  scope text not null,
  actor_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists security_request_rate_limits_scope_actor_created_idx
  on public.security_request_rate_limits (scope, actor_hash, created_at desc);

create index if not exists security_request_rate_limits_created_idx
  on public.security_request_rate_limits (created_at desc);

create table if not exists public.user_role_audit (
  id bigserial primary key,
  target_user_id uuid not null,
  target_user_email text not null,
  target_user_username text not null,
  target_display_name text not null,
  previous_role text not null,
  new_role text not null,
  changed_by_user_id uuid not null,
  changed_by_username text not null,
  changed_by_display_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_role_audit_created_at_idx
  on public.user_role_audit (created_at desc);

create index if not exists user_role_audit_target_user_id_idx
  on public.user_role_audit (target_user_id);

create table if not exists public.user_session_revocations (
  user_id uuid primary key,
  revoked_after timestamptz not null,
  reason text not null,
  updated_at timestamptz not null default now()
);

create index if not exists user_session_revocations_revoked_after_idx
  on public.user_session_revocations (revoked_after);
