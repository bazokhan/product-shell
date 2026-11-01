import { afterEach, describe, expect, it } from "vitest";
import { configureProductShell, resetProductShellConfig } from "./config";
import { setStoredLocale } from "./i18n";

describe("locale direction", () => {
  afterEach(() => {
    localStorage.clear();
    resetProductShellConfig();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  it("uses RTL for Arabic and LTR for English", () => {
    configureProductShell({ storageKey: "hr.auth", localeStorageKey: "hr.locale", getBaseUrl: () => "/api/v1" });
    setStoredLocale("ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    setStoredLocale("en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });
});
