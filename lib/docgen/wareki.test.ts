import { describe, expect, it } from "vitest";
import { toWareki } from "@/lib/docgen/wareki";

describe("toWareki", () => {
  it("令和の通常年を変換する", () => {
    expect(toWareki("2025-06-01")).toBe("令和7年6月1日");
  });

  it("令和元年は「元年」と表記する", () => {
    expect(toWareki("2019-05-01")).toBe("令和元年5月1日");
  });

  it("令和改元前日は平成", () => {
    expect(toWareki("2019-04-30")).toBe("平成31年4月30日");
  });

  it("平成元年", () => {
    expect(toWareki("1989-01-08")).toBe("平成元年1月8日");
  });

  it("昭和", () => {
    expect(toWareki("1985-12-31")).toBe("昭和60年12月31日");
  });

  it("Date 入力でもタイムゾーンに依存しない", () => {
    expect(toWareki(new Date(2025, 0, 5))).toBe("令和7年1月5日");
  });

  it("不正な形式は例外", () => {
    expect(() => toWareki("2025/06/01")).toThrow();
  });
});
