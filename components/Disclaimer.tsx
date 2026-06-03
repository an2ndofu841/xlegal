export default function Disclaimer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-700 font-serif text-xs font-bold text-white">
            移
          </span>
          <span className="font-serif text-sm font-bold text-ink">
            本店移転らくらく登記
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted">
          本サービスは書類作成支援ツールであり、個別の法律判断・代理申請（司法書士業務）は行いません。
          生成された書類の最終的な内容はご自身でご確認のうえ、ご不安な場合は司法書士にご相談ください。
          法務局へのオンライン直接送信や登録免許税の決済代行は行いません（金額の表示と案内のみ）。
        </p>
        <p className="mt-4 text-xs text-muted/70">
          © {new Date().getFullYear()} 本店移転らくらく登記
        </p>
      </div>
    </footer>
  );
}
