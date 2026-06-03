"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import HelpTip from "@/components/HelpTip";
import HoujinSearch from "@/components/HoujinSearch";
import type { HoujinResult } from "@/lib/houjin/lookup";
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
  type: "会社の種類",
  company: "会社の基本情報",
  move: "引っ越しの内容",
  articles: "定款（ていかん）の確認",
  decision: "手続きの日付・提出先",
  shareholders: "株主の一覧",
  nondisclosure: "代表者住所の非表示",
  confirm: "最終確認",
};

// 各ステップの一言ガイド（初心者向け）
const stepDescriptions: Record<StepId, string> = {
  type: "まずはあなたの会社が「株式会社」か「合同会社」かを選びましょう。",
  company: "会社の名前や代表者の情報を入力します。法人番号で自動入力もできます。",
  move: "どこからどこへ、いつ引っ越したか（する予定か）を入力します。",
  articles: "会社のルールブック「定款」に本店の住所がどう書かれているかを確認します。",
  decision: "登記を申請する法務局と、必要な会議の日付を入力します。",
  shareholders: "定款を変える場合に必要な「株主リスト」を作成します。",
  nondisclosure: "代表者の住所を登記簿で見えないようにする申し出（任意）です。",
  confirm: "作成される書類と費用・提出先を確認して、書類を生成します。",
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
  lookupEnabled = false,
}: {
  relocationId: string;
  initialValues: RelocationForm;
  lookupEnabled?: boolean;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const form = useForm<RelocationForm>({
    resolver: zodResolver(relocationFormSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });
  const { register, watch, control, trigger, getValues, setValue, formState } = form;

  function applyHoujin(r: HoujinResult) {
    if (r.name) setValue("name", r.name, { shouldValidate: true });
    if (r.address) setValue("old_address", r.address, { shouldValidate: true });
    if (r.corporateNumber)
      setValue("corporate_number", r.corporateNumber, { shouldValidate: true });
  }
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
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* プログレスバー */}
      <ol className="mb-8 flex flex-wrap gap-2 text-xs">
        {steps.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1 font-medium transition ${
              i === stepIndex
                ? "bg-brand-700 text-white"
                : i < stepIndex
                  ? "bg-brand-50 text-brand-600"
                  : "bg-canvas text-muted"
            }`}
          >
            {i + 1}. {stepTitles[s]}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-line bg-surface p-7 shadow-sm">
        <p className="text-xs font-medium text-brand-500">
          ステップ {stepIndex + 1} / {steps.length}
        </p>
        <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
          {stepTitles[currentStep]}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {stepDescriptions[currentStep]}
        </p>

      <div className="mt-6 space-y-5">
        {currentStep === "type" && (
          <>
            <div className="rounded-xl border border-line bg-canvas/60 p-4">
              <p className="text-sm font-medium text-ink">📋 始める前に用意すると安心なもの</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                <li>・登記事項証明書（登記簿謄本）または定款 … 会社名・住所・代表者の確認に</li>
                <li>・新しい本店の住所（建物名・部屋番号まで）</li>
                <li>・実際に引っ越した（する）日</li>
              </ul>
              <p className="mt-2 text-xs text-muted">
                手元になくても、わかる範囲で進めて後から修正できます。
              </p>
            </div>
            <Field
              label="会社の種類"
              help="登記事項証明書の冒頭や、会社名（「株式会社」「合同会社」）で分かります。一般的な会社は「株式会社」です。"
              error={formState.errors.company_type?.message}
            >
              <select {...register("company_type")} className={inputCls}>
                <option value="kk">株式会社</option>
                <option value="llc">合同会社（LLC）</option>
              </select>
            </Field>
          </>
        )}

        {currentStep === "company" && (
          <>
            {lookupEnabled && <HoujinSearch onSelect={applyHoujin} />}
            <Field
              label="会社名（商号）"
              help="登記されている正式名称です。「株式会社」「合同会社」の位置（前か後か）も登記どおりに入力してください。"
              error={formState.errors.name?.message}
            >
              <input {...register("name")} className={inputCls} placeholder="例: 株式会社サンプル商事" />
            </Field>
            <Field
              label="会社法人等番号（任意・12桁）"
              help="登記事項証明書の右上などに記載された12桁の番号です。分からなければ空欄のままで大丈夫です。（13桁の「法人番号」とは別物です）"
              error={formState.errors.corporate_number?.message}
            >
              <input {...register("corporate_number")} className={inputCls} placeholder="例: 0000-00-000000 の数字12桁" />
            </Field>
            {companyType === "kk" && (
              <label className="flex items-start gap-2.5 rounded-lg border border-line p-3.5 text-sm text-ink">
                <input type="checkbox" {...register("has_board")} className="mt-0.5 accent-brand-700" />
                <span>
                  取締役会を設置している
                  <HelpTip>
                    取締役が3名以上いて「取締役会」という会議体を置いている会社です。登記簿に「取締役会設置会社」と記載があれば該当します。多くの小規模な会社は設置していません。
                  </HelpTip>
                </span>
              </label>
            )}
            <Field
              label="代表者の肩書き"
              help={companyType === "llc" ? "合同会社では通常「代表社員」です。" : "株式会社では通常「代表取締役」です。"}
              error={formState.errors.rep_title?.message}
            >
              <input
                {...register("rep_title")}
                className={inputCls}
                placeholder={companyType === "llc" ? "例: 代表社員" : "例: 代表取締役"}
              />
            </Field>
            <Field label="代表者の氏名" error={formState.errors.rep_name?.message}>
              <input {...register("rep_name")} className={inputCls} placeholder="例: 山田 太郎" />
            </Field>
            <Field
              label="代表者の住所"
              help="登記されている代表者個人の住所です。住民票どおりの表記で入力してください。"
              error={formState.errors.rep_address?.message}
            >
              <input {...register("rep_address")} className={inputCls} placeholder="例: 東京都千代田区○○一丁目1番1号" />
            </Field>
          </>
        )}

        {currentStep === "move" && (
          <>
            <Field
              label="引っ越し前の本店住所"
              help="今、登記されている本店の住所です。「○番地○」や「○番○号」まで、登記どおりに入力してください。"
              error={formState.errors.old_address?.message}
            >
              <input {...register("old_address")} className={inputCls} placeholder="例: 東京都千代田区○○一丁目1番1号" />
            </Field>
            <Field
              label="引っ越し後の本店住所"
              help="新しい本店の住所です。ビル名・部屋番号は登記に含めるかどうか会社の方針によります。基本は番地まで入れておけば問題ありません。"
              error={formState.errors.new_address?.message}
            >
              <input {...register("new_address")} className={inputCls} placeholder="例: 東京都港区△△二丁目2番2号" />
            </Field>
            <Field
              label="引っ越した日（移転日）"
              help="実際に本店を移した日を選びます。これから移す場合はその予定日。登記の申請はこの日以降にできます。"
              error={formState.errors.transfer_date?.message}
            >
              <input type="date" {...register("transfer_date")} className={inputCls} />
            </Field>
            <div className="rounded-xl border border-line bg-canvas/60 p-4">
              <label className="flex items-start gap-2.5 text-sm text-ink">
                <input type="checkbox" {...register("is_cross_jurisdiction")} className="mt-0.5 accent-brand-700" />
                <span>
                  引っ越し先は、今までと<strong>別の法務局の管轄</strong>だ（管轄外への引っ越し）
                  <HelpTip>
                    住所を管轄する法務局（登記所）が変わるかどうか、という意味です。市区町村が変わると別管轄になることが多いですが、同じ市内でも分かれる場合があります。分からないときは、法務局の「管轄のご案内」で新旧それぞれの住所の管轄を調べられます。
                  </HelpTip>
                </span>
              </label>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                管轄が変わると手続き（経由申請）や費用が変わります。分からない場合は、
                <a
                  href="https://houkyoku.moj.go.jp/homu/static"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-600 hover:underline"
                >
                  法務局の管轄案内
                </a>
                で新旧の住所を確認してください。
              </p>
            </div>
          </>
        )}

        {currentStep === "articles" && (
          <>
            <p className="rounded-lg bg-brand-50 p-4 text-sm leading-relaxed text-brand-800">
              「定款（ていかん）」は会社のルールブックです。その中の本店の住所が、どのくらい詳しく書かれているかで、手続きの内容が変わります。お手元の定款の本店に関する条文をご確認ください。
            </p>
            <Field
              label="定款に書かれている本店の住所は？"
              help="「当会社は本店を○○市に置く」のように市区町村までなら上、「○○市○○町1番地」のように番地まで書いてあれば下を選びます。"
              error={formState.errors.articles_granularity?.message}
            >
              <select {...register("articles_granularity")} className={inputCls}>
                <option value="municipality">市区町村まで（例：本店を東京都港区に置く）</option>
                <option value="chiban">番地まで（例：本店を東京都港区△△2番2号に置く）</option>
              </select>
            </Field>
            {articlesGranularity === "municipality" && (
              <label className="flex items-start gap-2.5 rounded-lg border border-line p-3.5 text-sm text-ink">
                <input type="checkbox" {...register("same_municipality")} className="mt-0.5 accent-brand-700" />
                <span>引っ越し先は、定款に書かれている市区町村と同じだ</span>
              </label>
            )}
            <div
              className={`rounded-lg p-4 text-sm leading-relaxed ${
                requiresAmendment
                  ? "bg-warning-soft text-warning"
                  : "bg-success-soft text-success"
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
            <Field
              label="引っ越し前の住所を管轄する法務局"
              help="申請書を出す先の法務局（登記所）の名前です。「○○法務局」「○○法務局△△支局」のように入力します。法務局の管轄案内で調べられます。"
              error={formState.errors.old_registry_office?.message}
            >
              <input {...register("old_registry_office")} className={inputCls} placeholder="例: 東京法務局○○出張所" />
            </Field>
            {isCross && (
              <Field
                label="引っ越し後の住所を管轄する法務局"
                help="管轄が変わるため、新しい住所を管轄する法務局名も必要です。"
                error={formState.errors.new_registry_office?.message}
              >
                <input {...register("new_registry_office")} className={inputCls} placeholder="例: 東京法務局△△出張所" />
              </Field>
            )}
            {requiresAmendment && (
              <Field
                label={companyType === "kk" ? "株主総会を開いた日" : "社員全員が同意した日"}
                help={
                  companyType === "kk"
                    ? "定款を変えるために株主総会で決議した日です。これから行う場合は予定日でも構いません。"
                    : "定款を変えることに社員全員が同意した日です。"
                }
                error={formState.errors.meeting_date?.message}
              >
                <input type="date" {...register("meeting_date")} className={inputCls} />
              </Field>
            )}
          </>
        )}

        {currentStep === "shareholders" && (
          <>
            <p className="text-sm leading-relaxed text-muted">
              議決権割合の多い順に、合計が2/3に達するまで、または上位10名までのいずれか少ない方を入力してください（同順位は全員）。
            </p>
            {fields.map((f, i) => (
              <div key={f.id} className="rounded-lg border border-line p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">株主 {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs font-medium text-red-600 hover:underline"
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
              className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50"
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
            <label className="flex items-start gap-2.5 rounded-lg border border-line p-3.5 text-sm text-ink">
              <input type="checkbox" {...register("apply_address_nondisclosure")} className="mt-0.5 accent-brand-700" />
              <span>
                代表者の住所を登記簿で見えないようにする申し出をする（任意）
                <HelpTip>
                  登記簿に載る代表取締役などの住所を、一部だけの表示にできる制度です。プライバシー保護のための任意の手続きで、必須ではありません。今回の引っ越し（管轄外）の登記と同時に申し出ることができます。
                </HelpTip>
              </span>
            </label>
            <div className="rounded-lg bg-brand-50 p-4 text-sm leading-relaxed text-brand-800">
              申し出る場合、<strong>実在性を証する書面</strong>の添付が必要です（上場会社で措置済み等を除く）。
              新本店管轄分の申請書に、希望する旨・対象者の資格／氏名／住所・添付書面を記載します。
            </div>
          </>
        )}

        {currentStep === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-line p-4">
              <h3 className="font-semibold text-ink">生成される書類</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                {docs.map((d) => (
                  <li key={d}>{DOC_TYPE_LABELS[d]}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-line p-4 text-sm">
              <h3 className="font-semibold text-ink">登録免許税</h3>
              <p className="mt-1 font-serif text-2xl font-bold text-ink">
                {tax.toLocaleString()}円
                <span className="ml-2 text-xs font-normal text-muted">
                  {isCross ? "（旧分3万円＋新分3万円）" : "（管轄内）"}
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-4 text-sm">
              <h3 className="font-semibold text-ink">登記すべき事項（プレビュー）</h3>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-ink">
                {buildRegistrationMatters({
                  transferDate: values.transfer_date,
                  newAddress: values.new_address,
                })}
              </pre>
            </div>
            <div className="rounded-lg border border-line p-4 text-sm text-muted">
              提出先: <strong className="text-ink">{values.old_registry_office || "（旧本店管轄の登記所）"}</strong> に
              {isCross ? "旧分・新分をまとめて提出（経由申請）" : "提出"}。
              移転日から<strong>2週間以内</strong>に申請してください。
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ナビゲーション */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-40"
        >
          ← 戻る
        </button>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-sm text-muted transition hover:text-ink hover:underline disabled:opacity-50"
          >
            {saving ? "保存中..." : "下書き保存"}
          </button>
          {currentStep === "confirm" ? (
            <button
              type="button"
              onClick={generate}
              disabled={saving}
              className="rounded-lg bg-brand-700 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50"
            >
              書類を生成する
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-brand-700 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-800"
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
  "mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">
        {label}
        {help && <HelpTip>{help}</HelpTip>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
