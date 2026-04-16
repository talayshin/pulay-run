# PulayRun — Project Instructions for Claude

## What this project is

PulayRun is an AI-powered personalized running coach webapp (iOS app to follow later). Calendar-first UI with a conversational chat, integrates with Strava to read activity data, generates and adapts training plans, and provides coaching guidance across a wide range of athletes (serious runners to older adults focused on health).

Full specification: `docs/spec.md` — always read this first when working on product decisions.

## Project stage

**Scaffolded, pre-feature.** As of 2026-04-16, the stack is chosen (see `docs/decisions/001-stack-choice.md`) and the project is scaffolded. Architecture is documented in `docs/architecture.md`. No feature code written yet.

The developer is building their first professional webapp and is learning software engineering practices alongside building the product.

**Implication for Claude:** default to explaining *why* when introducing tools, patterns, or decisions — don't just prescribe. Link choices back to the spec's goals and open questions rather than making opinionated calls in isolation.

## How to work on this project

### Documentation-first workflow
- `docs/spec.md` — product spec. Update when scope changes; never silently.
- `docs/architecture.md` — technical architecture (to be written).
- `docs/decisions/` — one markdown file per significant decision (ADR-style). Filename: `NNN-short-title.md`. Each file captures: context, decision, alternatives considered, consequences.
- Update the relevant doc *before or alongside* the code change, not after.

### Open questions are first-class
The spec has a numbered list of open questions in §10. When work touches one, either:
1. Resolve it explicitly (update spec, possibly add an ADR), or
2. Leave a clear note in code/docs that the implementation made a provisional choice and why.

Never silently resolve an open question by just writing code.

### Scope discipline
- v1 scope is defined in the spec. Non-goals are listed explicitly. If asked to add something that looks like scope creep, flag it before building.
- Prefer the smallest version of any feature that proves the idea. Polish and edge cases come after the core loop works.

### Ask before building
Given the developer's stated inexperience, default to asking clarifying questions before non-trivial implementation work, especially when:
- Multiple reasonable architectural paths exist
- The decision has long-term implications (data model, auth, hosting)
- The feature intersects with an open question from the spec

## Conventions

### Docs
- Markdown, GitHub-flavored.
- Date format in docs: ISO 8601 (YYYY-MM-DD).
- Cross-reference the spec by section number (e.g., "see spec §10.3") when relevant.

### Code (once it exists)
- To be established in `docs/architecture.md` once the stack is chosen.
- Pre-decision defaults: strict typing (TypeScript or Python with mypy/pyright), linter + formatter enforced in CI, conventional commits for git history.

### Secrets and data
- No secrets in the repo, ever. `.env.example` template in the repo, real `.env` gitignored.
- Strava data lifecycle policy is an open question (spec §10.9); until resolved, design with the assumption that activity data must be deletable on user disconnect per Strava's ToS.

## What NOT to do

- Do not pick a tech stack, database, or hosting provider unilaterally. Propose options with tradeoffs; let the developer decide.
- Do not reintroduce features listed as non-goals in the spec (§4).
- Do not build beyond what's asked to "help" — the developer is learning, and unexplained additions obscure that.
- Do not write code without corresponding updates to relevant docs.
