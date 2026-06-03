import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEnabled, searchHoujin } from "@/lib/houjin/lookup";

/** 法人番号 or 法人名から会社情報を検索する。未設定時は 503 を返す。 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isEnabled()) {
    return NextResponse.json(
      { configured: false, results: [] },
      { status: 503 },
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ configured: true, results: [] });
  }

  try {
    const results = await searchHoujin(q);
    return NextResponse.json({ configured: true, results });
  } catch {
    return NextResponse.json(
      { configured: true, results: [], error: "lookup_failed" },
      { status: 502 },
    );
  }
}
