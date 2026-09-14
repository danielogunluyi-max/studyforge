# KYVEX TRIAL BY SUPERNOVA — Round 2 Adversarial Evaluation

**Date:** 2026-09-13  
**Targets:** Production `https://studyforge-nu.vercel.app` (README canonical) + local `http://127.0.0.1:3000`  
**Mode:** READ-ONLY. Nothing was fixed. Builder bias assumed → scored crueler than Round 1.  
**Accounts:** Fresh A/B created via signup (emails in `tmp/eval2/accounts.txt`; passwords omitted here). No `TEST_EMAIL`/`TEST_PASSWORD` env present this session.  
**Screenshots:** `tmp/eval2/`. Security live-fire log: `tmp/eval2/security-probes.md`.

### Scope honesty

| Claimed | Status | Evidence |
|---------|--------|----------|
| Fresh account signed-in on prod | **Done** (account A) | Dashboard/flashcards/study/mock-exam walked; `tmp/eval2/p3-dashboard-signed-in.png` |
| Second account for IDOR | **Done** (account B) | `tmp/eval2/security-probes.md` |
| Main / long-lived account | **Not available** — no MAIN credentials in env | Written reason |
| Both themes × every authenticated page × 72 routes at 390px | **Partial** — prod signed-in dark walked on dashboard/flashcards/study/mock; light paper on landing/privacy/pricing; not all 72 routes screenshot | Notes in P1/P5 |
| Lighthouse Core Web Vitals | **Blocked** — Chrome launcher missing in sandbox; Playwright Chrome path rejected by lighthouse | Warm TTFB timings substituted |
| Live Groq/mock generation / 10MB PDF / 3h lecture / 40-frame stitch | **Not burned** — rate-limit + cost; judged from code + hostile unit tests where possible | Typed grader unit fire below |
| NVDA / VoiceOver | **Not instrumented** — keyboard + a11y tree from browser snapshot only | P5 |
| Export JSON download values | **Code-verified** (`export/route.ts` keys); live download of personal JSON suppressed by tooling policy | Partial |

---

## 1. REGRESSION TABLE (Round-1 Top-20)

Legend: **PROD** = what students hit today. **LOCAL** = `main` workspace after security/truth/craft/product sprints.

