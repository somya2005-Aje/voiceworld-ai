# VoiceWorld AI — Admin Panel Delivery (Part 2)

**Date:** 2026-11-11
**Deliverable:** `~/workspace/voiceworld-ai/final-deploy/admin/index.html` — one self-contained file (inline CSS + JS, zero external dependencies, 77,892 bytes)
**Status:** Demo admin panel complete and tested as far as a browser-only build can be. **NOT deployed** (per task instruction).

## What was built

Separate from the User App. Same brand palette (#6A11CB / #2575FC / #00C9A7 / #FF6B6B / #F8FAFF / #0B1026 / navy #10172A), responsive sidebar navigation (collapses to hamburger on mobile), 9 pages:

| Page | What works |
|---|---|
| Login gate | Email+password form via **real Firebase Auth** (project `voiceworld-ai`, since v1.1). Only `branjandharua7@gmail.com` may enter; other signed-in users see access-denied with their email + logout. Old demo password `admin123` removed. Gate is demo-grade (client-side email check) until custom claims + Firestore rules exist — stated on-screen. Session is Firebase Auth state (persistent); logout calls `signOut()`. |
| Access denied | "Test as normal user" link shows the locked-out state ordinary users must see — no admin access via URL, localStorage, or client flags. |
| Dashboard | Real counts computed from localStorage: registered/active/new users, generations, generated words, cloned voices, failed jobs, queue depth, library size estimate. Date filter 7/30 days + bar charts drawn from real stored data. Verified rewarded completions = **0** (AdMob not connected, stated). Revenue = "no data" (never fabricated). CPU/GPU/workers: explicitly "no server connected". |
| Users | Table from `vw_users`, search by email/name/UID, status filter, view profile, suspend/reactivate, quota change, deletion (removes profile + clones + jobs + library). Every sensitive change prompts for a reason and writes an audit entry (admin, timestamp, old → new, reason). Private audio is never shown. |
| Voices & Languages | 12 seeded preset voices (English US/India, Hindi ×2, Bengali, Tamil, Telugu, Spanish, French, Arabic, Japanese, Korean) with name/language/country/accent/gender/description/model ID/version/license/availability. Add / edit / rename / enable / disable / remove — all persisted to `vw_voices`, which the User App reads on next load. |
| AI Models | Registry: Edge TTS (browser) = **Available** (preview only), Piper = Setup Required, Kokoro = Setup Required, Coqui XTTS v2 = Not Installed (CPML non-commercial licence noted). Uninstalled models are never marked Available — setting one to Available when its location says "Not installed" triggers a confirm warning. Health-check button runs a real check (`speechSynthesis.getVoices()` count) and reports the result; test-generation plays a sample only for Available models. |
| Tiers & Ads | Editable word tiers — free 5000 / rewarded 10000 / extended 20000 words, sample max 180 sec, daily quota, max text chars (default 150000), concurrency — saved to `vw_settings` (same key the User App reads; panel notes the User App enforces them on next load). Legacy second-based keys are kept in sync for old clients. AdMob app ID, rewarded unit ID, test/production mode, rewarded-tiers toggle, failure help text, plus Server TTS backend URL (`ttsBackendUrl`, used for MP3 download). **No manual/client-side reward completion button exists anywhere.** |
| Landing & APK | Edit headline, description, CTA labels, footer, support contact → `vw_landing`. Asset manager for all 10 landing images: live `HEAD` check against `../assets/assetN.svg` (Present / Missing), alt-text edit + enable/disable stored in `vw_landing.assets`. APK / Play Store / landing URL / version / release notes / Share App message → `vw_settings`; Download App shows ACTIVE only for a valid `https://…*.apk` URL, otherwise "Coming soon" — no link is ever invented. Replacement upload is recorded as an audit request, not faked. |
| Jobs & Moderation | Jobs table from `vw_jobs` (Pending/Processing/Completed/Failed/Cancelled) with status filter; Retry only for Failed, Cancel only for Pending/Processing (both audited). Abuse-report intake form + list (`vw_abuse_reports`); consent-record count read from `vw_clones`; deletion-workflow notes. |
| Audit Log | Full `vw_audit_log` table (time, admin, action, detail, old → new, reason), text filter, JSON export download. Clear button exists only in demo and itself requires a reason + confirm, with a note that clearing is forbidden in production. |
| Global Settings | App name, tagline, support contact, announcement, maintenance-mode toggle, privacy/terms text, brand colours → `vw_settings`. Production admin API route list documented on-page (none live yet). |

## Shared localStorage contract (same origin as User App)

`vw_settings`, `vw_users`, `vw_voices`, `vw_models`, `vw_jobs`, `vw_library`, `vw_clones`, `vw_audit_log`, `vw_landing`, plus `vw_abuse_reports` and session key `vw_admin_session` (sessionStorage).

**Seeding rule honoured:** demo rows are created ONLY when a key is absent — a re-seed never overwrites real data (verified in test run below). Seeded rows are marked `demo:true` and badged "Demo" in the UI. `vw_library` / `vw_clones` / `vw_abuse_reports` seed as empty arrays (no fake generations, clones, or reports).

## What is REAL vs NOT YET

### Real (works in the browser today)
- All 9 pages, navigation, forms, tables, filters, charts from real localStorage data.
- Login gate, session expiry, logout, normal-user access-denied state.
- CRUD for users / voices / models, tier + AdMob + landing + APK + global settings — all persisted to the shared keys the User App reads.
- Audit logging on every sensitive action (login/logout, quota, suspend, delete, voice/model edits, tier/AdMob/landing/APK/brand changes, job retry/cancel, abuse reports).
- Real asset-presence check (`HEAD ../assets/assetN.svg`) and real browser-TTS health check (`speechSynthesis.getVoices()`).
- Real URL validation for APK / store / landing URLs.

### NOT YET — honestly not done (needs backend / accounts)
- **Firebase custom claims / server-verified roles (still NOT done).** Firebase Auth login itself is now real (v1.1), but the owner check is client-side only. Production needs custom claims + Firestore rules; the demo password is already removed.
- **FastAPI backend + Firestore + private storage.** There is no server: no `/api/admin/*` endpoints, no server-side enforcement of tiers/quotas, no signed download URLs, no background workers/queue, no CPU/GPU metrics. (Firestore `users/{uid}` docs are written by the User App, but no security rules were set in this task.)
- **Server-side enforcement.** Tier/quota changes are read by the User App from localStorage only; a hostile client could bypass them until the backend enforces them.
- **Real AdMob.** Only Google's official TEST IDs are configured (v1.1); verified rewarded completions = 0; no server-side reward verification exists. The User App offers a clearly-labelled TEST reward simulation only — no manual reward grant in this panel.
- **Real voice cloning / Piper / Kokoro / Coqui XTTS.** None installed; only browser Edge TTS preview is Available. Language coverage is limited to voices actually present in the browser.
- **Real APK / Play Store listing / public landing URL.** APK URL is empty → Download App shows "Coming soon".
- **Tamper-resistant audit log.** The demo log lives in localStorage and can be cleared (with a recorded reason); production needs an append-only, server-signed log.
- **Email / notifications / revenue.** No payment provider connected; revenue is shown as "no data".

## Test results (actually run 2026-11-11)

1. **JS syntax:** `node --check` on the extracted `<script>` (50,166 bytes) — **PASS**.
2. **ID integrity:** Python check — all 107 `getElementById` references resolve to defined IDs (119 defined); **0 missing**. All 9 nav `data-page` values match a `page-*` section.
3. **Self-containment:** no external `<script src>`, no external `http(s)` links; only fetch is `HEAD ../assets/assetN.svg`. **PASS**.
4. **Seed + audit logic (Node, localStorage stub):** `seed()` produced 3 demo users, 12 voices, 4 models (Edge TTS=Available, Piper/Kokoro=Setup Required, XTTS=Not Installed), 4 demo jobs, tiers 180/300/600/180, empty library/clones/abuse lists; `audit()` wrote 1 entry correctly; re-running `seed()` after injecting a real user **preserved the real data** — **PASS**.
5. **Asset check note:** at build time `~/workspace/voiceworld-ai/final-deploy/assets/` did not exist yet (landing-page agent owns it), so all 10 assets correctly report **Missing / unreachable** until that folder is populated — the check itself is live, not hardcoded.
6. **NOT run (needs a browser):** clicking through the login in a real browser, rendering the charts, and the `speechSynthesis` health check. The parent agent should open `final-deploy/admin/index.html` in a browser and sign in with the demo credentials to verify visually. No live-browser verification was claimed.

## UPDATE 2026-11-11 — Firebase Auth + AdMob TEST IDs integrated (v1.1)

- **Login gate is now REAL Firebase Auth** (compat SDK 10.12.2, project
  `voiceworld-ai`, same config as the User App). Sign-in is
  `signInWithEmailAndPassword`; **only `branjandharua7@gmail.com` may enter** —
  any other signed-in user (e.g. signed in via the User App on the same origin)
  gets the access-denied screen showing their email + a logout button. The
  hardcoded demo password **`admin123` is REMOVED — grep confirms 0 matches in
  app + admin** (live HTML included). The "Test as normal user" link still shows
  the denied state with a demo email.
- **Demo-grade gate, stated on-screen and here:** the owner check is client-side
  only until server-side Firebase custom claims + Firestore security rules are
  added. Do NOT claim the admin panel is server-secure.
- **AdMob TEST IDs** (official Google test IDs) are now the defaults in
  `vw_settings.admob`: App ID `ca-app-pub-3940256099942544~3347511713`, Rewarded
  unit `ca-app-pub-3940256099942544/5224354917`, mode `test`. The Tiers & Ads
  page prefills them and shows a visible warning: "TEST IDs only — replace with
  your real AdMob IDs before production, and NEVER test with real IDs (account
  can be banned)."
- All 9 pages unchanged and still working against the same localStorage keys;
  `adminEmail()` now reads the Firebase current user; audit entries record the
  real Firebase admin email; logout calls Firebase `signOut()`.
- Tests run 2026-11-11: `node --check` on the extracted inline script — **PASS**;
  `admin123` grep — **0**; firebaseConfig present — **PASS**; redeployed +
  curl-verified 200 on `/admin/` with Firebase SDK + "TEST IDs only" warning in
  the live HTML — **PASS**. **NOT run (needs a live browser):** signing in as
  branjandharua7@gmail.com, and the denied screen for a non-owner account.
  Parent must browser-test these before claiming them verified.

## How to run / deploy

Open `~/workspace/voiceworld-ai/final-deploy/admin/index.html` directly in a browser (same origin as the User App + landing page so the shared localStorage keys line up — serve the whole `final-deploy/` folder, e.g. `python3 -m http.server`, and visit `/admin/`). Sign in with Firebase as `branjandharua7@gmail.com` (create that Email/Password account in the Firebase console if needed). For production: add Firebase custom claims + Firestore rules, build the FastAPI admin endpoints listed on the Settings page. Live site: https://voiceworld-ai.pages.dev/admin/ (deployed 2026-11-11).

## UPDATE 2026-11-11 — Word tiers + Library-30 + Download + Dark/Light theme (v1.2)

- **Word tiers replace minutes tiers everywhere** (app, admin, landing): FREE **5,000 words** (no ad), REWARDED **10,000 words** (one completed rewarded ad / test reward per generation), EXTENDED REWARDED **20,000 words** (one per generation). Word count = `trim().split(/\s+/)`. Live word counter + words-vs-limit bar in the TTS Studio; ≤5000 free, 5001–10000 rewarded, 10001–20000 extended rewarded, >20000 rejected with a "shorten the text" message. Admin keys: `freeWords=5000, rewardedWords=10000, extendedWords=20000` (old minute/second keys still read as fallback, converted at 150 wpm; admin also writes legacy second keys in sync). Dashboard stat is now "Generated words"; jobs table shows Words.
- **Entitlement is single-use per generation**: a test/ad reward unlocks exactly ONE generation and is DELETED after use (not just marked used) — the next new generation at 10,000/20,000 words needs a fresh ad. Stated in the UI.
- **TEST MODE card** keeps the honest screen and now starts with the Hindi line: "Ye error nahi hai — web browser mein asli AdMob video ad nahi chal sakta; asli ad sirf Android app mein chalega." Test IDs still shown; "Simulate test reward (TEST ONLY)" unchanged.
- **Preview hook**: app loads `app/voices.js` (built in parallel by another agent) and preset Preview calls `window.VW_playSample(voiceId)` when `window.VW_VOICES` exists, falling back to the device-voice preview otherwise. Voice-card gender comes from the registry when available.
- **Library capped at 30**: every save trims the oldest items (`while length > 30 pop()`); Library shows "Showing latest 30 — older ones are removed automatically". Each item has Play, Regenerate, Share, **Download**, Delete.
- **Download**: tries `POST {text, voice, lang, words}` to `vw_settings.ttsBackendUrl + '/api/tts'` (admin-editable in Tiers & Ads; default same-origin `/api/tts`) and downloads `<title>.mp3` only when the backend returns audio. With no backend (current state) it shows the honest message "MP3 download ke liye server TTS backend chahiye — abhi setup mein hai" and downloads the script as a `.txt` file instead. Never a fake MP3.
- **Theme**: proper Dark/Light toggle persisted in `vw_theme` (default Light), shared across landing + app + admin (same localStorage key); `dark` class + CSS variables recolour every screen. Toggle in the app topbar + Profile Settings, the admin topbar, and the landing header. UI made more colourful + professional (gradient headings/stat numbers, teal/blue/coral/purple card accents, gradient primary buttons only).
- **Verification (2026-11-11)**: `node --check` on all three inline scripts — PASS (one syntax error found in the first pass — a dropped quote in the library words expression — fixed and re-checked PASS). Grep: no minutes-based tier text remains in user-facing tier UI; "minute" survives only in the `settings()` legacy-key fallback code and the "expires in 10 minutes" test-entitlement expiry wording (not a tier). **Not deployed** (per task instruction) — parent must deploy + browser-test.

## UPDATE 2026-11-11 — AdMob TEST banner ads on the WEBSITE only (v1.3)

User order: video/rewarded ads ONLY in the App; banner ads on the Website.
- **Landing page — TWO test banner slots** (`final-deploy/index.html`): slot 1 directly under the hero (`#adslot-top`), slot 2 just before the footer (`#adslot-bottom`). Responsive: 728×90 desktop, 320×50 mobile (note/honest line hidden on mobile to fit). Each slot is a bordered box with a "Test Ad" badge, the text "VoiceWorld AI — Test Banner", the test unit ID in small text, and the line "TEST mode — real banner ads need your real AdMob/AdSense unit ID; this slot shows no real ad and earns nothing."
- **Config from `vw_settings`** (shared with Admin): `bannerEnabled` (default true), `bannerUnitId` / `admob.bannerUnitId` / `admobBannerUnitId` (default Google's official TEST banner unit `ca-app-pub-3940256099942544/6300978111`), mode from `admob.mode` (default `test`). `bannerEnabled=false` hides both slots completely. `mode='production'` NEVER renders the test ID — slots show a "Banner not configured" placeholder instead (set a real AdMob/AdSense unit ID in Admin first).
- **Admin Panel — banner controls in Tiers & Ads** (same card as the rewarded AdMob settings): Banner enabled on/off toggle, Banner ad unit ID field (prefilled with the test ID), TEST mode indicator, and the same warning as the rewarded fields ("TEST IDs only — replace with your real IDs before production, and NEVER test with real IDs"). Saving writes `vw_settings.bannerEnabled` + `bannerUnitId` + `admobBannerUnitId` + `admob.bannerUnitId` (all key shapes, so the landing page finds it) and audits the change. Seed defaults in `vw_settings` include the banner keys.
- **User App untouched for ads:** `app/index.html` was NOT edited; grep confirms 0 `adslot` refs and 0 banner test IDs in the App — video/rewarded ads only there. (The App's only "banner" strings are the unrelated Firebase "Demo mode" notice.)
- **Honesty:** a plain website has no AdMob JS SDK that serves real ads — real AdMob banners serve inside the native Android app, and real web banners need an approved AdSense/AdMob account. The footer carries the line: "Banner ads on the web need an approved AdSense/AdMob account — this is a test slot. No real ads, no earnings." Nothing claims the test slot earns money or shows real ads.
- **Verification (2026-11-11):** `node --check` on both extracted inline scripts — PASS. Local HTTP serve + curl: `/` 200, `/admin/` 200, `/app/` 200. Banner test ID present in landing (JS const, injected into both slots at runtime) + admin (seed/fill/warning); the ONLY `ca-app-pub-…` IDs anywhere in the three files are Google's test publisher `3940256099942544` (App `~3347511713`, Rewarded `/5224354917`, Banner `/6300978111`) — no real/production ID. **Not deployed** (per task instruction) — parent must deploy + browser-test (slot rendering, toggle off/on, production-mode placeholder).

## UPDATE 2026-11-11 — Tier locks, Add Voice / Add Language, honest user counts (v1.5, not deployed)

- **Tier locks + per-tier word limits + ad requirement (Tiers & Ads card):** editable word limits for all five tiers (`freeWords`, `rewardedWords`, `tier20000Words`, `tier25000Words`, `tier30000Words`, plus the legacy `extendedWords` kept in sync with the 20000 tier), a lock checkbox per tier (10000, 20000, 25000, 30000 — 20000/25000/30000 locked by default), and an "needs an ad" checkbox per tier (free=false, others=true by default). Saved to `vw_settings.tierLocks` / `vw_settings.tierAd` in BOTH key shapes (`r20` and `'20000'`, so the User App and the task's literal `tierLocks['20000']` form both work) and audited (`settings.tiers`, old/new JSON incl. locks + ad). Unlocking a tier makes it selectable in the User App on next load, using the same one-ad-per-generation rewarded flow as the 10000 tier. `seed()` writes the same defaults.
- **Add Voice (Voices page):** the voice form now has an "Edge voice ID" label (e.g. `hi-IN-MadhurNeural`), a Language code field (`hi-IN`, `or-IN`) and an optional Sample MP3 URL field, saved to `vw_voices` as `langCode`/`sampleUrl` (audited as before). The User App merges `vw_voices` into its Voices tab and Generate selector; a custom voice without a sample URL previews via a short server-TTS sample.
- **Add Language (new Languages card on the Voices page):** name + code (e.g. Odia / or-IN) saved to `vw_languages`, listed with Remove (audited `language.create` / `language.delete`). The User App merges these into the Generate language selector and the Voices language filter. `seed()` initialises `vw_languages` to `[]`.
- **Users — honest counts:** the Users page now shows "Total: N users — counted from vw_users (local data shared with the User App in this browser)." The Dashboard shows a live Firestore count line ("Firestore users (live from the Firebase users collection): N — local vw_users count is M") when Firebase loads, and an honest "unavailable" message when it doesn't.
- **Banner ads / announcements / AdMob:** verified present and unchanged — Tiers & Ads card keeps banner enabled toggle + banner unit field (test ID prefilled) + the "TEST IDs only" warning; the landing banner test-unit constant was removed from the public page (the ID now appears only in Admin).
- **Separation:** the Admin Panel is NOT reachable from inside the User App — grep confirms 0 `/admin/` links and 0 "Admin" strings in user-facing `app/index.html`. Admin keeps its own links to Landing/User App.
- **Verification (2026-11-11):** `node --check` on the admin inline script — PASS (part of the three-script check). Grep: admin keeps 8 `ca-app-pub-` refs (allowed); new controls present (`tier20000Words`, `lockR20`, `adR30`, `langsBody`, `userCountLine`, `firestoreUserCount`, `vfLangCode`, `vfSample`). Local HTTP serve + curl: `/admin/` 200. **Not deployed** — parent must deploy + browser-test (unlock a tier → app picks it up; Add Voice/Add Language round-trip; Firestore user count line).

## v1.6 update (2026-11-11) — per-tier status, 10,000-word tier free, banner content fields
- **Tier status dropdowns (replaces lock checkboxes):** Admin → Tiers & Ads now has a status select per tier (r10/r20/r25/r30): Available / Coming Soon / Hidden. Saved to `vw_settings.tierStatus`; `tierLocks` is still written alongside (derived: status !== 'available') for backward compatibility, and missing `tierStatus` is derived from the old locks on load (`stA()`). A one-time `migrateTierStatus()` also forces stored `tierAd.r10=false` for pre-v1.6 settings (the 10,000-word tier is now free by default); after that the admin's explicit ad toggles are kept.
- **10,000-word tier free by default:** seed defaults now have `tierAd.r10=false` and `tierStatus.r10='available'`; the ad toggle for r10 loads unchecked by default (`tad.r10===true`) and can still be turned back on.
- **Banner content fields (new):** the AdMob card now has Banner title / Banner text / Banner link inputs (`aBannerTitle`, `aBannerText`, `aBannerLink`) saved to `vw_settings.bannerTitle/bannerText/bannerLink`; the landing promo banners render them when set, else the default house ad. The banner unit-ID field is kept (stored for future real banners); the paragraph now says the slots show a house ad, not a TEST placeholder.
- **Verification (2026-11-11):** `node --check` on the admin inline script — PASS (part of the three-script check). Greps: 0 `lockR10/20/25/30` references remain; `statusR10` present (3 refs); admin keeps 8 `ca-app-pub-` refs (allowed, admin-only). Local HTTP serve + curl: `/admin/` 200. **Not deployed** — parent must deploy + browser-test (status dropdown round-trip to app + landing; banner title/text/link round-trip).

## v1.7 update (2026-11-11) — My Voice Clones tier access (not deployed)
- **New card on the Voices & Languages page: "My Voice Clones — tier access".** Per-tier checkboxes ("Allow for My Voice Clones") for the Free (5,000), 10,000, 20,000, 25,000 and 30,000-word tiers, saved to `vw_settings.cloneTiers` (default `{free:true, r10:true, r20:false, r25:false, r30:false}`; seed defaults and the `migrateTierStatus` one-time migration write the same). Saving audits `settings.cloneTiers` (old → new JSON) and toasts that the User App enforces it on next load. The card states the rule on-screen: a tier also needs its own status to be "Available" (Tiers & Ads) — a Coming Soon / Hidden tier stays locked for clones regardless of this toggle.
- **Verification (2026-11-11):** `node --check` on the admin inline script — PASS (part of the two-script check). Harness (`/tmp/vw-harness3.js`): the admin IIFE loads without throwing under stubs; firing the clone-tiers form submit writes `vw_settings.cloneTiers` and an audit entry; seed defaults include `cloneTiers`. Local HTTP serve + curl: `/admin/` 200. **Not deployed** — parent must deploy + browser-test (toggle r20 on → clone generation on r20 in the User App; toggle off → locked again).
