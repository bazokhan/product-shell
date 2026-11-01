import i18n from "i18next";

export function formatMoney(amount: number, currency = "SAR"): string {
  const locale = i18n.language === "ar" ? "ar-SA" : "en-SA";
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

export function formatDate(value: string | Date): string {
  const locale = i18n.language === "ar" ? "ar-SA" : "en-GB";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function formatDateInput(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function statusLabel(status: string): string {
  return i18n.t(`status.${status}`, { defaultValue: status });
}

export function displayName(ar?: string | null, en?: string | null): string {
  if (i18n.language === "en" && en) return en;
  return ar || en || "—";
}
