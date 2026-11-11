# VoiceWorld AI — v1.4 (Web build, 2026-11-11)

Live: https://voiceworld-ai.pages.dev/
- Landing: https://voiceworld-ai.pages.dev/
- User App: https://voiceworld-ai.pages.dev/app/
- Admin Panel (separate, not linked publicly): https://voiceworld-ai.pages.dev/admin/
  - Admin login: Firebase Auth, ONLY branjandharua7@gmail.com (Email/Password — create that account in the Firebase console if not already created). The old demo password admin123 is REMOVED. Gate is demo-grade (client-side email check) until custom claims + Firestore rules are added.

Source: ~/workspace/voiceworld-ai/final-deploy/ (landing index.html, app/index.html, admin/index.html, assets/asset1-10.svg)
Docs: docs/USER_APP_PHASE_GATE.md, docs/ADMIN_DELIVERY.md
Deploy: python3 ~/workspace/voiceworld-ai/deploy.py (Cloudflare Pages project 'voiceworld-ai', wrangler)

## What is REAL in this build
- **Firebase Auth (project voiceworld-ai, added 2026-11-11):** Google Sign-In (popup + redirect fallback), email signup (with verification email), email login, password-reset email, logout, account deletion, persistent sessions via onAuthStateChanged. Firestore `users/{uid}` doc created/updated on login. If Firebase cannot load (offline/CDN blocked), a clearly-labelled "Demo mode — not a real account" local sign-in is offered instead — never silently faked.
- **AdMob TEST IDs (official Google test IDs, added 2026-11-11):** Test App ID ca-app-pub-3940256099942544~3347511713, Test Rewarded unit ca-app-pub-3940256099942544/5224354917 — defaults in vw_settings + prefilled in Admin (test IDs appear ONLY in Admin, never in the User App or landing page). Rewarded tiers show a minimal reward screen with a "▶ Watch Ad to Unlock" button + small TEST badge (no paragraphs, no IDs); the button grants ONE single-use test entitlement for ONE generation (deleted after use; next generation needs a fresh ad), recorded as TEST in vw_jobs/vw_audit_log. The button is hidden/disabled entirely when AdMob mode is 'production'. A real rewarded video ad can only play inside the native Android app (AdMob SDK) — this web build never shows one. NEVER test with real AdMob IDs.
- **TEST banner ads on the WEBSITE only (added 2026-11-11):** two test banner slots on the landing page — one under the hero, one before the footer (728×90 desktop / 320×50 mobile) — using Google's official TEST banner unit ca-app-pub-3940256099942544/6300978111, labelled "Test Ad" with the honest "no real ad, earns nothing" line. Controlled from Admin → Tiers & Ads (enabled toggle + unit ID field). Video/rewarded ads stay in the User App ONLY — no banner in the app. A real web banner needs an approved AdSense/AdMob account; until then the slots show the TEST placeholder. `bannerEnabled=false` hides both slots; `mode='production'` never renders the test ID (shows "Banner not configured" instead).
- Landing page with 10 original SVG assets, sticky header, Share App, FAQ, tiers.
- **Server TTS backend — REAL MP3 generation + download (added 2026-11-11, v1.4):** Cloudflare Worker test backend https://voiceworld-tts-test.branjandharua7.workers.dev — `POST /api/tts {text, voice, rate, pitch}` → audio/mpeg (Edge TTS, free). Generate now synthesises the SELECTED registry voice's Edge voice (e.g. hi-IN-MadhurNeural) as a real MP3 — chunked sentence-aware at ≤10,000 chars/request (worker limit 20,000, never approached), MP3 frames concatenated into one Blob, played in a native audio player with Play/Pause/seek + Stop. History Play re-generates via the same backend; Download saves the real `<title>.mp3`. Library still stores metadata only (no audio bytes in localStorage, max 30). If the backend is unreachable, playback falls back to the device voice with an honest toast — never a fake success. Firebase ID token is sent in the POST body (`idToken`) — NOT as an `Authorization` header, because the test worker's CORS only allows `Content-Type` and a Bearer header would fail the browser preflight. **The worker ignores the token today — it MUST verify it + rate-limit + allow the Authorization header before production.**
- User App: TTS Studio with server MP3 generation in the selected Edge voice (device speechSynthesis only as fallback), 28 languages listed (+ admin-added languages merged in), preset voices with preview (uses app/voices.js samples when present, device voices otherwise; admin-added voices merged in, sampled via the server TTS backend when no sample URL is given), strict word tiers enforced (FREE 5,000 words / REWARDED 10,000 / LOCKED 20,000 / 25,000 / 30,000 words "🔒 Coming Soon", admin-unlockable; over-limit text is blocked with "Limit exceeded — shorten your text or choose a higher tier.", single-use reward per rewarded generation), voice-clone reference recording (MediaRecorder, max 180s, consent required), Library capped at latest 30 with auto-delete of oldest + real MP3 download, Profile, Dark/Light theme (vw_theme, shared with landing + admin).
- Admin Panel: Firebase login (owner only), dashboard from real localStorage counts (+ live Firestore `users` collection count), users (count labelled as from `vw_users`), voices/models, Add Voice (name, language, gender, Edge voice ID, optional sample MP3 URL → `vw_voices`), Add Language (name + code → `vw_languages`), tier word limits for all 5 tiers + ad requirement per tier + lock toggles per tier (20000/25000/30000 locked by default, `vw_settings.tierLocks`), AdMob settings, landing/APK settings, jobs, audit log. Admin changes to vw_settings / vw_voices / vw_languages are read by the User App (same origin, localStorage) and every change is written to `vw_audit_log` with admin identity + timestamp. The Admin Panel is NOT reachable from inside the User App (no links, no "Admin" strings in user-facing UI).

