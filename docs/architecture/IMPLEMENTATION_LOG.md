# IMPLEMENTATION LOG

Tracks baseline verification, architectural audits, module migrations, tests, and build verifications chronologically.

---

## Entry 001 — Phase 0 Repository Safety & Baseline Verification
- **Date:** 2026-11-26
- **Scope:** Read-only repository verification prior to architectural restructuring.
- **Git Reference:** Remote `https://github.com/absmunna/PaikarMart.git` default branch `main` @ `657cda65bb6c7577a1faa6633fad46bd9de2353e`. (Local workspace `/app/applet` lacks `.git`; tracked in `KNOWN_ISSUES.md` for Phase 3 branch initialization).
- **Commands Executed:**
  1. `npm run lint` (`tsc --noEmit --project apps/frontend/tsconfig.json`) -> **PASSED** (0 errors)
  2. `npx tsc -p apps/backend/tsconfig.json --noEmit` -> **PASSED** (0 errors; note `strict: false`, `tests/` excluded)
  3. `npm run test:security` (`tsx --test apps/backend/tests/*.security.test.ts`) -> **PASSED** (23/23 tests across `auth`, `payment`, `order`, `wallet`)
- **Code Changes:** None (Phase 0 & Phase 1 strictly read-only).

## Entry 002 — Phase 1 Complete Audit & Phase 2 Architecture Planning
- **Date:** 2026-11-26
- **Scope:** Full audit of root configs, `supabase/schema.sql`, `packages/database/prisma/schema.prisma`, `packages/shared/src/index.ts`, all 17 backend modules, security tests, `apps/frontend/src/App.tsx`, router, guards, providers, design system, hubs, portals, features, and environment configs.
- **Documentation Created in `docs/architecture/`:**
  - `PAIKARMART_MODULAR_ARCHITECTURE.md`
  - `ARCHITECTURE_AUDIT.md` (9 P0, 8 P1, 8 P2, 4 P3 findings)
  - `MIGRATION_PLAN.md` (17-step incremental migration map `M1`–`M17`)
  - `MODULE_DEPENDENCY_MAP.md` (dependency matrix + 7 detected boundary violations)
  - `PORTAL_BEHAVIOR_SPEC.md` (6 business categories + adaptive `TopNavbar` spec)
  - `IMPLEMENTATION_LOG.md`
  - `KNOWN_ISSUES.md`
- **Status:** Phase 2 documentation approved; proceeding to Phase 3+ implementation.

## Entry 003 — Phase 3–8 Backend Hardening, Prisma Sync & Frontend Modularization
- **Date:** 2026-11-26
- **Backend Hardening & Persistence:**
  - Added `/supabase/migrations/20261126_financial_and_persistence_hardening.sql` (payment sessions, conversations/messages, wholesale samples, product questions, review/order/escrow columns, atomic wallet/escrow RPCs).
  - Refactored `paymentRoutes.ts` via `paymentRepository.ts` for PostgreSQL-backed sessions and fail-closed verification.
  - Updated `walletService.ts`, `walletRoutes.ts`, and `escrowRoutes.ts` to fail closed (`503`) in persistent finance mode instead of silent fake in-memory balance fallbacks.
  - Updated `orderRoutes.ts`, `retailRoutes.ts`, `wholesaleRoutes.ts`, `rfqRoutes.ts` (`rfqRepository.ts`), `vendorService.ts`, `logisticsService.ts`, and `messagingRoutes.ts` for Supabase persistence, UUID profile resolution, and strict RBAC/ownership checks.
  - Extracted `modules/social/socialRoutes.ts` from `server.ts`, unified `/api/auth/upload-asset` with `storageService.ts`, and enforced `requireFirebaseAuth` on `/api/ai/{chat,search-grounding,maps-grounding,transcribe}`.
  - Synced `packages/database/prisma/schema.prisma` columns with `supabase/schema.sql` and hardening migrations; added `apps/backend/tests/hardening.security.test.ts` (26/26 security tests passing).
