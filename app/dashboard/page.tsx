import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewRelocationButton from "@/components/NewRelocationButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard");

  const { data: relocations } = await supabase
    .from("relocations")
    .select("id, new_address, old_address, transfer_date, status, is_cross_jurisdiction, companies(name, company_type)")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">マイページ</h1>
          <p className="mt-1 text-sm text-muted">作成した移転案件の一覧です。</p>
        </div>
        <NewRelocationButton />
      </div>

      <div className="mt-8">
        {!relocations || relocations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-14 text-center">
            <p className="font-medium text-ink">まだ案件がありません</p>
            <p className="mt-1.5 text-sm text-muted">
              「新しい移転案件を作成」から始めましょう。
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            {relocations.map((r, idx) => {
              const company = Array.isArray(r.companies) ? r.companies[0] : r.companies;
              return (
                <li
                  key={r.id}
                  className={`flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-brand-50/40 ${
                    idx !== 0 ? "border-t border-line" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-ink">
                      <span className="truncate">
                        {company?.name && company.name !== "（未入力）"
                          ? company.name
                          : "（商号未入力）"}
                      </span>
                      <span className="shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                        {company?.company_type === "llc" ? "合同会社" : "株式会社"}
                      </span>
                    </p>
                    <p className="mt-1 truncate text-sm text-muted">
                      {r.new_address || "移転先未入力"}
                      {r.is_cross_jurisdiction ? "（管轄外）" : "（管轄内）"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <StatusBadge status={r.status} />
                    {r.status === "generated" && (
                      <Link
                        href={`/wizard/${r.id}/complete`}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
                      >
                        ダウンロード →
                      </Link>
                    )}
                    <Link
                      href={`/wizard/${r.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      編集 →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isGenerated = status === "generated";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isGenerated ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isGenerated ? "bg-success" : "bg-warning"
        }`}
      />
      {isGenerated ? "生成済み" : "下書き"}
    </span>
  );
}
