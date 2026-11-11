// Port of edge-tts 7.3.1 src/edge_tts/drm.py (Sec-MS-GEC v2) to plain JS.
// The v2 token is "<CS64 hex 16>-<custom-SHA256 hex 64>" over
// "<windows-filetime-ticks (5-min bucket)><TRUSTED_CLIENT_TOKEN>".
// The custom SHA-256 differs from FIPS SHA-256: custom initial state
// (_SHA256_STATE), a custom 14-word schedule prefix, an adjusted round
// constant at index 14, and sigma adjustments at schedule positions 16/29.
// All 32-bit ops use >>> 0 / Math.imul so results match Python exactly.
import {
  SHA256_INITIAL,
  SHA256_STATE,
  SHA256_SCHEDULE,
  SHA256_ROUND_CONSTANTS,
  SHA256_BLOCK_CONSTANTS,
  CS64_COEFFICIENTS,
  SHA256_ADJUSTMENT,
  SHA256_SIGMA0_ADJUSTMENT,
  SHA256_SIGMA1_ADJUSTMENT,
  CS64_FACTOR,
  CS64_ADJUSTMENT0,
  CS64_ADJUSTMENT1,
} from './drm-constants.js';

export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WIN_EPOCH = 11644473600;

const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) | 0;
const rol16 = (v) => (((v << 16) | (v >>> 16)) >>> 0);
const sigma0 = (x) => (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) | 0;
const sigma1 = (x) => (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) | 0;

function sha256Rounds(state, words, firstRound = 0) {
  let [a, b, c, d, e, f, g, h] = state;
  const K = firstRound === 14 ? SHA256_BLOCK_CONSTANTS : SHA256_ROUND_CONSTANTS;
  for (let i = firstRound; i < 64; i++) {
    const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
    const ch = (e & f) ^ (~e & g);
    const t1 = (h + S1 + ch + K[i] + words[i]) >>> 0;
    const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
    const maj = (a & b) ^ (a & c) ^ (b & c);
    const t2 = (S0 + maj) >>> 0;
    h = g; g = f; f = e; e = (d + t1) >>> 0;
    d = c; c = b; b = a; a = (t1 + t2) >>> 0;
  }
  return [a, b, c, d, e, f, g, h];
}

function expandSchedule(words, firstWord = 16) {
  for (let i = firstWord; i < 64; i++) {
    words[i] = (sigma1(words[i - 2]) + words[i - 7] + sigma0(words[i - 15]) + words[i - 16]) >>> 0;
  }
}

function sha256Init(data) {
  // data: Uint8Array, at least 7 bytes; only data[0..6] are used here.
  const words = new Array(64).fill(0);
  words[14] = ((data[0] << 16) | (data[1] << 8) | data[2]) >>> 0;
  words[15] = ((data[3] << 24) | (data[4] << 16) | (data[5] << 8) | data[6]) >>> 0;
  for (let index = 16; index < 30; index++) {
    let value = SHA256_SCHEDULE[index - 16];
    if (index - 2 >= 14) {
      value = (value + (index === 16
        ? (sigma1(words[index - 2]) ^ SHA256_SIGMA1_ADJUSTMENT)
        : sigma1(words[index - 2]))) >>> 0;
    }
    if (index - 7 >= 14) value = (value + words[index - 7]) >>> 0;
    if (index - 15 >= 14) {
      value = (value + (index === 29
        ? (sigma0(words[index - 15]) ^ SHA256_SIGMA0_ADJUSTMENT)
        : sigma0(words[index - 15]))) >>> 0;
    }
    words[index] = value >>> 0;
  }
  words[30] = (sigma1(words[28]) + words[23] + sigma0(words[15]) + words[14]
    + SHA256_ADJUSTMENT - SHA256_ROUND_CONSTANTS[14]) >>> 0;
  expandSchedule(words, 31);
  const working = sha256Rounds(SHA256_STATE, words, 14);
  return SHA256_INITIAL.map((x, i) => (x + working[i]) >>> 0);
}

function sha256Digest(data) {
  // data: Uint8Array (full token string bytes)
  if (data.length < 7) throw new Error('Token salt must contain at least seven bytes');
  const length = 57 + data.length;
  const tail = data.slice(7);
  const padZeros = (((55 - length) % 64) + 64) % 64;
  const padded = new Uint8Array(tail.length + 1 + padZeros + 8);
  padded.set(tail, 0);
  padded[tail.length] = 0x80;
  const bitLen = length * 8;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32), false);
  dv.setUint32(padded.length - 4, bitLen >>> 0, false);
  let state = sha256Init(data.slice(0, 7));
  for (let off = 0; off < padded.length; off += 64) {
    const words = new Array(64).fill(0);
    const wdv = new DataView(padded.buffer, off, 64);
    for (let i = 0; i < 16; i++) words[i] = wdv.getUint32(i * 4, false);
    expandSchedule(words);
    const working = sha256Rounds(state, words);
    state = state.map((x, i) => (x + working[i]) >>> 0);
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  state.forEach((w, i) => odv.setUint32(i * 4, w, false));
  return out;
}

