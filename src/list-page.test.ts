// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { listParams } from "./list-page";
import { applyBranding } from "./settings";

describe("list contract params", () => {
  it("sends paging, sort, filters and extra params; drops empty q", () => {
    expect(
      listParams({ page: 2, pageSize: 25, q: "", sort: "createdAt:desc", filters: { status: "ACTIVE" } }, { branchId: "b-1" }),
    ).toEqual({ page: 2, pageSize: 25, q: undefined, sort: "createdAt:desc", status: "ACTIVE", branchId: "b-1" });
  });
});

describe("branding", () => {
  it("sets and clears the primary colour variables and the title", () => {
    applyBranding({ displayName: "شركة النور", logoUrl: null, primaryColor: "#123456", documentFooter: null, locale: "ar-SA", timezone: "Asia/Riyadh" }, "كَادر");
    expect(document.documentElement.style.getPropertyValue("--brand-primary")).toBe("#123456");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#123456");
    expect(document.title).toBe("كَادر · شركة النور");
    applyBranding(null);
    expect(document.documentElement.style.getPropertyValue("--brand-primary")).toBe("");
  });
});
