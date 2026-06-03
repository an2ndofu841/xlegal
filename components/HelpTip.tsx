"use client";

import { useState } from "react";

/** 用語や入力項目を、やさしい言葉で補足する「？」ヒント。 */
export default function HelpTip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label="説明を表示"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600 transition hover:bg-brand-200"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-1/2 top-6 z-20 w-64 -translate-x-1/2 rounded-lg border border-line bg-surface p-3 text-xs leading-relaxed text-muted shadow-lg">
          {children}
        </span>
      )}
    </span>
  );
}