- **Frontend Shared Boundaries & App Decomposition:**
  - Created `apps/frontend/src/shared/constants/routes.ts` and updated `routeIds.ts` + `useGuestSessionPersistence.ts` to eliminate `shared -> app` upward import.
  - Created `apps/frontend/src/shared/services/apiClient.ts` and updated `aiApiClient.ts`, `VoiceSearchModal.tsx`, `useEngagementAnalytics.ts`, and `catalogApiClient.ts` to send Firebase Bearer tokens and remove direct client `supabase.from('analytics')` inserts.
  - Updated `useFirebaseSupabaseSync.ts` and `AuthContext.tsx` to remove direct client `supabase.from('profiles')` fallback queries and prevent mock `CURRENT_USER.balance` hydration on authenticated accounts.
  - Wrapped Firebase identity/storage helpers in `features/auth/services/authProfileApi.ts` and removed direct `@/lib/firebase` / raw `fetch` imports from `PersonalProfilePage.tsx`, `ProfilePortal.tsx`, `DocumentsVault.tsx`, and `QuickAttachCatalogModal.tsx`.
  - Renamed legacy `nexsphere_*` storage keys in `lib/supabase.ts` to `paikarmart_*` (with one-time legacy read migration) and extracted `useCartStore.ts`, `useSocialFeedStore.ts`, and `useNotificationsStore.ts` from `App.tsx`.

## Entry 004 — M1/M4/M7 Completion & Persistent Moderation Queue (`KI-013`)
- **Date:** 2026-11-26
- **Category-Based Portal Taxonomy (`M7`):**
  - Added `BusinessCategoryId` (`commerce`, `services`, `digital`, `mobility`, `business`, `community`) and required `businessCategory` metadata to `hubTypes.ts`, `portalRegistry.ts` (`BUSINESS_CATEGORIES`, `getPortalsByBusinessCategory`), `marketplacePortals.ts`, `servicePortals.ts`, `communityPortals.ts`, and `utilityPortals.ts` while preserving all routes and `hubId`s.
- **Duplicate Removal & Shared API Client Consolidation (`M4`, `M1`):**
  - Updated `apps/frontend/src/contexts/index.ts` to re-export canonical `@/app/providers/AppProviders` and removed duplicate `apps/frontend/src/contexts/AppProviders.tsx`.
  - Standardized API clients onto `shared/services/apiClient.ts` (`API_BASE`, `getAuthHeaders`, `getFirebaseBearerToken`, `apiRequest`): `authProfileApi.ts`, `notificationApiClient.ts`, `walletEscrowApiClient.ts`, `paymentGatewayClient.ts`, `identityApiClient.ts`, `wholesaleApiClient.ts`, `vendorApiClient.ts`, `messagingApiClient.ts`, `retailApiClient.ts`, `catalogApiClient.ts`, `socialFeedApiClient.ts`, and `logisticsOrderApiClient.ts`; refactored `LiveTrackingModal.tsx` to use `logisticsOrderApiClient`.
- **AI Moderation Queue Persistence (`KI-013`):**
  - Added `public.flagged_posts` table + RLS in `/supabase/schema.sql` and `/supabase/migrations/20261126_financial_and_persistence_hardening.sql`, plus `FlaggedPost` Prisma model in `/packages/database/prisma/schema.prisma`.
  - Created `apps/backend/modules/ai/moderationRepository.ts` and updated `aiRoutes.ts` (`/moderate-post`, `/moderation/posts`, `/moderation/posts/:id/review`) + security tests in `apps/backend/tests/hardening.security.test.ts`.
- **Verification:** `npm run lint` (0 errors), `npx tsc -p apps/backend/tsconfig.json --noEmit` (0 errors), `npm run test:security` (**27/27 tests passed**), and `npm run build` (**succeeded**).

## Entry 005 — TopNavbar Decomposition, Wallet Store Split & Backend Strict Mode (`KI-014`)
- **Date:** 2026-11-26
- **Frontend Navbar Modularization (`TopNavbar.tsx`):**
  - Extracted autocomplete suggestions dropdown into `apps/frontend/src/components/layout/TopNavSearchDropdown.tsx` and mobile adaptive 3-mode header bar into `apps/frontend/src/components/layout/TopNavMobileBar.tsx`.
  - Refactored `apps/frontend/src/components/layout/TopNavbar.tsx` (~1,515 lines -> ~595 lines) to orchestrate `TopNavSearchDropdown`, `TopNavMobileBar`, `TopNavLocationMenu`, `MegaSearch`, and `AiAssistantDrawer` while keeping all `TopNavbarProps`, ARIA attributes, and mobile/desktop visual behavior unchanged.
