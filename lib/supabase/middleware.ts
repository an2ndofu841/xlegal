import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * ミドルウェアでセッションを更新し、保護ルートを制御する。
 * （@supabase/ssr の推奨パターン）
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // メールマジックリンク / OAuth の PKCE コードをセッションに交換する。
  // Supabase の既定メールテンプレートは ?code= 付きリンクを生成するため、
  // 着地パス（/ や /auth/confirm など）に関わらずここで処理する。
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const redirectUrl = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    redirectUrl.searchParams.delete("code");
    redirectUrl.searchParams.delete("next");

    if (error) {
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "auth");
    } else {
      redirectUrl.pathname = next ?? "/dashboard";
    }

    const redirectResponse = NextResponse.redirect(redirectUrl);
    // exchangeCodeForSession で supabaseResponse に設定されたセッション Cookie を引き継ぐ。
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/wizard") ||
    path.startsWith("/account");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
