# PulayRun — Development Roadmap

Status: Active
Last updated: 2026-04-17
Related: [`spec.md`](spec.md) · [`architecture.md`](architecture.md)

---

## How to use this document

This roadmap defines the **build order** for PulayRun. The spec (`spec.md`) defines *what* to build; the architecture (`architecture.md`) defines *how*; this document defines *when* and *in what sequence*.

Update this document when:
- A phase is completed (check it off)
- The build order changes (note why)
- A task is added or removed from a phase

Do **not** add scope beyond what's in the spec without updating the spec first (see CLAUDE.md scope discipline rules).

---

## Phase 0: Foundation

**Goal:** Dev environment working end-to-end — schema in the database, auth flow testable.

- [x] Stack decision + ADR (`docs/decisions/001-stack-choice.md`)
- [x] Project scaffold (Next.js 16, TypeScript, Tailwind)
- [x] DB schema designed (`src/db/schema.ts`)
- [x] Clerk auth wired up (`src/proxy.ts` + `ClerkProvider` in layout)
- [x] `.env.local` created with Clerk keys + Neon DATABASE_URL
- [x] Push schema to Neon (drizzle-kit push — completed 2026-04-17)
- [x] App theme established (warm Claude-inspired palette — `globals.css`)
- [x] Test sign-up flow (first test user — completed 2026-04-17)
- [x] Commit all pending changes (79a3dc4 — pushed 2026-04-17)

---

## Phase 1: Auth + Onboarding

**Goal:** A new user can sign up, complete onboarding, and have a populated profile in the database.

- [x] Sign-in / sign-up pages (Clerk components, App Router routes — completed 2026-04-17)
- [x] Clerk webhook (`user.created`) → create `users` row in database (completed 2026-04-17)
- [x] Onboarding flow — 3-step form: goal type, training days, free-text (completed 2026-04-17)
- [x] Populate `athlete_profiles` + `preferences` from onboarding answers (completed 2026-04-17)
- [x] Set initial `archetype` from onboarding answers (source = `onboarding`) (completed 2026-04-17)
- [x] Redirect to calendar after onboarding completes (completed 2026-04-17)
- [x] Placeholder `/calendar` page with "connect Strava" banner (completed 2026-04-17)

**Architecture reference:** §5.1 (Onboarding flow)

---

## Phase 2: Calendar UI (first vertical slice)

**Goal:** The home screen exists — a user sees their week with workouts on it.

- [x] Week view — shows workouts for current week, one row per day (completed 2026-04-17)
- [x] Periodization view — zoomed-out view of training blocks/phases (completed 2026-04-17)
- [x] Placeholder/seed workouts — `createSamplePlan` server action (completed 2026-04-17)
- [x] Workout detail view (planned parameters, status, notes) (completed 2026-04-17)
- [x] Navigation between weeks (completed 2026-04-17)
- [x] Manual workout status toggle (mark completed/skipped/reset) (completed 2026-04-17)
- [x] Settings page (/settings) — view profile + reset-data dev utility (completed 2026-04-17)

**Architecture reference:** §10 (Repository structure — `src/app/(app)/calendar/`)
**Spec reference:** §9 (Interface Principles — calendar is the home screen)

### Dev infrastructure added alongside Phase 2
- [x] Vitest + 14 tests for date utilities (completed 2026-04-17)
- [ ] GitHub Actions CI workflow — ready-to-go file exists in commit 7038052 but requires a workflow-scoped GitHub PAT to push. Re-add when credentials are updated.
- [x] `typescript.ignoreBuildErrors: true` in next.config.ts — works around Next.js 16.2.4 type-packaging bug. Remove once upstream fixes `next/types.d.ts` (tracked as technical debt).

---

## Phase 3: Strava Integration

**Goal:** A user can connect Strava, and their activities sync automatically into the app.

