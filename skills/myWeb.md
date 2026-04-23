# Skill: myWeb — Site Builder

The `myWeb` feature lets architecture studios create and publish a public portfolio website hosted at `https://sites.mocklab.app/{slug}`.

---

## Access

- **Route:** `/my-web`
- **Guard:** `HasWebRoute` — requires `authenticated && user.has_web === true`
- `has_web` is a boolean on the `users` table, set manually (not automatic on subscription)

---

## Data Model

### `sites` table → `SiteDataProps`

```ts
{
  id: string
  user_id: string
  slug: string              // unique, URL-safe: ^[a-z0-9-]+$
  studio_name: string
  logo_url: string
  primary_color: string     // hex, default "#2D3436"
  secondary_color: string   // hex, default "#636E72"
  background_color: string  // hex, default "#FFFFFF"
  font: string              // body font, e.g. "Inter"
  title_font: string        // heading font, e.g. "Playfair Display"
  navbar_type: number       // 1 | 2 | ...
  custom_domain?: string | null
  favicon_url?: string | null
  meta_description?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  linkedin_url?: string | null
  published: boolean
  created_at: string
  updated_at: string
}
```

### `site_pages` table → `SitePageDataProps`

```ts
{
  id: string
  site_id: string
  title: string
  slug: string          // "home" | "proyectos" | custom
  position: number      // 1-based ordering
  visible: boolean
  show_in_nav: boolean
  created_at: string
  updated_at: string
}
```

**Default pages** auto-created on first site load (idempotent):
- `{ title: "Inicio", slug: "home", position: 1, visible: true, show_in_nav: true }`
- `{ title: "Proyectos", slug: "proyectos", position: 2, visible: true, show_in_nav: true }`

### `site_components` table → `SiteComponentDataProps`

```ts
{
  id: string
  page_id: string
  type: "header" | "project_list" | "cta" | "body" | "content"
  position: number   // 0-based ordering
  visible: boolean
  config: HeaderSlideConfig[] | ProjectListConfig | CTAConfig | BodyConfig | ContentConfig
  created_at: string
  updated_at: string
}
```

---

## Component Types & Configs

### `header` — Slideshow (max 5 slides)
`config` is an **array** of `HeaderSlideConfig`:
```ts
{ image_url: string; title: string; description: string; type: 1 | 2; text_button: string; url_button: string }
```

### `project_list` — Auto-populated project grid
Only exists on the `"proyectos"` page. Config is a **single object**:
```ts
{ layout: "grid-4" | "grid-alternating" }
```

### `cta` — Call-to-action block
```ts
{ type: 1 | 2 | 3; title: string; description: string; subtitle: string;
  text_primary_button: string; url_primary_button: string;
  text_secondary_button: string; url_secondary_button: string }
```

### `body` — Image gallery + text
```ts
{ description: string; image_1?: string; image_2?: string; image_3?: string; type: 1 | 2 | 3 | 4 }
```
Number of images per type: 1→2 imgs, 2→1 img, 3→3 imgs, 4→3 imgs (no text on type 4).

### `content` — Rich info section
```ts
{ antetitulo?: string; titulo?: string; image?: string;
  textoIzquierda?: string; textoDerecha?: string;
  dato1?: number; leyenda1?: string; dato2?: number; leyenda2?: string;
  dato3?: number; leyenda3?: string; dato4?: number; leyenda4?: string;
  type: 1 | 2 }
```
Type 1: text + 2-column stats. Type 2: image + content + stats.

---

## Redux State

Three slices, all in `src/redux/slices/` and `src/redux/actions/`:

| Slice key | Main state | Requests tracked |
|---|---|---|
| `state.site` | `site: SiteDataProps \| null` | `fetchRequest`, `saveRequest`, `publishRequest`, `uploadRequest` |
| `state.sitePage` | `pages: SitePageDataProps[]` | `fetchRequest`, `saveRequest` |
| `state.siteComponent` | `components: SiteComponentDataProps[]` | `fetchRequest`, `saveRequest`, `uploadRequest` |

All request state follows `IRequest = { inProgress: boolean; messages: string; ok: boolean }`.

`state.siteComponent.components` is **flat** — all pages share the same array. Always filter by `page_id` before use.

### Key Thunks

**`SiteActions`**
- `fetchSite()` — loads by `user_id` from Redux auth state
- `createSite({ studio_name, slug })` — checks slug uniqueness first
- `updateSite({ siteId, updates })` — checks slug uniqueness if slug is in updates
- `publishSite({ siteId, published })` — toggles published flag
- `uploadSiteImage({ file, path, siteId, field })` — uploads then calls `updateSite`

**`SitePageActions`**
- `initDefaultPages(siteId)` — idempotent, creates defaults or fetches existing
- `updateSitePage({ pageId, updates })` — `visible`, `show_in_nav`, `position`, `title`
- `reorderSitePages(pages)` — sequential individual updates (no batch)

**`SiteComponentActions`**
- `addSiteComponent({ pageId, type, position, options? })` — inserts with default config
- `updateSiteComponent({ componentId, updates })` — partial update on `config`, `visible`, `position`
- `deleteSiteComponent(componentId)`
- `reorderSiteComponents(components)` — sequential individual updates
- `uploadSlideImage(...)` — saves to `{userId}/headers/slide-{index+1}.webp`
- `uploadBodyImage(...)` — saves to `{userId}/body/image-{n}.webp`
- `uploadContentImage(...)` — saves to `{userId}/content/image.webp`
- `upsertCTAComponent({ pageId, config })` — create or update (idempotent)
- `upsertProjectListComponent({ pageId, layout })` — create or update (idempotent)

---

## Component Tree

