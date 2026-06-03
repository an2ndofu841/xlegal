import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { readFileSync } from "node:fs";
import path from "node:path";
import { toWareki } from "@/lib/docgen/wareki";
import {
  buildRegistrationMatters,
  determineDocuments,
  DOC_TYPE_LABELS,
  REGISTRATION_TAX_PER_APPLICATION,
} from "@/lib/docgen/docRules";
import type { Company, DocType, Relocation, Shareholder } from "@/lib/types";

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

/** 住所から最小行政区画（市区町村まで）を簡易抽出する（定款記載の本店所在地用）。 */
export function extractMinimumDistrict(address: string): string {
  const m = address.match(/^(.*?(?:都|道|府|県))?(.*?(?:市|区|町|村))/);
  if (m) return `${m[1] ?? ""}${m[2]}`;
  return address;
}

const BLANK_DATE = "令和　年　月　日";

function warekiOrBlank(date: string | null | undefined): string {
  if (!date) return BLANK_DATE;
  try {
    return toWareki(date);
  } catch {
    return BLANK_DATE;
  }
}

interface AttachmentLine {
  label: string;
  count: number;
}

/** 申請書に記載する添付書類一覧を、生成対象書類から組み立てる。 */
function buildAttachments(docs: DocType[]): AttachmentLine[] {
  const list: AttachmentLine[] = [];
  if (docs.includes("minutes")) list.push({ label: "株主総会議事録", count: 1 });
  if (docs.includes("shareholder_list")) list.push({ label: "株主リスト", count: 1 });
  if (docs.includes("director_decision_board"))
    list.push({ label: "取締役会議事録", count: 1 });
  if (docs.includes("director_decision_majority"))
    list.push({ label: "取締役の決定書", count: 1 });
  if (docs.includes("consent_llc")) list.push({ label: "総社員の同意書", count: 1 });
  if (docs.includes("executive_consent_llc"))
    list.push({ label: "業務執行社員の同意書", count: 1 });
  return list;
}

export interface GenerationInput {
  company: Company;
  relocation: Relocation;
  shareholders: Shareholder[];
}

/** 各書類タイプに差し込むデータを構築する。 */
export function buildDocData(
  docType: DocType,
  input: GenerationInput,
): Record<string, unknown> {
  const { company, relocation, shareholders } = input;
  const registrationMatters = buildRegistrationMatters({
    transferDate: relocation.transfer_date,
    newAddress: relocation.new_address,
  });
  const docs = determineDocuments({
    companyType: company.company_type,
    isCrossJurisdiction: relocation.is_cross_jurisdiction,
    requiresArticlesAmendment: relocation.requires_articles_amendment,
    hasBoard: company.has_board,
  });

  const base = {
    company_number: company.corporate_number || "（記載不要の場合は空欄）",
    company_name: company.name,
    rep_title: company.rep_title || (company.company_type === "llc" ? "代表社員" : "代表取締役"),
    rep_name: company.rep_name,
    rep_address: company.rep_address,
    old_address: relocation.old_address,
    new_address: relocation.new_address,
    new_minimum_district: extractMinimumDistrict(relocation.new_address),
    transfer_date_wareki: warekiOrBlank(relocation.transfer_date),
    meeting_date: warekiOrBlank(relocation.meeting_date),
    decision_date: warekiOrBlank(relocation.meeting_date),
    apply_date: BLANK_DATE,
    registration_matters: registrationMatters,
    articles_clause: relocation.articles_clause_number || 3,
  };

  switch (docType) {
    case "application_old":
      return {
        ...base,
        registration_tax: REGISTRATION_TAX_PER_APPLICATION.toLocaleString(),
        attachments: buildAttachments(docs),
        applicant_honten: relocation.new_address,
        registry_office: relocation.old_registry_office,
      };
    case "application_new":
      return {
        ...base,
        registration_tax: REGISTRATION_TAX_PER_APPLICATION.toLocaleString(),
        attachments: buildAttachments(docs),
        applicant_honten: relocation.new_address,
        registry_office: relocation.new_registry_office || "（新本店管轄の登記所）",
        // §2: 管轄外移転の新所在地での登記と同時にのみ非表示措置を申出可能
        nondisclosure: relocation.apply_address_nondisclosure ? [{}] : [],
      };
    case "minutes": {
      const totalVotes = shareholders.reduce((s, x) => s + x.voting_rights, 0);
      return {
        ...base,
        meeting_place: "本店会議室",
        attending_count:
          shareholders.length > 0 ? shareholders.length.toLocaleString() : "○",
        attending_votes: totalVotes > 0 ? totalVotes.toLocaleString() : "○",
        chair: company.rep_name,
      };
    }
    case "director_decision_board":
      return { ...base, chair: company.rep_name };
    case "director_decision_majority":
      return base;
    case "shareholder_list": {
      const sorted = [...shareholders].sort((a, b) => a.sort_order - b.sort_order);
      const totalVotes = sorted.reduce((s, x) => s + x.voting_rights, 0) || 1;
      return {
        ...base,
        shareholders: sorted.map((s) => ({
          name: s.name,
          address: s.address,
          shares: s.shares.toLocaleString(),
          voting_rights: s.voting_rights.toLocaleString(),
          ratio: ((s.voting_rights / totalVotes) * 100).toFixed(1),
        })),
      };
    }
    case "consent_llc":
      return base;
    case "executive_consent_llc":
      return base;
    default:
      return base;
  }
}

/** docxtemplater でテンプレートを描画し .docx の Buffer を返す。 */
export function renderDocx(docType: DocType, data: Record<string, unknown>): Buffer {
  const content = readFileSync(path.join(TEMPLATES_DIR, `${docType}.docx`));
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

export interface GeneratedDocResult {
  docType: DocType;
  label: string;
  filename: string;
  buffer: Buffer;
}

/** 必要書類をすべて生成して返す。 */
export function generateAllDocuments(input: GenerationInput): GeneratedDocResult[] {
  const docs = determineDocuments({
    companyType: input.company.company_type,
    isCrossJurisdiction: input.relocation.is_cross_jurisdiction,
    requiresArticlesAmendment: input.relocation.requires_articles_amendment,
    hasBoard: input.company.has_board,
  });

  return docs.map((docType) => {
    const data = buildDocData(docType, input);
    const buffer = renderDocx(docType, data);
    return {
      docType,
      label: DOC_TYPE_LABELS[docType],
      filename: `${DOC_TYPE_LABELS[docType]}.docx`,
      buffer,
    };
  });
}

/** 「登記すべき事項」プレーンテキスト（コピペ用）を返す。 */
export function registrationMattersText(relocation: Relocation): string {
  return buildRegistrationMatters({
    transferDate: relocation.transfer_date,
    newAddress: relocation.new_address,
  });
}