- **Backend Strict TypeScript & Service Modularization (`KI-014`):**
  - Resolved the single remaining strict-mode error (`TS7031` on `_ignored` in `apps/backend/modules/analytics/analyticsRoutes.ts`), enabled `"strict": true` in `apps/backend/tsconfig.json`, and added `"tests/**/*.ts"` to strict typecheck coverage.
  - Extracted shared wallet/escrow types and dev-fallback memory ledger into `apps/backend/modules/wallet/walletMemoryStore.ts`, keeping `walletService.ts` focused on Supabase & atomic PostgreSQL RPC finance operations while re-exporting all contracts compatibly.
  - Fixed lowercase `REDACT_KEYS` matching (`servicerolekey`, `apikey`) in `apps/backend/services/logger.ts` and replaced `console.error` calls in `apps/backend/modules/ai/aiRoutes.ts` with structured `logger.error`.

## Entry 006 — Portal Category Metadata Alignment (`P2-7`), Route Fallback & Test Hardening
- **Date:** 2026-11-26
- **Portal Metadata & Directory (`P2-7`):**
  - Tagged all 35 portal entries in `apps/frontend/src/data/portalsData.ts` (`SUPER_PORTALS`) with `businessCategory: BusinessCategoryId` aligned to `hubs/shared/portalRegistry.ts`.
  - Added a 6-business-category filter strip (`Commerce`, `Services`, `Digital`, `Mobility & Logistics`, `Business Management`, `Community & Social`) in `ExplorePortal.tsx` while keeping the 4-pillar hub grouping intact.
- **Router Fallback & Regression Tests:**
  - Added wildcard catch-all route `<Route path="*" element={<Navigate to={defaultRootRoute} replace />} />` in `apps/frontend/src/app/router/routeManifest.tsx`.
  - Added `walletMemoryStore` financial invariant tests and `logger` sensitive-key redaction tests to `apps/backend/tests/hardening.security.test.ts`.

## Entry 007 — Production Log Hygiene, Structured Logger Adoption & Phase 9 Verification
- **Date:** 2026-11-26
- **Frontend & Backend Log Hygiene:**
  - Gated auth/sync debug logs behind `import.meta.env.DEV` and removed user email/phone/profile PII logs in `AuthContext.tsx`, `useFirebaseSupabaseSync.ts`, `AuthPortalModal.tsx`, and `CartCheckoutDrawer.tsx`.
  - Migrated `server.ts`, `aiServices.ts`, `catalogRoutes.ts`, `messagingRoutes.ts`, and `rfqRoutes.ts` error/startup logs to structured `logger` (`apps/backend/services/logger.ts`).
- **Phase 9 Build, Typecheck, Security & Live Route Verification:**
  - `npm run lint` (`tsc --noEmit --project apps/frontend/tsconfig.json`) -> **PASSED** (0 errors)
  - `npx tsc -p apps/backend/tsconfig.json --noEmit` (`"strict": true`, incl. `tests/**/*.ts`) -> **PASSED** (0 errors)
  - `npm run test:security` -> **PASSED** (29/29 tests)
  - `npm run build` (`vite build` + `esbuild` -> `server.js`) -> **PASSED**
  - Live runtime smoke checks on port `3000` (`/api/health`, `/api/v1/health`, `/api/feed`, `/api/v1/catalog/products`, `/api/payment/providers`, unauthenticated 401 checks on `/api/ai/chat` and `/api/wallet/balance`, and SPA routes `/`, `/portal/explore`, `/portal/wholesale`) -> **10/10 PASSED**

## Earlier audit and approved local work

