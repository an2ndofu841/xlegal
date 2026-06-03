import type { ArticlesGranularity, CompanyType, DocType } from "@/lib/types";
import { toWareki } from "@/lib/docgen/wareki";

/** 登録免許税（1通あたり） */
export const REGISTRATION_TAX_PER_APPLICATION = 30000;

/**
 * 登録免許税の合計。
 * 管轄内: 3万円 / 管轄外: 旧分3万円 + 新分3万円 = 6万円。
 */
export function calcRegistrationTax(isCrossJurisdiction: boolean): number {
  return isCrossJurisdiction
    ? REGISTRATION_TAX_PER_APPLICATION * 2
    : REGISTRATION_TAX_PER_APPLICATION;
}

/**
 * 定款変更の要否判定（§6 ステップ4）。
 * - 定款に地番まで記載 → 変更必要。
 * - 定款は市区町村まで、かつ移転先が同一区画 → 変更不要。
 * - 定款は市区町村まで、だが区画をまたぐ → 変更必要。
 */
export function determineArticlesAmendment(input: {
  articlesGranularity: ArticlesGranularity;
  sameMunicipality: boolean;
}): boolean {
  if (input.articlesGranularity === "chiban") return true;
  return !input.sameMunicipality;
}

export interface DocContext {
  companyType: CompanyType;
  isCrossJurisdiction: boolean;
  requiresArticlesAmendment: boolean;
  /** 取締役会設置（株式会社のみ意味を持つ） */
  hasBoard: boolean;
}

/**
 * 必要書類の決定（§6 擬似コード）。
 */
export function determineDocuments(ctx: DocContext): DocType[] {
  const docs: DocType[] = [];

  if (ctx.companyType === "kk") {
    docs.push("application_old");
    if (ctx.isCrossJurisdiction) docs.push("application_new");
    if (ctx.requiresArticlesAmendment) {
      // 定款変更 → 株主総会議事録 + 株主リスト
      docs.push("minutes", "shareholder_list");
    }
    // 具体的な新所在地・移転日の決定書面
    docs.push(ctx.hasBoard ? "director_decision_board" : "director_decision_majority");
  } else {
    // 合同会社
    docs.push("application_old");
    if (ctx.isCrossJurisdiction) docs.push("application_new");
    if (ctx.requiresArticlesAmendment) docs.push("consent_llc"); // 総社員の同意書
    docs.push("executive_consent_llc"); // 業務執行社員の過半数の同意書
  }

  return docs;
}

/** 書類タイプの日本語表示名（UI 用）。 */
export const DOC_TYPE_LABELS: Record<DocType, string> = {
  application_old: "本店移転登記申請書（旧本店管轄分）",
  application_new: "本店移転登記申請書（新本店管轄分）",
  minutes: "株主総会議事録",
  shareholder_list: "株主リスト",
  director_decision_board: "取締役会議事録",
  director_decision_majority: "取締役の決定書",
  consent_llc: "総社員の同意書",
  executive_consent_llc: "業務執行社員の過半数の同意書",
};

/**
 * 「登記すべき事項」のプレーンテキストを生成する（§7 最重要・誤記が多い箇所）。
 *
 * 形式（旧分・新分とも移転後の本店所在地を用いる。§2 参照）:
 *   「登記記録に関する事項」
 *   令和○年○月○日　＜移転後の本店所在地（地番まで）＞　に本店移転
 *
 * 日付は「移転日（実際に移転した日）」を和暦で表記する。
 */
export function buildRegistrationMatters(input: {
  transferDate: string | Date;
  newAddress: string;
}): string {
  const wareki = toWareki(input.transferDate);
  // 全角スペース（U+3000）で区切るのが公式記載例の体裁。
  return `「登記記録に関する事項」\n${wareki}　${input.newAddress}　に本店移転`;
}
