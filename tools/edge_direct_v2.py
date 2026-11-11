"""Minimal edge-tts client over a raw socket through the egress proxy.

Bypasses aiohttp's strict WS-handshake validation which the egress proxy breaks.
Reuses edge_tts.drm for the auth token. Protocol mirrors edge_tts.communicate.
"""
import base64
import hashlib
import os
import secrets
import socket
import ssl
import struct
import sys
import uuid
from urllib.parse import urlparse

from edge_tts.drm import DRM, TRUSTED_CLIENT_TOKEN

HOST = "speech.platform.bing.com"
WSS_PATH_TMPL = ("/consumer/speech/synthesize/readaloud/edge/v1"
                 "?TrustedClientToken={token}&ConnectionId={conn_id}")


def _parse_proxy():
    raw = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")
    u = urlparse(raw)
    auth = None
    if u.username:
        auth = base64.b64encode(f"{u.username}:{u.password or ''}".encode()).decode()
    return u.hostname, u.port or 3128, auth


def _connect_via_proxy():
    phost, pport, auth = _parse_proxy()
    s = socket.create_connection((phost, pport), timeout=30)
    req = f"CONNECT {HOST}:443 HTTP/1.1\r\nHost: {HOST}:443\r\n"
    if auth:
        req += f"Proxy-Authorization: Basic {auth}\r\n"
    req += "\r\n"
    s.sendall(req.encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        chunk = s.recv(4096)
        if not chunk:
            raise RuntimeError("proxy closed connection during CONNECT")
        resp += chunk
    status = resp.split(b"\r\n", 1)[0]
    if b"200" not in status:
        raise RuntimeError(f"proxy CONNECT failed: {status!r}")
    ctx = ssl.create_default_context()
    return ctx.wrap_socket(s, server_hostname=HOST)


def _ws_handshake(sock, path):
    key = base64.b64encode(secrets.token_bytes(16)).decode()
    conn_id = uuid.uuid4().hex.replace("-", "")
    gec = DRM.generate_sec_ms_gec()
    full_path = path.format(token=TRUSTED_CLIENT_TOKEN, conn_id=conn_id)
    headers = [
        f"GET {full_path}&Sec-MS-GEC={gec}&Sec-MS-GEC-Version=2-143.0.3650.75 HTTP/1.1",
        f"Host: {HOST}",
        "Connection: Upgrade",
        "Upgrade: websocket",
        "Sec-WebSocket-Version: 13",
        f"Sec-WebSocket-Key: {key}",
        "Pragma: no-cache",
        "Cache-Control: no-cache",
        "Accept-Encoding: gzip, deflate, br, zstd",
        "Accept-Language: en-US,en;q=0.9",
        "Origin: chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
    ]
    sock.sendall(("\r\n".join(headers) + "\r\n\r\n").encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        chunk = sock.recv(4096)
        if not chunk:
            raise RuntimeError("connection closed during WS handshake")
        resp += chunk
    status = resp.split(b"\r\n", 1)[0]
    if b"101" not in status:
        raise RuntimeError(f"WS handshake failed: {status!r} :: {resp[:400]!r}")
    return conn_id


def _recv_exact(sock, n):
    data = b""
    while len(data) < n:
        chunk = sock.recv(n - len(data))
        if not chunk:
            raise RuntimeError("connection closed mid-frame")
        data += chunk
    return data


def ws_send_text(sock, payload: bytes):
    mask = secrets.token_bytes(4)
    ln = len(payload)
    if ln < 126:
        hdr = struct.pack("!BB", 0x81, 0x80 | ln)
    elif ln < 65536:
        hdr = struct.pack("!BBH", 0x81, 0x80 | 126, ln)
    else:
        hdr = struct.pack("!BBQ", 0x81, 0x80 | 127, ln)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    sock.sendall(hdr + mask + masked)


def ws_recv(sock):
    """Returns (opcode, payload). Handles fragmentation + control frames."""
    chunks = []
    while True:
        b1, b2 = struct.unpack("!BB", _recv_exact(sock, 2))
        fin = b1 & 0x80
        opcode = b1 & 0x0F
        ln = b2 & 0x7F
        if ln == 126:
            ln = struct.unpack("!H", _recv_exact(sock, 2))[0]
        elif ln == 127:
            ln = struct.unpack("!Q", _recv_exact(sock, 8))[0]
        if b2 & 0x80:
            _recv_exact(sock, 4)  # server frames are unmasked; skip if set
        payload = _recv_exact(sock, ln) if ln else b""
        if opcode == 0x8:
            raise RuntimeError("server closed WS connection")
        if opcode == 0x9:  # ping -> pong
            sock.sendall(struct.pack("!BB", 0x8A, 0x00))
            continue
        if opcode in (0x1, 0x2, 0x0):
            chunks.append(payload)
            if fin:
                return opcode, b"".join(chunks)
        # ignore other control frames


def _msg(headers: str, body: str = "") -> bytes:
    return (headers + "\r\n\r\n" + body).encode("utf-8")


def synthesize(text, voice, out_path, rate=None, pitch=None):
    sock = _connect_via_proxy()
    try:
        conn_id = _ws_handshake(sock, WSS_PATH_TMPL)
        request_id = uuid.uuid4().hex.replace("-", "")

        config = _msg(
            "X-Timestamp:0\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config",
            '{"context":{"synthesis":{"audio":{"metadataoptions":'
            '{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},'
            '"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}',
        )
        ws_send_text(sock, config)

        prosody = ""
        if rate or pitch:
            attrs = ""
            if rate:
                attrs += f" rate='{rate}'"
            if pitch:
                attrs += f" pitch='{pitch}'"
            inner_open, inner_close = f"<prosody{attrs}>", "</prosody>"
        else:
            inner_open, inner_close = "", ""
        # escape XML special chars in text
        esc = (text.replace("&", "&amp;").replace("<", "&lt;")
                   .replace(">", "&gt;"))
        ssml = (f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' "
                f"xml:lang='hi-IN'><voice name='{voice}'>"
                f"{inner_open}{esc}{inner_close}</voice></speak>")
        ws_send_text(sock, _msg(
            f"X-RequestId:{request_id}\r\nContent-Type:application/ssml+xml\r\n"
            f"X-Timestamp:0\r\nPath:ssml", ssml))

        audio = bytearray()
        while True:
            _opcode, payload = ws_recv(sock)
            if b"Path:turn.end" in payload[:2000]:
                break
            if b"Path:audio" in payload[:2000]:
                # binary message: 2-byte big-endian header length, then headers, then audio
                hlen = int.from_bytes(payload[0:2], "big")
                audio.extend(payload[2 + hlen:])
        if not audio:
            raise RuntimeError("no audio received from TTS service")
        with open(out_path, "wb") as f:
            f.write(audio)
        return len(audio)
    finally:
        try:
            sock.close()
        except Exception:
            pass


if __name__ == "__main__":
    # usage: edge_direct.py <voice> <out.mp3> [rate] [pitch] ; text via stdin
    voice, out = sys.argv[1], sys.argv[2]
    rate = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "-" else None
    pitch = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "-" else None
    text = sys.stdin.read().strip()
    n = synthesize(text, voice, out, rate, pitch)
    print(f"OK {out} {n} bytes")
