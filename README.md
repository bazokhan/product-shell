# @maqsid/product-shell

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
import { configureProductShell, bootstrapI18n, customFetch } from "@maqsid/product-shell";
```

Path dependency from a sibling checkout:

```json
"@maqsid/product-shell": "file:../product-shell"
```

GitHub (CI / Docker):

```json
"@maqsid/product-shell": "github:bazokhan/product-shell#master"
```

## User identity displays

Use `UserDisplay` for all user/creator/poster/audit identity labels. Pass `{ id, type, name, email, unavailable }` from the owning API or the signed-in session. It never fetches a directory per row and never substitutes an opaque UUID as a name. Missing users, service accounts and system actors have readable fallbacks.

A link requires both `profileHref` and `canViewProfile`. The host must supply an existing same-app route and check its own permission. Do not guess `/users/:id` paths, link service accounts to user profiles, or use the component to bypass profile access checks. Form fields and intentionally technical ID fields are not user identity displays.

## Audit history

`AuditHistory` and `AuditRegister` use the tenant audit read contract, the existing fetch client, `ListPage`, `PaginationBar` and `UserDisplay`. Hosts explicitly pass `canRead` after checking the dedicated domain audit permission. The API remains authoritative. Never substitute general read permissions. `AuditRouteHistory` accepts host-owned record route patterns and ignores list/new/edit URLs. Host-provided `sourceHref` must point to an existing, permitted same-app record route; unsafe external URLs are dropped.

Before/after fields keep exact decimal strings. `formatDateTime` includes occurrence seconds, milliseconds and timezone offset. Old-history caveats and read failures remain distinct from an empty result. A reload key lets hosts refresh history after a business mutation. Do not invent prior events, duplicate generated-journal source actions, or display raw business payloads.
