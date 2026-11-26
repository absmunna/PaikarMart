# PAIKARMART MODULAR ARCHITECTURE SPECIFICATION

**Status:** Approved Target Architecture Baseline (Preserves Existing Routes, Integrations & Deployment)  
**Repository:** `https://github.com/absmunna/PaikarMart`  
**Base Commit Snapshot:** `main` @ `657cda65bb6c7577a1faa6633fad46bd9de2353e`  
**Supersedes / Aligns With:** `documents/ARCHITECTURE_AND_MODULARITY.md`

---

## 1. Architectural Principles & Non-Breaking Invariants

1. **Preserve Working Product & Contracts:** Every existing route (`/portal/*`, `/hub/*`, `/u/:handle`, `/store/:storeId`, `/settings`), REST endpoint (`/api/*` and `/api/v1/*`), Firebase Auth flow, Supabase PostgreSQL schema, payment integration (bKash, Nagad, SSLCommerz), and wallet/escrow behavior remains intact and backward-compatible.
2. **Single Canonical Implementation per Concern:** Eliminate split-brain implementations (e.g., duplicate guards, dual RFQ endpoints, in-memory fallbacks masquerading as financial truth, duplicate upload paths) without breaking existing consumers.
3. **Directory Preservation Where Safe:** Existing root-level directories (`apps/frontend`, `apps/backend`, `packages/shared`, `packages/database`, `supabase/`) are preserved to avoid unnecessary churn in `package.json`, `vercel.json`, `render.yaml`, `firebase.json`, and AI Studio runtime tooling.
4. **Database as Financial & Operational Source of Truth:** Wallet balances, ledger entries, escrow holds/releases, payment sessions, orders, RFQs, KYC applications, return pickups, and moderation queues must persist atomically in PostgreSQL (Supabase RPC / transactions). In-memory `Map` or array fallbacks must never execute silent fake financial mutations in production.
5. **Strict Layering & Domain Boundaries:**
   - Frontend: `app/` -> `hubs/` -> `portals/` -> `features/` -> `design-system/` & `shared/` & `types/` & `lib/` & `data/`.
   - Backend: `server.ts` -> `modules/<domain>/{routes, controller, service, repository, schemas, types}` + shared `config/`, `middleware/`, `services/`, `integrations/`.
   - Frontend code NEVER accesses privileged database operations (`SUPABASE_SERVICE_ROLE_KEY`, admin mutations) directly.

---

## 2. Target Repository Structure

