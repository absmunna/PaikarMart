# MODULE DEPENDENCY MAP

**Purpose:** Documents current dependencies (including detected boundary violations) vs. the enforced target dependency graph for Frontend, Backend, and Shared Packages.

---

## 1. Monorepo Package Dependencies

```text
packages/shared (SSOT types, RBAC predicates, handle helpers, DTO contracts)
   ▲                  ▲
   │                  │
apps/frontend      apps/backend
   │                  │
   └──── HTTP/REST ───┘  (/api/* & /api/v1/* JSON + Firebase Bearer Auth)
   │                  │
   ▼                  ▼
Firebase Auth     Supabase PostgreSQL (Service Role + RLS + RPC)
+ Firestore       + Supabase Storage + Payment/Courier Gateways + Gemini AI

packages/database (Prisma schema mirror — synced with supabase/schema.sql)
```

---

## 2. Frontend Layer Dependency Graph

### Target Strict One-Way Rule

```text
app/  (Bootstrap, Providers, Router, Route Guards)
  ├──► hubs/ (Mixed Feeds, Hub Shells, Portal Registry)
  ├──► portals/ (Category-grouped route pages)
  ├──► features/ (Domain hooks, API clients, stores, widgets)
  ├──► design-system/ (Tokens, Layout shells, UI primitives)
  ├──► contexts/ (Theme, Language, Location, Settings)
  └──► shared/ & types/ & lib/

hubs/     ──► portals/, features/, design-system/, shared/, types/
portals/  ──► features/, design-system/, shared/, types/   [NO direct lib/ or raw fetch]
features/ ──► design-system/, shared/, types/, lib/, data/, hubs/shared/* (metadata only)
              [NEVER imports portals/ or app/]
design-system/ ──► shared/, types/, contexts/ (tokens/theme/lang), icons
shared/   ──► types/ ONLY  [ZERO imports from app/, portals/, hubs/, features/, or lib/supabase mutations]
```

### Previously Detected Dependency Violations (Resolved in Phase 3–4)

| Source File | Prior Violation | Rule Restored | Applied Remediation |
|---|---|---|---|
| `apps/frontend/src/shared/hooks/useGuestSessionPersistence.ts` | `import { ROUTE_PATHS } from '@/app/router/routeIds'` | `shared -> types/constants` | Moved public route constants to `shared/constants/routes.ts` (**Resolved**) |
| `apps/frontend/src/shared/hooks/useEngagementAnalytics.ts` | `await supabase.from('analytics').insert(...)` | `shared -> API proxy` | Routed analytics events through `shared/services/apiClient.ts` -> `/api/analytics/event` (**Resolved**) |
| `apps/frontend/src/features/auth/hooks/useFirebaseSupabaseSync.ts` | Direct `supabase.from('profiles')` fallback | Auth/DB isolation | Relies on `/api/auth/profile` backend proxy cleanly (**Resolved**) |
| `apps/frontend/src/portals/utilities/user-profile/components/account/PersonalProfilePage.tsx` | Direct `@/lib/firebase` + `@/data/mockData` (`CURRENT_USER`) | `portals -> features` | Delegates through `features/auth` (`authProfileApi`) & `features/identity` (**Resolved**) |
| `apps/frontend/src/portals/utilities/user-profile/pages/ProfilePortal.tsx` | Direct `@/lib/firebase` (`uploadProfileAvatar`, Firestore writes) | `portals -> features` | Moved avatar/profile upload wrappers into `features/auth/services/authProfileApi.ts` (**Resolved**) |
| `apps/frontend/src/portals/utilities/seller-central/components/QuickAttachCatalogModal.tsx` | Direct `auth` + raw `fetch('/api/catalog/verify-product')` | `portals -> features` | Delegates through `features/marketplace/services/catalogApiClient.ts` (**Resolved**) |
| `apps/frontend/src/portals/utilities/seller-central/components/DocumentsVault.tsx` | Direct `uploadUserAsset` from `@/lib/firebase` | `portals -> features` | Delegates through `uploadComplianceVaultAsset` in `features/auth` (**Resolved**) |

---

## 3. Feature-to-Portal & Backend Module Dependency Matrix

