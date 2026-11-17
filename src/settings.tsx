import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Pin, PinOff } from "lucide-react";
import { api, customFetch } from "./custom-fetch";
import { cn } from "./cn";
import { ListPage } from "./list-page";

/**
 * Settings in every portal (D-2026-11-17-01): one fetch of `/settings/effective`, branding applied
 * to CSS variables and the title, personal preferences saved through `/auth/me/preferences/:key`.
 * Mounted by AppGate, so every tenant app gets it without wiring.
 */

export type Branding = {
  displayName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  documentFooter: string | null;
  locale: string;
  timezone: string;
};
export type NavPinItem = { app: "hr" | "accounting" | "rihal" | "platform"; href: string; label: string };
type Values = Record<string, Record<string, unknown>>;

type SettingsValue = {
  values: Values;
  branding: Branding | null;
  pins: NavPinItem[];
  savePreference: (key: string, value: Record<string, unknown>) => Promise<void>;
  reload: () => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

// Apps read --brand-primary in their theme (Tailwind @theme inline); رِحال maps --primary.
const COLOR_VARS = ["--brand-primary", "--primary", "--ring"];

export function applyBranding(branding: Branding | null, productName?: string) {
  const root = document.documentElement;
  for (const v of COLOR_VARS) {
    if (branding?.primaryColor) root.style.setProperty(v, branding.primaryColor);
    else root.style.removeProperty(v);
  }
  const base = productName ?? document.title.split(" · ")[0];
  if (branding?.displayName) document.title = `${base} · ${branding.displayName}`;
}

export function SettingsProvider({ children, productName }: { children: ReactNode; productName?: string }) {
  const [state, setState] = useState<{ values: Values; branding: Branding | null }>({ values: {}, branding: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .get<{ values: Values; branding: Branding }>("/settings/effective")
      .then((res) => {
        if (!alive) return;
        setState(res);
        applyBranding(res.branding, productName);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [tick, productName]);

  const savePreference = useCallback(async (key: string, value: Record<string, unknown>) => {
    setState((s) => ({ ...s, values: { ...s.values, [key]: value } }));
    await customFetch(`/auth/me/preferences/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({
      ...state,
      pins: ((state.values["nav.pins"]?.items as NavPinItem[] | undefined) ?? []),
      savePreference,
      reload: () => setTick((n) => n + 1),
    }),
    [state, savePreference],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

const FALLBACK: SettingsValue = { values: {}, branding: null, pins: [], savePreference: async () => undefined, reload: () => undefined };

export function useSettings(): SettingsValue {
  return useContext(SettingsContext) ?? FALLBACK;
}

/** Pins of one app, for the sidebar's "Pinned" section. */
export function usePins(app: NavPinItem["app"]) {
  const { pins, savePreference } = useSettings();
  const mine = pins.filter((p) => p.app === app);
  const isPinned = (href: string) => mine.some((p) => p.href === href);
  const toggle = (item: Omit<NavPinItem, "app">) =>
    savePreference("nav.pins", {
      items: isPinned(item.href) ? pins.filter((p) => !(p.app === app && p.href === item.href)) : [...pins, { app, ...item }].slice(-30),
    });
  return { pins: mine, isPinned, toggle };
}

const ICON_BTN = "inline-flex size-8 items-center justify-center rounded-md hover:bg-accent";

/** Pin/unpin the current page. Put it in each page header (PageHeader actions). */
export function PinButton({ app, href, label }: { app: NavPinItem["app"]; href: string; label: string }) {
  const { t } = useTranslation();
  const { isPinned, toggle } = usePins(app);
  const pinned = isPinned(href);
  return (
    <button type="button" className={ICON_BTN} aria-pressed={pinned} title={t(pinned ? "settings.unpin" : "settings.pin")} onClick={() => void toggle({ href, label })}>
      {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
    </button>
  );
}

type NotificationRow = { id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

/** Header bell: unread badge, latest ten, mark read. */
export function NotificationBell({ onNavigate }: { onNavigate?: (link: string) => void }) {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);

  const refresh = useCallback(() => {
    api.get<{ count: number }>("/notifications/unread-count").then((r) => setCount(r.count)).catch(() => undefined);
  }, []);
  useEffect(() => {
    refresh();
    // ponytail: 60 s poll; switch to SSE if notifications need to be instant.
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => {
    if (!open) return;
    api.get<{ data: NotificationRow[] }>("/notifications", { pageSize: 10, sort: "createdAt:desc" }).then((r) => setRows(r.data)).catch(() => undefined);
  }, [open]);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    await api.post("/notifications/bulk", { action: "read", ids }).catch(() => undefined);
    setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, readAt: new Date().toISOString() } : r)));
    refresh();
  };

  return (
    <div className="relative">
      <button type="button" className={cn(ICON_BTN, "relative")} aria-label={t("settings.notifications")} onClick={() => setOpen((o) => !o)}>
        <Bell className="size-4" />
        {count > 0 ? (
          <span className="absolute -top-1 -end-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-white">{count > 99 ? "99+" : count}</span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute end-0 z-50 mt-1 w-80 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            {t("settings.notifications")}
            <button type="button" className="text-xs text-primary" onClick={() => void markRead(rows.filter((r) => !r.readAt).map((r) => r.id))}>
              {t("settings.markAllRead")}
            </button>
          </div>
          {rows.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{t("app.noData")}</p> : null}
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={cn("w-full rounded-sm p-2 text-start text-sm hover:bg-accent", !r.readAt && "bg-accent/50 font-medium")}
                  onClick={() => {
                    void markRead([r.id]);
                    if (r.link && onNavigate) onNavigate(r.link);
                    else if (r.link) window.location.assign(r.link);
                  }}
                >
                  <div>{r.title}</div>
                  {r.body ? <div className="text-xs text-muted-foreground">{r.body}</div> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ponytail: mirrors the backend NotificationType enum; read it from the OpenAPI x-list/enum when the apps generate list metadata.
const NOTIFICATION_TYPES = ["IMPORT_FINISHED", "COMPLIANCE_EXPIRY", "LEAVE_DECISION", "TRIP_ASSIGNED", "ANNOUNCEMENT"] as const;

/** Per-type channel preferences (the `notifications` setting, user level). */
export function NotificationPreferences() {
  const { t } = useTranslation();
  const { values, savePreference } = useSettings();
  const current = (values.notifications ?? {}) as Record<string, { inApp?: boolean; email?: boolean }>;
  const set = (type: string, channel: "inApp" | "email", on: boolean) =>
    void savePreference("notifications", { ...current, [type]: { ...current[type], [channel]: on } });
  return (
    <table className="w-full max-w-xl text-sm">
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="py-2 text-start font-medium">{t("settings.type")}</th>
          <th className="py-2 font-medium">{t("settings.inApp")}</th>
          <th className="py-2 font-medium">{t("settings.email")}</th>
        </tr>
      </thead>
      <tbody>
        {NOTIFICATION_TYPES.map((type) => (
          <tr key={type} className="border-b">
            <td className="py-2">{t(`notificationType.${type}`)}</td>
            {(["inApp", "email"] as const).map((channel) => (
              <td key={channel} className="py-2 text-center">
                <input
                  type="checkbox"
                  aria-label={`${t(`notificationType.${type}`)} ${t(`settings.${channel}`)}`}
                  checked={current[type]?.[channel] ?? channel === "inApp"}
                  onChange={(e) => set(type, channel, e.target.checked)}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type NotificationListRow = NotificationRow & { type: string };

/** The notifications page every app routes to (`/notifications`). */
export function NotificationsPage({ onNavigate }: { onNavigate?: (link: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <ListPage<NotificationListRow>
        listId="notifications"
        path="/notifications"
        defaultSort="createdAt:desc"
        getRowId={(r) => r.id}
        highlighted={(r) => !r.readAt}
        filters={[
          { param: "type", label: t("settings.type"), options: NOTIFICATION_TYPES.map((v) => ({ value: v, label: t(`notificationType.${v}`) })) },
          { param: "unread", label: t("settings.readState"), options: [{ value: "true", label: t("settings.unread") }, { value: "false", label: t("settings.read") }] },
        ]}
        bulkActions={[
          { action: "read", label: t("settings.markRead") },
          { action: "unread", label: t("settings.markUnread") },
          { action: "delete", label: t("settings.delete"), destructive: true },
        ]}
        onRowClick={(r) => {
          if (r.link && onNavigate) onNavigate(r.link);
          else if (r.link) window.location.assign(r.link);
        }}
        columns={[
          { id: "title", header: t("settings.title"), cell: (r) => r.title },
          { id: "type", header: t("settings.type"), sortKey: "type", cell: (r) => t(`notificationType.${r.type}`) },
          { id: "body", header: t("settings.details"), cell: (r) => r.body ?? "" },
          { id: "createdAt", header: t("settings.date"), sortKey: "createdAt", cell: (r) => new Date(r.createdAt).toLocaleString() },
        ]}
      />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("settings.channels")}</h2>
        <NotificationPreferences />
      </section>
    </div>
  );
}
