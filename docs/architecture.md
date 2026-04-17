# PulayRun — Architecture

Status: Draft v0.1
Last updated: 2026-04-17
Related: [`spec.md`](spec.md) · [`decisions/001-stack-choice.md`](decisions/001-stack-choice.md) · [`decisions/002-knowledge-base-video-transcripts.md`](decisions/002-knowledge-base-video-transcripts.md)

---

## 1. Overview

PulayRun is a single Next.js application (frontend + API) backed by a Postgres database and a small set of external services. The LLM coach sits in the API layer, invoked when the user sends a chat message or when a background job triggers a plan review. Strava is integrated via OAuth and a single app-level webhook. A small knowledge base of running/triathlon PDFs is ingested offline into Postgres with vector embeddings and retrieved at coach-response time.

---

## 2. Stack (confirmed)

See [`decisions/001-stack-choice.md`](decisions/001-stack-choice.md) for the reasoning.

| Layer | Choice |
|---|---|
| App framework | Next.js (TypeScript, App Router) |
| Database | Postgres + `pgvector` (hosted on Neon) |
| ORM | Drizzle |
| Auth | Clerk |
| LLM | Anthropic TS SDK (provider choice deferred — Anthropic is the default proposal) |
| Embeddings | Deferred with LLM provider choice |
| PDF parsing | `pdf-parse` (or `pdfjs-dist`) in a one-off ingestion script |
| Background jobs | Inngest |
| Error tracking | Sentry |
| Hosting | Vercel |
| Object storage (book PDFs) | Vercel Blob or S3 — deferred until ingestion pipeline is built |

---

## 3. System topology

```
┌──────────────────────┐          ┌───────────────────────┐
│        Browser       │  HTTPS   │  Vercel (Next.js app) │
│  React UI + chat UI  │◄────────►│  - UI (server + RSC)  │
│                      │          │  - API routes         │
└──────────────────────┘          │  - Server Actions     │
                                  └──────────┬────────────┘
                                             │
             ┌───────────────────────────────┼────────────────────────────┐
             ▼                               ▼                            ▼
        ┌─────────┐                   ┌─────────────┐              ┌──────────────┐
        │  Clerk  │                   │    Neon     │              │   Inngest    │
        │  (auth) │                   │  Postgres   │              │ (background  │
        └─────────┘                   │  + pgvector │              │    jobs)     │
                                      └─────────────┘              └──────┬───────┘
                                             ▲                            │
                                             │                            │
                                             └────────────────────────────┘
                                                    (jobs read/write DB)

                      ┌──────────────────┐          ┌──────────────────┐
                      │  Strava API      │          │  Anthropic API   │
                      │  - OAuth         │          │  - LLM (chat)    │
                      │  - Webhook       │          │  - (embeddings?) │
                      │  - Activity GET  │          │                  │
                      └──────────────────┘          └──────────────────┘
                              ▲                              ▲
                              │                              │
                              └──── called by app / jobs ────┘
```

---

## 4. Data model

All tables use `uuid` primary keys unless noted. Timestamps are `timestamptz`. `created_at` / `updated_at` omitted from listings below for brevity — assume every table has them.

### 4.1 User & profile

**`users`** — the application-layer user. Clerk owns auth; we own the app-level record.
- `id` — uuid, pk
- `clerk_user_id` — text, unique — maps to Clerk's user id
- `email` — text — cached from Clerk for display; Clerk is source of truth

**`athlete_profiles`** (1:1 with users)
- `user_id` — uuid, pk, fk → users.id
- `age` — int
- `sex` — text nullable
- `height_cm`, `weight_kg` — nullable
- `running_years` — int
- `goal_type` — enum: `race_goal | general_fitness | health_maintenance`
- `goal_race_distance` — enum nullable: `5k | 10k | half | full | ultra | other`
- `goal_race_date` — date nullable
- `goal_description` — text (free-form, from onboarding chat)
- `archetype` — enum: `beginner | general_fitness | masters | competitive | recreational`
- `archetype_source` — enum: `onboarding | strava_refined | manual_override`
- `archetype_confidence` — float (0–1)
- `preferences` — jsonb — see §4.7 shape

