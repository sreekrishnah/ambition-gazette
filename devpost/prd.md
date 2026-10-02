---
doc: prd
status: approved
---

# Ambition Gazette: Product Requirements

A personal briefing that tracks real-world events and shows how each one reaches the user's ambition.
*(Source: `scope.md`)*

## The Core Journey
1. **Sign up and onboarding.** Two steps. Step 1: role, activity and the ambition itself. Step 2: depth, geography, categories and language for the voice agent and the written briefing.
2. **Refresh developments.** The user runs the pipeline. It fetches articles, groups them into stories, and stores each update as a development. Runs are limited per day.
3. **Daily briefing.** The dashboard lists the developments that matter, each with a summary, what changed, a continuity label, and sources.
4. **Impact path.** On any item linked to an ambition, "Show impact path" opens a three-part graph: Evidence (sources) -> Development (headline, continuity, date) -> Your ambition (title and why it matters).
5. **Track and give feedback.** The user can track a story, dismiss an item as not relevant, or tell the voice agent what to change.
6. **Memory.** Feedback is stored as structured memory and changes the next briefing.

## Screens
1. **Landing, login, signup.**
2. **Onboarding (ambition page).** Two steps.
3. **Today (dashboard).** Briefing list, impact path, tracked stories, items relevant to ambitions, voice agent card.
4. **Ambitions.** View and edit ambitions and priority.
5. **Agent.** Summary of the latest voice session: key points, sources, next steps.

## Look and Feel
- Warm off-white background, near-black text, deep burgundy accent.
- Serif headlines, clean sans-serif for controls and metadata.
- Impact path colors: slate for evidence, blue for the development, burgundy for the ambition. Generous whitespace, no chat-style interface.

## Features and Behavior

### Ambitions and memory
- [x] Ambitions are stored with priority and optional expiry, and embedded for retrieval.
- [x] Memory holds identity facts, interests, temporary interests, tracked entities and suppressions, each marked explicit, inferred or onboarding.

### Stories, developments and evidence
- [x] A story is a persistent event; each update is a development with a continuity label.
- [x] New articles are matched to existing stories by vector similarity plus a model decision, so one event does not become many.
- [x] Every development keeps its source articles. Event time is stored separately from publication time.

### Relevance and the briefing
- [x] Relevance follows a fixed priority: temporary instruction, permanent preference, active ambition, tracked story or entity, strong inferred interest, short-term interest, general importance. An explicit rejection always wins.
- [x] World significance and personal relevance are stored separately.
- [x] "Why this matters to you" appears only when it can be grounded in stored data. No link means no claim.

### Impact path
- [x] Shown only when an item has an ambition, a stored reason, and at least one source.
- [x] Uses stored data only: no extra model call, no new claims.
- [x] Opens and closes per item, keyboard accessible, stacks vertically on small screens.

### Voice agent and feedback
- [x] The agent uses Gemini Live and runs tool calls against the real backend: track, feedback, preferences, timelines.
- [x] Feedback types include relevant, not relevant, already know, and too much; temporary feedback can expire.
- [x] Ending a call stores a summary with key points, sources and next steps.

## States and Boundaries
- **No ambition:** prompt to set one.
- **No developments:** "Nothing relevant found yet", with a link to refine the ambition. No content is fabricated.
- **Pipeline running, failed, or rate limited:** shown as a clear status, never as an empty success.
- **Offline:** an offline banner is shown.

## Product Decisions
- **Evidence first:** sources are always visible next to a claim.
- **No invented relationships:** the impact path never adds a link the backend did not store.
- **Feedback as memory:** reactions become structured memory, not chat history.
- **Not a chatbot:** the agent works on the user's briefing and stored data.

## Non-Goals
- A generic news reader or chatbot.
- Inferring assumptions or dependencies, or running an investigator state machine.
- A social network or sharing features.

## Open Questions
None.
