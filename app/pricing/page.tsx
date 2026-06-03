import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-medium tracking-wide text-accent">
          明朗会計・追加費用なし
        </p>
        <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-ink">料金</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          司法書士に依頼する場合の報酬（一般的に3〜5万円程度）と比べ、大幅に安価な書類作成支援です。
        </p>
      </div>

      <div className="relative mt-12 overflow-hidden rounded-2xl border border-brand-200 bg-surface p-9 text-center shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-accent to-brand-600"
        />
        <p className="text-sm font-medium tracking-wide text-brand-600">本店移転 書類一式</p>
        <p className="mt-3 font-serif text-6xl font-bold tracking-tight text-ink">
          ¥4,980
          <span className="ml-1 text-base font-normal text-muted">/ 1案件</span>
        </p>
        <ul className="mx-auto mt-8 max-w-sm space-y-3 text-left text-sm text-ink">
          {[
            "必要書類の自動判定と一括生成",
            "編集可能な .docx（個別 / ZIP）",
            "「登記すべき事項」コピペ用テキスト",
            "提出方法・期限・印鑑カードの案内",
          ].map((f) => (
            <li key={f} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>
        <Link
          href="/login?mode=signup"
          className="mt-9 inline-flex items-center justify-center rounded-lg bg-brand-700 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-brand-800"
        >
          始める
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-warning/20 bg-warning-soft px-5 py-4 text-sm leading-relaxed text-warning">
        <strong>登録免許税は別途必要です。</strong>{" "}
        管轄内移転は3万円、管轄外移転は6万円（旧分3万円＋新分3万円）。本サービスは金額の案内のみで、収入印紙の販売・決済代行は行いません。
      </div>
    </div>
  );
}
