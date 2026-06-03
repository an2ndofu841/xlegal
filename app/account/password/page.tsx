"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  // 回復リンク経由でセッションが確立済みかを確認する。
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
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-6 text-sm text-gray-500">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">新しいパスワードを設定</h1>

      {status === "done" ? (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          パスワードを更新しました。マイページへ移動します...
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
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
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="6文字以上"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium">
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
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="もう一度入力"
            />
          </div>
          {status === "error" && <p className="text-sm text-red-600">{message}</p>}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {status === "submitting" ? "更新中..." : "パスワードを更新"}
          </button>
        </form>
      )}
    </div>
  );
}
