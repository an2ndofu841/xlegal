"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  relocationFormSchema,
  type RelocationForm,
} from "@/lib/validation/schemas";
import {
  buildRegistrationMatters,
  calcRegistrationTax,
  DOC_TYPE_LABELS,
  determineArticlesAmendment,
  determineDocuments,
} from "@/lib/docgen/docRules";

type StepId =
  | "type"
  | "company"
  | "move"
  | "articles"
  | "decision"
  | "shareholders"
  | "nondisclosure"
  | "confirm";

const stepTitles: Record<StepId, string> = {
  type: "会社種別",
  company: "会社基本情報",
  move: "移転内容",
  articles: "定款の記載",
  decision: "意思決定情報",
  shareholders: "株主リスト",
  nondisclosure: "住所非表示措置",
  confirm: "内容確認",
};

const stepFields: Record<StepId, (keyof RelocationForm)[]> = {
  type: ["company_type"],
  company: ["name", "corporate_number", "has_board", "rep_title", "rep_name", "rep_address"],
  move: ["old_address", "new_address", "transfer_date", "is_cross_jurisdiction"],
  articles: ["articles_granularity", "same_municipality"],
  decision: ["old_registry_office", "new_registry_office", "meeting_date"],
  shareholders: ["shareholders"],
  nondisclosure: ["apply_address_nondisclosure"],
  confirm: [],
};

