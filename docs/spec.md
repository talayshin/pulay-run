# PulayRun — Specification

Status: Draft v0.1
Last updated: 2026-04-14

---

## 1. Problem Statement

PulayRun is a personalized AI running coach that lives outside of a generic LLM chat interface. It integrates with Strava (and later, other fitness data sources) to understand the athlete's current state, generates individualized training plans, adapts them based on real-world data and life circumstances, and provides coaching guidance through a calendar-first interface with a conversational chat.

The motivating problem: consulting a general-purpose LLM for coaching requires repeated context-setting, produces advice disconnected from real training data, and has no persistent structure. Existing apps (Runna, TrainingPeaks, etc.) are rigid, not conversational, or not personalized enough. PulayRun aims to be the in-between: structured like a real coaching app, flexible like a conversation with a human coach.

---

## 2. Target Users

Initial users: the developer, their younger brother, and their father. Deliberately spans a wide fitness spectrum:

- **Serious athlete** — training for performance goals, races, PRs
- **General fitness user** — staying healthy, no race goal
- **Older adult** — health-oriented, lower intensity, longevity focus

**Implication:** the coaching logic must accommodate very different goals, paces, and risk profiles. The plan-generation system cannot assume one archetype.

---

## 3. Goals (v1)

1. Generate a multi-week running training plan personalized to the athlete
2. Adapt the plan based on Strava activity data and user-initiated chat requests
3. Include strength training and cross-training recommendations alongside running
4. Provide a coach chat for questions ("why is this week easier?"), plan adjustments, and consultation
5. Present everything through a clear, low-friction calendar UI — week view and a longer-range periodization view
6. Integrate read-only with Strava; activities sync automatically and inform the coach's understanding of the athlete

---

## 4. Non-Goals (v1)

- Pushing structured workouts to smartwatches (Garmin/Apple Watch workout uploads)
- Direct integration with Garmin Connect, Apple Health, Coros (planned later, via Strava only in v1)
- Nutrition tracking, sleep tracking, HRV-based recovery scoring
- Social features (sharing plans, group challenges, leaderboards)
- Multi-sport periodization (triathlon, cycling-focused plans) — running + supporting strength/cross only
- Race-day pacing strategy tools
- Return-to-run / injury rehab protocols
- Native mobile app (web first; iOS app comes after)
- Paid tiers, payment processing (free for family; ads considered later)

---

## 5. User Stories

### Plan generation
- As a user, I can tell the coach my goal ("train for a half marathon in 12 weeks", "stay healthy and run 3x/week", "improve my 5k time") and receive a full plan laid out on the calendar.
- As a user, I can see both the current week's detail and a longer-range periodization view so I understand where I am in the plan.

### Plan adaptation
- As a user, I can chat with the coach to move, swap, or cancel individual workouts ("move tomorrow's tempo to Thursday, make it shorter").
- As a user, I can change the overall plan through chat ("I have a half marathon in 10 weeks instead of 12, rebuild the plan").
- As a user, when I skip or miss a workout, the coach notices and offers to adjust.

### Strava integration
- As a user, I can connect my Strava account once and have activities sync automatically.
- As a user, after a run, the coach has context on what I actually did and can respond accordingly.

### Coach chat / consultation
- As a user, I can ask the coach questions about the plan, my training, or running in general, and get advice grounded in my data and coaching best practices.

### Strength & cross-training
- As a user, my plan includes appropriate strength and cross-training sessions (not just running).
- *(Open question — see §10)*

### Multi-user / accounts
- As a user, I can sign in and my plan, Strava link, and chat history are mine.
- As a second user on the same instance (family), my data is separate from other users'.

---

## 6. Core Data Concepts (rough sketch — formalized in architecture.md)

- **User** — account, profile (age, baseline fitness markers, goals)
- **Plan** — a multi-week training block with a goal, start/end dates, and periodization structure
- **Workout** — a scheduled session on a specific date (run, strength, cross-training, rest). Has planned parameters (distance, duration, target pace/HR, description) and optional linked actual data.
- **Activity** — a completed session, typically imported from Strava. Linked to a Workout when matched.
- **ChatMessage** — a message in the coach conversation, tied to the User and potentially referencing Workouts/Plans.
- **AthleteState** — derived, not user-edited: current fitness markers inferred from recent Activity data (e.g., easy pace estimate, current weekly volume, trend). The coach reads this to inform suggestions.