| Portal / Hub Category | Frontend Feature Modules Used | Backend Domain Modules Called | Persistence Store |
|---|---|---|---|
| **Commerce** (`MarketplaceHub`, `WholesalePortal`, `Retail`, `Grocery`, `Pharmacy`, `BrandShops`, `ProductDetailsLanding`) | `marketplace`, `b2b`, `vendors`, `ai` | `catalog`, `retail`, `wholesale`, `rfq`, `orders`, `vendors` | Supabase (`master_products`, `seller_listings`, `product_reviews`, `paikarmart_rfqs`, `orders`) |
| **Services** (`ServicesHub`, `LocalServices`, `FoodDelivery`, `TravelStays`, `ApplianceRepair`, `HealthClinic`) | `services`, `marketplace` (cart/checkout), `ai` | `catalog`, `orders`, `vendors` | Supabase (`master_products`/services, `orders`, `stores`) |
| **Digital** (`DigitalGoodsPortal`, `CreatorPortal` digital monetization, `AiAssistantDrawer`) | `marketplace`, `ai`, `ai-voice` | `catalog`, `orders`, `ai`, `storage` | Supabase (`master_products`, `orders`, `file_assets`) + Gemini API |
| **Mobility & Logistics** (`TransitPortal`, `OrdersPortal`, `NearbyRadarPortal`) | `logistics`, `marketplace`, `wallet` | `logistics`, `orders`, `escrow`, `ai` (maps grounding) | Supabase (`orders`, `return_pickups`, `escrow_records`, courier webhooks) |
| **Business Management** (`SellerCentralPortal`, `SellerInventoryPage`, `WalletPortal`, Governance modals) | `inventory`, `vendors`, `wallet`, `governance`, `identity`, `b2b` | `vendors`, `catalog`, `wallet`, `escrow`, `payment`, `analytics`, `identity` | Supabase (`stores`, `vendor_memberships`, `seller_listings`, `profiles`, `wallet_transactions`, `escrow_records`, `payment_sessions`, `identity_verifications`) |
| **Community & Social** (`SocialPortal`, `CreatorPortal`, `MessagesPortal`, `DemandBoardPortal`, `ExplorePortal`, `NotificationsPortal`, `ProfilePortal`, `SettingsPortal`) | `social`, `demand`, `messaging`, `notifications`, `auth`, `identity`, `pwa` | `social` (extracted from `server.ts`), `messaging`, `notifications`, `auth`, `identity`, `storage` | Supabase (`social_posts`, `notifications`, `profiles`, `saved_addresses`, `conversations`, `messages`) + Firebase Auth/Firestore |

---

## 4. Backend Internal Dependency Graph

```text
apps/backend/server.ts
  ├── config/env.ts
  ├── middleware/{securityHeaders,sanitize,audit,rateLimit,requireFirebaseAuth}.ts
  ├── services/dbService.ts (Supabase Admin + Public client + profile UUID resolver)
  ├── integrations/{courierAdapters,paymentGateways,geminiClient,firebaseAdmin}
  └── modules/<domain>/
        ├── <domain>Routes.ts       (HTTP verbs, auth/role middleware, delegates to controller/service)
        ├── <domain>Schemas.ts     (Input validation & coercion)
        ├── <domain>Service.ts     (Business rules, pricing, RBAC/ACL, idempotency)
        └── <domain>Repository.ts  (Strictly typed Supabase Admin / RPC queries)
```

**Backend Cross-Module Allowed Imports:**
- `orders` -> may call `catalog` (authoritative pricing), `retail` (voucher eval), `wallet`/`escrow` (holds), `notifications`.
- `logistics` -> may call `escrow` (POD-triggered release), `notifications`.
- `payment` -> may call `wallet` (verified deposit webhook / atomic ledger credit), `orders` (payment confirmation), `notifications`.
- `wholesale` / `rfq` -> shares unified `rfqRepository`, verifies `escrow`.
- No module may import `server.ts` or any `apps/frontend/*` module.

### Observed boundary and deployment dependencies

| Boundary | Observed coupling | Desired rule |
|---|---|---|
| Server composition | `server.ts` mounts domain routers and also defines feed and catalog-verification handlers. | Keep server as composition root; route business behavior through domain routers. |
| Orders | Router owns persistence/fallback behavior and imports voucher, vendor, logistics and notification logic. | Keep order lifecycle in `modules/orders`; call explicit domain services through stable interfaces. |
| Payment and wallet | Payment routes invoke wallet ledger operations; session state is held in payment route memory. | Payment owns provider/session lifecycle; wallet owns ledger; persist both with idempotent transaction boundaries. |
| Escrow and wallet | Escrow routes delegate to `walletService`; logistics calls memory escrow helpers. | Establish one durable escrow service and a single POD-to-release flow; retain compatibility exports during migration. |
| Persistence | `services/dbService.ts` serves several modules. | Move queries into domain repositories only after caller inventory; keep compatibility facade until all call sites are migrated. |
| Shared contracts | `packages/shared` has common roles, area types and domain interfaces; frontend aliases it. | Use it only for cross-app contracts. Decide workspace linking before backend imports package names. |

## Data and deployment dependencies

- Firebase Authentication issues the identity token; backend middleware is the API authorization boundary.
- Supabase/PostgreSQL is intended as the relational source of truth; `supabase/schema.sql` defines RLS and tables.
- POD authorization compares the authenticated profile to the order owner or `shipment_waybills.assigned_courier_profile_id`; the additive migration is staging-only until verified.
- Firebase Firestore/Storage rules are separate policies and must remain deployed with their Firebase resources.
- `packages/database/prisma/schema.prisma` is kept as a mirror of the SQL entities; verify generated Prisma artifacts whenever SQL migrations change.
- Selected no-billing topology: Vercel Free frontend rewrites `/api/*` to Render Free; Supabase Free PostgreSQL is the relational database. Firebase remains on Spark without billing, and Firebase Hosting/Cloud Run are not deployment targets. Use only Firebase products currently available without billing; preserve `firebase.json` rules.
- GitHub Actions publishes a `prod-build` branch; its current copy step is inconsistent with its build output path.

## Compatibility constraints

1. Preserve all routes in `app/router/routeManifest.tsx`.
2. Preserve `/api/*` and `/api/v1/*` endpoints and response DTOs while extracting services.
3. Preserve Firebase/Supabase identities, database IDs, RLS rules, and existing rows.
4. Preserve current root package and deployment paths until workspace/deployment changes are separately approved.
5. Keep existing barrel/re-export facades while migrating imports.
