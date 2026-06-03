/**
 * 和暦変換ユーティリティ。
 *
 * 本店移転登記の「登記すべき事項」「申請年月日」等で用いる元号付き日付を生成する。
 * 移転日は現在〜近未来が前提のため令和が中心だが、平成・昭和も扱える。
 *
 * 公式記載例（法務局 001252661.pdf 等）では年「1」は「元年」と表記するのが慣例。
 */

interface Era {
  name: string;
  /** 元号の開始日（その日を含む） */
  start: Date;
}

const ERAS: Era[] = [
  { name: "令和", start: dateOnly(2019, 5, 1) },
  { name: "平成", start: dateOnly(1989, 1, 8) },
  { name: "昭和", start: dateOnly(1926, 12, 25) },
];

function dateOnly(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/** "YYYY-MM-DD" もしくは Date を、タイムゾーンに依存しないローカル日付へ正規化する。 */
function normalize(input: Date | string): Date {
  if (input instanceof Date) {
    return dateOnly(input.getFullYear(), input.getMonth() + 1, input.getDate());
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input.trim());
  if (!m) {
    throw new Error(`日付の形式が不正です: ${input}`);
  }
  return dateOnly(Number(m[1]), Number(m[2]), Number(m[3]));
}

/**
 * 和暦文字列を返す（例: "令和7年6月1日"、"令和元年5月1日"）。
 */
export function toWareki(input: Date | string): string {
  const d = normalize(input);
  const era = ERAS.find((e) => d.getTime() >= e.start.getTime());
  if (!era) {
    throw new Error(`対応する元号がありません: ${input}`);
  }
  const yearNum = d.getFullYear() - era.start.getFullYear() + 1;
  const yearLabel = yearNum === 1 ? "元" : String(yearNum);
  return `${era.name}${yearLabel}年${d.getMonth() + 1}月${d.getDate()}日`;
}