```text
/
├── package.json                        # Single root build/dev/lint/test orchestrator
├── .env.example                        # Verified env var contract (no secrets)
├── firebase.json / firebase-applet-config.json / firebase-blueprint.json / firestore.rules / storage.rules
├── render.yaml / vercel.json / metadata.json
├── docs/architecture/                  # Authoritative restructuring & audit documentation (this directory)
├── supabase/
│   ├── schema.sql                      # Canonical PostgreSQL DDL + atomic RPCs + RLS
│   └── migrations/                     # Backward-compatible incremental SQL migrations
├── packages/
│   ├── shared/src/                     # SSOT DTOs, enums, RBAC helpers, validation schemas, formatters
│   └── database/prisma/schema.prisma   # Synced 1:1 with supabase/schema.sql
├── apps/
│   ├── backend/
│   │   ├── server.ts                   # Express + CORS + Helmet-style security + /api & /api/v1 mounts + Vite dev middleware
│   │   ├── config/                     # env.ts, supabaseAdmin.ts
│   │   ├── middleware/                 # requireFirebaseAuth.ts, rateLimit.ts, sanitize.ts, securityHeaders.ts, audit.ts
│   │   ├── integrations/               # External providers (geminiClient, payment gateways, courierAdapters, firebaseAdmin)
│   │   ├── services/                   # Shared DB adapter & logger (dbService.ts, logger.ts)
│   │   ├── modules/                    # Domain-isolated backend modules:
│   │   │   ├── auth/                   # Session/profile sync, saved addresses, role promotion
│   │   │   ├── users/ (identity/)      # Citizen KYC verification, public handle lookup, privacy filtering
│   │   │   ├── social/                 # Feed posts, comments, stories, reactions (extracted from server.ts)
│   │   │   ├── catalog/                # PMIN Master Catalog, buy-box projection, AI catalog audit
│   │   │   ├── retail/                 # Reviews, Q&A, vouchers, prescriptions, retail offers
│   │   │   ├── wholesale/ (rfq/)       # Unified B2B RFQ, MOQ tiered slabs, sample requests
│   │   │   ├── vendors/                # Storefronts, multi-store memberships, seller KYC queue
│   │   │   ├── orders/                 # Authoritative pricing, checkout, idempotency, lifecycle state machine
│   │   │   ├── wallet/                 # Persistent BDT ledger, PK Coins, atomic balance RPCs
│   │   │   ├── payment/                # Persistent payment_sessions, bKash/Nagad/SSLCommerz gateway callbacks
│   │   │   ├── escrow/                 # Order escrow holds, POD release, dispute arbitration
│   │   │   ├── logistics/              # Rides, courier waybills, dispatches, return pickups, POD
│   │   │   ├── messaging/              # Persistent buyer-vendor-rider threads & ACL enforcement
│   │   │   ├── notifications/          # Persistent user notifications & read state
│   │   │   ├── analytics/              # Event ingestion & vendor/platform analytics
│   │   │   ├── storage/                # Canonical signed asset upload/download (unified with auth/upload-asset)
│   │   │   └── ai/                     # Auth-gated AI copilot, search/maps grounding, moderation queue
│   │   └── tests/                      # Security, financial, order & domain unit/integration tests
│   └── frontend/src/
│       ├── app/                        # Bootstrap, AppProviders, Guards, Canonical Router (routeIds, routeManifest)
│       ├── core/ or shared/            # ApiClient, error boundary/handling, hooks, pure utilities (zero app/ or domain imports)
│       ├── design-system/              # Tokens, UI primitives, App Shell layouts (TopNavbar, BottomNav, Sidebars)
│       ├── types/                      # Frontend TypeScript domain types
│       ├── contexts/                   # Theme, Language, Location, Settings providers (re-exported via AppProviders)
│       ├── lib/                        # Pure infrastructure SDK singletons ONLY (firebase.ts, supabase.ts)
│       ├── data/                       # Locales (en, bn), static geo/category data, non-authoritative demo fallbacks (strictly gated)
│       ├── features/                   # Canonical domain feature modules (hooks, services/api, store, components, types)
│       │   ├── auth/
│       │   ├── identity/
│       │   ├── marketplace/            # Shared commerce state/cart/catalog APIs/cards
│       │   ├── b2b/
│       │   ├── services/
│       │   ├── logistics/
│       │   ├── inventory/
│       │   ├── vendors/
│       │   ├── governance/
│       │   ├── social/
│       │   ├── demand/
│       │   ├── messaging/
│       │   ├── wallet/
│       │   ├── notifications/
│       │   ├── ai/ & ai-voice/
│       │   └── pwa/
│       ├── hubs/                       # Hub discovery shells & registry metadata (portalRegistry.ts)
│       └── portals/                    # Category-aligned portals mapped to 6 business domains (preserving URLs)
```

---

## 3. Core Foundation Standards (Phase 3 Target)

1. **Shared API Client (`apps/frontend/src/shared/services/apiClient.ts`):**
   - Replaces duplicated `API_BASE` + `getAuthHeaders()` logic across 10+ `*ApiClient.ts` files.
   - Automatically attaches Firebase ID Token (`Authorization: Bearer <token>`), handles JSON parsing, structured error normalization (`ApiError`), and optional `X-Idempotency-Key` support.
2. **Router & Guards (`apps/frontend/src/app/`):**
   - Single router source of truth in `app/router/routeManifest.tsx` and `app/router/routeIds.ts`.
   - Single canonical `AuthGuard` and `RoleGuard` implementation in `features/auth/components/`, re-exported cleanly by `app/guards/` for bootstrap clarity (never duplicated logic).
   - Add `<GovernanceGuard>` (`RoleGuard requiredMode="governance"`) and `SuperAdminControlModal` route/role consistency (`abs.munna1@gmail.com` super-admin claims synced with backend RBAC).
3. **Environment & Runtime Alignment:**
   - Unify AI Studio / local dev server default port to `3000` (matching `vite.config.ts` and AI Studio iframe policy) while honoring explicit `PORT` overrides on Render/Cloud Run (`10000` / `8080`).
   - Enforce fail-closed production guards in `apps/backend/config/env.ts` so financial/payment sandbox shortcuts cannot run when `NODE_ENV=production`.

---

## 4. Feature Modularization Rules (Phase 4 Target)

Each feature inside `apps/frontend/src/features/<feature>/` exposes a public barrel `index.ts` and uses only the folders it needs from:
`components/`, `pages/`, `hooks/`, `services/`, `api/`, `types/`, `schemas/`, `utils/`, `store/`, `tests/`.

