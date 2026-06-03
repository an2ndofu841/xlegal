import { type NextRequest } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { DOC_TYPE_LABELS } from "@/lib/docgen/docRules";
import type { DocType } from "@/lib/types";

export const runtime = "nodejs";

/** 生成済み書類を ZIP にまとめてダウンロードさせる。 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("unauthorized", { status: 401 });
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("doc_type, storage_path")
    .eq("relocation_id", id);

  if (!documents || documents.length === 0) {
    return new Response("not_found", { status: 404 });
  }

  const zip = new JSZip();
  for (const doc of documents) {
    const { data, error } = await supabase.storage
      .from("documents")
      .download(doc.storage_path);
    if (error || !data) continue;
    const label = DOC_TYPE_LABELS[doc.doc_type as DocType] ?? doc.doc_type;
    zip.file(`${label}.docx`, await data.arrayBuffer());
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="relocation-documents.zip"`,
    },
  });
}
