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
  launcher: {
    title: "ترو جراف",
    subtitle: "دخول واحد. ثم المنتج الذي اشتراه المستأجر.",
    tenantSlug: "المستأجر",
    email: "البريد",
    password: "كلمة المرور",
    submit: "دخول",
    totp: "رمز المصادقة",
    totpHint: "أدخل الرمز من تطبيق المصادقة.",
    failed: "تعذر الدخول",
    choose: "اختر المنتج",
    none: "لا يوجد منتج مفعّل لهذا المستأجر.",
    redirecting: "جارٍ الفتح…",
    logout: "خروج",
  },
  account: {
    title: "الحساب",
    subtitle: "كلمة المرور واللغة والتحقق بخطوتين.",
    passwordTitle: "تغيير كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور الجديدة",
    savePassword: "حفظ",
    saving: "جاري الحفظ…",
    changed: "تم تغيير كلمة المرور. سجّل الدخول من جديد إن لزم.",
    passwordTooShort: "كلمة المرور الجديدة يجب ألا تقل عن ١٢ حرفاً.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    currentInvalid: "كلمة المرور الحالية غير صحيحة.",
    failed: "تعذر تغيير كلمة المرور.",
    language: "اللغة",
    mfaTitle: "التحقق بخطوتين",
    mfaOn: "مفعّل. ستُطلب رموز التطبيق عند الدخول.",
    mfaOff: "غير مفعّل.",
    mfaStart: "تفعيل",
    mfaSecret: "المفتاح",
    mfaConfirm: "تأكيد الرمز",
    mfaDisable: "إيقاف",
    mfaPassword: "كلمة المرور الحالية",
    mfaCode: "رمز المصادقة",
    mfaFailed: "تعذر حفظ التحقق بخطوتين.",
    mfaInvalid: "رمز غير صحيح.",
  },
};

const shellEn = {
  pagination: {
    records: "{{total}} records · page {{page}} / {{totalPages}}",
    prev: "Prev",
    next: "Next",
  },
  launcher: {
    title: "TruGraph",
    subtitle: "One sign-in. Then the products this tenant bought.",
    tenantSlug: "Tenant",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    totp: "Authenticator code",
    totpHint: "Enter the code from your authenticator app.",
    failed: "Could not sign in",
    choose: "Choose a product",
    none: "This tenant has no enabled product.",
    redirecting: "Opening…",
    logout: "Sign out",
  },
  account: {
    title: "Account",
    subtitle: "Password, language, and two-factor authentication.",
    passwordTitle: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    savePassword: "Save",
    saving: "Saving…",
    changed: "Password changed. Sign in again if asked.",
    passwordTooShort: "New password must be at least 12 characters.",
    passwordMismatch: "The new passwords do not match.",
    currentInvalid: "Current password is incorrect.",
    failed: "Could not change the password.",
    language: "Language",
    mfaTitle: "Two-factor authentication",
    mfaOn: "On. Sign-in will ask for an authenticator code.",
    mfaOff: "Off.",
    mfaStart: "Enable",
    mfaSecret: "Secret",
    mfaConfirm: "Confirm code",
    mfaDisable: "Turn off",
    mfaPassword: "Current password",
    mfaCode: "Authenticator code",
    mfaFailed: "Could not save two-factor authentication.",
    mfaInvalid: "Invalid code.",
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
