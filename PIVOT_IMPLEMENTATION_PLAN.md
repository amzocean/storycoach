# StorySparks Pivot Implementation Plan

## Context

Source input reviewed in detail:

- `C:\Users\huseinm\Downloads\attachments.zip`
  - StorySparks_V1_Product_Vision.md
  - StorySparks_V1_Product_Specification.md
  - StorySparks_Pivot_Strategy.md
  - StorySparks_Learning_Journey.md
  - StorySparks_Experience_Emotional_Journey.md
  - Story_Coach_Bible.md

Core direction from those docs is consistent:

- Shift from **AI story generator** to **AI writing coach**
- Preserve child ownership: **"I wrote this."**
- AI should prompt, encourage, review, and illustrate progress, not author paragraphs

---

## Decision: Fork and Pivot (Recommended)

### Option A: Fork current project and modify (recommended)

**Pros**

- Fastest path to MVP pivot
- Reuses proven stack: Next.js + Supabase + OpenAI + existing deployment model
- Keeps current image, PDF, and reader infrastructure
- Lowest short-term risk while `storysparks.fun` remains live

**Cons**

- Requires careful refactor of generation-first flows
- Need to remove/replace AI ghostwriting behaviors cleanly

### Option B: Start from scratch

**Pros**

- Clean slate architecture tailored to coach-first model

**Cons**

- Slower and higher execution risk
- Rebuilds already-working infra
- Delays validation of product pivot

**Recommendation:** Choose **Option A (fork + pivot)**.

---

## Short-Term Coexistence Strategy (Required)

1. Keep current repo/branch serving `storysparks.fun` unchanged except critical fixes.
2. Create a fork/new repo for pivot work.
3. Use separate Vercel project and separate Supabase project for pivot.
4. Keep production keys/envs isolated; no shared production writes between old and new apps.
5. Migrate domain only after pivot hits readiness criteria.

---

## Target Product Shape (V1 Pivot)

Top-level navigation:

1. ✍️ Write
2. 📚 Read
3. 📖 My Books

Write flow:

1. Welcome ("Let's write your first story")
2. Story setup (hero, name, setting, goal/problem)
3. First sentence
4. Guided writing loop (short bursts)
5. Illustration unlock by progress
6. Review suggestions (accept/ignore)
7. Publish (cover, PDF, public page)

Behavior rules:

- Child is always author
- AI never writes full paragraphs in normal flow
- Praise first, one coaching suggestion at a time
- Illustrations reward writing progress

---

## Implementation Plan

## Phase 0 - Branching and Environment Setup (1-2 days)

1. Create new repo from current codebase (fork/copy).
2. Create new Vercel project for pivot.
3. Create new Supabase project for pivot.
4. Configure new env vars (OpenAI, Supabase URLs/keys, site URL).
5. Add a feature flag (for example `COACH_MODE=true`) to guard pivot-only behavior.

Deliverable: isolated pivot environment with zero impact to current production.

## Phase 1 - Rework Write Experience to Coach-First (4-6 days)

1. Replace current generation-first wizard in `app/admin/create/page.tsx` with guided writing steps:
   - Hero
   - Name
   - Setting
   - Problem/goal
   - First sentence
2. Convert "AI writes pages first" flow into "child writes first" flow.
3. Keep writing in short bursts and checkpoint progress per step/page.
4. Remove or disable full rewrite affordances that replace child authorship.

Deliverable: child-first writing journey with no blank-page paralysis.

## Phase 2 - AI Contract Pivot (3-4 days)

Reuse existing OpenAI integration and route shell (`/api/generate`) but redefine actions:

- `coach-response`
  - input: current child text + story state
  - output: encouragement + one guiding question (+ optional small tip)
- `review-story`
  - output: granular suggestions (spelling/grammar/clarity/vocabulary) for accept/ignore
- `generate-illustration`
  - input: child-authored page text
  - output: page image URL

Maintain existing safety layers:

- moderation
- premise/intent checks
- post-generation checks where applicable

Deliverable: AI acts as coach and reviewer, not ghostwriter.

## Phase 3 - Illustration Unlock Loop (2-3 days)

1. Define unlock thresholds per page (minimum text quality/length).
2. Generate image for page N only when page N content is sufficient.
3. Keep existing storage upload pipeline (`lib/storage.ts`) and consistency prompt logic.
4. Update UI to visualize "write -> unlock art" progression.

Deliverable: motivation loop tied to writing effort.

## Phase 4 - Data Model Extensions (2-3 days)

Keep current tables (`stories`, `pages`, `categories`) and add additive tables:

- `coach_sessions`
  - session metadata, stage transitions, prompt/response log references
- `progress_events`
  - first sentence, first page, revision accepted, story completed, etc.

Optional fields on `stories`:

- writing status (`draft`, `review`, `published`)
- completion timestamps
- revision counts

Deliverable: analytics and progress tracking aligned to new success metrics.

## Phase 5 - Read + My Books Updates (2-3 days)

1. Keep `Read` experience and existing reader.
2. Add explicit writing-technique inspiration snippets per story (lightweight metadata).
3. Implement `My Books` sections:
   - Drafts
   - Finished
   - Published
   - Download PDF
4. Ensure every read flow has a clear CTA back to Write.

Deliverable: closed-loop create-read-create journey.

## Phase 6 - Review, Publish, and Credits (2-3 days)

1. Implement suggestion-by-suggestion review UI (accept/ignore).
2. Preserve publishing pipeline for cover + PDF + public page.
3. Update credits consistently:
   - Written by `<Child Name>`
   - Illustrated with Story Coach

Deliverable: publish flow that reinforces child ownership.

## Phase 7 - Rollout and Cutover (3-5 days)

1. Internal/beta release on preview/new temporary domain.
2. Validate metrics and session quality.
3. Fix friction points in the writing loop.
4. After naming decision, attach final domain to pivot app.
5. Keep legacy app available as fallback during transition.

Deliverable: controlled go-live without risking existing site continuity.

---

## Suggested Success Metrics (Pivot-Aligned)

Primary:

- Story completion rate
- Average child-written sentences per session
- Return-to-write rate (D1/D7)

Secondary:

- Revision suggestion acceptance rate
- Page unlock completion rate
- Publish rate per started draft

Guardrails:

- % of AI outputs violating coach constraints (target near zero)
- Safety rejection/error rate

---

## Risks and Mitigations

1. **Risk:** AI slips into authoring mode  
   **Mitigation:** strict prompt contracts + output schema validation + UX constraints

2. **Risk:** Migration confusion between old/new apps  
   **Mitigation:** separate repos/envs/domains, staged rollout

3. **Risk:** Reduced "instant wow" after removing full AI drafting  
   **Mitigation:** fast reward loop via illustration unlocks and strong celebration copy

4. **Risk:** Scope creep (social, classrooms, dashboards)  
   **Mitigation:** enforce V1 scope from spec; park extras in backlog

---

## Immediate Next Steps

1. Create fork/new repo and isolate infra.
2. Lock down current production for stability-only changes.
3. Implement Phase 1 (coach-first write flow) behind feature flag.
4. Implement Phase 2 AI action contract changes.
5. Run a small guided beta before naming/domain cutover.

