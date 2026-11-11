// VoiceWorld TTS test worker — Microsoft Edge TTS (free) as a backend.
// (v2.5: /api/settings removed — settings now live in Firestore doc
// app_config/live; the admin panel and user app talk to Firestore directly.)
// POST /api/tts {text, voice, rate?, pitch?} -> audio/mpeg (MP3, 24kHz mono)
// POST /api/clone-tts {text, voiceId, idToken?} -> audio/mpeg (ElevenLabs, only
//   when the ELEVENLABS_API_KEY Worker secret is set; otherwise 501)
// GET  /api/voices -> Edge voice list (proxied, for the app's voice picker)
// GET  / -> status JSON (includes cloneTts: 'configured' | 'not-configured')
// Auth: Sec-MS-GEC v2 token (see drm.js — port of edge-tts 7.3.1).
// This is a SPIKE on a separate test worker. Not wired into the app yet.
import { generateSecMsGecV2, generateMuid, TRUSTED_CLIENT_TOKEN } from './drm.js';

const GEC_VERSION = '2-143.0.3650.75';
const VOICES_URL = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken='
  + TRUSTED_CLIENT_TOKEN;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0';
const ORIGIN = 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold';
const DEBUG_LOG = false; // spike instrumentation, off in the deployed test worker

const ALLOWED_ORIGINS = new Set([
  'https://voiceworld-ai.pages.dev',
  'https://voiceworld-ai.firebaseapp.com',
  'https://voiceworld-ai.web.app',
  // Capacitor apps: Android serves the app from https://localhost, iOS from capacitor://localhost.
  // Without these, the installed app's fetch is blocked by CORS ("Failed to fetch") even though
  // the website (pages.dev origin) works fine — that was the v1.4.1 "could not reach the voice server" bug.
  'https://localhost',
  'capacitor://localhost',
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const h = { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
  if (ALLOWED_ORIGINS.has(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    h['Access-Control-Allow-Origin'] = origin;
  }
  return h;
}

function jsonResponse(request, obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

const VOICE_RE = /^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9]+Neural$/;
const RATE_RE = /^[+-]\d+%$/;
const PITCH_RE = /^[+-]\d+Hz$/;

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Split text into sentence-based chunks of at most maxLen chars.
function chunkText(text, maxLen = 800) {
  const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if (cur && cur.length + 1 + piece.length > maxLen) { chunks.push(cur); cur = piece; }
    else cur = cur ? cur + ' ' + piece : piece;
  }
  if (cur) chunks.push(cur);
  // A single over-long sentence gets hard-split.
  const out = [];
  for (const c of chunks) {
    if (c.length <= maxLen) { out.push(c); continue; }
    for (let i = 0; i < c.length; i += maxLen) out.push(c.slice(i, i + maxLen));
  }
  return out;
}

function makeReader(ws) {
  const queue = [];
  const waiters = [];
  let closed = false;
  let closeErr = null;
  // Binary frames arrive as Blob in workerd, not ArrayBuffer. Convert them
  // through a promise chain so message order is preserved (a later text
  // turn.end must never overtake an earlier audio Blob).
  let chain = Promise.resolve();
  ws.addEventListener('message', (ev) => {
    chain = chain.then(async () => {
      let d = ev.data;
      if (d && typeof d.arrayBuffer === 'function') d = await d.arrayBuffer();
      if (typeof DEBUG_LOG !== 'undefined' && DEBUG_LOG) {
        console.log('[tts] msg', typeof d, typeof d === 'string' ? d.slice(0, 160) : (d.byteLength ?? d.size));
      }
      if (waiters.length) waiters.shift()(d);
      else queue.push(d);
    }).catch((e) => { closed = true; closeErr = e; while (waiters.length) waiters.shift()(null); });
  });
  ws.addEventListener('close', () => { closed = true; while (waiters.length) waiters.shift()(null); });
  ws.addEventListener('error', (ev) => {
    closed = true; closeErr = new Error('Edge WebSocket error');
    while (waiters.length) waiters.shift()(null);
  });
  return async function next() {
    if (queue.length) return queue.shift();
    if (closed) {
      if (closeErr) throw closeErr;
      throw new Error('Edge WebSocket closed unexpectedly');
    }
    const data = await new Promise((res) => waiters.push(res));
    if (data === null) throw new Error('Edge WebSocket closed unexpectedly');
    return data;
  };
}

async function openEdgeWs() {
  const connId = crypto.randomUUID().replaceAll('-', '');
  const gec = generateSecMsGecV2();
  // Workers fetch() rejects wss:// URLs ("Fetch API cannot load: wss://...").
  // Use the https:// URL with an Upgrade header instead; the runtime
  // performs the WebSocket handshake and returns the socket on
  // response.webSocket. `new WebSocket()` cannot set custom headers
  // (Origin/Cookie/User-Agent), so it is not used.
  const url = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connId}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${GEC_VERSION}`;
  const resp = await fetch(url, {
    headers: {
      Upgrade: 'websocket',
      Connection: 'Upgrade',
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
      Origin: ORIGIN,
      Cookie: `muid=${generateMuid()};`,
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!resp.webSocket) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Edge WS upgrade failed: HTTP ${resp.status} ${body.slice(0, 200)}`);
  }
  const ws = resp.webSocket;
  ws.accept();
  return ws;
}

