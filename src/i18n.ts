import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { productShellConfig } from "./config";

export const defaultLocale = "ar";

const shellAr = {
  pagination: {
    records: "{{total}} سجل · صفحة {{page}} / {{totalPages}}",
    prev: "السابق",
    next: "التالي",
  },
};

const shellEn = {
  pagination: {
    records: "{{total}} records · page {{page}} / {{totalPages}}",
    prev: "Prev",
    next: "Next",
  },
};

export function getStoredLocale(): string {
  if (typeof localStorage === "undefined") return defaultLocale;
  return localStorage.getItem(productShellConfig().localeStorageKey) ?? defaultLocale;
}

export function setStoredLocale(locale: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(productShellConfig().localeStorageKey, locale);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }
}

export function applyDocumentLocale(locale: string) {
  setStoredLocale(locale);
}

type ResourceBundle = Record<string, unknown>;

export function bootstrapI18n(options: {
  storageKey?: string;
  resources: { ar: ResourceBundle; en: ResourceBundle };
}) {
  if (options.storageKey) {
    const current = productShellConfig();
    current.localeStorageKey = options.storageKey;
  }

  const lng = getStoredLocale();
  void i18n.use(initReactI18next).init({
    resources: {
      ar: { translation: { ...shellAr, ...options.resources.ar } },
      en: { translation: { ...shellEn, ...options.resources.en } },
    },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
  setStoredLocale(i18n.language);
  return i18n;
}

export { i18n };
