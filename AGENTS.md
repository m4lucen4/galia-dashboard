# AGENTS.md — galia-dashboard

## What is this project?

**Galia** is the client-facing dashboard for **Mocklab**, a SaaS platform for professional architecture and design studios. Users manage projects, social media posts, multimedia files, and build a public portfolio website — all from one place.

- SPA deployed on **Vercel** with serverless API functions in `/api`
- Client portfolio sites hosted at `https://sites.mocklab.app/{slug}`
- Primary language of the UI: **Spanish**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript (strict), Vite 7 |
| Styling | TailwindCSS v4 |
| State | Redux Toolkit (slices + async thunks) |
| Routing | React Router v7 |
| Backend | Supabase (auth, PostgreSQL, storage, Edge Functions) |
| Payments | Stripe (`@stripe/stripe-js` + serverless functions in `/api`) |
| i18n | i18next HTTP backend — `src/locales/{es,en,cat}/translation.json` |
| Package manager | pnpm |

---

## Directory Structure

```
src/
├── features/           # Feature modules, each self-contained
│   ├── myWeb/          # → Site builder (see skills/myWeb.md)
│   ├── projects/       # Architecture project management
│   ├── postPreview/    # Social media post scheduling
│   ├── multimedia/     # File/folder manager
│   ├── profile/        # User profile editing
│   ├── settings/       # App settings + OAuth (Instagram, LinkedIn)
│   ├── login/          # Auth screens
│   ├── register/       # Stripe subscription onboarding
│   ├── adminPanel/     # Admin-only GPT management
│   ├── archive/        # Admin-only project archive
│   ├── users/          # Admin-only user management
│   └── web/            # Public marketing landing page
├── redux/
│   ├── slices/         # One slice per domain
│   └── actions/        # Async thunks, one file per domain
├── components/
│   ├── shared/ui/      # InputField, Button, Alert, Navbar, etc.
│   └── ui/             # shadcn/ui primitives (button, carousel)
├── routes/             # Route guards
├── types/index.tsx     # All shared TypeScript types
├── helpers/            # supabase client, imageOptimizer
├── hooks/              # Shared custom hooks
└── locales/            # i18n translation files
api/                    # Vercel serverless functions (Stripe, contact form)
supabase/functions/     # Supabase Edge Functions (stripe-webhook, serve-photo)
```

Each feature follows the pattern: `features/{name}/screens/` (full-page views) + `features/{name}/components/` (feature-specific UI).

---

## Coding Conventions

- **Components:** PascalCase, `.tsx`, functional only.
- **Imports:** Use `@/` alias for `src/` (e.g., `@/features/myWeb/...`).
- **State:** `useAppDispatch` / `useAppSelector` from `src/redux/hooks.ts`. Never use raw `useDispatch`/`useSelector`.
- **IRequest pattern:** All async operations tracked as `{ inProgress: boolean; messages: string; ok: boolean }`.
- **UI text:** Spanish. Code identifiers (variables, functions, files): English.
- **No tests.** The project has no test suite — do not create test files.
- **Images:** Compressed client-side with `browser-image-compression` before upload. Stored in Supabase Storage as public URLs.

---

## Route Guards

| Guard | Condition |
|---|---|
| `ProtectedRoute` | Authenticated |
| `AdminRoute` | `user.role === "admin"` |
| `AdminWebRoute` | Admin or `has_web` |
| `HasWebRoute` | Authenticated + `user.has_web === true` |
| `NonAuthenticatedRoute` | Not authenticated |
| `PublicRoute` | Always accessible |

---

## Key Constraints

- **`user.has_web`** is the flag that gates `/my-web`. It must be set in the DB — it's not automatic.
- **Supabase RLS** is partially implemented. Do not assume all tables are fully secured at DB level.
- **Stripe subscription** plans are `lite` and `professional`, billing periods `monthly` / `annual`. A trial period exists.
- **Vercel API functions** (`/api/*.ts`) have their own `tsconfig.api.json` and run as Node.js serverless.
- **pnpm** is the only supported package manager.

---

## Development

```bash
pnpm dev       # Start local dev server
pnpm build     # TypeScript check + Vite build
pnpm lint      # ESLint
```

---

## Skills (deep feature context)

Skills are supplementary documents with full context for specific features. Reference them before working on the corresponding area.

- [`skills/myWeb.md`](skills/myWeb.md) — Site builder: data model, component tree, Redux state, non-obvious patterns.
