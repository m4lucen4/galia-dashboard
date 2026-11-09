# Protect project authority without redistributing access

T8 adds `20261109000200_project_authority_guard.sql`: a forward-only prerequisite
for trusting `projects.user` and `projects.assigned` during publication generation.
It does **not** implement assigned-editor generation access (T9), deploy anything,
or repair general tenant isolation. The original generation migration is unchanged.

## Behavior boundary

| Actor / operation | Result after the guard |
|---|---|
| Authenticated user creates their own project, omitting `id`, with null assignment | Allowed under existing RLS |
| Regular user creates for another owner or supplies any non-null assignment | Rejected, SQLSTATE `42501` |
| Any ordinary update with unchanged `id`, `user`, `assigned` | Original behavior and RLS; returned row is not rewritten |
| Owner or assigned editor changes owner/assignment | Rejected, even when assigning themselves |
| Admin creates/clones for another owner or changes owner/assignment | Allowed under existing RLS |
| Authenticated client, including admin, supplies an INSERT ID or changes an UPDATE ID | Rejected; an explicit INSERT `DEFAULT` is also rejected |
| Consistent service-role request or trusted maintenance session | Existing privileged authority/identity writes remain allowed |
| Ordinary DELETE | Unchanged; deleted IDs cannot be reclaimed by an authenticated INSERT |
| Dedicated public export | Existing restricted role, projection and policy are untouched |

Assignment means the UUID in `assigned`, not a `publisher` or other role literal.
The existing admin helper and userData role/UID guard are not replaced. Regular
creation cannot appoint any editor; explicit null assignment remains valid.
Admin/service writes retain their existing nullable-column semantics.

## Why identity permissions are part of authority protection

An UPDATE-only trigger is insufficient: broad DELETE plus explicit-ID INSERT
could replace another project's owner/assignment at the same identity.
The migration therefore:

1. Replaces only `anon`/`authenticated` table-level INSERT grants with authenticated
   column INSERT grants for **all current non-ID columns**. Anonymous INSERT is
   not granted. Existing SELECT/UPDATE/DELETE/TRUNCATE and export grants remain.
2. Rejects untrusted ID changes in a BEFORE trigger, including admin client changes.
3. Removes sequence UPDATE from PUBLIC/anon/authenticated, which blocks `setval`.
   USAGE (`nextval`) and SELECT remain. Identity/sequence ALTER and
   `TRUNCATE ... RESTART IDENTITY` require sequence ownership; synthetic PostgreSQL
   checks confirm this prevents resetting IDs without changing TRUNCATE privileges.

No rows, IDs, sequences, defaults, foreign keys or policies are rewritten. No shadow
ownership table is introduced. Future project columns need an explicit INSERT
column grant; do not restore table INSERT to make a new field work.

## Caller trust and deployment preflight

The trigger is SECURITY DEFINER with an empty search path. Its `current_user` would
be postgres, so it instead requires the actual `current_setting('role', true)` and
`auth.role()` to agree for authenticated/admin and service requests. Admin checks
also require a non-null `auth.uid()` and the existing private admin helper.
A service JWT claim alone is insufficient. Direct maintenance requires a real
`session_user` of postgres/supabase_admin with no SET ROLE or its own role; a
postgres test session using SET ROLE authenticated does not inherit this bypass.

The transaction uses a five-second lock timeout and locks projects while checking
its schema. Unexpected owner, identity/sequence shape, authority defaults, helper
metadata, INSERT/column/sequence-UPDATE grants, privileged API memberships,
triggers or rewrite rules fail closed. Effective privileges are checked again after
revocation. A sequence behind live IDs aborts rather than being reset. This is a
one-time migration, not an idempotent reconciliation script.

Before production application, independently confirm:

- The existing helper body still derives admin solely from protected userData;
  metadata validation is not a proof of its implementation or every callable RPC.
- External integrations use consistent service-role requests or approved direct
  maintenance sessions. SET ROLE service_role without a service JWT is not a
  trusted authority-changing request. Direct supabase_admin login was not exercised.
- No legitimate client supplies IDs (including explicit `DEFAULT`), transfers
  ownership or creates an assignment as a non-admin. Known project action writers
  omit IDs on creation and omit authority columns on normal edits; the real
  `assign_project_with_translations` RPC omits IDs and copies assignment.
- The existing sequence history and privileged integrations are trustworthy.
  Current live-ID checks cannot prove that a previously deleted ID was never
  recycled before this migration. Privileged services must not recycle identities.
