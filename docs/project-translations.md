# Edit project language versions

Projects can store manually authored versions of their title, description and keywords in Spanish (ES), English (EN) and Catalan (CAT). This delivery only adds dashboard editing and storage: it does not change public websites, publication generation or search.

## Quick path

1. Create and save the original project, then open **Editar proyecto**.
2. In **Versiones por idioma**, select the language of the original content and click **Guardar idioma original**. Existing projects have no assumed language.
3. Choose another language, complete at least one field, then click **Guardar versión**. Reopen the project to retrieve saved versions.
4. To remove a version, select it and click **Eliminar versión**, then confirm. The original project is unchanged.

Version saves are independent from **Guardar cambios** on the original project. Empty translation fields mean “use the original”; keywords replace the entire original keyword set, never merge with it. No consumer is switched to translated content in this delivery.

## Project list

The **Versiones** column shows the available ES/EN/CAT languages and explicitly labels the known original language as **Original**. Projects without readable language metadata show **—**; the dashboard never assumes Spanish for existing content. A single nested query loads language codes only alongside each admin/user project list, retaining projects without versions. Closing the editing drawer refreshes the list after independent version saves or deletion; no per-row requests or original-project writes are needed.

## Editing rules

| Rule | Behavior |
|---|---|
| Languages | Stored as `es`, `en`, `ca`; dashboard labels are ES/EN/CAT. |
| Original language | Explicit per-project metadata; never inferred from the dashboard language or existing text. |
| Partial versions | At least one nonblank field is required. Whitespace-only fields are stored as NULL. |
| Uniqueness | One version per project/language; the original language cannot also be a translation. |
| Changing the original language | Save/discard the current draft first. Delete any existing translation in the proposed original language first. Conflicting database writes reject atomically. |
| Unsaved edits | Switching version or closing/saving the original prompts before discarding a translation draft. Internal SPA navigation keeps the draft in memory, scoped to the authenticated editor and project, and restores it when the editor reopens. Explicit discard clears it. Full browser unload warns when there are unsaved changes; drafts are not persisted to disk and do not survive an accepted full reload. Localization writes temporarily block closing/saving the original. |
| Keywords | Each language has isolated input state; clearing or switching versions must not retain another version's tags. |
| Errors | Failed writes retain the draft. Failed loads offer retry and do not affect the original project editor. |
| Original changes | Editing the original never overwrites saved translations. No stale-translation notification is included. |
| Assignment | The existing admin assignment action clones settings and translations into independent destination records in the same database transaction as the new project. Existing best-effort Storage image copying remains unchanged. |

## Database and rollout

Apply `supabase/migrations/20261030000100_add_project_translations.sql` **before deploying the dashboard**. Applying the migration, production deployment and rollback are separate operator actions; implementation verification does not authorize them.

The migration adds:
- `project_translation_settings`, keyed by `projects.id` (`bigint`), containing the original language.
- `project_translations`, keyed by project/language, with nullable text fields and timestamps. A composite foreign key tracks the current original language; cascading updates plus a CHECK reject language conflicts without application-side race windows.
- Owner/admin RLS policies and an invoker authorization helper. Anonymous users receive no access. Admin identity follows the existing database `userData.uid = auth.uid()` / `role = 'admin'` convention; assignments require that admin role.
- `assign_project_with_translations`, an authenticated, security-invoker RPC that copies a project and its language records atomically. It preserves the existing assignment omission of project collaborators and NAS-folder linkage.

Before applying, confirm the destination matches the inspected schema: identity `projects.id bigint`, UUID `projects.user` and `userData.uid`, text `userData.role`, `projects.image_data jsonb[]`, and the project columns enumerated by the assignment RPC. Confirm authenticated grants/SELECT policies permit the owner/admin checks. The migration does not rewrite existing records, alter `projects` or its policies, or backfill original languages. Its PostgREST notification must expose both tables and the RPC before dashboard assignment is deployed.

### Existing security limitations

The inspected legacy project policies grant very broad authenticated access; new child-table policies deliberately check owner/admin instead of relying on parent visibility. Read-only hosted inspection confirmed an enabled `private.guard_user_data_role_and_uid` trigger protecting authenticated UID changes and non-admin role changes. The new feature uses the existing guarded database admin-role model. Row/column UPDATE grants alone do not establish that users can change their role. This feature does not repair existing project/profile authorization.

## Verification and activation checklist

- [ ] Apply the migration to an isolated compatible PostgreSQL/Supabase environment; verify owner/admin access and rejection of unrelated/anonymous writes, including target-project changes.
- [ ] Verify duplicate languages, empty versions and original-language collisions reject without changing stored records; exercise concurrent original-language/version writes.
- [ ] Verify project deletion cascades, admin assignment creates independent versions and any copy failure rolls back the destination project.
- [ ] Verify the real authenticated dashboard can save, reopen, change language, clear keywords, retain failed drafts and delete versions at desktop/mobile sizes.
- [ ] Deploy only after the tables/RPC are available. Storage copies are outside the database transaction and can still leave orphan images if assignment fails, as before.

For rollback, restore dashboard assignment to its compatible earlier implementation before withdrawing the RPC/tables. Export localization records first; dropping tables would destroy authored translations and requires explicit authorization.
