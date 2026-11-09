# Shared publication generation without broader access redistribution

T9 implements S7–S9 through forward migration
`20261109000300_generation_assigned_editor.sql` and a narrow dashboard integration.
Apply after immutable generation001 and the T8 authority guard002. Nothing here
has been deployed; no live SQL, OpenAI call or n8n change was performed.

## Authorization contract

| Operation | Required authority |
|---|---|
| Start, retry, receipt replay, active-job reuse | Verified current actor is project owner, current admin, or exactly `projects.assigned` |
| Job/slot SELECT | Same authority; owner/assigned also require a current parent matching the job's owner snapshot |
| Admin historical SELECT | Existing exception preserved, including missing/reowned parents |
| Claim/finish | Current parent owner still matches snapshot **and original initiating actor still has generation authority** |
| Assigned-only preview listing | Current parent exists, its owner matches preview owner, and its assigned UID matches Auth UID |
| Owned preview listing | Existing owned rows, including legacy orphan/mismatched rows |
| Admin preview listing | Existing unrestricted administrator list, unchanged |

Assignment is a UID relationship, **not a role literal**. An assigned photographer
is legitimate. Demoting an initiating admin fences work unless they remain owner
or assigned. Merely joining/retrying another actor's job does not transfer its
initiating authority. An owner may start a new job after revoked work is settled;
old successful previews and receipts remain intact.

`owner_id` is the immutable job owner snapshot; `actor_id` is the initiating
actor. Generated previews still use `owner_id`, never the editor's UID. Title,
media, link, versions, models and content materialization remain unchanged.

### Database implementation

- `private.publication_generation_authorized(uuid,bigint,uuid)` is the common
  predicate used by start, the existing RLS wrapper, claim and finish. Its
  arbitrary-actor signature is not executable by API roles.
- Authorization precedes **all** start/retry receipt paths. A stored request UUID
  is not an access grant. Receipts remain keyed by `(actor_id, request_id)`.
- Claim's existing 20-job sweep and finish's existing token/lease check fence
  outstanding queued/running slots on authority loss. They use the existing safe
  `project_changed` code, clear leases, disable retry for those slots, refresh
  status and preserve prior successful slots/previews. No new unbounded sweep.
- Full `CREATE OR REPLACE` definitions preserve advisory lock, row-lock order,
  readiness, input validation, receipt conflicts, active-job uniqueness,
  failed-only retry, attempt limits and transactional materialization. No runtime
  function-text surgery is used.
- `preview_projects_for_current_user()` is a read-only, authenticated SETOF RPC.
  It takes no identity parameter. Its SQL filters before returning content; no
  unrelated previews are fetched for client-side filtering. It creates no new
  base-table policy or write permission.
- All touched definers use an empty search path and qualified relations. Explicit
  ACLs deny PUBLIC/anon access; mutation RPCs remain service-only, the private
  predicate is internal, and only the two read entry points allow authenticated
  execution. The browser never calls service RPCs directly.

## Browser integration

`restoreGenerationJobs` no longer filters `actor_id`. RLS determines shared-job
visibility, while Auth checks before/after restoration prevent accepting another
session's response. Local request preparation/acknowledgement remains actor-scoped
and unchanged. The hook's existing successful-refresh replacement removes jobs
that disappear from RLS.

A successful empty slot read also omits the earlier job: slots are atomically
created and never deleted by generation, so retaining that job as an inconsistent
snapshot would expose revoked details. Nonempty torn snapshots still disable
retry and poll again. Unknown/null responses fail rather than masquerading as an
authoritative empty result.

Both restoration and the current-user preview list follow exact counts and actual
page lengths, including server caps below the requested 200 rows. IDs use text
casts, never JavaScript numeric conversion. The most recent job wins per project
unless an older active job is found. Preview listing checks the requested UID
against Auth and live Redux identity before/after loading and between pages;
malformed identities or missing pages reject the result.

