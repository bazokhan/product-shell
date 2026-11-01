import { describe, expect, it } from "vitest";
import i18n from "i18next";
import { displayName, formatDateInput, formatMoney, pageCount } from "./index";
import { pageCount as pages } from "./pagination-bar";

describe("format", () => {
  it("formats money in Arabic locale", async () => {
    await i18n.init({ lng: "ar", resources: { ar: { translation: {} } } });
    const text = formatMoney(12.5, "SAR");
    expect(text).toMatch(/12|١٢/);
  });

  it("prefers English name when language is en", async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: {} } } });
    expect(displayName("عربي", "English")).toBe("English");
  });

  it("prefers Arabic name otherwise", async () => {
    await i18n.init({ lng: "ar", resources: { ar: { translation: {} } } });
    expect(displayName("عربي", "English")).toBe("عربي");
  });

  it("slices ISO date for inputs", () => {
    expect(formatDateInput("2026-11-01T12:00:00.000Z")).toBe("2026-11-01");
  });
});

describe("pageCount", () => {
  it("never returns zero pages", () => {
    expect(pages(0, 20)).toBe(1);
    expect(pageCount(45, 20)).toBe(3);
  });
});