- [ ] OAuth connect flow (`/api/strava/callback`)
- [ ] Token storage + automatic refresh logic
- [ ] Webhook handler (`/api/strava/webhook`)
- [ ] Inngest setup (background job framework)
- [ ] Backfill job — fetch last 6 months of activities on connect
- [ ] Activity ingest job — per-activity detail fetch + upsert
- [ ] Activity ↔ workout matching (date + type + duration heuristic — see open question #6)
- [ ] Athlete state computation (easy pace estimate, weekly volume, trends)

**Architecture reference:** §5.4 (Strava activity sync), §5.5 (Background jobs)
**Open question:** #6 (matching heuristic tuning deferred until real data)

---

## Phase 4: LLM Coach + Plan Generation

**Goal:** The coach can generate a personalized multi-week training plan from a user's profile and goals.

- [ ] Knowledge base ingestion script (`scripts/ingest-book.ts`)
- [ ] LLM tool definitions (`create_plan`, `update_workout`, `get_recent_activities`, etc.)
- [ ] Prompt assembly (system prompt, context block, knowledge retrieval)
- [ ] Plan generation flow — profile + athlete state + knowledge → structured plan
- [ ] Persist generated plan → `plans` + `plan_blocks` + `workouts` rows
- [ ] Plan approval UX (user reviews draft plan, confirms to activate)

**Architecture reference:** §5.2 (Plan generation), §6 (LLM layer), §7 (Knowledge base)
**Open question:** #2 (strength/cross-training depth — product decision needed before or during this phase)

---

## Phase 5: Chat Interface

**Goal:** The user can talk to the coach, and the coach can read and modify plans through conversation.

- [ ] Chat API route (`/api/chat`) with streaming responses
- [ ] Chat UI component (persistently accessible — sidebar, drawer, or panel)
- [ ] Server-side tool execution (plan edits, preference updates, knowledge queries)
- [ ] Chat-driven plan adjustments (move, swap, cancel, rebuild workouts)
- [ ] Chat history persistence (`chat_sessions` + `chat_messages`)
- [ ] Context block assembly per turn (profile, state, plan summary, preferences)

**Architecture reference:** §5.3 (Chat → plan adjustment), §6.2 (Prompt structure), §6.3 (Session/memory model)

---

## Phase 6: Polish + Proactivity

**Goal:** The coach notices things and surfaces them; the app feels responsive to the athlete's real-world training.

- [ ] Missed workout detection + coach banner on calendar
- [ ] Fatigue/overtraining signals derived from athlete state
- [ ] Strength & cross-training recommendations in generated plans
- [ ] Settings page (preferences, Strava connection management, profile edits)

**Spec reference:** §8 (Proactivity Model — surface conditions when user opens the app)
**Open questions:** #2 (strength depth), #5 (missed workout handling behavior)

---

## Phase 7: Production Readiness

**Goal:** The app is stable, observable, and testable by the three target users.

- [ ] Sentry error tracking integration
- [ ] GitHub Actions CI (lint, typecheck, tests on every PR)
- [ ] Test suite (unit tests for core logic, integration tests for API routes)
- [ ] Staging environment (Vercel preview deploys + Neon branch)
- [ ] Production deploy to Vercel
- [ ] Onboard all 3 target users (developer, brother, father)

**Spec reference:** §11 (Success Criteria for v1)

---

## Open questions that need decisions along the way

These are from `spec.md` §10. Each must be explicitly resolved (with an ADR or spec update) before implementing the feature it affects.

| # | Question | Blocks phase | Current status |
|---|----------|-------------|----------------|
| 2 | Strength/cross-training depth (specific exercises vs. generic?) | Phase 4, 6 | Open |
| 4 | Goal setting UX (exact onboarding screens/questions) | Phase 1 | Open |
| 5 | Missed workout handling (auto-reschedule vs. suggest?) | Phase 6 | Open |
| 6 | Activity ↔ workout matching heuristic | Phase 3 | Proposed, tuning deferred |
| 9 | Strava data retention on disconnect | Phase 3 | Partial — cleanup on disconnect, retention window TBD |
