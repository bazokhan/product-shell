import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "./cn";
import { api } from "./custom-fetch";

/**
 * The header's branch filter (one per app). It starts on "all branches": the API already limits a
 * branch-restricted user to tenant-wide records plus their branches, and picking branch X shows X plus
 * tenant-wide records. See the backend's "Branch scope" rules.
 */
type BranchContextValue = {
  branchId: string | undefined;
  setBranchId: (id: string | undefined) => void;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const value = useMemo(() => ({ branchId, setBranchId }), [branchId]);
  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}

/** Spread into list queries: `{ branchId }` only when a branch is picked. */
export function useBranchQuery(): { branchId?: string } {
  const { branchId } = useBranch();
  return branchId ? { branchId } : {};
}

/**
 * Header branch picker. Lists the tenant's branches (needs branch read access; otherwise only
 * "all branches" shows) and drives `useBranch` / `useBranchQuery`.
 */
export function BranchSelect({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { branchId, setBranchId } = useBranch();
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let alive = true;
    api
      .get<{ data: Array<{ id: string; name: string }> }>("/branches", { pageSize: 100 })
      .then((res) => alive && setBranches(res?.data ?? []))
      .catch(() => alive && setBranches([]));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <select
      aria-label={t("app.allBranches")}
      value={branchId ?? ""}
      onChange={(event) => setBranchId(event.target.value || undefined)}
      className={cn(
        "h-8 w-[180px] rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40",
        className,
      )}
    >
      <option value="">{t("app.allBranches")}</option>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </select>
  );
}
