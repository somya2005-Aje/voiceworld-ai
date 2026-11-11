# VoiceWorld AI — User App Phase Gate (Part 1)

Date: 2026-11-11 • Build: v0.1.0 (web build) • Location: `~/workspace/voiceworld-ai/final-deploy/`
Source PDF: `~/workspace/user/files/VoiceWorld_AI_Complete_Prompt_With_Visual_Design_0_n0r0.pdf`

> Implementation disclosure (per PDF §2): native Kotlin/Compose was not buildable in this
> environment, so Part 1 is delivered as a **responsive HTML/CSS/JavaScript app** — the
> explicitly allowed WebView-wrapper path. It is a real working web app, not a static
> prototype. A native Android APK wrapper + AdMob native bridge is still to be built.

## Files delivered

| File | What it is |
|---|---|
| `final-deploy/index.html` | Public landing page (sticky header, hero, features, tiers, languages, samples, how-it-works, 10-asset gallery, FAQ, privacy, footer) |
| `final-deploy/app/index.html` | User app — self-contained (inline CSS + JS, no external dependencies) |
| `final-deploy/assets/asset1-hero.svg` … `asset10-usecases.svg` | 10 distinct original SVG illustrations in the §5 order: 1 hero phone+waveform, 2 cloning mic+shield, 3 multilingual map+bubbles, 4 preset voice cards, 5 TTS editor mockup, 6 audio player, 7 tier comparison 3/5/10, 8 Android device mockup, 9 privacy/security, 10 creator use-cases. Brand palette #6A11CB / #2575FC / #00C9A7 / #FF6B6B, bg #F8FAFF, dark #0B1026. No hotlinked or copyrighted images. |

## Completed screens (all live in `app/index.html`)

Splash → Login/Signup → Home → Generate (TTS Studio) → Voices (Global Library + My Clones)
→ Library → Profile/Settings → Privacy / Terms / Support (in-app). Bottom nav: Home, Generate,
Voices, Library, Profile. Forgot-password (local demo reset), email verification is NOT
claimed (no email is sent in this build — stated in-app).

## What is REAL in this build

- **TTS playback** — real `window.speechSynthesis` speech (free, no server). Language
  selector lists all 28 target languages and **enables only languages with an installed
  browser voice**; others show "not available in this browser". Preset voice cards
  (Aarav, Meera, Arjun, Priya, Emma, Liam, Sofia, Kenji, Aisha, Rohan) show real
  availability + Preview. Speed/pitch controls work. Char/word counters, estimated
  duration (150 wpm), sentence chunking in order, job states Pending → Processing →
  Completed / Failed — no fake countdown.
- **Tiers enforced in JS** — Free up to the `vw_settings.freeMinutes` limit (default 180s).
  5/10-min tiers show the "Watch one rewarded ad to unlock" notice and then honestly
  refuse to generate because AdMob is not connected. No fake timer, close button, or reward.
- **Voice cloning flow** — MediaRecorder microphone recording up to `sampleMax` (default
  180s) with timer + live waveform canvas + playback + re-record; upload WAV/MP3/M4A with
  type validation; consent checkbox is **required** before saving; clones are renameable /
  deletable, stored in `localStorage` (`vw_clones`) with a consent record.
- **Library** — generations auto-save on completion (title, voice, language, duration,
  date) to `vw_library`; play / regenerate / share / delete / search / clear-all all work.
- **Auth (local demo)** — email signup/login with validation, duplicate-account and
  wrong-password errors, logout, password reset, account deletion (wipes local data).
  Session persists in `vw_session`. Profile: display-name edit, dark-theme toggle,
  notifications toggle, app language, Share App, privacy/terms/support.
- **Landing page** — exact hero headline "Turn Your Text Into Natural Human Speech",
  tagline "Your Voice. Every Language. Unlimited Possibilities.", Start Creating → app,
  Share App (Web Share API + Copy Link fallback), sample-audio buttons that really speak,
  FAQ, support, footer. **Download App shows "Coming soon — APK not published yet"**;
  no APK/Play Store link is invented anywhere.
- **Shared settings** — app reads `vw_settings` from localStorage when present
  (`freeMinutes` 180, `rewarded5` 300, `rewarded10` 600, `sampleMax` 180 defaults) and
  enforces those values; this is the contract the Admin Panel writes to.

## What is HONESTLY NOT YET DONE (needs setup / credentials / hosting)

| Item | Status | What is needed |
|---|---|---|
| Firebase project / Google Sign-In | DONE (v1.1, 2026-11-11) | Project `voiceworld-ai`, Email/Password + Google enabled, domain voiceworld-ai.pages.dev. Google popup + redirect fallback, email signup + verification email, login, reset email, logout, account deletion, Firestore `users/{uid}` doc. Demo fallback only if Firebase cannot load, always labelled. |
| Email verification / real password-reset email | DONE (v1.1) | Firebase Auth sends both; Profile shows verification state. |
| AdMob rewarded ads + server verification | TEST IDs only (v1.1) | Official Google test App ID `ca-app-pub-3940256099942544~3347511713`, test Rewarded unit `ca-app-pub-3940256099942544/5224354917`. 5/10-min tiers testable via a labelled TEST reward simulation (single-use, 10-min). Real rewarded video + server verification need the native Android AdMob SDK + backend — until then, never use a real AdMob ID for testing. |
| Real voice-cloning model (XTTS / Piper / Kokoro) | NOT installed | GPU/CPU inference host + model files + licenses; clones are currently labelled reference profiles and generation uses the closest preset voice |
| FastAPI backend / Firestore / Storage | NOT built | Backend hosting, Firebase Admin SDK, Firestore rules, signed-URL storage |
| MP3/WAV export of generated audio | NOT available | Server TTS + FFmpeg (browser speech engine cannot export audio files); stated in-app and in FAQ |
| Signed Android APK / Play Store listing | NOT built | Android signing key + release build env (or WebView wrapper build); Download button stays "Coming soon" until a real APK URL exists |
| Push notifications (FCM) | NOT done | Firebase Cloud Messaging setup |

