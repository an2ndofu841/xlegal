export default function Disclaimer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-6 text-xs leading-relaxed text-gray-500">
        <p>
          本サービスは書類作成支援ツールであり、個別の法律判断・代理申請（司法書士業務）は行いません。
          生成された書類の最終的な内容はご自身でご確認のうえ、ご不安な場合は司法書士にご相談ください。
          法務局へのオンライン直接送信や登録免許税の決済代行は行いません（金額の表示と案内のみ）。
        </p>
        <p className="mt-2">© {new Date().getFullYear()} 本店移転らくらく登記</p>
      </div>
    </footer>
  );
}