export default function Wizard({
  relocationId,
  initialValues,
}: {
  relocationId: string;
  initialValues: RelocationForm;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const form = useForm<RelocationForm>({
    resolver: zodResolver(relocationFormSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });
  const { register, watch, control, trigger, getValues, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "shareholders" });

  const companyType = watch("company_type");
  const isCross = watch("is_cross_jurisdiction");
  const articlesGranularity = watch("articles_granularity");
  const sameMunicipality = watch("same_municipality");

  const requiresAmendment = determineArticlesAmendment({
    articlesGranularity: articlesGranularity,
    sameMunicipality: sameMunicipality,
  });

  // 表示するステップを条件で決定
  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ["type", "company", "move", "articles", "decision"];
    if (companyType === "kk" && requiresAmendment) s.push("shareholders");
    if (isCross) s.push("nondisclosure");
    s.push("confirm");
    return s;
  }, [companyType, requiresAmendment, isCross]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/relocations/${relocationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getValues()),
      });
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    const ok = await trigger(stepFields[currentStep]);
    if (!ok) return;
    await save();
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function generate() {
    const ok = await trigger();
    if (!ok) {
      // 確認画面で全体エラーがある場合は最初の不備ステップに戻す必要があるが、
      // ここでは簡易的にアラート表示
      alert("入力内容に不備があります。各ステップをご確認ください。");
      return;
    }
    setSaving(true);
    await save();
    const res = await fetch(`/api/relocations/${relocationId}/generate`, { method: "POST" });
    setSaving(false);
    if (res.ok) {
      router.push(`/wizard/${relocationId}/complete`);
    } else {
      const body = await res.json().catch(() => ({}));
      alert(`生成に失敗しました: ${body.error ?? res.status}`);
    }
  }

  const values = getValues();
  const docs = determineDocuments({
    companyType,
    isCrossJurisdiction: !!isCross,
    requiresArticlesAmendment: requiresAmendment,
    hasBoard: !!values.has_board,
  });
  const tax = calcRegistrationTax(!!isCross);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* プログレスバー */}
      <ol className="mb-8 flex flex-wrap gap-2 text-xs">
        {steps.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1 ${
              i === stepIndex
                ? "bg-blue-600 text-white"
                : i < stepIndex
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            {i + 1}. {stepTitles[s]}
          </li>
        ))}
      </ol>

      <h2 className="text-xl font-bold">{stepTitles[currentStep]}</h2>

      <div className="mt-6 space-y-5">
        {currentStep === "type" && (
          <Field label="会社種別" error={formState.errors.company_type?.message}>
            <select {...register("company_type")} className={inputCls}>
              <option value="kk">株式会社</option>
              <option value="llc">合同会社</option>
            </select>
          </Field>
        )}

        {currentStep === "company" && (
          <>
            <Field label="商号" error={formState.errors.name?.message}>
              <input {...register("name")} className={inputCls} placeholder="株式会社○○" />
            </Field>
            <Field
              label="会社法人等番号（任意・12桁）"
              error={formState.errors.corporate_number?.message}
            >
              <input {...register("corporate_number")} className={inputCls} placeholder="0000-00-000000 の数字12桁" />
            </Field>
            {companyType === "kk" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("has_board")} />
                取締役会設置会社である
              </label>
            )}
            <Field label="代表者の資格" error={formState.errors.rep_title?.message}>
              <input
                {...register("rep_title")}
                className={inputCls}
                placeholder={companyType === "llc" ? "代表社員" : "代表取締役"}
              />
            </Field>
            <Field label="代表者氏名" error={formState.errors.rep_name?.message}>
              <input {...register("rep_name")} className={inputCls} />
            </Field>
            <Field label="代表者住所" error={formState.errors.rep_address?.message}>
              <input {...register("rep_address")} className={inputCls} />
            </Field>
          </>
        )}

        {currentStep === "move" && (
          <>
            <Field label="移転前の本店所在地（地番まで）" error={formState.errors.old_address?.message}>
              <input {...register("old_address")} className={inputCls} />
            </Field>
            <Field label="移転後の本店所在地（地番まで）" error={formState.errors.new_address?.message}>
              <input {...register("new_address")} className={inputCls} />
            </Field>
            <Field label="移転日（実際に移転した日）" error={formState.errors.transfer_date?.message}>
              <input type="date" {...register("transfer_date")} className={inputCls} />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" {...register("is_cross_jurisdiction")} className="mt-1" />
              <span>
                移転先は現在の本店とは<strong>別の法務局（登記所）の管轄</strong>である（管轄外移転）
              </span>
            </label>
          </>
        )}

        {currentStep === "articles" && (
          <>
            <Field label="定款の本店所在地の記載" error={formState.errors.articles_granularity?.message}>
              <select {...register("articles_granularity")} className={inputCls}>
                <option value="municipality">最小行政区画（市区町村）まで</option>
                <option value="chiban">地番まで記載している</option>
              </select>
            </Field>
            {articlesGranularity === "municipality" && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" {...register("same_municipality")} className="mt-1" />
                <span>移転先は定款に記載された市区町村と同一である</span>
              </label>
            )}
            <div
              className={`rounded-md p-4 text-sm ${
                requiresAmendment
                  ? "bg-orange-50 text-orange-800"
                  : "bg-green-50 text-green-800"
              }`}
            >
              {requiresAmendment ? (
                <>
                  <strong>定款変更が必要です。</strong>
                  {companyType === "kk"
                    ? "株主総会議事録と株主リストが必要になります。"
                    : "総社員の同意書が必要になります。"}
                </>
              ) : (
                <>
                  <strong>定款変更は不要です。</strong>
                  株主総会議事録（総社員の同意書）は不要です。
                </>
              )}
            </div>
          </>
        )}

        {currentStep === "decision" && (
          <>
            <Field label="旧本店管轄の登記所名" error={formState.errors.old_registry_office?.message}>
              <input {...register("old_registry_office")} className={inputCls} placeholder="○○法務局○○支局 など" />
            </Field>
            {isCross && (
              <Field
                label="新本店管轄の登記所名"
                error={formState.errors.new_registry_office?.message}
              >
                <input {...register("new_registry_office")} className={inputCls} />
              </Field>
            )}
            {requiresAmendment && (
              <Field
                label={companyType === "kk" ? "株主総会の日付" : "総社員の同意の日付"}
                error={formState.errors.meeting_date?.message}
              >
                <input type="date" {...register("meeting_date")} className={inputCls} />
              </Field>
            )}
          </>
        )}

        {currentStep === "shareholders" && (
          <>
            <p className="text-sm text-gray-600">
              議決権割合の多い順に、合計が2/3に達するまで、または上位10名までのいずれか少ない方を入力してください（同順位は全員）。
            </p>
            {fields.map((f, i) => (
              <div key={f.id} className="rounded-md border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">株主 {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    削除
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input {...register(`shareholders.${i}.name`)} className={inputCls} placeholder="氏名" />
                  <input {...register(`shareholders.${i}.address`)} className={inputCls} placeholder="住所" />
                  <input
                    type="number"
                    {...register(`shareholders.${i}.shares`, { valueAsNumber: true })}
                    className={inputCls}
                    placeholder="株式数"
                  />
                  <input
                    type="number"
                    {...register(`shareholders.${i}.voting_rights`, { valueAsNumber: true })}
                    className={inputCls}
                    placeholder="議決権数"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ name: "", address: "", shares: 0, voting_rights: 0 })}
              className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
            >
              ＋ 株主を追加
            </button>
            {typeof formState.errors.shareholders?.message === "string" && (
              <p className="text-sm text-red-600">{formState.errors.shareholders.message}</p>
            )}
          </>
        )}

        {currentStep === "nondisclosure" && (
          <>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" {...register("apply_address_nondisclosure")} className="mt-1" />
              <span>
                代表取締役等住所非表示措置を申し出る（管轄外移転時のみ・新所在地の登記と同時に申出可能）
              </span>
            </label>
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
              申し出る場合、<strong>実在性を証する書面</strong>の添付が必要です（上場会社で措置済み等を除く）。
              新本店管轄分の申請書に、希望する旨・対象者の資格／氏名／住所・添付書面を記載します。
            </div>
          </>
        )}

        {currentStep === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-md border border-gray-200 p-4">
              <h3 className="font-semibold">生成される書類</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                {docs.map((d) => (
                  <li key={d}>{DOC_TYPE_LABELS[d]}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-gray-200 p-4 text-sm">
              <h3 className="font-semibold">登録免許税</h3>
              <p className="mt-1 text-lg font-bold">
                {tax.toLocaleString()}円
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {isCross ? "（旧分3万円＋新分3万円）" : "（管轄内）"}
                </span>
              </p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm">
              <h3 className="font-semibold">登記すべき事項（プレビュー）</h3>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-gray-800">
                {buildRegistrationMatters({
                  transferDate: values.transfer_date,
                  newAddress: values.new_address,
                })}
              </pre>
            </div>
            <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">
              提出先: <strong>{values.old_registry_office || "（旧本店管轄の登記所）"}</strong> に
              {isCross ? "旧分・新分をまとめて提出（経由申請）" : "提出"}。
              移転日から<strong>2週間以内</strong>に申請してください。
            </div>
          </div>
        )}
      </div>

      {/* ナビゲーション */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          ← 戻る
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-sm text-gray-500 hover:underline disabled:opacity-50"
          >
            {saving ? "保存中..." : "下書き保存"}
          </button>
          {currentStep === "confirm" ? (
            <button
              type="button"
              onClick={generate}
              disabled={saving}
              className="rounded-md bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              書類を生成する
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="rounded-md bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
            >
              次へ →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