- Compared the current repository to `documents/ARCHITECTURE_AND_MODULARITY.md` and the supplied master architecture requirements.
- Recorded repository baseline: `main`, commit `657cda65bb6c7577a1faa6633fad46bd9de2353e`.
- Worktree already contained 57 modified and 6 untracked entries at audit start. These were not reset, staged, or overwritten.
- No branch was created; no source code, database schema, deployment file, dependency manifest, or generated bundle was changed during audit.
- Added the architecture audit, migration plan, dependency map, and known-issues records under `docs/architecture/`.
- Frontend TypeScript check passed; frontend area tests passed 5/5.
- Backend TypeScript check could not resolve the declared but locally absent `express-rate-limit` package.
- Backend security tests reported 8 pass / 15 HTTP failures; the sandbox denied local ephemeral TCP with `EACCES`. Results are inconclusive for those requests.
- No build or live-service/database check was run.
- At audit completion, the next gate was approval of the migration plan; that approval was subsequently granted as recorded below.

## After approval — branch baseline and first P0 mitigation

- User approved the phased migration plan, selected `documents/ARCHITECTURE_AND_MODULARITY.md` as canonical, and requested preservation of the existing worktree.
- Created `refactor/modular-architecture` from the audited revision and committed the full pre-existing worktree plus audit documents as `6f5757e816c70592691cfc72e671bb1f114a1f51` before source changes.
- Added a public shipment projection that omits OTP, POD receipt, rider contact/location, and pickup/drop addresses from logistics shipment responses. Authenticated owners can still receive their shipment through the existing order-access route.
- Replaced incorrect-OTP responses with a generic message and removed OTP-bearing frontend fallbacks.
- Added two focused logistics security regression tests; both passed. Frontend TypeScript validation passed.
- Backend TypeScript validation remains blocked because the installed dependency tree lacks declared `express-rate-limit`. No dependency installation was performed.
- No live schema migration, deployment, route path, or directory migration was changed. At this stage A-01 remained open for POD and shipment-mutation authorization.
- No provider configuration was changed during the initial implementation pass.

## 2026-11-26 — No-billing deployment decision

- User selected Vercel Free for the frontend, Render Free for the backend, Supabase Free PostgreSQL for SQL, and Firebase Spark without adding billing.
- Recorded that Firebase products must be individually verified as usable without billing; do not enable Blaze, use Firebase Hosting, or switch providers without approval.
- Updated the migration plan, dependency map, audit finding note, known-issues register, and deployment guide. No provider configuration, account, database, or secret was changed.

## 2026-11-26 — POD courier assignment authorization

- Following explicit user approval, added nullable `assigned_courier_profile_id`, its index, and an RLS read policy for assigned couriers. Added `supabase/migrations/20261126_add_shipment_courier_assignment.sql`; it has not been applied.
- The assignment API accepts `assignedCourierUid` only from logistics/admin roles, validates the target profile's driver/logistics role, and requires the assignment to persist before returning success.
- POD verification now requires an existing order and an authenticated order-owner profile, the assigned courier profile, or admin/super-admin; it loads persisted shipment data and applies a 20-attempt/15-minute IP limit.
- Kept the assigned profile ID out of public and order-owner response DTOs. Existing courier-partner selection remains compatible when no user assignment is supplied.
- Logistics security tests passed 3/3 and frontend TypeScript validation passed. Backend TypeScript remains blocked by the missing installed `express-rate-limit` dependency.
- No live database migration or production deployment was run. Staging SQL/RLS validation and order-scoped authorization for other shipment mutation routes remain outstanding.
- Follow-up: protected the outbound courier payload with assigned-courier/logistics/admin authorization and added order-scoped persisted shipment lookup. Checkpoint updates now use the same assignment boundary and require persistence to succeed before returning success. Focused logistics tests passed 5/5 and frontend TypeScript validation passed. The full security suite's HTTP tests received sandbox-proxy 502 responses; staging database and HTTP route integration remain unverified.

## Latest upstream synchronization and shipment follow-up

