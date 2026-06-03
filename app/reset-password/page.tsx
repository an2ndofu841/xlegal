"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent("/account/password")}`,
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
        {status === "sent" ? (
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
            <h1 className="mt-5 font-serif text-2xl font-bold text-ink">送信しました</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              <strong className="text-ink">{email}</strong> 宛に再設定用リンクをお送りしました。
              メール内のリンクを<strong className="text-ink">同じブラウザ</strong>
              で開くと、新しいパスワードを設定できます。
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
              パスワードの再設定
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。
            </p>
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
                {status === "submitting" ? "送信中..." : "再設定リンクを送信"}
              </button>
            </form>
          </>
        )}

        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          ← ログイン画面に戻る
        </Link>
      </div>
    </div>
  );
}
