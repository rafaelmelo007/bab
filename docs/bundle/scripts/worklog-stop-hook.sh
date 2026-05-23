#!/usr/bin/env bash
# worklog-stop-hook.sh — reference implementation of the Stop hook contract
# defined in vertical-slices-ai-framework.md §5.2.
#
# Receives the Stop event JSON on stdin and appends one row to
# $cwd/docs/worklog/$(date -u +%Y-%m-%d).md, creating the file with the §5.1
# header if missing.
#
# Honors:
#   - INV-3 (fail loud): token column prefixed ~, [HOOK FAILURE] on error
#   - §5.2 step 6: sanitize markdown-breaking chars (|, newline, backtick)
#   - §5.2 step 4: agent detection priority order (transcript Agent invocations
#     → prompt regex → fallback "claude")
#
# Dependencies: bash 4+, jq, date, awk, grep, wc
# Tested on: macOS bash 3.2+ (with jq), Linux bash 4+, Git Bash on Windows.

set -uo pipefail

#-----------------------------------------------------------------------------
# 1. Read stdin payload and extract fields the spec calls for
#-----------------------------------------------------------------------------
PAYLOAD="$(cat)"
if [ -z "$PAYLOAD" ]; then
  echo "[worklog-stop-hook] no stdin payload — Stop hook misconfigured?" >&2
  exit 1
fi

SESSION_ID="$(echo "$PAYLOAD" | jq -r '.session_id // empty')"
CWD="$(echo "$PAYLOAD"        | jq -r '.cwd        // empty')"
TRANSCRIPT_PATH="$(echo "$PAYLOAD" | jq -r '.transcript_path // empty')"

if [ -z "$CWD" ] || [ -z "$TRANSCRIPT_PATH" ]; then
  echo "[worklog-stop-hook] payload missing required fields (cwd, transcript_path)" >&2
  exit 1
fi

#-----------------------------------------------------------------------------
# 2. Resolve today's worklog file and create with §5.1 header if missing
#-----------------------------------------------------------------------------
TODAY="$(date -u +%Y-%m-%d)"
NOW_HHMM="$(date -u +%H:%M)"
WORKLOG_DIR="$CWD/docs/worklog"
WORKLOG_FILE="$WORKLOG_DIR/$TODAY.md"
STATE_FILE="$CWD/.claude/.worklog-state-$TODAY.json"

mkdir -p "$WORKLOG_DIR"
mkdir -p "$(dirname "$STATE_FILE")"

if [ ! -f "$WORKLOG_FILE" ]; then
  cat > "$WORKLOG_FILE" <<EOF
# Work Log — $TODAY

## $NOW_HHMM UTC

| # | Command / Prompt | Agent(s) | Duration | Tokens (est.) | Outcome |
|---|-----------------|----------|----------|---------------|---------|
EOF
fi

#-----------------------------------------------------------------------------
# 3. Compute duration since previous entry (or 0 if first of the day)
#    Per spec §5.2 step 2.
#-----------------------------------------------------------------------------
if [ -f "$STATE_FILE" ]; then
  PREV_EPOCH="$(jq -r '.last_epoch // 0' "$STATE_FILE")"
  PREV_BYTES="$(jq -r '.last_transcript_bytes // 0' "$STATE_FILE")"
  PREV_ROWS="$(jq -r '.row_count // 0' "$STATE_FILE")"
else
  PREV_EPOCH=0
  PREV_BYTES=0
  PREV_ROWS=0
fi

NOW_EPOCH="$(date -u +%s)"
if [ "$PREV_EPOCH" -gt 0 ]; then
  DURATION_SEC=$((NOW_EPOCH - PREV_EPOCH))
  if [ "$DURATION_SEC" -ge 60 ]; then
    DURATION="$((DURATION_SEC / 60)) min"
  else
    DURATION="${DURATION_SEC}s"
  fi
else
  DURATION="0s"
fi

#-----------------------------------------------------------------------------
# 4. Estimate tokens from transcript delta (wc -c since previous entry / 4)
#    Per spec §5.2 step 3. Always prefixed ~ per INV-3 honesty rule.
#-----------------------------------------------------------------------------
if [ -f "$TRANSCRIPT_PATH" ]; then
  CUR_BYTES="$(wc -c < "$TRANSCRIPT_PATH" | tr -d ' ')"
else
  CUR_BYTES=0
fi
DELTA_BYTES=$((CUR_BYTES - PREV_BYTES))
[ "$DELTA_BYTES" -lt 0 ] && DELTA_BYTES=0
TOKENS_EST=$((DELTA_BYTES / 4))
if [ "$TOKENS_EST" -ge 1000 ]; then
  TOKENS="~$((TOKENS_EST / 1000))k"
else
  TOKENS="~${TOKENS_EST}"
fi