| # | Round-1 issue | Verdict | Evidence |
|---|---------------|---------|----------|
| 1 | Prod URL is Discord music bot | **FIXED-VERIFIED** | README → `studyforge-nu.vercel.app`; live title `Kyvex`; landing hero Ontario loop (`tmp/eval2/p0-prod-landing-desktop.png`). `kyvex.vercel.app` explicitly disclaimed. |
| 2 | Peer-review update IDOR | **FIXED-VERIFIED** | Live B→fake reviewId → **404** `Not found` (`security-probes.md` §4). Code: `authorId !== session.user.id` → 404. *Cruel note:* author-only update also breaks real peer review product semantics. |
| 3 | Unauth flashcards/generate | **FIXED-VERIFIED** | Prod POST → **401** Unauthorized (live probe). |
| 4 | Unauth extract-pdf | **FIXED-VERIFIED** | Prod POST → **401**. |
| 5 | Privacy false on cookies / silent AI | **FIXED-VERIFIED** | Prod `/privacy` names Groq, Vercel, Neon, PostHog; minors/PIPEDA/COPPA-style; PostHog cookies admitted (`tmp/eval2/p6-privacy-prod.png` + a11y tree). |
| 6 | Open `_diag/auth` | **FIXED-VERIFIED** | Unauth **401**; authed **404** (route gone). |
| 7 | Middleware skips `/api/*` | **FIXED-VERIFIED** | Matcher includes API; unauth notes/generate → 401; mutating POST burst → **429** at ~83 (`security-probes.md` §6). |
| 8 | Group resource pin IDOR | **FIXED-VERIFIED** | B pin of A’s resource on B’s group → **404**. |
| 9 | SM-2 Hard = “wrong” UI | **FIXED-VERIFIED (local code)** / **PARTIAL (prod UX not re-graded end-to-end)** | Local/study copy: “Hard (shaky)”; Again-only restudy. Prod study session available but Hard stats not completed live this round. |
| 10 | MC “Pure recall” | **FIXED-VERIFIED** | Prod mock dial: “Recognition practice” (snapshot). |
| 11 | Flip-only / no typed retrieval | **PARTIAL** | **LOCAL code** has typed mode + fuzzy grader. **PROD study** shows flip-only — no “Type the answer” control (`tmp/eval2/p2-study-no-typed-on-prod.png`). Deploy lag. |
| 12 | 29-tool landing zoo | **PARTIAL** | **LOCAL:** “One machine. Five tools.” + collapsed `See all 30+ tools →` (`http://127.0.0.1:3000/`, snapshot). **PROD:** still “Tools you actually use.” with 28 numbered cards (`tmp/eval2/p0-…`, pricing scroll). |
| 13 | Exam Predictor on landing | **PARTIAL** | Marquee filters it; **sidebar still lists Exam Predictor** signed-in (`e26` on dashboard). Page title still “AI Exam Predictor”. |
| 14 | Checkout / $7 not live | **NOT-FIXED** | Pricing: “Checkout is not live yet — Phase 3” (`tmp/eval2/p3-pricing-phase3-still.png`). No Stripe in `src`. |
| 15 | Cold TTFB catastrophe | **PARTIAL** | Prod warm `/` ~306–1630ms (avg ~757ms, 75KB). Local cold `/` **28758ms** still catastrophic. Neon health latency **768ms** observed. |
| 16 | FAQ E2E encryption claim | **FIXED-VERIFIED** | `faq.tsx` deleted (no app faq surface). |
| 17 | Inter + glass/purple | **PARTIAL** | LOCAL globals: Plus Jakarta; ScreenshotCard hairline `.card`; `.app-premium-dark` rules purged. PROD landing paper looks clean. Signed-in chrome still has residual non-kv: presentation/learning-style pages (code), dark muted-contrast flashcards (`p2`/`p3` shots), sidebar named `SidebarGlass`. |
| 18 | Export incomplete | **FIXED-VERIFIED (code)** | `user/export/route.ts` emits decks/cards/mocks/attempts/tutorThreads/wellnessEntries/captures (+ notes…). Live download of values not re-emitted here. |
| 19 | SCH4U Organic strand wrong | **FIXED-VERIFIED (code)** | `curriculum-moat-maps.ts` Organic = **B**. Spot-check map: A Skills, B Organic, C Structure, D Energy/Rates, E Equilibrium, F Electrochem. Ministry PDF re-diff not re-downloaded this round — code matches Round-1 correction target. |
| 20 | Command palette a11y | **PARTIAL** | LOCAL: `role="dialog"` + `aria-modal` + `useDisclosurePanel`. PROD: Ctrl+K opens search field (focus moves); Escape closes — dialog role not confirmed in a11y YAML. Deploy lag likely. |

**REGRESSED?** None of the Round-1 *security* fixes regressed on prod.  
**Deploy-regressions / truth gap:** Product sprints that “fixed” #11/#12 in git are **absent on the public deploy** — treat as **PARTIAL**, not REGRESSED code, but **CRITICAL for beta** (students do not get the claimed product).

**New CRITICAL/HIGH this round (not in R1 table):** see Top 25.

---

## 2. Executive verdict

# **NOT-BETA-READY**

Three reasons that survive anti-sycophancy:

1. **You cannot charge, and you cannot convert.** Pricing is still Phase 3 vapor on the live site. Without checkout, Round-1 P3/P9 blockers stand. Knowt/Quizlet already own the free/habit slot.
2. **Deploy honesty gap.** Local ships LOOP + typed retrieval + 50/50 mock dial; production still ships the 28-tool zoo, flip-only study, and **14 MC + 6 SA** on a 20q Simulator. Marketing the fixed product while prod lags is a trust failure.
3. **Learning integrity still soft.** Typed fuzzy grader (local) accepts `Na`≡`K` and `ab`≡`xy` (Levenshtein ≤2 absolute). Passive-assignable achievements. Adaptive-notes PATCH still ownership-blind in code. Ontario boards approve Gemini/Copilot/ChatGPT — not Kyvex — so teacher distribution is blocked.

Security Round-1 work **did** land on prod (IDOR 404s, API 401s, privacy truth). That is real progress. It is not beta.

---

## 3. Score table (10 personas × delta vs Round 1)

