import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* ヒーロー */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-50/60 to-canvas"
        />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-medium tracking-wide text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            本人申請向け・司法書士費用の数分の一
          </p>
          <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.2] tracking-tight text-ink sm:text-5xl">
            本店移転登記の書類一式を
            <br />
            <span className="text-brand-600">数分で、入力ミスなく</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted">
            株式会社・合同会社の本店移転登記。質問に答えるだけで、最も間違いの多い「登記すべき事項」も自動で正しく生成。
            編集できる .docx とコピペ用テキストの両方をお渡しします。
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-7 py-3 font-medium text-white shadow-sm transition hover:bg-brand-800"
            >
              無料で始める
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-7 py-3 font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50"
            >
              料金を見る
            </Link>
          </div>
        </div>
      </section>

      {/* 3ステップ */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink">
            かんたん3ステップ
          </h2>
          <p className="mt-3 text-sm text-muted">迷わず、最短で書類一式まで。</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            { n: "01", t: "質問に答える", d: "会社種別・移転先・定款の記載などをウィザードで入力。管轄外/管轄内や定款変更の要否は自動で判定します。" },
            { n: "02", t: "内容を確認", d: "生成される書類・登録免許税・提出先・期限を画面で確認。" },
            { n: "03", t: "ダウンロード", d: "編集可能な .docx を個別/ZIPで取得。登記すべき事項はコピペ用テキストも。" },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-line bg-surface p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="font-serif text-2xl font-bold text-brand-200">
                {s.n}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-ink">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 対応パターン */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center font-serif text-3xl font-bold tracking-tight text-ink">
            対応パターン
          </h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {[
              "株式会社 / 合同会社",
              "管轄内 / 管轄外（経由申請に対応）",
              "定款変更あり / なし（自動判定）",
              "取締役会 設置 / 非設置（株式会社）",
              "株主リストの自動作成（定款変更時）",
              "代表取締役等住所非表示措置の申出（管轄外時）",
            ].map((p) => (
              <div
                key={p}
                className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 px-4 py-3.5 text-sm text-ink"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
