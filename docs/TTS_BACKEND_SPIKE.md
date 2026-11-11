# TTS Backend Spike — Microsoft Edge TTS on a Cloudflare Worker

Date: 2026-11-11. Scope: research + test only. Nothing in `final-deploy/` was
touched, nothing was deployed to the `voiceworld-ai` Pages project, and the app
is NOT wired to this endpoint yet.

## Verdict: WORKS ✅

A Cloudflare Worker can act as a real MP3 backend for the VoiceWorld AI web
app, using free Microsoft Edge TTS (no API key, no quota). Short and long
texts both return genuine audible MP3s.

**Test endpoint (separate test Worker, NOT production):**
`https://voiceworld-tts-test.branjandharua7.workers.dev`

- `POST /api/tts` `{text, voice, rate?, pitch?}` → `audio/mpeg` (MP3 download)
- `GET /api/voices` → Edge voice list JSON (322 voices)
- `GET /` → `{ok:true, service:'voiceworld-tts-test'}`

## What was built

`~/workspace/voiceworld-ai/tts-worker/`

- `src/index.js` — Worker: CORS, validation, sentence chunking (≤800 chars),
  one Edge WebSocket per request, sequential SSML per chunk, MP3 concat.
- `src/drm.js` + `src/drm-constants.js` — Sec-MS-GEC **v2** token, ported 1:1
  from edge-tts 7.3.1 `drm.py` (constants generated from the upstream file by
  script, not hand-typed).
- `wrangler.toml` — Worker `voiceworld-tts-test`, `workers_dev = true`.
- `deploy-worker.py` — deploy using the same credential pattern as
  `~/workspace/voiceworld-ai/deploy.py` (separate project name).
- `edge_test.py` — patched local raw-socket client used for the baseline.
- `.venv/` (30 MB) — edge-tts **7.3.1** reference install for token checks.
- `tests/` — MP3 evidence files (see results below).

## Key discovery: edge-tts 7.2.8 is broken — Microsoft moved to GEC v2

The previously proven local client (`edge_direct.py`, edge-tts 7.2.8) now fails
every call with **HTTP 403 Forbidden** on the WebSocket handshake (the REST
voices-list endpoint still returns 200 with the same token, so the token and
the egress IP are fine). Root cause, found by diffing upstream:

- `SEC_MS_GEC_VERSION` changed `1-143.0.3650.75` → **`2-143.0.3650.75`**.
- The token itself changed format: v1 was plain SHA-256 hex (64 chars); v2 is
  **`<CS64 hex 16>-<custom-SHA256 hex 64>`**, where the SHA-256 is a custom
  variant (custom initial state, custom 14-word schedule prefix, adjusted
  round constant at index 14, sigma adjustments) plus a CS64 mixing step.
  Plain SHA-256 + version `2-…` still 403s — the custom hash is required.
- The JS port was verified **bit-exact** against Python:
  `generate_sec_ms_gec_v2(1794000000.0)` =
  `6EA6AF6A0550F520-17E5A544A1EFE811EA5248AFBD9780637964201A6D3A15ADE53A30AB9D066A4F`
  in both implementations, and the current-time token also matched.
- Local baseline re-proven with the v2 client (edge-tts 7.3.1 DRM):
  Hindi MP3 50,976 B / 8.5 s / mean −16.2 dB; English 40,176 B / 6.7 s /
  mean −21.9 dB.

## Worker quirks found (and fixed)

1. **Workers `fetch()` rejects `wss://` URLs** (`Fetch API cannot load:
   wss://…`). Fix: `fetch()` the `https://` URL with an `Upgrade: websocket`
   header; the runtime does the handshake and returns the socket on
   `response.webSocket` (then `ws.accept()`). `new WebSocket()` cannot set
   custom headers (Origin/Cookie/User-Agent), so it is not used.
2. **Binary WebSocket frames arrive as `Blob`, not `ArrayBuffer`** in
   workerd. The first version silently dropped all audio (`Edge returned no
   audio` — turn.start/response arrived, audio Blobs had no `byteLength`).
   Fix: `await blob.arrayBuffer()` through a promise chain so message order
   is preserved (a later text `turn.end` must never overtake earlier audio).
3. No permessage-deflate is offered; the service sends uncompressed frames,
   which the local client also used.

## Test results (all real, via curl against the deployed test Worker)

