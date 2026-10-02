---
doc: spec
status: approved
---

# Ambition Gazette: Technical Spec

## How This Works, In Plain Language
Ambition Gazette keeps a ledger of real-world stories and a structured memory of the user. A pipeline pulls articles from GDELT, matches each to an existing story (vector similarity plus a model decision) or starts a new one, and records what changed as a development. For each user, developments are ranked by a fixed relevance order and written into a daily report. The dashboard shows that report with sources and an impact path. A voice agent talks about the report and writes feedback back into memory, which shapes the next report.

## Flow
```text
Ambition -> articles (GDELT) -> story match -> development -> relevance -> briefing -> feedback -> memory
```

## Stack
- **Next.js 16 / React 19 / Tailwind CSS 4:** frontend. The browser never holds the API token; a same-origin Next route forwards requests from an httpOnly cookie.
- **Express (Node, TypeScript):** API, pipeline and the `/live` socket.io relay for voice.
- **Supabase (Postgres):** storage; embeddings with pgvector.
- **Gemini via `@google/genai`:** text `gemini-2.5-flash`, live voice `gemini-2.5-flash-native-audio-preview-12-2025`, embeddings `gemini-embedding-001` at 768 dimensions.
- **Zod:** validation of requests and model output.

## Where It Runs and How Someone Tries It
- Local Node.js. Copy `api/.env.example` and `app/.env.example`, fill in the values, run `npm run migrate` then `npm run dev` in `api/` (port 5000) and `app/` (port 3000).
- Checks: `npm run typecheck` and `npm test` in `api/`; `npm run e2e` runs the full flow against a running API.
- Demo path: sign up, finish onboarding, press Refresh developments, open "Show impact path" on a briefing item, talk to the agent, then refresh again.

## Components
- **Routes (thin):** auth, ambition, dashboard, pipeline, story, feedback, memory, agent, jobs.
- **Services:** ingest, stories, relevance, briefing, feedback, memory, ambitions, pipeline, bidi and bidiAgent (voice), investigator.
- **Domain:** `relevance.ts` holds the ranking order; types are kept free of framework code.
- **AI tasks:** prompts live in `api/src/ai/`, separate from business logic. Model output is validated before use.
- **Frontend:** dashboard components, voice overlay, and `PropagationGraph.tsx`.

## Impact Path (Propagation Graph)
- A pure view component in `app/src/components/dashboard/PropagationGraph.tsx`, opened from `TodaysSummaryCard`.
- Input is a briefing item already returned by `GET /dashboard`: `sources`, `headline`, `continuity`, `occurredAt`, `relevanceBasis`, `ambitionTitle`, `whyItMatters`.
- `canShowPropagation` returns true only when `whyItMatters`, `ambitionTitle` and at least one source exist, so a link is never invented.
- Nodes: Evidence -> Development -> Your ambition. The edge into the ambition is labelled with the stored relevance basis.
- No backend change, no new table, no extra model call.

## Data Model
- **Users and ambitions:** `users`, `ambitions`, `user_memory` (identity, interest, temporary_interest, tracked_entity, suppression, temporary_suppression).
- **World:** `articles`, `stories`, `developments`, `story_sources`.
- **Per user:** `world_coverage` (world importance and personal relevance, separate), `tracked_stories`, `feedback`, `daily_reports`, `report_items`.
- **Voice and operations:** stored voice sessions with summaries, pipeline job records, `schema_migrations`.

The authoritative contract is `docs/API.md`.

## Security Boundaries
- User identity comes from the signed token only; `userId` is never accepted from the client.
- The live socket uses a short-lived single-purpose token, one session per user.
- Pipeline runs are rate limited per day; the batch route requires `x-cron-secret`.
- Errors use stable codes and safe messages; no stack traces or provider errors reach the client.

## Important Failure Modes
- **Model unavailable or malformed output:** surfaced as `MODEL_UNAVAILABLE`; no item is created from unvalidated output.
- **Embedding failure:** `EMBEDDING_UNAVAILABLE`; ambitions can be re-embedded with `npm run reembed`.
- **GDELT unavailable:** `SOURCE_UNAVAILABLE`; the dashboard keeps the last briefing.
- **Pipeline already running:** `ALREADY_RUNNING` (409).

## Decisions and Open Issues
- **Decision:** the impact path is built from stored links only, so it cannot hallucinate a relationship.
- **Decision:** assumptions, dependencies and an investigator state machine are cut; story continuity labels cover how a story changes.
- **Decision:** feedback is stored as structured memory, not chat history.
- **Open:** the live voice model is a preview model; record the demo with a working take.
