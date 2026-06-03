import { describe, expect, it } from "vitest";
import {
  buildRegistrationMatters,
  calcRegistrationTax,
  determineArticlesAmendment,
  determineDocuments,
} from "@/lib/docgen/docRules";

describe("calcRegistrationTax", () => {
  it("管轄内は3万円", () => {
    expect(calcRegistrationTax(false)).toBe(30000);
  });
  it("管轄外は6万円", () => {
    expect(calcRegistrationTax(true)).toBe(60000);
  });
});

describe("determineArticlesAmendment", () => {
  it("定款が市区町村まで・同一区画 → 変更不要", () => {
    expect(
      determineArticlesAmendment({ articlesGranularity: "municipality", sameMunicipality: true }),
    ).toBe(false);
  });
  it("定款が市区町村まで・区画をまたぐ → 変更必要", () => {
    expect(
      determineArticlesAmendment({ articlesGranularity: "municipality", sameMunicipality: false }),
    ).toBe(true);
  });
  it("定款に地番まで記載 → 同一区画でも変更必要", () => {
    expect(
      determineArticlesAmendment({ articlesGranularity: "chiban", sameMunicipality: true }),
    ).toBe(true);
  });
});

describe("determineDocuments", () => {
  it("株式会社・管轄外・定款変更あり・取締役会設置（代表ケース）", () => {
    const docs = determineDocuments({
      companyType: "kk",
      isCrossJurisdiction: true,
      requiresArticlesAmendment: true,
      hasBoard: true,
    });
    expect(docs).toEqual([
      "application_old",
      "application_new",
      "minutes",
      "shareholder_list",
      "director_decision_board",
    ]);
  });

  it("株式会社・管轄内・定款変更なし・取締役会非設置", () => {
    const docs = determineDocuments({
      companyType: "kk",
      isCrossJurisdiction: false,
      requiresArticlesAmendment: false,
      hasBoard: false,
    });
    expect(docs).toEqual(["application_old", "director_decision_majority"]);
  });

  it("管轄内では申請書は旧分のみ（新分は出ない）", () => {
    const docs = determineDocuments({
      companyType: "kk",
      isCrossJurisdiction: false,
      requiresArticlesAmendment: false,
      hasBoard: true,
    });
    expect(docs).not.toContain("application_new");
  });

  it("定款変更ありの株式会社でのみ株主総会議事録・株主リストが出る", () => {
    const noAmend = determineDocuments({
      companyType: "kk",
      isCrossJurisdiction: true,
      requiresArticlesAmendment: false,
      hasBoard: true,
    });
    expect(noAmend).not.toContain("minutes");
    expect(noAmend).not.toContain("shareholder_list");
  });

  it("合同会社・管轄外・定款変更あり", () => {
    const docs = determineDocuments({
      companyType: "llc",
      isCrossJurisdiction: true,
      requiresArticlesAmendment: true,
      hasBoard: false,
    });
    expect(docs).toEqual([
      "application_old",
      "application_new",
      "consent_llc",
      "executive_consent_llc",
    ]);
  });

  it("合同会社・管轄内・定款変更なし", () => {
    const docs = determineDocuments({
      companyType: "llc",
      isCrossJurisdiction: false,
      requiresArticlesAmendment: false,
      hasBoard: false,
    });
    expect(docs).toEqual(["application_old", "executive_consent_llc"]);
  });
});

describe("buildRegistrationMatters", () => {
  it("移転後住所・和暦・移転日の形式で生成される", () => {
    const text = buildRegistrationMatters({
      transferDate: "2025-06-01",
      newAddress: "東京都千代田区霞が関一丁目1番1号",
    });
    expect(text).toBe(
      "「登記記録に関する事項」\n令和7年6月1日　東京都千代田区霞が関一丁目1番1号　に本店移転",
    );
  });
});