```
MyWeb (screen)
├── [No site] → creation form (studio_name + slug → createSite dispatch)
└── [Site exists]
    ├── PublishButton
    │   ├── "Guardar" → calls configFormRef.current?.save()
    │   ├── "Vista previa" → opens https://sites.mocklab.app/{slug}
    │   └── "Publicar / Despublicar" → publishSite dispatch
    ├── SiteConfigForm (forwardRef — imperative save via ref)
    │   ├── InputField × n (studio_name, slug, social URLs, meta_description)
    │   ├── ImageUploader × 2 (logo_url, favicon_url)
    │   ├── ColorPicker × 3 (primary_color, secondary_color, background_color)
    │   ├── FontSelector × 2 (title_font, font/body)
    │   └── NavbarTypeSelector
    └── PageList
        └── [each page accordion]
            └── PageEditor
                ├── [slug === "proyectos"] → ProjectsPageConfig
                │   └── LayoutSelector → upsertProjectListComponent
                └── [other pages] → ComponentList
                    └── [each component accordion]
                        └── ComponentEditor (switch on type)
                            ├── header  → HeaderEditor → SlideEditor[]
                            ├── cta     → CTAEditor
                            ├── body    → BodyEditor
                            └── content → ContentEditor
```

---

## Non-Obvious Patterns

### Save strategy varies by component

| Component | Save mechanism |
|---|---|
| `SiteConfigForm` | Imperative `save()` via `forwardRef` + `useImperativeHandle`. `PublishButton` holds the ref and calls it. |
| `HeaderEditor` | **Blur-to-persist** — local slide state, dispatches on `onBlur`. Avoids saving on every keystroke. Uses a `useRef` to avoid stale closures. |
| `BodyEditor` / `ContentEditor` | Explicit **"Guardar cambios"** button — user must save manually. |

### Clearing images (logo / favicon)

`ImageUploader` accepts an optional `onRemove` prop — when present, an `×` button appears on the image corner. The caller decides what "remove" means:
- `logo_url` → `updateSite({ logo_url: "" })` (field is non-nullable `string`)
- `favicon_url` → `updateSite({ favicon_url: null })` (field is `string | null`)

### Slug rules
- Valid: `^[a-z0-9-]+$`
- Auto-generated from `studio_name` via NFD normalization (strip accents → lowercase → spaces/hyphens)
- Uniqueness enforced server-side in `createSite` and `updateSite` (excludes current site on update)

### "proyectos" page is special
- `PageEditor` renders `ProjectsPageConfig` instead of `ComponentList` when `page.slug === "proyectos"`
- Only supports a `project_list` component, managed via `upsertProjectListComponent`
- Content is auto-populated from the user's projects — editors cannot add arbitrary components here

### "home" page cannot be hidden
- The `handleToggleVisible` in `PageList` has a guard: `if (page.slug === "home") return`
- The visibility toggle button is `disabled` in the UI for the home page

### Supabase Storage paths (bucket: `sites`, all `upsert: true`)
```
{userId}/logo.webp
{userId}/favicon.webp
{userId}/headers/slide-{slideIndex+1}.webp
{userId}/body/image-{imageIndex}.webp     // imageIndex is 1 | 2 | 3
{userId}/content/image.webp
```

---

## Files Quick Reference

| File | Purpose |
|---|---|
| `src/features/myWeb/screens/MyWeb.tsx` | Main screen: creation flow + two-column editor layout |
| `src/features/myWeb/components/SiteConfigForm.tsx` | General site settings form (imperative ref pattern) |
| `src/features/myWeb/components/PublishButton.tsx` | Publish toggle, save shortcut, preview link |
| `src/features/myWeb/components/PageList.tsx` | Page list with reorder/visibility/nav controls |
| `src/features/myWeb/components/PageEditor.tsx` | Routes to `ProjectsPageConfig` or `ComponentList` |
| `src/features/myWeb/components/ComponentList.tsx` | Component CRUD + reorder per page |
| `src/features/myWeb/components/ComponentEditor.tsx` | Switch dispatcher to type-specific editor |
| `src/features/myWeb/components/HeaderEditor.tsx` | Multi-slide editor (blur-to-persist) |
| `src/features/myWeb/components/SlideEditor.tsx` | Individual slide form |
| `src/features/myWeb/components/CTAEditor.tsx` | CTA layout + content form |
| `src/features/myWeb/components/BodyEditor.tsx` | Image gallery layout selector + upload |
| `src/features/myWeb/components/ContentEditor.tsx` | Rich content section (stats, two columns) |
| `src/features/myWeb/components/ProjectsPageConfig.tsx` | Projects page layout selector |
| `src/features/myWeb/components/ImageUploader.tsx` | Dropzone upload component (supports `onRemove` to clear the image) |
| `src/features/myWeb/components/ColorPicker.tsx` | Hex color picker |
| `src/features/myWeb/components/FontSelector.tsx` | Font dropdown |
| `src/features/myWeb/components/NavbarTypeSelector.tsx` | Navbar style picker |
| `src/features/myWeb/components/LayoutSelector.tsx` | Project list layout selector |
| `src/redux/slices/SiteSlice.ts` | Site Redux slice |
| `src/redux/slices/SitePageSlice.ts` | Pages Redux slice |
| `src/redux/slices/SiteComponentSlice.ts` | Components Redux slice |
| `src/redux/actions/SiteActions.ts` | Site thunks |
| `src/redux/actions/SitePageActions.ts` | Page thunks |
| `src/redux/actions/SiteComponentActions.ts` | Component thunks |
| `src/routes/HasWebRoute.tsx` | Route guard for `/my-web` |
| `src/types/index.tsx` | All types: SiteDataProps, SitePageDataProps, SiteComponentDataProps, etc. |
