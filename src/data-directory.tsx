import type { ReactNode } from "react";
import { Columns3, LayoutGrid, Table as TableIcon } from "lucide-react";
import { cn } from "./cn";

export type DirectoryColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  defaultVisible?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: DirectoryColumn<T>[];
  visibleIds: string[];
  onVisibleIds: (ids: string[]) => void;
  view: "table" | "cards";
  onView: (view: "table" | "cards") => void;
  getRowId: (row: T) => string;
  highlighted?: (row: T) => boolean;
  actions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  empty?: ReactNode;
};

const iconBtn =
  "inline-flex size-8 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent";

export function DataDirectory<T>({
  rows,
  columns,
  visibleIds,
  onVisibleIds,
  view,
  onView,
  getRowId,
  highlighted,
  actions,
  toolbar,
  empty,
}: Props<T>) {
  const visible = columns.filter((column) => visibleIds.includes(column.id));

  const toggle = (id: string) => {
    if (visibleIds.includes(id)) {
      if (visibleIds.length === 1) return;
      onVisibleIds(visibleIds.filter((item) => item !== id));
    } else {
      onVisibleIds([...visibleIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">{toolbar}</div>
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className={cn(iconBtn, "list-none [&::-webkit-details-marker]:hidden")}>
              <Columns3 className="size-4" />
            </summary>
            <div className="absolute end-0 z-50 mt-1 min-w-[10rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              {columns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-start text-sm hover:bg-accent"
                  onClick={() => toggle(column.id)}
                >
                  <span className={cn("me-2 size-2 rounded-full", visibleIds.includes(column.id) ? "bg-primary" : "bg-muted")} />
                  {column.header}
                </button>
              ))}
            </div>
          </details>
          <button
            type="button"
            className={cn(iconBtn, view === "table" && "bg-primary text-primary-foreground hover:bg-primary/90")}
            onClick={() => onView("table")}
          >
            <TableIcon className="size-4" />
          </button>
          <button
            type="button"
            className={cn(iconBtn, view === "cards" && "bg-primary text-primary-foreground hover:bg-primary/90")}
            onClick={() => onView("cards")}
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>
      {!rows.length ? (
        empty
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <article
              key={getRowId(row)}
              className={cn("rounded-2xl border bg-card p-4 shadow-sm", highlighted?.(row) && "border-amber-400 bg-amber-50")}
            >
              <div className="mb-3 flex justify-end">{actions?.(row)}</div>
              <dl className="grid gap-2">
                {visible.map((column) => (
                  <div key={column.id}>
                    <dt className="text-xs text-muted-foreground">{column.header}</dt>
                    <dd className="text-sm font-medium">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b">
                {actions ? <th className="h-10 w-40 px-3" /> : null}
                {visible.map((column) => (
                  <th key={column.id} className="h-10 px-3 text-start align-middle font-medium text-muted-foreground">
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={getRowId(row)} className={cn("border-b", highlighted?.(row) && "bg-amber-50")}>
                  {actions ? <td className="p-3 align-middle">{actions(row)}</td> : null}
                  {visible.map((column) => (
                    <td key={column.id} className="p-3 align-middle">
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
