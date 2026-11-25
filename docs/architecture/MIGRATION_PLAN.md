# PaikarMart Safe Migration Plan

**Status:** Proposed only — approval required before branch creation, code changes, file moves, deletion, dependency installation, or database migration.  
**Source baseline:** [`documents/ARCHITECTURE_AND_MODULARITY.md`](../../documents/ARCHITECTURE_AND_MODULARITY.md).  
**Rule:** Preserve routes, API contracts, auth, data, integrations, UI behavior, and deployment configuration. Migrate one module at a time.

## 1. Safety baseline

1. Reconfirm current `HEAD`, branch, and `git status`; the audit observed `main` at `657cda65bb6c7577a1faa6633fad46bd9de2353e` with 57 modified and 6 untracked pre-existing entries.
2. Do not reset, stash, overwrite, or clean the existing worktree. Identify and preserve the owner’s pending changes before starting.
3. After approval, create `refactor/modular-architecture` from the current revision while retaining the dirty worktree. Do not push to `main`.
4. Record a recoverable baseline of the existing database schema and deployment configuration before any migration.
5. Address P0 items in the audit before structural moves. Do not run live financial tests against production.
6. Preserve old URLs and `/api/v1` aliases throughout every change. Add or update tests before removing any compatibility surface.

## 2. File and module disposition

The default action is **stay in place**. Existing folder names already match most of the intended feature-first/hub-first architecture; moving them for appearance alone increases risk.

