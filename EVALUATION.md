# KYVEX ADVERSARIAL EVALUATION — Trial before the market

**Date:** 2026-09-13 (local wall: 2026-09-12 evening ET)  
**Target under test:** local study app at `http://127.0.0.1:3000` (Next.js Kyvex)  
**Claimed production URL:** `https://kyvex.vercel.app` (README)  
**Mode:** READ-ONLY. Nothing was fixed. Bias assumed → scored harsh.

### Evidence & scope honesty (read this first)


| Claimed test                                                      | Status                                                                                                                                      | Evidence                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Fresh account + main account signed-in                            | **Partial** — signed-out surfaces exercised; signed-in dashboard/money path blocked without credentials in this session (routes 307 → auth) | Timing sweep: `/dashboard` `/my-notes` `/flashcards` `/curriculum/SCH4U` → **307** in ~80–190ms |
| Real photo / multi-page PDF / 1h YouTube / 20-card graded session | **Not executed live** — evaluated from code + prior money-path knowledge; do not treat as green                                             | —                                                                                               |
| Both themes                                                       | Privacy rendered dark; landing/login light paper. Full signed-in dark/light parity **not** walked                                           | `tmp/eval/p6-privacy-policy.png`, `tmp/eval/p1-landing-desktop.png`                             |
| Desktop + 390px                                                   | Done on landing                                                                                                                             | `tmp/eval/p1-landing-desktop.png`, `tmp/eval/p1-landing-390px.png`                              |
| Lighthouse on deployed Vercel study app                           | **Impossible** — deployed `kyvex.vercel.app` is a **Discord music bot**, not Kyvex study                                                    | `tmp/eval/p4-prod-music-bot.html` title `Kyvex                                                  |
| IDOR live exploit                                                 | **Code-audited** (not two-account live fire); treat as high-confidence static vuln                                                          | Files cited below                                                                               |


Screenshots directory: `tmp/eval/`.

---



## 1. Executive verdict



# **NOT-BETA-READY**

Three reasons that survive anti-sycophancy:

1. **Canonical production URL is the wrong product.** README says `kyvex.vercel.app`; live HTML title is `Kyvex | Music Bot` (`tmp/eval/p4-prod-music-bot.html`). A beta you cannot reach is not a beta.
2. **Minors + AI + broken authZ.** Peer-review write IDOR (`src/app/api/peer-review/route.ts` updates by `reviewId` with no `authorId` check); unauthenticated Groq burners (`src/app/api/flashcards/generate/route.ts` — no `auth()`); open `_diag/auth` leaking user/session counts (`src/app/api/_diag/auth/route.ts`); privacy policy denies analytics cookies while PostHog is wired (`src/app/layout.tsx` + `/privacy` screenshot).
3. **Learning honesty gaps + feature sprawl.** Flashcards are flip + self-grade (recognition/self-report); session math treats Hard as fail while SM-2 does not; mock “Multiple Choice” is labeled “Pure recall”; landing sells **29 tools** and “Exam Predictor” while checkout is Phase 3 vapor.

Local craft (paper landing, Ontario loop copy, Inbox→notes→cards→mock→Nova narrative) is real. It is not enough.

---



## 2. Score table


| Persona                  | Score /10 | Single worst finding                                                                                                        |
| ------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| P1 Brutal UI Reviewer    | **5**     | App still ships Inter + glass/purple leftovers vs paper/kv landing language (`globals.css`; `ScreenshotCard.tsx`)           |
| P2 Learning Scientist    | **4**     | Flip-card self-grading sold as spaced retrieval; Hard counted as “wrong” while SM-2 advances (`study/page.tsx` vs `sm2.ts`) |
| P3 Skeptical 17yo        | **5**     | Pricing is “Coming soon / Phase 3” — no $7 to pay; ChatGPT still free (`tmp/eval/p3-pricing-phase3.png`)                    |
| P4 Competitor Analyst    | **3**     | Production domain points at a music bot; competitors own shareable decks / free AI study                                    |
| P5 Accessibility Auditor | **4**     | Command palette has no `role="dialog"` / `aria-modal` (`command-palette.tsx`); money path not keyboard-audited signed-in    |
| P6 Security & Privacy    | **2**     | Peer-review IDOR + unauth AI endpoints + minors + incomplete privacy                                                        |
| P7 Performance Engineer  | **3**     | Cold local `/` **10461ms**; claimed Vercel URL is not the app; no real Lighthouse on study deploy                           |
| P8 Teacher (Ontario)     | **5**     | SCH4U moat unit codes A–E do not match Ontario strand letters (SIS…); integrity risk on AI mocks                            |
| P9 Parent ($7)           | **3**     | Cannot pay; privacy is a postcard; wellness + student notes + Groq undisclosed                                              |


Nothing scores 9+. Closest design wins (landing paper craft) lose to Linear/Notion on system consistency and lose to Anki/Knowt on learning/market reality.

---



## 3. THE TOP 20

Ranked by student impact × frequency × severity.


| #   | Issue                                                 | Persona     | Evidence                                                                                               | Fix                                                       |
| --- | ----------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1   | Production URL is Discord music bot                   | P4/P7/P9    | `https://kyvex.vercel.app` → title `Kyvex                                                              | Music Bot`; README L31;` tmp/eval/p4-prod-music-bot.html` |
| 2   | Peer-review update IDOR                               | P6          | `peer-review/route.ts` L72–80: `update({ where: { id: body.reviewId } })` no ownership                 | S                                                         |
| 3   | Unauthenticated Groq flashcard generate               | P6/P7       | `flashcards/generate/route.ts` POST — no session check                                                 | S                                                         |
| 4   | Unauthenticated PDF extract                           | P6          | `extract-pdf/route.ts` — no `auth`/`session` matches                                                   | S                                                         |
| 5   | Privacy policy false on cookies + silent AI/analytics | P6/P9       | `/privacy` “session cookies only”; `layout.tsx` mounts `PostHogProvider`; Groq used widely — not named | M                                                         |
| 6   | Open diag endpoint                                    | P6          | `_diag/auth/route.ts` returns `userCount`/`sessionCount`/env flags unauthenticated                     | S                                                         |
| 7   | Middleware skips all `/api/*`                         | P6          | `middleware.ts` matcher comment L96–99                                                                 | M                                                         |
| 8   | Group resource pin IDOR (cross-group by resourceId)   | P6          | `study-groups/[id]/resources/route.ts` L43–48 updates by `resourceId` only                             | S                                                         |
| 9   | SM-2 Hard vs UI “wrong” contradiction                 | P2          | `sm2.ts` Hard keeps progress; `study/page.tsx` L82 `rating < 2` → wrong                                | S                                                         |
| 10  | “Pure recall” label on MC focus                       | P2/P8       | `mock-exam/page.tsx` L54 `sub: "Pure recall"`                                                          | S                                                         |
| 11  | Flashcards = recognition + self-report, not retrieval | P2          | Study flow flip then rate (`study/page.tsx`) — no typed answer                                         | M                                                         |
| 12  | Feature dump (29 tools) kills focus                   | P1/P3       | Landing features grid snapshot `#pricing` / features section                                           | M                                                         |
| 13  | Exam Predictor marketed on landing                    | P1/P3/stale | Landing tool card “20 Exam Predictor”; nav still lists it                                              | S                                                         |
| 14  | Checkout not live — cannot charge $7                  | P3/P9       | `tmp/eval/p3-pricing-phase3.png` “Phase 3” / “Soon / month”                                            | L                                                         |
| 15  | Cold TTFB catastrophe locally                         | P7          | `/` 10461ms, `/login` 17900ms (PowerShell timing 2026-09-13)                                           | L                                                         |
| 16  | FAQ claims E2E encryption (stale/unused but present)  | P6/P9       | `src/app/_components/kyvex/faq.tsx` L13                                                                | S                                                         |
| 17  | Inter + glass/purple vs kv paper                      | P1          | `globals.css` `--font-sans: 'Inter'`; `ScreenshotCard.tsx` purple glow/blur                            | M                                                         |
| 18  | Export incomplete vs “delete/export my data”          | P6          | `user/export/route.ts` notes/citations/battles… omits decks/mocks/tutor/wellness                       | M                                                         |
| 19  | Ontario moat map strand codes wrong for SCH4U         | P8          | `curriculum-moat-maps.ts` Organic=`A` (Ontario chemistry strands use SIS letters, not A=organic)       | M                                                         |
| 20  | Command palette a11y incomplete                       | P5          | `command-palette.tsx` — no `role="dialog"`                                                             | S                                                         |


