import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-center text-3xl font-bold">料金</h1>
      <p className="mt-3 text-center text-gray-600">
        司法書士に依頼する場合の報酬（一般的に3〜5万円程度）と比べ、大幅に安価な書類作成支援です。
      </p>

      <div className="mt-10 rounded-2xl border-2 border-blue-600 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-blue-600">本店移転 書類一式</p>
        <p className="mt-2 text-5xl font-bold">
          ¥4,980
          <span className="text-base font-normal text-gray-500"> / 1案件</span>
        </p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-gray-700">
          {[
            "必要書類の自動判定と一括生成",
            "編集可能な .docx（個別 / ZIP）",
            "「登記すべき事項」コピペ用テキスト",
            "提出方法・期限・印鑑カードの案内",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              {f}
            </li>
          ))}
        </ul>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          始める
        </Link>
      </div>

      <div className="mt-8 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        <strong>登録免許税は別途必要です。</strong>{" "}
        管轄内移転は3万円、管轄外移転は6万円（旧分3万円＋新分3万円）。本サービスは金額の案内のみで、収入印紙の販売・決済代行は行いません。
      </div>
    </div>
  );
}
