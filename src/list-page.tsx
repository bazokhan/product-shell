import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Download, FileDown, Printer, Upload } from "lucide-react";
import { api, customFetch, downloadFile, postForm } from "./custom-fetch";
import { DataDirectory, type DirectoryColumn } from "./data-directory";
import { PaginationBar } from "./pagination-bar";
import { EmptyState, LoadingState } from "./screens";
import { cn } from "./cn";

/**
 * The one list page (D-2026-11-17-01, 11-hard-rules §7). Every table in every app renders through
 * ListPage: server paging, `q`, `sort`, closed-value filters, URL state, saved columns
 * (`table.<listId>` preference), bulk actions, CSV export and import.
 */

export type Page<T> = { data: T[]; pagination: { page: number; pageSize: number; total: number } };

export type ListColumn<T> = DirectoryColumn<T> & {
  /** Field name from the list's `x-list.sortable`; makes the header clickable. */
  sortKey?: string;
};

export type ListFilter = {
  /** Query param name, e.g. `status`. */
  param: string;
  label: string;
  /** Closed values (the enum in the API reference). */
  options: { value: string; label: string }[];
};

export type BulkAction = { action: string; label: string; destructive?: boolean; confirm?: string };

/** One list's `x-list` metadata plus its closed-value filters, generated from OpenAPI (scripts/list-meta.mjs). */
export type ListMeta = {
  id: string;
  sortable: readonly string[];
  defaultSort: string;
  searchable: readonly string[];
  capabilities?: { export?: boolean; import?: string; bulk?: readonly string[] };
  filters: { param: string; values: readonly string[] }[];
};
export type ListMetaMap = Record<string, ListMeta>;

let listMeta: ListMetaMap = {};
/** Each app registers its generated LIST_META once (configure-shell). */
export function configureListMeta(meta: ListMetaMap) {
  listMeta = meta;
}

/** Metadata for an API path; `/vehicles/123/handovers` matches `/vehicles/{vehicleId}/handovers`. */
export function listMetaFor(path: string): ListMeta | undefined {
  const clean = path.split("?")[0];
  if (listMeta[clean]) return listMeta[clean];
  for (const [template, meta] of Object.entries(listMeta)) {
    const re = new RegExp("^" + template.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\\{[^}]+\\\}|\{[^}]+\}/g, "[^/]+") + "$");
    if (re.test(clean)) return meta;
  }
  return undefined;
}
type BulkResult = { succeeded: string[]; failed: { id: string; code: string; message: string }[] };

type Query = { page: number; pageSize: number; q: string; sort: string; filters: Record<string, string> };

const CONTROL = "h-9 rounded-md border border-input bg-background px-3 text-sm";
const BUTTON =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50";

function readUrl(defaultSort: string, filterParams: string[]): Query {
  const p = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  return {
    page: Math.max(1, Number(p.get("page")) || 1),
    pageSize: Math.min(100, Math.max(10, Number(p.get("pageSize")) || 25)),
    q: p.get("q") ?? "",
    sort: p.get("sort") ?? defaultSort,
    filters: Object.fromEntries(filterParams.map((f) => [f, p.get(f) ?? ""]).filter(([, v]) => v)),
  };
}

function writeUrl(query: Query, defaultSort: string, filterParams: string[]) {
  const p = new URLSearchParams(window.location.search);
  const set = (k: string, v: string | number | undefined, skip?: string | number) =>
    v === undefined || v === "" || v === skip ? p.delete(k) : p.set(k, String(v));
  set("page", query.page, 1);
  set("pageSize", query.pageSize, 25);
  set("q", query.q);
  set("sort", query.sort, defaultSort);
  for (const f of filterParams) set(f, query.filters[f]);
  const qs = p.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
}

/** Query string for the API: the list contract params plus fixed `extra` params (e.g. branchId). */
export function listParams(query: Query, extra: Record<string, string | number | boolean | undefined> = {}) {
  return { page: query.page, pageSize: query.pageSize, q: query.q || undefined, sort: query.sort, ...query.filters, ...extra };
}

function toSearch(params: Record<string, unknown>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  return p.toString();
}

