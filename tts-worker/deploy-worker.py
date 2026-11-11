#!/usr/bin/env python3
"""Deploy the VoiceWorld TTS *test* Worker ONLY (never the 'voiceworld-ai' Pages site).
Same credential pattern as ~/workspace/voiceworld-ai/deploy.py.
"""
import os
import subprocess
import sys

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import dynamic_credential_entry

PROJECT_DIR = os.path.expanduser("~/workspace/voiceworld-ai/tts-worker")
ACCOUNT_ID = "617e5ccdaae4cb0e07706e4e3a012801"


def main() -> int:
    entry = dynamic_credential_entry("custom.cloudflare")
    surrogate = str(entry["surrogate"]).strip()
    env = dict(os.environ)
    env["CLOUDFLARE_API_TOKEN"] = surrogate
    env["CLOUDFLARE_ACCOUNT_ID"] = ACCOUNT_ID
    cmd = ["npx", "--yes", "wrangler@4.160.0", "deploy"]
    proc = subprocess.run(cmd, cwd=PROJECT_DIR, env=env)
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