| Persona | R2 /10 | R1 | Δ | Worst finding |
|---------|--------|----|---|---------------|
| P1 Pixel Inquisitor | **5** | 5 | 0 | Prod still ships tool zoo; signed-in dark contrast / chrome sprawl |
| P2 Learning Scientist | **4** | 4 | 0 | Typed grader gameable; prod still flip-first; passive catalog theater |
| P3 Teen Who Ruins Apps | **4** | 5 | −1 | Still can’t pay; onboarding modal + emoji education tiers; no group-chat moment in 30m |
| P4 Competitor Analyst | **4** | 3 | +1 | Correct prod URL helps; still no network effects / checkout |
| P5 Accessibility | **5** | 4 | +1 | Palette better locally; touch/contrast/onboarding traps remain |
| P6 Security & Privacy | **5** | 2 | +3 | R1 IDORs fixed live; residual adaptive-notes ownership + GET flood + achievements forge |
| P7 Performance | **4** | 3 | +1 | Prod warm OK (~0.3–1.6s); local cold 28s; Lighthouse blocked; Neon 768ms |
| P8 Ontario Teacher | **5** | 5 | 0 | Moat letters fixed in code; integrity + board AI catalogues still kill classroom use |
| P9 Parent | **4** | 3 | +1 | Privacy readable; still no marks evidence / no checkout |
| P10 Founder’s Ghost | **3** | — | — | Over-built zoo; under-built shareable decks + deploy discipline |

Nothing ≥9. Closest craft win (landing paper) still loses system consistency to Linear/Notion and learning honesty to Anki.

**World-class thing Kyvex STILL beats (required for any ≥9 — none awarded):** Ontario-named loop copy (Inbox→Mock→Nova) on a paper landing is clearer than generic AI-study landing pages (e.g. Knowt’s free-everything blur, StudyFetch’s Spark.E marketing). That is a positioning win, not a product win — and **does not** clear a 9.

---

## 4. THE TOP 25 (student impact × frequency × severity)

| # | Issue | Sev | Fix |
|---|-------|-----|-----|
| 1 | Prod deploy lags claimed product (LOOP / typed / 50-50) | CRITICAL | S (ship) |
| 2 | Checkout still Phase 3 — cannot take $7 | CRITICAL | L |
| 3 | Typed fuzzy grader gameable on short answers (`ab`≡`xy`) | HIGH | M |
| 4 | No shareable-deck network vs Quizlet/Knowt | HIGH | L |
| 5 | Sidebar still markets Exam Predictor + “Nova AI Tutor” | HIGH | S |
| 6 | Adaptive-notes PATCH no ownership check | HIGH | S |
| 7 | Achievements unlockable by client `key` | HIGH | S |
| 8 | Passive sprawl inside app (40+ sidebar links) kills focus | HIGH | M |
| 9 | Onboarding modal blocks every route until level pick | MED | S |
| 10 | GET API flood unbounded (80× notes, no 429) | MED | M |
| 11 | In-memory rate limits (no cross-replica) | MED | M |
| 12 | Local cold start ~28s | MED | L |
| 13 | Dark-theme muted text contrast (flashcards/dashboard) | MED | M |
| 14 | Passive/SA cap math: volume 30 → 25q at 50/50 (local) | MED | S |
| 15 | Peer-review “fixed” but product-broken (author-only) | MED | M |
| 16 | Passive/FEELS catalog (Listen, Podcast, Battles…) dilutes loop | MED | M |
| 17 | No parent-visible progress / shareable results | MED | M |
| 18 | Board AI catalogues exclude Kyvex (Gemini/Copilot preferred) | HIGH | L (trust) |
| 19 | Capture/upload hostile cases not proven hardened | MED | M |
| 20 | Pricing copy promises “15 free actions/day” nowhere live | MED | S |
| 21 | Bottom nav + focus dials collide at 390px | MED | S |
| 22 | Rate-limit probe littered account with 80+ junk notes | LOW* | S |
| 23 | `SidebarGlass` naming / residual glass CSS vars | LOW | S |
| 24 | Lighthouse not runnable in this agent environment | LOW | — |
| 25 | Maple-leaf / emoji education picker (cringe) | LOW | S |

\*Eval artifact, but shows lack of abuse UX.

---

## 5. Competitor matrix v2 + kill-shots + conversion

### Matrix (public 2026 pricing; verify before shipping claims)

