// =============================================================================
// .docx テンプレート生成スクリプト（書式付き）
//
// docxtemplater 用の差し込みテンプレート（{key} / {#loop}{/loop} 記法）を
// プログラムから生成し /templates/*.docx に出力する。
//
// 書式方針:
//  - A4・上下左右25mm余白、游明朝、本文10.5pt
//  - 表題は中央寄せ・太字・15pt
//  - 株主リストは枠線付きの表（公式様式に準拠：氏名又は名称／住所／株式数／
//    議決権数／議決権数割合）
//  - 申請書は項目をぶら下げインデントで整列、日付・申請人・宛先を体裁よく配置
//
// 注意: 文言は雛形であり、最終的には法務局公式記載例と突き合わせること。
//
// 実行: node scripts/build-templates.mjs
// =============================================================================
import PizZip from "pizzip";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "templates");

const FONT = `<w:rFonts w:ascii="Yu Mincho" w:eastAsia="游明朝" w:hAnsi="Yu Mincho"/>`;

// 本文幅（A4 - 左右余白）: 11906 - 1418*2 = 9070 twips
const CONTENT_WIDTH = 9070;

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** テキストラン（游明朝・任意で太字／サイズ／間隔）。 */
function run(text, { bold = false, size = 21 } = {}) {
  const rPr =
    FONT +
    `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` +
    (bold ? `<w:b/><w:bCs/>` : "");
  return (
    `<w:r><w:rPr>${rPr}</w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
  );
}

/**
 * 段落。
 * opts: align(left|center|right|both), bold, size, indent, hanging,
 *       before, after(段落間隔 twips)
 */
function p(text = "", opts = {}) {
  const {
    align,
    bold = false,
    size = 21,
    indent = 0,
    hanging = 0,
    before = 0,
    after = 80,
  } = opts;

  const pPrParts = [];
  if (align) pPrParts.push(`<w:jc w:val="${align}"/>`);
  if (indent || hanging) {
    pPrParts.push(
      `<w:ind${indent ? ` w:left="${indent}"` : ""}${hanging ? ` w:hanging="${hanging}"` : ""}/>`,
    );
  }
  pPrParts.push(`<w:spacing w:before="${before}" w:after="${after}" w:line="300" w:lineRule="auto"/>`);
  pPrParts.push(`<w:rPr>${FONT}<w:sz w:val="${size}"/>${bold ? "<w:b/>" : ""}</w:rPr>`);

  const body = text === "" ? "" : run(text, { bold, size });
  return `<w:p><w:pPr>${pPrParts.join("")}</w:pPr>${body}</w:p>`;
}

/** 表題（中央・太字・15pt・下罫線つき）。 */
function title(text) {
  return (
    `<w:p><w:pPr>` +
    `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="6" w:color="000000"/></w:pBdr>` +
    `<w:jc w:val="center"/>` +
    `<w:spacing w:before="0" w:after="240" w:line="300" w:lineRule="auto"/>` +
    `<w:rPr>${FONT}<w:sz w:val="30"/><w:b/></w:rPr></w:pPr>` +
    run(text, { bold: true, size: 30 }) +
    `</w:p>`
  );
}

/** 枠線で囲んだ単一セルのボックス（登記すべき事項などの強調用）。 */
function box(innerParagraphs, width = CONTENT_WIDTH) {
  const cell =
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>` +
    `<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="160" w:type="dxa"/>` +
    `<w:bottom w:w="80" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar>` +
    `</w:tcPr>${innerParagraphs}</w:tc>`;
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/>` +
    `<w:jc w:val="center"/>${tblBorders()}<w:tblLook w:val="04A0"/></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="${width}"/></w:tblGrid>` +
    `<w:tr>${cell}</w:tr></w:tbl>`
  );
}

/** 空段落。 */
function spacer() {
  return p("", { after: 0 });
}

/** 罫線セット（黒・細線）。 */
function tblBorders() {
  const b = (n) =>
    `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
  return (
    `<w:tblBorders>` +
    b("top") +
    b("left") +
    b("bottom") +
    b("right") +
    b("insideH") +
    b("insideV") +
    `</w:tblBorders>`
  );
}

/** 表のセル。 */
function tc(text, { w, bold = false, align = "left", fill } = {}) {
  const shd = fill
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`
    : "";
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${shd}` +
    `<w:vAlign w:val="center"/></w:tcPr>` +
    p(text, { align, bold, after: 0 }) +
    `</w:tc>`
  );
}

