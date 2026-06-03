import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAllDocuments } from "@/lib/docgen/generate";
import type { Company, Relocation, Shareholder } from "@/lib/types";

export const runtime = "nodejs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: relocation, error } = await supabase
    .from("relocations")
    .select("*, companies(*), shareholders(*)")
    .eq("id", id)
    .single();

  if (error || !relocation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const company = (Array.isArray(relocation.companies)
    ? relocation.companies[0]
    : relocation.companies) as Company;
  const shareholders = (relocation.shareholders ?? []) as Shareholder[];

  let results;
  try {
    results = generateAllDocuments({
      company,
      relocation: relocation as Relocation,
      shareholders,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `generation_failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  // 既存の生成済み書類レコードを置き換える
  await supabase.from("documents").delete().eq("relocation_id", id);

  const records: { relocation_id: string; doc_type: string; storage_path: string }[] = [];
  for (const r of results) {
    const storagePath = `${user.id}/${id}/${r.docType}.docx`;
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, r.buffer, { contentType: DOCX_MIME, upsert: true });
    if (upErr) {
      return NextResponse.json({ error: `upload_failed: ${upErr.message}` }, { status: 500 });
    }
    records.push({ relocation_id: id, doc_type: r.docType, storage_path: storagePath });
  }

  const { error: insErr } = await supabase.from("documents").insert(records);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await supabase.from("relocations").update({ status: "generated" }).eq("id", id);

  return NextResponse.json({ ok: true, count: records.length });
}
