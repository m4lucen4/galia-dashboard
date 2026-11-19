# Social media variants (phase 3: images and text)

Server-side pieces that let each network receive an image and a text it accepts (S5, S7, S18, S19, S20).
The user's original image is never modified. Nothing here is read by n8n.

Files:

| File | Purpose |
|---|---|
| `supabase/migrations/20261118000600_publication_media_variants.sql` | bucket, storage policies, table, RLS |
| `supabase/functions/_shared/social-text.ts` | text normalisation, per-network escaping and limits |
| `supabase/functions/_shared/social-media-rules.ts` | image requirements and evaluation |

## Bucket `publication-variants`

- Public (the networks download the image by URL), `image/jpeg` only, 8 MB (`8388608`) per object.
- Object path: `<previewId>/<instagram|linkedin|facebook>/<uuid>.jpg` (Facebook: `<previewId>/facebook/<uuid>.jpg`, accepted since migration `20261127000100_facebook_publication_targets.sql`). Exactly three segments; the file name is
  a lowercase UUID (`^[0-9a-f-]{36}\.jpg$`). Anything else is rejected by the storage policies.
- Public read goes through the public URL and needs no policy.

## Who can write

Whoever may edit the publication: the same rule as the `projectsPreview` policies, i.e.
`private.preview_access_allowed(owner, project_id)` (admin, publication owner, or owner / assigned
editor of its project), bound to the caller's own `auth.uid()`.

- `private.preview_id_access_allowed(p_preview bigint)`: that rule for a publication id; `false` if the
  publication does not exist (also false for an ownerless publication unless the caller is admin).
- `private.publication_variant_path_allowed(p_name text)`: path convention above **and** access to the
  publication in the first folder. Both are `SECURITY DEFINER`, `search_path ''`, executable by
  `authenticated` only.
- `storage.objects` policies for `authenticated` on `bucket_id = 'publication-variants'`:
  select, insert (with check), update (using + check, so an object cannot be renamed into a publication
  the caller cannot edit) and delete, all through the path helper. The select policy exists so the owner can
  list and remove objects through the API.
- `anon`: nothing. `service_role` bypasses RLS.

## Table `public.publication_media_variants`

One row says "for this network, use this derivative instead of this original".

| Column | Notes |
|---|---|
| `id` | uuid pk |
| `preview_id` | `projectsPreview.id`, `on delete cascade` |
| `network` | `instagram`, `linkedin` or `facebook` |
| `source_url` | the original as in `image_data[].url`; https, <= 2000 chars |
| `position` | >= 0, order inside the publication |
| `storage_path` | must start with `<preview_id>/<network>/` and follow the file-name rule |
| `public_url` | https, <= 2000 chars, and it must end with `/storage/v1/object/public/publication-variants/` + `storage_path` (the public URL of exactly that object) |
| `width`, `height`, `bytes` | of the derivative |
| `crop` | nullable `{x, y, width, height, aspect}`; numeric x/y >= 0, width/height > 0, `aspect` in `1:1`, `4:5`, `1.91:1`, `original`; <= 256 bytes |
| `created_by` | default `auth.uid()`; on insert from the browser it must equal `auth.uid()` |
| `created_at`, `updated_at` | `updated_at` is set by a trigger; the trigger also keeps `id`, `created_by`, `created_at` from being rewritten |

Unique `(preview_id, network, source_url)`, and unique `(storage_path)` (index `publication_media_variants_storage_path_key`): an object backs at most one row, so deleting a row's object can never remove another row's image.

CHECKs: `public_url` ends with `/storage/v1/object/public/publication-variants/<storage_path>`; `bytes` 1..8388608; Instagram: `width` 320..1440 and `round(width/height, 2)` between 0.8 and 1.91;
LinkedIn: `width * height < 36152320`; Facebook has no rule of its own (a Facebook variant is still a JPEG of at most 8 MB, below the 10 MB Facebook accepts).

RLS: `authenticated` select / insert / update / delete through `private.preview_id_access_allowed(preview_id)`
(update checks the new `preview_id` too, so a row cannot be moved to a publication the caller cannot edit).
`service_role` has full access, `anon` has none. Writes from the browser are only possible for people who can edit the
publication; reading is the same people.

## Rules (`social-media-rules.ts`)

| | Instagram | LinkedIn | Facebook (Page) |
|---|---|---|---|
| Format | JPEG only | JPG, PNG, GIF | JPG, PNG, GIF |
| Weight | <= 8 MB | no limit | <= 10 MB (inclusive) |
| Ratio | 0.8 (4:5) .. 1.91 (compared at two decimals, as the CHECK) | any | any |
| Size | width 320..1440 | width x height < 36,152,320 px | no limit |
| Several images | carousel <= 20; all items are cropped to the first item's ratio (items differing by more than 0.01 are flagged) | 1 image = Images API, 2..20 = MultiImage | 1 photo, or 2..20 attached to one post; no ratio rule; none is an issue (`no_images`) |