The existing `/preview-projects` route now reaches assigned drafts. Both card
layouts pass owner/admin delete eligibility to the menu; open and confirmation
handlers check it again. Assigned-only rows receive **no new delete control**.
Existing editing, subscription checks, scheduling, publishing and publish-again
behavior are not changed or given new role restrictions.

## Scope and residual exposure

**This is not complete tenant isolation.** Existing broad project/preview SELECT,
ordinary UPDATE and DELETE exposure remains, as do existing TRUNCATE privileges.
The listing RPC and menu gating do not prevent direct access permitted by those
legacy policies. T8 makes owner/assignment authority harder to forge; it does not
make all project content or legacy preview ownership trustworthy.

No general RLS redistribution, admin-only legacy quarantine, new editor role,
assignment-management change, translation change, public-export change or new
publication permission was introduced. Existing admin clone, ordinary project
editing, original n8n integrations and stored rows remain outside this patch.

## Local verification record

No test files or build outputs were written. Probes ran through foreground stdin,
with in-memory TypeScript compilation/mocks and synthetic PostgreSQL 17.11 in
`galia-authority-01a1c184` (networkless, no ports/mounts). New databases
`generation_t9_base` and `generation_t9_green` preserve all T8 evidence. The base
uses the existing production-shaped synthetic fixture, valid generation inputs,
a synthetic preview table and migrations001/002; green adds003. Setup and both
migration applications succeeded, with no preparation retries.

| Probe / command entry point | Observed result |
|---|---|
| `node --input-type=module` — SQL preparation via synchronous `docker exec -i galia-authority-01a1c184 psql -U postgres -v ON_ERROR_STOP=1` | Exit 0; separate base/green databases created; migrations001/002 applied |
| `docker exec -i galia-authority-01a1c184 psql -U postgres -v ON_ERROR_STOP=1 -qAt` — baseline transaction | Exit 0; outsider denied and legitimately assigned photographer also denied (behavior gap) |
| `node --input-type=module` — baseline restoration mock | Intended exit 1: actor-only filter hides shared jobs |
| `printf ...` migration003 into foreground psql | Exit 0; forward migration applied once |
| Foreground psql — generation/receipt/revocation matrix | 35 assertions passed before one probe-only snapshot failure, exit 3 |
| Foreground psql — corrected admin matrix and preview/ACL continuation | Exit 0; 12 assertions passed, including the corrected failing check |
| `node --input-type=module` — owner/admin SQL differential | Base and green each exit 0; 36 checks each, byte-identical reports |
| `node --input-type=module` — service/list/menu mocks | Exit 0; 33 assertions, no network calls |
| `node --input-type=module` — exact function/policy differential | Exit 0; three full RPC definitions differ only in authority checks/comments; original policy/table ACL output unchanged |
| `node --input-type=module` — in-memory root TypeScript solution build | Exit 0; zero diagnostics, 25 outputs intercepted in memory |
| Focused ESLint on five changed TS/TSX files | Exit 1: two existing explicit-any errors and one existing TanStack warning |
| `node --input-type=module` — baseline lint/action differential | Exit 0; same two errors/one warning on HEAD; all eight unrelated preview action declarations identical |
| `git diff --check` and explicit untracked SQL/document whitespace probe | Exit 0 each; no whitespace defects |

The exact stdin bodies and command outputs are in the task transcript. The SQL
matrix's failed admin-demotion assertion combined a mutating claim with a status
subquery in one statement; that subquery saw the earlier snapshot. One bounded
probe correction separated the statements and passed. No product correction was
needed. The differential's final descriptive print mistakenly said 40 checks;
its measured counters are **36 per database**, as recorded above.

