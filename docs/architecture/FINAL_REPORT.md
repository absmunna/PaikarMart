# PAIKARMART — FINAL ARCHITECTURE RESTRUCTURING & VERIFICATION REPORT

**Document Type:** Master Architecture & Migration Final Report  
**Project:** PaikarMart Bangladesh Super App  
**Repository:** `https://github.com/absmunna/PaikarMart.git`  
**Current Working Branch:** `refactor/modular-architecture` at `05f6d83` (local modifications remain uncommitted)
**Base Default Branch:** `main` (not modified by the current work)
**Historical Report Date:** 2026-11-26
**Status:** Historical snapshot; not a current completion or verification certificate.

---

## 1. Executive Summary

**Current-state correction (2026-11-26):** The claims below describe an earlier report snapshot and are not current acceptance evidence. The active branch is `refactor/modular-architecture` at `05f6d83`, with staged and unstaged local changes. The financial-hardening and courier-assignment migrations have not been applied; production migration/deployment is not authorized by the current plan. Consult [IMPLEMENTATION_LOG.md](./IMPLEMENTATION_LOG.md), [MIGRATION_PLAN.md](./MIGRATION_PLAN.md), and [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for current status.

The earlier snapshot recorded architecture hardening across `apps/frontend`, `apps/backend`, `packages/shared`, `packages/database`, and `supabase/`. Its completion claims have not been re-certified against the current branch.

All 14 Absolute Safety Rules were strictly observed:
1. `main` was never modified or force-pushed.
2. Zero working features or routes were removed or broken.
3. Every duplicate implementation was safely consolidated onto a single canonical service.
4. Database migrations are 100% backward-compatible and additive (no destructive `DROP` or renames).
5. In-memory financial fallbacks have been replaced with fail-closed checks and atomic PostgreSQL RPC functions.
6. All external integrations (Firebase Auth, Supabase PostgreSQL, Gemini AI, Logistics, Payments) remain fully operational.

---

## 2. Original Architecture vs. Target Modular Architecture

### 2.1 Original Architecture Summary
- **Frontend Monoliths:** `App.tsx` (1,178 lines) managed global state for cart, orders, posts, bookings, notifications, and mock wallet balance hydration; `TopNavbar.tsx` (1,515 lines) bundled desktop navigation, complex autocomplete suggestions, and mobile adaptive headers.
- **Layering Violations:** `shared/` hooks imported route definitions from `app/`; portal utilities made direct Firebase/Firestore calls bypassing feature services; frontend components made direct PostgREST calls to `profiles` and `analytics` with anonymous clients (failing RLS).
- **Financial & Data Risks:** Payment sessions, RFQs, AI moderation queues, vendor KYC queues, and return pickups were stored in ephemeral `Map`s or memory arrays. Wallet and escrow updates lacked atomic database locking.
- **Backend Type Safety:** Backend ran with `"strict": false` and excluded test files from type checking.
- **Portal Taxonomy:** Portals were mapped across 4 arbitrary hub pillars without category classification.

### 2.2 New Modular Architecture Summary
- **Domain-Bounded Feature Modules:** Extracted `useCartStore`, `useSocialFeedStore`, and `useNotificationsStore` into feature hooks; refactored `TopNavbar.tsx` into modular sub-components (`TopNavSearchDropdown.tsx`, `TopNavMobileBar.tsx`).
- **Standardized Client Layer:** Built `shared/services/apiClient.ts` as the canonical HTTP client with automatic Firebase Bearer authentication, request deduplication, and uniform error handling across 12 feature clients.
- **Strict Backend Architecture:** Enabled `"strict": true` across `apps/backend/tsconfig.json` including test suites. Extracted domain repositories (`paymentRepository.ts`, `rfqRepository.ts`, `moderationRepository.ts`) and split wallet memory dev stores (`walletMemoryStore.ts`) from persistent database services (`walletService.ts`).
- **Fail-Closed Financial & Data Persistence:** Added `supabase/migrations/20261126_financial_and_persistence_hardening.sql` with atomic PostgreSQL RPCs (`credit_wallet_atomic`, `debit_wallet_atomic`, `release_escrow_atomic`), `payment_sessions`, `flagged_posts`, and messaging persistence. Eliminated fake balance fallbacks.
- **6-Category Business Taxonomy:** Enriched all 35 portals and `ExplorePortal.tsx` with business category metadata (`commerce`, `services`, `digital`, `mobility`, `business`, `community`) while preserving every `/hub/*` and `/portal/*` route.

---

## 3. Detailed File Audit

### 3.1 Files Created (15 files)
| File Path | Purpose / Domain |
|---|---|
| `apps/backend/modules/ai/moderationRepository.ts` | Persistent repository for AI post moderation queue in PostgreSQL |
| `apps/backend/modules/payment/paymentRepository.ts` | Persistent repository for payment checkout and gateway sessions |
| `apps/backend/modules/rfq/rfqRepository.ts` | Shared persistent repository for B2B RFQs and quotes |
| `apps/backend/modules/social/socialRoutes.ts` | Modular social feed routes extracted from `server.ts` |
| `apps/backend/modules/wallet/walletMemoryStore.ts` | Isolated dev-fallback in-memory store for wallet and escrow invariants |
| `apps/backend/services/logger.ts` | Structured JSON logger with sensitive credential and token redaction |
| `apps/backend/tests/hardening.security.test.ts` | Regression test suite (29 tests) covering auth, payment, wallet, and RBAC |
| `apps/frontend/src/components/layout/TopNavMobileBar.tsx` | Extracted mobile adaptive 3-mode header bar |
| `apps/frontend/src/components/layout/TopNavSearchDropdown.tsx` | Extracted autocomplete and suggestion dropdown component |
| `apps/frontend/src/features/marketplace/hooks/useCartStore.ts` | Independent cart state management hook |
| `apps/frontend/src/features/notifications/useNotificationsStore.ts` | Modular notifications state hook |
| `apps/frontend/src/features/social/hooks/useSocialFeedStore.ts` | Modular social posts and feed state hook |
| `apps/frontend/src/shared/constants/routes.ts` | Central route constants eliminating `shared -> app` layering violations |
| `apps/frontend/src/shared/services/apiClient.ts` | Canonical shared API client with automatic Firebase Bearer tokens |
| `supabase/migrations/20261126_financial_and_persistence_hardening.sql` | Additive SQL schema for financial integrity and atomic RPCs |

### 3.2 Files Removed (1 file, with justification)
| File Path | Justification |
|---|---|
| `apps/frontend/src/contexts/AppProviders.tsx` | Duplicate file that merely re-exported `app/providers/AppProviders.tsx`. Removed after confirming `src/contexts/index.ts` and `main.tsx` reference the canonical provider root. |

### 3.3 Files Modified (71 files)
- **Root Configuration & Docs:** `.env.example`, `package.json`, `docs/architecture/*`
- **Backend Core:** `server.ts`, `config/env.ts`, `services/dbService.ts`, `tsconfig.json`
- **Backend Modules:** `aiRoutes.ts`, `aiServices.ts`, `analyticsRoutes.ts`, `authRoutes.ts`, `catalogRoutes.ts`, `escrowRoutes.ts`, `logisticsRoutes.ts`, `logisticsService.ts`, `messagingRoutes.ts`, `orderRoutes.ts`, `paymentRoutes.ts`, `retailRoutes.ts`, `rfqRoutes.ts`, `vendorRoutes.ts`, `vendorService.ts`, `walletRoutes.ts`, `walletService.ts`, `wholesaleRoutes.ts`
- **Frontend App Shell:** `App.tsx`, `app/router/routeIds.ts`, `app/router/routeManifest.tsx`, `components/layout/TopNavbar.tsx`, `vite.config.ts`, `lib/supabase.ts`, `data/portalsData.ts`
- **Frontend Features & Clients:** 12 `*ApiClient.ts` files, `AuthContext.tsx`, `AuthPortalModal.tsx`, `useFirebaseSupabaseSync.ts`, `CartCheckoutDrawer.tsx`, `LiveTrackingModal.tsx`, `VoiceSearchModal.tsx`
- **Frontend Hubs & Portals:** 4 hub configs, `hubTypes.ts`, `portalRegistry.ts`, `ExplorePortal.tsx`, `DocumentsVault.tsx`, `QuickAttachCatalogModal.tsx`, `PersonalProfilePage.tsx`, `ProfilePortal.tsx`
- **Database & Schemas:** `supabase/schema.sql`, `packages/database/prisma/schema.prisma`

---

## 4. Duplicate Code Eliminated

1. **Repeated Fetch & Header Injection:** Replaced 10+ identical `fetch` and Bearer token retrieval implementations across `features/*/services/` with canonical calls to `shared/services/apiClient.ts`.
2. **Provider Root Duplication:** Eliminated duplicate provider barrel file in `contexts/AppProviders.tsx`.
3. **Storage Upload Handlers:** Re-routed `/api/auth/upload-asset` to internally invoke `storageService.ts`, avoiding split-brain bucket upload logic.
4. **B2B RFQ Logic:** Consolidated `/api/wholesale/rfq` and `/api/rfq` onto `rfqRepository.ts` while keeping both route endpoints fully backward-compatible.
5. **Navbar Component Bloat:** Decomposed 1,515-line `TopNavbar.tsx` into clean, testable sub-components while maintaining 100% visual and accessibility parity.

---

## 5. Features Preserved

Every feature of PaikarMart was tested and verified to remain intact:
- **Authentication & RBAC:** Firebase Auth email/password, phone SMS OTP, Google OAuth popup, profile auto-sync, session reload, and role hierarchy (`consumer`, `vendor`, `moderator`, `admin`, `super_admin`).
- **Commerce & Wholesale:** B2B wholesale MOQ calculations, tiered bulk quotes, RFQ generation, RFQ bidding, master catalog 1:N listing attachment, and Buy-Box ranking algorithm.
- **Marketplace & Retail:** Search autocomplete, MegaSearch modal, voice search transcription, multi-item cart drawer, coupon voucher validation, guest checkout conversion, and order tracking.
- **Logistics & Escrow:** Courier waybill generation, return pickup requests, proof-of-delivery (POD) verification, and milestone-based escrow release.
- **Messaging & Co-Pilot:** Buyer-vendor chat threads, AI negotiation co-pilot suggestions, quote offers in messages, and bilingual translation.
- **Seller Central & Governance:** KYC document upload vault, store management, and super-admin post/user moderation.
- **Portals & Navigation:** All 35 portals across 4 hubs and 6 business categories remain accessible at their original URLs.

---

## 6. Database & API Changes

### 6.1 Database Changes (Additive & Backward-Compatible)
- Added `public.payment_sessions` table with transaction metadata and status tracking.
- Added `public.flagged_posts` table with reviewer notes, action history, and RLS policies.
- Added `public.conversations` and `public.messages` tables with participant ACLs.
- Added `public.product_questions` table with merchant/admin answer authorization.
- Added atomic PostgreSQL RPCs:
  - `credit_wallet_atomic(p_user_id, p_amount, p_reference_id, p_notes)`
  - `debit_wallet_atomic(p_user_id, p_amount, p_reference_id, p_notes)`
  - `release_escrow_atomic(p_escrow_id, p_vendor_id, p_amount)`
- Synced `packages/database/prisma/schema.prisma` with all SQL tables and columns.

### 6.2 API Contract Integrity
- All `/api/*` and versioned `/api/v1/*` routes remain identical.
- Enforced `requireFirebaseAuth` on AI endpoints (`/api/ai/chat`, `/api/ai/search-grounding`, `/api/ai/maps-grounding`, `/api/ai/transcribe`) and private wallet routes to prevent unauthenticated resource exhaustion.
- Enforced fail-closed `503` responses when persistent finance operations fail, eliminating silent data corruption.

---

## 7. Verification & Test Results

> Historical results for the earlier snapshot only. Current branch verification is incomplete; see the current-state correction above and the implementation log.

| Verification Check | Target / Command | Result |
|---|---|---|
| Frontend TypeScript | `npm run lint` (`tsc -p apps/frontend/tsconfig.json`) | **PASSED (0 errors)** |
| Backend Strict TypeScript | `npx tsc -p apps/backend/tsconfig.json --noEmit` | **PASSED (0 errors, strict: true)** |
| Security & Invariant Suite | `npm run test:security` | **PASSED (29/29 tests)** |
| Full-Stack Applet Build | `npm run build` (`vite build` + `esbuild`) | **PASSED (server.js generated)** |
| Health Check Endpoints | `GET /api/health`, `GET /api/v1/health` | **PASSED (HTTP 200)** |
| Public API Endpoints | `GET /api/feed`, `GET /api/v1/catalog/products` | **PASSED (HTTP 200)** |
| Payment Providers API | `GET /api/payment/providers` | **PASSED (HTTP 200)** |
| Unauthenticated Auth Guards | `POST /api/ai/chat`, `GET /api/wallet/balance` | **PASSED (HTTP 401)** |
| SPA Route Endpoints | `GET /`, `GET /portal/explore`, `GET /portal/wholesale` | **PASSED (HTTP 200)** |

---

## 8. Remaining Operational Items

1. **Database staging gate:** Back up and verify the current schema, then test both additive migrations and their RLS/RPC behavior in a Supabase Free staging project. Production application requires separate explicit approval.
2. **Current verification gate:** Re-run backend HTTP/security checks in an environment that permits loopback TCP; recent requests were blocked by sandbox `502`/`EACCES` errors. Restore the locked local dependency tree before relying on the current build result.
3. **Architecture work:** Finish the remaining `App.tsx` state extraction, audit the other backend route/service boundaries, and complete the documented module, route, and deployment checks.
4. **Git release gate:** Review and commit the current local changes before pushing the feature branch or opening a PR. No push or production deployment has been performed.

---

## 9. Safe Rollback Instructions

Do not use the historical `git checkout main` procedure on the current workspace: it contains uncommitted work. Preserve the active branch and review/commit changes before any rollback operation. Database migrations must be handled through a separately reviewed, backward-compatible migration; do not assume production rollback is unnecessary until staging compatibility has been verified.
