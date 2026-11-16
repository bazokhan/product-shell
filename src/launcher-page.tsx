import { useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "./auth-layout";
import { FullScreenSpinner } from "./auth-provider";
import {
  catalogTargets,
  completeTenantLogin,
  completeTenantLoginWithMfa,
  launchKind,
  launchTargets,
  withHandoff,
  type LaunchTarget,
} from "./launcher";
import { LoginForm } from "./login-form";
import { clearSession, loadSession } from "./session";

function ProductCards({
  targets,
  hrefFor,
}: {
  targets: readonly LaunchTarget[];
  hrefFor: (target: LaunchTarget) => string;
}) {
  const { i18n } = useTranslation();
  const arabic = i18n.language === "ar";
  const Arrow = arabic ? ArrowUpLeft : ArrowUpRight;
  return (
    <ul className="grid gap-2.5">
      {targets.map((target) => (
        <li key={target.module}>
          <a
            href={hrefFor(target)}
            className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card/60 p-3.5 shadow-sm backdrop-blur-xl transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
              {target.mark}
            </span>
            <span className="flex-1 font-semibold">{arabic ? target.nameAr : target.nameEn}</span>
            <Arrow className="size-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
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
  const { t } = useTranslation();
  const [sessionTick, setSessionTick] = useState(0);

  const session = useMemo(() => loadSession(), [sessionTick]);
  const targets = launchTargets(session?.enabledModules);
  const kind = launchKind(targets);
  const hrefFor = (target: LaunchTarget) => (target.handoff && session ? withHandoff(target.origin, session) : target.origin);

  useEffect(() => {
    if (!session) return;
    const only = targets[0];
    if (kind !== "one" || !only) return;
    openUrl(only.handoff ? withHandoff(only.origin, session) : only.origin);
  }, [openUrl, session, kind, targets]);

  if (session && kind === "one") return <FullScreenSpinner label={t("launcher.redirecting")} />;

  const brand = { mark: "م", productName: t("launcher.title") };

  if (session && kind === "many") {
    return (
      <AuthLayout
        {...brand}
        tagline={t("launcher.productsHint")}
        title={t("launcher.choose")}
        description={session.tenant?.name ?? t("launcher.subtitle")}
        footer={
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => {
              clearSession();
              setSessionTick((value) => value + 1);
            }}
          >
            {t("launcher.logout")}
          </button>
        }
      >
        <ProductCards targets={targets} hrefFor={hrefFor} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      {...brand}
      aside={
        <>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">{t("launcher.title")}</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{t("launcher.productsHint")}</p>
          <ProductCards targets={catalogTargets()} hrefFor={(target) => target.origin} />
        </>
      }
      title={t("auth.submit")}
      description={t("launcher.subtitle")}
    >
      <LoginForm
        onLogin={completeTenantLogin}
        onCompleteMfa={completeTenantLoginWithMfa}
        onSuccess={() => setSessionTick((value) => value + 1)}
      />
    </AuthLayout>
  );
}
