# PaikarMart Architecture Audit

**Audit date:** 2026-11-26  
**Repository:** `absmunna/PaikarMart`  
**Audited revision:** `657cda65bb6c7577a1faa6633fad46bd9de2353e`  
**Branch at audit start:** `main`  
**Scope:** Read-only repository and architecture comparison. No source code, database, deployment, or Git branch changes were made for this audit.

## Executive summary

The repository already has a recognizable feature-first monorepo structure: frontend hubs and categorized portals, backend domain routers, shared contracts, Firebase/Supabase integrations, and root deployment configuration. A full rewrite or broad directory move is not justified. Preserve current paths while stabilizing critical runtime boundaries, then migrate one domain at a time.

The highest-priority gaps are delivery OTP disclosure, non-atomic financial writes and payment-success handling, and order persistence/pricing fallbacks. The production publishing workflow also contains a destructive copy sequence. These risks should be addressed before structural refactoring or production financial use.

## Audit baseline and limits

- At audit start the worktree had **63 pre-existing dirty entries**: 57 modified files and 6 untracked entries. They include prior UI, profile, feed, and administrative-area work. Treat all as user work; do not reset, stash, overwrite, or delete them without approval.
- The repository was on `main`; no branch was created because this request is audit-and-plan only.
- The architecture specification exists at [`documents/ARCHITECTURE_AND_MODULARITY.md`](../../documents/ARCHITECTURE_AND_MODULARITY.md), not at the requested `docs/architecture/PAIKARMART_MODULAR_ARCHITECTURE.md` path. The current report uses the existing specification as the comparison baseline and does not create a second competing architecture source.
- Findings are based on checked-in/current-worktree source and configuration. No live Firebase, Supabase, payment provider, courier, or hosting environment was accessed. No secret values were read.
- Build commands were not run because they write generated output. Test limitations are recorded under Verification.

## Severity-ranked findings

### P0 — Release-blocking security and financial-integrity risks

