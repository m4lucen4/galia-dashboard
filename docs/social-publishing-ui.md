# Publishing from the dashboard (client)

User-facing behaviour of the publication screen when the cutover switch `VITE_SOCIAL_PUBLISHING_EDGE=true` is on. The server pipeline (targets, states, error codes) is in `docs/social-publishing.md`; the migration plan is in `odd/tasks/social-publishing-migration.md` (S1, S9, S11, S18, S23).

## The switch

| `VITE_SOCIAL_PUBLISHING_EDGE` | Behaviour |
|---|---|
| not `true` (default) | Exactly as before: the publish configuration updates `projectsPreview` and, for "Publicar ahora", calls the n8n webhook. Dates, cards and calendar use the old display. |
| `true` | Publishing goes through the Edge Function `publish-publication`; status comes from `publication_targets`; dates are real instants shown in Europe/Madrid. It also turns on the image adjuster (same as `VITE_SOCIAL_MEDIA_VARIANTS=true`). |

Turn it on only at the cutover, after n8n is stopped and the scheduled rows and `publishDate` have been converted (phase 6). A publication scheduled through the new pipeline gets legacy state `scheduled`, so n8n would publish it too while it is still live.

## Video formats (`VITE_SOCIAL_VIDEO`)

Task `odd/tasks/social-video-publishing.md` (T4; S2, S6, S7, S10). Server side: "Formats and video" in `docs/social-publishing.md`.

| `VITE_SOCIAL_VIDEO` | Behaviour |
|---|---|
| not `true` (default) | Exactly as before: no format selector, no video checks or previews, no `format` in the request to `publish-publication` (the server publishes `image`), no `video_id` lookups. |
| `true` | Needs `VITE_SOCIAL_PUBLISHING_EDGE=true` too (formats only exist in the Edge pipeline; without it the switch stays off, `SOCIAL_VIDEO_ENABLED` in `helpers/socialVideo.ts`). Adds what follows. |

- **Format per network** (publish configuration, under each selected network):

| Network | Options |
|---|---|
| Instagram | "Post" (the photos, single or carousel), "Historia (imagen)" (one original photo of the user's choice, no feed crop) and, when the publication has a video (`projectsPreview.video_id`), "Reel" and "Historia (vídeo)" |
| LinkedIn | "Imagen(es)" and, with a video, "Vídeo" |

  Default (L29): with selected photos every network starts on its photo format; with no selected photos but a video it starts on the video format (Reel, LinkedIn "Vídeo"). A choice that can no longer work falls back to the default. Options that cannot work are disabled with a short reason: no selected photos (photo formats), video loading or unreadable, "Historia (vídeo)" over 60 s or 100 MB. A network with a single option shows no selector. The publication's video is read through `listProjectVideos` (hook `usePublicationVideo`); confirming waits until it is loaded.
- **Request.** `publish-publication` receives `format` in each target (`image`, `reel`, `story_image`, `story_video`, `video`), for both "Programar" and "Publicar ahora". The server answers `video_required` / `video_limits` (422) if the video is missing or over the limits; both are translated (`requestErrors`). The Instagram target also carries `storyImageUrl` when its format is `story_image` (see "Story media").
- **Checks** (panel of each network): video formats show the video information (duration, size, resolution) and warnings: not optimized for streaming (faststart false, Instagram only: "Instagram podría rechazar este vídeo: no está optimizado para streaming (faststart)."), story limits, and an informative "no es 9:16, Instagram puede recortarlo" for Reel and Historia. Photo formats keep the photo checks; "Historia (imagen)" uses the chosen original photo and only informs (no crop, no conversion, no blocking); stories have no caption, so the text counters are hidden for them. No image is measured for a network that publishes the video.
- **Story media** (S13, T7). Under the Instagram format selector, with a story format chosen:
  - **Historia (imagen)**: legend "Imagen de la historia" and the selected photos (not `not_selected`, original `image_data` URLs, never the network variants) as small numbered thumbnails; the user picks one. Default: the first selected photo; for an Instagram target already scheduled as `story_image` (read from `story_image_url`), its photo is preselected when it is still a selected photo, else the first. The choice never changes the carousel order. The request sends `storyImageUrl` in the Instagram target **only** with `story_image` and a photo (never for `image`, `reel`, `story_video` or LinkedIn). The panel checks run on the chosen photo (the row keeps its position in the publication) and only inform: no crop, no conversion, no blocking.
  - **Historia (vídeo)**: legend "Vídeo de la historia" with the video poster and file name.
  - Helpers: `helpers/storyImage.ts` (`resolveStoryImage`: choice, else scheduled, else first; `scheduledStoryImageUrl`), `configPublish/StoryMediaPicker.tsx`. The chosen photo is reported to the screen through `onStoryImageChange` and passed as `PublishParams.storyImageUrl` (ignored with the switch off).
  - The server contract (column `publication_targets.story_image_url`, `storyImageUrl` only with `story_image`, codes `story_image_invalid` 422 and `story_image_missing`) is in `odd/tasks/social-video-publishing.md` ("T7 contract") and "Formats and video" in `docs/social-publishing.md`.
- **Previews** ("Vista preliminar" of Instagram and LinkedIn): a format switch (only formats that can work) opens on the format of the current target when known, else the default. Reel and Historia show the video poster in a 9:16 frame, played on demand (`preload="none"`, nothing downloads before pressing play); stories show no caption; "Historia (imagen)" shows exactly the photo that will be published (the one of the scheduled story target, else the first selected photo; the preview has no picker, the choice is made in the publish configuration); "Historia (vídeo)" shows the video; LinkedIn "Vídeo" shows the poster in the post.
- **Targets show their format** (cards, calendar detail and the publication view: a small tag next to the network). The table read asks for `format` and (T7) `story_image_url`, both only with the switch on, and falls back when a column is not granted to the browser: first without `story_image_url` (the format stays), then without `format` (with the switch off the query is exactly the base columns) (see "Browser read access" in `docs/social-publishing.md`); the format and the story photo already learned from a function answer are kept across reads and realtime events that do not carry them.
- **Error texts** (Spanish; `helpers/socialVideoTexts.ts`, used as `defaultValue` of the i18n keys `previewProjects.publication.targetErrors.<code>.reason|fix`, so a locale file can override them): `video_missing` "El vídeo de esta publicación ya no existe. Elige otro vídeo o publica con fotos.", `media_processing_timeout` "La red tardó demasiado en procesar el vídeo. Vuelve a intentarlo.", `format_unsupported`, `video_required`, `video_limits`, and (T7) `story_image_invalid` / `story_image_missing` ("La imagen elegida para la historia ya no está entre las fotos seleccionadas." + "Elige otra."; the first is also the translated request error when the schedule is refused with 422, "… Elige otra."). The same codes are in the failure emails (`supabase/functions/_shared/social-publication-notice.ts`, es / en / ca).
- Code: `helpers/socialVideo.ts` (switch, options, default rule), `helpers/socialMediaRules.ts` (`evaluateVideo`), `configPublish/NetworkFormatSelector.tsx`, `useMediaChecks.ts` / `NetworkMediaPanel.tsx`, `components/InstagramVerticalPreview.tsx`, `VideoPreviewFrame.tsx`, `PreviewFormatTabs.tsx`, `services/publicationPublishing.ts` (`buildPublicationTargets`).
- Not verified: a browser run for the story photo picker (T7) and a real story publication with a chosen photo. The failure emails of the new codes are server side (`social-publication-notice.ts`).

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
