// =============================================================================
// .docx テンプレート生成スクリプト
//
// docxtemplater 用の差し込みテンプレート（{key} / {#loop}{/loop} 記法）を
// プログラムから生成し /templates/*.docx に出力する。テンプレートをコードとして
// 管理することで再現性を担保する。
//
// 注意: ここで生成する文言は §7 の仕様に基づく雛形であり、最終的には §2 の
// 法務局公式記載例（001252661.pdf 等）と必ず突き合わせて差異を公式側に合わせること。
//
// 実行: node scripts/build-templates.mjs
// =============================================================================
import PizZip from "pizzip";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "templates");

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 1行 = 1段落。游明朝フォントを指定して日本語体裁を保つ。 */
function paragraph(line) {
  const text = escapeXml(line);
  return (
    `<w:p><w:pPr><w:rPr><w:rFonts w:ascii="Yu Mincho" w:eastAsia="游明朝" w:hAnsi="Yu Mincho"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Yu Mincho" w:eastAsia="游明朝" w:hAnsi="Yu Mincho"/></w:rPr>` +
    `<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
  );
}

function buildDocx(lines) {
  const zip = new PizZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`,
  );

  zip.folder("_rels").file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`,
  );

  const body = lines.map(paragraph).join("");
  zip.folder("word").file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
      body +
      `<w:sectPr/></w:body></w:document>`,
  );

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

// ---------------------------------------------------------------------------
// 各テンプレートの本文（docxtemplater 記法）
// ---------------------------------------------------------------------------
const applicationCommon = (hontenLabel) => [
  "本店移転登記申請書",
  "",
  "１　会社法人等番号　　{company_number}",
  "１　商　　　号　　　　{company_name}",
  `１　本　　　店　　　　${hontenLabel}`,
  "１　登記の事由　　　　本店移転",
  "１　登記すべき事項",
  "{registration_matters}",
  "１　登録免許税　　　　金{registration_tax}円",
  "１　添付書類",
  "{#attachments}　　{label}　　{count}通",
  "{/attachments}",
  "",
  "　上記のとおり登記の申請をします。",
  "",
  "　{apply_date}",
  "",
  "　申請人　　{company_name}",
  "　　　　　　{applicant_honten}",
  "　{rep_title}　{rep_name}　　印",
  "　　　　　　{rep_address}",
  "",
  "　{registry_office}　御中",
];

const templates = {
  // 7.1 旧本店管轄分（本店＝移転前）
  application_old: applicationCommon("{old_address}"),

  // 7.2 新本店管轄分（本店＝移転後。非表示措置の追記あり）
  application_new: [
    ...applicationCommon("{new_address}"),
    "{#nondisclosure}",
    "",
    "（代表取締役等住所非表示措置の申出）",
    "　代表取締役等住所非表示措置を希望する。",
    "　対象者　{rep_title}　{rep_name}　{rep_address}",
    "　添付書面　実在性を証する書面　等",
    "{/nondisclosure}",
  ],

  // 7.3 株主総会議事録
  minutes: [
    "株主総会議事録",
    "",
    "　商号　{company_name}",
    "　開催日時　{meeting_date}",
    "　開催場所　{meeting_place}",
    "　出席株主数　{attending_count}名",
    "　出席株主の議決権数　{attending_votes}個",
    "　議長　{chair}",
    "",
    "第１号議案　定款一部変更の件",
    "　議長は、本店所在地を変更するため、定款第○条を変更し、本店を{new_minimum_district}に置く旨を提案し、審議の結果、満場一致をもって承認可決した。",
    "　あわせて、本店移転の時期を{transfer_date_wareki}とすることを決議した。",
    "",
    "　以上をもって本日の議事を終了し、議長は閉会を宣した。",
    "",
    "　{meeting_date}",
    "　{company_name}　株主総会",
    "　議事録作成者　{rep_title}　{rep_name}",
  ],

  // 7.4 取締役会議事録
  director_decision_board: [
    "取締役会議事録",
    "",
    "　商号　{company_name}",
    "　開催日時　{decision_date}",
    "　出席取締役　全員",
    "　議長　{chair}",
    "",
    "議案　本店移転の件",
    "　議長は、本店を{new_address}に移転すること、及びその移転日を{transfer_date_wareki}とすることを提案し、審議の結果、全員一致をもって承認可決した。",
    "",
    "　以上",
    "　{decision_date}",
    "　{company_name}　取締役会",
    "　議事録作成者　{rep_title}　{rep_name}",
  ],

  // 7.4 取締役の決定書（取締役会非設置）
  director_decision_majority: [
    "取締役の決定書",
    "",
    "　商号　{company_name}",
    "",
    "　取締役の過半数の一致により、次のとおり決定した。",
    "　一　本店を{new_address}に移転する。",
    "　一　移転日を{transfer_date_wareki}とする。",
    "",
    "　{decision_date}",
    "　{company_name}",
    "　取締役　{rep_name}",
  ],

  // 7.5 株主リスト
  shareholder_list: [
    "証明書",
    "",
    "　{company_name}の株主のうち、議決権数上位の株主は下記のとおりであることを証明します。",
    "",
    "{#shareholders}",
    "　氏名又は名称　{name}",
    "　住所　{address}",
    "　株式数　{shares}株　／　議決権数　{voting_rights}個　／　議決権割合　{ratio}％",
    "",
    "{/shareholders}",
    "　{apply_date}",
    "　{company_name}",
    "　{rep_title}　{rep_name}　　印",
  ],

  // 7.6 総社員の同意書（合同会社・定款変更時）
  consent_llc: [
    "総社員の同意書",
    "",
    "　商号　{company_name}",
    "",
    "　当会社の総社員は、定款を変更し、本店を{new_minimum_district}に置くことに同意した。",
    "",
    "　{meeting_date}",
    "　{company_name}",
    "　総社員",
  ],

  // 7.6 業務執行社員の過半数の同意書（合同会社）
  executive_consent_llc: [
    "業務執行社員の同意書",
    "",
    "　商号　{company_name}",
    "",
    "　業務執行社員の過半数の一致により、次のとおり決定した。",
    "　一　本店を{new_address}に移転する。",
    "　一　移転日を{transfer_date_wareki}とする。",
    "",
    "　{decision_date}",
    "　{company_name}",
    "　業務執行社員　{rep_name}",
  ],
};

mkdirSync(TEMPLATES_DIR, { recursive: true });
for (const [name, lines] of Object.entries(templates)) {
  const buf = buildDocx(lines);
  const path = join(TEMPLATES_DIR, `${name}.docx`);
  writeFileSync(path, buf);
  console.log(`generated: templates/${name}.docx`);
}
