do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('viewer', 'creator', 'superadmin');
  end if;
end $$;

alter table public.users
  add column if not exists role public.user_role not null default 'creator';

create index if not exists users_role_idx on public.users (role);
