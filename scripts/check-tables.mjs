#!/usr/bin/env node
/**
 * Frontend gate for D-2026-11-17-01 (11-hard-rules §7), run from an app root:
 *   node vendor/product-shell/scripts/check-tables.mjs           check (CI)
 *   node vendor/product-shell/scripts/check-tables.mjs --shrink  drop fixed debt from the baseline
 *   node vendor/product-shell/scripts/check-tables.mjs --seed    create the baseline once
 *
 * Rules:
 *  - anywhere in src/: a table is the shell ListPage — no raw <table>, shadcn <Table>, DataTable,
 *    DataDirectory or PaginationBar (app-local wrappers count too; src/generated is skipped)
 *  - routes: a detail route ($id / $...Id) renders the shell DetailActions (PDF + print), directly or
 *    through an app component whose own file renders it (e.g. a config-driven ResourceDetail)
 * Ratchet: new violations fail; fixed ones fail until removed from table-baseline.json.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const baselinePath = join(root, "table-baseline.json");
const RULES = [
  [/<table[\s>]|<Table[\s>]/, "raw table; use ListPage"],
  [/\b(DataTable|DataDirectory|PaginationBar)\b/, "legacy table component; use ListPage"],
];
const DETAIL = /\$[A-Za-z]*[iI]d(\.index)?\.tsx$|\$id\/index\.tsx$/;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "generated" || name === "node_modules" ? [] : walk(path);
    return /\.(tsx|jsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

export function collect(dir = root) {
  const out = {};
  const files = walk(join(dir, "src"));
  // Components defined in files that render DetailActions satisfy the detail rule when a route uses them.
  const withActions = new Set(
    files
      .map((f) => readFileSync(f, "utf8"))
      .filter((text) => /<DetailActions\b/.test(text))
      .flatMap((text) => [...text.matchAll(/export function (\w+)/g)].map((m) => m[1])),
  );
  const rendersActions = (text) => text.includes("DetailActions") || [...withActions].some((name) => new RegExp(`<${name}\\b`).test(text));
  for (const file of files) {
    const rel = relative(dir, file).replace(/\\/g, "/");
    const text = readFileSync(file, "utf8");
    const v = RULES.filter(([re]) => re.test(text)).map(([, msg]) => msg);
    if (/^src\/(routes|pages)\//.test(rel) && DETAIL.test(rel) && !rendersActions(text)) v.push("detail page without DetailActions (PDF + print)");
    if (v.length) out[rel] = v;
  }
  return out;
}

export function compare(current, baseline) {
  const debt = baseline.debt ?? {};
  const exempt = baseline.exempt ?? {};
  const added = [];
  const fixed = [];
  for (const [file, list] of Object.entries(current)) {
    if (exempt[file]) continue;
    for (const item of list) if (!(debt[file] ?? []).includes(item)) added.push(`${file}: ${item}`);
  }
  for (const [file, list] of Object.entries(debt)) for (const item of list) if (!(current[file] ?? []).includes(item)) fixed.push(`${file}: ${item}`);
  return { added, fixed };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const current = collect();
  const mode = process.argv[2];
  if (mode === "--seed") {
    if (existsSync(baselinePath)) throw new Error("table-baseline.json exists; it can only shrink (--shrink)");
    writeFileSync(baselinePath, JSON.stringify({ _rule: "D-2026-11-17-01 ratchet. debt = migrate to ListPage/DetailActions; exempt = permanent with reason.", exempt: {}, debt: current }, null, 2) + "\n");
    console.log(`seeded ${Object.keys(current).length} files`);
    process.exit(0);
  }
  const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : { debt: {}, exempt: {} };
  if (mode === "--shrink") {
    for (const file of Object.keys(baseline.debt)) {
      baseline.debt[file] = baseline.debt[file].filter((item) => (current[file] ?? []).includes(item));
      if (!baseline.debt[file].length) delete baseline.debt[file];
    }
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n");
  }
  const { added, fixed } = compare(current, baseline);
  const debtCount = Object.keys(baseline.debt).length;
  if (added.length) console.error("New table/detail violations:\n  " + added.join("\n  "));
  if (fixed.length) console.error("Fixed — run with --shrink and commit table-baseline.json:\n  " + fixed.join("\n  "));
  console.log(`check-tables: ${added.length} new, ${fixed.length} fixed, ${debtCount} files still in debt`);
  process.exit(added.length || fixed.length ? 1 : 0);
}