| Current path(s) | Proposed target/action | Dependencies and route impact | Verification and rollback |
|---|---|---|---|
| `apps/frontend/src/main.tsx`, `App.tsx`, `app/providers/**`, `app/guards/**`, `app/router/**` | Stay. Keep `main.tsx` as bootstrap, `App.tsx` as shell, and `routeManifest.tsx` as the sole route registry. | Router consumes hubs/portals and auth guards; all direct and compatibility paths depend on it. | Run frontend type-check/build and route smoke tests. Roll back only the route-focused commit; preserve all URLs. |
| `apps/frontend/src/hubs/**` and `apps/frontend/src/portals/**` | Stay in current business-category layout. Add child experiences to hub registries rather than new parallel page trees. | Hubs consume portal registries, mixed feeds, feature cards, and existing route entry points. | Hub/child navigation tests; verify query/state and existing route compatibility. Roll back the one hub registration and its page change together. |
| `apps/frontend/src/features/{auth,marketplace,services,social,wallet,logistics,...}/**` | Stay as canonical cross-portal domain features. Extract duplicated business logic into these existing modules; do not copy it into portals. | Portals import feature APIs/components; auth features back route guards. | Focused feature tests and all consuming portal type-checks. Roll back the feature and its caller changes atomically. |
| `apps/frontend/src/components/layout/**`, `components/shared/**` | Stay as current implementations. Keep `design-system/layouts/index.ts` and `design-system/components/index.ts` as public facades. Only move an implementation if a usage search proves all consumers can be updated in one patch. | App shell, portals, and feature widgets import these shared elements. | Import/reference search, visual checks on affected pages, keyboard/accessibility checks. Roll back implementation and facade changes as a unit. |
| `apps/frontend/src/contexts/**` and `contexts/AppProviders.tsx` | Stay. Keep the `AppProviders` re-export; do not merge or delete provider files based on names alone. | Auth, theme, language, location, and settings providers are composed by `app/providers/AppProviders.tsx`. | Provider boot/navigation tests. Roll back provider composition without changing public imports. |
| `apps/frontend/src/lib/{firebase,supabase}.ts` | Stay as infrastructure clients. Keep domain UI behavior in feature services; do not move privileged operations to browser clients. | Auth, analytics, social/API code and local persistence adapters currently depend on these modules. | Auth/session, RLS, and API contract tests. Roll back client wiring separately from domain logic. |
| `apps/frontend/src/types/index.ts` and `packages/shared/src/index.ts` | Both stay initially. Move only contracts used by both apps into `packages/shared`; keep UI-only models in frontend types and preserve compatibility re-exports. | Vite has an alias for `@paikarmart/shared`; backend package linking is not configured. | Type-check frontend and backend plus API DTO contract tests. Roll back export/import changes before deleting any old type. |
| `apps/frontend/src/data/**`, `data/mockData.ts` | Stay. Treat mock data as an explicit offline/development adapter, not a second production catalog. | Existing screens and contexts may use offline fallback data. | Test API-first behavior with live, empty, and unavailable catalog states. Keep fixtures during rollback. |
| `apps/frontend/src/utils/administrativeArea.ts`, `data/bangladeshLocations.ts`, `components/shared/AdministrativeAreaFields.tsx`, `contexts/LocationContext.tsx` | Stay during this refactor. A future focused location feature may group these under `features/location/{data,utils,components}`; do not move while prior area-discovery changes are unreviewed. | Location context and nearby/service/marketplace/profile consumers are cross-cutting. | Area matching tests plus saved-address, storefront, marketplace, service, and nearby checks. Retain the current exports as compatibility re-exports if moved. |
| `apps/backend/server.ts` | Stay as composition root. Extract inline feed handlers to `apps/backend/modules/social/socialRoutes.ts`; move catalog verification into existing `apps/backend/modules/catalog/` while preserving endpoints. | Server owns CORS, middleware, health, routers, `/api`, and `/api/v1` aliases. Frontend API callers rely on existing paths. | Route contract tests against old and versioned URLs. Roll back mount/extraction together; do not add a competing route handler. |
| `apps/backend/config/**`, `middleware/**` | Stay. Keep env, Firebase auth, sanitization, rate limits, audit, and security headers centralized. | All routers depend on this layer. | Auth/RBAC/security tests and both TS checks. Roll back middleware policy changes individually. |
| `apps/backend/services/dbService.ts` | Stay initially as compatibility adapter. Split domain-specific queries into repositories only after inventorying all callers; keep current exported helpers as forwarding functions during migration. | Orders, catalog, logistics, feed, wallet, and vendors rely on current database helpers. | Repository contract tests and schema-backed integration tests. Roll back by restoring adapter delegates, not by removing old exports. |
| `apps/backend/modules/orders/orderRoutes.ts` | Keep route file and paths. Incrementally extract `orderService.ts` and `orderRepository.ts`; remove process-local order authority only after durable persistence and idempotency are proven. | Orders call pricing, retail voucher, vendor ownership, logistics, notification, and DB services. | Authoritative price, guest-token, ownership, idempotency, status transition, persistence, and compatibility tests. Roll back module extraction while retaining API handlers. |
| `apps/backend/modules/payment/paymentRoutes.ts` | Keep route file and endpoint contracts. Add payment service/repository and a durable payment-session table; do not treat the current `Map` as production state. | Payment provider adapters, wallet ledger, notifications, and callback routes depend on session shape. | Provider sandbox, webhook signature, replay/idempotency, restart/retry and callback tests. Roll back by routing the same endpoints to the prior service; do not discard session records. |
| `apps/backend/modules/wallet/walletService.ts` and `modules/escrow/escrowRoutes.ts` | Keep current files while creating atomic DB RPC/transaction operations. After parity, place escrow-specific orchestration in `modules/escrow/escrowService.ts`; retain explicit compatibility exports until logistics and routes are switched. | Wallet, payment, escrow, and logistics currently share functions; this is a high-risk dependency seam. | Atomicity/concurrency/failure-injection tests; verify balances and ledger rows together. Roll back caller routing, not database history. |
| `apps/backend/modules/logistics/**` | Stay as the logistics domain. Secure shipment projections/POD first; later separate route handlers and persistence only if the domain requires it. | Logistics consumes order IDs, shipment tables, courier callbacks, and wallet/escrow code. | OTP access-control, signed webhook, POD persistence and order linkage tests. Roll back route/service changes as one unit. |
| Other `apps/backend/modules/*` | Stay in current domain folders. Add a service/repository/schema/type file only where a module needs it; do not create empty uniform folder templates. | Current modules include auth, AI, catalog, identity, messaging, notifications, retail, RFQ, storage, vendors, wholesale, analytics. | Domain-focused tests and both backend/frontend builds where relevant. Roll back one module at a time. |
| `supabase/schema.sql` | Keep as current schema reference. Establish a versioned `supabase/migrations/<timestamp>_*.sql` history only after SQL/Prisma and live-schema review. Never replace the file with an unreviewed generated schema. | RLS, triggers/functions, old rows, and production DB contract are sensitive. | Apply to disposable/staging DB; verify RLS, foreign keys, existing rows, rollback script and app compatibility before production. |
| `packages/database/prisma/schema.prisma`, `packages/database/index.ts` | Keep; reconcile only after table-by-table diff. Do not invoke Prisma migrations until dependency and schema parity are approved. | Prisma client package is not currently installed/configured as a workspace dependency; backend uses Supabase REST/RPC. | Prisma format/validate/generate in an explicitly provisioned environment; compare SQL DDL and RLS separately. Roll back schema edits without applying destructive DDL. |
| `packages/shared/**` | Stay. Defer workspace linking and package export changes until package manager/deployment selection is approved. | Frontend alias exists; root `package.json` does not declare workspaces. | Clean `npm ci`, both TS checks and root build in CI. Roll back manifest, lockfile, and import changes together. |
| Root `package.json`, lockfiles, `.env.example`, `render.yaml`, `vercel.json`, `firebase.json`, `.github/workflows/**`, Firebase rule files | Stay at repository root. Fix deployment issues in isolated config commits only. Do not combine a deployment topology change with source moves. | Render, Vercel, Firebase, GitHub Actions, environment, and production routing depend on root paths. | Run config validators, staging deploy, health check, and asset/API smoke tests. Roll back the individual deployment config/commit. |
| `documents/**` and new `docs/architecture/**` | Keep current product blueprints; use the new audit/migration docs for review artifacts. Do not copy the architecture blueprint into a second source-of-truth file without approval. | Standards and product behavior are consumed by future implementation work. | Review links and ensure one canonical architecture spec. Revert documentation-only commits independently. |

