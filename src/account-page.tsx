import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiRequestError } from "./custom-fetch";
import { i18n, setStoredLocale } from "./i18n";
import { PageHeader } from "./screens";
import { submitChangePassword } from "./account";
import { disableMfa, enableMfa, fetchMfaStatus, setupMfa } from "./mfa";

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
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaPassword, setMfaPassword] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaPending, setMfaPending] = useState(false);

  useEffect(() => {
    void fetchMfaStatus()
      .then((status) => setMfaEnabled(status.enabled))
      .catch(() => undefined);
  }, []);

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

  async function startMfa() {
    setMfaError(null);
    setMfaPending(true);
    try {
      const setup = await setupMfa();
      setMfaSecret(setup.secret);
      setMfaQr(setup.qrDataUrl);
    } catch {
      setMfaError(t("account.mfaFailed"));
    } finally {
      setMfaPending(false);
    }
  }

  async function confirmMfa(event: FormEvent) {
    event.preventDefault();
    setMfaError(null);
    setMfaPending(true);
    try {
      await enableMfa(mfaCode);
      setMfaEnabled(true);
      setMfaSecret(null);
      setMfaQr(null);
      setMfaCode("");
    } catch (err) {
      setMfaError(err instanceof ApiRequestError ? t("account.mfaInvalid") : t("account.mfaFailed"));
    } finally {
      setMfaPending(false);
    }
  }

  async function turnOffMfa(event: FormEvent) {
    event.preventDefault();
    setMfaError(null);
    setMfaPending(true);
    try {
      await disableMfa(mfaPassword, mfaCode);
      setMfaEnabled(false);
      setMfaPassword("");
      setMfaCode("");
    } catch (err) {
      setMfaError(err instanceof ApiRequestError ? t("account.mfaInvalid") : t("account.mfaFailed"));
    } finally {
      setMfaPending(false);
    }
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
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("account.mfaTitle")}</h2>
        <p className="text-sm text-muted-foreground">{mfaEnabled ? t("account.mfaOn") : t("account.mfaOff")}</p>
        {mfaError ? <p className="text-sm text-destructive">{mfaError}</p> : null}
        {!mfaEnabled && !mfaSecret ? (
          <button type="button" className={btnClass} disabled={mfaPending} onClick={() => void startMfa()}>
            {t("account.mfaStart")}
          </button>
        ) : null}
        {mfaSecret ? (
          <form onSubmit={(event) => void confirmMfa(event)} className="space-y-3">
            {mfaQr ? <img src={mfaQr} alt="" className="size-40 rounded-md border bg-white" /> : null}
            <p className="break-all font-mono text-xs">{t("account.mfaSecret")}: {mfaSecret}</p>
            <label className="block space-y-1 text-sm">
              <span>{t("account.mfaCode")}</span>
              <input
                className={fieldClass}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                required
              />
            </label>
            <button type="submit" className={btnClass} disabled={mfaPending}>
              {t("account.mfaConfirm")}
            </button>
          </form>
        ) : null}
        {mfaEnabled ? (
          <form onSubmit={(event) => void turnOffMfa(event)} className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>{t("account.mfaPassword")}</span>
              <input
                className={fieldClass}
                type="password"
                value={mfaPassword}
                onChange={(event) => setMfaPassword(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t("account.mfaCode")}</span>
              <input
                className={fieldClass}
                inputMode="numeric"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                required
              />
            </label>
            <button type="submit" className={ghostClass} disabled={mfaPending}>
              {t("account.mfaDisable")}
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