#-----------------------------------------------------------------------------
# 5. Extract the latest user prompt + agent identity from the transcript
#    Per spec §5.2 step 4. Claude Code transcripts are JSONL.
#-----------------------------------------------------------------------------
extract_last_user_prompt() {
  # Last JSONL line where .type=="user" or .role=="user" — grab first ~200 chars.
  tail -n 200 "$TRANSCRIPT_PATH" 2>/dev/null | \
    awk '/"role":"user"/ || /"type":"user"/' | \
    tail -n 1 | \
    jq -r '.message.content // .content // .text // ""' 2>/dev/null | \
    head -c 200
}

extract_last_assistant_first_line() {
  tail -n 500 "$TRANSCRIPT_PATH" 2>/dev/null | \
    awk '/"role":"assistant"/ || /"type":"assistant"/' | \
    tail -n 1 | \
    jq -r '.message.content // .content // .text // ""' 2>/dev/null | \
    head -n 1 | head -c 200
}

extract_agent_invocations() {
  # Spec §5.2 step 4(a): parse Agent-tool-invocation lines from transcript delta.
  # Look for "subagent_type" assignments in tool_use blocks since PREV_BYTES.
  tail -c $((CUR_BYTES - PREV_BYTES + 1)) "$TRANSCRIPT_PATH" 2>/dev/null | \
    grep -oE '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]+"' | \
    sed -E 's/.*"subagent_type"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' | \
    sort -u | \
    paste -sd ',' -
}

PROMPT_RAW="$(extract_last_user_prompt)"
OUTCOME_RAW="$(extract_last_assistant_first_line)"
AGENTS_RAW="$(extract_agent_invocations)"

# Agent detection fallback chain per spec §5.2 step 4
if [ -z "$AGENTS_RAW" ]; then
  # 4(b): regex-match agent slugs from spec §2.1 against the prompt
  AGENTS_RAW="$(echo "$PROMPT_RAW" | \
    grep -oE '(product-owner|task-manager|backend-lead|frontend-lead|db-architect|testing-lead|devops-lead|security-specialist|perf-specialist|prompt-engineer|ux-specialist)' | \
    sort -u | paste -sd ',' -)"
fi
if [ -z "$AGENTS_RAW" ]; then
  # 4(c): fall back to "claude"
  AGENTS_RAW="claude"
fi

[ -z "$PROMPT_RAW" ]  && PROMPT_RAW="(no prompt captured)"
[ -z "$OUTCOME_RAW" ] && OUTCOME_RAW="(no outcome captured)"

#-----------------------------------------------------------------------------
# 6. Sanitize markdown-breaking chars per spec §5.2 step 6
#-----------------------------------------------------------------------------
sanitize() {
  # Replace | with \| , any newline/CR with single space, backtick with apostrophe.
  printf '%s' "$1" | tr '\n\r' '  ' | sed -e 's/|/\\|/g' -e "s/\`/'/g"
}

PROMPT_CLEAN="$(sanitize "$PROMPT_RAW")"
AGENTS_CLEAN="$(sanitize "$AGENTS_RAW")"
OUTCOME_CLEAN="$(sanitize "$OUTCOME_RAW")"

#-----------------------------------------------------------------------------
# 7. Append the row
#-----------------------------------------------------------------------------
ROW_NUM=$((PREV_ROWS + 1))
echo "| $ROW_NUM | $PROMPT_CLEAN | $AGENTS_CLEAN | $DURATION | $TOKENS | $OUTCOME_CLEAN |" >> "$WORKLOG_FILE"

#-----------------------------------------------------------------------------
# 8. Update state file for next invocation
#-----------------------------------------------------------------------------
cat > "$STATE_FILE" <<EOF
{
  "last_epoch": $NOW_EPOCH,
  "last_transcript_bytes": $CUR_BYTES,
  "row_count": $ROW_NUM,
  "session_id": "$SESSION_ID"
}
EOF

#-----------------------------------------------------------------------------
# 9. INV-3 overhead-warn: a single command exceeding 50% of weekly budget
#    triggers a **[OVERHEAD WARN]** line per spec §5.3.
#    Default budget: 100,000 tokens/week → 50% threshold = 50,000 tokens.
#    Budget override read from CLAUDE.md if present.
#-----------------------------------------------------------------------------
BUDGET=100000
if [ -f "$CWD/CLAUDE.md" ]; then
  OVERRIDE="$(grep -E '^\*\*Weekly token budget:\*\*' "$CWD/CLAUDE.md" 2>/dev/null | grep -oE '[0-9]+' | head -n 1)"
  [ -n "$OVERRIDE" ] && BUDGET="$OVERRIDE"
fi
THRESHOLD=$((BUDGET / 2))
if [ "$TOKENS_EST" -gt "$THRESHOLD" ]; then
  echo "**[OVERHEAD WARN]** single turn used ~${TOKENS_EST} tokens (> 50% of weekly budget ${BUDGET})" >> "$WORKLOG_FILE"
  echo "[worklog-stop-hook] OVERHEAD WARN: single turn used ~${TOKENS_EST} tokens (> 50% of ${BUDGET} weekly budget)" >&2
fi

exit 0