- Merged upstream `main` commit `58cd980a86764f392fc85d5709ba0e41da467d14` into `refactor/modular-architecture` as merge commit `05f6d83`; no push or database migration was performed.
- Retained the upstream backend persistence, atomic wallet/escrow RPC, payment-session repository, shared API client, portal taxonomy, and navigation decomposition work. Restored the existing vendor service-area update flow where it conflicted with the upstream vendor persistence changes.
- Re-applied shipment assignment authorization and migration work on top of the newer async logistics services. Focused logistics security tests pass 5/5 and frontend TypeScript validation passes.
- Added an admin-only courier UID assignment control to the fleet queue. Assigned courier updates now surface save failures instead of falling back to a local success-shaped state; sensitive POD and outbound-payload routes require a persisted waybill.
- Backend TypeScript validation remains blocked because `express-rate-limit` is missing locally. Attempted a no-save install; npm refused dependency resolution because the installed esbuild version conflicts with Vite's optional peer requirement. No dependency manifest or lockfile was changed.
- The courier-assignment migration and financial-hardening migration remain unapplied; production deployment remains gated on staging verification and separate approval.

## 2026-11-26 — Catalog verification route extraction (M15)

- Moved the inline Gemini catalog verification handler from `server.ts` into `modules/catalog/catalogRoutes.ts`, with its AI/fail-safe behavior in `catalogVerificationService.ts`.
- Preserved Firebase authentication, both `/api/catalog/verify-product` and `/api/v1/catalog/verify-product` aliases, response fields, and the manual-review fallback when AI is unavailable.
- Added regression coverage for alias/auth behavior and for the fail-closed manual-review result.
- Backend TypeScript validation passed. The manual-review service test passed. HTTP route tests could not be verified because the sandbox denied loopback TCP to an ephemeral port (`EACCES`); the full security suite also returned sandbox-proxy `502` responses for HTTP cases.
- `npm run build` is currently blocked by the local dependency tree: Vite/Rolldown cannot resolve `react-is` from Recharts after the no-save dependency install. No package manifest or lockfile changes were made.

## 2026-11-26 — Frontend order state extraction (M5)

- Added `features/orders/store/useOrdersStore.ts` and moved order hydration/persistence plus add/update state mutations out of `App.tsx`.
- Preserved the existing `ORDERS` local-storage key, `INITIAL_ORDERS` fallback, notification/navigation behavior, and order object contract. New-order updates now use a functional state update.
- Frontend TypeScript validation (`npm run lint`) and staged/working diff checks passed.
- M5 remains partial: catalog hydration is still owned by `App.tsx`, and the wallet checkout flow remains server-verified/paused rather than being made optimistic.

## 2026-11-26 — Final report status correction

- Marked `FINAL_REPORT.md` as a historical snapshot, corrected its current branch/migration status, replaced the production-migration instruction with the staging gate, and removed the unsafe historical `git checkout main` rollback instruction for the current uncommitted workspace.

## 2026-11-26 — Catalog state extraction (M5)

- Added `features/marketplace/hooks/useCatalogStore.ts` to own catalog loading state, backend refresh, unconfigured local fallback, empty-catalog storage cleanup, local persistence, and product insertion.
- Kept initial catalog/feed requests concurrent and preserved pull-to-refresh behavior; `App.tsx` now coordinates refresh timing while the marketplace feature owns catalog state and persistence.
- Frontend TypeScript validation (`npm.cmd run lint`) and `git diff --check` passed.
- M5 remains partial: wallet checkout is still server-verified/paused, and remaining app-level orchestration/state has not been decomposed.

## 2026-11-26 — Service booking state extraction (M5)

- Added `features/services/store/useBookingsStore.ts` for `BOOKINGS` local-storage hydration/persistence and functional booking insertion.
- Kept booking ID/status creation and the existing user notification in `App.tsx`; only booking state ownership moved to the service feature.
- Frontend TypeScript validation (`npm.cmd run lint`) and `git diff --check` passed. No API or database behavior changed.

## 2026-11-26 — Profile route resilience and loading UX

- Split the profile and public-storefront route imports so either page no longer eagerly loads the entire user-profile barrel.
- Deferred the Recharts spending dashboard until the Insights tab is selected, with an accessible loading skeleton and a localized inline error state so chart-load failures do not replace the entire profile with the global error screen.
- Browser verification: `/portal/profile` renders; selecting Insights reports a Vite `recharts.js` 404 and shows the localized section-level fallback while other profile navigation remains available.
- `npm.cmd run lint` passed. Profile sync still logs the expected local 503 because profile database synchronization is not configured; no authentication or database behavior was changed.
- The local Recharts optimized dependency remains unavailable, so Insights charts are not validated; the prior build failure resolving `react-is` remains outstanding.

