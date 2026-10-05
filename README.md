# Ambition Gazette

**Trace events across time. Connect them to your ambitions.**

A personal briefing that tracks real-world events and shows how each one reaches your ambitions. 
Events are the input; the product is persistent memory of you and of each story.

```text
Ambition -> articles (GNews/GDELT) -> story match -> development -> relevance -> briefing -> feedback -> memory
```

## How it works

- **Stories and developments.** A story is a persistent real-world event. Each update to it is a development classified as new, updated, confirmed, contradicted, escalated, resolved or consequence, with its evidence in `articles` and `story_sources`. New articles are matched to existing stories by vector similarity plus a model decision, so one event does not become many.
- **Structured memory.** `user_memory` holds identity facts, interests, temporary interests, tracked entities and explicit suppressions. Ambitions are first-class (`ambitions`, with priority and optional expiry) and embedded for retrieval.
- **Relevance.** An item is shown only when the model finds a specific, explained link to an active ambition (or the user tracks the story). What the user said they follow only makes an item eligible for that check, inferred interests are ignored, and importance alone never shows an item. Unavoidable world events are a separate pass that must state a concrete effect on the user.
- **Rejections and scores.** An explicit rejection (hide a story, stop seeing a topic) always wins over any other signal and can be reversed with Show again. World significance and personal relevance are stored separately.
- **Impact path.** Each briefing item can open a path from its sources to the development to the ambition it matters to, a hedged "what this could change" line, and the story's earlier developments beneath it. It only shows stored links.
- **Your Lens & Learning strip.** Lens shows what is big in the world but not for you, what is quiet in the news but important to you, and what was hidden and why. The learning strip lists your recent feedback with the effect it had.
- **Spoken briefing.** The voice agent hosts a long, two-sided podcast-style briefing built from the user's stories, history and ambitions, and carries on until the user interrupts. The agent uses the Gemini Live bidirectional API through a server relay. Tool calls (track, feedback, preferences, timelines) run against the real backend.
- **Language.** The "why it matters" and "what this could change" lines are written in the report language chosen at onboarding. Voice uses the voice language. Headlines stay in the source language.
- **Quiet days.** When developments were checked and none touch your goals, the dashboard says so instead of filling space.

## Repository

```text
app/    Next.js 16 frontend (React 19, Tailwind CSS 4)
api/    Express backend (Supabase, Gemini)
docs/   API contract (docs/API.md)
```

*(Note: The `py-api/` directory is for an alternate/experimental service and is excluded from standard setup).*

## Setup

1. Copy `.env.example` files:
   - `cp api/.env.example api/.env`
   - `cp app/.env.example app/.env.local`
2. Fill in the values:
   - **API:** Gemini key, Supabase URL and service role key, `AUTH_SECRET`, `CRON_SECRET`, `DATABASE_URL`, and optionally `GNEWS_API_KEY` (without it, the pipeline falls back to GDELT).
   - **App:** Check `app/.env.example` for the required frontend variables.
3. Apply the database schema:
   - From `api/`: `npm install` then `npm run migrate`. This applies all migrations up to `009` and records them in `schema_migrations`.
4. Run the development servers:
   - `npm run dev` in `api/` (starts Express server on port 5000)
   - `npm run dev` in `app/` (starts Next.js frontend on port 3000)

Checks: `npm run typecheck` and `npm test` in `api/`; `npm run e2e` in `api/` runs the full flow against a running API with the real database and Gemini.

## Daily schedule, limits and security

- **Schedule.** The API refreshes every user's briefing at 06:00 India time (a server that was down then catches up before 09:00). The scheduled run counts as one of a user's **2 refreshes per day**, so one manual refresh is left. A refresh runs as long as it needs to, waiting out model rate limits, and shows its progress.
- **What a refresh does.** It fetches Events (from GNews/GDELT), sorts articles into stories, decides for each event whether it matters to the user's ambitions and writes a specific reason, checks for unavoidable world events, and finally writes the complete voice script.
- **Voice limits.** 2 voice sessions per user per day, and token caps per session and per day (`VOICE_SESSIONS_PER_DAY`, `VOICE_TOKENS_PER_SESSION`, `VOICE_TOKENS_PER_DAY`, `VOICE_MAX_TOOL_CALLS` in `api/.env`). The limit is checked in the database before a session opens.
- **Guardrails.** Events and user text are cleaned and fenced as untrusted data in every model prompt, articles that try to give the model orders are dropped, model output is filtered, the voice agent has top-priority security rules, and any tool that changes the user's data only runs when the model quotes words the user was heard saying.

## Demo data and tests

- `npm run seed:demo` in `api/` (API running) creates a local demo account from real Events so the dashboard, Lens and learning strip have data. The Events source and the Gemini free tier are rate limited, so run it once and wait a minute before repeating it.
- `npm test` in `api/` runs the unit tests: relevance order, the Lens, tokens, voice limits, guardrails, etc.
- Migration `006_drop_unused_tables.sql` removes tables from a cut design. It is not applied by default in an existing database; review it, then run `npm run migrate`.

## Deployment

Free-tier plan (Vercel for the app, Render for the API, existing Supabase): see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Models

Configured through `api/.env`: text `gemini-3.5-flash-lite`, live `gemini-3.8-live` (replies start in about 0.5 s), embeddings `gemini-embedding-001` at 768 dimensions. Ambitions, memory topics and searches are embedded as retrieval queries and stories and developments as retrieval documents, which separates related from unrelated text far better than symmetric similarity.

## Security model

The browser never holds the API token: the session lives in an httpOnly cookie and a same-origin Next route forwards requests with the token. The API resolves the user from the signed token only. The live socket uses a short-lived single-purpose token.