---



## 4. Competitor matrix + honest moat



### Matrix (2026 public pricing / killer features — web research + Kyvex local)


| Product                              | Killer feature                          | Approx price        | UX bar        | Beats Kyvex on                    | Kyvex beats them on                                | Would kill Kyvex with                |
| ------------------------------------ | --------------------------------------- | ------------------- | ------------- | --------------------------------- | -------------------------------------------------- | ------------------------------------ |
| **Quizlet**                          | Shared sets + Learn modes + brand trust | Free + Plus ~$36/yr | High          | Distribution, social sets, polish | Ontario loop narrative, Inbox→mock continuity      | Shareable class sets overnight       |
| **Anki**                             | Real SRS + FSRS/addons ecosystem        | Free (iOS ~$25)     | Ugly/powerful | Scheduling honesty, power users   | Guided UI, photo Inbox, Nova                       | “Your SM-2 isn’t Anki” word-of-mouth |
| **Knowt**                            | Free AI notes/cards from uploads        | Strong free         | Good          | Price = $0 AI study               | Curriculum grounding claim, mock→tutor loop        | Free forever AI                      |
| **StudySmarter / StudySmarter-like** | All-in-one notes+plan                   | Freemium            | Mid           | Breadth marketing                 | Tighter Toronto/Ontario voice                      | Locale packs                         |
| **Brainscape**                       | Confidence-based spaced reps            | ~$8/mo Pro          | Polished      | SRS productization                | Photo→mock pipeline                                | Confidence grading + mobile          |
| **StudyFetch**                       | Spark.E tutor + live lecture            | ~$8–12/mo           | Strong AI UX  | Tutor depth, lecture capture      | Ontario secondary specificity                      | Live lecture assistant               |
| **Turbo AI (TurboLearn)**            | Lecture/PDF/YouTube → materials fast    | Free + ~$20/mo      | Fast ingest   | Multimedia speed at scale         | Named mock exam + Nova miss review                 | 30s lecture→deck                     |
| **Mindgrasp**                        | Dense PDF → notes/cards/quiz            | ~$6–11/mo           | Clean         | Reading pipeline                  | Local curriculum maps                              | Unlimited ingest                     |
| **ChatGPT-as-tutor**                 | Infinite flexible help                  | Free / Plus         | Chat          | Zero install, already open        | Structured loop + persistence of notes/decks/mocks | “Just paste the worksheet” habit     |


