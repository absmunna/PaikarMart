# ARCHITECTURE AUDIT REPORT (PHASE 0 & PHASE 1)

**Audit Date:** 2026-11-26  
**Repository:** `https://github.com/absmunna/PaikarMart`  
**Remote Default Branch & HEAD SHA:** `main` @ `657cda65bb6c7577a1faa6633fad46bd9de2353e`  
**Audit Scope:** Full read-only root-to-leaf inspection (Frontend, Backend, Shared Packages, Database Schemas, Auth/RBAC, Wallet/Payments/Orders, Security, Deployment, Env Contracts).

---

## 0. Baseline Environment & Verification Snapshot

| Check | Command | Outcome | Notes |
|---|---|---|---|
| Remote Git State | `git ls-remote https://github.com/absmunna/PaikarMart.git` | `main` @ `657cda65...` | Local `/app/applet` lacks `.git` directory |
| Frontend Typecheck | `npm run lint` (`tsc --noEmit --project apps/frontend/tsconfig.json`) | **PASSED** (0 errors) | Strict TS enabled |
| Backend Typecheck | `npx tsc -p apps/backend/tsconfig.json --noEmit` | **PASSED** (0 errors) | `strict: false`; excludes `apps/backend/tests/` |
| Security Test Suite | `npm run test:security` (`tsx --test apps/backend/tests/*.security.test.ts`) | **PASSED** (23/23 tests) | `auth`, `payment`, `order`, `wallet` tests pass |

---

## 1. Critical & Prioritized Findings (P0–P3)

### P0 — Critical Security, Financial & Data Integrity Risks

| ID | Area / File(s) | Exact Issue | Impact | Canonical Fix |
|---|---|---|---|---|
| **P0-1** | `apps/backend/modules/payment/paymentRoutes.ts` | `paymentSessions` uses an in-memory `Map`. `/verify` and `/callback` fail across restarts/multiple instances; `/verify` silently catches `applyVerifiedPaymentWebhook` errors and still marks session paid. | Lost deposits/checkouts, split-brain payment verification, silent financial ledger desync. | Add `payment_sessions` PostgreSQL table (`supabase/migrations/`); persist state transitions & fail closed if ledger webhook fails. |
| **P0-2** | `apps/backend/modules/wallet/walletService.ts` | `releasePersistentEscrow` updates `vendorProf.wallet_balance` **without** optimistic lock (`.eq('wallet_balance', ...)`) or SQL transaction; wallet/escrow functions silently fall back to `walletStore`/`escrowStore` Maps on DB error/missing profile. | Double-spend / lost concurrent balance updates; fake wallet state when DB errors occur. | Implement PostgreSQL atomic RPCs (`credit_wallet_atomic`, `debit_wallet_atomic`, `release_escrow_atomic`) with `FOR UPDATE` locking + idempotency key; never fall back to fake balances in production. |
| **P0-3** | `apps/backend/modules/orders/orderRoutes.ts` | `GET /:id` and `/:id/track` still query `serverOrders` array; `PATCH/PUT /:id/status` mutates memory only (never Supabase `orders`); `calculateAuthoritativeOrderTotals` accepts client-submitted price/subtotal if item IDs are non-UUIDs; `insertStoredOrder` silently no-ops if profile UUID missing. | Order status lost on restart; client price tampering possible with crafted non-UUID SKU IDs; orders silently unpersisted. | Persist all order reads/status updates to Supabase `orders` + `order_items`; strictly require authoritative catalog/listing SKU price in production; fail order creation if profile resolution fails. |
| **P0-4** | `apps/backend/modules/retail/retailRoutes.ts` | 1) `POST /products/:id/reviews` queries `orders.eq('customer_id', userId)` and inserts `user_id: userId` using Firebase **string UID** against UUID FK columns, AND uses anon `supabase` client instead of `supabaseAdmin`. Reads `row.reviewer_name` which is missing from `supabase/schema.sql`.<br>2) `POST /products/:id/qna/:qid/answer` lacks merchant/admin role guard (any consumer can answer) and updates memory only.<br>3) `GET /prescriptions` reads in-memory `serverPrescriptions` only. | Review inserts fail on PostgreSQL UUID type mismatch & RLS; unauthorized users can spoof merchant Q&A answers; prescriptions disappear on restart. | Resolve UUID via `resolveProfileUuidByAuthUid`; add `reviewer_name` / `profiles` join; use `supabaseAdmin`; enforce `requireRole(['vendor', 'moderator', 'admin', 'super_admin'])` on Q&A answers; persist Q&A and prescriptions to Supabase. |
| **P0-5** | `apps/backend/modules/wholesale/wholesaleRoutes.ts` & `rfqRoutes.ts` | `wholesaleRoutes.ts` keeps `rfqStore` and `sampleStore` in-memory only, allows any `'vendor'` to mutate `counterPrice` on any RFQ, and accepts client `escrowId` blindly for `'escrow_locked'`. `rfqRoutes.ts` persists `POST /` only (`POST /:id/quote` mutates memory only, lacks vendor role guard, and `GET /` leaks RFQs in fallback mode). | B2B quotes lost on restart, cross-vendor quote tampering, spoofed escrow locks, unauthorized RFQ data exposure. | Consolidate RFQ persistence onto Supabase (`paikarmart_rfqs` / `wholesale_rfqs`), enforce buyer/vendor ownership & verified `escrow_records` check, persist quotes & samples. |
| **P0-6** | `apps/backend/modules/vendors/vendorService.ts` | `listKycQueue`, `decideKycApplication`, `listPublicStores`, `getPublicStoreById`, `getPublicProfileByHandle`, `getStoreOwnerId`, and `getVendorAnalytics` read from **in-memory seeded** `vendorStoreRegistry` and `kycApplicationQueue` instead of Supabase `stores` and `escrow_records`. | Newly registered stores/KYC approvals vanish on restart or return fake seed analytics. | Make `stores` + `profiles` + `vendor_memberships` + `escrow_records` in Supabase the primary repository for all vendor/KYC/store queries. |
| **P0-7** | `apps/backend/modules/logistics/logisticsService.ts` & `messaging/messagingRoutes.ts` | `logisticsService.ts` keeps dispatches & `return_pickups` (despite table existing in SQL!) in memory and releases POD escrow via memory `escrowStore`. `messagingRoutes.ts` stores all `conversations` & `messageThreads` in memory and exposes seed threads when `!conv.ownerId`. | Lost logistics dispatches/returns, non-persistent POD escrow releases, lost chat history & seed leakage. | Wire `return_pickups`, dispatches, and messaging (`conversations`/`messages`) to Supabase + call persistent escrow release service. |
| **P0-8** | `apps/backend/modules/ai/aiRoutes.ts` | `flaggedPostsQueue` is in-memory only; `/chat`, `/search-grounding`, `/maps-grounding`, `/transcribe` lack `requireFirebaseAuth` middleware. | Unauthenticated external Gemini API quota exhaustion & lost moderation queue items. | Require `requireFirebaseAuth` (or strict signed session + rate limits) on AI generation endpoints and persist moderation flags in DB/Firestore. |
| **P0-9** | `apps/backend/config/env.ts` vs `apps/frontend/vite.config.ts` | `env.ts` defaults `PORT` to `5000` while `apps/backend/server.ts` mounts Vite middleware directly (expected on port `3000` in AI Studio iframe). `vite.config.ts` proxies `/api` to `localhost:5000` if Vite runs standalone. | Dev server fails port-3000 iframe expectations when `PORT` env var is unset. | Default dev `PORT` cleanly to `3000` in `server.ts`/`env.ts` when `NODE_ENV !== 'production'` (or align `PORT` & standalone proxy cleanly). |

