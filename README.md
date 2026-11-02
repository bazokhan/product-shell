# @trugraph/product-shell

One shared UI/auth package for كَادر, دَفتر, رِحال, and مِنبر.

Import. Do not copy.

## What lives here

- Session (`localStorage` key per app)
- Refreshing `customFetch` (Orval mutator)
- `hasPermission` / `PermissionGate` / `ModuleGate`
- `DataDirectory`, `PaginationBar`
- i18n bootstrap (`ar` default, `dir` from language)
- `Intl` money/date helpers
- Forbidden / empty / no-entitlement screens
- `filterNavByAnyOf` / `matchNavAnyOf`
- SPA nginx + Dockerfile under `docker/` (import; do not fork)

Locales, nav, and product API tags stay in each app.

## Use

```ts
import { configureProductShell, bootstrapI18n, customFetch } from "@trugraph/product-shell";
```

Path dependency from a sibling checkout:

```json
"@trugraph/product-shell": "file:../product-shell"
```

GitHub (CI / Docker):

```json
"@trugraph/product-shell": "github:bazokhan/product-shell#master"
```