**Feature matrix (Kyvex vs field)**


| Capability            | Kyvex             | Quizlet       | Anki          | Knowt       | Brainscape | StudyFetch | Turbo    | Mindgrasp | ChatGPT |
| --------------------- | ----------------- | ------------- | ------------- | ----------- | ---------- | ---------- | -------- | --------- | ------- |
| Import photo/PDF/YT   | Y (Inbox)         | Partial       | Addons        | Y           | Weak       | Y          | Y        | Y         | Paste   |
| Spaced repetition     | Partial SM-2      | Learn/SRS-ish | Best-in-class | Y           | Y          | Limited    | Limited  | Limited   | No      |
| AI tutor              | Nova              | Limited       | No            | Y           | No         | Strong     | Y        | Y         | Strong  |
| Mock exams            | Y                 | Quizzes       | No            | Quizzes     | No         | Quizzes    | Quizzes  | Quizzes   | DIY     |
| Curriculum grounding  | Ontario claim     | Weak          | DIY           | Weak        | Weak       | Weak       | Weak     | Weak      | DIY     |
| Social / shared decks | Thin              | Moat          | Shared decks  | Y           | Y          | Groups     | Weak     | Weak      | No      |
| Price today           | Free + unpaid Pro | Freemium      | Free          | Free-strong | Paid       | Paid       | Freemium | Paid      | Free    |