## 2026-11-26 — Social feed hydration extraction (M5)

- Moved server feed fetching, merge, abort handling, and feed loading state into `features/social/hooks/useSocialFeedStore.ts`; `App.tsx` now coordinates catalog/feed refresh without owning feed state transitions.
- Preserved concurrent initial/pull-to-refresh requests, local post persistence, server-first de-duplication, and the existing feed loading contract.
- `npm.cmd run lint` and `git diff --check` passed. Live browser preview of `/portal/social` rendered stories, composer, and posts on mobile viewport; the feed loading state completed. The environment still logs profile-sync 503 because local profile DB synchronization is unconfigured.
- M5 remains partial: wallet deductions stay server-verified/paused, and the app shell still owns navigation, modal, and cross-feature orchestration.

## 2026-11-26 — Primary viewport refresh hook extraction (M5)

- Added `app/hooks/usePrimaryViewportRefresh.ts` to own initial catalog/feed refresh coordination, request cancellation, pull gesture threshold/state, and refresh indicator timing.
- `App.tsx` now consumes the app-level hook and renders its existing pull-to-refresh indicator; catalog and social data behavior remain in their feature stores.
- `npm.cmd run lint` and `git diff --check` passed. Live mobile preview verified the feed remained visible, drag past threshold showed “Release to refresh,” release showed the refreshing state, and the indicator returned to idle.

## 2026-11-26 — Temporary cash-on-delivery checkout

- Made standard cart checkout COD-only for registered and guest buyers; old guest drafts are normalized to COD. Removed the checkout gateway modal/options without changing payment gateway or wallet services.
- New order requests now default to COD and reject explicitly requested online methods; reorders are also COD. Added a backend regression test for online-method rejection and asserted the default order method.
- Live localhost preview verified the cart shows “Cash on Delivery,” explains payment is due to the courier, and exposes no card/mobile-wallet options. No order was submitted during preview, avoiding a persistent test order.
- `npm.cmd run lint`, backend TypeScript checking, and `git diff --check` passed. `npm.cmd run test:security` was attempted: 17 tests passed, while 20 HTTP tests (including order tests) failed because local test-server fetches returned proxy `502` responses; route behavior therefore remains unverified by that suite in this environment.
- This is a temporary standard-cart checkout mode only. Wallet, escrow, service, wholesale, and payment-provider APIs were not modified; do not treat them as COD-enabled.

## 2026-11-26 — Product details gallery and responsive layout

- Corrected Samsung Galaxy S24 Ultra imagery in the product seed and master-catalog fallback; removed unrelated seller photos so choosing an offer does not add another phone model to the gallery. The seeded local catalog also refreshes this product's image fields when older browser storage is loaded.
- Added attribution links for the CC BY-SA 4.0 Commons product photos. Product information tabs, seller selection, and cart-based COD actions remain unchanged.
- Product details stay in one column below `xl` and use a side-by-side gallery/details layout at `xl` and above; the gallery uses a 16:10 mobile frame, 4:3 from `sm`, and square framing on `2xl`. Purchase actions share a compact row.
- Frontend type-check and staged/unstaged `git diff --check` passed. Live preview at mobile (430px) and desktop (1024px) confirmed no horizontal overflow, both product images load, and the 3-offer comparison updates the selected seller, price, and delivery estimate. Overview, Specifications, Reviews, and Q&A tabs were checked; an unknown product ID shows Product Not Found. No order was submitted.
- Added data-driven storage, color, and volume selectors with color swatches, unavailable-combination disabling, variant SKU/price display, and variant-aware cart identity. Live preview confirmed iPhone 512 GB at ৳205,000, unavailable Blue Titanium, and soybean oil at ৳180/৳360/৳840 for 1/2/5 Litre. A 512 GB item displayed its selected variant and price in the cart, then the temporary test item was removed; no order was placed.
- At 430px, the mobile product gallery, selectors, and COD actions remain usable with no horizontal overflow. Live profile-sync requests still log the expected 503 because profile database sync is not configured in this preview. Production order pricing currently resolves seller-listing base prices and does not validate `selectedVariant` against master-catalog variant offers; do not treat variant-specific checkout pricing/stock as server-authoritative until the seller-level variant pricing model is defined and wired through order validation.
- Compact product details with verified-stock and warranty marks, tighter spacing, icon tabs, and a 48px Add-to-bag control beside the labeled Cash-on-Delivery purchase button. Save/Compare controls now sit beside the rating/stock row instead of above the photo; their actions remain available. At 360px, document width remained 345px; 512 GB selection updated the price to ৳205,000 and unavailable colors stayed disabled. No order was submitted.
- Moved variant controls directly below product identity, before price and seller offers. Color choices use compact swatch chips with short visible labels and full accessible names. Removed the outer details-card frame and expanded the product route into the available desktop width by hiding its unrelated right rail while retaining left navigation. Live preview at 320px and 360px showed all color choices above bottom navigation with no horizontal overflow (document widths 305px and 345px); at 1440px the main content measured 1065px with a two-column product layout. Selecting 512 GB still updates the price; no order was submitted.
- Removed the separate pre-gallery action strip and moved desktop Back into the product metadata row. Reduced Product Details shell spacing so the first photo starts 13px below the mobile header at 360px; wishlist and compare remain available as compact buttons in the rating/stock row.

