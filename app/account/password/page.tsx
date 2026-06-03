"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setReady(true);
      }
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setStatus("error");
      setMessage("パスワードが一致しません。");
      return;
    }
    setStatus("submitting");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("done");
    setTimeout(() => window.location.assign("/dashboard"), 1200);
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center justify-center px-6 text-sm text-muted">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          新しいパスワードを設定
        </h1>

        {status === "done" ? (
          <div className="mt-6 rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
            パスワードを更新しました。マイページへ移動します...
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                新しいパスワード
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="6文字以上"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-ink">
                新しいパスワード（確認）
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
                placeholder="もう一度入力"
              />
            </div>
            {status === "error" && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
            )}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-lg bg-brand-700 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50"
            >
              {status === "submitting" ? "更新中..." : "パスワードを更新"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
