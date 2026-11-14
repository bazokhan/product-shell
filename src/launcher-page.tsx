import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiRequestError } from "./custom-fetch";
import {
  catalogTargets,
  completeTenantLogin,
  completeTenantLoginWithMfa,
  launchKind,
  launchTargets,
  withHandoff,
  type LaunchTarget,
} from "./launcher";
import { MfaRequiredError } from "./mfa";
import { clearSession, loadSession } from "./session";

const fieldClass = "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";
const btnClass =
  "inline-flex h-9 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm text-white disabled:opacity-50";

function ProductCards({
  targets,
  arabic,
  hrefFor,
}: {
  targets: readonly LaunchTarget[];
  arabic: boolean;
  hrefFor: (target: LaunchTarget) => string;
}) {
  return (
    <ul className="grid gap-3">
      {targets.map((target) => (
        <li key={target.module}>
          <a
            href={hrefFor(target)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 hover:bg-slate-50"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
              {target.mark}
            </span>
            <span className="text-lg font-semibold">{arabic ? target.nameAr : target.nameEn}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function LauncherPage({
  openUrl = (href) => {
    window.location.replace(href);
  },
}: {
  openUrl?: (href: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const arabic = i18n.language === "ar";
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sessionTick, setSessionTick] = useState(0);

  const session = useMemo(() => loadSession(), [sessionTick]);
  const targets = launchTargets(session?.enabledModules);
  const kind = launchKind(targets);

  useEffect(() => {
    if (!session) return;
    const next = launchTargets(session.enabledModules);
    const only = next[0];
    if (launchKind(next) !== "one" || !only) return;
    openUrl(only.handoff ? withHandoff(only.origin, session) : only.origin);
  }, [openUrl, session]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const next = mfaToken
        ? await completeTenantLoginWithMfa({ mfaToken, code: totp })
        : await completeTenantLogin({ tenantSlug, email, password });
      const nextTargets = launchTargets(next.enabledModules);
      const only = nextTargets[0];
      if (launchKind(nextTargets) === "one" && only) {
        openUrl(only.handoff ? withHandoff(only.origin, next) : only.origin);
        return;
      }
      setSessionTick((value) => value + 1);
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        setMfaToken(err.mfaToken);
        setError(null);
        return;
      }
      setError(err instanceof ApiRequestError ? err.message : t("launcher.failed"));
    } finally {
      setPending(false);
    }
  }

  if (session && kind === "one") {
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-sm text-slate-500">{t("launcher.redirecting")}</div>
    );
  }

  if (session && kind === "many") {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{t("launcher.choose")}</h1>
            <p className="text-sm text-slate-500">{t("launcher.subtitle")}</p>
          </div>
          <ProductCards
            targets={targets}
            arabic={arabic}
            hrefFor={(target) => (target.handoff ? withHandoff(target.origin, session) : target.origin)}
          />
          <button
            type="button"
            className="text-sm text-slate-500 underline"
            onClick={() => {
              clearSession();
              setSessionTick((value) => value + 1);
            }}
          >
            {t("launcher.logout")}
          </button>
        </div>
      </div>
    );
  }

  const catalog = catalogTargets();

  return (
    <div className="min-h-dvh bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto grid w-full max-w-5xl items-start gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{t("launcher.title")}</h1>
            <p className="mt-2 text-sm text-slate-600">{t("launcher.productsHint")}</p>
          </div>
          <ProductCards targets={catalog} arabic={arabic} hrefFor={(target) => target.origin} />
        </section>
        <form onSubmit={(event) => void onSubmit(event)} className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-900">
        <div>
          <h2 className="text-2xl font-bold">{t("launcher.submit")}</h2>
          <p className="text-sm text-slate-500">{t("launcher.subtitle")}</p>
        </div>
        <label className="block space-y-1 text-sm">
          <span>{t("launcher.tenantSlug")}</span>
          <input
            className={fieldClass}
            autoComplete="organization"
            value={tenantSlug}
            onChange={(event) => setTenantSlug(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("launcher.email")}</span>
          <input
            className={fieldClass}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("launcher.password")}</span>
          <input
            className={fieldClass}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {kind === "none" && session ? <p className="text-sm text-slate-500">{t("launcher.none")}</p> : null}
        {mfaToken ? (
          <label className="block space-y-1 text-sm">
            <span>{t("launcher.totp")}</span>
            <input
              className={fieldClass}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totp}
              onChange={(event) => setTotp(event.target.value)}
              required
            />
            <span className="text-slate-500">{t("launcher.totpHint")}</span>
          </label>
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={pending} className={btnClass}>
          {t("launcher.submit")}
        </button>
        </form>
      </div>
    </div>
  );
}
