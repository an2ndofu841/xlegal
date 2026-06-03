"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

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
      // セッション Cookie を SSR 側に確実に反映させるためフルリロードで遷移。
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
      // メール確認が有効な場合は session が null。無効ならそのままログイン状態。
      if (data.session) {
        window.location.assign(redirect);
      } else {
        setStatus("confirm");
      }
    }
  }

  if (status === "confirm") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
        <h1 className="text-2xl font-bold">確認メールを送信しました</h1>
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <strong>{email}</strong> に確認メールを送信しました。メール内のリンクを
          <strong>同じブラウザ</strong>で開くと登録が完了します。
        </div>
        <button
          type="button"
          onClick={() => switchMode("login")}
          className="mt-6 text-sm text-blue-600 hover:underline"
        >
          ログイン画面に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">
        {mode === "login" ? "ログイン" : "新規登録"}
      </h1>

      {/* タブ切替 */}
      <div className="mt-6 grid grid-cols-2 rounded-lg border border-gray-200 p-1 text-sm">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`rounded-md py-2 font-medium transition ${
            mode === "login" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`rounded-md py-2 font-medium transition ${
            mode === "signup" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          新規登録
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
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
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder={mode === "signup" ? "6文字以上" : "パスワード"}
          />
        </div>

        {status === "error" && <p className="text-sm text-red-600">{message}</p>}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {status === "submitting"
            ? "処理中..."
            : mode === "login"
              ? "ログイン"
              : "登録する"}
        </button>
      </form>

      {mode === "login" ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className="text-blue-600 hover:underline"
          >
            アカウントをお持ちでない方
          </button>
          <Link href="/reset-password" className="text-gray-500 hover:underline">
            パスワードをお忘れの方
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-600">
          すでにアカウントをお持ちの方は{" "}
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="text-blue-600 hover:underline"
          >
            ログイン
          </button>
        </p>
      )}
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
