---
doc: scope
status: approved
---

# Ambition Gazette

A personal briefing that tracks real-world events as they develop and shows, with evidence, how each one reaches the ambition you are working towards.

## The Unique Kernel
News is only the input. The product is persistent memory of you and of each story. Every briefing item shows an impact path: the sources that reported it, the development itself, and the ambition it was matched to, with the reason it matters. The path is built only from stored links. If there is no stored link between a development and an ambition, nothing is claimed.

## Who It's For
Founders, professionals and students pursuing a long-term goal (for example launching a solar startup in India) who do not want to read a daily news feed but need to know when something changes the situation behind their plan.

## The Core Loop
```text
Ambition -> real-world developments -> story continuity -> personal relevance -> briefing + impact path -> feedback -> memory
```
1. The user signs up and completes a two-step onboarding: their ambition, then how deep and how wide the briefing should be, plus language.
2. A pipeline fetches articles (GDELT), matches them to existing stories, and records each update as a development.
3. Developments are ranked for the user by relevance, and the dashboard shows a daily briefing with sources and an impact path.
4. The user can talk to a voice agent (Gemini Live) about the briefing, track stories, and give feedback such as "I already know this".
5. Feedback becomes structured memory (interests, suppressions, temporary interests) and changes the next briefing.

## Inspiration & Identity
Focused, minimal, editorial. A patient research desk that shows its evidence and learns from your reactions.

## What "Working" Looks Like
- A new user sets an ambition in about a minute.
- The dashboard shows relevant developments with sources, a plain statement of why each matters, and an impact path from evidence to ambition.
- The user tracks a story and sees its timeline of developments.
- The user gives feedback by voice or buttons, and the next briefing visibly changes.

## The POC Boundary
In: auth, onboarding, ambitions, the ingestion and briefing pipeline, relevance ranking, story timelines, tracking, structured memory, voice agent with tool calls, the impact path graph on each briefing item.
The impact path is a view over stored data. It adds no new model call and no new table.

## Later
Scheduled background runs for every user, more sources beyond GDELT, user-defined assumptions and dependencies, multi-user scaling.

## Explicitly Cut
- Generic chatbot behavior: the agent works on the user's briefing and stored data only.
- A general news feed or browsing experience.
- Inferred assumptions and dependency modelling, and any step-by-step investigator state machine. Story continuity (new, updated, confirmed, contradicted, escalated, resolved, consequence) covers how a story changes.
