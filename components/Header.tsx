import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 font-serif text-sm font-bold text-white">
            移
          </span>
          <span className="font-serif text-lg font-bold tracking-tight text-ink">
            本店移転らくらく登記
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2 font-medium text-muted transition hover:bg-brand-50 hover:text-ink"
          >
            料金
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 font-medium text-muted transition hover:bg-brand-50 hover:text-ink"
              >
                マイページ
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-lg px-3 py-2 font-medium text-muted transition hover:bg-brand-50 hover:text-ink"
                >
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 font-medium text-muted transition hover:bg-brand-50 hover:text-ink"
              >
                ログイン
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-lg bg-brand-700 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-brand-800"
              >
                新規登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
