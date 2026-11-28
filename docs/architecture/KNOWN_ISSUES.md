# KNOWN ISSUES TRACKER

Maintains active architectural, infrastructure, security, and schema issues discovered during Phase 1 audit until resolved and verified.

---

## Resolved in Phase 3–8 Hardening (2026-11-26)

1. **[KI-001 / P0] Payment Sessions Persistence (`paymentRoutes.ts`, `paymentRepository.ts`)** — Resolved via `payment_sessions` SQL schema + persistent repository + fail-closed webhook ledger sync.
2. **[KI-002 / P0] Wallet/Escrow Fail-Closed & Atomic RPCs (`walletService.ts`, `walletRoutes.ts`, `escrowRoutes.ts`)** — Resolved via atomic SQL RPCs and strict `503` fail-closed responses in persistent finance mode.
3. **[KI-003 / P0] Order Status & SKU Price Integrity (`orderRoutes.ts`)** — Resolved via Supabase `orders` reads/updates and authoritative server-side SKU pricing.
4. **[KI-004 / P0] Retail Review UUID Mismatch & Q&A Authorization (`retailRoutes.ts`)** — Resolved via `resolveProfileUuidByAuthUid`, `supabaseAdmin`, merchant/admin RBAC on Q&A answers, and Supabase prescriptions persistence.
5. **[KI-005 / P0] Wholesale/RFQ & Vendor KYC Persistence (`wholesaleRoutes.ts`, `rfqRoutes.ts`, `rfqRepository.ts`, `vendorService.ts`)** — Resolved via shared `rfqRepository`, ownership/escrow validation, and Supabase-first vendor/KYC/analytics queries.
6. **[KI-006 / P0] Logistics Returns & Messaging Isolation (`logisticsService.ts`, `messagingRoutes.ts`)** — Resolved via Supabase `return_pickups`/`conversations`/`messages` persistence, persistent POD escrow release, and strict thread ACLs.
7. **[KI-007 / P0] AI Route Auth (`aiRoutes.ts`, `aiApiClient.ts`, `VoiceSearchModal.tsx`)** — Resolved (`requireFirebaseAuth` enforced on `/chat`, `/search-grounding`, `/maps-grounding`, `/transcribe`; frontend clients updated).
8. **[KI-008 / P0] Dev Server Port Alignment (`env.ts`, `vite.config.ts`)** — Verified aligned on port `3000` in development.
9. **[KI-010 / P1] Prisma Schema Column Sync (`schema.prisma`)** — Synced missing catalog, review, order, and escrow fields with SQL schemas.
10. **[KI-011 / P1] Direct Frontend DB Queries & Layer Violations** — Resolved (`shared/constants/routes.ts`, `shared/services/apiClient.ts`, `useEngagementAnalytics.ts`, `useFirebaseSupabaseSync.ts`, `AuthContext.tsx`, and portal decoupling).
11. **[KI-012 / P1] `App.tsx` Modular Decomposition & Storage Keys** — Extracted `useCartStore`, `useSocialFeedStore`, `useNotificationsStore`, migrated `nexsphere_*` keys to `paikarmart_*`, and routed `handleDeductBalance` to authenticated wallet/escrow guidance.
12. **[KI-013 / P2] Persistent AI Moderation Queue (`aiRoutes.ts`, `moderationRepository.ts`)** — Resolved via `public.flagged_posts` SQL table + RLS, `FlaggedPost` Prisma model, persistent repository, and `hardening.security.test.ts` coverage.
13. **[KI-015 / P2] Portal Category Taxonomy & Shared Client Consolidation (`M1`, `M4`, `M7`)** — Consolidated frontend API clients onto `shared/services/apiClient.ts`, deleted duplicate `contexts/AppProviders.tsx`, and tagged all portals with `businessCategory`.
14. **[KI-014 / P3] Backend Strict TypeScript, `TopNavbar.tsx` & `walletService.ts` Modular Split** — Resolved (`"strict": true` + `tests/**/*.ts` enabled in `apps/backend/tsconfig.json`; `TopNavSearchDropdown.tsx` + `TopNavMobileBar.tsx` extracted from `TopNavbar.tsx`; `walletMemoryStore.ts` extracted from `walletService.ts`; structured `logger.ts` redaction fixed and adopted in `aiRoutes.ts`).

---

## Remaining Active Operational Items

1. **[KI-009 / Operational] Remote Push via Personal Access Token & Supabase SQL Execution**
   - Remote `origin` has been configured locally (`https://github.com/absmunna/PaikarMart.git`). Because pushing requires GitHub credentials, run `git push -u origin refactor/modular-architecture` with your GitHub token, then create a PR to merge into `main`.
   - Apply `supabase/migrations/20261126_financial_and_persistence_hardening.sql` in your Supabase SQL Editor.
   - Legacy Windows scripts (`run_phase1_migrations.ps1`, `scripts/sync-to-web.ps1`, `scripts/sync-web.ps1`) remain untouched for historical reference.

## Active shipment authorization gap

POD authorization, outbound courier payload access, and checkpoint updates are now scoped to the order owner/assigned courier/logistics staff as appropriate. These changes depend on `supabase/migrations/20261126_add_shipment_courier_assignment.sql`, which has not been applied or staging-tested. Other shipment mutation/read routes and end-to-end HTTP integration remain to be verified.

## Deployment constraint

Use Vercel Free, Render Free, Supabase Free PostgreSQL, and Firebase Spark without billing. Do not enable billing or apply either Supabase migration to production without separate approval.

## Local profile preview dependency issue

- The local Vite preview returns `404` for its optimized `recharts.js` dependency when the profile Insights tab is opened; the route now defers that dependency and keeps the rest of the profile usable with an inline error state.
- The production build now succeeds after adding the missing root `react-is` dependency, but the Insights chart still needs browser verification and the build warns about chunks larger than 500 kB.
- Re-test the Insights chart in preview; do not treat the successful build as proof that analytics renders correctly.

## First release slice: Retail Marketplace + COD

- The initial scope is signed-in retail customers placing Cash on Delivery orders. Guest checkout and online payments are out of scope for this release.
- Order creation now requires Firebase authentication and a successful persistent order write. Production order prices must resolve from live catalog records; unavailable storage or catalog data must not produce a success-shaped response or expose demo inventory.
- Before release, staging must verify profile synchronization, catalog/listing schema and pricing, order idempotency, order tracking persistence, and shipment/waybill behavior. No production migration or deployment has been run.
- Direct routes to deferred top-level areas now show a shared “Coming soon” screen, and the app restores to the marketplace when a saved route is deferred. Finer per-portal labels and staging verification remain; this is not yet a production release.
- The latest dependency install reported four high-severity npm advisories; review and resolve or explicitly accept them before production.