## 2026-11-26 — Route-level back-button consistency

- Mobile nested routes (Product Details, Settings, and Public Storefront) now use one contextual back control in the main header; their in-page route-level back controls remain available on desktop only. Product header shows the selected product title/category, and public profile header shows the handle.
- Primary tab roots (Marketplace, Explore, Services, and Transit) rely on the app's bottom navigation instead of showing a redundant Back button. Secondary utility routes retain the mobile header back. Back targets fall back to Marketplace for a directly opened product and Feed for other direct-entry detail routes when browser history is unavailable.
- Back controls have 44px touch targets and visible keyboard focus; the bottom navigation has an accessible landmark name. Settings' “Back to Settings Menu” stays because it returns within the Settings flow rather than leaving the route.
- Live preview confirmed Product Details back returns to Marketplace, mobile Settings has a single route-level back, Public Storefront has a contextual main-header back, and Marketplace/Services roots have no global back. At 360px the product page has no horizontal overflow (document width 345px). Frontend type-check and staged/unstaged `git diff --check` passed.

## 2026-11-26 — Shared card visuals and action rows

- Added shared card surface, media frame, action bar, and accessible icon-button primitives. Retail product, social post, wholesale, sponsored, hub, inventory, service, demand, creator, and ride cards now share the visual treatment while retaining domain-specific content and primary actions.
- Retail and social action rows sit directly below the media. A shared product action-row component centralizes wishlist, reviews/Q&A, cart, and share behavior for both marketplace cards and public storefront products; unsupported product actions remain hidden for demand, used, service, and ride listings. Social-post saves persist locally.
- Live preview checked marketplace retail cards at 320px, 360px, 480px, and desktop widths; wholesale and public-storefront cards at 360px; and social feed cards at 320px, 360px, 480px, and desktop widths. The document stayed within the viewport and action buttons stayed within their rows. A 360px product review action opened Product Details with Reviews & Q&A selected. No order was submitted.
- Frontend type-check and `git diff --check` passed. The existing profile-database synchronization 503 warning remains unrelated to card rendering.

## 2026-11-26 — Shared button primitives and mobile navigation

- Added reusable `Button`, `ButtonLink`, and accessible `IconButton` primitives with consistent variants, sizing, focus, and disabled states; exported them through the design-system component index.
- Replaced repeated CTA styles across shared ads/banners, navigation, search, and mobile header controls. Badge counts and each control's existing action remain specific to its feature.
- Live preview at 360px verified the Product Details back/cart controls (44px and 36px targets), then the social feed menu/search/wishlist/cart controls (44px and 36px targets). Both routes stayed within the 345px document viewport; no horizontal overflow appeared.
- Frontend TypeScript validation (`npm.cmd run lint`) and `git diff --check` passed. `npm.cmd run build:frontend` remains blocked because the installed Recharts dependency tree cannot resolve `react-is`; the build also reports an existing oversized main chunk.