## Test results (actually run 2026-11-11)

1. `node --check` on the extracted `<script>` of both pages — **PASS** (both files).
2. All 10 SVGs parse as well-formed XML (`xml.etree`) — **PASS**.
3. Every asset referenced by `index.html` exists on disk (10/10) — **PASS**.
4. Static handler audit of `app/index.html`: all 36 `onclick`/`onchange`/`oninput`
   handlers resolve to defined functions (66 functions total); every `$('…')` id exists
   in the HTML — **PASS, zero undefined handlers / missing ids**.
5. Local HTTP serve + curl: landing 200 (21,512 B), app 200 (45,491 B),
   `assets/asset1-hero.svg` 200; hero headline present; "Continue with Google" present — **PASS**.
6. Fake-claim grep (firebase/admob/apk/play-store/mp3-download claims) — only honest
   "not connected / coming soon / setup required" statements found — **PASS**.
7. NOT run (no live browser in this environment): microphone recording, speechSynthesis
   voices on a real device, Web Share on mobile. These need a browser re-test by the
   parent agent before any public claim about device behaviour.

## Phase-gate verdict

Part 1 (User App + landing page) is **complete as a working web build** with the honest
limitations above. Admin Panel (Part 2) may proceed against the same `vw_settings` /
`vw_*` localStorage contract; the backend/Firebase/AdMob/APK items above remain open
and must not be claimed as done until actually built and tested.

## UPDATE 2026-11-11 — Firebase Auth + AdMob TEST IDs integrated (v1.1)

Firebase project **VoiceWorld AI (voiceworld-ai)**, account branjandharua7@gmail.com,
Spark plan, Analytics OFF. Email/Password + Google enabled; authorized domain
voiceworld-ai.pages.dev; Firestore (default) in asia-south1, production mode.
Config embedded in `app/index.html` (public client config, Firebase compat SDK 10.12.2).

Now REAL: **Google Sign-In** (`signInWithPopup`, redirect fallback if popup blocked),
**email signup** (`createUserWithEmailAndPassword` + `sendEmailVerification`),
**email login**, **forgot password** (`sendPasswordResetEmail`), **logout**,
**account deletion** (Firebase user + Firestore `users/{uid}` doc), persistent sessions
via `onAuthStateChanged`, Profile shows real display name/email/photo + verification
state. First login creates/updates Firestore `users/{uid}`
`{email, displayName, provider, createdAt, updatedAt}`. Clear error messages for
wrong password / existing account / cancelled popup / network failure. If Firebase
fails to load (offline/CDN blocked) the app shows an honest error and falls back to a
clearly-labelled **"Demo mode — not a real account"** local sign-in only — never
silently pretending demo is Firebase. Local demo auth code is kept as that fallback.

AdMob: official Google **TEST IDs only** — App ID
`ca-app-pub-3940256099942544~3347511713`, Rewarded unit
`ca-app-pub-3940256099942544/5224354917` — defaults in `vw_settings` (`admobAppId`,
`admobRewardedUnitId`, `admobMode='test'`). 5/10-min tiers show a TEST MODE screen
(stating a real rewarded video plays only in the native Android app) with ONE
**"Simulate test reward (TEST ONLY)"** button granting a single-use, 10-minute
entitlement (`vw_reward_entitlements`), recorded as TEST in `vw_jobs` +
`vw_audit_log`. No fake countdown, no auto-grant. When `admobMode` is ever set to
`'production'`, the simulation button is hidden/disabled entirely. No AdMob account
was created, no real AdMob ID was used, Analytics was not enabled.

`settings()` now reads BOTH shapes (`freeMinutes`/`freeSeconds`,
`rewarded5`/`rewardedSeconds`, `rewarded10`/`extendedSeconds`,
`sampleMax`/`sampleMaxSeconds`, `admob.*`) so Admin-saved values keep working.

Tests run 2026-11-11: `node --check` on both extracted inline scripts — **PASS**;
grep `admin123` in app+admin — **0 matches**; firebaseConfig apiKey/projectId present
in both files — **PASS**; redeployed to Cloudflare Pages (`voiceworld-ai`) and
curl-verified 200 on `/`, `/app/`, `/admin/` with Firebase SDK + test-reward UI
present in the live HTML — **PASS**. **NOT run (needs a live browser):** actual
Google popup sign-in, email verification delivery, Firestore user-doc write, and the
test-reward → generate flow end-to-end. Parent must browser-test these before
claiming them verified.

## UPDATE 2026-11-11 — Word tiers + Library-30 + Download + Dark/Light theme (v1.2)

