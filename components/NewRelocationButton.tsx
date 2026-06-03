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
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
      >
        ＋ 新しい移転案件を作成
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">会社種別を選択:</span>
      <button
        disabled={loading}
        onClick={() => create("kk")}
        className="rounded-md border border-blue-600 px-4 py-2 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      >
        株式会社
      </button>
      <button
        disabled={loading}
        onClick={() => create("llc")}
        className="rounded-md border border-blue-600 px-4 py-2 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      >
        合同会社
      </button>
    </div>
  );
}