## 2026-11-27 — Vendor API client module placement

- Moved the vendor API client into `features/vendors/services/` and routed direct consumers through the feature barrel; the public feature API and runtime behavior remain unchanged.
- Confirmed no imports remain at the old path. Frontend TypeScript validation and `git diff --check` passed.

## 2026-11-27 — Shared form control primitives

- Added reusable `FormInput`, `FormTextArea`, and `FormSelect` controls for the shared border, radius, and focus treatment. Reused them in guest checkout and Bangladesh administrative-area fields without changing field values or handlers.
- Live preview at 390px opened the saved-address form and verified the shared division/district selects and input fields render without horizontal overflow. No address was saved.
- Frontend TypeScript validation and `git diff --check` passed.

## 2026-11-27 — Shared status badges

- Added a reusable `Badge` primitive with neutral, accent, success, warning, and danger tones plus compact size options. Adopted it for demand urgency and selected social-post status labels.
- Live Social Feed preview showed the Sale badge aligned in the post header without clipping. Frontend TypeScript validation and `git diff --check` passed.

## 2026-11-27 — Shared empty state for browse results

- Added a reusable `EmptyState` component for icon, title, description, and optional action layouts, then replaced duplicated no-results panels in Demand Board and Nearby Radar.
- Preserved each page's localized copy and action behavior. Live preview at 390px confirmed both no-result states; document width stayed at 375px. On Demand Board, the Post Demand action remained above the fixed mobile navigation after compacting vertical spacing.
- Frontend TypeScript validation and `git diff --check` passed.

## 2026-11-27 — COD first-slice persistence gate

- Selected signed-in retail customers and Cash on Delivery as the first release slice; guest checkout remains unavailable until persistent guest-order support is designed.
- Order creation now rejects unauthenticated requests, verifies idempotency-key ownership, requires a durable order insert before returning success, and fails closed when live catalog pricing cannot be resolved. Reorder also requires successful persistence.
- The checkout drawer now explains the sign-in requirement. Production no longer falls back to local demo catalog entries or development discovery listings; an unavailable catalog displays a user-facing notice.
- Added a shared bilingual “Coming soon” notice and direct-route gates for deferred social, services, logistics, seller, finance, messaging, demand, nearby, and public-storefront surfaces. Saved navigation into a deferred area now opens the marketplace instead; the wholesale marketplace child also shows the notice.
- Wallet, seller-onboarding, and RFQ shortcuts now route to their gated pages instead of opening the unfinished feature modals.
- Added the missing root `react-is` dependency required by Recharts; the root lockfile was reconciled. The production frontend/backend build and frontend/backend TypeScript checks passed, with a non-fatal large-chunk warning.
- `git diff --check` passed. The targeted HTTP security test was attempted but the sandbox proxy returned 502 for loopback requests, so order API behavior remains unverified here. npm reported four high-severity advisories. No staging, migration, or deployment was performed.

## 2026-11-28 — Production payment sandbox guard

- Updated `isPaymentSandboxAllowed()` to reject sandbox mode in production even when `PAYMENT_SANDBOX_MODE=true`; explicit sandbox overrides remain available outside production.
- Added a regression test for the production override case. The focused test, backend TypeScript check, and `git diff --check` passed.

## 2026-11-28 — Verified-email super-admin promotion

- Allowlisted email addresses now receive the email-based super-admin role only when Firebase's verified-email claim is true.
- Added regression coverage for unverified, missing, case-insensitive verified, and non-allowlisted addresses. The focused test, backend TypeScript check, and `git diff --check` passed.

## 2026-11-28 — Fail-closed order status persistence

- Order status and tracking state now change only after the database confirms the status update. A failed persistence returns `503` and does not cache a fallback order.
- Added deterministic unit coverage for failed and successful persistence. The focused test, backend TypeScript check, and `git diff --check` passed.
- An HTTP route test attempt returned `502` from the sandbox proxy for the local server, so route-level HTTP behavior remains unverified here.
