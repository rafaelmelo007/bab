#!/usr/bin/env bash
# AC-06: Cold-install harness — measures time from npm i start to first streamed token.
# Uses stub provider (D-07) to isolate ulm onboarding latency from provider cold-start.
# Fails if wall-clock > 120 s. Emits JSON timing artifact at $ARTIFACT_PATH.
set -euo pipefail

ARTIFACT_PATH="${ARTIFACT_PATH:-/tmp/cold-install-timing.json}"
MAX_SECONDS=120

start=$(date +%s%N)

# Install ulm (version from $ULM_VERSION env or latest)
npm install -g "${ULM_VERSION:+ulm@$ULM_VERSION}" "${ULM_VERSION:-ulm}"

# Run stub provider ping — stub must be on PATH or pointed to by ULM_STUB_PATH
STUB_PATH="${ULM_STUB_PATH:-$(npm root -g)/ulm/tests/onboarding/fixtures/ulm-stub-provider.mjs}"
export ULM_STUB_PROVIDER_PATH="$STUB_PATH"

ulm -p stub "ping"

end=$(date +%s%N)

elapsed_ms=$(( (end - start) / 1000000 ))
elapsed_s=$(( elapsed_ms / 1000 ))

cat > "$ARTIFACT_PATH" <<JSON
{
  "elapsed_ms": $elapsed_ms,
  "elapsed_s": $elapsed_s,
  "limit_s": $MAX_SECONDS,
  "pass": $([ $elapsed_s -le $MAX_SECONDS ] && echo true || echo false),
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

echo "Cold-install timing: ${elapsed_s}s (limit: ${MAX_SECONDS}s)"
cat "$ARTIFACT_PATH"

if [ "$elapsed_s" -gt "$MAX_SECONDS" ]; then
  echo "FAIL: cold-install exceeded ${MAX_SECONDS}s limit (AC-06 G-05)"
  exit 1
fi

echo "PASS: cold-install within ${MAX_SECONDS}s"
