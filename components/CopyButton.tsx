"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50"
    >
      {copied ? "コピーしました" : "登記すべき事項をコピー"}
    </button>
  );
}
