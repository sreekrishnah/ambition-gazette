---
doc: scope
status: approved
---

# Ambition Gazette

A briefing that remembers the stories you follow and tells you only when something changes your plan. On quiet days it says so, and it shows what it set aside and why.

## The Unique Kernel
News is only the input. The product is persistent memory of you and of each story. Every briefing item shows an impact path: the sources that reported it, the development itself, and the ambition it was matched to, with the reason it matters. The path is built only from stored links. If there is no stored link between a development and an ambition, nothing is claimed.

## Who It's For
Founders, professionals and students pursuing a long-term goal (for example launching a solar startup in India) who do not want to read a daily news feed but need to know when something changes the situation behind their plan.

## The Core Loop
```text
Ambition -> real-world developments -> story continuity -> personal relevance -> briefing + impact path -> feedback -> memory
```
1. The user signs up and completes a two-step onboarding: their ambition, then how deep and how wide the briefing should be, plus language.
2. A pipeline fetches articles (GNews, with GDELT as a fallback), matches them to existing stories, and records each update as a development.
3. Developments are ranked for the user by relevance and sorted into three attention tiers (needs attention, worth knowing, background). The dashboard shows a daily briefing with sources, an evidence label and an impact path.
3a. The user can state the assumptions their plan depends on. A development that gives a specific reason to doubt one is flagged as needing attention, and the ambition page shows how the user's understanding has changed over time.
4. The user can talk to a voice agent (Gemini Live) about the briefing, track stories, and give feedback such as "I already know this".
5. Feedback becomes structured memory (interests, suppressions, temporary interests) and changes the next briefing.

## Why It Is Different
- **Silence is a feature.** Most news products maximize reading. This one says "Nothing today changed your plan" and lists what it checked.
- **Two honest scores.** World significance and personal relevance are stored separately, so the Lens can show "big in the world, not for you" and "quiet in the news, important to you".
- **Visible learning.** A strip lists your feedback and the effect it had, so the system's learning can be checked.
- **Stories, not alerts.** Each item can show the story's earlier developments beneath its impact path.
- **Assumptions, not just topics.** The user's own assumptions are checked against each development, so a strategy-changing event is told apart from a merely related one. Nothing is inferred for the user.
- **Honest negative information.** The ambition page says when nothing has been linked to it in the period actually observed.
- **A relevance funnel.** Checked, shown, important and needs-attention counts show how much was filtered.
- **Explainable refusal.** Hidden items show the stored reason they were set aside, with a "Show again" control.

## Inspiration & Identity
Focused, minimal, editorial. A patient research desk that shows its evidence and learns from your reactions.

## What "Working" Looks Like
- A new user sets an ambition in about a minute.
- The dashboard shows relevant developments with sources, a plain statement of why each matters, and an impact path from evidence to ambition.
- The user tracks a story and sees its timeline of developments.
- The user gives feedback by voice or buttons, and the next briefing visibly changes.

## The POC Boundary
In: auth, onboarding, ambitions, user-stated assumptions, the ingestion and briefing pipeline, relevance ranking with attention tiers, story timelines, tracking, structured memory, voice agent with tool calls, the impact path graph on each briefing item, the Lens with its funnel, the learning strip, the quiet-day state, and the per-ambition evolution view.
The impact path, Lens, learning strip and evolution view are views over stored data. Assumption checking reuses the existing relevance model call; the only new table is the user's assumptions.

## Later
More sources beyond GNews and GDELT, primary-source retrieval and full-text reading, matching one development to several ambitions, push or email notifications, multi-user scaling.

## Explicitly Cut
- Generic chatbot behavior: the agent works on the user's briefing and stored data only.
- A general news feed or browsing experience.
- Inferred assumptions and automatic dependency modelling, and any step-by-step investigator state machine. Assumptions are written only by the user. Story continuity (new, updated, confirmed, contradicted, escalated, resolved, consequence) covers how a story changes.