/** 表行。 */
function tr(cells) {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

/** 枠線付きの表。 */
function table(colWidths, rows) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  const grid = colWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join("");
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/>` +
    `<w:jc w:val="center"/>${tblBorders()}` +
    `<w:tblLook w:val="04A0"/></w:tblPr>` +
    `<w:tblGrid>${grid}</w:tblGrid>` +
    rows.join("") +
    `</w:tbl>`
  );
}

function buildDocx(bodyXml) {
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

  // A4・余白25mm
  const sectPr =
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" ` +
    `w:header="851" w:footer="992" w:gutter="0"/></w:sectPr>`;

  zip.folder("word").file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:body>${bodyXml}${sectPr}</w:body></w:document>`,
  );

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

// ---------------------------------------------------------------------------
// 各テンプレート本文（docxtemplater 記法）
// ---------------------------------------------------------------------------

/** 申請書の共通本体。hontenPlaceholder は {old_address} or {new_address}。 */
function applicationCommon(hontenPlaceholder) {
  const itemIndent = 1700; // 値の開始位置（ぶら下げ）
  const item = (label, value) =>
    p(`１　${label}　${value}`, { indent: itemIndent, hanging: itemIndent });

  return [
    title("本店移転登記申請書"),
    item("会社法人等番号", "{company_number}"),
    item("商　　　　号", "{company_name}"),
    item("本　　　　店", hontenPlaceholder),
    item("登記の事由", "本店移転"),
    p("１　登記すべき事項", { after: 60 }),
    box(p("{registration_matters}", { after: 0 })),
    spacer(),
    item("登録免許税", "金{registration_tax}円"),
    p("１　添付書類", {}),
    // 添付書類ループ（1書類=1行）
    p("{#attachments}　　{label}　　{count}通", { indent: 480, after: 40 }),
    p("{/attachments}", { after: 0 }),
    spacer(),
    p("　上記のとおり登記の申請をします。", {}),
    spacer(),
    p("　{apply_date}", {}),
    spacer(),
    p("　　申請人　　{company_name}", {}),
    p("　　　　　　　{applicant_honten}", {}),
    p("　　{rep_title}　{rep_name}　　㊞", {}),
    p("　　　　　　　{rep_address}", {}),
    spacer(),
    p("　{registry_office}　御中", {}),
  ].join("");
}

const templates = {
  // 旧本店管轄分（本店＝移転前）
  application_old: () => applicationCommon("{old_address}"),

  // 新本店管轄分（本店＝移転後。非表示措置の追記あり）
  application_new: () =>
    [
      applicationCommon("{new_address}"),
      p("{#nondisclosure}", { after: 0 }),
      spacer(),
      p("（代表取締役等住所非表示措置の申出）", { bold: true }),
      p("　代表取締役等住所非表示措置を希望する。", {}),
      p("　対象者　{rep_title}　{rep_name}", {}),
      p("　　　　　{rep_address}", {}),
      p("　添付書面　実在性を証する書面　等", {}),
      p("{/nondisclosure}", { after: 0 }),
    ].join(""),

  // 株主総会議事録
  minutes: () =>
    [
      title("株主総会議事録"),
      p("　商号　　　　　　　{company_name}", {}),
      p("　開催日時　　　　　{meeting_date}", {}),
      p("　開催場所　　　　　{meeting_place}", {}),
      p("　出席株主数　　　　{attending_count}名", {}),
      p("　出席株主の議決権数　{attending_votes}個", {}),
      p("　議　長　　　　　　{chair}", {}),
      spacer(),
      p("第１号議案　定款一部変更の件", { bold: true }),
      p(
        "　議長は、本店所在地を変更するため、定款中の本店の所在地に関する規定を変更し、本店を{new_minimum_district}に置く旨を提案し、審議の結果、満場一致をもって承認可決した。",
        { indent: 240 },
      ),
      p("　あわせて、本店移転の時期を{transfer_date_wareki}とすることを決議した。", {
        indent: 240,
      }),
      spacer(),
      p("　以上をもって本日の議事を終了し、議長は閉会を宣した。", {}),
      spacer(),
      p("　{meeting_date}", { align: "right" }),
      p("　{company_name}　株主総会", { align: "right" }),
      p("　議事録作成者　{rep_title}　{rep_name}　　㊞", { align: "right" }),
    ].join(""),

  // 取締役会議事録（取締役会設置）
  director_decision_board: () =>
    [
      title("取締役会議事録"),
      p("　商号　　　　{company_name}", {}),
      p("　開催日時　　{decision_date}", {}),
      p("　出席取締役　全員", {}),
      p("　議　長　　　{chair}", {}),
      spacer(),
      p("議案　本店移転の件", { bold: true }),
      p(
        "　議長は、本店を{new_address}に移転すること、及びその移転日を{transfer_date_wareki}とすることを提案し、審議の結果、全員一致をもって承認可決した。",
        { indent: 240 },
      ),
      spacer(),
      p("　以上", {}),
      spacer(),
      p("　{decision_date}", { align: "right" }),
      p("　{company_name}　取締役会", { align: "right" }),
      p("　議事録作成者　{rep_title}　{rep_name}　　㊞", { align: "right" }),
    ].join(""),

  // 取締役の決定書（取締役会非設置）
  director_decision_majority: () =>
    [
      title("取締役の決定書"),
      p("　商号　{company_name}", {}),
      spacer(),
      p("　取締役の過半数の一致により、次のとおり決定した。", {}),
      p("　一　本店を{new_address}に移転する。", { indent: 240 }),
      p("　一　移転日を{transfer_date_wareki}とする。", { indent: 240 }),
      spacer(),
      p("　{decision_date}", { align: "right" }),
      p("　{company_name}", { align: "right" }),
      p("　取締役　{rep_name}　　㊞", { align: "right" }),
    ].join(""),

  // 株主リスト（枠線付きの表）
  shareholder_list: () => {
    const cols = [2100, 3070, 1300, 1300, 1300]; // 計 9070
    const header = tr([
      tc("氏名又は名称", { w: cols[0], bold: true, align: "center", fill: "F2F2F2" }),
      tc("住所", { w: cols[1], bold: true, align: "center", fill: "F2F2F2" }),
      tc("株式数", { w: cols[2], bold: true, align: "center", fill: "F2F2F2" }),
      tc("議決権数", { w: cols[3], bold: true, align: "center", fill: "F2F2F2" }),
      tc("議決権数割合", { w: cols[4], bold: true, align: "center", fill: "F2F2F2" }),
    ]);
    // ループ行：先頭セルに {#shareholders}、末尾セルに {/shareholders}
    const dataRow = tr([
      tc("{#shareholders}{name}", { w: cols[0], align: "left" }),
      tc("{address}", { w: cols[1], align: "left" }),
      tc("{shares}株", { w: cols[2], align: "center" }),
      tc("{voting_rights}個", { w: cols[3], align: "center" }),
      tc("{ratio}％{/shareholders}", { w: cols[4], align: "center" }),
    ]);
    return [
      title("証明書"),
      p(
        "　{company_name}の株主のうち、議決権数の上位の株主は、下記のとおりであることを証明します。",
        { after: 200 },
      ),
      table(cols, [header, dataRow]),
      spacer(),
      p("　{apply_date}", { align: "right" }),
      p("　{company_name}", { align: "right" }),
      p("　{rep_title}　{rep_name}　　㊞", { align: "right" }),
    ].join("");
  },

  // 総社員の同意書（合同会社・定款変更時）
  consent_llc: () =>
    [
      title("総社員の同意書"),
      p("　商号　{company_name}", {}),
      spacer(),
      p("　当会社の総社員は、定款を変更し、本店を{new_minimum_district}に置くことに同意した。", {
        indent: 240,
      }),
      spacer(),
      p("　{meeting_date}", { align: "right" }),
      p("　{company_name}", { align: "right" }),
      p("　総社員", { align: "right" }),
    ].join(""),

  // 業務執行社員の過半数の同意書（合同会社）
  executive_consent_llc: () =>
    [
      title("業務執行社員の同意書"),
      p("　商号　{company_name}", {}),
      spacer(),
      p("　業務執行社員の過半数の一致により、次のとおり決定した。", {}),
      p("　一　本店を{new_address}に移転する。", { indent: 240 }),
      p("　一　移転日を{transfer_date_wareki}とする。", { indent: 240 }),
      spacer(),
      p("　{decision_date}", { align: "right" }),
      p("　{company_name}", { align: "right" }),
      p("　業務執行社員　{rep_name}　　㊞", { align: "right" }),
    ].join(""),
};

mkdirSync(TEMPLATES_DIR, { recursive: true });
for (const [name, build] of Object.entries(templates)) {
  const buf = buildDocx(build());
  const path = join(TEMPLATES_DIR, `${name}.docx`);
  writeFileSync(path, buf);
  console.log(`generated: templates/${name}.docx`);
}
