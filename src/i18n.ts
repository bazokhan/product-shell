import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { productShellConfig } from "./config";

export const defaultLocale = "ar";

const shellAr = {
  settings: {
    pin: "تثبيت في القائمة",
    unpin: "إزالة من المثبتة",
    pinned: "المثبتة",
    notifications: "التنبيهات",
    markAllRead: "تعليم الكل كمقروء",
    type: "النوع",
    inApp: "داخل النظام",
    email: "البريد",
    readState: "الحالة",
    unread: "غير مقروء",
    read: "مقروء",
    markRead: "تعليم كمقروء",
    markUnread: "تعليم كغير مقروء",
    delete: "حذف",
    title: "العنوان",
    details: "التفاصيل",
    date: "التاريخ",
    channels: "قنوات التنبيه",
  },
  notificationType: {
    IMPORT_FINISHED: "اكتمال الاستيراد",
    COMPLIANCE_EXPIRY: "انتهاء الوثائق",
    LEAVE_DECISION: "قرار الإجازة",
    TRIP_ASSIGNED: "إسناد رحلة",
    ANNOUNCEMENT: "إعلان",
  },
  list: {
    search: "بحث…",
    select: "تحديد",
    selectPage: "تحديد الصفحة",
    selected: "{{count}} محدد",
    clear: "إلغاء التحديد",
    bulkResult: "تم: {{ok}} · تعذر: {{failed}}",
    export: "تصدير CSV",
    template: "تنزيل القالب",
    import: "استيراد",
    importStatus: "صالح {{valid}} · غير صالح {{invalid}} · {{status}}",
    commit: "تنفيذ",
    pdf: "PDF",
    print: "طباعة",
  },
  pagination: {
    records: "{{total}} سجل · صفحة {{page}} / {{totalPages}}",
    prev: "السابق",
    next: "التالي",
  },
  auth: {
    tenantSlug: "رمز المنشأة",
    tenantPlaceholder: "مثال: baz",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    forgotPassword: "نسيت كلمة المرور؟",
    submit: "تسجيل الدخول",
    verify: "تحقّق",
    back: "رجوع",
    totp: "رمز المصادقة",
    totpHint: "أدخل الرمز المكوّن من ٦ أرقام من تطبيق المصادقة.",
    invalidCredentials: "رمز المنشأة أو البريد أو كلمة المرور غير صحيح.",
    invalidCode: "رمز المصادقة غير صحيح أو انتهت صلاحيته.",
    rateLimited: "محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.",
    unavailable: "تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مجدداً.",
    failed: "تعذر تسجيل الدخول.",
  },
  launcher: {
    title: "مقصد",
    subtitle: "دخول واحد. ثم المنتج الذي اشتراه المستأجر.",
    productsHint: "مقصد هو اللوحة الكاملة. كَادر ودَفتر ورِحال منتجات مستقلة. افتح أياً منها مباشرة، أو ادخل مرة واحدة.",
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
  settings: {
    pin: "Pin to menu",
    unpin: "Unpin",
    pinned: "Pinned",
    notifications: "Notifications",
    markAllRead: "Mark all read",
    type: "Type",
    inApp: "In app",
    email: "Email",
    readState: "State",
    unread: "Unread",
    read: "Read",
    markRead: "Mark read",
    markUnread: "Mark unread",
    delete: "Delete",
    title: "Title",
    details: "Details",
    date: "Date",
    channels: "Notification channels",
  },
  notificationType: {
    IMPORT_FINISHED: "Import finished",
    COMPLIANCE_EXPIRY: "Document expiry",
    LEAVE_DECISION: "Leave decision",
    TRIP_ASSIGNED: "Trip assigned",
    ANNOUNCEMENT: "Announcement",
  },
  list: {
    search: "Search…",
    select: "Select",
    selectPage: "Select page",
    selected: "{{count}} selected",
    clear: "Clear selection",
    bulkResult: "Done: {{ok}} · Failed: {{failed}}",
    export: "Export CSV",
    template: "Download template",
    import: "Import",
    importStatus: "Valid {{valid}} · Invalid {{invalid}} · {{status}}",
    commit: "Commit",
    pdf: "PDF",
    print: "Print",
  },
  pagination: {
    records: "{{total}} records · page {{page}} / {{totalPages}}",
    prev: "Prev",
    next: "Next",
  },
  auth: {
    tenantSlug: "Organization code",
    tenantPlaceholder: "e.g. baz",
    email: "Email",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    forgotPassword: "Forgot password?",
    submit: "Sign in",
    verify: "Verify",
    back: "Back",
    totp: "Authenticator code",
    totpHint: "Enter the 6-digit code from your authenticator app.",
    invalidCredentials: "The organization code, email, or password is incorrect.",
    invalidCode: "The authenticator code is wrong or expired.",
    rateLimited: "Too many attempts. Wait a minute and try again.",
    unavailable: "Can't reach the server. Check your connection and try again.",
    failed: "Could not sign in.",
  },
  launcher: {
    title: "Maqsid",
    subtitle: "One sign-in. Then the products this tenant bought.",
    productsHint: "Maqsid is the whole dashboard. Kader, Daftar, and Rihal are separate products. Open any of them directly, or sign in once.",
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
