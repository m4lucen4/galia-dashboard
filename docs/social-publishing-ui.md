# Publishing from the dashboard (client)

User-facing behaviour of the publication screen when the cutover switch `VITE_SOCIAL_PUBLISHING_EDGE=true` is on. The server pipeline (targets, states, error codes) is in `docs/social-publishing.md`; the migration plan is in `odd/tasks/social-publishing-migration.md` (S1, S9, S11, S18, S23).

## The switch

| `VITE_SOCIAL_PUBLISHING_EDGE` | Behaviour |
|---|---|
| not `true` (default) | Exactly as before: the publish configuration updates `projectsPreview` and, for "Publicar ahora", calls the n8n webhook. Dates, cards and calendar use the old display. |
| `true` | Publishing goes through the Edge Function `publish-publication`; status comes from `publication_targets`; dates are real instants shown in Europe/Madrid. It also turns on the image adjuster (same as `VITE_SOCIAL_MEDIA_VARIANTS=true`). |

Turn it on only at the cutover, after n8n is stopped and the scheduled rows and `publishDate` have been converted (phase 6). A publication scheduled through the new pipeline gets legacy state `scheduled`, so n8n would publish it too while it is still live.

## What the user sees

- **Dates.** The date and time the user picks are Madrid time, whatever the browser's time zone. Cards, the calendar and the publication view show the real moment in Madrid time. The "at least one hour in the future" rule is checked in Madrid time. A time that does not exist (the hour skipped when clocks go forward) is moved to the first valid time after the gap; a time that happens twice (clocks go back) uses the first occurrence.
- **Publish.** *Confirmar* in "Configurar publicación" schedules the publication (or publishes it now when "Publicar ahora" is checked). One target is created per selected network (Instagram business account, LinkedIn person or organization page). Errors appear inside the dialog in plain words; success appears as a message at the top of the page.
- **Per network, on cards, in the calendar and in the publication view:**

| State | What it shows |
|---|---|
| Programado | "Programado · dd-mm-aaaa hh:mm" (Madrid time). |
| Publicando… | The publication is being sent (or is due and waiting for the worker, at most a minute). |
| Publicado | The date, and the link **Ver publicación** to the post. |
| Reintentando | The network failed for a temporary reason. Shows the reason and "Próximo intento a las hh:mm". Nothing to do. |
| Requiere acción | Something must be fixed: the reason and how to fix it. For connection problems (expired or revoked access, missing permission, unauthorised page) it says "Vuelve a conectar Instagram en Ajustes" with an **Ir a Ajustes** link. |
| Error | A permanent failure: the reason and what to try. |

  In the calendar each chip shows the network icons with a coloured dot per state (hover for the text).
- **Reintentar** (per network, on *Requiere acción* and *Error*): tries again now after the user fixed the cause, or simply because the failure was outside the project. Disabled while an action is in flight.
- **Volver a programar** (when something failed): resets the publication (the old targets stay as history) and opens the configuration to choose a date and networks again. "Publicar de nuevo" (menu, for published publications) does the same reset through the new pipeline.
- **Unknown outcome (S11).** When the app cannot know whether a post was made (for example the worker was interrupted while sending), the network shows *Requiere acción*: "No sabemos si la publicación llegó a hacerse…". Reintentar, Volver a programar and publishing again first ask: **"Comprueba en {red} que la publicación no se haya hecho antes de reintentar"**, with a checkbox the user must tick. Only then the request is sent with the acknowledgement. This is what prevents a post from being published twice.
- **Live updates.** The state of each network updates by itself (realtime, with a 20-second refresh as fallback while something is running or due). Publications without targets (published before the cutover) keep showing the old result columns.

## Messages

Every target error code in `docs/social-publishing.md` has a reason and a fix text in Spanish, English and Catalan (`previewProjects.publication.targetErrors.<code>`); unknown codes use a generic text. Errors of the publish request itself (`previewProjects.publication.requestErrors.<code>`) cover `invalid_request`, `forbidden`, `conflict`, `invalid_project`, `run_at_out_of_range`, `in_progress`, `already_published`, `not_retryable`, `confirmation_required`, `account_not_connected`, `account_not_allowed`, `unauthorized`, `internal_error`, plus client-side `account_missing`, `no_networks`, `invalid_date` and `uncertain` (the answer was lost: check the status before repeating).

## Code map

| Area | Files |
|---|---|
| Switch and date helpers | `src/helpers/publishDate.ts` (`SOCIAL_PUBLISHING_EDGE_ENABLED`, `madridWallClockToIso`, `formatInstantInMadrid`, …) |
| Edge client and reads | `src/features/postPreview/services/publicationPublishing.ts` |
| Targets state and realtime | `hooks/usePublicationTargets.ts`, `helpers/publicationTargets.ts` |
| Actions (publish, retry, reset, acknowledgement) | `hooks/usePublicationActions.ts` |
| UI | `components/publicationStatus/*`, `cardList/SocialMediaResults.tsx`, `calendarView/EventChip.tsx`, `screens/PreviewProjects.tsx` |

## Not covered

- Cancelling a scheduled publication without publishing again is not a separate action (as before, the configuration is the entry point).
- If the answer of a publish request is lost (timeout), the same action reuses its request id when repeated with the same data, so a lost success is not duplicated.
- No automated tests (project policy); see the manual test script in the task report.
