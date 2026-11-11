# VoiceWorld AI — Voice Library (Microsoft Edge TTS)

Date: 2026-11-11 • Source: Microsoft Edge neural voices, fetched live from
`speech.platform.bing.com` voice list (322 voices total on 2026-11-11).
Registry: [`assets/voices.json`](../final-deploy/assets/voices.json) •
Player: [`app/voices.js`](../final-deploy/app/voices.js) •
Samples: [`assets/voice-samples/`](../final-deploy/assets/voice-samples/) — 85 MP3s, 2.87 MB total.

Every voice in the registry has a REAL pre-recorded sample MP3 in its own
voice (male/female exactly as Microsoft labels it — never relabelled), so a
preview in the app sounds like that exact voice instead of falling back to
the device's single voice. Sample sentence per language (8–12 words),
e.g. Hindi: "नमस्ते, मैं वॉइसवर्ल्ड एआई हूँ। आपकी आवाज़, हर भाषा में।",
English: "Hello, I am VoiceWorld AI. Your voice, in every language."

## Per-language table

| Language | Locale used | Available (M / F) | Picked (M / F) | Total |
|---|---|---|---|---|
| English (US) | en-US | 9 / 8 | 5 / 5 | 10 |
| English (UK) | en-GB | 2 / 3 | 2 / 3 | 5 |
| English (India) | en-IN | 1 / 2 | 1 / 2 | 3 |
| Hindi | hi-IN | 1 / 1 | 1 / 1 | 2 |
| Bengali | bn-IN | 1 / 1 | 1 / 1 | 2 |
| Odia | or-IN | **0 / 0 — no Edge voice exists** | 0 / 0 | 0 |
| Telugu | te-IN | 1 / 1 | 1 / 1 | 2 |
| Tamil | ta-IN | 1 / 1 | 1 / 1 | 2 |
| Malayalam | ml-IN | 1 / 1 | 1 / 1 | 2 |
| Kannada | kn-IN | 1 / 1 | 1 / 1 | 2 |
| Urdu | ur-PK | 1 / 1 | 1 / 1 | 2 |
| Nepali | ne-NP | 1 / 1 | 1 / 1 | 2 |
| Arabic | ar-SA | 1 / 1 | 1 / 1 | 2 |
| Spanish | es-ES | 1 / 2 | 1 / 2 | 3 |
| French | fr-FR | 2 / 3 | 2 / 3 | 5 |
| German | de-DE | 3 / 3 | 3 / 3 | 6 |
| Portuguese | pt-BR | 1 / 2 | 1 / 2 | 3 |
| Russian | ru-RU | 1 / 1 | 1 / 1 | 2 |
| Japanese | ja-JP | 1 / 1 | 1 / 1 | 2 |
| Korean | ko-KR | 2 / 1 | 2 / 1 | 3 |
| Chinese | zh-CN | 4 / 2 | 4 / 2 | 6 |
| Indonesian | id-ID | 1 / 1 | 1 / 1 | 2 |
| Vietnamese | vi-VN | 1 / 1 | 1 / 1 | 2 |
| Thai | th-TH | 1 / 1 | 1 / 1 | 2 |
| Turkish | tr-TR | 1 / 1 | 1 / 1 | 2 |
| Italian | it-IT | 2 / 2 | 2 / 2 | 4 |
| Dutch | nl-NL | 1 / 2 | 1 / 2 | 3 |
| Polish | pl-PL | 1 / 1 | 1 / 1 | 2 |
| Swahili | sw-KE | 1 / 1 | 1 / 1 | 2 |
| **TOTAL** | | | **41 M / 44 F** | **85** |

"Picked" = all available voices up to 5 male + 5 female per language.
Where Edge offers fewer, every available voice is included — nothing is
invented to pad the count.

## HONEST gaps — what Edge TTS does NOT offer

- **Odia (or-IN): zero voices.** Microsoft Edge TTS has no Odia voice at
  all (checked 2026-11-11, 322-voice list). Odia is therefore absent from
  the registry on purpose — no fake entry. Odia generation in the app can
  only fall back to the device voice, if any.
- **Only English (US) reaches 10 voices (5M + 5F).** The "10 voices per
  language" target is NOT met anywhere else because the provider does not
  offer that many: Hindi, Bengali, Telugu, Tamil, Malayalam, Kannada, Urdu,
  Nepali, Arabic, Russian, Japanese, Indonesian, Vietnamese, Thai, Turkish,
  Polish and Swahili each have exactly **2 Edge voices (1 male + 1 female)**.
  German reaches 6, Chinese 6, French 5, English (UK) 5.
- **One locale per language was picked.** Other locales exist for the same
  language and were NOT included (e.g. ur-IN for Urdu, bn-BD for Bengali,
  ar-EG for Arabic, es-MX for Spanish, pt-PT for Portuguese, zh-TW for
  Chinese, ta-SG/ta-LK for Tamil). Adding them would add a few more voices
  per language but they are different regional accents, not the same locale.
- **Multilingual variants**: where a language's count was filled with a
  `*MultilingualNeural` voice (de-DE Florian/Seraphina, fr-FR Remy/Vivienne,
  ko-KR Hyunsu, pt-BR Thalita, it-IT Giuseppe), that voice is still a real
  native voice for that language — only its model also covers other languages.
- **Samples are previews only.** They are short fixed sentences per voice.
  Full user-text generation still needs a server TTS backend (Edge TTS via
  the same service, or another engine) — the browser `speechSynthesis`
  fallback cannot reproduce these exact voices.

## Verification (actually run 2026-11-11)

- Voice list fetched live via curl (HTTP 200, 322 voices).
- All 85 samples synthesized with the Edge TTS runner; first full run
  failed 85/85 with HTTP 403 — root cause: Microsoft now requires
  `Sec-MS-GEC-Version=2-…` (edge-tts 7.3.x; the skill's `edge_direct.py`
  still sends version `1-…`). Fixed runner saved as
  [`tools/edge_direct_v2.py`](../tools/edge_direct_v2.py)
  (GEC v2 + corrected Origin header + Accept headers) — the original skill
  file was NOT edited; it needs the same one-line version bump.
  Edge-tts venv was upgraded 7.2.8 → 7.3.1 to confirm the new version.
- Re-run with the fixed runner: 84/85 on first pass; `vi-VN-NamMinhNeural`
  failed once with a transient "connection closed mid-frame" and succeeded
  on immediate retry. **Final: 85/85 files present.**
- `ffmpeg volumedetect` on all 85 files: mean volume **−25.9 … −16.9 dB**,
  max −2.5 dB typical — all clearly audible, **0 silent / 0 missing**.
  (Healthy speech per the skill is mean ~−15…−25 dB.)
- Registry ↔ files cross-check: 85 ids, 85 files, exact match, no extras.
- `node --check app/voices.js` — PASS. `voices.json` parses as JSON — PASS.

## How the app uses this

- `app/voices.js` defines `window.VW_VOICES` (the registry),
  `window.VW_playSample(voiceId)` (plays that voice's MP3, stops any
  playing sample first, returns a Promise), and
  `window.VW_voiceFor(lang, gender)` (first matching voice or `null`).
- The app must load `voices.js` and use these samples for voice-card
  previews, and route generation to the matching `edgeVoice` when the
  server TTS backend exists. `sampleUrl` is site-root-relative
  (`assets/voice-samples/<id>.mp3`); `samplePathApp` is app-relative
  (`../assets/voice-samples/<id>.mp3`).