### Honest moat (≤3 sentences)

Kyvex’s real moat is a **Ontario Grade 11–12–shaped study loop** (Inbox → My Notes → Flashcards → Mock Exam → Nova) with curriculum maps and write-backs — not “AI” and not “SRS.” That moat is **not** shipped as a shareable network effect, not proven to raise marks, and currently **unreachable on the claimed production domain**. Imagined moats (E2E encryption, pure-recall MC, Anki-grade SM-2, live checkout at $7) are not real.

---



## 5. Per-persona full sections

---



### P1 — Brutal UI Reviewer — **5/10**

Landing paper/kv can look intentional (dot grid, lime CTA, serif headline). Linear/Notion win on *system* consistency; Kyvex wins first-viewport brand only while the dashboard still inherits Inter/glass debt.

**Issues (≥5)**

1. **Inter still canonical for app chrome** — `src/styles/globals.css` L25 `--font-sans: 'Inter'…` (banned “default stack” vs landing craft).
2. **Glass/purple residual language** — `src/components/ScreenshotCard.tsx` `backdrop-blur-xl`, purple glow accents.
3. **29-tool marketing grid** competes with the one-loop promise — landing features snapshot (`http://127.0.0.1:3000/#pricing` / features).
4. **Exam Predictor still a hero’d tool card** — same landing list item 20.
5. **Auth shell naming debt** — login imports `AuthPaperShell` from `auth-glass-shell` (`login/page.tsx`).
6. **Dual button species** risk — kv buttons on paper surfaces vs legacy premium classes elsewhere (globals still carries `.app-premium-dark` focus rules).
7. **390px:** hamburger appears (`tmp/eval/p1-landing-390px.png`) — OK collapse; hero mock chrome disappears vs desktop composition (`tmp/eval/p1-landing-desktop.png`) so mobile loses the interactive loop toy.

**Praise + 2×:** Landing hero is the one surface that could be screenshot-worthy; 2× would be deleting Inter/glass from every authenticated route and killing the 29-card zoo down to the five loop tools.

---



### P2 — Learning Scientist — **4/10**

Would this raise a mark? Only if students use mocks + short answer + Nova miss review honestly. Default paths enable **productive-feeling passive study**.

**Issues (≥5)**

1. **Recognition, not retrieval** — flashcard study flips then self-rates (`flashcards/[id]/study/page.tsx`); no typed/spoken production.
2. **Hard = wrong in UI, not in SM-2** — `history.filter(rating < 2)` L82 vs `sm2.ts` Hard keeps repetitions. Students learn false metacognition.
3. **“Pure recall” lie on MC** — `mock-exam/page.tsx` L54; recognition with options ≠ recall.
4. **Default blend ~70% MC** — `splitForFocus` L63 `volume * 0.7` — easy recognition diet.
5. **Passive pseudo-study catalogue** (enablers): Listen to Notes (TTS), Micro-Lessons, Narrative Memory, Compress Notes, Adaptive Notes auto-restructure, Battle games, Habits/streak XP, Learning Preferences quiz-as-ability-cosplay (partially relabeled), Nova chat without forced retrieval, podcast-like surfaces.
6. **Mastery / IQ vanity risk** — curriculum confidence and composite scores remain easy to over-trust without item-response honesty (write-backs exist; measurement still soft).
7. **Explanations post-hoc on MC** — generation asks for explanations (`mock-exam-build.ts`) after recognition — formative only if student was wrong *and* reads them.

