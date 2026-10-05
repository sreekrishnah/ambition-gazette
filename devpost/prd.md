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
3. **Daily briefing.** The dashboard lists the developments that matter, grouped by attention tier, each with a summary, what changed, a continuity label, sources and an evidence label.
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

### Your Lens, learning strip and quiet days
- [x] Your Lens separates "big in the world, not for you", "quiet in the news, important to you", and "hidden, and why", using the stored world significance, personal relevance and suppression reason.
- [x] The learning strip lists recent feedback with the effect that was actually stored, and items ranked higher because of the user's own preferences.
- [x] When developments were checked and none are relevant, the dashboard says "Nothing today changed your plan" and shows how many were set aside.
- [x] "Show again" on a hidden item archives the memory that hid it and rebuilds the briefing. Items evaluated before the memory id was stored have no button until the next refresh.

### Assumptions and attention
- [x] The user states assumptions per ambition (5 to 300 characters, at most 8). The system never creates one.
- [x] The relevance assessment checks each linked development against the stated assumptions. A challenge counts only for a direct, confident link, and only for developments after the assumption was recorded.
- [x] A challenged assumption marks the item "Needs your attention" and shows the assumption and the reason. "Mark as holding" resets it.
- [x] Attention tiers: needs attention (assumption challenged), worth knowing (explicit interest, tracked story, or strong ambition link), background (everything else). The briefing opens with how many are in each tier and says "Nothing requires your attention today" when none need it.
- [x] Assumptions also seed the monitoring queries, so the pipeline looks for what the plan depends on.
- [x] Each item shows an evidence label from the count of distinct publishers. A single-source item says to check it before acting. This is a count, not a truth rating.
- [x] "Why this matters" is labeled as our assessment; "what changed" and sources are the reported facts.

### Goal evolution and negative information
- [x] The ambition page shows a timeline of developments linked to the ambition, built from stored evaluations.
- [x] It states "no development linked in the N days observed" only when a refresh has actually completed, and says the ambition has not been checked yet otherwise.
- [x] "Your understanding has changed" lists challenged assumptions with the development that prompted each.
- [x] Your Lens shows a funnel: checked, shown, important, needs attention.
- [x] Follow-ups join their original story for up to 180 days, and the story's first development is always kept in the history the model sees.

### Impact path
- [x] Shown only when an item has an ambition, a stored reason, and at least one source.
- [x] Uses stored data only: no extra model call, no new claims.
- [x] The ambition node adds "What this could change": one hedged sentence ("This could..." or "This may...") from the same model assessment. It uses only the ambition and the development, adds no invented numbers, and is empty when there is no ambition link.
- [x] Opens and closes per item, keyboard accessible, stacks vertically on small screens.
- [x] Shows "Story so far" beneath the graph when the story has more than one stored development, with the current one highlighted.

### Voice agent and feedback
- [x] The agent uses Gemini Live and runs tool calls against the real backend: track, feedback, preferences, timelines.
- [x] Feedback types include relevant, not relevant, already know, and too much; temporary feedback can expire.
- [x] Each briefing item has "Relevant", "I already know this" and "Not relevant" buttons that use the same feedback path as the voice agent.
- [x] Pressing "Talk to Agent" first opens a language picker, preselected with the language chosen at onboarding. The chosen language is used for the call (replies and speech recognition) and saved as the new default.
- [x] The agent can speak the hedged "what this could change" line.
- [x] The "why it matters" and "what this could change" lines are written in the user's report language. Headlines and "what changed" stay in the source language because they are shared across users.
- [x] The voice agent hosts a long, two-sided briefing in the style of a deep-dive podcast: for each story it covers the facts and history, the mechanism with an example, the case for and against, and what it means for the user's own ambition, then moves to the next story without stopping to ask. The user can interrupt at any time; the agent answers in terms of their goals and then resumes the interrupted point. The user can also say "skip this story" or "stop the briefing".
- [x] The refresh button follows a refresh for as long as it takes and shows what it is doing; it also picks up a refresh that started earlier (for example the 06:00 run).
- [x] Unavoidable world events appear after the personal items, each with a specific reason they matter to the user; none appears on importance alone.
- [x] Every item shown has a reason that names a concrete fact and the part of the user's plan it touches; it never says the user "asked to follow" something.
- [x] The voice agent performs a written script generated after each refresh.
- [x] Voice is limited to 2 sessions per day with a token cap; the picker shows how many are left.
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
- Inferring assumptions or dependencies for the user, or running an investigator state machine.
- Push or email notifications, primary-source retrieval, and matching one development to several ambitions at once.
- A social network or sharing features.

## Open Questions
None.
