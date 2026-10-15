create table if not exists public.hijri_month_starts (
 year integer not null check(year between 1400 and 1600),
 month integer not null check(month in (9,10,12)),
 start_date date not null check(start_date between '2000-01-01'::date and '2100-12-31'::date),
 source text not null, published_at timestamptz not null,
 primary key(year,month)
);
alter table public.hijri_month_starts enable row level security;
revoke all on public.hijri_month_starts from anon,authenticated;
grant select on public.hijri_month_starts to anon,authenticated;
grant all on public.hijri_month_starts to service_role;
create policy hijri_month_starts_public_read on public.hijri_month_starts for select to anon,authenticated using(true);
create table if not exists public.hijri_sync_state (
 id integer primary key check(id=1),secret text not null,
 last_checked timestamptz,last_status jsonb
);
alter table public.hijri_sync_state enable row level security;
revoke all on public.hijri_sync_state from anon,authenticated;
grant all on public.hijri_sync_state to service_role;
insert into public.hijri_sync_state(id,secret) values(1,gen_random_uuid()::text||gen_random_uuid()::text) on conflict(id) do nothing;
create policy hijri_sync_state_deny_public on public.hijri_sync_state for all to anon,authenticated using(false) with check(false);
select cron.schedule('aoqat-verified-hijri-sync','*/5 * * * *',$job$ select net.http_post(url:='https://ytdvhiijxxaqofduorwm.supabase.co/functions/v1/hijri-sync',headers:=jsonb_build_object('Content-Type','application/json','x-hijri-sync-secret',(select secret from public.hijri_sync_state where id=1)),body:='{}'::jsonb,timeout_milliseconds:=30000); $job$);
