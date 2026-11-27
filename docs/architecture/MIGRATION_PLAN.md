# MIGRATION PLAN (PHASE 2 — TARGET ARCHITECTURE MAPPING)

**Status:** Approved for phased implementation. Courier-assignment migration is approved for staging preparation only; production application remains gated on staging and backup verification.
**Source baseline:** [`documents/ARCHITECTURE_AND_MODULARITY.md`](../../documents/ARCHITECTURE_AND_MODULARITY.md).
**Rule:** Preserve routes, API contracts, auth, data, integrations, UI behavior, and deployment configuration. Migrate one module at a time.

## Approved no-billing deployment targets

| Layer | Selected target | Constraint |
|---|---|---|
| Frontend | Vercel Free | Keep the current frontend build/output and API rewrite compatible; do not add paid Vercel products. |
| Backend | Render Free | Keep the existing Express service and start/build commands; do not upgrade or provision paid services. |
| Relational database | Supabase Free PostgreSQL | Use SQL features available on the Free plan; preserve existing data/RLS and require approval before schema migrations. |
| Firebase | Spark plan, with no billing account | Use only Firebase capabilities that work without enabling billing. Do not require Blaze-only products or trigger billing activation. |

Vercel serves the frontend and proxies API requests to Render. Firebase Hosting and Cloud Run are not selected deployment targets. Check each Firebase product's current Spark eligibility before using it; if a required feature needs billing, stop and request an alternative decision rather than enabling billing or silently switching providers. Free-plan limits and terms must be verified before production rollout.

## 1. Safety baseline

1. The audit observed `main` at `657cda65bb6c7577a1faa6633fad46bd9de2353e` with 57 modified and 6 untracked pre-existing entries.
2. Preserve pending work before any branch operation. The original workspace and audit documents are backed up in commit `6f5757e816c70592691cfc72e671bb1f114a1f51`.
3. `refactor/modular-architecture` has now been synchronized with upstream `main` at `58cd980a86764f392fc85d5709ba0e41da467d14`; `main` itself was not changed.
4. Record a recoverable baseline of the existing database schema and deployment configuration before any migration.
5. Address P0 items in the audit before structural moves. Do not run live financial tests against production.
6. Preserve old URLs and `/api/v1` aliases throughout every change. Add or update tests before removing any compatibility surface.

## 1. Execution Sequence Overview

1. **Git Safety & Backup:** Connect/verify remote `https://github.com/absmunna/PaikarMart.git`, ensure `main` is untouched, create branch `refactor/modular-architecture`.
2. **Phase 3 (Core Foundation & P0 Security/Financial Readiness):**
   - Port alignment (`3000` dev default in `env.ts`), `.env.example` Firestore DB ID alignment, `shared/services/apiClient.ts`, `backend/services/logger.ts`.
   - Database migrations (`supabase/migrations/20261126_financial_and_persistence_hardening.sql`) + `prisma/schema.prisma` sync.
3. **Phase 7 & 6 Priority Modules (P0 Financial & DB Persistence):**
   - `wallet` & `escrow` (atomic SQL RPCs + remove production in-memory fallbacks).
   - `payment` (`payment_sessions` DB persistence + strict callback/verify ledger atomicity).
   - `orders` (100% Supabase persistence + strict catalog price authority + status transitions).
   - `vendors`, `retail`, `wholesale` + `rfq`, `logistics`, `messaging`, `social`, `ai`, `storage`.
4. **Phase 4 & 5 (Frontend Feature Modularization & Portal Categorization):**
   - Decompose `App.tsx` state into feature hooks (`marketplace`, `social`, `notifications`, `wallet`).
   - Fix layering violations (`shared/` -> `app/`, `portals/` -> `lib/firebase`).
   - Tag `portalRegistry.ts` & hub views with the 6 business categories while keeping every `/hub/*` and `/portal/*` route live.
   - Refactor `TopNavbar.tsx` mobile header behavior per `PORTAL_BEHAVIOR_SPEC.md`.

---

## 2. Detailed File & Module Migration Map