Coverage includes owner/admin/assigned/outsider/no-session reads; receipt isolation
and revoked replay/retry; editor reassignment before claim/finish; admin demotion
with owner/assignment fallbacks; preview owner/media/version parity; successful
sibling preservation; expiry/token/duplicate fencing; readiness, provider backoff,
attempt/retry bounds; owner transfer and missing-parent fencing; legacy owned and
admin preview visibility; server-capped pagination; unknown responses; bigint
precision; cross-actor response/storage guards; and assigned-only menu omission.
Missing-parent behavior was simulated by a nonexistent job parent ID, without
performing any fixture deletion. Real deletion/races remain part of T10 proof.

Focused lint command:

```sh
pnpm exec eslint src/features/projects/services/publicationGeneration.ts src/redux/actions/PreviewProjectActions.ts src/features/postPreview/components/cardList/index.tsx src/features/postPreview/components/cardList/ProjectMenu.tsx src/features/postPreview/screens/PreviewProjects.tsx
```

The two `@typescript-eslint/no-explicit-any` errors are unchanged version-array
code in `PreviewProjectActions.ts`; the warning is unchanged `useReactTable` use.
They were not repaired as unrelated work. Thus the required literal lint remains
failing even though attribution found no new diagnostics; handoff is partial.

## S7–S9 self-check and remaining proof

- **S7:** same current authority predicate for generation paths; role-independent
  assignment, distinct owner/actor, fresh read/retry/fencing checks, shared restore
  and narrowly reachable drafts. SQL/mocks pass the listed cases.
- **S8:** no base policy/grant redistribution, unrelated action declarations
  preserved, no new publication restriction or assigned delete control. SQL
  policy/ACL and owner/admin differentials pass. Legacy exposure is explicit.
- **S9:** relies on the unchanged T8 forward guard; no source or evidence reset.
  Trusted protected userData roles and real Auth identity remain prerequisites.

T10 subsequently passed independent local checks: one legitimate-flow differential, four deterministic blocked-lock reassignment/admin-demotion races, real deletion/owner-transfer/duplicate/rollback/sibling checks, SQL legacy/bigint/ACL cases and 19 distinct mocked-client groups. No demonstrated product blocker. Parent full `pnpm build` passed. Focused lint still fails with two preexisting errors and one warning, independently attributed unchanged. Proof: `/tmp/galia-t10-independent-W2hDpC/EVIDENCE.md` and preserved `PROBE-EXCEPTIONS.md`; preparation was not retried and no product correction was required.

Legitimate currently assigned users can directly SELECT canonical historical job snapshots under inherited001 table grants. This is an explicit advisory, not column-level isolation: the preview RPC and ordinary client projections exclude snapshots; service credentials/receipts remain inaccessible. The authorized audience and current-revocation checks are separate from optional future column minimization.

Remaining: actual PostgREST RPC resolution/counts/output casts (including `*,id::text`), real
Auth transitions and role/assignment revocation between requests, browser menu/
calendar/navigation/reload behavior, scheduler/Edge/provider and external-writer
compatibility. Local synthetic/mocked results are not deployed safety proof.

## Cohesive review / recovery proposal

1. **Authority and fencing:** full migration003 plus this database contract and
   backend contract changes. Keep the complete RPC definitions together even
   above the advisory line budget; do not split safeguards into partial migrations.
2. **Shared restoration and draft navigation:** service, listing thunk, menu/card/
   handler integration plus UI documentation and client probe evidence. Requires
   slice 1; do not deploy the RPC caller before its migration.

Parent owns review disposition and commits. Preserve jobs, receipts, previews and
T8 when recovering. Prefer a reviewed forward repair; do not remove the guard,
reset identities, delete receipts or restore a client-owned generation bypass.

## Key Learnings

- A shared job is not an actor-owned receipt; restore through RLS, keep receipts
  actor-scoped, and reauthorize replay before reading them.
- Check the original initiating actor at claim **and** finish, not only the actor
  currently looking at a job. Ownership of generated drafts remains separate.
- Successful empty RLS reads and unknown transport responses have different
  meanings; only the former can authoritatively remove stale job details.
- Server page caps and legacy owned rows must be preserved explicitly when adding
  a narrow assigned-draft listing; UI delete omission is not database isolation.