`evaluateImage(network, {mime, width, height, bytes})` and `evaluateCarousel(network, images)` return
`{ ok, needsCrop, needsConversion, issues[] }` (carousel adds `items[]`; issues carry the item `index`).
Per S19: ratio misfit (or a carousel item differing from the first) => `needsCrop`, the user crops; format,
weight, pixels or Instagram width out of range => `needsConversion`, the JPEG / resized copy is generated without asking.
Issue codes are stable keys for the client to translate; they carry `actual` / `limit` when they apply.

## Text preparation (`social-text.ts`)

- `normalizeText`: NFC; `\r\n` / `\r` to `\n`; zero-width and bidi control characters removed (ZWJ kept
  inside emoji sequences); other control characters removed, tabs become a space; trailing spaces trimmed per line;
  3+ newlines collapsed to 2; trimmed. Legacy n8n corruption: when the text has **no** real newline, literal
  two-character `\n` sequences become real newlines (text that already has real newlines is left alone). Quotes are not
  touched: publishers serialise with JSON, which is what removes the `""` / stray backslash problem.
- `linkedinCommentary`: normalised text with every little-text reserved character escaped by a backslash:
  `| { } @ [ ] ( ) < > # \ * _ ~`. Consequence: hashtags and mentions typed by the user are published as plain
  text, not clickable.
- `instagramCaption`: normalised text (no escaping exists on that API).
- `facebookMessage`: normalised text (no escaping exists on that API), used as the `message` of a photo post and the `description` of a video.
- `validateInstagramCaption`: `too_long` over 2,200 characters, `too_many_hashtags` over 30, `too_many_mentions` over 20
  (characters are counted as code points). **These Instagram limits are provisional** (constants
  `INSTAGRAM_CAPTION_MAX`, `INSTAGRAM_MAX_HASHTAGS`, `INSTAGRAM_MAX_MENTIONS`); confirm them in phase 4.
- `validateLinkedinCommentary`: `too_long` over 3,000 characters, measured on the normalised text; confirm in phase 4
  whether the API counts the escaping backslashes.
- `validateFacebookMessage`: `too_long` over 63,206 characters (`FACEBOOK_MESSAGE_MAX`), the only Facebook text limit (no hashtag or mention cap).
- `publicationText(row)`: description of the version with `main === true`, else `description_rich` (same rule as
  `publication_target_payload` and n8n). Returns the raw text; apply one of the functions above.

Both modules are plain TypeScript (no Deno or Node APIs) and run unchanged in Edge Functions, the client build and Node.

## The switch (S18): `VITE_SOCIAL_MEDIA_VARIANTS`

Client build variable read in `src/features/postPreview/helpers/socialMediaRules.ts`
(`SOCIAL_MEDIA_VARIANTS_ENABLED`): only the exact value `true` turns it on. **Default: off** (unset).
It is switched on at the cutover, when variants are actually published, by setting
`VITE_SOCIAL_MEDIA_VARIANTS=true` in the build environment (Vercel) and redeploying. It is not
listed in `.env.example` on purpose (out of scope for phase 3); this document is its reference.

| | Switch off (now) | Switch on (cutover) |
|---|---|---|
| Per-network image warnings, text counters | visible, never blocking | visible |
| Wording of format / weight / pixel / width issues | what the network would reject and why ("Instagram solo acepta JPEG (esta es PNG)", "pesa 9,2 MB y Instagram admite hasta 8 MB"): n8n publishes the original, so no conversion is promised | the copy that will be generated ("se convertirá a JPEG al publicar", "se comprimirá"...) |
| Ratio issues | said as what the network rejects | same |
| Cropper ("Ajustar imágenes"), automatic JPEG copy, variant upload | no | yes |
| Blocking rule (S5) | no | yes: a network with a non-compliant image is blocked until it is fixed |

### Measuring images (both modes)

- Images are only measured (image load + `HEAD`) for networks that are **checked and connected**; with none
  active nothing is requested.
- At most **3** images are measured at the same time (module-level queue shared by the whole session).
- Each image has a **15 s** budget for its load and for its `HEAD`. An image that does not load in time fails with
  the message "ha tardado más de 15 segundos en cargar..." (a `HEAD` that fails or times out only leaves format /
  weight unknown; the URL extension is the fallback for the format).
- A **failed** measurement is cached for the session (also when the window is closed and reopened), so a broken URL
  is not requested again on its own. The panel shows **Reintentar** next to the image: it clears that image's cached
  result and measures again.