| Product | Killer | Price (approx) | Beats Kyvex | Kyvex edge | Kill-shot vs Kyvex |
|---------|--------|----------------|-------------|------------|--------------------|
| **Quizlet** | Shared sets + Learn | Free + Plus ~$36–45/yr | Distribution, brand | Ontario loop naming | Class sets + school SKUs overnight |
| **Anki** | FSRS/SM-2 honesty | Free (iOS ~$25) | Scheduling trust | Guided photo→mock | “Your fuzzy ≤2 isn’t retrieval” |
| **Knowt** | Generous free AI | Free / Ultra ~$10–25/mo | Price = $0 habit | Curriculum maps | Stay free forever + Kai tutor |
| **Brainscape** | Confidence SRS | Pro ~$8/mo annual | Polished mobile SRS | Inbox continuity | Confidence UI + cert decks |
| **StudyFetch** | Spark.E + lecture | ~$8–19/mo | Tutor depth | Secondary Ontario voice | Live lecture assistant |
| **Turbo / Mindgrasp** | Fast PDF→materials | ~$6–20/mo | Ingest speed | Named mock+Nova miss | 30s lecture→deck |
| **ChatGPT** | Already open | Free / Plus | Zero friction | Persistence of notes/decks/mocks | “Paste worksheet” habit |
| **Board tools** | Gemini / Copilot / NotebookLM | “Free” via school | **Approved** | None | Policy ban of unapproved apps |

