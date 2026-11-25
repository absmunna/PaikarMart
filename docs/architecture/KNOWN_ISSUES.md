# PaikarMart Known Architecture and Safety Issues

This list captures issues found during the 2026-11-26 read-only audit. It is not a list of completed fixes.

## Release blockers

| ID | Severity | Issue | Status / first action |
|---|---|---|---|
| A-01 | P0 | Shipment endpoint returns complete shipment data including delivery OTP without authentication; invalid-OTP responses also disclose the expected code. POD authorization is not tied to the recipient/assigned courier. | Not fixed. Return a public tracking projection, remove OTP disclosure, and add ownership/role checks and tests. |
| A-02 | P0 | Wallet/escrow balance and ledger changes are separate database requests and can partially commit. | Not fixed. Move operations to atomic SQL RPC/transaction boundaries and test partial failures/concurrency. |
| A-03 | P0 | Payment verification can mark a session completed and return success while swallowing wallet-credit failure. | Not fixed. Make state/ledger completion durable and surface pending/retry/error state. |

## Major functional and deployment issues

| ID | Severity | Issue | Status / first action |
|---|---|---|---|
| A-04 | P1 | Order creation uses caller-supplied price fallback, optional auth, and process-local order state; persistence errors do not prevent success responses. | Not fixed. Define guest identity contract and require server-authoritative listing/order persistence. |
| A-05 | P1 | Payment sessions are held in a process-local `Map`. | Not fixed. Persist sessions and idempotency keys. |
| A-06 | P1 | `publish-prod.yml` deletes `apps/frontend/dist` before attempting to copy that directory. | Not fixed. Validate a staging-directory workflow off production. |
| A-07 | P1 | Prisma schema is not synchronized with `supabase/schema.sql`; no versioned Supabase migration directory was found. | Not fixed. Diff schemas and live state before creating safe migrations. |
| A-08 | P1 | Escrow release is not server-enforced as dependent on a persisted, verified POD/OTP. | Not fixed. Define and test one durable order/shipment/escrow transition. |

## Maintainability and validation

| ID | Severity | Issue | Status / first action |
|---|---|---|---|
| A-09 | P2 | Architecture document lives under `documents/`, not the requested `docs/architecture/` path. | Decide one canonical document location; avoid duplicate specifications. |
| A-10 | P2 | Root-only npm configuration coexists with `bun.lock`; workspace linking is not configured; optional database entrypoint imports an uninstalled Prisma client. | Decide package manager and workspace model before adding package imports. |
| A-11 | P2 | Design-system indexes and context/guard entrypoints re-export implementations from other directories. These are facades, not safe deletion candidates. | Keep until import/dynamic-reference audit proves deprecation safe. |
| A-12 | P2 | Firebase Hosting is described but no Firebase Hosting target is configured in `firebase.json`. | Confirm whether Firebase Hosting is supported and configure/test separately if needed. |
| A-13 | P2 | `server.ts` retains domain handlers while domain routers are mounted; some modules call across domain boundaries. | Extract incrementally, preserving route aliases and service contracts. |
| A-14 | P2 | CI runs frontend build only; backend type-check is blocked locally by missing `express-rate-limit`; local backend HTTP tests are blocked by sandbox loopback restrictions. | Restore declared dependencies and permit loopback tests in an approved validation environment; add backend checks to CI. |

## Not confirmed

- Live Supabase schema, RLS behavior, current production data, payment credentials, Firebase deployment state, and Render/Vercel configuration were not accessed.
- No file was confirmed safe to delete.
- No duplicate business implementation was proven solely from filenames.
- The frontend test file under `apps/frontend/tests/` is untracked at the audited worktree; it is not part of the audited commit.
