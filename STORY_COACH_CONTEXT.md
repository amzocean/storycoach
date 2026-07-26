# Story Coach — Project Context & Direction

> **Read this first.** This is the single source of truth for what Story Coach is,
> why it exists, and how it is being built. It is written so any future session
> (human or AI) can get fully up to speed without re-deriving the pivot.

- **Repo:** https://github.com/amzocean/storycoach.git
- **Local path:** `C:\Users\huseinm\storycoach`
- **Forked from:** `C:\Users\huseinm\storynook` (the live **StorySparks** app, `storysparks.fun`)
- **Status:** Coach-first write flow **built and live locally**, gamified (Duolingo-style challenges). AI coach contract implemented and verified. Next up: **accounts / save-resume / multiple parallel stories** (design decided, not yet built).
- **⚠️ Name is a placeholder.** "Story Coach" / "Coach" is a working name only — the final product name is TBD. Keep all naming isolated and easy to swap (copy strings, not architecture).
- **Source vision docs:** `Downloads\attachments.zip` — Product Vision, Product Specification, Pivot Strategy, Learning Journey, Experience/Emotional Journey, Story Coach Bible. This document synthesizes all six.

---

## 1. Origin & Lineage

Story Coach is a **fork of storynook** (the StorySparks codebase). We reuse the proven
technical foundation — Next.js App Router, Supabase (Postgres + Storage), OpenAI
(text + image) — but **change the product's soul**.

**Why fork instead of rebuild:** fastest path to MVP, reuses working infra (reader,
PDF export, image pipeline, moderation), and keeps `storysparks.fun` live and stable
on the original repo during the transition. The old app is maintenance-only; all new
product work happens here in an isolated repo with its own Vercel + Supabase project.

---

## 2. The Direction — From Generator to Coach

### The one-sentence pivot
> **From "AI story generator" → "AI writing coach" ("Duolingo for young writers").**

The AI is **no longer the author**. It becomes the child's **writing coach**.

### North Star
> A seven-year-old should be able to write their first complete story without ever
> feeling stuck or intimidated — and leave more confident than they arrived.

### The Promise
When a child finishes, they should **never** say *"The AI wrote me a story."*
They should proudly say:
> **"I wrote this."**

That single sentence defines the product. Success is **not** a beautiful story —
success is that **the child wants to write another one**.

### Why this pivot
AI story generation is becoming a commodity. The durable opportunity is helping
children become **better, more confident writers** — a lifelong creative portfolio,
not a one-off novelty generator.

---

## 3. Core Principles (non-negotiable)

These come straight from the **Story Coach Bible** and Vision docs. Every feature and
every AI prompt must obey them.

1. **The child is always the author.** Never rewrite the child's story.
2. **AI never writes paragraphs.** It encourages, asks questions, hints, reviews, and illustrates — nothing more.
3. **Praise before correction.** Always open with something genuine, then *one* suggestion.
4. **Ask, don't tell.** Instead of "Add more description," ask "What does the forest smell like?"
5. **One improvement at a time.** Never overwhelm. Celebrate → Coach → Repeat.
6. **No blank pages.** Children never face an empty editor; guide with tiny questions.
7. **Tiny wins.** Ask for *one sentence*, not "a story." Momentum beats motivation.
8. **Illustrations are rewards for effort.** Never generate all art up front — writing unlocks the next picture.
9. **Confidence before grammar.** Before correcting anything, ask: "Will this help the child keep writing?"

### The Coach's personality
Feels like *a favorite teacher, a supportive parent, a curious friend.*
Never *a critic, a chatbot, or a lecturer.* The child must feel safe making mistakes.

### Things the Coach never says
"Here's your story." · "I rewrote it for you." · "This is wrong." · "That's a bad idea."

### Things the Coach says instead
"Tell me more." · "What happens next?" · "I wonder…" · "Want to make this even more exciting?"

### Feedback formula (every review)
1. Celebrate → 2. Highlight one strength → 3. Suggest one improvement → 4. Encourage another attempt.
Never a long list of mistakes.

---

## 4. Target Product Shape (V1)

### Navigation — exactly three tabs
1. **✍️ Write** — start or continue a story
2. **📚 Read** — read stories by other children (reading inspires writing; each story highlights one writing technique; every story ends with a "Write your own story" CTA)
3. **📖 My Books** — the child's bookshelf: Drafts · Finished · Published · Download PDF

