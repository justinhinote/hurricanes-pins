# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # next dev (default port 3000)
npm run build    # next build
npm run start    # next start (production server)
```

There is no test suite and no lint script. Type checking happens during `next build`.

Database setup is one-shot: run `schema.sql` against the Neon database.

## Deploy

**Vercel auto-deploy is DISCONNECTED.** `git push` alone does not update the live site. After pushing, always:

```bash
npx vercel --prod --yes
```

Live at https://hurricanes-pins.vercel.app and the custom domain https://www.southparkhurricanes.com.

## Required environment variables

`DATABASE_URL` (Neon pooler), `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` (optional, preferred for image gen), `ADMIN_PASSWORD`. See `.env.local.example`.

## Architecture

Single-tenant contest app for one baseball team's pin designs. Domain model in `schema.sql`:

```
rounds (1) ─── (N) pins ─── (N) votes
                           ─── created_by → players
            ─── (N) preference_snapshots
players (1) ─── (N) votes
```

Only one round is `active` at a time; activating a round archives any other active rounds (`app/api/rounds/[id]/activate/route.ts`). The home page, vote page, and design page all key off the single active round.

### Two pin-creation flows

1. **Admin bulk** (`/admin/generate`): Claude Haiku generates N `ConceptDraft`s from a brief (`lib/claude.ts:generateConcepts`) → for each concept, image is generated and uploaded → all are inserted into `pins` in one shot. Sleeps **12 s between image generations** to respect DALL-E Tier 1 rate limits. `maxDuration = 300`.
2. **Player single** (`/design`): authenticated player POSTs description (and optional photo for Claude vision) to `/api/design/generate`. Claude Haiku rewrites their idea into an image-gen prompt, image is generated, returned as a **draft** (NOT yet in DB). Client must then POST the draft to `/api/design/submit` to persist it. `maxDuration = 120`.

### Image generation pipeline (`lib/dalle.ts`)

Provider fallback order: **Google Imagen 3 → OpenAI `gpt-image-1` → DALL-E 3**. Imagen is preferred because it renders text far more accurately. `generateImage(prompt, pinText?)` builds the rules block dynamically — when `pinText` has content, the model is instructed to render those exact strings on the pin; when it doesn't, the model is forbidden from rendering any text.

### Pin text (`lib/pin-text.ts`)

The user (player or admin) controls **up to 3 optional text slots**: `top`, `middle`, `bottom`. All slots are optional — if all are blank the pin has zero text. Per-slot character limits and defaults live in `lib/pin-text.ts` (`PIN_TEXT_LIMITS` = 18/14/18, `PIN_TEXT_DEFAULTS` = `HURRICANES` / `12U SPYA` / `COOPERSTOWN 2026`). `sanitizeLine` runs on every input — uppercases, strips non-renderable chars, collapses whitespace, hard-truncates. Both client and server call it; never trust raw input.

`formatTextInstructions(pinText)` produces the prompt fragment that gets injected into both Claude (when it builds the image prompt) and the image-gen rules block. Because the user typed exact spelling, Imagen 3 can copy it verbatim into the design — the pin text becomes part of the AI render itself, not a post-composite banner.

### Image normalization (`lib/text-overlay.ts`)

Despite the historical name, this module no longer composites text. `addTextOverlay(image)` simply normalizes the AI image to a 1024x1024 PNG with a white background — the text is already baked in by the image model.

### Preference engine (`lib/preference-engine.ts` + `/api/analyze`)

Each pin has a `tags` text array (color, mascot, style, theme, composition — flattened from `ConceptDraft.tags`). After voting, `computeElementScores` joins votes to pin tags, and per tag computes `score = (cash − trash) / total` with `confidence = min(total/10, 1.0)`. Top/bottom tags + top/bottom pin descriptions are sent to Claude Haiku (`analyzePreferences`) which returns suggested prompt fragments for the next round. Snapshot persisted to `preference_snapshots`.

### Auth (`app/api/lib/auth.ts`)

Two cookie-based sessions, both `httpOnly` and 30 days:
- `admin_token` — compared verbatim to `ADMIN_PASSWORD`. `requireAdmin()` returns a 401 `NextResponse` (truthy) on failure; route handlers do `if (authError) return authError;`.
- `player_token` — random UUID minted by `/api/join`, stored in `players.session_token`. `getPlayerSession()` returns the player's numeric `id` or `null`. Joining is idempotent on lowercased name (returns existing token if the name already exists).

### Two `lib` directories

There are intentionally two: `lib/` at the repo root holds the real implementations (db, claude, dalle, etc.); `app/api/lib/` holds API-internal helpers (`auth.ts`) plus a shim `db.ts` that re-exports `@/lib/db`. When importing from API routes, both forms appear in the codebase — prefer `@/lib/...` for shared modules and `@/app/api/lib/auth` for `requireAdmin` / `getPlayerSession`.

### Database access (`lib/db.ts`)

Single module-level `pg.Pool` with `max: 3` and `ssl.rejectUnauthorized: false` for Neon. Always use `getPool()` rather than constructing your own. Vote inserts catch Postgres error code `23505` (unique violation) and return 409 — that's the "already voted" path.

### Styling

Tailwind CSS v4 via `@import "tailwindcss"` in `app/globals.css`. Custom theme tokens are declared in `@theme inline` and exposed as Tailwind colors: `crimson`, `crimson-dark`, `fire`, `fire-dim`, `black`, `charcoal`, `sp-white`. The Anton display font is loaded via `next/font/google` and surfaced as `var(--font-anton)` — used inline as `style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}` for headings.

## Conventions to honor

- **Text on pins is AI-rendered from user-typed strings.** The three pin text slots are passed to the image model with explicit "render exactly these letters, do not invent additional words" instructions. Do NOT re-introduce post-composite SVG banners — they look pasted on. If the AI misspells, the user re-rolls.
- **Year is 2026** everywhere (Cooperstown trip year). Earlier commits had to fix `2025` slipping into prompts; keep new prompts on 2026.
- **Pin shape variety.** The Claude system prompt explicitly demands different shapes across concepts. Don't add a shape constraint that collapses them all to circles.
- **No emojis** in code, copy, or commits (project-wide rule).
- **Player content is 12-year-olds.** Copy and prompts target that audience; "Cash or Trash" is the voting verb, not "like/dislike".
