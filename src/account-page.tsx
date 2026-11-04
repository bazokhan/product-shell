import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiRequestError } from "./custom-fetch";
import { i18n, setStoredLocale } from "./i18n";
import { PageHeader } from "./screens";
import { submitChangePassword } from "./account";

const fieldClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const btnClass =
  "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const ghostClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent";

export function AccountPage() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(false);
    setPending(true);
    try {
      const result = await submitChangePassword(currentPassword, newPassword, confirm);
      if (!result.ok) {
        setError(result.issue === "short" ? t("account.passwordTooShort") : t("account.passwordMismatch"));
        return;
      }
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      const code = err instanceof ApiRequestError ? err.body?.error?.code : undefined;
      setError(code === "UNAUTHORIZED" ? t("account.currentInvalid") : t("account.failed"));
    } finally {
      setPending(false);
    }
  }

  function setLang(locale: string) {
    void i18n.changeLanguage(locale);
    setStoredLocale(locale);
  }

  return (
    <div className="max-w-lg space-y-8">
      <PageHeader title={t("account.title")} description={t("account.subtitle")} />
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
        <h2 className="text-lg font-semibold">{t("account.passwordTitle")}</h2>
        <label className="block space-y-1 text-sm">
          <span>{t("account.currentPassword")}</span>
          <input
            className={fieldClass}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("account.newPassword")}</span>
          <input
            className={fieldClass}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={12}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("account.confirmPassword")}</span>
          <input
            className={fieldClass}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            minLength={12}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {done ? <p className="text-sm text-muted-foreground">{t("account.changed")}</p> : null}
        <button type="submit" className={btnClass} disabled={pending}>
          {pending ? t("account.saving") : t("account.savePassword")}
        </button>
      </form>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("account.language")}</h2>
        <div className="flex gap-2">
          <button type="button" className={ghostClass} onClick={() => setLang("ar")}>
            العربية
          </button>
          <button type="button" className={ghostClass} onClick={() => setLang("en")}>
            English
          </button>
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("account.mfaTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("account.mfaSoon")}</p>
      </section>
    </div>
  );
}