---

### P1 — Major Functional & Architectural Issues

| ID | Area / File(s) | Exact Issue | Impact | Fix Plan |
|---|---|---|---|---|
| **P1-1** | `apps/frontend/src/App.tsx` (1178 lines) | Monolithic shell manages global `posts`, `commerceItems`, `orders`, `bookings`, `notifications`, `cartItems`, `localStorage` persistence (`nexsphere_*` keys via `lib/supabase.ts`), `INITIAL_*` mock hydration, and has a hardcoded stub `handleDeductBalance` returning `false` ("Wallet payments are paused"). | Tight coupling, difficult testing, stale legacy keys, disabled wallet checkout flow in shell. | Extract `useCartStore`, `useOrdersStore`, `useSocialFeedStore`, `useCatalogFeed` into `features/`; wire wallet payments to persistent `/api/wallet` & `/api/payment` flow. |
| **P1-2** | `packages/database/prisma/schema.prisma` vs `supabase/schema.sql` | Prisma schema is severely out of sync with `supabase/schema.sql` (missing `pmin`, `shipping_fee`, `condition`, `fulfillment_type`, `is_buy_box_winner`, `analytics`, `notifications`, `file_assets`, `paikarmart_rfqs`, `identity_verifications`, `saved_addresses`, `vendor_memberships`, `product_reviews.reviewer_name`). | Any tooling or future code relying on `@paikarmart/database` breaks or produces wrong types. | Sync `prisma/schema.prisma` 1:1 with `supabase/schema.sql` + new migrations (`payment_sessions`, `conversations`, `messages`, `product_questions`). |
| **P1-3** | `apps/frontend/src/features/auth/hooks/useFirebaseSupabaseSync.ts` & `shared/hooks/useEngagementAnalytics.ts` | Client directly runs `supabase.from('profiles')` and `supabase.from('analytics').insert(...)` using anon client without a Supabase Auth JWT (`auth.uid()` is null under Firebase-first auth). | Blocked by Supabase RLS policies (`USING (auth.uid() = ...)`), causing silent failures or console warnings. | Route profile sync & analytics ingestion strictly through authenticated Express endpoints (`/api/auth/profile`, `/api/analytics/event`). |
| **P1-4** | `apps/frontend/src/shared/hooks/useGuestSessionPersistence.ts` | `shared/` hook imports `ROUTE_PATHS` from `@/app/router/routeIds`. | Upward dependency violation (`shared/` -> `app/`). | Pass redirect paths via parameter or define public route constants in `shared/`. |
| **P1-5** | `apps/frontend/src/portals/utilities/*` | Direct imports of `@/lib/firebase` (`PersonalProfilePage`, `ProfilePortal`, `DocumentsVault`) and raw `fetch('/api/catalog/verify-product')` in `QuickAttachCatalogModal.tsx`. | Portals bypass feature service abstraction & shared `apiClient`. | Move upload/verification calls into `features/identity/services`, `features/inventory/services`, and `features/storage`. |
| **P1-6** | `.env.example` vs `firebase-applet-config.json` | `.env.example` lists `VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"`, whereas provisioned `firebase-applet-config.json` uses `"ai-studio-appstudio-ea26a4d9-6605-42cb-a89e-647d68ab2dab"`. | Fresh deploys copying `.env.example` target wrong Firestore DB unless overridden. | Align `.env.example` comments/default guidance cleanly with `firebase-applet-config.json`. |
| **P1-7** | Local Workspace Git & Windows Scripts | Workspace lacks `.git`; `/run_phase1_migrations.ps1`, `/scripts/sync-to-web.ps1`, `/scripts/sync-web.ps1` hardcode local Windows paths (`e:\PaikarMart`). | No local commit/rollback tracking; dead Windows scripts in repo root. | Re-attach/verify git branch `refactor/modular-architecture` from `main` before structural moves; quarantine or document legacy PS1 scripts in `scripts/`. |
| **P1-8** | `apps/backend/server.ts` & `*Routes.ts` | Social feed (`serverPosts`, `GET/POST /api/feed`) lives directly inside `server.ts`; routes mix HTTP parsing, validation, business logic, and raw Supabase queries. | Monolithic server bootstrap and inconsistent validation/error handling. | Extract `modules/social/` from `server.ts`; gradually split route modules into `routes -> controller -> service -> repository -> schemas`. |

