#!/usr/bin/env bash
# Prepare the Capacitor webDir from the live-site source of truth (final-deploy).
# The APK opens the USER APP directly, not the landing page, so the bundled
# root index.html is a tiny redirect to app/index.html.
# Usage: bash android-app/scripts/prepare-www.sh   (run from the repo root)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
rm -rf "$ROOT/android-app/www"
mkdir -p "$ROOT/android-app/www"
cp -r "$ROOT/final-deploy/." "$ROOT/android-app/www/"
cat > "$ROOT/android-app/www/index.html" <<'EOF'
<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VoiceWorld AI</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#0B1026;color:#fff;font-family:system-ui,sans-serif}</style>
<script>location.replace('app/index.html');</script>
</head><body><p>Loading VoiceWorld AI…</p></body></html>
EOF
echo "www prepared: $(find "$ROOT/android-app/www" -type f | wc -l) files"
