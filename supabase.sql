-- Run once in your Supabase project's SQL Editor.
-- A signed-in user can read/write only their OWN build-vault record.
create table if not exists public.build_vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  builds jsonb not null default '[]'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint builds_is_array check (jsonb_typeof(builds) = 'array')
);

alter table public.build_vaults enable row level security;

revoke all on table public.build_vaults from anon;
grant select, insert, update on public.build_vaults to authenticated;

create policy "Owner can read own vault" on public.build_vaults
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can insert own vault" on public.build_vaults
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update own vault" on public.build_vaults
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.save_build_vault(p_expected_revision bigint, p_builds jsonb)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_revision bigint;
  existing_revision bigint;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_builds is null or jsonb_typeof(p_builds) <> 'array' then
    raise exception 'INVALID_BUILDS';
  end if;
  if pg_column_size(p_builds) > 2000000 then
    raise exception 'VAULT_TOO_LARGE';
  end if;
  select revision into existing_revision from public.build_vaults
    where user_id=auth.uid() for update;
  if not found then
    if p_expected_revision <> 0 then raise exception 'SYNC_CONFLICT'; end if;
    insert into public.build_vaults(user_id, builds, revision, updated_at)
    values (auth.uid(), p_builds, 1, now());
    return 1;
  end if;
  if existing_revision <> p_expected_revision then
    raise exception 'SYNC_CONFLICT';
  end if;
  next_revision := existing_revision + 1;
  update public.build_vaults
     set builds=p_builds, revision=next_revision, updated_at=now()
   where user_id=auth.uid();
  return next_revision;
end;
$$;
revoke all on function public.save_build_vault(bigint,jsonb) from public, anon;
grant execute on function public.save_build_vault(bigint,jsonb) to authenticated;