function wordsLE4Even(data) {
  const paddedLen = data.length + (((-data.length) % 4) + 4) % 4;
  const buf = new Uint8Array(paddedLen);
  buf.set(data);
  const words = [];
  const dv = new DataView(buf.buffer);
  for (let i = 0; i < paddedLen; i += 4) words.push(dv.getUint32(i, true));
  if (words.length % 2) words.push(0);
  return words;
}

function cs64Digest(data, digest) {
  // data: Uint8Array (token string bytes); digest: 32-byte sha256Digest output
  const dv = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  const keyA = dv.getUint32(0, true) | 1;
  const keyB = dv.getUint32(4, true) | 1;
  const factors = [Math.imul(keyA, CS64_FACTOR) >>> 0, Math.imul(keyB, CS64_FACTOR) >>> 0];
  const terms = [];
  const offsets = [];
  CS64_COEFFICIENTS.forEach(([coeff, off], index) => {
    terms.push(Math.imul(coeff, factors[index % 2]) >>> 0);
    offsets.push(off);
  });
  const prefixed = new Uint8Array(data.length + 1);
  prefixed[0] = 0;
  prefixed.set(data, 1);
  wordsLE4Even(prefixed).forEach((word, index) => {
    let term = Math.imul(word, index % 2 === 0 ? keyA : keyB) >>> 0;
    let offset = Math.imul(rol16(word), index % 2 === 0 ? 0xEF0569FB : 0xC31713DB) >>> 0;
    if (index === 0) {
      term = (term + Math.imul(CS64_ADJUSTMENT0, factors[0])) >>> 0;
      offset = (offset + CS64_ADJUSTMENT1) >>> 0;
    }
    terms.push(term >>> 0);
    offsets.push(offset >>> 0);
  });
  let swapAcc = 0, swapLast = 0, state = 0, acc = 0;
  for (let index = 0; index < terms.length; index += 2) {
    const x = terms[index], y = terms[index + 1];
    let t = rol16((offsets[index] + x) >>> 0);
    let q = Math.imul(t, 0x76F50F34) >>> 0;
    swapAcc = (swapAcc + ((Math.imul(rol16(q), 0xC3EFEA97) + q) >>> 0)) >>> 0;
    t = rol16((offsets[index + 1] + y) >>> 0);
    q = Math.imul(t, 0x1881CE3C) >>> 0;
    swapLast = (Math.imul(rol16(q), 0x35BD1EC9) + q) >>> 0;
    swapAcc = (swapAcc + swapLast) >>> 0;
    state = (Math.imul(state, keyA) + x) >>> 0;
    state = Math.imul(rol16(state), 0xCF98B111) >>> 0;
    state = Math.imul(rol16(state), 0x87085B9F) >>> 0;
    state = Math.imul(rol16(state), 0x12CEB96D) >>> 0;
    state = Math.imul(rol16(state), 0x257E1D83) >>> 0;
    acc = (acc + state) >>> 0;
    t = (Math.imul(state, keyB) + y) >>> 0;
    t = Math.imul(rol16(t), 0xA27416F5) >>> 0;
    t = Math.imul(rol16(t), 0xD38396FF) >>> 0;
    state = Math.imul(rol16(Math.imul(rol16(t), 0x7C932B89) >>> 0), 0xBFA49F69) >>> 0;
    acc = (acc + state) >>> 0;
  }
  return [(swapLast ^ state) >>> 0, (swapAcc ^ acc) >>> 0];
}

const u32leHex = (w) => [w & 0xff, (w >>> 8) & 0xff, (w >>> 16) & 0xff, (w >>> 24) & 0xff]
  .map((b) => b.toString(16).padStart(2, '0')).join('');

export function generateSecMsGecV2(unixSeconds = Date.now() / 1000) {
  // Mirrors Python: float ticks, 5-minute bucket, *1e7, f"{ticks:.0f}".
  let ticks = unixSeconds + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= 1e7;
  const str = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
  const data = new TextEncoder().encode(str);
  const digest = sha256Digest(data);
  const [w0, w1] = cs64Digest(data, digest);
  const cs64 = (u32leHex(w0) + u32leHex(w1)).toUpperCase();
  const sha = [...digest].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${cs64}-${sha}`;
}

export function generateMuid() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
