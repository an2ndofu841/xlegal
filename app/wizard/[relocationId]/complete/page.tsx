import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DOC_TYPE_LABELS, calcRegistrationTax } from "@/lib/docgen/docRules";
import { registrationMattersText } from "@/lib/docgen/generate";
import CopyButton from "@/components/CopyButton";
import type { DocType, Relocation } from "@/lib/types";

export default async function CompletePage({
  params,
}: {
  params: Promise<{ relocationId: string }>;
}) {
  const { relocationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/wizard/${relocationId}/complete`);

  const { data: relocation } = await supabase
    .from("relocations")
    .select("*")
    .eq("id", relocationId)
    .single();
  if (!relocation) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("doc_type, storage_path")
    .eq("relocation_id", relocationId);

  // 各書類の署名付きURL（10分有効）
  const signed = await Promise.all(
    (documents ?? []).map(async (d) => {
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(d.storage_path, 600);
      return {
        docType: d.doc_type as DocType,
        label: DOC_TYPE_LABELS[d.doc_type as DocType] ?? d.doc_type,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  const reloc = relocation as Relocation;
  const tax = calcRegistrationTax(reloc.is_cross_jurisdiction);
  const mattersText = registrationMattersText(reloc);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-lg border border-green-200 bg-green-50 p-5">
        <h1 className="text-xl font-bold text-green-900">書類の生成が完了しました</h1>
        <p className="mt-1 text-sm text-green-800">
          下記より .docx をダウンロードできます。必要に応じて編集してご利用ください。
        </p>
      </div>

      {/* ダウンロード */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">書類のダウンロード</h2>
          <a
            href={`/api/relocations/${relocationId}/download`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            すべてZIPでダウンロード
          </a>
        </div>
        <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {signed.map((d) => (
            <li key={d.docType} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm">{d.label}</span>
              {d.url ? (
                <a href={d.url} className="text-sm font-medium text-blue-600 hover:underline">
                  ダウンロード
                </a>
              ) : (
                <span className="text-sm text-gray-400">URL取得失敗</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* 登記すべき事項（コピペ用） */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">登記すべき事項（コピペ用）</h2>
          <CopyButton text={mattersText} />
        </div>
        <pre className="mt-3 whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-4 font-sans text-sm">
          {mattersText}
        </pre>
        <p className="mt-1 text-xs text-gray-500">
          オンライン申請・QRコード（二次元コード）申請の際は、この文言をそのまま貼り付けられます。
        </p>
      </section>

      {/* 提出方法ガイド */}
      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold">提出方法と注意事項</h2>
        <ul className="mt-3 space-y-3 text-sm text-gray-700">
          <li>
            <strong>登録免許税:</strong> {tax.toLocaleString()}円
            {reloc.is_cross_jurisdiction ? "（旧分3万円＋新分3万円）" : "（管轄内3万円）"}
            。収入印紙で納付します（本サービスでは販売・決済は行いません）。
          </li>
          <li>
            <strong>提出先:</strong>{" "}
            {reloc.is_cross_jurisdiction ? (
              <>
                旧分・新分の<strong>2通とも「{reloc.old_registry_office || "旧本店管轄の登記所"}」</strong>
                にまとめて提出します（<strong>経由申請</strong>）。
              </>
            ) : (
              <>「{reloc.old_registry_office || "本店管轄の登記所"}」に提出します。</>
            )}
          </li>
          <li>
            <strong>申請期限:</strong> 移転日（実際に移転した日）から
            <strong>2週間以内</strong>に申請してください。移転日より前に申請することはできません。
          </li>
          <li>
            <strong>印鑑届書:</strong> 2025年4月21日以降、提出は不要です。ただし
            <strong>印鑑カードは引き継げない</strong>ため、移転登記の完了後に
            新所在地の登記所で<strong>印鑑カードの交付申請</strong>を行ってください。
          </li>
          {reloc.apply_address_nondisclosure && (
            <li>
              <strong>住所非表示措置:</strong>{" "}
              新本店管轄分の申請書に申出を記載しています。
              <strong>実在性を証する書面</strong>の添付をお忘れなく。
            </li>
          )}
        </ul>
      </section>

      <div className="mt-8">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← マイページに戻る
        </Link>
      </div>
    </div>
  );
}