### 4.2 Strava connection

**`strava_connections`** (1:1 with users)
- `user_id` — pk, fk
- `strava_athlete_id` — bigint, unique
- `access_token_enc` — bytea (encrypted at rest)
- `refresh_token_enc` — bytea
- `token_expires_at` — timestamptz
- `scope` — text
- `connected_at`, `disconnected_at` — timestamptz nullable

Webhooks are app-level (one subscription for the whole app), so no per-user webhook record is needed.

### 4.3 Plans & workouts

**`plans`**
- `id` — pk
- `user_id` — fk
- `status` — enum: `draft | active | completed | archived`
- `start_date`, `end_date` — date
- `goal_description` — text
- `generator_context` — jsonb — snapshot of profile, state, and retrieved knowledge used to generate this plan (for debugging and regeneration)

**`plan_blocks`** (periodization structure)
- `id` — pk
- `plan_id` — fk
- `phase` — enum: `base | build | peak | taper | recovery | maintenance`
- `start_date`, `end_date` — date
- `description` — text
- `sort_order` — int

**`workouts`**
- `id` — pk
- `user_id` — fk (denormalized for simpler queries)
- `plan_id` — fk nullable (nullable allows ad-hoc workouts outside a plan)
- `block_id` — fk nullable
- `scheduled_date` — date
- `workout_type` — enum: `easy_run | tempo | intervals | long_run | recovery_run | race | strength | cross_training | rest`
- `planned` — jsonb — `{ distance_m, duration_s, target_pace_per_km, target_hr_zone, structure, description }`
- `status` — enum: `planned | completed | skipped | modified | deleted`
- `linked_activity_id` — fk nullable → activities.id
- `notes` — text nullable (user's free-form)
- `sort_order` — int (for multiple workouts on the same day)

### 4.4 Activities & derived state

**`activities`** (from Strava)
- `id` — pk
- `user_id` — fk
- `strava_activity_id` — bigint, unique
- `start_time` — timestamptz
- `activity_type` — text (Strava's classification)
- `distance_m`, `moving_time_s`, `elapsed_time_s` — numeric
- `total_elevation_gain_m` — numeric nullable
- `average_heartrate`, `max_heartrate` — nullable
- `average_speed_mps`, `max_speed_mps` — nullable
- `perceived_exertion` — nullable
- `raw_payload` — jsonb (full Strava response, for forward compatibility)

**`athlete_states`** (1:1 with users, rebuilt periodically)
- `user_id` — pk, fk
- `estimated_easy_pace_per_km_s` — int nullable
- `estimated_threshold_pace_per_km_s` — int nullable
- `current_weekly_volume_km` — numeric nullable
- `volume_trend_7d_pct` — numeric nullable (relative change)
- `recent_missed_workouts` — int
- `last_computed_at` — timestamptz

Rebuilt by a background job after activity sync and nightly.

### 4.5 Chat

**`chat_sessions`**
- `id` — pk
- `user_id` — fk
- `plan_id` — fk nullable
- `title` — text (auto-generated from first user message)

**`chat_messages`**
- `id` — pk
- `session_id` — fk
- `role` — enum: `user | assistant | tool`
- `content` — text
- `tool_calls` — jsonb nullable (assistant messages that invoke tools)
- `tool_results` — jsonb nullable (tool-role messages' return values)

### 4.6 Knowledge base

**`knowledge_sources`** (renamed from `knowledge_books` per ADR-002)
- `id` — pk
- `title` — text
- `author` — text nullable
- `source_type` — enum: `pdf | video_transcript`
- `source_location` — text — path or channel URL identifying where the source came from
- `archetype_tags` — text[] — e.g., `['masters', 'competitive']`
- `goal_tags` — text[] — e.g., `['marathon', 'ultra']`
- `notes` — text nullable

**`knowledge_chunks`**
- `id` — pk
- `source_id` — fk → knowledge_sources.id
- `origin_ref` — text nullable — e.g., page number for PDFs, video_id for transcripts (for debugging only; not surfaced)
- `chunk_index` — int
- `text` — text
- `token_count` — int
- `embedding` — `vector(N)` — dimension set when embedding model is chosen

Indexed on `embedding` with `ivfflat` or `hnsw` for similarity search.

### 4.7 Preferences shape (`athlete_profiles.preferences`)

```ts
type Preferences = {
  preferredDays?: ('mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun')[];
  avoidDays?: ('mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun')[];
  preferredTimeOfDay?: 'early_morning'|'morning'|'midday'|'afternoon'|'evening';
  dislikedWorkoutTypes?: ('tempo'|'intervals'|'long_run'|'hills'|'strength'|'cross_training')[];
  restDayPreference?: ('mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun')[];
  availableMinutesPerDay?: { weekday?: number; weekend?: number };
  notes?: string;
};
```

Shape is versioned implicitly — any field can be added; code must handle missing fields gracefully.

---

## 5. Core flows

### 5.1 Onboarding

1. User signs up via Clerk (email or social).
2. Webhook from Clerk → create `users` row.
3. User lands on onboarding screen (`/onboarding`).
4. Structured multi-step form (no LLM during onboarding in v1). Fields are intentionally minimal because hard data (age, sex, weight, running history, pace baselines) comes from Strava:
   - **Goal type** — race / general fitness / health maintenance. If race: distance + target date.
   - **Training days** — which days of the week the athlete is available to run (stored in `preferences.trainingDays`).
   - **Free-text context** (optional) — "anything else your coach should know" (injuries, life context, preferences). Stored as `athlete_profiles.goal_description`. Captured for later LLM use; not consumed during onboarding in v1.
   - **Archetype derivation** — set from goal type alone via simple rule: `race_goal → serious_athlete`, `general_fitness → general_fitness`, `health_maintenance → health_maintenance`. `archetype_source = "onboarding"`.
5. Strava OAuth connect — **skippable**. A "skip for now" option is offered alongside the primary connect button. If skipped, a banner on the calendar encourages connecting Strava for more accurate coaching.
6. Backfill job (only if Strava connected): fetch last 6 months of activities. Compute initial `athlete_states`.
7. Archetype refinement (only if Strava connected): combine onboarding answers + Strava-derived state to set `archetype` and `archetype_confidence`. `archetype_source = "strava_refined"`.
8. Generate initial plan (see §5.2).
   - With Strava: personalized to current fitness + volume + pace.
   - Without Strava: generic plan appropriate for the goal + archetype, with a UI banner inviting the user to connect Strava for personalization.
9. Land on calendar.

### 5.2 Plan generation

Triggered during onboarding or from chat ("generate a plan for a half marathon in 12 weeks").

1. Assemble generator context: profile, preferences, athlete state, recent activities (summarized), goal, retrieved knowledge chunks relevant to this athlete+goal.
2. Invoke LLM with `create_plan` tool. Model returns a structured plan: blocks + workouts.
3. Persist as `plans` + `plan_blocks` + `workouts` rows. Status `draft`.
4. Show plan to user; on approval, flip to `active`.
5. Store the full generator context in `plans.generator_context` (for reproducibility / regeneration).

### 5.3 Chat → plan adjustment

1. User sends a message. A `chat_messages` row is created.
2. Server loads session history (all messages in this session), current plan summary, athlete state, preferences.
3. LLM call with tools available: `update_workout`, `create_workouts`, `delete_workout`, `regenerate_plan`, `get_recent_activities`, `update_preferences`, `query_knowledge`.
4. Streaming response to client. Tool calls are executed server-side and their results fed back into the model for the final response.
5. Calendar UI listens for updates and re-renders.

### 5.4 Strava activity sync

**Webhook path (ongoing):**
1. Strava POSTs to `/api/strava/webhook` when a connected user creates/updates/deletes an activity.
2. Route returns 200 immediately, enqueues an Inngest job (`strava.activity.ingest`).
3. Job fetches full activity detail from Strava, upserts into `activities`.
4. Job runs workout-matching heuristic: find `workouts` with `scheduled_date == activity.start_time::date AND status = 'planned'`, match by type and duration within a tolerance, set `linked_activity_id` and `status = 'completed'`.
5. Job triggers athlete-state recomputation.

**Backfill path (one-time per user):**
On OAuth connect, enqueue `strava.backfill` job that paginates `/athlete/activities` for the last 6 months.

### 5.5 Background jobs (Inngest)

- `strava.backfill` — one-time history pull on connect
- `strava.activity.ingest` — per-activity detail fetch and match
- `athlete_state.recompute` — triggered after ingest + nightly cron
- `knowledge.ingest_book` — runs when a new PDF is registered

---

## 6. LLM layer

### 6.1 Tool definitions (initial set)

```ts
// Read tools
get_current_plan(): PlanSummary
get_upcoming_workouts(days: number): Workout[]
get_recent_activities(days: number): Activity[]
get_athlete_state(): AthleteState
query_knowledge(query: string, tags?: string[]): KnowledgeSnippet[]

// Write tools
create_plan(plan: PlanSpec): { planId: string }
update_workout(workoutId: string, changes: Partial<WorkoutSpec>): Workout
create_workouts(workouts: WorkoutSpec[]): Workout[]
delete_workout(workoutId: string): void
regenerate_plan(params: { reason: string, newEndDate?: string }): { planId: string }
update_preferences(changes: Partial<Preferences>): Preferences
```

All write tools validate server-side (authorization: user can only modify their own records; schema: Zod validation on every input).

### 6.2 Prompt structure

A coach turn assembles:
1. **System prompt** — coach persona, safety rules (not medical advice), tool usage conventions.
2. **Context block** — profile summary, current preferences, current athlete state, current plan summary, today's date.
3. **Knowledge block** — results of `query_knowledge` if the turn benefits from retrieval (determined by either a pre-pass classifier or the model deciding to call the tool itself; v1 will let the model call it).
4. **Conversation history** — the current chat session's messages.
5. **Latest user message.**

### 6.3 Session / memory model

- Chat memory scope: **per session**. Each session is a coherent conversation; starting a new chat starts fresh.
- Durable state (preferences, profile updates, plan changes) lives in the database, not in chat history. The model learns durable facts by reading the context block at the start of each turn, not by recalling old chats.
- Open question (spec §10.10) — whether multiple sessions within a plan should share any additional memory is deferred to post-v1.

---

## 7. Knowledge base

Sources come in two types: **PDFs** (books) and **video transcripts** (long-form coaching videos transcribed offline). See [`decisions/002-knowledge-base-video-transcripts.md`](decisions/002-knowledge-base-video-transcripts.md) for the rationale on adding transcripts. The ≤10-source budget applies at the **author/channel** level, not the file level (one channel = one source even if it contains many video files).

### 7.1 Ingestion (offline, developer-run)

A Node script (`scripts/ingest-source.ts`) — handles both source types via a `--type pdf|transcripts` flag:

**For `--type pdf`:**
1. Reads PDF from local path (PDFs stored outside the git repo per the copyright note).
2. Extracts text with `pdf-parse`.
3. Normalizes (strip page numbers, headers, hyphenation artifacts).

**For `--type transcripts`:**
1. Reads a directory of `.md` transcript files (one per video, produced by the offline `yt-dlp` + `whisper.cpp` pipeline — see ADR-002).
2. Parses the YAML header (`source`, `video_id`, `title`, `duration_s`, `view_count`, `url`) and uses `source` to group all videos under a single `knowledge_sources` row.
3. Sentence-aware chunking (spoken transcripts lack paragraph structure, so fixed-token windows chunk poorly — see ADR-002 implementation notes).

**Common steps (both types):**
4. Chunks into ~500-token pieces with ~50-token overlap.
5. Embeds each chunk (embedding model TBD with LLM provider).
6. Upserts `knowledge_sources` row and `knowledge_chunks` rows.
7. Developer provides metadata via a small TOML/JSON config file: `title`, `author`, `source_type` (`pdf | video_transcript`), `archetype_tags`, `goal_tags`.

### 7.2 Retrieval

`query_knowledge(query, tags?)`:

1. Embed the query.
2. SQL: `SELECT ... ORDER BY embedding <=> query_embedding LIMIT k` with optional `WHERE archetype_tags && $tags`.
3. Return the top `k` snippets (k=5 initial) with source book id (for internal debugging; not surfaced to user per silent-synthesis requirement).

### 7.3 Where the user's archetype comes in

Tag filtering uses the user's `archetype` to prefer chunks from matching books (e.g., masters user → filter to books tagged `masters` or `general`). Falls back to the whole pool if filtered results are thin.

---

## 8. Auth

- **Clerk** handles email/password, social logins, sessions, password resets, email verification.
- Next.js middleware (`middleware.ts`) protects authenticated routes.
- Webhook from Clerk (`user.created`) creates the `users` row.
- All API routes read `userId` from Clerk session; database queries filter by `user_id` — never trust a client-supplied user id.
- Row-level authorization: a helper function `requireOwnership(userId, resource)` checks every write.

---

## 9. Deployment & ops

### Environments

- **Local** — Next.js dev server, local Postgres via Docker or a separate Neon branch, Clerk dev instance, Strava dev app, Anthropic dev key.
- **Staging** — Vercel preview deployments on every PR. Separate Neon branch. Separate Clerk + Strava + Anthropic credentials.
- **Production** — Vercel production. Production Neon database.

### Secrets

- Never committed.
- Vercel environment variables for staging + production.
- `.env.local` for dev, `.env.example` (committed) as a template.

### Observability

- Sentry captures unhandled errors in API routes and client.
- Vercel's built-in logs for request-level debugging.
- Inngest dashboard for background job status.

### CI

- GitHub Actions on every PR: install, lint (ESLint), typecheck (`tsc --noEmit`), run tests (Vitest).
- Block merge on red CI.

---

## 10. Repository structure (proposed)

```
pulayrun/
├── CLAUDE.md
├── README.md
├── .env.example
├── package.json
├── next.config.ts
├── drizzle.config.ts
├── tsconfig.json
├── docs/
│   ├── spec.md
│   ├── architecture.md
│   └── decisions/
│       └── 001-stack-choice.md
├── src/
│   ├── app/                  # Next.js routes (App Router)
│   │   ├── (auth)/           # sign-in, sign-up, onboarding
│   │   ├── (app)/            # authenticated area
│   │   │   ├── calendar/
│   │   │   ├── chat/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── chat/
│   │       ├── strava/
│   │       └── inngest/
│   ├── db/
│   │   ├── schema.ts         # Drizzle table definitions
│   │   └── client.ts
│   ├── lib/
│   │   ├── coach/            # LLM prompt assembly, tool definitions
│   │   ├── strava/           # API client, token refresh, webhook verification
│   │   ├── knowledge/        # retrieval
│   │   └── athlete-state/    # derived state computation
│   ├── jobs/                 # Inngest job definitions
│   └── components/           # React components
├── scripts/
│   └── ingest-book.ts
└── tests/
```

---

## 11. Remaining open questions

From `spec.md` §10, the following remain open and are **not** resolved by this document:

- **#2 Strength & cross-training depth** — spec-level product decision. Architecture accommodates any answer (workout_type already includes `strength` and `cross_training`; the `planned` jsonb can hold whatever structure is decided).
- **#4 Goal setting UX** — onboarding flow needs a concrete screen design. Architecture supports any shape.
- **#5 Missed workout handling** — needs a concrete behavior. Architecture has the data (`status = 'skipped'`) and the tools (`update_workout`, `create_workouts`) to implement any chosen behavior.
- **#6 Activity ↔ workout matching heuristic** — proposed a simple date+type+duration match; tuning deferred.
- **#9 Strava data retention policy** — v1 keeps indefinitely while connection is active; on disconnect, a cleanup job removes `activities` rows per Strava ToS. Concrete retention window for disconnected accounts to be decided.

Resolved in this doc and reflected in the model:
- Multi-user model (spec §10.8) → Clerk-based public-style auth.
- Preferences memory (spec §10.3) → structured field on profile + LLM tool to write.
- Archetype detection (spec §10.7) → hybrid onboarding + Strava refinement.
- Knowledge base sourcing (spec §10.1) → developer-uploaded PDFs, ingested offline, stored as chunks + embeddings in Postgres.
- Chat memory (spec §10.10) → session-scoped; durable state in DB.
