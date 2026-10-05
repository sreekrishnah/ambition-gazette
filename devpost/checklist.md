---
doc: checklist
status: draft
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Scaffold, auth and ambition onboarding**
  Usable: sign up, sign in, two-step onboarding, ambition stored and embedded.
  Spec ref: `spec.md > Components`, `spec.md > Data Model`
  Verify: `api/scripts/e2e.ts` covers register, login, ambition and embedding checks.

- [x] **2. Stories, developments and the briefing pipeline**
  Usable: Refresh developments fetches news, groups articles into stories, stores developments, ranks them for the user and writes a daily briefing with sources.
  Spec ref: `spec.md > Flow`
  Verify: `npm run seed:demo` builds a briefing from real news; `npm test` covers the relevance order.

- [x] **3. Tracking, timelines and the impact path**
  Usable: track a story, open its timeline, and open an impact path from sources to development to ambition with a hedged "what this could change" line.
  Spec ref: `spec.md > Impact Path (Propagation Graph)`
  Verify: checked in the browser against a seeded demo account.

- [x] **4. Feedback, memory and the voice agent**
  Usable: Relevant, I already know this and Not relevant buttons, voice feedback through Gemini Live tool calls, structured memory that changes the next briefing.
  Spec ref: `spec.md > Components`
  Verify: feedback effects appear in the learning strip; `e2e.ts` covers a live session.

- [x] **5. Lens, learning strip and quiet days**
  Usable: Your Lens (big in the world, quiet but yours, hidden and why, Show again), the learning strip, and the quiet-day state.
  Spec ref: `spec.md > Lens and Learning Strip`
  Verify: `api/tests/lens.test.ts`.

- [x] **6. Production packaging**
  Usable: free-tier deployment plan (docs/DEPLOYMENT.md), health check, graceful shutdown, `.env.example` files.
  Verify: the API build compiles.

## Hands-on Checkpoints

- [ ] Early usable behavior explored
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions

