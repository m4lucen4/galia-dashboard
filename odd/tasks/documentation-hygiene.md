# Documentation hygiene — implementation tasks

**Repository locator:** `odd/tasks/documentation-hygiene.md`
**Objective:** Keep trustworthy operational documentation in the branch without promoting obsolete or transient notes.
**Problem / why:** Tracked Odoo docs disagree with the local Edge Function; task ledgers have mixed live and historical statuses.
**Authorized scope:** `docs/` and `odd/tasks/` Markdown only. Do not alter code, external services, or unrelated dirty paths.
**Constraints:** Preserve existing uncommitted user work and incomplete task evidence. Do not claim a remote deployment state without proof. Do not delete a file whose useful information has not been retained or whose dependencies remain. Existing worktree contains unrelated untracked files.
**Route:** Delegated direct; classifying and editing many documents needs a bounded writer. TDD: off (no test runner per project AGENTS.md); check links, diff, references, and markdown structure. Delivery: ask-on-risk; no automatic PR/push.

## Checklist

- [x] **DH-01 — Operational docs:** Reconciled the Odoo operator runbook against local code and retained concise source-backed operating limits. The obsolete handoff was retired without restoring it; references now resolve.
- [x] **DH-02 — Task-ledger selection:** Assessed task ledgers and retained every untracked ledger because each contains unfinished work or unique recovery evidence. No task ledger was deleted; unrelated source changes remain untouched.

## Progress

- Retired tracked handoff content. Current operator guidance is `docs/odoo-project-sync-operator.md`; historical planned ledgers link there without treating their deployment records as current audits.
- Completed but retained evidence: `administration-hub.md` is committed evidence; `odoo-google-maps-links.md`, `odoo-direct-customer-id.md`, and `odoo-unmapped-collaborators.md` retain detailed local/deployment limits not reproduced elsewhere.
- Unfinished evidence retained: `odoo-collaborator-id-sync.md` (offline and live verification), `odoo-contact-list-on-add.md` (browser/runtime verification), `odoo-collaborator-name-sync.md` (planned work), `managed-wiki.md` (browser/Storage verification), and `projects-table-filters-pagination.md` (global lint/browser review). `projects-drawer-nas-refactor.md` remains a recoverable completed work-unit record.
- Branch: `feat/administration-hub`. No documentation cleanup is staged or committed; preserve unrelated user work.
