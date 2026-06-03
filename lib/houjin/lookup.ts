/**
 * 法人番号 → 会社情報の検索アダプタ。
 *
 * 提供元を環境変数で切り替える（どちらも未設定なら無効）:
 *  - 国税庁 法人番号システム Web-API : HOUJIN_BANGO_APP_ID
 *  - gBizINFO API                    : GBIZINFO_TOKEN
 *
 * 取得できるのは「商号」「本店所在地」「法人番号」のみ。
 * 代表者情報・取締役会設置の有無などは各APIに存在しないため対象外。
 */

export type HoujinResult = {
  corporateNumber: string;
  name: string;
  address: string;
};

export type HoujinProvider = "nta" | "gbizinfo" | null;

export function getProvider(): HoujinProvider {
  if (process.env.HOUJIN_BANGO_APP_ID) return "nta";
  if (process.env.GBIZINFO_TOKEN) return "gbizinfo";
  return null;
}

export function isEnabled(): boolean {
  return getProvider() !== null;
}

const NUMBER_RE = /^\d{13}$/;

export function isCorporateNumber(q: string): boolean {
  return NUMBER_RE.test(q.replace(/[\s-]/g, ""));
}

/** 検索クエリ（13桁の法人番号 or 法人名）から候補を返す。 */
export async function searchHoujin(query: string): Promise<HoujinResult[]> {
  const provider = getProvider();
  if (!provider) return [];
  const q = query.trim();
  if (!q) return [];

  if (provider === "nta") {
    return isCorporateNumber(q)
      ? ntaByNumber(q.replace(/[\s-]/g, ""))
      : ntaByName(q);
  }
  return isCorporateNumber(q)
    ? gbizByNumber(q.replace(/[\s-]/g, ""))
    : gbizByName(q);
}

/* ------------------------- 国税庁 法人番号 Web-API ------------------------- */

const NTA_BASE = "https://api.houjin-bangou.nta.go.jp/4";

async function ntaByNumber(number: string): Promise<HoujinResult[]> {
  const id = process.env.HOUJIN_BANGO_APP_ID!;
  const url = `${NTA_BASE}/num?id=${encodeURIComponent(id)}&number=${number}&type=12`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  return parseNtaXml(await res.text());
}

async function ntaByName(name: string): Promise<HoujinResult[]> {
  const id = process.env.HOUJIN_BANGO_APP_ID!;
  const url =
    `${NTA_BASE}/name?id=${encodeURIComponent(id)}` +
    `&name=${encodeURIComponent(name)}&type=12&mode=2&target=1&kind=01`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  return parseNtaXml(await res.text()).slice(0, 20);
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : "";
}

function parseNtaXml(xml: string): HoujinResult[] {
  const blocks = xml.match(/<corporation>[\s\S]*?<\/corporation>/g) ?? [];
  const out: HoujinResult[] = [];
  for (const b of blocks) {
    const corporateNumber = pick(b, "corporateNumber");
    if (!corporateNumber) continue;
    const name = pick(b, "name");
    const address =
      pick(b, "prefectureName") + pick(b, "cityName") + pick(b, "streetNumber");
    out.push({ corporateNumber, name, address });
  }
  return out;
}

/* ------------------------------- gBizINFO ------------------------------- */

const GBIZ_BASE = "https://info.gbiz.go.jp/hojin/v1/hojin";

type GbizHojin = { corporate_number?: string; name?: string; location?: string };
type GbizResponse = { "hojin-infos"?: GbizHojin[] };

async function gbizFetch(url: string): Promise<GbizResponse | null> {
  const token = process.env.GBIZINFO_TOKEN!;
  const res = await fetch(url, {
    headers: { "X-hojinInfo-api-token": token, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as GbizResponse;
}

function mapGbiz(data: GbizResponse | null): HoujinResult[] {
  const infos = data?.["hojin-infos"] ?? [];
  return infos
    .filter((h) => h.corporate_number)
    .map((h) => ({
      corporateNumber: h.corporate_number!,
      name: h.name ?? "",
      address: h.location ?? "",
    }));
}

async function gbizByNumber(number: string): Promise<HoujinResult[]> {
  return mapGbiz(await gbizFetch(`${GBIZ_BASE}/${number}`));
}

async function gbizByName(name: string): Promise<HoujinResult[]> {
  return mapGbiz(
    await gbizFetch(`${GBIZ_BASE}?name=${encodeURIComponent(name)}&limit=20`),
  ).slice(0, 20);
}