**KEY ANSWER:** Kyvex often lets students **feel** busy (flip, listen, chat, badge) while outsourcing thinking to Groq. The mock + short-answer + Nova miss path can force thinking — it is not the default gravity well.

**Praise + 2×:** Weakness-first due ordering (`orderDueWeaknessFirst`) is the right instinct; 2× = typed cloze/production grading + honest Hard metrics + interleaving that is forced, not optional.

---



### P3 — Skeptical 17-year-old — **5/10**

First 3 minutes on local landing: actually decent — “worksheet → flashcards” is clear (`tmp/eval/p1-landing-desktop.png`). Would they screenshot? Maybe the interactive loop mock. Would they pay $7? **Cannot** — pricing is Coming soon (`tmp/eval/p3-pricing-phase3.png`). ChatGPT still wins on laziness.

**Issues (≥5)**

1. **No live checkout** — “Phase 3” / “Soon / month” — stickiness without payment is fanfic.
2. **29 tools = try-hard / boring** — feature zoo reads like a startup graveyard.
3. **⌘K not discoverable signed-out** — palette is dashboard component (`command-palette.tsx`); landing never teaches it.
4. **Cringe risk:** “THE 11PM EDITION” / “for the night before the test.” — fine once; stacked with battle royale + habits = teacher’s-pet app.
5. **Exam Predictor card** smells like fake magic.
6. **Production URL is a music bot** — if a friend clicks the README link, instant group-chat roast.
7. **Would rather use ChatGPT** for one worksheet photo description unless Inbox→deck is *faster than paste*.

**Praise + 2×:** Loop demo on desktop is the sticky artifact; 2× = one viral share card of “I photographed chem → scored 11/15 on the mock” with zero tool zoo.

---



### P4 — Competitor Analyst — **3/10**

Visited/verified: `kyvex.vercel.app` = music bot; competitor pricing from 2026 web sources (StudyFetch ~$8–12, Mindgrasp ~$6–11, Turbo ~$20, Quizlet Plus ~$36/yr, Anki free, Knowt free-strong).

**Issues (≥5)**

1. **Deploy identity failure** — music bot HTML evidence.
2. **No shareable deck network** — Quizlet/Knowt kill distribution.
3. **SRS not competitive with Anki/Brainscape.**
4. **AI tutor not competitive with StudyFetch Spark.E / ChatGPT.**
5. **Ingest speed narrative owned by Turbo/Mindgrasp.**
6. **Price story broken** — competitors charge; Kyvex advertises Pro without billing.
7. **Imagined moat:** “we’re the Ontario AI OS.” **Real moat:** thin curriculum maps + loop UX — copyable in a quarter by a funded rival.

**Praise + 2×:** Nobody else markets the five-step Ontario night-before loop this clearly; 2× = shared SCH4U decks + teacher roster + mark lift study.

---



### P5 — Accessibility Auditor (WCAG 2.2 AA) — **4/10**

Signed-out login has labeled email/password and Show password (`/login` snapshot). Full keyboard money path **not** completed (auth wall).

**Issues (≥5)**

1. **Command palette missing dialog semantics** — no `role="dialog"` / `aria-modal` in `command-palette.tsx`.
2. **Learn/modals historically without dialog role** (prior audit; treat as systemic pattern).
3. **Color-alone risk** — lime accent + streak/mastery colors; Hard/Again both dumped into “wrong” bucket (semantic color coupling).
4. **Touch targets at 390px** — hamburger + Begin OK on landing screenshot; dense tool grids likely <44px (features grid).
5. **Reduced motion** — present in `landing.css` / `auth.css`; not proven across all dashboard motion.
6. **Contrast spot-check needed on lime-on-cream CTAs** — landing uses lime buttons with black text (likely OK); olive/muted secondary text on cream needs meter (not instrumented this pass — **gap**).
7. **Focus order in mobile menu** — “Open menu” exists; drawer a11y not fully walked.

