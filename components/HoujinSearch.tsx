"use client";

import { useState } from "react";
import type { HoujinResult } from "@/lib/houjin/lookup";

/**
 * 法人番号 or 会社名で会社情報を検索し、選んだ候補を呼び出し元へ渡す。
 * （このコンポーネントは検索APIが有効なときのみ表示される想定）
 */
export default function HoujinSearch({
  onSelect,
}: {
  onSelect: (r: HoujinResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HoujinResult[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error">("idle");

  async function search() {
    const q = query.trim();
    if (q.length < 2) return;
    setState("loading");
    setResults([]);
    try {
      const res = await fetch(`/api/houjin?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      const list: HoujinResult[] = body.results ?? [];
      setResults(list);
      setState(list.length === 0 ? "empty" : "idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
      <p className="text-sm font-medium text-ink">会社をかんたん入力</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        法人番号（13桁）または会社名で検索すると、商号と現在の本店所在地を自動で入力します。
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="例: 1234567890123 / 株式会社○○"
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={search}
          disabled={state === "loading" || query.trim().length < 2}
          className="shrink-0 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50"
        >
          {state === "loading" ? "検索中..." : "検索"}
        </button>
      </div>

      {state === "empty" && (
        <p className="mt-3 text-xs text-muted">
          該当する会社が見つかりませんでした。下のフォームに直接ご入力ください。
        </p>
      )}
      {state === "error" && (
        <p className="mt-3 text-xs text-red-600">
          検索に失敗しました。下のフォームに直接ご入力ください。
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((r) => (
            <li key={r.corporateNumber}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setResults([]);
                  setQuery("");
                }}
                className="flex w-full flex-col items-start rounded-lg border border-line bg-surface px-3.5 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="text-sm font-medium text-ink">{r.name}</span>
                <span className="mt-0.5 text-xs text-muted">{r.address}</span>
                <span className="mt-0.5 text-[11px] text-muted/70">
                  法人番号: {r.corporateNumber}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