- **Word tiers replace minutes tiers everywhere** (app, admin, landing): FREE **5,000 words** (no ad), REWARDED **10,000 words** (one completed rewarded ad / test reward per generation), EXTENDED REWARDED **20,000 words** (one per generation). Word count = `trim().split(/\s+/)`. Live word counter + words-vs-limit bar in the TTS Studio; ≤5000 free, 5001–10000 rewarded, 10001–20000 extended rewarded, >20000 rejected with a "shorten the text" message. Admin keys: `freeWords=5000, rewardedWords=10000, extendedWords=20000` (old minute/second keys still read as fallback, converted at 150 wpm).
- **Entitlement is single-use per generation**: a test/ad reward unlocks exactly ONE generation and is DELETED after use — the next new generation at 10,000/20,000 words needs a fresh ad. Stated in the UI.
- **TEST MODE card** keeps the honest screen and now starts with the Hindi line: "Ye error nahi hai — web browser mein asli AdMob video ad nahi chal sakta; asli ad sirf Android app mein chalega." Test IDs still shown; "Simulate test reward (TEST ONLY)" unchanged.
- **Preview hook**: app loads `app/voices.js` and preset Preview calls `window.VW_playSample(voiceId)` when `window.VW_VOICES` exists, falling back to the device-voice preview otherwise. Voice-card gender comes from the registry when available.
- **Library capped at 30**: every save trims the oldest items; Library shows "Showing latest 30 — older ones are removed automatically". Each item: Play, Regenerate, Share, **Download**, Delete. Each item stores `words`.
- **Download**: tries `POST {text, voice, lang, words}` to `vw_settings.ttsBackendUrl + '/api/tts'` (admin-editable; default same-origin `/api/tts`) and downloads `<title>.mp3` only when the backend returns audio. With no backend (current state) it shows the honest message "MP3 download ke liye server TTS backend chahiye — abhi setup mein hai" and downloads the script as a `.txt` file instead. Never a fake MP3.
- **Theme**: proper Dark/Light toggle persisted in `vw_theme` (default Light), shared across landing + app + admin; `dark` class + CSS variables recolour every screen. Toggle in the app topbar + Profile Settings, the admin topbar, and the landing header. UI made more colourful + professional (gradient headings, coloured card accents, gradient primary buttons only).
- **Verification (2026-11-11)**: `node --check` on all three inline scripts — PASS. Grep: no minutes-based tier text remains in user-facing tier UI. **Not deployed** (per task instruction) — parent must deploy + browser-test.

## v1.2 + v1.3 update (2026-11-11 ~06:07 IST, deployed 744412ba)
- Words tiers: FREE 5000 words, rewarded 10000, extended 20000; single-use entitlement per generation.
- 85 Edge TTS voices (41M/44F, 28 languages) with distinct MP3 samples; only English (US) has full 10; most languages 2 (1M+1F); Odia 0.
- History capped at 30 (FIFO auto-delete); download tries /api/tts backend, else honest message + .txt.
- Dark/Light theme (vw_theme) across landing/app/admin.
- Landing banner test slots (Test Ad, unit ca-app-pub-3940256099942544/6300978111); app stays video-only.
- TTS server backend spike still running at deploy time; MP3 download not yet live.

## FIX 2026-11-11 ~06:12 IST — Voices tab registry wiring + 450-word limit bug (NOT deployed yet)

Live browser test on the v1.2/v1.3 deploy (744412ba) found 2 real bugs; both fixed in `final-deploy/app/index.html` (+ a small admin change). No deploy done per task.

### BUG 1 — Voices tab ignored the 85-voice registry (root cause)
- `renderPresets()` rendered the hardcoded `PRESETS` array (10 names: Aarav, Meera, Arjun, Priya, Emma, Liam, Sofia, Kenji, Aisha, Rohan). It only consulted `window.VW_VOICES` to override a card's gender, and showed a ▶ Preview button ONLY when the device had a matching `speechSynthesis` voice (`voiceFor(p.lang)`); `pickPreset()` toasted "unavailable — no hi-IN voice installed" when the device had none. On the headless test browser (zero device voices) every card was stamped "Unavailable in this browser" with no Preview button, and Madhur/Swara never appeared — even though `voices.js` (85 voices + MP3 samples) was already loaded.
- FIX (`app/index.html`): `PRESETS`, `pickPreset`, `previewPreset`, `vwSampleIdFor`, `vwRegistryFor` deleted. The Voices tab now renders from `registryVoices()` = `window.VW_VOICES`, with `ensureRegistry()` fetching `../assets/voices.json` as fallback if `voices.js` failed to load. Language + Male/Female/All filter dropdowns, a "Showing X of 85 voices" count, and every card shows displayName, language, registry gender badge, a working ▶ Play sample button (`window.VW_playSample(voiceId)`, with an `Audio`-element fallback) and a Use this voice button. Cards are NEVER disabled for lack of a device voice — samples are MP3s and play anywhere. `populateLang()` no longer disables languages without a device voice (labels show the registry voice count per language); `populateVoice()` lists registry voices for the chosen language (gender-labelled) with device voices only as fallback. `generate()` now requires a registry voice OR a device voice and speaks via the device voice (or default) — it no longer fails when the device has no voice for the language. `previewVoice()`, `renderHomeVoices()` and `regenLib()` (restores the stored registry `voiceId`) updated the same way.
- Note: "Emma" in the new list is a REAL registry voice (en-US-EmmaNeural), not the old hardcoded preset.

### BUG 2 — Free limit enforced as 450 words while buttons said 5,000 (root cause)
- `settings()` fell back to the OLD minute keys when `freeWords` was absent: `freeWords = s.freeWords ?? round(s.freeMinutes*150)`. The live browser's stored `vw_settings` (seeded by the pre-words v1 build) still had `freeMinutes:3` and no `freeWords`, so the enforced limit was 3×150 = 450 words — while every label said 5,000. The admin panel also kept the stale keys alive: `fillTiers()` fell back to `freeSeconds`, and the tiers save wrote `freeSeconds/rewardedSeconds/extendedSeconds` back in sync.
- FIX: `settings()` in `app/index.html` now reads ONLY `freeWords/rewardedWords/extendedWords` (validated positive numbers, defaults 5000/10000/20000). A `migrateWordSettings()` IIFE runs on load: it fills in missing word values and DELETES `freeMinutes/freeSeconds/rewarded5/rewardedSeconds/rewarded10/rewardedSeconds` from stored settings. Admin `fillTiers()` fallbacks removed (plain 5000/10000/20000 defaults) and the tiers save now deletes the stale second/minute keys instead of writing them. Generate, tier buttons and Profile all read the same `tierLimit()`/`settings()`, so they can no longer disagree.