## Honestly NOT yet done (per PDF release rule — do not claim live)
- Native Android AdMob SDK + real rewarded video (web build can only simulate a TEST reward)
- **TTS worker auth + rate limiting NOT yet done:** the worker ignores the `idToken` sent in the POST body and has no rate limiting; before production it must verify the Firebase ID token server-side, enforce per-user quotas, and allow the `Authorization` header in CORS (the app will switch to the Bearer header once the worker allows it).
- Server-side custom claims + Firestore security rules (admin gate is client-side email check only — demo-grade)
- Real voice-cloning model (XTTS/Piper/Kokoro not installed; clones are reference profiles)
- FastAPI backend (server-side tier/reward enforcement), signed APK / Play Store, FCM
- Implementation is the PDF's allowed HTML/JS WebView-wrapper path; native Kotlin not built here.

## v1.7 (2026-11-11) — not yet deployed
- My Voice Clones is now its own top-level tab (record/upload/consent/saved clones + "Generate with my clone": pick a clone + language + text + tier). The Voices tab only links to it. No real cloning model — generation uses the clone's closest preset voice (stated on-screen).
- Voices preset list always ends with a "➕ More voices coming soon" card (names the filtered language, e.g. "More Hindi voices coming soon").
- Clone generation is free-tier only by default (5000 + 10000 words); 20000/25000/30000 stay "🔒 Locked" for clones until the admin allows them in Admin → Voices & Languages ("My Voice Clones — tier access", `vw_settings.cloneTiers`, default free/r10 only) AND the tier's own status is Available. Strict Limit-exceeded blocking and the single-use Watch Ad flow apply when the tier needs an ad.
- Harness `/tmp/vw-harness3.js`: 29/29 PASS. Live browser test + deploy still pending (parent).

## v1.6 (2026-11-11) — not yet deployed
- 10,000-word tier is now FREE (no ad); tiers are Free 5000 • Free 10000 • Coming Soon 20000 / 25000 / 30000.
- Per-tier admin status: Available / Coming Soon / Hidden (`vw_settings.tierStatus`); landing tier cards follow the same settings.
- All "test ads" text removed from the user app + landing (test AdMob IDs stay in Admin only).
- Landing banners are now visible house-ad promo banners (content in the HTML, ad-blocker-proof naming); admin can set custom banner title/text/link or disable them.
- Harness `/tmp/vw-harness2.js`: 46/46 PASS. Live browser test + deploy still pending (parent).

## v1.8 (2026-11-11) — not yet deployed
- Generation progress display: bar + `Chunk X of N • Y% • elapsed M:SS • ~Z sec remaining` in the Generate tab and the Clones tab; ETA from measured per-chunk average (stored ms/char rate in `vw_tts_rate`, default 10 ms/char); pre-generation estimate `Estimated generation time: ~X sec` in the estimate line, live as you type; device-voice fallback shows elapsed time only, never a fake percentage.
- Delete fix: clone Delete and Library Delete no longer use native `confirm()` (headless browsers auto-dismiss it, so nothing happened) — now an inline two-step confirm (first click arms `Confirm delete?`, second click within 5 s deletes).
- Harness `/tmp/vw-harness4.js`: 26/26 PASS. Live browser test + deploy still pending (parent).

## v1.9 — Clone cloud persistence (Firestore + IndexedDB), clone-TTS engine hook (not deployed)
- **Firebase Storage is NOT used** (needs a Blaze paid upgrade — not approved). Clone persistence is Firestore-only + IndexedDB: clone metadata + base64 audio (`audioData`, only when <600 KB) in `users/{uid}/clones/{cloneId}`; full audio Blob also in IndexedDB (`voiceworld-clones` DB) as a same-device safety net; large samples save metadata-only with an honest toast. Sign-in merges cloud clones into the local list; delete removes Firestore doc + IndexedDB blob + local entry.
- Clones tab language select shows plain language names (no voice counts); the main Generate tab still shows counts.
- Clone-TTS hook (OFF until an ElevenLabs key is set as the `ELEVENLABS_API_KEY` Worker secret): clones carry `voiceId`; when set and the Worker reports `cloneTts:'configured'`, generation POSTs `/api/clone-tts` and uses the real cloned voice; otherwise it falls back to the closest preset voice with the honest note.
- Harness `/tmp/vw-harness5.js`: 39/39 PASS; worker direct test `/tmp/worker-clone-test.mjs`: 15/15 PASS. Live browser test + deploy still pending (parent).

## v2.0 — My Voice Clones section REMOVED (2026-11-11, user order)
The whole voice-cloning section is gone from the User App, Admin and landing page: no Clones tab, no record/upload/consent UI, no clone generation, no clone tier-access controls, no clone mentions in Privacy/Terms. Reason: the build had no real cloning engine (generation used the closest preset voice), so the user called it useless. The `/api/clone-tts` Worker route still exists but is unused and returns 501 (`cloneTts: not-configured`) with no key. Verification: stub-DOM smoke harness 15/15 PASS (`/tmp/vw-smoke-noclone.js`).

## v2.1 — Admin login REMOVED (2026-11-11, user order)
The Admin Panel now opens directly with no sign-in: login form, access-denied screen, logout button and the Firebase Auth gate are all removed. `enterAdmin()` runs on load. Honest note: anyone with the /admin/ URL can now open the panel — the link itself is the only protection, same as the LifeOS standalone admin file.