| Test | Request | Result | Audio check |
|---|---|---|---|
| Hindi short | `hi-IN-MadhurNeural`, "नमस्ते दोस्तों…" (~70 chars) | HTTP 200, 50,976 B, **1.1 s** | ffprobe: MP3 24 kHz mono, 8.496 s; volumedetect **mean −16.2 dB, max −1.2 dB** ✅ audible |
| English short | `en-US-AriaNeural`, "Hello friends…" (~85 chars) | HTTP 200, 40,176 B, **1.6 s** | MP3 24 kHz mono, 6.696 s; **mean −21.9 dB, max −3.6 dB** ✅ audible |
| Long text | `hi-IN-MadhurNeural`, **2,064 words / 8,939 chars**, 12 chunks | HTTP 200, **5,177,088 B, 111.4 s** (server `X-Ms: 109009`) | ffprobe: **862.8 s (14.4 min)**; **mean −16.8 dB, max −1.4 dB** ✅ audible end-to-end; ~7.7× real-time |
| Voices list | `GET /api/voices` | HTTP 200, 170,998 B | 322 voices incl. `hi-IN-MadhurNeural` (Male), `hi-IN-SwaraNeural` (Female) |
| Over-limit | 5,504 words / 23,839 chars | HTTP 400 `text too long (max 20000 chars)` (correct) | — |
| Final re-check (after debug logging off) | Hindi short | HTTP 200, 30,672 B | **mean −16.1 dB** ✅ |

Evidence files: `tts-worker/tests/worker-hindi.mp3`, `worker-english.mp3`,
`worker-long.mp3`, `worker-final-check.mp3` (+ local `v2fixed-*.mp3`).

## Limits found

- **Max 20,000 chars per request** (worker-side validation). The 10,000- and
  20,000-word tiers (v1.3) therefore need **client-side splitting**: send the
  text in ≤10,000-char calls and concatenate the returned MP3s (byte
  concatenation works — the 12-chunk long test decoded as one 862 s file).
  A single 20,000-char call would take ~4 min; prefer ~10,000-char calls
  (~2 min each) for reliability.
- **Long requests take minutes of wall-clock** (111 s for 2,064 words). The
  Worker survived it (no 30 s kill on the free plan in this test), but the
  worker has a 240 s internal race guard — a 20,000-char single call could
  approach it. Client-side chunking (above) avoids this.
- **Free-plan scale**: 100,000 requests/day. CPU limit is 10 ms/request on
  free, but this workload is I/O-bound (WebSocket wait), so CPU is tiny.
  A 14-minute MP3 is ~5 MB in memory — fine.
- **No auth / rate limiting yet.** Anyone with the test URL can use it.
  Before wiring it into production, add a Firebase ID-token check (the app
  already has Firebase Auth) and per-user rate limits, and restrict CORS
  (currently allow-listed to `voiceworld-ai.pages.dev`, `*.firebaseapp.com`,
  `*.web.app`, localhost).
- **Microsoft can change the token algorithm again** (it just did: v1→v2).
  If the endpoint starts 403ing, check edge-tts upstream first (`drm.py` +
  `SEC_MS_GEC_VERSION`), re-port, and redeploy. Pin the algorithm to the
  edge-tts release it was ported from (7.3.1).
- MP3 frames from separate chunks concatenate cleanly for playback/download,
  but they are separate MP3 streams — most players handle this; ffprobe
  reported the full 862 s duration on the concatenated file.

## How the app should call it (for the wiring step)

```
POST https://voiceworld-tts-test.branjandharua7.workers.dev/api/tts
Content-Type: application/json

{"text": "…", "voice": "hi-IN-MadhurNeural", "rate": "+0%", "pitch": "+0Hz"}
→ 200 audio/mpeg (MP3 bytes, 24 kHz mono)
  headers: X-Voice, X-Chunks, X-Chars, X-Ms
→ 400 {error} on bad text/voice/rate/pitch; 502 {error} on Edge failure
```

- `voice` must match `^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9]+Neural$`
  (e.g. `hi-IN-MadhurNeural`, `en-US-AriaNeural`).
- `rate`/`pitch` optional (`+0%` / `+0Hz` style).
- CORS: `Access-Control-Allow-Origin` is reflected only for the app origin
  (`https://voiceworld-ai.pages.dev`), Firebase hosting origins, and
  localhost; `Access-Control-Allow-Headers: Content-Type`.
- Suggested app flow: `fetch()` → `response.blob()` → `URL.createObjectURL`
  for the player + a Download link (`a[download]`), and save the Blob in the
  30-item history (IndexedDB/localStorage metadata + Blob URL or re-fetch).
  Set `vw_settings.ttsBackendUrl` to the endpoint above.
- `GET /api/voices` can feed the voice picker instead of the hardcoded list
  (filter by locale client-side).

## What is NOT done

- Not wired into `final-deploy/` (no app code changed, no Pages deploy).
- No Firebase Auth check, no rate limiting, no abuse protection on the
  endpoint — test Worker only.
- No server-side MP3 storage: the Worker returns bytes per request; the app
  must save/download them itself.
- Debug logging in the Worker is off (`DEBUG_LOG = false` in the deployed
  version); the `[tts] msg` logs were only used during the spike.