### Verification (actually run 2026-11-11)
- `node --check` on the extracted app + admin inline scripts — PASS.
- Node harness (stubbed DOM/localStorage, seeded with the stale `{freeMinutes:3, freeSeconds:180, ...}` settings, ZERO device voices): **26 passed, 0 failed** — `settings().freeWords==5000`, `tierLimit()` 5000/10000/20000, migration deletes all minute/second keys, Voices tab renders 85 cards each with Play sample + Use this voice, no "Unavailable" text, no old preset names, Hindi filter = exactly Madhur+Swara, Female filter = 44, Generate voice selector lists Madhur/Swara for hi-IN, `pickRegistryVoice('hi-in-swara')` and `generate()` succeed with no device voice.
- Local HTTP serve + curl: `/app/`, `/app/voices.js`, `/assets/voices.json`, `/assets/voice-samples/hi-in-madhur.mp3`, `/admin/` — all 200. Grep: 0 occurrences of `PRESETS`/`pickPreset`/`previewPreset`/`vwSampleIdFor`/`vwRegistryFor` and 0 of "450 words" in app + admin.

### Next live browser test must check
1. Voices tab shows all 85 voices with working Play sample buttons (Madhur male / Swara female sound DIFFERENT), filters work, "Use this voice" selects it in Generate.
2. Generate with a short Hindi text: tier note reads "Tier limit: 5,000 words (Free)" and "Within this tier" (never 450); Profile shows "Free 5,000 words".
3. With a stored `vw_settings` containing old minute keys, the app migrates on load (limit stays 5000).
4. Theme toggle + word tiers + history-30 still behave as in v1.2.

## UPDATE 2026-11-11 — Server TTS backend wired in: Generate produces REAL MP3 (v1.4, NOT deployed yet)

- **Backend (already live + verified by the spike, not redeployed here):** Cloudflare Worker `https://voiceworld-tts-test.branjandharua7.workers.dev` — `POST /api/tts {text, voice, rate, pitch}` → `audio/mpeg` MP3 (Edge TTS, free). Max 20000 chars/request; rate like `+0%`/`-12%`, pitch like `+0Hz`/`-6Hz`. No auth on the endpoint yet.
- **What changed (`final-deploy/app/index.html` only, + admin settings field default):**
  - `settings().ttsBackendUrl` now defaults to the worker URL (seeded by the migration IIFE when missing); Admin → Tiers & Ads "Server TTS backend URL" field shows the same default and saves it.
  - **Generate flow:** after the existing word-tier/entitlement checks pass (unchanged: 5000/10000/20000 words, single-use entitlement per rewarded generation), Generate calls the backend with the SELECTED registry voice's `edgeVoice` (e.g. `hi-IN-MadhurNeural`). Text is chunked sentence-aware at ≤10000 chars (`chunkTextForTTS`, never splits mid-sentence unless one sentence exceeds the cap, then hard-splits on word boundaries); each chunk is POSTed sequentially with `rate`/`pitch` converted from the sliders (`ratePct`: 1.2→`+20%`; `pitchHz`: 1.2→`+4Hz`); the MP3 ArrayBuffers are concatenated into one Blob (MP3 frame concat plays as one stream) and played in a native `<audio controls>` player (Play/Pause/seek + Stop). Real job states: `Generating chunk n/N (server MP3)…` → `Completed (server MP3, N chunks)`.
  - **Library:** saves metadata only (`{text, voiceId, edgeVoice, lang, words, date}` — audio bytes are NEVER stored in localStorage). History Play re-generates via the same backend call with a `Regenerating audio…` state; History Download re-fetches the same way and downloads `<title>.mp3`. `downloadResult()` downloads the in-memory MP3 directly when the current result already has one. `saveResult()` strips `audioBlob`/`audioUrl` before persisting (blob URLs die on reload).
  - **Fallback (honest, never fake):** if the backend is unreachable or returns an error/non-audio, Generate falls back to the existing device `speechSynthesis` flow with the toast `Server TTS unavailable — playing with device voice instead`. Download with no backend/resolvable voice falls back to the `.txt` script download with the honest message. Preview (`VW_playSample` MP3 samples) untouched. Quick "Play now" on Home also tries the backend first (en-IN registry voice), then device voice.
- **Auth deviation — read this before production:** the app sends the Firebase ID token in the POST **body** as `idToken`, NOT as an `Authorization: Bearer` header. Reason (verified by reading the worker): the test worker's CORS `Access-Control-Allow-Headers` is only `Content-Type`, so a Bearer header would fail the browser preflight and no audio would ever play in a real browser. The worker ignores `idToken` today. **Before production the worker MUST verify the token server-side, add rate limiting, and allow the `Authorization` header in CORS — then the app should switch to the Bearer header.** This is documented in the code comment above `synthesizeChunk` and in the README.
- **Verification (actually run 2026-11-11):**
  - `node --check` on the extracted app + admin inline scripts — **PASS**.
  - **Node harness (`/tmp/harness.mjs`) calling the LIVE backend with the REAL shipped functions** (extracted `chunkTextForTTS`/`ratePct`/`pitchHz`/`synthesizeToBlob` from `app/index.html` and eval'd): 2340-word / 12059-char Hindi text → 2 chunks, request sizes 9915 + 2143 chars (every request ≤10000, none near the 20000 limit), concatenated MP3 6,275,952 bytes, **ffprobe duration 1045.99s, volumedetect mean −16.0 dB** (audible). English chunk with rate `+20%` / pitch `+4Hz` (en-US-AriaNeural) → 37,728 bytes, mean −22.2 dB. 17/18 harness checks passed on the first run.
  - **One real bug found by the harness and FIXED:** the chunker's hard-split of a single over-long sentence never split a single over-long *word* (25001-char word stayed whole → would have hit the worker's 400). Fixed by slicing over-long words at 10000 chars; re-tested with a dedicated chunker test: 25001-char word → 3 pieces, max 10000 — **PASS**. `node --check` re-run after the fix — **PASS**.
  - Local HTTP serve + curl: `/app/` 200 (72,303 B), `/admin/` 200 (85,468 B), `/app/voices.js` 200; backend URL present in live app HTML (default constant) and admin HTML (label + default value).
  - **Not deployed** (per task instruction) — parent must deploy + browser-test.