- **App.tsx Decomposition:** Extract order/cart state, notifications state, and live feed/commerce hydration out of the 1178-line `App.tsx` monolith into domain hooks/stores under `features/` (`useCartStore`, `useOrdersStore`, `useCatalogFeed`, `useNotificationsStore`), leaving `App.tsx` purely as the layout shell + modal orchestrator + `<AppRoutes />`.
- **Canonical Component Deduplication:** Components in `components/layout/` and `components/shared/` stay cleanly surfaced via `@/design-system/layouts` and `@/design-system/components`. Portals import UI primitives from `@/design-system/*` and business actions from `@/features/*`, never calling `fetch` or `@/lib/firebase` directly inside presentational components.

---

## 5. Category-Based Portal Organization (Phase 5 Target)

All existing portals remain routed at their exact current URLs (`/hub/*`, `/portal/*`, `/u/:handle`, `/store/:storeId`, `/settings`), while cleanly categorized across the 6 business domains in `portalRegistry.ts` and portal documentation:

1. **Commerce:** B2B Wholesale (`/portal/wholesale`), B2C Retail & Product Detail (`/portal/retail`, `/hub/marketplace/product/:id`), Marketplace Hub (`/hub/marketplace`), Grocery (`/portal/grocery`), Pharmacy (`/portal/pharmacy`), Brand Shops (`/portal/brands`), Wishlist (`/portal/wishlist`), Nearby Radar (`/portal/nearby?hub=marketplace`).
2. **Services:** Local Services (`/portal/local-services`), Appliance Repair (`/portal/repair`), Health & Clinic (`/portal/clinic`), Food Delivery (`/portal/food`), Travel & Stays (`/portal/travel`), Services Hub (`/hub/services`).
3. **Digital:** Digital Products & Downloads (`/portal/digital`), AI Assistant / Grounding (`/hub/utility` & drawer), Creator Monetization & Assets (`/portal/creator`).
4. **Mobility & Logistics:** Ride Share, Courier Delivery, Cargo Freight, Fleet Partner Console (`/portal/transit`), Orders & Tracking Hub (`/portal/orders`), Nearby Logistics Radar (`/portal/nearby?hub=logistics`).
5. **Business Management:** Seller Central (`/portal/seller`), Seller Inventory & PMIN Attach (`/portal/seller/inventory`), Wallet & Escrow Management (`/portal/wallet`), Governance / Super Admin Console (modal/role-gated controls).
6. **Community & Social:** Social Feed (`/` & `/portal/social`), Stories, Demand & Offer Board (`/portal/demand`), Creator Studio (`/portal/creator`), Direct Messaging (`/portal/messages`), Community Hub (`/hub/community`), Explore (`/portal/explore`).

---

## 6. Backend Domain Architecture & Financial Safety (Phases 6–7 Target)

Every backend module follows clean separation:
`routes -> controller/validation -> service -> repository (Supabase Admin / RPC)`

1. **Persistence Mandatory Tables (Backed by `supabase/schema.sql`):**
   - `payment_sessions` (NEW migration table): Persistent checkout/deposit payment sessions replacing in-memory `paymentSessions` Map.
   - `rfqs` / `paikarmart_rfqs`: Unify `/api/wholesale/rfq` and `/api/rfq` onto persistent DB storage with buyer/vendor ACLs and verified escrow checks.
   - `conversations` & `messages`: Persist messaging threads instead of in-memory seeded maps.
   - `return_pickups` & `logistics_dispatches`: Wire `logisticsService.ts` strictly to DB tables rather than in-memory fallbacks.
   - `product_reviews` & `product_questions`: Persist Q&A + answers with vendor/admin role check; query `profiles` UUID via `resolveProfileUuidByAuthUid` instead of passing Firebase string UIDs to UUID columns.
   - `stores` & `vendor_memberships`: Remove in-memory `vendorStoreRegistry` and `kycApplicationQueue` split-brain; serve directly from `stores` + `profiles` + `escrow_records`.
2. **Atomic Financial RPCs (PostgreSQL):**
   - `credit_wallet_atomic(p_profile_id, p_amount, p_reference_id, p_type, p_description)`
   - `debit_wallet_atomic(p_profile_id, p_amount, p_reference_id, p_type, p_description)`
   - `release_escrow_atomic(p_escrow_id, p_actor_uid, p_pod_reference)`
   - Executed via `supabaseAdmin.rpc(...)` with row-level `FOR UPDATE` locking and unique `reference_id` idempotency constraints.
