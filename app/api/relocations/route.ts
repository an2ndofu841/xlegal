import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { companyTypeSchema } from "@/lib/validation/schemas";

/** 新規案件（下書き）を作成する。会社・移転案件をプレースホルダで作成し id を返す。 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = companyTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      user_id: user.id,
      company_type: parsed.data.company_type,
      name: "（未入力）",
      rep_name: "（未入力）",
      rep_address: "（未入力）",
      has_board: false,
    })
    .select("id")
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: companyError?.message ?? "company_create_failed" }, { status: 500 });
  }

  const { data: relocation, error: relocationError } = await supabase
    .from("relocations")
    .insert({
      company_id: company.id,
      user_id: user.id,
      old_address: "",
      new_address: "",
      transfer_date: new Date().toISOString().slice(0, 10),
      is_cross_jurisdiction: false,
      requires_articles_amendment: false,
      old_registry_office: "",
      status: "draft",
    })
    .select("id")
    .single();

  if (relocationError || !relocation) {
    return NextResponse.json(
      { error: relocationError?.message ?? "relocation_create_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: relocation.id });
}
