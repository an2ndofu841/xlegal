"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">パスワードの再設定</h1>

      {status === "sent" ? (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <strong>{email}</strong>{" "}
          に再設定用リンクを送信しました。メール内のリンクを<strong>同じブラウザ</strong>
          で開くと、新しいパスワードを設定できます。
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-gray-600">
            登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
          </p>
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
            {status === "error" && <p className="text-sm text-red-600">{message}</p>}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {status === "submitting" ? "送信中..." : "再設定リンクを送信"}
            </button>
          </form>
        </>
      )}

      <Link href="/login" className="mt-6 text-sm text-blue-600 hover:underline">
        ログイン画面に戻る
      </Link>
    </div>
  );
}