### The Write flow (coach-first) — replaces the old generation wizard
1. **Welcome** — "Let's write your first story." One button: **Start Writing**.
2. **Story setup** — Hero → Hero name → Setting → Goal/Problem. (Removes the blank page; builds a story skeleton from tiny choices.)
3. **First sentence** — "Write one sentence introducing your hero." Coach celebrates + asks one follow-up. **Never corrects the first sentence.**
4. **Guided writing loop** — child writes in short bursts. After each paragraph the Coach: celebrates → asks one question → optionally suggests one improvement. **Never writes the next paragraph.**
5. **Illustration unlock** — when a page has enough child-written content, generate *one* illustration and show it immediately. Repeat per page.
6. **Review** — child taps "Review My Story." AI surfaces spelling/grammar/punctuation/vocabulary/clarity suggestions **one at a time**; child accepts or ignores each.
7. **Publish** — auto-generate cover, title page, PDF, and public page. Credits: **Written by `<Child>` · Illustrated with Story Coach.**

### The Emotional Journey (design guardrail)
Every session should move through: Curiosity → Safety → First Success → Momentum →
Surprise → Ownership → Confidence → Pride → Excitement to continue.
Never end with "Done." End with "You are officially an author. What should we write next?"

### The Learning Journey (the "Duolingo" layer)
Strengthen the **Eight Writing Muscles**: 💡 Imagination · 🧠 Structure · 🎨 Description ·
❤️ Emotion · 💬 Dialogue · 🔤 Vocabulary · ✏️ Revision · 🌟 Confidence.
Coaching gradually fades: **early** = lots of prompts → **later** = open questions →
**eventually** = mostly celebrates and reviews. The child becomes independent.
Levels: (1) My First Story → (2) Interesting Characters → (3) Building Worlds →
(4) Exciting Stories → (5) Writing Like an Author.

### Deliberately EXCLUDED from V1
Likes · comments · followers · social feed · leaderboards · streaks-for-time ·
AI-written stories · chat interface · complex editor · teacher/parent dashboards.
**Stay focused on writing.** Reward *effort*, not time-on-app.

### The V1 product-decision filter
Before building anything, ask:
✓ Does it help children write? ✓ Does it build confidence?
✓ Does AI coach instead of replace? ✓ Does it encourage finishing a story?
If not, it doesn't belong in V1.

---

## 5. Success Metrics

**Measure (aligned to the pivot):**
- Stories completed (primary)
- Child-written sentences / paragraphs per session
- Return-to-write rate (D1/D7), writing streaks
- Revisions accepted, page-unlock completion, publish rate per started draft

**Do NOT measure:** stories generated · AI tokens · images generated · time spent ·
AI response length.

**Guardrail metric:** % of AI outputs that violate coach constraints (i.e., the AI
authored a paragraph, criticized harshly, etc.) — target near zero.

---

## 6. Implementation Details

### 6.1 Stack (inherited from storynook)
- **Framework:** Next.js **16.2.4** (App Router, Turbopack), React 19, TypeScript, Tailwind.
- **DB/Storage:** Supabase (Postgres + `story-images` public bucket). New isolated Supabase project for this fork.
- **AI:** OpenAI — `gpt-4o` / `gpt-4o-mini` (text, moderation) + `gpt-image-1` (illustrations).
- **Hosting target:** separate Vercel project (do not share envs with the live site).

### 6.2 Repo layout (key paths)
```
app/
  page.tsx                     Home / library (already rebranded "Story Coach")
  admin/create/page.tsx        Current 4-step GENERATION wizard → must become coach-first Write flow
  admin/manage/[id]/page.tsx   Admin edit (known to drift from /api/generate contract)
  read/[id]/StoryReader.tsx    Reader (cover, nav, share, QR, PDF link) — reuse
  api/generate/route.ts        Single AI entry point (action-switch) — pivot the actions here
  api/stories, api/categories  CRUD + list
  api/stories/[id]/pdf         PDF export (default/print/coloring) — reuse
  api/stories/[id]/publish     Publish pipeline — reuse
lib/
  openai.ts    All model calls + safety (moderateContent, validatePremise, verifyKidFriendly)
  storage.ts   Base64 → Supabase Storage upload
  supabase.ts  Client/service-role setup
  rate-limit.ts  In-memory IP rate limiting
  pdf-template.tsx  PDF layout
supabase-setup.sql   Schema + seeded categories (run in new Supabase project)
```

### 6.3 Current AI contract (generation-first — to be replaced)
`POST /api/generate` switches on `action`:
`outline` (AI writes the whole story) · `regenerate-page` · `generate-image` ·
`generate-cover` · `sync-descriptions`. Three safety layers wrap `outline`:
`moderateContent` → `validatePremise` → `verifyKidFriendly`, plus IP rate limiting.

**Problem:** `outline` = AI authors full pages. This is exactly what the pivot forbids.

### 6.4 Target AI contract (coach-first) — ✅ IMPLEMENTED
The `/api/generate` route shell and **all safety layers** are kept; actions were added
(the legacy `outline`/generation actions still exist for reference but the homepage no
longer routes to them). Implemented in `app/api/generate/route.ts` + `lib/openai.ts`:

- **`coach-response`** — input: child's current text + story state (hero/setting/problem/stage).
  Output: **praise + one guiding question** (+ optional one micro-tip + optional idea `choices`).
  Never a paragraph. (`coachResponse` → `CoachReply {praise, question, tip?, choices?}`.)
- **`review-story`** — input: completed pages. Output: `{celebration, strength, suggestions[]}` —
  **granular, one-at-a-time** suggestions (spelling/grammar/punctuation/vocabulary/clarity)
  the child accepts or ignores. (`reviewStory`.)
- **`generate-illustration`** — input: **child-authored** page text only. Output: image URL.
  Gated behind the per-page challenge completion (the unlock loop). Uses `describeSceneFromText`
  to turn the child's words into an image prompt, then the existing image pipeline.
- **`character-sheet`** — input: hero + name + custom description. Output: `{name, appearance, style}`
  (`generateCharacterSheet`) for character consistency across page illustrations and the cover.

**Enforcement:** strict prompt contracts + output-schema validation (JSON) so the model
cannot slip into authoring mode. All new actions verified live (200 OK) against OpenAI.

### 6.5 Data model
Keep existing tables — `stories`, `pages`, `categories` (+ `stories_with_page_count` view).
Add **additive** tables (don't break current schema):
- **`coach_sessions`** — stage transitions, prompt/response log, encouragement history.
- **`progress_events`** — milestones: first_sentence, first_page, revision_accepted, story_completed.
Optional new fields on `stories`: writing `status` (`draft`/`review`/`published`),
completion timestamps, revision counts. (`stories.status` and `author_name`/`author_credit`
already exist and can be reused.)

### 6.6 Illustration unlock loop
Define a minimum content threshold per page (length/quality). Generate page N's image
**only** when page N's child-written text is sufficient. Reuse the existing
`storage.ts` upload pipeline and character-consistency prompt logic. UI should visualize
"write → unlock art" as a reward.

### 6.7 Gamification layer (Duolingo-style) — ✅ IMPLEMENTED in `app/write/page.tsx`
Every page of the story is framed as a **bite-sized skill challenge**, turning the
Learning Journey (§4 "Eight Writing Muscles") into gameplay:
- **`QUESTS` array** — each entry: `{skill, emoji, mission, target (word goal), xp, prompt(ctx)}`
  cycling through writing muscles (💡 Imagination · 🎨 Description · ❤️ Emotion ·
  🧠 Structure · 💬 Dialogue · 🌟 Confidence). `BONUS_QUEST` covers pages beyond the array.
  `questFor(i)` picks the challenge for page `i`.
- **XP & levels** — `xp` state; `levelFor(xp) = floor(xp/60)+1`. XP awarded when a page's
  word count reaches the quest `target` (challenge complete, via `useEffect` watching the
  `completed` set), **+20** on illustration unlock, **+5** per accepted review tip.
- **Headline logic** — the coach's question is the page **headline**; before the coach has
  replied, the quest's `prompt(ctx)` is the headline (`coach?.question ?? quest.prompt(ctx)`).
- **Illustration unlock is gated on `challengeDone`** (words ≥ quest target), *not* a flat
  word count — writing effort literally unlocks the reward.
- **UI:** XP bar + level, quest medals for completed challenges, a "current challenge" chip,
  a word-goal progress bar, and a celebration **toast** (`fireToast` + auto-clear `useEffect`,
  ~2600ms) fired on challenge complete / unlock / accepted tip.

This stays inside the V1 exclusion list: it rewards **effort** (words written, challenges
completed, stories finished) — never time-on-app, streaks-for-time, or social competition.

### 6.8 Accounts / save-resume / multiple parallel stories — 🔜 NEXT (design decided)
**Requirement (user):** kids can save a story and continue the next day, and have multiple
stories running in parallel — an "account" perspective.

**Current gap:** stories only persist to Supabase **on publish** (`stories` + `pages`).
The entire `/write` flow (hero, name, setting, problem, pages, XP, current challenge) lives
in React state and is **lost on refresh**. There is no draft, no resume, no per-kid ownership.

**Chosen approach (pending final confirm on identity): lightweight local profiles first.**
- A friendly **"Who's writing today?"** avatar/name picker. The profile ID lives in the
  browser (localStorage) and **tags every draft/story** — no email, no password, **no PII**
  (avoids COPPA/kid-privacy burden). Real parent-gated auth can layer on later **without
  reworking the data model** (profile ID → user ID migration).
- **Draft persistence / auto-save:** new additive Supabase table (e.g. `drafts`) storing the
  full write-flow state as JSON (hero/name/setting/problem, pages, xp, completed set, current
  page, characterSheet) keyed by `profile_id` + `story_id`, with `status = draft`. Auto-save
  on each meaningful step; resume restores exact state.
- **"My Books" shelf:** lists in-progress **Drafts** *and* **Published** books for the active
  profile; tapping a draft resumes `/write` where they left off. This is what makes multiple
  parallel stories work.

**Open decision when resuming:** confirm identity model — (A) lightweight local profiles
*(recommended)*, (B) full Supabase Auth now, or (C) device-level drafts with no profiles.
Build order once chosen: `drafts` table → auto-save/resume in `/write` → My Books shelf.

---

## 7. Phased Build Plan

| Phase | Scope | Key files |
|------|-------|-----------|
| **0 — Env setup** *(✅ done)* | New repo + isolated Vercel/Supabase, env vars, optional `COACH_MODE` flag | `.env.local`, `supabase-setup.sql` |
| **1 — Coach-first Write flow** *(✅ done)* | Hero → Name → Setting → Problem → First sentence → guided loop, as a new `/write` route | `app/write/page.tsx` |
| **2 — AI contract pivot** *(✅ done)* | `coach-response`, `review-story`, `generate-illustration`, `character-sheet`; safety layers kept | `app/api/generate/route.ts`, `lib/openai.ts` |
| **3 — Illustration unlock** *(✅ done)* | Gated on challenge completion; art as reward | `api/generate`, `lib/storage.ts`, `app/write/page.tsx` |
| **3.5 — Gamification** *(✅ done)* | Duolingo-style per-page skill challenges, XP/levels, medals, goal bar, toasts | `app/write/page.tsx` |
| **4 — Accounts + data model** *(🔜 next)* | Profiles + `drafts` table (save/resume, multiple parallel stories); later `coach_sessions`/`progress_events` | `supabase-setup.sql`, `app/write/page.tsx` |
| **5 — Read + My Books** | 3-tab nav; technique snippets; Drafts/Finished/Published/PDF; Write CTA everywhere | `app/page.tsx`, new `My Books` route |
| **6 — Review/Publish/Credits** | One-at-a-time review UI; "Written by `<Child>` · Illustrated with `<Product>`" | reader/publish/pdf |
| **7 — Rollout** | Beta on preview domain → validate metrics → attach final domain; keep legacy as fallback | infra |

### Risks & mitigations
- **AI slips into authoring** → strict prompt contracts + output-schema validation + UX constraints.
- **Old/new app confusion** → separate repos/envs/domains, staged rollout.
- **Lost "instant wow" after removing AI drafting** → fast reward via illustration unlocks + strong celebration copy.
- **Scope creep (social/dashboards)** → enforce the V1 exclusion list; park extras in backlog.

---

## 8. Current Status & Next Actions

**Done**
- Forked storynook → storycoach; pushed to GitHub `main`.
- New Supabase project + `supabase-setup.sql` run; public `story-images` bucket.
- `.env.local`: Supabase keys **and** `OPENAI_API_KEY` (sk-proj) set and **verified live** (200 OK).
- Homepage (`app/page.tsx`) rebranded to **Story Coach**; all CTAs repointed to `/write`.
- **Coach-first `/write` flow built** (`app/write/page.tsx`): Welcome → Hero → Name → Setting →
  Problem → guided writing loop → review → publish → done. Coach question is the page headline.
- **Coach AI layer implemented + verified** (`lib/openai.ts` + `/api/generate`):
  `coach-response`, `review-story`, `generate-illustration`, `character-sheet`; all safety layers kept.
- **Illustration unlock** gated on challenge completion.
- **Gamification** (Duolingo-style): per-page skill challenges, XP/levels, quest medals,
  word-goal bar, celebration toasts. Typecheck clean; `/write` serves 200.

**Commits (pushed to `main`)**
- `063b555` — context doc + homepage rebrand
- `3e52f66` — coach-first Write flow (Phase 1 + 2)
- `eda2559` — coach prompt as main headline
- `15e426f` — gamify the write flow

**Immediate next step:** Phase 4 — **accounts / save-resume / multiple parallel stories**
(see §6.8). Confirm identity model (recommended: lightweight local profiles), then build
`drafts` table → auto-save/resume in `/write` → **My Books** shelf.

**Notes / gotchas**
- ⚠️ **npm registry is BLOCKED by IT** ("[TE] NPM URL Block") — cannot `npm install`. Reuse
  packages already in `node_modules`. Verify builds with `npx --no-install tsc --noEmit`.
- Product **name is a placeholder** ("Story Coach"/"Coach") — keep swappable.
- Git commits use the work identity (`huseinm@microsoft.com`, machine default).
- Legacy `/admin/create` generator still exists as reference; homepage no longer links to it.

---

## 9. Manifesto (the "why")

> We believe every child has stories worth telling.
> We believe confidence grows through creation.
> We believe AI should amplify imagination, not replace it.
> When a child proudly says **"I wrote this book,"** we have succeeded.
