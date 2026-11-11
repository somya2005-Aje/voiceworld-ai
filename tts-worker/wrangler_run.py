#!/usr/bin/env python3
"""Run wrangler with the Cloudflare credential (same pattern as deploy-worker.py).
Usage: python3 wrangler_run.py <wrangler args...>
Stdin is passed through (for `wrangler secret put`)."""
import os
import subprocess
import sys

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import dynamic_credential_entry

ACCOUNT_ID = "617e5ccdaae4cb0e07706e4e3a012801"


def main() -> int:
    entry = dynamic_credential_entry("custom.cloudflare")
    env = dict(os.environ)
    env["CLOUDFLARE_API_TOKEN"] = str(entry["surrogate"]).strip()
    env["CLOUDFLARE_ACCOUNT_ID"] = ACCOUNT_ID
    cmd = ["npx", "--yes", "wrangler@4.160.0"] + sys.argv[1:]
    proc = subprocess.run(cmd, cwd=os.path.expanduser("~/workspace/voiceworld-ai/tts-worker"), env=env)
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
