#!/usr/bin/env node
/**
 * The one way to update an app's copy of the shell: node scripts/vendor-into.mjs <vendor dir> [...]
 * e.g. node scripts/vendor-into.mjs ../hr-system/vendor/product-shell
 * Replaces src/, scripts/, docker/ and the package files; nothing else is touched.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const shell = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ITEMS = ["src", "scripts", "docker", "package.json", "README.md", "tsconfig.json", "vitest.config.ts"];

for (const target of process.argv.slice(2).map((t) => resolve(t))) {
  if (!existsSync(join(target, "package.json"))) throw new Error(`${target} is not a product-shell vendor directory`);
  for (const item of ITEMS) {
    const from = join(shell, item);
    if (!existsSync(from)) continue;
    rmSync(join(target, item), { recursive: true, force: true });
    cpSync(from, join(target, item), { recursive: true });
  }
  console.log(`vendored product-shell → ${target}`);
}
