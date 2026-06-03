import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Wizard from "@/components/Wizard";
import type { RelocationForm } from "@/lib/validation/schemas";

export default async function WizardPage({
  params,
}: {
  params: Promise<{ relocationId: string }>;
}) {
  const { relocationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/wizard/${relocationId}`);

  const { data: relocation } = await supabase
    .from("relocations")
    .select(
      "*, companies(*), shareholders(name, address, shares, voting_rights, sort_order)",
    )
    .eq("id", relocationId)
    .single();

  if (!relocation) notFound();

  const company = Array.isArray(relocation.companies)
    ? relocation.companies[0]
    : relocation.companies;

  const shareholders = (relocation.shareholders ?? [])
    .slice()
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((s: { name: string; address: string; shares: number; voting_rights: number }) => ({
      name: s.name,
      address: s.address,
      shares: s.shares,
      voting_rights: s.voting_rights,
    }));

  // DB には定款の記載粒度を保持しないため、requires_articles_amendment から初期値を復元する。
  const requires = relocation.requires_articles_amendment as boolean;

  const initialValues: RelocationForm = {
    company_type: company?.company_type ?? "kk",
    name: company?.name === "（未入力）" ? "" : (company?.name ?? ""),
    corporate_number: company?.corporate_number ?? "",
    has_board: company?.has_board ?? false,
    rep_title: company?.rep_title ?? "",
    rep_name: company?.rep_name === "（未入力）" ? "" : (company?.rep_name ?? ""),
    rep_address: company?.rep_address === "（未入力）" ? "" : (company?.rep_address ?? ""),
    old_address: relocation.old_address ?? "",
    new_address: relocation.new_address ?? "",
    transfer_date: relocation.transfer_date ?? new Date().toISOString().slice(0, 10),
    is_cross_jurisdiction: relocation.is_cross_jurisdiction ?? false,
    articles_granularity: "municipality",
    same_municipality: !requires,
    meeting_date: relocation.meeting_date ?? "",
    old_registry_office: relocation.old_registry_office ?? "",
    new_registry_office: relocation.new_registry_office ?? "",
    shareholders,
    apply_address_nondisclosure: relocation.apply_address_nondisclosure ?? false,
  };

  return <Wizard relocationId={relocationId} initialValues={initialValues} />;
}
