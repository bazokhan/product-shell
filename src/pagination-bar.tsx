import { useTranslation } from "react-i18next";

export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

const btn =
  "inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs hover:bg-accent disabled:pointer-events-none disabled:opacity-50";

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const totalPages = pageCount(total, pageSize);
  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-sm text-muted-foreground">
        {t("pagination.records", { total, page, totalPages })}
      </span>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {t("pagination.prev")}
        </button>
        <button type="button" className={btn} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t("pagination.next")}
        </button>
      </div>
    </div>
  );
}
