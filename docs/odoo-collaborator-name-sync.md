# Odoo collaborator exact-name sync

This document describes a local-only replacement receiver for project collaborator synchronization. It has not been deployed, routed, or used against a remote Odoo or Supabase environment.

## Behavior

For each collaborator, the receiver queries `res.partner` for the exact declared name with a maximum of two results.

| Exact-name result | Collaborator action |
| --- | --- |
| One verified partner with the same returned name | Create or update the receiver-owned collaborator row. |
| No partner | Do not add the collaborator; remove its verified receiver-owned `formulario` row if present. |
| Two or more partners | Do not add the collaborator; remove its verified receiver-owned `formulario` row if present. |
| Invalid returned ID or name | Fail closed without using the response. |

The receiver never creates, updates, or deletes `res.partner` records. A row is considered receiver-owned only when its project-scoped collaborator marker is present and `x_origen` is `formulario`. Rows that are manual, reclassified, or unmarked are not changed.

If an already owned row points to a different partner than a new unique-name result, synchronization fails closed. This prevents an automatic reassociation without an explicit ownership review.

## Safety and rollback

- The existing `odoo-project-sync` receiver remains unchanged.
- Do not route the sender to this function until an authorized deployment and coordinated cutover are approved.
- Do not run both receivers for the same event stream.
- To roll back a future cutover, restore the sender URL to the existing receiver and leave this local receiver unused. This does not alter Odoo partners or manually managed collaborator rows.

## Operator checks before a future rollout

- Confirm the function has `verify_jwt = true` in `supabase/config.toml`.
- Confirm the worker authorization headers and Odoo configuration match the existing receiver.
- Review duplicate-name handling with the Odoo operators: duplicate names intentionally remove only verified receiver-owned rows.
- Deploy the function before any separately authorized routing change; this repository change makes no remote claim.