**New curriculum-specific AI apps:** no dominant Ontario-secondary specialist found; boards standardize on Gemini/Copilot/ChatGPT catalogues ([HDSB GenAI guidelines](https://www.myhdsb.ca/media/bhtc22om/generative-ai-staff-and-student-use-guidelines.pdf), [YRDSB student AI guidelines](https://www2.yrdsb.ca/student-support/artificial-intelligence/student-ai-guidelines-grades-7-12)). That is the real competitor class for classroom use.

### Conversion model (100 students, cruel)

Assumptions: free curiosity signup; no checkout today → **paid conversion = 0**.  
If Stripe ships at **$6.99 CAD/mo** with **15 AI actions/day**:

| Funnel step | Rate | Count |
|-------------|------|-------|
| Land | 100 | 100 |
| Signup | 25% | 25 |
| Complete Inbox→cards once | 40% of signup | 10 |
| Return day 3 | 30% of activated | 3 |
| Hit free-action wall | 50% of returners | 1–2 |
| Pay (optimistic vs Knowt free) | 20% of wall-hitters | **≪1** |

**Verdict:** Cap is **too generous to convert** against Knowt’s free tier, and **too invisible** without a meter UI. Network effects missing → CAC must be paid every cohort.

**Distribution:** Library filters ≠ Quizlet sets. Fastest counter: **one-click public deck + class code** (not another tool page).

---

## 6. Per-persona sections (≥7 findings each)

### P1 — Pixel Inquisitor — **5/10**

1. **HIGH** Prod features = 28-card zoo; local LOOP only (`p0` vs local snapshot).  
2. **MED** Signed-in dark: muted gray-on-near-black flashcards (`p2`/`p3`) — eyedropper risk for AA.  
3. **MED** Sidebar dumps 40+ destinations — not hairline craft; it’s a directory.  
4. **LOW** `SidebarGlass` filename vs paper language.  
5. **MED** Onboarding modal with 🍁🎓🏛 emoji tiles — off-token vs landing restraint.  
6. **MED** Empty/loading: mock-exam “Loading” twice in a11y tree with no kv empty copy.  
7. **LOW** Residual `--accent-purple` / `--glass-*` still in globals CSS (even if unused on ScreenshotCard).  
8. **Compare:** Linear/Things win density discipline; Notion wins system; Kyvex landing hero is the only surface that could screenshot — and then the zoo undoes it on prod.

### P2 — Learning Scientist — **4/10**

1. **CRITICAL** Fuzzy grader: `gradeTypedAnswer('ab','xy')` → **correct**; `'Na','K'` → **correct** (unit fire). Absolute ≤2 is not pedagogy; it’s a cheat code for short keys.  
2. **HIGH** Prod study = flip + self-grade only (`p2-study-no-typed-on-prod.png`).  
3. **HIGH** Passive catalog (Listen/Podcast/Narrative/Compress/Battles): mostly **FEELS** / **HARM** (games as productivity theater) vs loop’s **LEARNS**.  
4. **MED** Miss→cards path exists in narrative but weakness-first is not a coherent cross-surface “failed tonight” experience.  
5. **MED** Dashboard “1 card due” is actionable (good); flooded with 84 junk notes from rate-limit probe → briefing becomes noise.  
6. **MED** Nova grounding not live-pressure-tested this round (AI burn avoided) — treat as **unknown / assume soft**.  
7. **HIGH** 90-day mark lift: **insufficient evidence**. Mechanisms that *could* work (typed retrieval + timed mocks + Again-only restudy) are incomplete/undeployed/gameable.  
8. **MC dial:** Prod Simulator 20q → **14 MC + 6 SA** (still 70/30). Local code 50/50 not live.

### P3 — Teen Who Ruins Apps — **4/10**

1. **CRITICAL** Cannot pay $7 (`p3-pricing-phase3-still.png`).  
2. **HIGH** Time-to-aha: landing hero ~5–10s (good); signed-in aha blocked by onboarding modal.  
3. **MED** Lazy path: palette works; can skip reading; rate-limit spam notes = chaos.  
4. **CRINGE** “Who are you studying as?” + maple leaf; “study smarter, not longer”; “Nova AI Tutor” hide chip.  
5. **CHARMING** “Configure the simulation.” / “Recognition practice”.  
6. **INVISIBLE** Most sidebar tools.  
7. **HIGH** ChatGPT wins lazy homework; Kyvex wins only if photo→mock continuity is frictionless — Inbox not walked with real photo this round.  
8. **HIGH** No group-chat screenshot moment in 30 minutes of signed-in prod. Would not pay yet.

### P4 — Competitor Analyst — **4/10**

1. **FIXED** Correct prod URL (R1 #1).  
2. **HIGH** Still no set network.  
3. **HIGH** Knowt free destroys $6.99 unless Ontario moat is *felt* in first session.  
4. **MED** Quizlet Plus metering teaches conversion; Kyvex has no live meter.  
5. **HIGH** Board-approved AI tools are the silent competitor.  
6. **MED** Capture stitch / typed retrieval unique *if deployed*.  
7. **Kill-shots:** Quizlet class sets; Knowt free; Anki honesty meme; ChatGPT habit.

### P5 — Accessibility — **5/10**

1. **MED** Palette: Escape works; dialog semantics PARTIAL on prod.  
2. **HIGH** Onboarding dialog not easily dismissible; traps exploration.  
3. **HIGH** Contrast: dark muted labels on flashcards (visual).  
4. **MED** Touch: bottom nav + mock dials collide at ~390px (`p2` mock shot).  
5. **MED** Color-only risk: lime = selected / due; need non-color semantics (often present via text).  
6. **LOW** Streaming Nova SR behavior untested.  
7. **MED** Keyboard money path not fully completed (study open; mock not ignited).  
8. Violation table (sample): contrast dark muted text; onboarding focus trap; clipped focus cards; Exam Predictor link without disabled state clarity.

### P6 — Security & Privacy — **5/10** (+3 vs R1)

1. **Resolved** R1 IDORs / unauth AI / diag / middleware (live).  
2. **HIGH** Adaptive-notes PATCH ownership gap (code; live 500 without row).  
3. **HIGH** Achievements client-key unlock (code audit).  
4. **MED** GET flood unrestricted.  
5. **MED** Rate limits in-memory only.  
6. **PASS** Mass-assign role/plan/isAdmin/email ignored on settings.  
7. **PASS** Privacy page subprocessors + minors posture.  
8. **MED** Captures/images URL guessability not fully probed.  
9. Ranked vulns: (1) adaptive-notes ownership (2) achievements forge (3) GET DoS (4) peer-review product brokenness (5) deploy of security without product honesty.

### P7 — Performance — **4/10**

1. Prod `/` warm: 306–1630ms; HTML ~75KB (better than R1’s 196KB claim).  
2. Local cold `/`: **28758ms**.  
3. `/api/health` db latencyMs **768**.  
4. Lighthouse: **failed** (no Chrome for launcher).  
5. Money-path feel: onboarding + note list of 84 items = density pain.  
6. Capture stitch / N+1 Prisma: not instrumented live.  
7. Bottleneck rank: (1) local cold (2) Neon cold (3) sidebar weight (4) framer remnants on non-landing (code).

### P8 — Ontario Teacher — **5/10**

1. Moat Organic=B **code fixed**; prod curriculum page not fully walked.  
2. **HIGH** Integrity: mock generator + capture during tests = cheating vector. Policy line needed: *“Kyvex may be used for homework study and teacher-directed review; not during supervised assessments unless explicitly allowed.”*  
3. **HIGH** Boards approve Gemini/Copilot — Kyvex absent → department head forward unlikely.  
4. **MED** Essay grader formative quality not live-tested.  
5. **MED** SCH4U Unit C teach simulation: students would open Battles / Listen more than typed retrieval (undeployed).  
6. **Would forward?** Not yet — need integrity policy + approved-tool path + deploy.  
7. Missing one thing: **teacher classroom set / roster**, not another student toy.

### P9 — Parent — **4/10**

1. Privacy readable; still hesitant on Groq prompts + wellness + PostHog.  
2. **HIGH** No evidence marks move; no parent share.  
3. **MED** Decay/streaks/habits = mild guilt patterns.  
4. **CRITICAL** Cannot pay → trust stack dies at pricing.  
5. Landing → privacy trust OK; pricing → signup trust dips.  
6. Under-18 framing helps.  
7. Would fund $7? **Not without results proof + checkout.**

### P10 — Founder’s Ghost — **3/10** *(verbatim answers)*

See §7.

---

## 7. THE FOUNDER’S GHOST

**Over-built:** Battle Royale, Crossover, Concept Collision, Narrative Memory, Micro-Lessons, Exam Predictor, Achievements forge, wellness gates — surfaces nobody finishes before the loop is habitual. Evidence: sidebar length + landing zoo on prod + empty peer-review lists.

**Under-built:** Shareable class decks + live checkout + deploy pipeline that ships what `main` claims. Also: ungameable retrieval grading.

**Breaks first at 100 concurrent:** Neon cold starts + in-memory rate limits (each instance resets) + Groq 30/min per user stampeded by a class period.

**Polish ≠ progress:** Paper landing + kv chips while prod still sells 28 tools and Phase 3 pricing.

**Only three fixes before beta:** (1) Deploy current `main` to prod. (2) Stripe checkout that actually charges. (3) Kill or hide non-loop sidebar defaults; ship ungameable typed mode.

**Riskiest assumption:** *“Students will photograph homework into Inbox instead of pasting into ChatGPT — and teachers won’t ban the AI.”*

**Obituary (failed):** Kyvex died of a beautiful landing and a directory of unfinished tools, while Knowt stayed free and ChatGPT stayed open, and the founder never shipped billing or class sharing.

**Victory speech (worked):** We won because the loop was inevitable — photo, notes, cards, timed mock, Nova on the miss — deployed the same day we claimed it, charged $7 for more volume, and made retrieval honest enough that marks moved.

---

## 8. What would make this a 10 (one paragraph each)

**P1:** One design system on every authenticated route, light+dark, 390px, no emoji education tiles, sidebar ≤8 items.  
**P2:** Relative fuzzy threshold, forced typed mode default, miss→relearn closed loop, kill FEELS games from default nav.  
**P3:** Checkout live, one proud share card after first mock, zero cringe.  
**P4:** Public decks + class codes beating Quizlet’s Ontario gap.  
**P5:** Full AA with measured contrast, 44px touch, SR-verified streaming.  
**P6:** Zero ownership gaps, durable rate limits, minors DPA with Groq.  
**P7:** p95 TTI <2s cold on prod routes; Lighthouse greens.  
**P8:** Board-approved path + integrity policy + teacher roster.  
**P9:** Parent progress link + readable privacy + real $7 value proof.  
**P10:** Ship discipline: claim = deploy = charge.

---

## 9. THE BETA GATE LIST (must ship before one real student)

1. **Deploy** current security + craft + product sprints to `studyforge-nu.vercel.app` (LOOP, typed mode, 50/50 dial, palette a11y).  
2. **Stripe checkout** live OR remove all paid language / Phase 3 theater.  
3. **Default nav = the five loop tools**; everything else behind Settings/catalog.  
4. **Fix typed grader** (length-relative threshold; reject ≤2-char absolute cheats).  
5. **Close adaptive-notes ownership** + **server-side achievements**.  
6. **Remove/disable Exam Predictor** from signed-in chrome.  
7. **Teacher integrity one-pager** + parent export/share path.  
8. **Durable rate limits** (not memory-only) + GET abuse controls.  
9. **Prove** money path on prod with a real photo→mock→Nova in <10 minutes.  
10. **Privacy vs PostHog/Groq** still true after any analytics change.

---

## Appendix — Hostile typed grader results (local unit)

| Guess | Expected | Result |
|-------|----------|--------|
| `Na` | `K` | **correct** (dist 2) — GAME |
| `ab` | `xy` | **correct** (dist 2) — GAME |
| `a` | `bcd` | incorrect |
| `` | `Hi` | incorrect |
| `mitochondria` | `Mitochondria!!!` | exact correct |
| `photosynthesis` | `photosyntesis` | correct + spelling |
| `H2O` | `H₂O` | exact (NFKD) |
| `🙂` | `smile` | incorrect |
| `cat` | `car` | correct + spelling |

---

**End of Round 2. The mirror, not the makeover.**