**Praise + 2×:** Login labels are cleaner than average edtech; 2× = axe CI on every money-path route + dialog primitive everywhere.

---



### P6 — Security & Privacy Auditor — **2/10**

Serves minors. This score is a fail.

**Issues (≥5)**

1. **Peer-review IDOR** — any authed user can `POST` `{ reviewId }` and overwrite feedback (`peer-review/route.ts` L72–80).
2. **Group resource pin IDOR** — pin by `resourceId` without verifying `resource.groupId === id` (`resources/route.ts` L43–48).
3. **Unauth Groq** — `flashcards/generate` burns API key for anyone who can hit the route.
4. **Unauth** `extract-pdf` — upload/parse without session.
5. `_diag/auth` **open** — user/session counts.
6. **No app-level rate limits** on most AI routes (middleware skips `/api/`*).
7. **Privacy postcard** — `tmp/eval/p6-privacy-policy.png`: no Groq, PostHog, wellness, COPPA/PIPEDA, retention, subprocessors; deletion = email `kyvex@gmail.com` only.
8. **Cookie claim false** vs PostHog provider.
9. **Export incomplete** — `user/export/route.ts` omits major study artifacts.
10. **Stale E2E encryption claim** in `kyvex/faq.tsx` L13.

Core notes/decks ownership patterns are better elsewhere — that does not redeem IDOR + unauth AI.

**Praise + 2×:** Auth gate on dashboard routes (307) shows intent; 2× = threat model for minors + IDOR tests in CI + real privacy policy.

---



### P7 — Performance Engineer — **3/10**

**Numbers (local, 2026-09-13):**


| Route               | Status | Time        | Notes         |
| ------------------- | ------ | ----------- | ------------- |
| `/`                 | 200    | **10461ms** | HTML ~196KB   |
| `/login`            | 200    | **17900ms** | Cold-ish      |
| `/privacy`          | 200    | 4191ms      |               |
| `/dashboard`        | 307    | 189ms       | auth redirect |
| `/my-notes`         | 307    | 88ms        |               |
| `/flashcards`       | 307    | 81ms        |               |
| `/curriculum/SCH4U` | 307    | 164ms       |               |


Deployed study-app Lighthouse: **N/A** (wrong product on Vercel). Neon cold-start: not newly quantified here; prior folklore stands as risk — **do not invent a ms number**.

**Issues (≥5)**

1. **10s+ HTML for marketing home** locally.
2. **17s login document** locally.
3. **~196KB landing HTML** — bloat signal.
4. **No valid production perf baseline** — music bot.
5. **Unauth AI endpoints** = cost/perf DoS surface.
6. **Money-path signed-in timings** not measured this session (auth wall).

**Praise + 2×:** Auth redirects are fast; 2× = edge-cached landing <1s TTFB + Lighthouse 90 mobile on the real domain.

---



### P8 — Teacher (Ontario secondary) — **5/10**

Would I recommend? **Not yet** — integrity + curriculum accuracy + privacy must clear a bar.

**Issues (≥5)**

1. **SCH4U unit codes A–E misaligned** with Ontario chemistry strand lettering (`curriculum-moat-maps.ts` Organic as `A`).
2. **Thin expectations** — topic lists, not curriculum expectation codes teachers recognize.
3. **Mock-from-notes = cheating-adjacent** if students generate answers without retrieval; also legitimate practice if timed closed-book — product doesn’t enforce closed-book.
4. **Essay/AI Feedback trust** — AI critique is not moderated teacher judgment; peer-review IDOR undermines any “peer” framing residue.
5. **Exam Predictor marketing** reads like grade prophecy to parents/students.
6. **29 tools** — classroom adoption needs three tools, not twenty-nine.
7. **Wellness + minors** without clear teacher/parent visibility.

