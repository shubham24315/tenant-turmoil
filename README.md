# Tenant Turmoil

A web app for **renters in Bengaluru** to record what goes wrong in a flat—leaks, power cuts, noise, and anything else worth remembering—and to **browse other listings** with community ratings and photos. It is built for transparency between tenants, not for landlords.

---

## Purpose

- **Document turmoil**: Signed-in users can list **one property per account** (address in Bengaluru) and add **notes**. Each note has text, a **1–5 rating**, and optional **images**.
- **Learn from others**: Anyone can **browse** properties and open a **property page** with an aggregate rating, a star breakdown, and every note (with image carousels).
- **Trust boundaries**: Notes on a property can only be created by the **owner of that listing** (enforced in Postgres with RLS and a trigger). Other users can read but not edit others’ notes.

The product goal is simple: make rental pain visible so the next tenant goes in with eyes open.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router), React 19 |
| Backend / DB / Auth / Files | [Supabase](https://supabase.com) (Postgres, Auth, Storage) |
| UI | [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS4) |
| Package manager | [pnpm](https://pnpm.io) |

---

## Repository layout

```text
app/                    # App Router routes (pages, API, auth callback)
  api/properties/       # Paginated JSON for infinite scroll
  auth/callback/        # OAuth code exchange for Supabase
  login/
  properties/
components/             # React components (including ui/)
lib/
  supabase/             # Browser + server Supabase clients, session middleware
  data/                 # Property queries and pagination helpers
  auth/                 # Display name helpers for the nav
  storage/              # Public URLs for note images
supabase/migrations/    # SQL migrations (apply manually or via your workflow)
middleware.ts           # Refreshes Supabase session cookies (no forced login)
```

---

## Prerequisites

- **Node.js** 20+ (recommended)
- **pnpm** 9+
- A **Supabase** project (free tier is fine)
- **Google OAuth** credentials if you use Google sign-in (configured in Supabase Auth)

---

## Local development

### 1. Clone and install

```bash
git clone <your-fork-or-repo-url>
cd tenant-turmoil
pnpm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-anon-key>
```

Use the **Project URL** and **publishable (anon) key** from the Supabase dashboard (**Project Settings → API**). Never commit `.env.local` or put the **service_role** key in any `NEXT_PUBLIC_*` variable.

### 3. Database and storage

SQL lives in:

```text
supabase/migrations/20260415120000_tenant_turmoil_core.sql
```

Apply it using whichever workflow you prefer, for example:

- Supabase **SQL Editor** (paste and run the file), or
- **Supabase CLI** linked to your project (`supabase db push` or your team’s process).

The migration creates tables (`properties`, `property_notes`, `note_images`), a stats view, RLS policies, a note-author trigger, and the **`note-images`** storage bucket.

### 4. Authentication (Google)

In the Supabase dashboard:

1. **Authentication → Providers → Google**: enable and add Client ID / Secret from Google Cloud Console.
2. **Authentication → URL configuration**: set **Site URL** (e.g. `http://localhost:3000` for dev).
3. Add **Redirect URLs**, including:
   - `http://localhost:3000/auth/callback`
   - Your production URL, e.g. `https://your-domain.com/auth/callback`

The app uses `signInWithOAuth` with `redirectTo` pointing at `/auth/callback`.

### 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Public routes (home, browse, property detail) work without signing in; listing a property requires Google login.

### 6. Quality checks

```bash
pnpm lint          # ESLint
pnpm run build     # Production build + TypeScript
```

---

## How deployment works

You deploy **two pieces**: the **Next.js app** (frontend + API routes + middleware) and the **Supabase project** (already hosted by Supabase). The repo does not auto-run migrations in production; your database must already match the schema in `supabase/migrations/`.

### Deploy the Next.js app (e.g. Vercel)

1. Push the repo to GitHub (or GitLab / Bitbucket).
2. Import the project in [Vercel](https://vercel.com) (or another Node host that supports Next.js 16).
3. Set **environment variables** in the hosting dashboard (same names as `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy. Vercel will run `pnpm install`, `next build`, and serve the app.

5. Update Supabase **Site URL** and **Redirect URLs** to your **production** origin so OAuth returns to `https://<your-domain>/auth/callback`.

### Deploy / migrate the database

- Run the migration SQL against your **production** Supabase project (SQL Editor or CI/CD), **before** or **when** you rely on new tables.
- Confirm the **`note-images`** bucket exists and policies match what the app expects (see migration file).

### Images

`next.config.ts` derives `images.remotePatterns` from `NEXT_PUBLIC_SUPABASE_URL` so `next/image` can load public storage URLs. After changing Supabase URL in production, redeploy so the config matches.

---

## Contributing

Contributions are welcome: bug fixes, copy improvements, accessibility, and small features that fit the product scope.

### Workflow

1. **Open an issue** (or comment on an existing one) for non-trivial changes so direction is agreed early.
2. **Fork** the repository and create a branch: `feat/short-description` or `fix/short-description`.
3. **Keep PRs focused**: one logical change per pull request; avoid drive-by refactors.
4. **Before opening a PR**:
   - `pnpm lint`
   - `pnpm run build`
5. **Describe the PR** in plain language: what changed, why, and how to verify (including any Supabase or env steps if relevant).

### Code expectations

- Match existing patterns (App Router, server vs client components, Supabase helpers in `lib/supabase`).
- **Security**: do not commit secrets; use env vars. Respect RLS—avoid suggesting `service_role` in browser code. Follow validation and safe defaults for any new user input or file uploads.
- **Database changes**: add a new timestamped file under `supabase/migrations/` and document in the PR what to run and any backfill steps. Prefer RLS-friendly designs and separate policies for `anon` / `authenticated` where the project already does.
- **UI**: Prefer existing shadcn components and design tokens (`bg-background`, `text-muted-foreground`, etc.).

### UI components

This project uses shadcn’s CLI to add components. From the repo root:

```bash
pnpm dlx shadcn@latest add <component>
```

See [`components.json`](components.json) for aliases and the optional `@supabase` registry.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server (Turbopack) |
| `pnpm run build` | Production build |
| `pnpm start` | Start production server (after `build`) |
| `pnpm lint` | Run ESLint |
| `pnpm run lint:fix` | ESLint with auto-fix |

---

## Documentation and support

- **Next.js**: [https://nextjs.org/docs](https://nextjs.org/docs) (this project targets current App Router conventions; check local `node_modules/next/dist/docs` if something diverges from older tutorials).
- **Supabase**: [https://supabase.com/docs](https://supabase.com/docs) (Auth, Postgres, Storage, RLS).

---

## License

Unless the repository root contains a different `LICENSE` file, treat licensing as specified by the repository owner.
