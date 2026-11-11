# VoiceWorld AI — Samsung Galaxy Store submission checklist

Prepared 2026-11-11. Nothing has been submitted — the parent runs the Seller Portal browser task after this prep.

## App identity (ready)

| Field | Value |
|---|---|
| App name | VoiceWorld AI |
| Package | `ai.voiceworld.app` |
| Version | **1.4.3** (versionCode **8**) |
| Category | **Tools** (suggested — confirm in the portal) |
| Support email | branjandharua7@gmail.com |
| Website | https://voiceworld-ai.pages.dev/ |
| Privacy policy URL | https://voiceworld-ai.pages.dev/privacy-policy (live, HTTP 200) |

## Files (ready)

| Item | Path |
|---|---|
| APK to upload | `~/workspace/voiceworld-ai/final-deploy/voiceworld.apk` — 11,349,827 B, SHA-256 `c5a923fe6d9f017bf681b4465731dfcd65aec48bc442349ab22766fe8df8b3f2` (also hosted at https://voiceworld-ai.pages.dev/voiceworld.apk) |
| Listing text | `~/workspace/voiceworld-ai/samsung-listing/listing.txt` (short + full description, keywords) |
| Icon 512×512 | `~/workspace/voiceworld-ai/samsung-listing/icon-512.png` (the app's actual launcher icon, extracted from the APK's `mipmap-xxxhdpi/ic_launcher_foreground.png` on white) |
| Screenshot — landing | `~/workspace/voiceworld-ai/samsung-listing/screenshots/01-landing.png` (1080×1920) |
| Screenshot — Home | `~/workspace/voiceworld-ai/samsung-listing/screenshots/02-home.png` (1080×1920) |
| Screenshot — Generate | `~/workspace/voiceworld-ai/samsung-listing/screenshots/03-generate.png` (1080×1920) |
| Screenshot — Voices | `~/workspace/voiceworld-ai/samsung-listing/screenshots/04-voices.png` (1080×1920) |
| Screenshot — Library | `~/workspace/voiceworld-ai/samsung-listing/screenshots/05-library.png` (1080×1920) |

All five screenshots are real renders of the live app/site (headless Chrome, 540×960 CSS @ 2× DPR), not mockups. The Library shot shows the empty state — the web build cannot generate audio in production AdMob mode (rewarded video only plays inside the native Android app, by design), so the library was empty for the test account. That is honest; Samsung accepts an empty-state screen, but a library-with-audio shot can only come from the APK on a real phone.

## What the Seller Portal will ask — ready vs needs the user

### Ready (just upload / paste)
- [x] APK file (above)
- [x] App name, package, version
- [x] Short + full description, keywords (`listing.txt`)
- [x] 5 screenshots (1080×1920)
- [x] 512×512 icon
- [x] Privacy policy URL (live)
- [x] Support email + website

### Needs the user (do at submission time)
- [ ] **Samsung account sign-in** — a Samsung Seller Portal account (free) is required. The user signs in himself; do not create it for him.
- [ ] **Seller type** — Samsung may ask whether the seller is an individual or a business. A corporate/business account may be required for phone apps (unverified — check at submission). Do NOT invent a business name or tax details.
- [ ] **Tax / payment info** — if Samsung asks for tax information, flag it to the user and wait; do NOT invent anything. The app is free, so no payment setup is expected, but the portal may still ask.
- [ ] **Content rating / age questionnaire** — complete Samsung's rating questionnaire in the portal. Expected outcome: suitable for all ages (the app has no user-generated content, no chat, no mature content). Do not guess answers — answer from the questionnaire.
- [ ] **Country / language availability** — confirm the default (all countries where Galaxy Store operates) or set per his choice.

## After submission (not part of this prep)
- Samsung review takes days; approval is not guaranteed.
- Once the app is live in Galaxy Store, link it in AdMob (AdMob → Apps → VoiceWorld AI → link to the store listing) to trigger the app review — that is the path to real ads serving. The AdMob account itself was still "isn't approved yet" as of 2026-11-11 15:59 IST (verification typically up to 24 hours) — that is separate from the store review.
- Do NOT click the app's own ads, ever (ban risk).

## Open cleanup item (for the parent, not the user)
- The throwaway test account used for the screenshots, **vw-store-20261111@example.com** (UID `Cw5IBaSaktbP6NwOW61Uc9PdlzC3`), is **partly deleted**: its Firestore `users/{uid}` document was deleted (HTTP 200) and it never generated any audio, so it has no library data. But its **Firebase Auth record still exists** — deletion via the API failed twice with `CREDENTIAL_TOO_OLD_LOGIN_AGAIN` (Firebase requires a fresh sign-in to delete an account, and the throwaway password was randomly generated and not saved, so a fresh sign-in is impossible). Delete it from the Firebase console (Authentication → Users → delete) via a browser task. It is a harmless orphan in the meantime: an unverified `@example.com` address with no data behind it.
