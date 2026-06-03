import { z } from "zod";

const requiredText = (label: string) =>
  z.string().trim().min(1, { message: `${label}を入力してください` });

const dateString = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: `${label}を正しく入力してください` });

/** 会社種別（ステップ1） */
export const companyTypeSchema = z.object({
  company_type: z.enum(["kk", "llc"], { message: "会社種別を選択してください" }),
});

/** 会社基本情報（ステップ2） */
export const companyInfoSchema = z.object({
  name: requiredText("商号"),
  corporate_number: z
    .string()
    .trim()
    .regex(/^(\d{12})?$/, { message: "会社法人等番号は12桁の数字で入力してください" })
    .optional()
    .or(z.literal("")),
  has_board: z.boolean(),
  rep_title: requiredText("代表者の資格（代表取締役/代表社員）"),
  rep_name: requiredText("代表者氏名"),
  rep_address: requiredText("代表者住所"),
});

/** 移転内容（ステップ3） */
export const moveSchema = z.object({
  old_address: requiredText("移転前の本店所在地"),
  new_address: requiredText("移転後の本店所在地"),
  transfer_date: dateString("移転日"),
  is_cross_jurisdiction: z.boolean(),
});

/** 定款の本店所在地の記載（ステップ4） */
export const articlesSchema = z.object({
  articles_granularity: z.enum(["municipality", "chiban"], {
    message: "定款の記載粒度を選択してください",
  }),
  same_municipality: z.boolean(),
});

/** 意思決定情報（ステップ5） */
export const decisionSchema = z.object({
  meeting_date: z.string().optional().or(z.literal("")),
  old_registry_office: requiredText("旧本店管轄の登記所名"),
  new_registry_office: z.string().optional().or(z.literal("")),
});

/** 株主（ステップ6・定款変更ありの株式会社のみ） */
export const shareholderSchema = z.object({
  name: requiredText("株主氏名"),
  address: requiredText("株主住所"),
  shares: z.number({ message: "株式数を入力してください" }).int().min(0),
  voting_rights: z.number({ message: "議決権数を入力してください" }).int().min(0),
});

export const shareholdersSchema = z.object({
  shareholders: z.array(shareholderSchema),
});

/** 非表示措置（ステップ7・管轄外のみ） */
export const nondisclosureSchema = z.object({
  apply_address_nondisclosure: z.boolean(),
});

/**
 * 全ステップを結合した移転案件スキーマ。
 * 条件分岐の整合性チェックを refine で行う。
 */
export const relocationFormSchema = companyTypeSchema
  .and(companyInfoSchema)
  .and(moveSchema)
  .and(articlesSchema)
  .and(decisionSchema)
  .and(shareholdersSchema)
  .and(nondisclosureSchema)
  .superRefine((data, ctx) => {
    const requiresAmendment =
      data.articles_granularity === "chiban" ? true : !data.same_municipality;

    // 管轄外なら新本店管轄の登記所名が必須
    if (data.is_cross_jurisdiction && !data.new_registry_office?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["new_registry_office"],
        message: "管轄外移転では新本店管轄の登記所名が必須です",
      });
    }

    // 定款変更ありなら株主総会/同意の日付が必須
    if (requiresAmendment && !data.meeting_date?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["meeting_date"],
        message: "定款変更を伴う場合は株主総会（同意）の日付が必須です",
      });
    }

    // 定款変更ありの株式会社は株主リストが必要（上位10名 or 議決権2/3到達まで）
    if (data.company_type === "kk" && requiresAmendment) {
      if (data.shareholders.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["shareholders"],
          message: "定款変更を伴う株式会社では株主リストの入力が必要です",
        });
      }
    }
  });

export type RelocationForm = z.infer<typeof relocationFormSchema>;

/**
 * 株主リストの十分性チェック。
 * 「議決権割合の多い順に合計が2/3に達するまで」または「上位10名まで」のいずれか
 * 少ない方を満たしているか。
 */
export function isShareholderListSufficient(
  shareholders: { voting_rights: number }[],
): boolean {
  if (shareholders.length === 0) return false;
  const sorted = [...shareholders].sort((a, b) => b.voting_rights - a.voting_rights);
  const total = sorted.reduce((s, x) => s + x.voting_rights, 0);
  if (total <= 0) return false;

  // 上位10名で全体なら十分
  if (sorted.length <= 10) return true;

  // 2/3 到達に必要な人数
  let acc = 0;
  let count = 0;
  for (const s of sorted) {
    acc += s.voting_rights;
    count += 1;
    if (acc / total >= 2 / 3) break;
  }
  // 必要人数（2/3到達 or 10名の少ない方）が入力されていれば十分
  const required = Math.min(count, 10);
  return sorted.length >= required;
}
