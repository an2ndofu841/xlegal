import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* ヒーロー */}
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <p className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            本人申請向け・司法書士費用の数分の一
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
            本店移転登記の書類一式を
            <br />
            <span className="text-blue-600">数分で、入力ミスなく</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-gray-600">
            株式会社・合同会社の本店移転登記。質問に答えるだけで、最も間違いの多い「登記すべき事項」も自動で正しく生成。
            編集できる .docx とコピペ用テキストの両方をお渡しします。
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              無料で始める
            </Link>
            <Link
              href="/pricing"
              className="rounded-md border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              料金を見る
            </Link>
          </div>
        </div>
      </section>

      {/* 3ステップ */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold">かんたん3ステップ</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { n: "1", t: "質問に答える", d: "会社種別・移転先・定款の記載などをウィザードで入力。管轄外/管轄内や定款変更の要否は自動で判定します。" },
            { n: "2", t: "内容を確認", d: "生成される書類・登録免許税・提出先・期限を画面で確認。" },
            { n: "3", t: "ダウンロード", d: "編集可能な .docx を個別/ZIPで取得。登記すべき事項はコピペ用テキストも。" },
          ].map((s) => (
            <div key={s.n} className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-gray-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 対応パターン */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold">対応パターン</h2>
          <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
            {[
              "株式会社 / 合同会社",
              "管轄内 / 管轄外（経由申請に対応）",
              "定款変更あり / なし（自動判定）",
              "取締役会 設置 / 非設置（株式会社）",
              "株主リストの自動作成（定款変更時）",
              "代表取締役等住所非表示措置の申出（管轄外時）",
            ].map((p) => (
              <div key={p} className="flex items-center gap-2 rounded-md bg-gray-50 px-4 py-3 text-sm">
                <span className="text-green-600">✓</span>
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