| # | Original Path | Target / Canonical Path | Reason | Import / Route Dependencies | Test Requirements | Rollback Procedure |
|---|---|---|---|---|---|---|
| **M1** | Inline `API_BASE` & `authHeaders` across `features/*/services/*.ts` | `apps/frontend/src/shared/services/apiClient.ts` | Eliminate 10+ duplicated fetch/token wrappers | Imported by all `features/*/services/*ApiClient.ts` | `npm run lint` + Vite build | Restore individual `fetch` helpers per API client |
| **M2** | `apps/frontend/src/shared/hooks/useGuestSessionPersistence.ts` | Same path (decouple `@/app/router/routeIds`) | Fix upward `shared -> app` layer violation | Called by `App.tsx` / `AuthContext.tsx`; routes `/portal/*` unchanged | `npm run lint` + guest redirect check | Revert 2-line path constant parameter |
| **M3** | `apps/frontend/src/shared/hooks/useEngagementAnalytics.ts` | Same path (delegate via `features/analytics` API instead of `supabase.from`) | Fix direct client DB insert blocked by RLS | Called by portals/cards; route `/api/analytics/event` | `npm run lint` + network POST check | Restore prior hook version |
| **M4** | `apps/frontend/src/contexts/AppProviders.tsx` | `apps/frontend/src/app/providers/AppProviders.tsx` | Remove duplicate re-export file after updating `main.tsx` | Check `grep AppProviders` across `src/` | `npm run lint` + app boot check | Re-add 1-line re-export file |
| **M5** | `apps/frontend/src/App.tsx` (state blocks: cart, orders, posts, catalog, wallet deduct) | Extracted hooks in `features/marketplace/`, `features/social/`, `features/notifications/` + wired `/api/wallet` | Break 1178-line monolith & fix paused wallet deduct stub | `App.tsx` renders layout + `<AppRoutes />`; all URLs preserved | `npm run lint` + `npm run build` + browser cart/checkout test | Revert `App.tsx` + drop extracted hooks |
| **M6** | Direct `@/lib/firebase` & `fetch` in `portals/utilities/{user-profile,seller-central}/*` | Delegate to `features/identity/services/`, `features/storage/`, `features/inventory/services/` | Enforce `portals -> features` dependency rule | `ProfilePortal`, `PersonalProfilePage`, `DocumentsVault`, `QuickAttachCatalogModal` | `npm run lint` + upload/verify smoke test | Restore direct imports in those 4 files |
| **M7** | `apps/frontend/src/hubs/shared/portalRegistry.ts` & `data/portalsData.ts` | Enrich `portalRegistry.ts` with 6 business categories (`commerce`, `services`, `digital`, `mobility`, `business`, `community`) | Category-based portal architecture without inventing unrequested products | `SuperAppHubModal`, `UnifiedSidebar`, `ExplorePortal`, Hubs; all `/hub/*` & `/portal/*` preserved | `npm run lint` + hub/sidebar navigation verification | Keep existing 4-hub mapping untouched |
| **M8** | `apps/backend/modules/payment/paymentRoutes.ts` (`paymentSessions` Map) | `apps/backend/modules/payment/{paymentRoutes,paymentService,paymentRepository}.ts` + `payment_sessions` SQL table | P0 financial persistence & callback atomicity | `/api/payment/*` & `/api/v1/payment/*` contracts identical | `payment.security.test.ts` + new session persistence test | Revert `payment/` module (keep additive DB table) |
| **M9** | `apps/backend/modules/wallet/{walletRoutes,walletService}.ts` + `escrow/` | Split into `{routes,service,repository}` backed by atomic SQL RPCs | P0 atomic balance locking + idempotency + zero fake fallback | `/api/wallet/*`, `/api/escrow/*` & `/api/v1/*` contracts unchanged | `wallet.security.test.ts` + concurrent debit/release test | Revert RPC calls while retaining additive SQL RPC functions |
| **M10** | `apps/backend/modules/orders/orderRoutes.ts` | `apps/backend/modules/orders/{orderRoutes,orderService,orderRepository,orderSchemas}.ts` | P0 persistent order queries/status updates & strict server SKU pricing | `/api/orders/*` & `/api/v1/orders/*` | `order.security.test.ts` + status update persistence test | Revert `orders/` folder |
| **M11** | `apps/backend/modules/retail/retailRoutes.ts` | `apps/backend/modules/retail/{retailRoutes,retailService,retailRepository}.ts` | Fix UUID FK bug, anon client usage, Q&A role guard, DB persistence | `/api/retail/*` & `/api/v1/retail/*` | Retail review/Q&A auth & DB tests | Revert `retail/` folder |
| **M12** | `apps/backend/modules/wholesale/wholesaleRoutes.ts` & `rfq/rfqRoutes.ts` | Shared `wholesaleRepository.ts` / `rfqService.ts` + DB persistence | Eliminate split-brain RFQ stores & enforce vendor/escrow ACLs | Both `/api/wholesale/*` & `/api/rfq/*` + `/api/v1/*` remain active | RFQ buyer/vendor ACL + escrow check tests | Revert `wholesale/` and `rfq/` |
| **M13** | `apps/backend/modules/vendors/vendorService.ts` | DB-first `vendorRepository.ts` + `vendorService.ts` (retire `vendorStoreRegistry` seed source) | P0 store/KYC persistence & authentic analytics | `/api/vendors/*`, `/store/:storeId`, `/u/:handle` | KYC queue + public storefront PII-strip tests | Revert `vendorService.ts` |
| **M14** | `apps/backend/modules/logistics/*` & `messaging/messagingRoutes.ts` | Wire `return_pickups`, dispatches, POD escrow release, and `conversations`/`messages` to Supabase | Persist dispatches, returns, POD escrow, and private messages | `/api/logistics/*`, `/api/messages/*` & `/api/v1/*` | Logistics POD & messaging ACL tests | Revert `logistics/` and `messaging/` |
| **M15** | `apps/backend/server.ts` inline `/api/feed` + `/api/catalog/verify-product` | Move feed handlers to `apps/backend/modules/social/{socialRoutes,socialService}.ts` & catalog audit to `modules/catalog/` | Slim `server.ts` bootstrap; domain isolation | `/api/feed/*`, `/api/catalog/verify-product` & `/api/v1/*` unchanged | `tsc` + server boot + `/api/health` & `/api/feed` tests | Re-inline router mount in `server.ts` |
| **M16** | `apps/backend/modules/auth/authRoutes.ts` (`/upload-asset`) & `storage/` | Delegate `/api/auth/upload-asset` to `modules/storage/storageService.ts` | Deduplicate upload logic while preserving route compatibility | Frontend `auth` & `storage` clients | Storage upload auth & mime check | Restore handler inside `authRoutes.ts` |
| **M17** | `apps/backend/modules/ai/aiRoutes.ts` & `packages/database/prisma/schema.prisma` | Add auth guard + persistent moderation flags; sync Prisma schema 1:1 with `supabase/schema.sql` | Close unauthenticated AI quota hole & eliminate schema drift | `/api/ai/*` callers attach Firebase token | AI auth 401 check + `prisma validate` (if CLI available) | Revert route middleware & Prisma schema diff |

