import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "./cn";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ message, children }: { message?: string; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-muted-foreground">
      <p>{message ?? t("app.noData")}</p>
      {children}
    </div>
  );
}

export function LoadingState() {
  const { t } = useTranslation();
  return <div className="py-16 text-center text-muted-foreground">{t("app.loading")}</div>;
}

export function ForbiddenScreen({ back }: { back?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">{t("forbidden.title")}</h1>
      <p className="text-muted-foreground">{t("forbidden.body")}</p>
      {back}
    </div>
  );
}

export function NoEntitlementScreen({
  mark,
  onLogout,
}: {
  mark: string;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh grid place-items-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto size-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">
          {mark}
        </div>
        <h1 className="text-2xl font-bold">{t("module.disabledTitle")}</h1>
        <p className="text-muted-foreground">{t("module.disabledBody")}</p>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
          onClick={onLogout}
        >
          {t("app.logout")}
        </button>
      </div>
    </div>
  );
}
