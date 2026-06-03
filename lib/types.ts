export type CompanyType = "kk" | "llc";

export type ArticlesGranularity = "municipality" | "chiban";

export type DocType =
  | "application_old"
  | "application_new"
  | "minutes"
  | "shareholder_list"
  | "director_decision_board"
  | "director_decision_majority"
  | "consent_llc"
  | "executive_consent_llc";

export interface Company {
  id: string;
  user_id: string;
  company_type: CompanyType;
  corporate_number: string | null;
  name: string;
  has_board: boolean;
  rep_title: string | null;
  rep_name: string;
  rep_address: string;
  created_at: string;
}

export interface Relocation {
  id: string;
  company_id: string;
  user_id: string;
  old_address: string;
  new_address: string;
  transfer_date: string;
  is_cross_jurisdiction: boolean;
  requires_articles_amendment: boolean;
  meeting_date: string | null;
  old_registry_office: string;
  new_registry_office: string | null;
  apply_address_nondisclosure: boolean;
  status: "draft" | "generated";
  created_at: string;
}

export interface Shareholder {
  id: string;
  relocation_id: string;
  name: string;
  address: string;
  shares: number;
  voting_rights: number;
  sort_order: number;
}

export interface GeneratedDocument {
  id: string;
  relocation_id: string;
  doc_type: DocType;
  storage_path: string;
  created_at: string;
}
