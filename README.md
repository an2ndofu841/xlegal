# 本店移転らくらく登記

株式会社・合同会社の **本店移転登記** に必要な書類一式を、フォーム入力から自動生成する Web サービス（本人申請向け）。

- 管轄内/管轄外・株式会社/合同会社・定款変更の有無などの分岐をウィザードで吸収。
- 最も誤記の多い「登記すべき事項」を自動生成。
- 生成物は編集可能な `.docx` ＋ コピペ用テキスト。

> 本サービスは書類作成支援ツールであり、代理申請（司法書士業務）・法務局へのオンライン直接送信・登録免許税の決済代行は行いません。

## 技術スタック

- Next.js（App Router, TypeScript）/ Vercel
- Supabase（Postgres + Auth + Storage）/ `@supabase/ssr`
- react-hook-form + zod
- Tailwind CSS
- docxtemplater + pizzip（.docx 生成）/ jszip（ZIP まとめ DL）
- Vitest（ユニット/結合テスト）

## セットアップ

1. 依存インストール

   ```bash
   npm install
   ```

2. 環境変数。`.env.example` を `.env.local` にコピーし、Supabase の値を設定。

   ```bash
   cp .env.example .env.local
   ```

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（publishable キー。frontend に公開可）
   - `NEXT_PUBLIC_SITE_URL`（例: http://localhost:3000）

3. データベース。`supabase/migrations/0001_init.sql` を対象プロジェクトに適用。
   全テーブル RLS 有効化・`profiles` 自動作成トリガ・Storage バケット `documents`（private）を作成します。

4. .docx テンプレート生成（`/templates/*.docx`。リポジトリにも生成済み）

   ```bash
   node scripts/build-templates.mjs
   ```

## 開発コマンド

```bash
npm run dev     # 開発サーバ起動（http://localhost:3000）
npm test        # ユニット/結合テスト（ロジック・書類生成のE2E）
npm run build   # 本番ビルド + 型チェック
npm run lint    # ESLint
```

## ディレクトリ構成

```
app/
  (top) page.tsx              LP
  pricing/                    料金
  login/, auth/               認証（メールマジックリンク）
  dashboard/                  案件一覧
  wizard/[relocationId]/      入力ウィザード + complete（完了画面）
  api/relocations/...         作成・保存・生成・ZIP DL の Route Handler
components/                   UI
lib/
  supabase/                   client / server / middleware
  docgen/                     wareki, docRules, generate（§6・§7ロジック）
  validation/                 zod スキーマ
templates/                    *.docx テンプレート
scripts/build-templates.mjs   テンプレート生成
supabase/migrations/          §5 スキーマ + RLS
tests/                        E2E（代表ケースの全書類生成）
```

## 法務・コンプラ要件（生成ロジックに反映済み）

- 管轄外移転は申請書 2 通（旧分・新分）。提出は旧本店管轄へまとめて（経由申請）。
- 登録免許税: 1 通 3 万円（管轄内 3 万円 / 管轄外 6 万円）。
- 期限: 移転日から 2 週間以内。
- 登記すべき事項: `「登記記録に関する事項」<和暦移転日>　<移転後本店>　に本店移転`。
- 印鑑届書は不要（2025/4/21〜）。完了後に新所在地で印鑑カードの交付申請が必要、と案内表示。
- 定款変更の要否: 定款が市区町村まで＋同一区画 → 不要 / 地番記載 or 区画跨ぎ → 必要。
- 住所非表示措置: 管轄外移転時のみ選択可。新分申請書に追記。

> 法的文言は法務局公式記載例（[001252661.pdf](https://houmukyoku.moj.go.jp/homu/content/001252661.pdf) 等）を正とし、テンプレートの雛形と必ず突合してください。

## 未対応（フェーズ2 以降）

- 法務局管轄マスタによる管轄自動判定（現状は手動チェック）。
- 代表者住所変更の同時申請。
- PDF 出力（現状 .docx のみ）。
- 委任状（代理人申請）。
