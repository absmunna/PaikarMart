# MIGRATION PLAN (PHASE 2 — TARGET ARCHITECTURE MAPPING)

**Rule:** Migrate **one module at a time** after Phase 2 approval and safe branch initialization (`refactor/modular-architecture` branched from `main` @ `657cda65bb6c7577a1faa6633fad46bd9de2353e`). Never delete a file until zero active imports or dynamic references remain and all checks pass.

---

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