---

## 3. Compatibility & Rollback Guarantees

- **Zero Broken URLs:** Any future portal path adjustments must retain `<Navigate replace />` aliases in `apps/frontend/src/app/router/routeManifest.tsx`.
- **Additive Database Migrations Only:** New tables/columns/RPCs live in `supabase/migrations/` and are appended compatibly to `supabase/schema.sql` — zero destructive `DROP TABLE` or breaking renames.
- **Per-Step Verification Gate:** Every migrated module (`M1..M17`) must pass `npm run lint`, `npx tsc -p apps/backend/tsconfig.json --noEmit`, `npm run test:security`, and `npm run build` before moving to the next module, recorded immediately in `IMPLEMENTATION_LOG.md`.

## 4. Recommended implementation order after approval

1. **Foundation and release blockers:** secure OTP/POD, make wallet/escrow operations atomic, correct payment success/error semantics, and add tests.
2. **Durable domain state:** persist orders, payment sessions, shipment state, and idempotency; ensure server-authoritative pricing.
3. **Schema governance:** SQL/Prisma/live-schema diff, migration baseline, backward-compatible migrations and RLS verification.
4. **Backend modularization:** extract inline `server.ts` routes; introduce domain repositories/services while retaining all existing API paths and aliases.
5. **Frontend contract alignment:** selectively consolidate shared DTOs and cross-cutting location logic, retaining facade exports.
6. **Portal/component cleanup:** only remove or relocate code after usage/dynamic-reference verification and focused route/UI checks.
7. **Build/deployment gates:** repair and stage-test production publish workflow for the selected Vercel/Render topology and add backend checks to CI.

For each step: capture the source files and imports; make one focused change; add a failing-before test; run the smallest focused tests, TypeScript checks, frontend/backend builds, and route/API checks; record rollback details in `IMPLEMENTATION_LOG.md`. Do not apply a production DB migration until staging validation and explicit approval.

## 5. Approval and execution status

- The user approved the migration order and priority of P0 safety fixes.
- The user selected `documents/ARCHITECTURE_AND_MODULARITY.md` as the canonical architecture document; do not create or maintain a second specification.
- Existing work was preserved in the backup commit above before implementation.
- The user confirmed the no-billing targets above. Do not configure Firebase Hosting or enable Firebase billing.
- The user approved adding courier assignment and POD authorization using a nullable profile reference. The migration is authored at `supabase/migrations/20261126_add_shipment_courier_assignment.sql` and has not been applied to any database.
- Before applying it, capture/verify the live schema, test the additive migration and RLS policy in a staging Supabase Free project, and deploy the migration before the dependent backend code. Production application is not authorized by the staging approval.
- Database and production deployment changes remain gated on schema/configuration backup, staging verification, and separate approval.
