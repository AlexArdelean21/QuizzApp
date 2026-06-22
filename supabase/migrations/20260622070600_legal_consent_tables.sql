-- Tabel: legal_documents
-- Versionarea documentelor legale (confidențialitate, termeni, cookies)
create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('confidentialitate', 'termeni', 'cookies')),
  version text not null,
  is_current boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (type, version)
);

create index if not exists idx_legal_documents_type_current
  on public.legal_documents (type, is_current)
  where is_current = true;

-- Trigger: la insert/update cu is_current = true, dezactivează celelalte versiuni ale aceluiași tip
create or replace function public.enforce_single_current_legal_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.is_current = true then
    update public.legal_documents
    set is_current = false
    where type = NEW.type
      and id != NEW.id
      and is_current = true;
  end if;
  return NEW;
end;
$$;

-- Revoke direct invocation; function is called only by the trigger above
revoke execute on function public.enforce_single_current_legal_document() from anon, authenticated;

drop trigger if exists trg_enforce_single_current_legal_document on public.legal_documents;
create trigger trg_enforce_single_current_legal_document
  after insert or update of is_current on public.legal_documents
  for each row
  when (NEW.is_current = true)
  execute function public.enforce_single_current_legal_document();

-- Tabel: user_consents
-- Log imuabil al consimțământului dat de fiecare utilizator pentru fiecare versiune de document
create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('confidentialitate', 'termeni', 'cookies')),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  unique (user_id, document_type, document_version)
);

create index if not exists idx_user_consents_user_id on public.user_consents (user_id);
create index if not exists idx_user_consents_type_version on public.user_consents (document_type, document_version);

-- RLS: legal_documents
alter table public.legal_documents enable row level security;

drop policy if exists "legal_documents_select_public" on public.legal_documents;
create policy "legal_documents_select_public"
  on public.legal_documents
  for select
  to anon, authenticated
  using (true);

drop policy if exists "legal_documents_insert_super_admin" on public.legal_documents;
create policy "legal_documents_insert_super_admin"
  on public.legal_documents
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'super_admin'
    )
  );

drop policy if exists "legal_documents_update_super_admin" on public.legal_documents;
create policy "legal_documents_update_super_admin"
  on public.legal_documents
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'super_admin'
    )
  );

drop policy if exists "legal_documents_delete_super_admin" on public.legal_documents;
create policy "legal_documents_delete_super_admin"
  on public.legal_documents
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'super_admin'
    )
  );

-- RLS: user_consents
alter table public.user_consents enable row level security;

drop policy if exists "user_consents_select_own" on public.user_consents;
create policy "user_consents_select_own"
  on public.user_consents
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_consents_select_super_admin" on public.user_consents;
create policy "user_consents_select_super_admin"
  on public.user_consents
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'super_admin'
    )
  );

drop policy if exists "user_consents_insert_own" on public.user_consents;
create policy "user_consents_insert_own"
  on public.user_consents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Seed: versiunea 1.0 pentru toate cele 3 documente, marcate ca curente
-- on conflict do nothing = idempotent la re-run
insert into public.legal_documents (type, version, is_current, published_at) values
  ('confidentialitate', '1.0', true, now()),
  ('termeni', '1.0', true, now()),
  ('cookies', '1.0', true, now())
on conflict (type, version) do nothing;