---

### P2 — Duplication & Maintainability Issues

| ID | Duplicated / Overlapping Area | Canonical Owner | Duplicate / Legacy Artifact | Action |
|---|---|---|---|---|
| **P2-1** | Route Guards | `features/auth/components/{AuthGuard,RoleGuard}.tsx` | `app/guards/{AuthGuard,RoleGuard}.tsx` (already thin 1-line re-exports) | Keep as re-export facade OR keep canonical in `features/auth` — zero duplicate logic today, preserve facade. |
| **P2-2** | Providers Barrel | `app/providers/AppProviders.tsx` | `contexts/AppProviders.tsx` | Deprecate `contexts/AppProviders.tsx` after verifying imports. |
| **P2-3** | UI Layout & Shared Primitives | `design-system/{layouts,components}/index.ts` | Direct imports from `@/components/layout/*` and `@/components/shared/*` | Route all feature/portal imports through `@/design-system/*` (keep physical files or gradually colocate safely). |
| **P2-4** | B2B RFQ Endpoints | `/api/wholesale/rfq` (`wholesaleRoutes.ts`) | `/api/rfq` (`rfqRoutes.ts`) | Unify persistence repository (`rfqRepository`) while keeping BOTH route prefixes mounted for backward compatibility! |
| **P2-5** | Asset Upload Endpoints | `/api/storage/upload/*` (`storageRoutes.ts`) | `/api/auth/upload-asset` (`authRoutes.ts`) | Delegate `/api/auth/upload-asset` internally to `storageService` so upload validation & bucket logic exist once. |
| **P2-6** | Frontend API Fetch Boilerplate | Proposed `shared/services/apiClient.ts` | Repeated `API_BASE` + `authHeaders()` in 10+ `*ApiClient.ts` files | Consolidate auth header injection & error handling into `apiClient.ts`. |
| **P2-7** | Portal Metadata & Hub Categorization | `hubs/shared/portalRegistry.ts` | `data/portalsData.ts` (parallel 4-pillar config) | Align `portalsData.ts` with `portalRegistry.ts` + 6 business category metadata. |
| **P2-8** | Seed/Demo Data & LocalStorage Keys | Backend `catalog`/`social` APIs | `data/mockData.ts` + `masterCatalogFallback.ts` + `nexsphere_*` keys in `lib/supabase.ts` | Restrict `mockData.ts` to explicit demo/offline seed mode; stop hydrating authenticated user profiles with fake `CURRENT_USER` balance/data. |

---

### P3 — Optional Improvements

1. Enable `"strict": true` in `apps/backend/tsconfig.json` and include `apps/backend/tests/` in `tsc --noEmit`.
2. Add structured JSON request/finance logger (`apps/backend/services/logger.ts`) replacing ad-hoc `console.log`/`console.error`.
3. Modularize 1515-line `TopNavbar.tsx` and 1006-line `walletService.ts` into smaller focused sub-components/modules (header search, mobile adaptive bar, location selector; wallet ledger vs escrow vs PK Coins).
4. Add unit/integration tests for Payment verify/callback idempotency, Retail Q&A/reviews authorization, Vendor DB persistence, and RFQ ACLs.
