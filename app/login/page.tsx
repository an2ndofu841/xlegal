"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function AuthForm() {
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/dashboard";
  const initialMode: Mode = params.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "confirm" | "error">(
    params.get("error") === "auth" ? "error" : "idle",
  );
  const [message, setMessage] = useState(
    params.get("error") === "auth"
      ? "認証に失敗しました。お手数ですが、もう一度ログインしてください。"
      : "",
  );

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setMessage("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("error");
        setMessage(
          error.message === "Invalid login credentials"
            ? "メールアドレスまたはパスワードが正しくありません。"
            : error.message,
        );
        return;
      }
      window.location.assign(redirect);
    } else {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(redirect)}`,
        },
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      if (data.session) {
        window.location.assign(redirect);
      } else {
        setStatus("confirm");
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
        {status === "confirm" ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="mt-5 font-serif text-2xl font-bold text-ink">
              確認メールを送信しました
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              <strong className="text-ink">{email}</strong> 宛に確認メールをお送りしました。
              メール内のリンクを<strong className="text-ink">同じブラウザ</strong>
              で開くと登録が完了します。
            </p>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="mt-6 text-sm font-medium text-brand-600 hover:underline"
            >
              ログイン画面に戻る
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
              {mode === "login" ? "おかえりなさい" : "アカウント作成"}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {mode === "login"
                ? "メールアドレスとパスワードでログイン"
                : "メールアドレスとパスワードで無料登録"}
            </p>

            {/* タブ切替 */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1 text-sm">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`rounded-lg py-2 font-medium transition ${
                  mode === "login"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-lg py-2 font-medium transition ${
                  mode === "signup"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                新規登録
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder={mode === "signup" ? "6文字以上" : "パスワード"}
                />
              </div>

              {status === "error" && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full rounded-lg bg-brand-700 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50"
              >
                {status === "submitting"
                  ? "処理中..."
                  : mode === "login"
                    ? "ログイン"
                    : "登録する"}
              </button>
            </form>

            {mode === "login" ? (
              <div className="mt-5 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-medium text-brand-600 hover:underline"
                >
                  アカウントを作成
                </button>
                <Link href="/reset-password" className="text-muted hover:text-ink hover:underline">
                  パスワードをお忘れの方
                </Link>
              </div>
            ) : (
              <p className="mt-5 text-center text-sm text-muted">
                すでにアカウントをお持ちの方は{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-medium text-brand-600 hover:underline"
                >
                  ログイン
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
