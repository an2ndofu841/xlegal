-- =============================================================================
-- relocations に「定款で本店を定めている条番号」を追加
-- 株主総会議事録の「定款第○条を変更し…」に差し込む。一般的に第3条のため既定3。
-- =============================================================================
alter table public.relocations
  add column if not exists articles_clause_number integer not null default 3;