### Next live browser test must check
1. Generate with a short Hindi text in Madhur's voice: job states show `Generating chunk 1 of 1 (server MP3)…` → Completed, audio plays in the selected voice (NOT the device voice), seek bar works, Stop works.
2. Generate with a long text (>10000 chars): multiple `Generating chunk n/N` states, one continuous MP3 plays to the end.
3. Download from the result box saves a real playable `<title>.mp3`; Library Play re-generates and plays; Library Download saves the MP3.
4. With the backend unreachable (e.g. offline): Generate falls back to device voice with the honest toast, and Download offers the `.txt` file — never a fake MP3.
5. Rewarded tiers still gate before any backend call (5,000/10,000/20,000 words, single-use entitlement per generation).

## UPDATE 2026-11-11 — Minimal UI, strict word limits, locked tiers (v1.5, not deployed)

- **Long texts REMOVED from all user-facing UI** (app + landing): the three listed paragraphs are gone — "Each rewarded generation needs one completed ad / test reward…", "TEST MODE — AdMob test IDs are configured (ca-app-pub-…/5224354917)…", "Text is generated on the server (Edge TTS) as a real MP3…". No AdMob test ID appears anywhere in the User App or landing page (grep `ca-app-pub-` = 0 in both; test IDs stay visible ONLY in Admin). The rewarded flow is now minimal: tier cards + one button "▶ Watch Ad to Unlock" with a small TEST badge. Behaviour unchanged (test simulation granting one single-use entitlement in this web build; real video ad only in the native Android app). The one-line Hindi note is kept on the reward screen: "Ye error nahi hai — web browser mein asli AdMob video ad nahi chal sakta; asli ad sirf Android app mein chalega."
- **Separation check:** grep for `/admin/` and "Admin" in `app/index.html` — 0 matches in visible UI (the only remaining lowercase `admin` is the `admin:` object key in the audit-log write inside `simulateTestReward()` — code, not a visible string). Admin panel keeps its links to Landing/User App.
- **Strict word limits + locked tiers (app, admin, landing agree):** FREE 5000 words (no ad) • REWARDED 10000 words (one ad per generation) • LOCKED 20000 / 25000 / 30000 words ("🔒 Coming Soon", DISABLED, not selectable). Over-limit text is BLOCKED in `generate()` with the short error "Limit exceeded — shorten your text or choose a higher tier." (no generation, no partial audio); the word counter shows "X / <limit> words" for the selected tier; `quickSpeak` also respects the free limit. Locks live in `vw_settings.tierLocks` — default `{r10:false, r20:true, r25:true, r30:true}` and the numeric-string form `{'20000':true, '25000':true, '30000':true}` (both key shapes are written by Admin and read by the app, numeric key wins when present; missing flag defaults to locked=true for 20000/25000/30000, locked=false for 5000/10000). When admin unlocks a tier it becomes selectable and works with the same rewarded-ad flow as the 10000 tier. Admin can edit every tier's word limit (`freeWords`, `rewardedWords`, `tier20000Words`, `tier25000Words`, `tier30000Words`) and the ad requirement per tier (`tierAd`). Landing tiers section matches exactly (5000 Free, 10000 Rewarded, 20000/25000/30000 🔒 Coming Soon); the landing banner test-unit constant was removed (slots keep the "Test Ad" badge without the ID).
- **Admin-added voices/languages merge into the User App:** Admin → Add Voice (display name, language, gender, Edge voice ID, optional sample MP3 URL) saves to `vw_voices`; the User App Voices tab renders them merged with `window.VW_VOICES` (deduped by `edgeVoice`). A custom voice with no sample URL previews by generating a short sample through the existing TTS backend (fixed sentence per language, `sampleSentenceFor()`). Admin → Add Language (name + code, e.g. Odia / or-IN) saves to `vw_languages`; the User App Generate language selector and Voices language filter merge these in (`allLangs()`).
- **Verification (2026-11-11):** `node --check` on all three inline scripts — PASS. Greps: 3 removed texts = 0 in app + landing; `ca-app-pub-` = 0 in app + landing (8 in admin, allowed); "Admin" = 0 in user-facing app UI; `/admin/` = 0 in app. Local HTTP serve + curl: `/` 200, `/app/` 200, `/admin/` 200. Node harness (`/tmp/vw-harness.js`, stubbed DOM/localStorage, running the REAL extracted app script) — **24/24 PASS**: 5001 words on Free rejected with "Limit exceeded…"; 10000 words on the 10000 tier reaches the backend; locked 20000 not selectable via `pickTier` and blocked in `generate()`; after `vw_settings.tierLocks['20000']=false` the tier becomes selectable; admin-added voice + Odia language appear in the merged lists; reward screen shows "Watch Ad to Unlock" + TEST badge, no ID, no long paragraph; TEST reward grants the entitlement and generation proceeds; admin-edited `freeWords=100` honoured. **Not deployed** (per task instruction) — parent must deploy + browser-test.
- **Still needs a live browser test (parent):** tier cards render + locked cards disabled on a real load; unlock a tier in Admin → User App shows it selectable on next load; Add Voice/Add Language round-trip in the real browser; reward screen button + TEST badge visually; generate 5001 words on Free shows the short error in the UI.
- **Known stale lines left untouched (out of this task's file scope):** landing footer still says "server TTS: setup required" and the landing FAQ "Can I download my audio as MP3?" still says playback uses the browser's speech engine — both predate the v1.4 backend wiring and should be fixed in a landing-copy pass.

## v1.6 update (2026-11-11) — 10,000-word tier free, no test-ads text, per-tier status, house-ad banners
- **10,000-word tier is now FREE (no ad):** default `tierAd.r10 = false`. Tiers are FREE 5000 • FREE 10000 • LOCKED 20000 / 25000 / 30000 (Coming Soon, admin-controlled). The persistent reward box stays hidden when the selected tier needs no ad (`renderRewardBox` returns early via `tierAdRequired`). All labels are driven by the ad setting, not the tier id: `tierLabel()` (the duplicate hardcoded definition was removed) returns `Free • X words` or `X words • rewarded`; `renderTierRow`, `renderHomeTiers`, `renderLimitsLine` use the same rule. Home copy updated ("Free up to 10,000 words. Higher tiers need one ad per generation."), Terms text updated ("Free tiers: up to 10,000 words…"), landing tiers/FAQ/hero updated to match. `quickSpeak` now allows up to `maxFreeWords()` (highest ad-free tier = 10,000). The rewarded Watch Ad flow still works for admin-unlocked higher tiers with their ad toggle on.
- **One-time migration for stored settings:** pre-v1.6 `vw_settings` had no `tierStatus` and defaulted r10 to ad-required. `migrateWordSettings()` (app) and `migrateTierStatus()` (admin) derive `tierStatus` from the old locks once and force stored `tierAd.r10=false`; after that the admin's explicit ad choices are kept.
- **All "test ads" text removed from user-facing UI:** `Test Ad` = 0 and `TEST` = 0 (visible strings) in app + landing; `ca-app-pub-` = 0 in both (8 refs remain in Admin only, allowed). Removed: the `Test Ad` badges on the landing banner slots, the TEST pill on the "▶ Watch Ad to Unlock" button (label kept, no pill), the toast (now "Reward granted — 1 generation unlocked. Press Generate."), the landing footer "AdMob: TEST IDs only" line (now "AdMob: coming soon"), the footer test-slot note, and the `TEST reward entitlement` job entries (now "Reward entitlement"). The only `TEST` left in the app is the admin-visible audit-log string (`reward.test-grant` detail) — kept deliberately.
- **Per-tier status (Available / Coming Soon / Hidden):** stored in `vw_settings.tierStatus` (`{r10:'available', r20:'coming', r25:'coming', r30:'coming'}` by default); `tierLocks` is still written alongside (derived from status) so old code keeps working, and missing `tierStatus` is derived from the old locks. App: `coming` → `isTierLocked` (shows 🔒 Coming Soon, disabled); `hidden` → `isTierHidden` (skipped from `renderTierRow`, `renderHomeTiers`, `renderLimitsLine`; refused by `pickTier` and `generate()`); `available` → normal. Landing: `syncTiers()` reads the same settings on load and updates the tier cards the same way (default with no settings stored = 5000 + 10000 Free, 20000/25000/30000 Coming Soon).
- **Banner bug — diagnosis + fix:** the old slots were empty `<div class="adslot">` containers filled only by JS `renderBanners()` with a "Test Ad" placeholder, and the class/id `adslot` is a textbook ad-blocker cosmetic-filter target (EasyList hides `##.adslot`) — any user with an ad blocker saw nothing at all. Fixed: the slots are now `.promo` banners whose house-ad content is written in the HTML itself (gradient banner "VoiceWorld AI — Free up to 10,000 words" + Start Creating button), so they show even with JS blocked; `renderPromos()` only hides them when the admin disables banners or applies the admin's custom banner title/text/link (`vw_settings.bannerTitle/bannerText/bannerLink`, blank = default). No "Test Ad" text anywhere.
- **Verification (2026-11-11):** `node --check` on all three inline scripts — PASS. Node harness (`/tmp/vw-harness2.js`, stubbed DOM/localStorage, running the REAL extracted app + landing scripts) — **46/46 PASS**: migration creates tierStatus + forces r10 ad off; r10 generates with no entitlement and no Watch Ad button; hidden r25 skipped + refused by pickTier/generate; coming r20 disabled + refused; r20 available+ad blocks generate until Watch Ad, then generates, single-use enforced on 2nd generate; quickSpeak blocks 10,001 words; landing promos visible by default, tier sync (r20→REWARDED, r25 hidden, custom banner text/link), banner-disabled hides both slots. Local HTTP serve + curl: `/` 200, `/app/` 200, `/admin/` 200; served landing HTML contains both `.promo` banners + `syncTiers`/`renderPromos`. **Not deployed** (per task instruction) — parent must deploy + browser-test.
- **Still needs a live browser test (parent):** promo banners visibly render on the landing page (with an ad blocker on, too); tier cards follow Admin status changes (Available / Coming Soon / Hidden) on landing + app; r10 generates with no ad in the real browser; Watch Ad flow on an admin-unlocked r20; admin banner title/text/link round-trip.

## v1.7 update (2026-11-11) — own My Voice Clones tab, 'More voices coming soon', clone tier locks (not deployed)
- **My Voice Clones is now its own top-level tab** (bottom nav: Home, Generate, Voices, **Clones** 🎤, Library, Profile). The new `tab-clones` screen holds everything about clones: record a reference (max 180 sec, live waveform, playback, re-record), upload WAV/MP3/M4A, consent checkbox (required), saved-clones list (rename/delete + "▶ Generate with this clone" per clone), AND a "Generate with my clone" flow (pick a clone from a dropdown + language + text + tier selector + Generate button + result card with Play/Save/Share/Download). The Voices tab no longer contains the clone card — it has a single "Open My Voice Clones →" button. Clone storage (`vw_clones`), recording/upload code and the server-MP3 generation path are reused unchanged.
- **Honesty (unchanged rule):** the clones screen keeps the one short honest line — no real zero-shot cloning model in this build; a clone is a reference profile and generation uses the closest preset voice (the first registry voice for the chosen language, shown as "Clone name (via Preset)"). The result card repeats it. Audio is never presented as really the user's own voice.
- **'More voices coming soon' card:** the Voices preset list always ends with a "➕ More voices coming soon" card; when a language is filtered it names it (e.g. "More Hindi voices coming soon"); when "All languages" is selected it reads "More voices coming soon". If a filter yields zero voices, the card shows alongside the existing "No voices match" message. No existing voice was removed.
- **Clone generation tiers (default free-only):** the Clones section tier selector allows the free tiers (5000 + 10000 words) and shows 20000 / 25000 / 30000 as "🔒 … words • Locked" (disabled). Admin controls per-tier access in `vw_settings.cloneTiers` (default `{free:true, r10:true, r20:false, r25:false, r30:false}`, Admin → Voices & Languages). A higher tier unlocks for clones only when the admin turns its clone toggle ON **and** the tier's own status is 'Available'; Coming Soon / Hidden stays locked regardless. Clone generation enforces, in order: (a) a clone is selected ("Select one of your voice clones first."), (b) tier status Available ("🔒 Coming Soon — this tier is locked."), (c) tier allowed for clones ("🔒 Locked for clone voices — the admin can unlock this tier for My Voice Clones."), (d) word count within the tier limit ("Limit exceeded — …"), (e) the tier's ad requirement via the existing single-use Watch Ad entitlement flow when ad is on. The clone tier selector re-reads settings live (storage event / visibility change, like the main Generate tab).
- **Verification (2026-11-11):** `node --check` on both extracted inline scripts — PASS. Static audit: all onclick/onchange handlers resolve (one intentional inline assignment `selectedCloneId=this.value||null`), no duplicate ids, every `$('…')`/`getElementById('…')` id exists — PASS. Node harness (`/tmp/vw-harness3.js`, stubbed DOM/localStorage, running the REAL extracted app + admin scripts) — **29/29 PASS**: Clones tab exists, Voices tab has no duplicated clone card (single `cloneList`/`recBtn`); "More voices coming soon" card (names Hindi when filtered; shows with the empty message for a zero-voice language); clone generation on the free tier completes with no ad and no entitlement (library entry saved under the clone's name); no-clone refusal; r20 refused with the locked-for-clones message (when Available but clone-locked); after admin sets `cloneTiers.r20=true` + `tierStatus.r20='available'`, r20 becomes selectable, blocks until Watch Ad, completes after the ad, and needs a fresh ad for the second generation; 5001 words on free refused with Limit exceeded; hidden tier refused; admin clone-form submit writes `vw_settings.cloneTiers` + an audit entry. Local HTTP serve + curl: `/app/` 200, `/admin/` 200, `/app/voices.js` 200. **Not deployed** — parent must deploy + browser-test (record a clone, generate with it, Watch Ad flow on an admin-unlocked r20, admin toggle round-trip).

## v1.8 update (2026-11-11) — generation progress display + two-step delete confirm (not deployed)
- **Generation progress (Generate tab + Clones tab):** a progress block under the Generate button (`#genProgress`, and `#cloneProgress` in the Clones tab) shows a bar (0–100%) plus one status line: `Chunk X of N • Y% • elapsed M:SS • ~Z sec remaining` (or `almost done` when under 5 sec remain). It appears when a server-MP3 generation starts and hides/resets on finish, failure, or Stop. The existing status text/toasts are unchanged — the progress block is additional.
- **Real chunk progress + ETA:** `synthesizeToBlob` now fires its `onChunk` callback AFTER each chunk actually finishes (it used to fire before the chunk started, so the old "Generating chunk n" message was ahead of reality). Percentage = chunksDone / totalChunks. ETA = (elapsed / chunksDone) × chunks remaining, rounded to whole seconds; before the first chunk finishes it falls back to the stored measured ms/char rate. The line refreshes every 500 ms so elapsed time ticks even on long chunks. Each `progStart` gets a fresh id, so a stale async chain can never hide or finish a newer generation.
- **Pre-generation time estimate:** the estimate line (Generate + Clones) now shows `Estimated generation time: ~X sec`, computed from text length × a measured rate: after every successful server generation the measured ms/char is saved to `vw_tts_rate` (clamped 1–200 ms/char); when no measurement exists yet it uses a conservative default of 10 ms/char. The estimate updates live as the user types.
- **Device-voice fallback:** when generation falls back to the device voice, the block shows `Generating with device voice… • elapsed M:SS` with an indeterminate animated bar — never a fake percentage.
- **Two-step delete (bug fix):** the clone Delete button did nothing in live testing — `delClone()` used native `confirm()`, which headless browsers auto-dismiss (returns false). Both `delClone()` and `delLib()` now use an inline two-step confirm instead of any browser dialog: first click arms that row's Delete button (`Confirm delete?`, red), second click within 5 seconds performs the delete (removes from `vw_clones` / `vw_library`, re-renders, toast `Deleted.` / `Clone deleted.`); clicking elsewhere or waiting resets it. No `confirm()` remains in either handler (only `deleteAccount` and `clearLibrary` still use native confirm — out of scope here).
- **Verification (2026-11-11):** `node --check` on the extracted inline script — PASS. Node harness (`/tmp/vw-harness4.js`, stubbed DOM/localStorage, running the REAL extracted app script) — **26/26 PASS**: ETA math (2/5 chunks after 20 s → 40%, ~30 s remaining); pre-gen estimate from stored rate (400 chars × 25 ms = ~10 s) and from the 10 ms/char default (1000 chars → ~10 s); progress reset between generations; clone progress 1/3 after 10 s → 33%, ~20 s remaining; device mode elapsed-only, no `%`, indeterminate bar; `almost done` at 2/2; measured rate recorded (20000 ms / 1000 chars = 20 ms/char in `vw_tts_rate`); stale-id guard (old chain cannot hide a newer generation); clone estimate (200 chars × 25 ms = ~5 s); `onChunk` fires after each chunk completes (fetch-count proof); `stopSpeak` resets the block; delClone two-step (1st click arms + keeps, 2nd click deletes + re-renders); delLib two-step (same); arming a second delete disarms the first. Local HTTP serve + curl: `/app/` 200. **Not deployed** — parent must deploy + browser-test (long-text generation to watch the progress move; device-voice fallback; clone Delete two-step in the real browser).

## v1.9 — Clone cloud persistence (Firestore + IndexedDB), no-count clone language select, clone-TTS engine hook (NOT DEPLOYED)
- **Firebase Storage is NOT used — it cannot be created on the Spark (free) plan; it requires a Blaze (paid billing) upgrade, which the user has not approved.** Persistence is Firestore-only + IndexedDB instead.
- **Cloud persistence:** when a clone is saved while signed in, its metadata goes to Firestore `users/{uid}/clones/{cloneId}` (id, name, language, source, fileName, consent, consentDate, created, voiceId:null, cloudAudio). The audio itself is stored as a base64 data URL in the doc field `audioData` ONLY when under ~600 KB (Firestore documents cap at 1 MB). On sign-in the app loads `users/{uid}/clones` and merges them into `vw_clones` (cloud copy wins on id conflict). Delete removes the Firestore doc + the IndexedDB blob + the local entry.
- **IndexedDB safety net:** the full audio Blob is stored per clone (DB `voiceworld-clones`, store `audio`, key = clone id) so the sample survives browser restarts on the same device even when it cannot go to the cloud. A sample over the 600 KB base64 limit is saved as metadata-only in Firestore (`cloudAudio:false`, no `audioData`) with the honest toast `Saved — audio kept on this device (sample too large for cloud save).`
- **Failure honesty:** cloud-save failure still saves locally with toast `Saved on this device only — cloud save failed.`; not signed in → toast `Sign in to save this clone to your account — saved on this device for now.` No cloud save is ever claimed unless it happened.
- **Language counts:** `populateCloneLang()` (Clones tab) now shows plain language names only — no ` • N voices`, no ` — no Edge voice yet`. `populateLang()` (main Generate tab) is UNCHANGED — voice counts stay visible there, exactly as the user ordered.
- **Clone-TTS engine hook (OFF by default):** clones carry a `voiceId` field (ElevenLabs voice id, null until configured). In `cloneGenerateWithBackend`, when a clone has a `voiceId` AND the Worker status reports `cloneTts:'configured'`, the app POSTs `/api/clone-tts {text, voiceId, idToken}` and uses the returned MP3 (result labelled `Clone name (your voice clone)`); on ANY failure (501, error, backend unavailable) it falls back to the existing closest-preset path with the existing honest note — generation never fails because the engine is off. Worker: new `POST /api/clone-tts` route reads the key ONLY from the `ELEVENLABS_API_KEY` Worker secret (never from the request, never hardcoded); without it returns 501 `{error:'clone backend not configured'}`; with it calls ElevenLabs `eleven_multilingual_v2` and returns audio/mpeg, chunking long texts (5000 chars/chunk) the same way `/api/tts` does. The existing `/api/tts` route is untouched.
- **Verification (2026-11-11):** `node --check` on the app inline script and the worker module — PASS. App harness (`/tmp/vw-harness5.js`, stubbed DOM/localStorage + stubbed Firebase Auth/Firestore/IndexedDB, running the REAL extracted app script) — **39/39 PASS**: clone-lang options have no counts while Generate options keep them; small signed-in save writes the Firestore doc with audioData + local cloud flags + IndexedDB blob; sign-in load merges a cloud clone into an empty local list; large sample writes metadata-only + IndexedDB + exact honest toast; delete removes Firestore doc + IndexedDB blob + local entry; cloud failure still saves locally with the exact toast; signed-out save writes nothing to Firestore with the exact toast; clone generation with voiceId=null uses the preset path (no clone-endpoint call); with voiceId set + backend configured it calls `/api/clone-tts` and uses its MP3; a 501 falls back to preset; backend not-configured never calls the clone endpoint. Worker direct test (`/tmp/worker-clone-test.mjs`, real worker module) — **15/15 PASS**: 501 without key, status flag follows env, ElevenLabs call shape + key only in header, validation 400s. Local HTTP serve + curl: `/app/` 200. **Not deployed** — parent must deploy + browser-test (real clone save → sign out/in on a fresh profile; Firestore rules already verified live for the user's own subtree).

## v2.0 (2026-11-11) — My Voice Clones section removed (user order)
Removed: Clones bottom-nav tab, the whole `tab-clones` screen (record/upload/consent/list/generate), the Voices-tab "Open My Voice Clones" card, the recorder (`toggleRec`/`reRecord`/`onUpload`/`drawWave`), all cloud persistence (`saveCloneToCloud`/`loadCloudClones`/`deleteCloudClone`, Firestore `users/{uid}/clones`, IndexedDB `voiceworld-clones`), the clone-TTS engine hook (`cloneGenerateWithBackend` etc.), `cloneTiers` settings + Admin tier-access card + Admin abuse/consent cards, and all clone wording on the landing page and in Privacy/Terms. Kept: deleting an account still clears the legacy `vw_clones` localStorage key. Verified: stub-DOM smoke harness 15/15 PASS; live check after deploy.
