import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiRequestError } from "./custom-fetch";
import {
  completeTenantLogin,
  launchKind,
  launchTargets,
  withHandoff,
  type LaunchTarget,
} from "./launcher";
import { clearSession, loadSession } from "./session";

const fieldClass = "flex h-9 w-full rounded-md border px-3 text-sm";
const btnClass =
  "inline-flex h-9 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm text-white disabled:opacity-50";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sessionTick, setSessionTick] = useState(0);

  const session = useMemo(() => loadSession(), [sessionTick]);
  const targets = launchTargets(session?.enabledModules);
  const kind = launchKind(targets);

  useEffect(() => {
    if (!session) return;
    const next = launchTargets(session.enabledModules);
    if (launchKind(next) !== "one" || !next[0]) return;
    openUrl(withHandoff(next[0].origin, session));
  }, [openUrl, session]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const next = await completeTenantLogin({ tenantSlug, email, password });
      const nextTargets = launchTargets(next.enabledModules);
      if (launchKind(nextTargets) === "one") {
        openUrl(withHandoff(nextTargets[0]!.origin, next));
        return;
      }
      setSessionTick((value) => value + 1);
    } catch (err) {
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
          <ul className="grid gap-3">
            {targets.map((target) => (
              <li key={target.module}>
                <a
                  href={withHandoff(target.origin, session)}
                  className="flex items-center gap-3 rounded-xl border p-4 hover:bg-slate-50"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
                    {target.mark}
                  </span>
                  <span className="text-lg font-semibold">{arabic ? target.nameAr : target.nameEn}</span>
                </a>
              </li>
            ))}
          </ul>
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

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-sm space-y-4 rounded-xl border bg-white p-6">
        <div>
          <h1 className="text-2xl font-bold">{t("launcher.title")}</h1>
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
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={pending} className={btnClass}>
          {t("launcher.submit")}
        </button>
      </form>
    </div>
  );
}
