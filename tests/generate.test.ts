import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { generateAllDocuments } from "@/lib/docgen/generate";
import type { Company, Relocation, Shareholder } from "@/lib/types";

function docText(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  return zip.file("word/document.xml")!.asText();
}

const company: Company = {
  id: "c1",
  user_id: "u1",
  company_type: "kk",
  corporate_number: "123456789012",
  name: "テスト株式会社",
  has_board: true,
  rep_title: "代表取締役",
  rep_name: "山田太郎",
  rep_address: "東京都港区南青山一丁目1番1号",
  created_at: "",
};

const relocation: Relocation = {
  id: "r1",
  company_id: "c1",
  user_id: "u1",
  old_address: "東京都港区南青山一丁目1番1号",
  new_address: "大阪府大阪市北区梅田一丁目1番1号",
  transfer_date: "2025-06-01",
  is_cross_jurisdiction: true,
  requires_articles_amendment: true,
  meeting_date: "2025-05-25",
  old_registry_office: "東京法務局港出張所",
  new_registry_office: "大阪法務局",
  apply_address_nondisclosure: true,
  status: "draft",
  created_at: "",
};

const shareholders: Shareholder[] = [
  { id: "s1", relocation_id: "r1", name: "山田太郎", address: "東京都港区", shares: 600, voting_rights: 600, sort_order: 0 },
  { id: "s2", relocation_id: "r1", name: "鈴木花子", address: "東京都新宿区", shares: 400, voting_rights: 400, sort_order: 1 },
];

describe("E2E: 管轄外×株式会社×定款変更あり×取締役会設置", () => {
  const results = generateAllDocuments({ company, relocation, shareholders });
  const byType = Object.fromEntries(results.map((r) => [r.docType, r]));

  it("申請書が旧分・新分の2通を含む全5書類が生成される", () => {
    expect(results.map((r) => r.docType)).toEqual([
      "application_old",
      "application_new",
      "minutes",
      "shareholder_list",
      "director_decision_board",
    ]);
  });

  it("登記すべき事項が移転後住所・和暦・移転日で生成される", () => {
    const text = docText(byType.application_old.buffer);
    expect(text).toContain("登記記録に関する事項");
    expect(text).toContain("令和7年6月1日");
    expect(text).toContain("大阪府大阪市北区梅田一丁目1番1号");
    expect(text).toContain("に本店移転");
  });

  it("申請書1通あたりの登録免許税は3万円", () => {
    expect(docText(byType.application_old.buffer)).toContain("金30,000円");
    expect(docText(byType.application_new.buffer)).toContain("金30,000円");
  });

  it("新分申請書には非表示措置の追記が入る", () => {
    const text = docText(byType.application_new.buffer);
    expect(text).toContain("代表取締役等住所非表示措置を希望する");
    expect(text).toContain("実在性を証する書面");
  });

  it("株主リストに各株主と議決権割合が出力される", () => {
    const text = docText(byType.shareholder_list.buffer);
    expect(text).toContain("山田太郎");
    expect(text).toContain("鈴木花子");
    expect(text).toContain("60.0");
    expect(text).toContain("40.0");
  });

  it("生成された全 .docx が有効な zip として読み込める", () => {
    for (const r of results) {
      expect(() => new PizZip(r.buffer)).not.toThrow();
    }
  });
});

describe("非表示措置を申し出ない場合は新分に追記されない", () => {
  it("nondisclosure ブロックが描画されない", () => {
    const results = generateAllDocuments({
      company,
      relocation: { ...relocation, apply_address_nondisclosure: false },
      shareholders,
    });
    const appNew = results.find((r) => r.docType === "application_new")!;
    expect(docText(appNew.buffer)).not.toContain("代表取締役等住所非表示措置を希望する");
  });
});