/** Per-user saved layout for one list (`table.<listId>`), shared across devices. */
export function useTablePreference(listId: string, defaults: { columns: string[]; view?: "table" | "cards" }) {
  const key = `table.${listId}`;
  const [value, setValue] = useState<{ columns: string[]; view: "table" | "cards"; pageSize?: number }>({
    columns: defaults.columns,
    view: defaults.view ?? "table",
  });
  useEffect(() => {
    let alive = true;
    api
      .get<{ key: string; value: { columns?: string[]; view?: "table" | "cards"; pageSize?: number } } | null>(`/auth/me/preferences/${key}`)
      .then((saved) => {
        if (alive && saved?.value) setValue((v) => ({ ...v, ...saved.value, columns: saved.value.columns?.length ? saved.value.columns : v.columns }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key]);
  const save = useCallback(
    (next: Partial<typeof value>) =>
      setValue((v) => {
        const merged = { ...v, ...next };
        void customFetch(`/auth/me/preferences/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: merged }),
        }).catch(() => undefined);
        return merged;
      }),
    [key],
  );
  return [value, save] as const;
}

export type ListPageProps<T> = {
  /** API path of the list, e.g. `/notifications`. Its generated ListMeta supplies id, sort, filters and capabilities. */
  path: string;
  /** Complete rows already loaded by an owning detail/report. No second request, pagination, bulk or CSV contract is invented. Use path for server lists. */
  rows?: T[];
  /** Overrides; normally taken from the list's metadata. */
  listId?: string;
  defaultSort?: string;
  columns: ListColumn<T>[];
  getRowId: (row: T) => string;
  filters?: ListFilter[];
  /** Fixed params added to every call (branchId, parent id). */
  params?: Record<string, string | number | boolean | undefined>;
  bulkActions?: BulkAction[];
  /** `x-list.capabilities.export`; default true. */
  exportable?: boolean;
  /** `x-list.capabilities.import` (ImportType). */
  importType?: string;
  actions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  highlighted?: (row: T) => boolean;
  /** Bump to refetch after a mutation elsewhere on the page. */
  reloadKey?: unknown;
};

export function ListPage<T>(props: ListPageProps<T>) {
  const { t } = useTranslation();
  if (props.rows) return <EmbeddedListRows {...props} rows={props.rows} />;
  const meta = listMetaFor(props.path);
  const listId = props.listId ?? meta?.id ?? props.path.replace(/^\//, "").replace(/\//g, ".");
  const defaultSort = props.defaultSort ?? meta?.defaultSort ?? "";
  const sortable = new Set(meta?.sortable ?? []);
  const columns = props.columns.map((c) => (c.sortKey || !sortable.has(c.id) ? c : { ...c, sortKey: c.id }));
  const filters =
    props.filters ??
    (meta?.filters ?? []).map((f) => ({
      param: f.param,
      label: t(`filter.${f.param}`, { defaultValue: f.param }),
      options: f.values.map((v) => ({ value: v, label: t(`enum.${v}`, { defaultValue: v }) })),
    }));
  const bulkActions = props.bulkActions ?? (meta?.capabilities?.bulk ?? []).map((a) => ({ action: a, label: t(`bulk.${a}`, { defaultValue: a }), destructive: a === "delete" }));
  const exportable = props.exportable ?? meta?.capabilities?.export ?? true;
  const importType = props.importType ?? meta?.capabilities?.import;
  return (
    <ListPageInner
      {...props}
      listId={listId}
      defaultSort={defaultSort}
      columns={columns}
      filters={filters}
      bulkActions={bulkActions}
      exportable={exportable}
      importType={importType}
    />
  );
}

/** The same directory renderer for complete nested arrays. Controls do not overwrite the owning page URL. */
function EmbeddedListRows<T>({ rows, columns, getRowId, listId, path, actions, highlighted, toolbar }: ListPageProps<T> & {rows:T[]}) {
  const [layout,saveLayout]=useTablePreference(listId ?? path, {columns:columns.filter(c=>c.defaultVisible!==false).map(c=>c.id)});
  return <DataDirectory rows={rows} columns={columns} visibleIds={layout.columns} onVisibleIds={ids=>saveLayout({columns:ids})} view={layout.view} onView={view=>saveLayout({view})} getRowId={getRowId} actions={actions} highlighted={highlighted} toolbar={toolbar} empty={<EmptyState />} />;
}

function ListPageInner<T>({
  listId,
  path,
  defaultSort,
  columns,
  getRowId,
  filters = [],
  params,
  bulkActions = [],
  exportable = true,
  importType,
  actions,
  onRowClick,
  toolbar,
  highlighted,
  reloadKey,
}: ListPageProps<T> & { listId: string; defaultSort: string }) {
  const { t } = useTranslation();
  const filterParams = useMemo(() => filters.map((f) => f.param), [filters]);
  const [query, setQuery] = useState<Query>(() => readUrl(defaultSort, filterParams));
  const [search, setSearch] = useState(query.q);
  const [result, setResult] = useState<Page<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkLock = useRef(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [layout, saveLayout] = useTablePreference(listId, {
    columns: columns.filter((c) => c.defaultVisible !== false).map((c) => c.id),
  });
  const extra = JSON.stringify(params ?? {});

  const update = (patch: Partial<Query>) =>
    setQuery((q) => {
      const next = { ...q, ...patch, page: patch.page ?? 1 };
      writeUrl(next, defaultSort, filterParams);
      return next;
    });

  useEffect(() => {
    const id = setTimeout(() => search !== query.q && update({ q: search }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .get<Page<T>>(path, listParams(query, JSON.parse(extra) as Record<string, string>))
      .then((page) => alive && setResult(page))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [path, query, extra, tick, reloadKey]);

  const sortState = (key?: string) => {
    if (!key) return undefined;
    const [field, dir] = query.sort.split(",")[0].split(":");
    return field === key ? (dir === "desc" ? "desc" : "asc") : undefined;
  };
  const toggleSort = (key: string) => update({ sort: `${key}:${sortState(key) === "asc" ? "desc" : "asc"}` });

  const selectable = bulkActions.length > 0;
  const rows = result?.data ?? [];
  const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(getRowId(r)));
  const toggleRow = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const directoryColumns: DirectoryColumn<T>[] = [
    ...(selectable
      ? [
          {
            id: "__select",
            header: "",
            cell: (row: T) => (
              <input type="checkbox" disabled={bulkBusy} aria-label={t("list.select")} checked={selected.includes(getRowId(row))} onChange={() => toggleRow(getRowId(row))} />
            ),
          },
        ]
      : []),
    ...columns.map((c) => ({
      ...c,
      header: c.sortKey ? (
        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(c.sortKey!)}>
          {c.header}
          {sortState(c.sortKey) === "asc" ? <ArrowUp className="size-3" /> : sortState(c.sortKey) === "desc" ? <ArrowDown className="size-3" /> : null}
        </button>
      ) : (
        c.header
      ),
      cell: onRowClick ? (row: T) => <span className="cursor-pointer" onClick={() => onRowClick(row)}>{c.cell(row)}</span> : c.cell,
    })),
  ];

  const runBulk = async (action: string) => {
    if (bulkLock.current || selected.length === 0) return;
    const config = bulkActions.find((item) => item.action === action);
    if (config?.confirm && !window.confirm(config.confirm.replace('{{count}}', String(selected.length)))) return;
    bulkLock.current = true;
    setBulkBusy(true);
    setBulkError(null);
    setBulkResult(null);
    try {
      const res = await api.post<BulkResult>(`${path}/bulk`, { action, ids: selected });
      setBulkResult(res);
      setSelected(res.failed.map((f) => f.id));
      setTick((n) => n + 1);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : String(e));
    } finally {
      bulkLock.current = false;
      setBulkBusy(false);
    }
  };

  const exportCsv = () =>
    downloadFile(`${path}?${toSearch({ ...listParams(query, JSON.parse(extra) as Record<string, string>), page: undefined, pageSize: undefined, format: "csv" })}`, `${listId}.csv`);

  return (
    <div className="space-y-3">
      <DataDirectory
        rows={rows}
        columns={directoryColumns}
        visibleIds={[...(selectable ? ["__select"] : []), ...layout.columns]}
        onVisibleIds={(ids) => saveLayout({ columns: ids.filter((id) => id !== "__select") })}
        view={layout.view}
        onView={(view) => saveLayout({ view })}
        getRowId={getRowId}
        highlighted={highlighted}
        actions={actions}
        empty={error ? <EmptyState message={error} /> : result ? <EmptyState /> : <LoadingState />}
        toolbar={
          <>
            <input className={cn(CONTROL, "w-56")} type="search" placeholder={t("list.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            {filters.map((f) => (
              <select key={f.param} aria-label={f.label} className={CONTROL} value={query.filters[f.param] ?? ""} onChange={(e) => update({ filters: { ...query.filters, [f.param]: e.target.value } })}>
                <option value="">{f.label}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ))}
            {selectable ? (
              <label className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" disabled={bulkBusy} checked={allOnPage} onChange={() => setSelected(allOnPage ? [] : rows.map(getRowId))} />
                {t("list.selectPage")}
              </label>
            ) : null}
            {toolbar}
            {exportable ? (
              <button type="button" className={BUTTON} onClick={() => void exportCsv()}>
                <Download className="size-4" />
                {t("list.export")}
              </button>
            ) : null}
            {importType ? <ImportButton type={importType} onDone={() => setTick((n) => n + 1)} /> : null}
          </>
        }
      />
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
          <span>{t("list.selected", { count: selected.length })}</span>
          {bulkActions.map((b) => (
            <button key={b.action} type="button" disabled={bulkBusy} className={cn(BUTTON, b.destructive && "text-destructive")} onClick={() => void runBulk(b.action)}>
              {b.label}
            </button>
          ))}
          <button type="button" className={BUTTON} disabled={bulkBusy} onClick={() => setSelected([])}>
            {t("list.clear")}
          </button>
        </div>
      ) : null}
      {bulkError ? <p role="alert" className="text-sm text-destructive">{bulkError}</p> : null}
      {bulkResult ? (
        <div className="text-sm text-muted-foreground" role="status">
          <p>{t("list.bulkResult", { ok: bulkResult.succeeded.length, failed: bulkResult.failed.length })}</p>
          {bulkResult.failed.length ? <ul>{bulkResult.failed.map((f) => <li key={f.id}><bdi>{f.id}</bdi>: {f.code} · {f.message}</li>)}</ul> : null}
        </div>
      ) : null}
      {result ? (
        <PaginationBar page={result.pagination.page} pageSize={result.pagination.pageSize} total={result.pagination.total} onPageChange={(page) => update({ page })} />
      ) : null}
    </div>
  );
}

type ImportJob = { id: string; status: string; validRows?: number; invalidRows?: number };

/** Template first, then dry-run upload, then commit — the one import flow. */
export function ImportButton({ type, onDone }: { type: string; onDone?: () => void }) {
  const { t } = useTranslation();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => {
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      setJob(await postForm<ImportJob>(`/imports/${type}/upload`, form));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const commit = async () => {
    if (!job) return;
    try {
      setJob(await api.post<ImportJob>(`/imports/${job.id}/commit`));
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={BUTTON} onClick={() => void downloadFile(`/imports/templates/${type}?format=csv`, `${type.toLowerCase()}-template.csv`)}>
        <FileDown className="size-4" />
        {t("list.template")}
      </button>
      <button type="button" className={BUTTON} onClick={() => input.current?.click()}>
        <Upload className="size-4" />
        {t("list.import")}
      </button>
      <input ref={input} type="file" accept=".csv,.tsv,.xlsx" hidden onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
      {job ? (
        <span className="text-sm" role="status">
          {t("list.importStatus", { valid: job.validRows ?? 0, invalid: job.invalidRows ?? 0, status: job.status })}
          {job.status !== "COMPLETED" && !job.invalidRows ? (
            <button type="button" className={cn(BUTTON, "ms-2")} onClick={() => void commit()}>
              {t("list.commit")}
            </button>
          ) : null}
        </span>
      ) : null}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </span>
  );
}

/** Detail-page actions: server PDF (`<path>/pdf`) and print. Every detail page renders this. */
export function DetailActions({ pdfPath, fileName, children, disabled=false }: { pdfPath: string; fileName: string; children?: ReactNode; disabled?:boolean }) {
  const { t } = useTranslation();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const pdf=async()=>{setBusy(true);setError('');try{await downloadFile(pdfPath, `${fileName}.pdf`);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
  return (
    <div className="space-y-2 print:hidden">
     <div className="flex flex-wrap items-center gap-2">
      {children}
      <button type="button" disabled={disabled||busy} className={BUTTON} onClick={() => void pdf()}>
        <FileDown className="size-4" />
        {t("list.pdf")}
      </button>
      <button type="button" disabled={disabled||busy} className={BUTTON} onClick={() => window.print()}>
        <Printer className="size-4" />
        {t("list.print")}
      </button>
     </div>
     {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
