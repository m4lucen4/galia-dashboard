# Image adjustments (ajustes de imagen en el modal de publicación)
Add tone (brightness, contrast, saturation, warmth), straighten and vertical perspective correction to ImageAdjustDialog; the result is baked into the existing per-network JPEG variant and the values are stored to restore the sliders.
Branch: feat/image-adjustments (from main e55af05). No push/PR/merge authorized. Migration must be applied before the dashboard that selects the new column is deployed. Project has no test suite (AGENTS.md): verify with tsc/lint, scratch math checks in a temp dir, and a manual browser check.

## Specs
S1. "en el mismo modal dar más capacidades al usuario para "alterar" una imagen, por ejemplo: luminosidad, saturación, me han dicho algo de corrección de verticales, etc..."
S2. Scope (user selection): "Luminosidad, contraste y saturación", "Calidez (temperatura de color)", "Enderezar (rotación fina)", "Corrección de verticales".
S3. Persistence (user selection): "Sí, con una migración pequeña" — optional adjustments column; on reopening, the sliders recover their values.

## Tasks
- T1 | S3 | parent | done (09ea08b; CHECK evaluated on 10 literal cases via read-only SELECT, all as expected; NOT applied) | Migration: nullable `adjustments jsonb` on publication_media_variants with a bounded CHECK; service type/COLUMNS/save input.
- T2 | S2 | parent | done (12734c6; scratch math checks ALL PASS: homography corners/collinearity, matrix identity/grayscale/±1 stop/contrast/warmth, normalize) | Render pipeline: one color matrix for tone (SVG feColorMatrix preview = canvas pixel pass), rotation, perspective (homography, same output size); renderVariant takes adjustments.
- T3 | S1,S2,S3 | parent | done locally (28254e7 + verify fixes in the following commit; tsc only 4 pre-existing errors, eslint clean, vite build exit 0) | Dialog UI: sliders + reset, live preview in the cropper, dirty/baseline/restore include adjustments, revert clears them; i18n es/en/cat.
- T4 | S1-S3 | parent + independent verify mwnqzwjd-1-81k2 | in_progress (verify S1-S3 PASS, no blockers; manual browser check incl. iOS Safari + migration apply need the user) | Verification: tsc + lint, scratch math checks, manual browser check by user; migration apply (needs user authorization).

## Log
L1. User: "en el mismo modal dar más capacidades al usuario para "alterar" una imagen, por ejemplo: luminosidad, saturación, me han dicho algo de corrección de verticales, etc..."
L2. User answers: phase scope = all four groups (S2); persistence = "Sí, con una migración pequeña" (S3).
L3. Design: one adjusted image stays one variant (no publisher/preview/carousel change). Tone = linear color matrix shared by preview and render so they match without relying on ctx.filter (Safari < 18). Perspective = vertical keystone via inverse homography on a CPU pass; cropper shows a downscaled corrected copy, crop area scaled back to full resolution.
L4. Known limits: straighten does not auto-zoom, so white corners can show until the user zooms in; when rotation or vertical are set, the working copy is capped at 4096 px on its longest side (only matters for LinkedIn/Facebook originals larger than that). Deploy order: apply 20261128000100 BEFORE the dashboard, or the variants list fails (it selects `adjustments`) and publishing configuration blocks.
L5. Independent verify (mwnqzwjd-1-81k2): S1-S3 PASS, renderVariant without adjustments byte-equivalent to e55af05, rotation/croppedAreaPixels semantics match react-easy-crop 6.2.5, CHECK accepts every normalized value. Fixed: rotated working canvas capped at 16 M px (iOS Safari), no upsampling from a reduced working copy, area tolerance scaled by the preview size (no spurious unapplied prompt), CORS-blocked image with stored vertical shows the CORS message instead of an endless "preparing". Accepted: Apply while the corrected preview is pending uses the centred crop; cropper flickers while the vertical slider moves (250 ms debounce); tone also tints the white rotation corners.
