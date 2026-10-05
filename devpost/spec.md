---
doc: spec
status: approved
---

# Ambition Gazette: Technical Spec

## How This Works, In Plain Language
Ambition Gazette keeps a ledger of real-world stories and a structured memory of the user. A pipeline pulls articles from GNews (GDELT as fallback), matches each to an existing story (vector similarity plus a model decision) or starts a new one, and records what changed as a development. For each user, developments are ranked by a fixed relevance order and written into a daily report. The dashboard shows that report with sources and an impact path. A voice agent talks about the report and writes feedback back into memory, which shapes the next report.

## Flow
```text
Ambition -> articles (GNews/GDELT) -> story match -> development -> relevance -> briefing -> feedback -> memory
```

## Stack
- **Next.js 16 / React 19 / Tailwind CSS 4:** frontend. The browser never holds the API token; a same-origin Next route forwards requests from an httpOnly cookie.
- **Express (Node, TypeScript):** API, pipeline and the `/live` socket.io relay for voice.
- **Supabase (Postgres):** storage; embeddings with pgvector.
- **Gemini via `@google/genai`:** text `gemini-3.5-flash-lite`, live voice `gemini-3.8-live`, embeddings `gemini-embedding-001` at 768 dimensions.
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
- The ambition node also shows `couldChange`, produced by the same `assessRelevance` call as `whyItMatters` (no extra model call), stored in `report_items.could_change` (migration 005), and null without an ambition link. Cached assessments without it are re-run once.
- The report language from the user profile is passed to `assessRelevance`; cached assessments in another language are re-run.
- Nodes: Evidence -> Development -> Your ambition. The edge into the ambition is labelled with the stored relevance basis.
- No backend change, no new table, no extra model call.

## Lens and Learning Strip
- `GET /dashboard/lens` returns `{ lens }` built by the pure function `buildLens` in `api/src/domain/lens.ts` from `world_coverage` (last 14 days) and `feedback`.
- Lists: big in the world (world >= 0.6, personal < 0.5), quiet but yours (shown, world < 0.4, personal >= 0.6), hidden with the stored suppression reason, and counts of checked and set-aside developments.
- Learning events map each feedback type to the effect `applyFeedback` stores; unknown types are dropped.
- Hidden entries carry the id of the memory row that caused them (stored in `world_coverage.relevance_reasons`), so "Show again" archives that memory via `PATCH /memory/:id`.
- The impact path reads the timeline with `?peek=1`, so viewing it never marks a tracked story as seen.
- No new table and no model call. Covered by `api/tests/lens.test.ts`; the relevance order is covered by `api/tests/relevance.test.ts`.

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
- **News source unavailable:** `SOURCE_UNAVAILABLE`; the dashboard keeps the last briefing.
- **Pipeline already running:** `ALREADY_RUNNING` (409).

## Decisions and Open Issues
- **Decision:** the impact path is built from stored links only, so it cannot hallucinate a relationship.
- **Decision:** assumptions, dependencies and an investigator state machine are cut; story continuity labels cover how a story changes.
- **Decision:** feedback is stored as structured memory, not chat history.
- **Decision (voice settings):** the Live session uses Gemini's default turn-taking, with no custom sensitivity, resumption or compression, on `gemini-3.8-live`. Measured against synthetic speech with pauses: defaults answered in about 0.5 s and heard whole sentences (a 600 ms silence with high sensitivity cut the user off at a pause, and a longer silence only added delay). Talking over the agent stops it in about 0.4 s. `gemini-3.1-flash-live-preview` closes the session with error 1011 as soon as audio arrives with this app's tools, so it is not used. Captions are Gemini Live's own input and output transcription, one line per speaker. Speech recognition is given language hints from the user's voice language (English maps to `en-IN`, other languages keep English as a second hint) and a custom vocabulary (product name, first name, ambitions, interests), because auto-detection transcribed short accented phrases as Portuguese or Spanish. The server logs microphone level every 5 s as `mic input`.
- **Decision (microphone conditioning):** the capture worklet high-passes at 110 Hz, applies a gain that follows the loudest recent level (never the current level, so room noise is not boosted) and soft-limits below full scale. A real recording arrived about 13 dB too quiet with 85% of its energy below 200 Hz; Gemini Live heard it as Spanish ("¿Qué dices?") every time, and heard English after conditioning. An earlier gain that followed the current level raised steady noise 16x and was replaced. The browser reports the microphone name and the processing it applied (`mic device` in the API log).
- **Decision (spoken briefing):** Gemini Live ends its turn after a short stretch and compresses a long request into a few sentences, so the server directs the briefing part by part (`services/briefingDriver.ts`). Each story is three parts (facts and background, both sides, what it means for you). The next part is cued with a short bracketed director note about 0.9 s after the previous one ends, unless the listener is speaking or a tool is running. An interrupted part is repeated after the answer. The agent works from a dossier of up to 8 stories with full text, recent history, the full profile and stated assumptions. Live supports one voice per session, so both sides are voiced by one host; two distinct voices would need a pre-generated multi-speaker TTS episode.
- **Decision (news search):** news search requires every word of a query, so "software engineer salaries" matched 2 articles while "software engineer" matched 15. Queries are now 1 to 2 headline words. When a query returns fewer than 5 articles it is shortened to its first two words, then the window widens from 7 to 14 days (what the briefing uses), then GDELT adds its results, merged by URL. An empty GNews answer is no longer final. GNews requests are spaced 1.2 s apart and retried once on its 429 burst limit.
- **Decision (relevance and explanations):** the earlier rule showed anything matching a stored interest and explained it with "You asked to follow X"; an interest inferred from a voice question then pulled in unrelated stories. Now an item is shown only when the model states a specific link to an ambition (or the user tracks the story). Stated interests make an item eligible for that check, inferred interests are ignored, and the voice search tool no longer stores interests. Developments with high world significance that are not linked go through a separate must-know pass that must state a concrete effect on the user, at most three per run.
- **Decision (long refresh):** a refresh has no time cap. Model calls wait out rate limits in "patient" mode (the server honours Gemini's retry delay), the job writes a heartbeat and progress text, and the UI follows it until the server reports it finished. A run silent for 10 minutes is treated as dead.
- **Decision (schedule and limits):** 06:00 IST daily, one batch slot per IST day, counted as one of two daily refreshes. Voice: 2 sessions per user per IST day, enforced by an atomic database function before a session opens, plus per-session and per-day token budgets (usage is reported once per turn as the whole context plus that turn's audio, so the sum across turns is the cost) and a tool-call cap.
- **Decision (guardrails):** third-party text is normalised, bracketed or tag-like markers are neutralised, injection phrases drop an article at ingestion, and everything is wrapped as untrusted data with a notice in each prompt. Model output is stripped of links, markup and leaked internal markers. The voice agent's system prompt opens with security rules; the producer's director notes are the only channel that directs the briefing; a tool that changes user data requires a quote of the user's words that the server verifies against what was heard.
- **Decision (written script):** after each refresh a script is written per story (facts and background, both sides, what it means for the user) plus a closing, stored in `briefing_scripts`. The voice session loads it and embeds each part in the director note; a story without a script is improvised from the dossier.
- **Open:** the live voice model is a preview model; record the demo with a working take.