**What would make me show a class:** SCH4U unit map that matches the ministry document, a 15-minute mock that looks like *my* unit test, and a privacy one-pager I can forward to admin.

**Praise + 2×:** “Built in Toronto · Ontario Grade 11–12” is the right positioning; 2× = ministry-aligned codes + teacher roster + integrity mode (no paste-back during mock).

---



### P9 — Parent ($7) — **3/10**

Safe? Unclear. Worth it? Cannot buy. Predatory? Soft — streaks/habits exist; checkout isn’t live so upsell pressure is weirdly hollow (`tmp/eval/p3-pricing-phase3.png`).

**Issues (≥5)**

1. **Cannot actually pay $7** — Phase 3.
2. **Privacy inadequate for minors** — screenshot evidence.
3. **Student notes + mood/wellness + AI vendors undisclosed.**
4. **Gmail contact for deletion** — not a parental dashboard.
5. **Wrong production site** destroys trust if Googled.
6. **Stale encryption FAQ claim** if ever linked.
7. **No parent-visible progress** — trust is “hope the kid studies.”

**Praise + 2×:** Login page looks calm and non-scammy (`tmp/eval/p9-login.png`); 2× = parent portal + PIPEDA-grade policy + real billing with clear student data map.

---



## 6. Cross-cutting sweeps



### Console errors

Signed-out routes checked via browser snapshots: landing, privacy, login, pricing. **Full signed-in console zero-tolerance sweep incomplete** (auth wall). Treat as **open risk**, not clean bill.

### Empty states

Fresh-account empty states for notes/decks/mocks **not live-tested** this session.

### Error states

Scanned PDF / no-captions YouTube / bad URL **not live-triggered** this session — prior product work claims busy/rate messages on Groq; do not mark green.

### Stale content


| Finding                   | Evidence                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Exam Predictor on landing | Features list item 20                                                               |
| E2E encryption FAQ        | `kyvex/faq.tsx` (component unused in grep — still toxic if reimported)              |
| “AI Tutor” persona string | `api/tutor/route.ts` system prompt still says “AI Tutor” while product name is Nova |
| Pricing Phase 3           | `tmp/eval/p3-pricing-phase3.png`                                                    |
| README production URL     | points at music bot                                                                 |


---



## 7. What would make this a 10

**P1:** One design system only — paper/kv everywhere, no Inter/glass/purple, five tools max on marketing.  
**P2:** Typed retrieval + honest SM-2 metrics + default short-answer pressure + kill XP-for-listening.  
**P3:** One shareable win moment in <60s and a real $7 checkout that doesn’t feel like a lecture.  
**P4:** Own the Ontario shared-deck + teacher channel; ship on a real domain.  
**P5:** WCAG AA money path with dialogs, 44px targets, contrast CI.  
**P6:** Zero IDORs, auth on every AI/upload route, rate limits, real PIPEDA/COPPA policy, parent delete.  
**P7:** Sub-second landing, Lighthouse 90+ on the real deploy, Neon cold start quantified and fixed.  
**P8:** Ministry-accurate maps, integrity mode, feedback a teacher would co-sign.  
**P9:** Clear safety story, visible data map, worth $7 because marks move — not because streaks guilt.

---



## Appendix — artifact index


| File                              | What it proves                    |
| --------------------------------- | --------------------------------- |
| `tmp/eval/p1-landing-desktop.png` | Desktop paper landing / loop mock |
| `tmp/eval/p1-landing-390px.png`   | 390px landing + hamburger         |
| `tmp/eval/p3-pricing-phase3.png`  | Checkout not live                 |
| `tmp/eval/p4-prod-music-bot.html` | Production title = Music Bot      |
| `tmp/eval/p6-privacy-policy.png`  | Thin / inaccurate privacy         |
| `tmp/eval/p9-login.png`           | Signed-out auth surface           |


**— End of trial. No fixes applied.**