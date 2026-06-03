"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewRelocationButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function create(companyType: "kk" | "llc") {
    setLoading(true);
    const res = await fetch("/api/relocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_type: companyType }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/wizard/${id}`);
    } else {
      setLoading(false);
      alert("作成に失敗しました。ログイン状態をご確認ください。");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-800"
      >
        <span className="text-lg leading-none">＋</span> 新しい移転案件を作成
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-sm text-muted">会社種別を選択:</span>
      <button
        disabled={loading}
        onClick={() => create("kk")}
        className="rounded-lg border border-line bg-surface px-4 py-2 font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
      >
        株式会社
      </button>
      <button
        disabled={loading}
        onClick={() => create("llc")}
        className="rounded-lg border border-line bg-surface px-4 py-2 font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
      >
        合同会社
      </button>
    </div>
  );
}
