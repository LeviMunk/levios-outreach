-- LeviOS Outreach: encrypted cross-device vault with compare-and-swap writes.
-- Only the owner's encrypted vault payload is client-readable. Gmail tokens are service-role-only.
create table if not exists public.outreach_vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ? 'ciphertext' and payload ? 'salt' and payload ? 'iv'
    and octet_length(payload::text) <= 5000000
  ),
  updated_at timestamptz not null default now()
);
alter table public.outreach_vaults enable row level security;
revoke all on public.outreach_vaults from public, anon, authenticated;
grant select on public.outreach_vaults to authenticated;
drop policy if exists "Owner can read their encrypted vault" on public.outreach_vaults;
create policy "Owner can read their encrypted vault"
on public.outreach_vaults for select to authenticated
using (user_id = (select auth.uid())
  and (select auth.jwt() ->> 'email') = 'levivanstap@gmail.com');

create or replace function public.outreach_save_vault(p_expected_revision bigint, p_payload jsonb)
returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare v_rev bigint;
begin
  if auth.uid() is null or (auth.jwt() ->> 'email') is distinct from 'levivanstap@gmail.com' then
    raise exception 'Outreach cloud access denied' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or
     p_payload is null or jsonb_typeof(p_payload) <> 'object' or
     not (p_payload ? 'ciphertext' and p_payload ? 'salt' and p_payload ? 'iv') or
     octet_length(p_payload::text) > 5000000 then
    raise exception 'Invalid encrypted vault payload' using errcode = '22023';
  end if;
  if p_expected_revision = 0 then
    insert into public.outreach_vaults(user_id, revision, payload)
    values (auth.uid(), 1, p_payload)
    on conflict (user_id) do nothing
    returning revision into v_rev;
  else
    update public.outreach_vaults
    set revision = revision + 1, payload = p_payload, updated_at = now()
    where user_id = auth.uid() and revision = p_expected_revision
    returning revision into v_rev;
  end if;
  if v_rev is null then
    raise exception 'Cloud vault changed on another device; manual resolution required'
      using errcode = '40001';
  end if;
  return v_rev;
end $$;
revoke all on function public.outreach_save_vault(bigint,jsonb) from public, anon;
grant execute on function public.outreach_save_vault(bigint,jsonb) to authenticated;

-- Privileged Gmail tables; do not grant ordinary client access.
create table if not exists public.outreach_gmail_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gmail_address text not null,
  refresh_token_sealed text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.outreach_gmail_connections enable row level security;
revoke all on public.outreach_gmail_connections from public, anon, authenticated;
create table if not exists public.outreach_gmail_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  gmail_draft_id text not null,
  gmail_message_id text,
  created_at timestamptz not null default now(),
  primary key(user_id,idempotency_key)
);
alter table public.outreach_gmail_drafts enable row level security;
revoke all on public.outreach_gmail_drafts from public, anon, authenticated;
