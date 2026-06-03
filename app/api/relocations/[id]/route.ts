import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { determineArticlesAmendment } from "@/lib/docgen/docRules";

/** 案件の保存（会社・移転・株主をまとめて更新）。下書き保存にも使用。 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // 対象案件の取得（RLS により本人のもののみ）
  const { data: relocation, error: fetchError } = await supabase
    .from("relocations")
    .select("id, company_id")
    .eq("id", id)
    .single();
  if (fetchError || !relocation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const requiresAmendment = determineArticlesAmendment({
    articlesGranularity: body.articles_granularity ?? "municipality",
    sameMunicipality: body.same_municipality ?? true,
  });

  // 会社情報更新
  const { error: companyError } = await supabase
    .from("companies")
    .update({
      company_type: body.company_type,
      name: body.name,
      corporate_number: body.corporate_number || null,
      has_board: body.company_type === "kk" ? !!body.has_board : false,
      rep_title: body.rep_title || null,
      rep_name: body.rep_name,
      rep_address: body.rep_address,
    })
    .eq("id", relocation.company_id);
  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  // 移転案件更新
  const { error: relocationError } = await supabase
    .from("relocations")
    .update({
      old_address: body.old_address,
      new_address: body.new_address,
      transfer_date: body.transfer_date,
      is_cross_jurisdiction: !!body.is_cross_jurisdiction,
      requires_articles_amendment: requiresAmendment,
      meeting_date: body.meeting_date || null,
      old_registry_office: body.old_registry_office,
      new_registry_office: body.is_cross_jurisdiction ? body.new_registry_office || null : null,
      apply_address_nondisclosure: body.is_cross_jurisdiction
        ? !!body.apply_address_nondisclosure
        : false,
    })
    .eq("id", id);
  if (relocationError) {
    return NextResponse.json({ error: relocationError.message }, { status: 500 });
  }

  // 株主リストの置き換え（定款変更ありの株式会社のみ意味を持つ）
  await supabase.from("shareholders").delete().eq("relocation_id", id);
  const shareholders = Array.isArray(body.shareholders) ? body.shareholders : [];
  if (body.company_type === "kk" && requiresAmendment && shareholders.length > 0) {
    const rows = shareholders.map(
      (s: { name: string; address: string; shares: number; voting_rights: number }, i: number) => ({
        relocation_id: id,
        name: s.name,
        address: s.address,
        shares: Number(s.shares) || 0,
        voting_rights: Number(s.voting_rights) || 0,
        sort_order: i,
      }),
    );
    // 議決権の多い順に sort_order を振り直す
    rows.sort(
      (a: { voting_rights: number }, b: { voting_rights: number }) =>
        b.voting_rights - a.voting_rights,
    );
    rows.forEach((r: { sort_order: number }, i: number) => (r.sort_order = i));
    const { error: shError } = await supabase.from("shareholders").insert(rows);
    if (shError) {
      return NextResponse.json({ error: shError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, requires_articles_amendment: requiresAmendment });
}
