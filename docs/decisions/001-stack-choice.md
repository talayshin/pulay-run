# ADR 001 — Full-stack TypeScript with Next.js

Status: Accepted
Date: 2026-04-14

## Context

PulayRun needs a web application with:

- A calendar-centric UI (week view + periodization view)
- A conversational coach interface (chat with streaming)
- Strava OAuth + webhook integration
- A small PDF-based knowledge base (≤10 books) used for coaching context
- LLM integration with tool use (plan edits, preference updates)
- Proper multi-user authentication (signup/login, designed for future scale)
- A planned iOS client later

The developer is building their first professional webapp and is learning software engineering practices in parallel. Language preference: open to either TypeScript or Python.

## Decision

**Next.js (TypeScript) full-stack application, deployed to Vercel.**

Specifically:
- Framework: Next.js (App Router) in TypeScript
- Database: Postgres with `pgvector` extension (via Neon)
- ORM: Drizzle
- Auth: Clerk
- LLM: Anthropic (TypeScript SDK); provider choice formally deferred
- PDF parsing: `pdf-parse` or `pdfjs-dist`, in a one-time ingestion script
- Background jobs: Inngest
- Error tracking: Sentry
- Hosting: Vercel

## Alternatives considered

**Python backend (FastAPI) + separate React frontend.**
Rejected because:
- Two languages and two deployments compound complexity for a solo developer building their first webapp
- The RAG ecosystem advantage (LangChain, LlamaIndex) is not meaningful at ≤10 books — the retrieval code is small enough to DIY
- An eventual iOS client can call Next.js API routes over HTTP identically to how it would call FastAPI

**Firebase / Supabase full-backend.**
Rejected because the app's logic is non-trivial (plan generation, LLM tool use, Strava webhook processing) and a managed-BaaS model would push logic into client code or awkward cloud functions.

## Consequences

**Positive:**
- One language across the codebase reduces cognitive load
- Shared TypeScript types between server and client eliminate a class of bugs
- `git push` to Vercel = deployment; near-zero ops burden
- Type safety through the entire request/response cycle via Drizzle + tRPC-style patterns or Server Actions
- All chosen services have free tiers sufficient for 3 family users

**Negative / accepted tradeoffs:**
- If later we want heavy numerical analysis on Strava data (training load models, fatigue detection), Python's pandas/numpy is better. Mitigation: a small Python service can be added later for exactly that piece without disturbing the rest of the system.
- Vercel serverless functions have execution time limits (10s default, 60s max on hobby/pro). LLM streaming handles this fine; long-running batch jobs (PDF ingestion, Strava backfill) must run via Inngest or locally, not in a request handler.
- TypeScript RAG libraries are less mature than Python equivalents. At ≤10 books this is not a practical concern.

## Revisit triggers

Reconsider the stack if:
- Scope expands to multi-tenant SaaS with hundreds of users *and* the book library grows beyond ~100 items
- We add features requiring heavy numerical computation on Strava data that TypeScript cannot reasonably do
- Vercel pricing becomes prohibitive at scale (unlikely for a running app)