| ID | Finding and evidence | Required direction |
|---|---|---|
| A-01 | **Delivery OTP is exposed by shipment reads and failed verification responses.** `GET /shipments/:orderId` has no authentication middleware and serializes the full shipment record, including `deliveryOtp` ([`logisticsRoutes.ts`](../../apps/backend/modules/logistics/logisticsRoutes.ts#L131), [`logisticsService.ts`](../../apps/backend/modules/logistics/logisticsService.ts#L590)). The OTP mismatch response also includes the expected code. The verification handler does not establish that the caller is the order recipient or assigned courier before processing the POD. | Return a zero-PII public tracking projection only; never include OTP in responses or errors; load the persisted shipment; authorize the recipient/assigned courier; add tests for anonymous and unrelated authenticated callers. |
| A-02 | **Ledger and escrow mutations span separate database requests rather than one atomic transaction.** Wallet credit updates `profiles.wallet_balance` before inserting `wallet_transactions` ([`walletService.ts`](../../apps/backend/modules/wallet/walletService.ts#L614)); escrow hold debits a profile, inserts an escrow record, then inserts a ledger row ([same file](../../apps/backend/modules/wallet/walletService.ts#L798)); release changes escrow state, credits the vendor, then writes a transaction ([same file](../../apps/backend/modules/wallet/walletService.ts#L904)). Partial failures can leave a balance, escrow status, and ledger inconsistent. | Move each financial operation into a database transaction/RPC with durable idempotency and audit rows. Add failure-injection and concurrency tests before enabling live finance. |
| A-03 | **Payment verification can return success when wallet credit failed.** `/verify` marks the in-memory session completed, catches a failed persistent wallet credit without surfacing it, then continues to a success response ([`paymentRoutes.ts`](../../apps/backend/modules/payment/paymentRoutes.ts#L280)). | Persist verified gateway state and ledger result atomically or durably queue/retry it. Do not report a credited/successful wallet deposit until the ledger write is confirmed; expose a retryable/pending state. |

### P1 — Major functional, deployment, or architecture risks

| ID | Finding and evidence | Required direction |
|---|---|---|
| A-04 | **Order creation can fall back to caller-supplied prices and process-local state.** `calculateAuthoritativeOrderTotals` falls back to item prices if a listing is unavailable or the database lookup fails; `POST /api/orders` uses `optionalFirebaseAuth`; order records are also stored in `serverOrders`, while `insertStoredOrder` logs/ignores persistence errors ([`orderRoutes.ts`](../../apps/backend/modules/orders/orderRoutes.ts#L138), [`orderRoutes.ts`](../../apps/backend/modules/orders/orderRoutes.ts#L206), [`dbService.ts`](../../apps/backend/services/dbService.ts#L115)). `GET /:id`, status updates, and idempotency lookups use the process-local array. | Require authoritative active listings for paid orders; define a separately authenticated guest-token contract if guest checkout is retained. Persist order creation, status, idempotency, and shipment linkage before returning success. Never use client price as a production fallback. |
| A-05 | **Payment-session state is process-local.** `paymentSessions` is a `Map` used by initiation, verification, and callbacks ([`paymentRoutes.ts`](../../apps/backend/modules/payment/paymentRoutes.ts#L27)). A restart or multiple backend instances can lose or fail to find a session. | Add a durable payment-session repository/table with unique idempotency keys and explicit pending/verified/failed transitions; preserve the existing `/api` and `/api/v1` contracts. |
| A-06 | **Production asset publishing removes its source before copying it.** The workflow builds the frontend, then runs `rm -rf apps/frontend/dist` immediately before copying `apps/frontend/dist` to a temporary directory ([`publish-prod.yml`](../../.github/workflows/publish-prod.yml#L40)). This sequence cannot publish the just-built output as written. | Correct the workflow using a staging directory and validate it in a non-production branch. Do not change the production branch during the audit. |
| A-07 | **The SQL schema and Prisma schema are not 1:1, and no versioned Supabase migration directory exists.** `supabase/schema.sql` defines tables absent from the Prisma schema (including saved addresses, vendor memberships, identity verification/documents, notifications, analytics, file assets, and RFQs); the saved-address/store area columns also have no Prisma counterpart. The architecture and database documents claim a synchronized mirror. | Treat existing SQL/data as authoritative until a table/column/RLS diff is reviewed. Add versioned, backward-compatible migrations and then reconcile Prisma; do not regenerate or apply a schema wholesale. |
| A-08 | **Escrow release is not tied to verified POD.** The authenticated release route calls `releasePersistentEscrow` based on buyer/privileged authorization, while the separate POD flow uses an in-memory release helper. The API boundary does not require the persisted shipment’s verified OTP/POD before releasing escrow ([`escrowRoutes.ts`](../../apps/backend/modules/escrow/escrowRoutes.ts#L92), [`logisticsService.ts`](../../apps/backend/modules/logistics/logisticsService.ts#L610)). | Define one authoritative order → shipment POD → escrow release transition and enforce it server-side in the same durable transaction. Keep a documented buyer-confirmation exception only if product requirements explicitly approve it. |

### P2 — Maintainability, reproducibility, or documentation drift

| ID | Finding and evidence | Required direction |
|---|---|---|
| A-09 | **The requested architecture-document path is absent, while an equivalent guide is maintained under `documents/`.** This creates an unclear canonical location, not a missing architecture baseline. | Select one canonical path after approval. Keep the existing guide authoritative or move it once with links updated; do not maintain two independent architecture specs. |
| A-10 | **The repository is a single-root npm install, not a configured package workspace.** Root `package.json` has no `workspaces`; both `package-lock.json` and `bun.lock` exist; app/package directories have no package manifests. `packages/database/index.ts` imports `@prisma/client`, but that dependency is absent from the root manifest/installed tree. | Keep current root installation/deployment intact during refactoring. Decide on a package manager and workspace linking separately; do not add internal package imports until dependencies and deployment builds are validated. |
| A-11 | **Design-system directories are currently facades over implementation directories.** `design-system/components/index.ts` re-exports `components/shared/*`; `design-system/layouts/index.ts` re-exports `components/layout/*`; `contexts/AppProviders.tsx` re-exports `app/providers/AppProviders.tsx`. These are compatibility surfaces, not proven duplicate implementations. | Preserve these facades. If implementations move later, retain re-exports until all static and dynamic consumers are checked. |
| A-12 | **Deployment configuration is inconsistent with the documented Firebase Hosting topology.** Actual [`firebase.json`](../../firebase.json) configures Firestore and Storage rules but has no `hosting` target, while the deployment document describes Firebase Hosting of `apps/frontend/dist`. | Confirm whether Firebase Hosting remains a supported target. If yes, add its configuration in a separate reviewed change and validate its SPA rewrite/rules deployment. |
| A-13 | **Backend route ownership is only partly modularized.** `server.ts` mounts domain routers and compatibility aliases, but also owns feed persistence handlers and catalog AI verification directly ([`server.ts`](../../apps/backend/server.ts#L189)). Several modules call across domains (orders → retail/vendor/logistics; payment/escrow/logistics → wallet). | Preserve routes and aliases; extract inline handlers into domain modules and define service/repository contracts one module at a time. Avoid a broad controller rewrite. |
| A-14 | **Automated verification is incomplete and the local environment blocked some checks.** Root `lint` checks only frontend TypeScript; CI builds only the frontend. The backend has four security test files but no backend test/typecheck gate in the workflow. Backend type-check currently cannot resolve `express-rate-limit` because it is not installed locally, despite being declared in the manifest. | Restore dependencies in an approved validation run, then add backend type-check/tests to CI. Do not interpret sandbox-blocked HTTP tests as application pass/fail. |

## Architecture comparison

### Areas aligned with the specification

- Frontend is organized into `app`, `design-system`, `features`, `hubs`, `portals`, `shared`, `types`, `lib`, and `data`.
- Portal directories already follow commerce, services, logistics, community, and utilities groupings.
- Router declarations are centralized in `app/router/routeManifest.tsx`; compatibility paths are explicit.
- Seller routes use `RoleGuard`; account, wallet, order, message, profile, settings, and notification routes use `AuthGuard`.
- Backend has a centralized server entrypoint, typed environment configuration, middleware, domain routers, and database service.
- Firebase default-deny rules and owner-scoped storage rules are present. Supabase policies and backend Firebase authentication are present.
- No `@/portals` or `@/app` imports were found under `features`; no `@/features` imports were found under `design-system`. Backend references to frontend paths are static asset-path resolution only, not source imports.
- Versioned `/api/v1/*` aliases are mounted alongside the existing `/api/*` routers and must be preserved.

### Areas that need clarification or incremental alignment

- Route and architecture documentation are not at the paths specified by the master prompt; the existing architecture document remains the nearest source of truth.
- `packages/shared` is a shared source directory, but package-manager workspace linking is not configured.
- The Prisma file is not a faithful mirror of the current SQL schema; no migration history was found.
- Financial and order flows retain in-memory paths and are not uniformly database-authoritative.
- UI folders have a real implementation/facade split; duplicate-looking files are not sufficient evidence for deletion.

## Verification performed

| Check | Result |
|---|---|
| Frontend TypeScript (`npm run lint`) | Passed. |
| Frontend area tests (5 tests in current untracked worktree test file) | Passed. |
| Backend TypeScript (`npx tsc --noEmit --project apps/backend/tsconfig.json`) | Blocked: `express-rate-limit` is declared but absent from the local installed dependency tree. No dependency installation was performed. |
| Backend security suite (`npm run test:security`) | 8 passed, 15 could not complete their HTTP assertions. Loopback requests were denied with `EACCES` by the active sandbox; an initial run also hit sandbox proxy `502`. These results do not establish application behavior. |
| Build | Not run during this audit because it writes generated assets/bundles. |
| Live database / deployment / provider verification | Not run; no live services were accessed. |

## Audit conclusion

Do not begin file relocation or deletion yet. First approve the migration plan, establish a clean baseline without discarding the 63 pre-existing dirty entries, and address the P0 financial/POD issues. See [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md), [`MODULE_DEPENDENCY_MAP.md`](./MODULE_DEPENDENCY_MAP.md), and [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).
