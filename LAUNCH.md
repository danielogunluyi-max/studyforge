# Launch

## Blocker — do not ship publicly until this is done

**Password reset cannot go to students until Resend is a real sender.**

Until a domain is **verified in Resend** and `RESEND_FROM` is set on Vercel Production, reset mail uses `onboarding@resend.dev` and **only delivers to the account owner**. No public launch.

Release-day work (not a code change):

1. Finish DNS for `kyvex.app` (or another owned domain) in Resend until status is Verified.
2. Set `RESEND_FROM=Kyvex <noreply@that-domain>` on Vercel Production (and Preview if you test resets there).
3. Redeploy. Smoke-test a reset to a second inbox.

Ten minutes and about $10/yr whenever you are ready. Nothing in the app code needs to change for this.

## Open — none blocking

Parked here next to the domain so they do not get lost:

- **Vision in Split iframe** — Split loads Nova as `/tutor` (optional `noteId`) inside an iframe. Confirm camera/vision still works at `/tutor?mode=vision` when that URL is the Split pane, not only as a standalone page.
- **1-hour video import** — Run a long YouTube lecture through Inbox marquee import (`POST /api/import/youtube`). `maxDuration` is 60s; captions + Groq may fail or truncate on hour-long videos.
- **Redirects** — In `next.config.js`, the retired ingest URLs 307 with `permanent: false` (`/voice-tutor`, `/dashboard/nova-vision`, `/nova-live`, `/upload`, `/scan`, `/handwriting`, `/youtube-import`, `/audio`, `/lecture`, `/classroom-import`, `/quizlet-import`, `/capture`). Flip to `permanent: true` when you want browsers and crawlers to cache the Inbox/Nova destinations.