async function synthesizeChunk(ws, next, voice, text, rate, pitch) {
  const requestId = crypto.randomUUID().replaceAll('-', '');
  const locale = voice.split('-').slice(0, 2).join('-');
  const attrs = `${rate ? ` rate='${rate}'` : ''}${pitch ? ` pitch='${pitch}'` : ''}`;
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${locale}'><voice name='${voice}'>`
    + (attrs ? `<prosody${attrs}>${escapeXml(text)}</prosody>` : escapeXml(text))
    + `</voice></speak>`;
  ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:0\r\nPath:ssml\r\n\r\n${ssml}`);
  const audio = [];
  for (;;) {
    const data = await next();
    if (typeof data === 'string') {
      if (data.includes('Path:turn.end')) break;
      continue; // turn.start / response / metadata: ignore
    }
    const buf = new Uint8Array(data);
    if (buf.length < 2) continue;
    const hlen = (buf[0] << 8) | buf[1];
    const header = new TextDecoder().decode(buf.slice(2, 2 + hlen));
    if (header.includes('Path:audio')) audio.push(buf.slice(2 + hlen));
  }
  return audio;
}

async function synthesize(text, voice, rate, pitch) {
  const chunks = chunkText(text);
  const ws = await openEdgeWs();
  try {
    const next = makeReader(ws);
    ws.send('X-Timestamp:0\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n'
      + '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}');
    const parts = [];
    for (const chunk of chunks) {
      const audio = await synthesizeChunk(ws, next, voice, chunk, rate, pitch);
      parts.push(...audio);
    }
    return { bytes: concat(parts), chunks: chunks.length };
  } finally {
    try { ws.close(); } catch { /* already closed */ }
  }
}

function concat(parts) {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function handleTts(request) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse(request, { error: 'Invalid JSON body' }, 400); }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const voice = typeof body.voice === 'string' ? body.voice : '';
  const rate = body.rate || null;
  const pitch = body.pitch || null;
  if (!text) return jsonResponse(request, { error: 'text is required' }, 400);
  if (text.length > 20000) return jsonResponse(request, { error: 'text too long (max 20000 chars)' }, 400);
  if (!VOICE_RE.test(voice)) return jsonResponse(request, { error: 'voice must be an Edge Neural voice, e.g. hi-IN-MadhurNeural' }, 400);
  if (rate && !RATE_RE.test(rate)) return jsonResponse(request, { error: 'rate must be like +0% or -12%' }, 400);
  if (pitch && !PITCH_RE.test(pitch)) return jsonResponse(request, { error: 'pitch must be like +0Hz or -6Hz' }, 400);
  const started = Date.now();
  const { bytes, chunks } = await synthesize(text, voice, rate, pitch);
  if (!bytes.length) return jsonResponse(request, { error: 'Edge returned no audio' }, 502);
  return new Response(bytes, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'attachment; filename="voiceworld.mp3"',
      'X-Voice': voice,
      'X-Chunks': String(chunks),
      'X-Chars': String(text.length),
      'X-Ms': String(Date.now() - started),
      ...corsHeaders(request),
    },
  });
}

const VOICEID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// ---- Real voice-cloning engine (ElevenLabs) ----
// Disabled by default: the API key comes ONLY from the Worker environment
// secret ELEVENLABS_API_KEY (never from the request, never hardcoded).
// Without the secret the route answers 501 and the app falls back to the
// closest preset Edge voice, so generation never fails for this reason.
async function cloneChunk(key, voiceId, text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', output_format: 'mp3_44100_128' }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${t.slice(0, 200)}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

async function handleCloneTts(request, env) {
  const key = env && env.ELEVENLABS_API_KEY ? String(env.ELEVENLABS_API_KEY) : '';
  if (!key) return jsonResponse(request, { error: 'clone backend not configured' }, 501);
  let body;
  try { body = await request.json(); } catch { return jsonResponse(request, { error: 'Invalid JSON body' }, 400); }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const voiceId = typeof body.voiceId === 'string' ? body.voiceId : '';
  if (!text) return jsonResponse(request, { error: 'text is required' }, 400);
  if (text.length > 20000) return jsonResponse(request, { error: 'text too long (max 20000 chars)' }, 400);
  if (!VOICEID_RE.test(voiceId)) return jsonResponse(request, { error: 'voiceId is required (ElevenLabs voice id)' }, 400);
  const started = Date.now();
  const chunks = chunkText(text, 5000);
  const parts = [];
  for (const chunk of chunks) parts.push(await cloneChunk(key, voiceId, chunk));
  const bytes = concat(parts);
  if (!bytes.length) return jsonResponse(request, { error: 'ElevenLabs returned no audio' }, 502);
  return new Response(bytes, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'attachment; filename="voiceworld-clone.mp3"',
      'X-Voice': voiceId,
      'X-Chunks': String(chunks.length),
      'X-Chars': String(text.length),
      'X-Ms': String(Date.now() - started),
      ...corsHeaders(request),
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (url.pathname === '/' && request.method === 'GET') {
      return jsonResponse(request, {
        ok: true,
        service: 'voiceworld-tts-test',
        endpoints: ['POST /api/tts', 'POST /api/clone-tts', 'GET /api/voices'],
        cloneTts: env && env.ELEVENLABS_API_KEY ? 'configured' : 'not-configured',
      });
    }
    if (url.pathname === '/api/voices' && request.method === 'GET') {
      const res = await fetch(VOICES_URL, { headers: { 'User-Agent': UA } });
      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      });
    }
    if (url.pathname === '/api/tts' && request.method === 'POST') {
      try {
        // Generous wall-clock guard; Workers may still enforce their own limits.
        const result = await Promise.race([
          handleTts(request),
          new Promise((_, rej) => setTimeout(() => rej(new Error('TTS timed out after 240s')), 240000)),
        ]);
        return result;
      } catch (e) {
        return jsonResponse(request, { error: String(e && e.message ? e.message : e) }, 502);
      }
    }
    if (url.pathname === '/api/clone-tts' && request.method === 'POST') {
      try {
        const result = await Promise.race([
          handleCloneTts(request, env),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Clone TTS timed out after 240s')), 240000)),
        ]);
        return result;
      } catch (e) {
        return jsonResponse(request, { error: String(e && e.message ? e.message : e) }, 502);
      }
    }
    return jsonResponse(request, { error: 'Not found' }, 404);
  },
};