## 3. Duplicate review and deletion decision

**No file is approved for deletion based on this audit.** A duplicate-looking name is not proof of duplicate responsibility.

| Similar-looking paths | Assessment | Decision |
|---|---|---|
| `contexts/AppProviders.tsx` and `app/providers/AppProviders.tsx` | The former re-exports the latter; one implementation, one compatibility surface. | Keep both until import/reference search and compatibility window are complete. |
| `app/guards/AuthGuard.tsx`, `app/guards/RoleGuard.tsx` and `features/auth/components/*Guard.tsx` | App guards are re-export facades; auth feature owns implementation. | Keep both. |
| `design-system/components/index.ts` and `components/shared/*` | Barrel exports the concrete component implementations. | Keep both; no duplicate implementation established. |
| `design-system/layouts/index.ts` and `components/layout/*` | Barrel exports concrete layout implementations. | Keep both; no duplicate implementation established. |
| Repeated `index.ts` / `index.tsx` names | Scoped module entry points, not duplicate files. | Keep. |
| `src/types/index.ts` and `packages/shared/src/index.ts` | Some domain concepts overlap, but frontend-only props/models and cross-app DTOs have different consumers. | Consolidate selected shared contracts later; do not remove either barrel. |
| `mockData.ts` and live catalog/feed APIs | Offline/dev fallback and production API serve different runtime modes. | Keep fallback; verify it never overrides non-empty API truth. |
| `CategoryBar`, category portal shells, hub portal registries | Shared category UI, domain shells, and navigation metadata have distinct ownership. | Keep canonical feature and registry; do not merge by name. |
| `PromotionalAdCard` and `SponsoredFeedCard` | Promotion/display and sponsored-feed behavior are not proven equivalent. | Keep until props, analytics, routing, and visual behavior are compared. |

## 4. Recommended implementation order after approval

1. **Foundation and release blockers:** secure OTP/POD, make wallet/escrow operations atomic, correct payment success/error semantics, and add tests.
2. **Durable domain state:** persist orders, payment sessions, shipment state, and idempotency; ensure server-authoritative pricing.
3. **Schema governance:** SQL/Prisma/live-schema diff, migration baseline, backward-compatible migrations and RLS verification.
4. **Backend modularization:** extract inline `server.ts` routes; introduce domain repositories/services while retaining all existing API paths and aliases.
5. **Frontend contract alignment:** selectively consolidate shared DTOs and cross-cutting location logic, retaining facade exports.
6. **Portal/component cleanup:** only remove or relocate code after usage/dynamic-reference verification and focused route/UI checks.
7. **Build/deployment gates:** repair and stage-test production publish workflow, establish hosting target, and add backend checks to CI.

For each step: capture the source files and imports; make one focused change; add a failing-before test; run the smallest focused tests, TypeScript checks, frontend/backend builds, and route/API checks; record rollback details in `IMPLEMENTATION_LOG.md`. Do not apply a production DB migration until staging validation and explicit approval.

## 5. Approval gate

This plan does not authorize implementation. Required decisions before proceeding:

- Confirm this migration order and priority of P0 safety fixes.
- Confirm that the dirty worktree changes are to be preserved on the refactor branch.
- Choose whether `documents/ARCHITECTURE_AND_MODULARITY.md` remains canonical or is moved once to the requested architecture path.
- Confirm whether Firebase Hosting is a supported deployment target in addition to Vercel/Render.

Until approved, no branch, source, database, or deployment changes are made.