---

## 7. Coach Personality & Knowledge Base

- The coach draws on domain-specific knowledge fed to the system: running coaching books, methodology references covering different athlete archetypes (beginner, masters, competitive).
- *(Open question — see §10)* — exact sourcing and retrieval strategy (RAG) to be designed.
- Coaching tone: not decided yet. Could range from clinical to encouraging to blunt. Likely user-adjustable later, but v1 picks one default.

---

## 8. Proactivity Model

Between passive and reactive:
- **Does not** send unsolicited morning messages, push notifications, or daily check-ins in v1.
- **Does** surface noticeable conditions when the user opens the app — e.g., a banner or coach message when: a workout was missed, recent runs suggest unusual fatigue, the upcoming week needs confirmation.
- The user-initiated chat is the primary interaction channel.

---

## 9. Interface Principles

- **Calendar is the home screen.** Opening the app lands on the current week.
- **Two calendar scales:** week view (detailed, actionable) and periodization view (weeks/months, zoomed out, shows training blocks).
- **Chat is persistently accessible** (sidebar, drawer, or dedicated panel) — not buried.
- **Low friction** is the north star: common actions (view today's workout, mark complete, ask a quick question) should be one or two clicks.
- Visual polish is explicitly deferred — v1 prioritizes usability and clarity over aesthetics.

---

## 10. Open Questions

### Resolved (see `architecture.md` for implementation)

- **#1 Knowledge base sourcing** → developer-uploaded PDFs (≤10), silent synthesis (no citations), tagged by archetype and goal, ingested offline into Postgres + pgvector. Scope stays family-only to respect copyright.
- **#3 User preferences** → structured `preferences` field on the athlete profile, populated during onboarding; coach can also update via an `update_preferences` tool during chat.
- **#7 Athlete archetype** → hybrid: structured onboarding questions first, then refined from Strava history once connected.
- **#8 Multi-user model** → public-style auth from day one (Clerk), designed to scale beyond the initial three users.
- **#10 Chat conversational memory** → session-scoped; durable state (preferences, plans, profile) lives in the database rather than chat history.

### Still open

- **#2 Strength & cross-training depth.** Is the coach prescribing specific exercises (sets, reps, weights)? Generic guidance ("30 min of strength focused on legs")? Linking to a library of exercises? Data model can hold either; product decision pending.

- **#4 Goal setting UX.** Onboarding asks structured questions; exact screen design and question set still to define.

- **#5 Missed workout handling.** What does "noticed and adjusted" look like concretely? Reschedule automatically? Suggest options? Require user confirmation? Data model supports any behavior.

- **#6 Activity ↔ Workout matching.** Working proposal: match by date + workout type + duration-within-tolerance. Tuning deferred until real data is available.

- **#9 Strava data retention policy.** v1 keeps `activities` indefinitely while the connection is active; on disconnect, a cleanup job removes them per Strava ToS. Retention window for disconnected accounts (e.g., immediate vs. grace period) still to decide.

---

## 11. Success Criteria for v1

v1 is "done enough to show someone" when:

- All three target users (developer, brother, father) can sign up, connect Strava, and get a personalized plan
- The calendar UI works cleanly for at least the current-week and multi-week periodization views
- Chat-driven plan adjustments work end-to-end without breaking subsequent weeks
- Strava activities sync automatically and show alongside planned workouts
- A completed run results in the coach having updated context (even if not a visible change every time)
- Strength/cross-training appears in plans in at least a basic form (see Open Question 2)

---

## 12. Out of Scope Reminders (things explicitly postponed)

- iOS native app — after web v1 is stable and real-world tested
- Garmin / Apple Health / Coros direct integration — after Strava path is solid
- Ads or monetization
- Injury rehab, race pacing, multi-sport
- Social / sharing features
