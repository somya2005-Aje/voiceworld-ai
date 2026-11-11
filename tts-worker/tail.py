import os, subprocess, sys
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import dynamic_credential_entry
entry = dynamic_credential_entry("custom.cloudflare")
env = dict(os.environ)
env["CLOUDFLARE_API_TOKEN"] = str(entry["surrogate"]).strip()
env["CLOUDFLARE_ACCOUNT_ID"] = "617e5ccdaae4cb0e07706e4e3a012801"
proc = subprocess.run(["npx","--yes","wrangler@4.160.0","tail","voiceworld-tts-test"], cwd=os.path.expanduser("~/workspace/voiceworld-ai/tts-worker"), env=env)
