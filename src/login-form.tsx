import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiRequestError } from "./custom-fetch";
import { portalOrigin } from "./launcher";
import { mfaTokenFromError } from "./mfa";
import { authInputClass, PasswordInput } from "./password-input";

function errorText(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 401) return t("auth.invalidCredentials");
    if (err.status === 429) return t("auth.rateLimited");
    if (err.status === 0 || err.status >= 500) return t("auth.unavailable");
    return err.message || t("auth.failed");
  }
  if (err instanceof TypeError) return t("auth.unavailable");
  return t("auth.failed");
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * The one tenant sign-in form (products and launcher): tenant, email, password, then a TOTP
 * step when the account has MFA. Errors show inline in the card.
 */
export function LoginForm({
  onLogin,
  onCompleteMfa,
  onSuccess,
  forgotPasswordHref = `${portalOrigin()}/forgot-password`,
}: {
  onLogin: (input: { tenantSlug: string; email: string; password: string }) => Promise<unknown>;
  onCompleteMfa: (input: { mfaToken: string; code: string }) => Promise<unknown>;
  onSuccess?: () => void;
  forgotPasswordHref?: string | null;
}) {
  const { t } = useTranslation();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mfaToken) await onCompleteMfa({ mfaToken, code: code.trim() });
      else await onLogin({ tenantSlug: tenantSlug.trim(), email: email.trim(), password });
      onSuccess?.();
    } catch (err) {
      const token = mfaTokenFromError(err);
      if (token) {
        setMfaToken(token);
        return;
      }
      setError(mfaToken && err instanceof ApiRequestError && err.status === 401 ? t("auth.invalidCode") : errorText(err, t));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {mfaToken ? (
        <Field id="ps-login-totp" label={t("auth.totp")}>
          <input
            id="ps-login-totp"
            className={`${authInputClass} text-center tracking-[0.4em] tabular-nums`}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={8}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
            required
          />
          <p className="text-xs text-muted-foreground">{t("auth.totpHint")}</p>
        </Field>
      ) : (
        <>
          <Field id="ps-login-tenant" label={t("auth.tenantSlug")}>
            <input
              id="ps-login-tenant"
              className={authInputClass}
              autoComplete="organization"
              autoCapitalize="none"
              spellCheck={false}
              dir="ltr"
              placeholder={t("auth.tenantPlaceholder")}
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value)}
              required
            />
          </Field>
          <Field id="ps-login-email" label={t("auth.email")}>
            <input
              id="ps-login-email"
              className={authInputClass}
              type="email"
              autoComplete="username"
              dir="ltr"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="ps-login-password" className="block text-sm font-medium text-foreground">
                {t("auth.password")}
              </label>
              {forgotPasswordHref ? (
                <a href={forgotPasswordHref} className="text-xs font-medium text-primary hover:underline">
                  {t("auth.forgotPassword")}
                </a>
              ) : null}
            </div>
            <PasswordInput
              id="ps-login-password"
              autoComplete="current-password"
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        </>
      )}

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[0.9375rem] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {mfaToken ? t("auth.verify") : t("auth.submit")}
      </button>

      {mfaToken ? (
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            setMfaToken(null);
            setCode("");
            setError(null);
          }}
        >
          {t("auth.back")}
        </button>
      ) : null}
    </form>
  );
}
