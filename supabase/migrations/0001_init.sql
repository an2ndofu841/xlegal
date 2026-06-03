-- =============================================================================
-- 本店移転登記 書類生成サービス 初期スキーマ
-- §5 データモデル + RLS + profiles 自動作成トリガ + Storage バケット
-- すべてのテーブルで RLS を有効化し、所有者(auth.uid())のみアクセス可とする。
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles（auth.users と 1:1）
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- companies（会社）
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_type text not null check (company_type in ('kk','llc')), -- 株式会社/合同会社
  corporate_number text,           -- 会社法人等番号（任意）
  name text not null,              -- 商号
  has_board boolean default false, -- 取締役会設置（株式会社のみ意味あり）
  rep_title text,                  -- 代表取締役/代表社員
  rep_name text not null,
  rep_address text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- relocations（移転案件）
-- ---------------------------------------------------------------------------
create table if not exists public.relocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  old_address text not null,                       -- 移転前 本店（地番まで）
  new_address text not null,                       -- 移転後 本店（地番まで）
  transfer_date date not null,                     -- 移転日（実際に移転した日）
  is_cross_jurisdiction boolean not null,          -- 管轄外か
  requires_articles_amendment boolean not null,    -- 定款変更が必要か
  meeting_date date,                               -- 株主総会/同意の日付
  old_registry_office text not null,               -- 旧本店管轄の登記所名
  new_registry_office text,                        -- 新本店管轄の登記所名（管轄外のみ）
  apply_address_nondisclosure boolean default false, -- 非表示措置の申出
  status text not null default 'draft' check (status in ('draft','generated')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- shareholders（株主リスト用。定款変更時のみ使用）
-- ---------------------------------------------------------------------------
create table if not exists public.shareholders (
  id uuid primary key default gen_random_uuid(),
  relocation_id uuid not null references public.relocations(id) on delete cascade,
  name text not null,
  address text not null,
  shares integer not null,        -- 株式数
  voting_rights integer not null, -- 議決権数
  sort_order integer not null     -- 議決権割合の多い順
);

-- ---------------------------------------------------------------------------
-- documents（生成書類）
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  relocation_id uuid not null references public.relocations(id) on delete cascade,
  doc_type text not null,   -- application_old / application_new / minutes / ...
  storage_path text not null,
  created_at timestamptz default now()
);

create index if not exists idx_companies_user on public.companies(user_id);
create index if not exists idx_relocations_user on public.relocations(user_id);
create index if not exists idx_relocations_company on public.relocations(company_id);
create index if not exists idx_shareholders_relocation on public.shareholders(relocation_id);
create index if not exists idx_documents_relocation on public.documents(relocation_id);

-- =============================================================================
-- RLS 有効化
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.relocations enable row level security;
alter table public.shareholders enable row level security;
alter table public.documents enable row level security;

-- profiles: 本人のみ
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

-- companies: 所有者のみ
create policy "companies_select_own" on public.companies
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "companies_insert_own" on public.companies
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "companies_update_own" on public.companies
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "companies_delete_own" on public.companies
  for delete to authenticated using ((select auth.uid()) = user_id);

-- relocations: 所有者のみ
create policy "relocations_select_own" on public.relocations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "relocations_insert_own" on public.relocations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "relocations_update_own" on public.relocations
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "relocations_delete_own" on public.relocations
  for delete to authenticated using ((select auth.uid()) = user_id);

-- shareholders: 紐づく relocation の所有者のみ（user_id を持たないため経由で判定）
create policy "shareholders_all_own" on public.shareholders
  for all to authenticated
  using (
    exists (
      select 1 from public.relocations r
      where r.id = shareholders.relocation_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.relocations r
      where r.id = shareholders.relocation_id and r.user_id = (select auth.uid())
    )
  );

-- documents: 紐づく relocation の所有者のみ
create policy "documents_all_own" on public.documents
  for all to authenticated
  using (
    exists (
      select 1 from public.relocations r
      where r.id = documents.relocation_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.relocations r
      where r.id = documents.relocation_id and r.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- profiles 自動作成トリガ
-- security definer 関数だが、トリガからのみ呼び出すため anon/authenticated からの
-- 直接実行権限は剥奪する（§Supabase セキュリティチェックリスト）。
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 既定で PUBLIC に付与される EXECUTE を剥奪（トリガからの実行には影響しない）。
revoke execute on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Storage バケット（private）+ ポリシー
-- パス形式: {user_id}/{relocation_id}/{filename}
-- upsert を許可するため INSERT/SELECT/UPDATE を付与（§セキュリティチェックリスト）。
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_storage_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents_storage_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents_storage_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