### Switch on: recovery and unknown facts

- `measureError`, `conversionFailed` and a browser-blocked image (no CORS, cannot be drawn on a canvas) each show
  **Reintentar** on their line; it re-runs the conversion and, for measurement failures or a blocked image, measures
  again. The blocker text says to press it.
- **Unknown format or weight counts as "needs conversion" for Instagram.** When the browser cannot read the mime type
  (no `Content-Type`, `HEAD` blocked, no known extension) or the weight, and the ratio fits, the JPEG copy is generated
  anyway: Instagram only accepts JPEG up to 8 MB, and an unverified original must not reach it. The cost is that such
  images are converted even if they were fine. LinkedIn and Facebook do not do this (they accept JPG, PNG and GIF, LinkedIn with no weight limit and Facebook up to 10 MB, so only a known unsupported format, pixel count or weight triggers a conversion). With the switch off, unknown values
  are skipped (nothing is reported), as before.

## Image adjuster, per image (S22)

Only with the switch on. Opened with **Ajustar imágenes** in the network's checks panel; the flow is the same on
Instagram, LinkedIn and Facebook. Nothing is written until the user presses **Aplicar** for an image.

**Left: the images of the publication**, each with a state badge (click, or arrow keys + Enter/Space, to select):

| Badge | Meaning |
|---|---|
| **Aplicada (1080 × 1350 px)** | a copy for this network exists and fits (size of the copy shown) |
| **Pendiente** | the image needs a crop or a conversion and has no valid copy yet, or its applied copy no longer matches the carousel ratio (note: «la proporción ha cambiado, vuelve a aplicar»); a conversion due is generated automatically (S19) and the image then shows as applied |
| **Correcta** | nothing to do; the original is published |

**Right: the editor of the selected image only.**

- Ratio: **1:1, 4:5, 1.91:1, Original, Libre**, the same on every network. On Instagram **Original** is disabled (with the
  reason) when the image's own ratio is outside 0.8..1.91; **Libre** is a slider limited to 0.8..1.91 on Instagram
  (0.5..2.5 on LinkedIn and Facebook, which are more permissive but offer the same flow; Facebook has no ratio rule, so an adjustment there is optional).
- Zoom slider and the crop area (drag the image).
- **Aplicar**: renders the JPEG with the existing rules (Instagram width 320..1440 and <= 8 MB, LinkedIn pixel cap, Facebook only the 8 MB variant cap),
  uploads it and upserts the variant of **this image only** (the previous object of that image is replaced). It shows
  «Aplicando…» and the image becomes «Aplicada». Errors are shown on that image with **Reintentar**.
- **Volver al original**: deletes this image's variant row and object, so the image returns to its natural state. If the
  original still needs a conversion (S19) the automatic JPEG copy is generated again. On an image with no variant it
  only resets the unapplied edits.

**Instagram carousel (2+ images).** Instagram crops every item to the first item's ratio, so there is one **Proporción
del carrusel** above the list (same choices; «Original» there means the first image's ratio, only if it is inside
0.8..1.91). The per-image ratio selector is replaced by a note with that ratio. Changing it marks the already applied
images whose copy has a different ratio as **Pendiente** («la proporción ha cambiado, vuelve a aplicar»); nothing is
deleted automatically, and every image must be applied again to the new ratio. A single Instagram image and every
LinkedIn or Facebook image choose their ratio per image.

**Closing.** The dialog has **Cerrar** (no «Guardar ajustes»); closing never writes anything. If the selected image has
unapplied edits (ratio, crop or zoom changed since the last apply) closing, selecting another image or changing the
carousel ratio asks «Tienes cambios sin aplicar en esta imagen. ¿Descartarlos?» (**Seguir editando** / **Descartar cambios**).
When the image already has an applied copy, reopening it restores its crop and ratio.

**Blocking (S5) stays the same.** A **Pendiente** image, including one whose copy mismatches the carousel ratio, keeps the
network blocked with the existing reason («N imagen(es) de Instagram necesitan recorte»). The carousel ratio chosen in the
adjuster is kept for the session while the set of selected images does not change; the rule compares every item
(first included) against it, and falls back to the first image's ratio (clamped to 0.8..1.91) when none was chosen.

Accessibility: the list is a keyboard-navigable listbox (arrow keys / Home / End move, Enter or Space select), every
button has a text label, the discard confirmation is inline and takes the focus, so focus stays inside the dialog.

## n8n coexistence (S14)

Until the cutover n8n keeps reading `projectsPreview` (`image_data`, description) and publishes the **original** images.
Variants stored here are ignored by n8n and do not alter any column it reads. The phase 4 publishers will pick, per
network and `source_url`, the variant when one exists, and the original otherwise.
