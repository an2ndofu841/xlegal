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
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">マイページ</h1>
        <NewRelocationButton />
      </div>

      <div className="mt-8">
        {!relocations || relocations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
            まだ案件がありません。「新しい移転案件を作成」から始めましょう。
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {relocations.map((r) => {
              const company = Array.isArray(r.companies) ? r.companies[0] : r.companies;
              return (
                <li key={r.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium">
                      {company?.name && company.name !== "（未入力）" ? company.name : "（商号未入力）"}
                      <span className="ml-2 text-xs text-gray-500">
                        {company?.company_type === "llc" ? "合同会社" : "株式会社"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {r.new_address || "移転先未入力"}
                      {r.is_cross_jurisdiction ? "（管轄外）" : "（管轄内）"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={r.status} />
                    <Link
                      href={`/wizard/${r.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
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
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isGenerated ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
      }`}
    >
      {isGenerated ? "生成済み" : "下書き"}
    </span>
  );
}
