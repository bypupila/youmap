alter table public.map_polls
  add column if not exists poll_mode text not null default 'country_city';

alter table public.map_polls
  drop constraint if exists map_polls_mode_check;

alter table public.map_polls
  add constraint map_polls_mode_check check (poll_mode in ('country', 'country_city'));

create index if not exists map_polls_status_closes_at_idx
  on public.map_polls (status, closes_at)
  where status = 'live';