- Actual PostgREST column-permission handling and external Odoo behavior are checked
  during the separately gated activation. No live database/API was used here.

## Local evidence and limits

Tests used synthetic PostgreSQL 17.11 in the isolated, networkless container
`galia-authority-01a1c184`, with production-shaped identity/grants, broad project
RLS, an admin helper, a dedicated export role and a fake transactional Odoo counter.
The existing translation migration supplied the **actual** admin clone RPC.
Temporary scripts/results are in `/tmp/galia-t8-rSjrnh/`; no test files were added
to the repository, consistent with its conventions.

- **RED:** baseline accepted owner hijack, self-assignment, ID rewrite and
  delete/reinsert replacement. The first ID-rewrite probe hit an existing
  translation FK (psql exit 3); one fixture correction used an unreferenced row.
- **GREEN:** 49 assertions passed, including ordinary owner/assigned edits,
  admin cloning with translations/media, service writes, anonymous behavior,
  explicit-ID/OVERRIDING/upsert/reset rejection and preservation of unrelated ACLs.
  Rejected operations asserted SQLSTATE `42501` and unchanged rows/counter.
- **Triangulation:** three checks passed for sequence-owner rejection of TRUNCATE
  RESTART, unchanged cross-tenant DELETE with denied ID reuse, and anonymous UPDATE.
  Three deliberate schema/grant/trigger drifts rejected migration application
  (expected psql exit 3); three checks confirmed atomic rollback.
- **Differential:** the same legitimate create/update/delete/admin-clone/service/
  export script produced byte-identical baseline and migrated output. Generated
  creation timestamps were excluded; IDs, other fields, translation content and
  integration-counter results were compared. An additional export-projection check
  preserved ID/title/description/media values and read-only column ACLs without
  exposing authority fields. Self-check caught an overly strict preflight that
  accepted export SELECT only on ID; one correction preserved SELECT grants on
  every already-exported column, and all focused checks were rerun successfully.
  A separate snapshot comparison kept
  original timestamps and confirmed original data, policies, column definitions,
  constraints, helper/RPC/export definitions and the Odoo trigger were unchanged.

PostgreSQL sequences are nontransactional: rejected default-ID INSERTs consumed
one number each in the tested cases. Explicit-ID permission failures, rejected
UPDATEs and reset attempts did not advance the sequence. Gaps are expected;
never reset it to hide them. Transactional fake counters do not prove that a real
external integration has no nontransactional side effects. These checks do not
establish compatibility with every external client or production Auth/PostgREST.

## Independent local verification

T10 applied exact migrations001–003 once in a fresh synthetic database and found no demonstrated product blocker. The bounded legitimate-flow differential matched baseline; ordinary creation/editing, admin clone, service writes and restricted export passed, while authority/identity attacks were denied. Four deterministic project-lock races verified assignment/admin revocation fencing. Proof: `/tmp/galia-t10-independent-W2hDpC/EVIDENCE.md`; probe-only failures retained in `PROBE-EXCEPTIONS.md`. Original001 hash remained unchanged. Parent full build passed; real Auth/PostgREST, browser, external Odoo and deployed execution are still unverified. This evidence does not turn the residual exposures below into solved problems.

## Residual exposure and recovery

**Preexisting cross-tenant project/preview read, ordinary edit and delete exposure
remains. This is not general data isolation.** Existing broad project TRUNCATE
privileges also remain. Authority protection does not make project content,
preview ownership or legacy orphan/mismatched preview records trustworthy. No
legacy preview data is quarantined, repaired or deleted. Publication activation
still requires the parent-owned T9/T10 and production security gates.

If preflight fails, the transaction leaves existing data and grants intact; inspect
the mismatch rather than weakening checks automatically. After application,
preserve the guard and repair a demonstrated legitimate flow with a reviewed
forward migration. Restoring broad INSERT/sequence UPDATE or removing the guard
reopens authority spoofing: keep the new generation path disabled if that becomes
necessary. Never roll back by deleting data, renumbering projects, resetting the
sequence or altering export/general RLS. The recovery boundary is this migration's
new function/trigger and its narrow INSERT/sequence-UPDATE ACL changes only.

## Key Learnings

- Authority protection includes creation and identity reuse, not just UPDATE.
- Column INSERT grants preserve known clients without granting ID selection.
- Security-definer caller checks must not confuse the function owner with the actor.
- Compatibility evidence and remaining tenant-isolation risks must stay separate.
