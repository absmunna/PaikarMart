# PaikarMart Module Dependency Map

This map records the observed dependency direction at the audit baseline. It is an architecture aid, not authorization to move files.

## Top-level runtime

```text
Root package.json / deployment hosts
├── apps/backend/server.ts
│   ├── config/{env,supabaseAdmin}
│   ├── middleware/{auth,rateLimit,sanitize,audit,securityHeaders}
│   ├── modules/* routers
│   └── services/dbService.ts ──> Supabase
├── apps/frontend
│   ├── main.tsx
│   ├── app/providers/AppProviders.tsx
│   ├── App.tsx ──> app/router/routeManifest.tsx
│   ├── hubs/* ──> portal registries, mixed feeds, portals/features
│   ├── portals/* ──> features, contexts, shared/design-system
│   ├── features/* ──> contexts, lib, data, shared, types
│   └── lib/{firebase,supabase}.ts
├── packages/shared/src/index.ts ──> shared roles/contracts/helpers
├── packages/database/prisma/schema.prisma
└── supabase/schema.sql
```

## Frontend dependency boundaries

| Layer | Observed responsibility | Allowed direction | Audit note |
|---|---|---|---|
| `main.tsx`, `app/providers`, `App.tsx`, `app/router` | Bootstrap, providers, app shell and canonical route manifest. | Imports hubs, portals, features, contexts and design system. | `routeManifest.tsx` centralizes routes and wraps protected routes. |
| `hubs/*` | Marketplace, Services, Community and Utility hub shells, registries and mixed feeds. | May consume portal pages, shared features, and UI. | Hub files are not duplicate full-page portal wrappers. |
| `portals/*` | Category-specific route pages and portal composition. | Consume feature APIs/components, shared context, UI and types. | Existing folders already map to Commerce, Services, Logistics, Community, Utilities. |
| `features/*` | Cross-portal auth, catalog, wallet, logistics, service, social, AI and vendor behavior. | Consume shared infrastructure/context/data/types; do not depend on portals or app shell. | Searches found no `@/portals` or `@/app` imports in this layer. |
| `design-system/*` | Theme tokens and shared UI/layout public surfaces. | Depend on concrete shared UI implementations; should not own portal/feature state. | Search found no `@/features` imports in design-system. Current indexes are facades. |
| `contexts/*` | Auth-adjacent app state (theme, language, location, settings). | Provider composition through app bootstrap; consumers across features and portals. | Avoid relocating providers until provider lifecycle and import graph are tested. |
| `lib/*`, `shared/*`, `data/*`, `types/*` | Infrastructure clients, cross-cutting helpers, fixtures/locales and frontend contracts. | Shared lower layers; avoid imports from portals. | `lib/supabase.ts` also includes localStorage helpers; separate responsibilities only with a focused migration. |

## Backend domain dependencies

```text
server.ts
├── auth / identity / vendors
├── catalog / retail / wholesale / RFQ
├── orders ──> retail voucher + vendor ownership + logistics + notifications + dbService
├── payment ──> wallet ledger + notifications
├── escrow ──> wallet service
├── logistics ──> wallet escrow helpers + dbService + courier adapters
└── AI / messaging / analytics / storage / notifications
```

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
- Firebase Firestore/Storage rules are separate policies and must remain deployed with their Firebase resources.
- `packages/database/prisma/schema.prisma` is documented as a mirror but does not currently match the SQL entities.
- Vercel rewrites `/api/*` to Render; Render builds the frontend/backend bundle; Firebase configuration currently declares Firestore/Storage rules only.
- GitHub Actions publishes a `prod-build` branch; its current copy step is inconsistent with its build output path.

## Compatibility constraints

1. Preserve all routes in `app/router/routeManifest.tsx`.
2. Preserve `/api/*` and `/api/v1/*` endpoints and response DTOs while extracting services.
3. Preserve Firebase/Supabase identities, database IDs, RLS rules, and existing rows.
4. Preserve current root package and deployment paths until workspace/deployment changes are separately approved.
5. Keep existing barrel/re-export facades while migrating imports.
