#!/usr/bin/env bash
# Maintain a cumulative observed repository-view counter using GitHub's
# 14-day traffic API. Daily snapshots are diffed to avoid double-counting
# overlapping API windows.

set -euo pipefail

COUNT_FILE=".github/view_count.txt"
STATE_FILE=".github/traffic_views.json"
LAST_SEEN_FILE=".github/last_seen_date.txt"
README="README.md"

mkdir -p .github
[[ -f "$COUNT_FILE" ]] || printf '0\n' > "$COUNT_FILE"
[[ -f "$STATE_FILE" ]] || printf '{}\n' > "$STATE_FILE"
[[ -f "$LAST_SEEN_FILE" ]] || printf '1970-01-01\n' > "$LAST_SEEN_FILE"

TOTAL="$(cat "$COUNT_FILE")"
[[ "$TOTAL" =~ ^[0-9]+$ ]] || { echo "Invalid counter value in $COUNT_FILE" >&2; exit 1; }

TRAFFIC="$(curl --fail --silent --show-error \
  -H "Authorization: Bearer \${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/\${REPO}/traffic/views")"

TRAFFIC_JSON="$TRAFFIC" python3 - "$COUNT_FILE" "$STATE_FILE" "$LAST_SEEN_FILE" "$README" "$TOTAL" <<'PY'
import json
import os
import sys
from datetime import date, timedelta

count_path, state_path, last_seen_path, readme_path, total_arg = sys.argv[1:]
with open(state_path, encoding="utf-8") as f:
    previous = json.load(f)
if not isinstance(previous, dict):
    raise SystemExit("Traffic state must be a JSON object")

payload = os.environ.get("TRAFFIC_JSON", "")
if not payload:
    raise SystemExit("Missing traffic API response")
data = json.loads(payload)
if "message" in data and "views" not in data:
    raise SystemExit("GitHub Traffic API error: " + str(data["message"]))
views = data.get("views")
if not isinstance(views, list):
    raise SystemExit("GitHub Traffic API response has no views array")

total = int(total_arg)
next_state = dict(previous)
latest = "1970-01-01"
for entry in views:
    day = str(entry.get("timestamp", ""))[:10]
    try:
        date.fromisoformat(day)
        current = int(entry.get("count", 0))
    except (ValueError, TypeError):
        continue
    old = int(previous.get(day, 0))
    if current > old:
        total += current - old
    next_state[day] = max(current, old)
    latest = max(latest, day)

cutoff = (date.today() - timedelta(days=20)).isoformat()
next_state = {day: count for day, count in next_state.items() if day >= cutoff}
with open(count_path, "w", encoding="utf-8") as f:
    f.write(f"{total}\n")
with open(state_path, "w", encoding="utf-8") as f:
    json.dump(next_state, f, indent=2, sort_keys=True)
    f.write("\n")
with open(last_seen_path, "w", encoding="utf-8") as f:
    f.write(latest + "\n")

badge = f"![Repository Views](https://img.shields.io/badge/Repository%20Views-{total}-2F81F7?style=flat&logo=github&labelColor=161B22) <!-- VISITOR_COUNT_BADGE -->"
with open(readme_path, encoding="utf-8") as f:
    lines = f.readlines()
found = False
with open(readme_path, "w", encoding="utf-8") as f:
    for line in lines:
        if "VISITOR_COUNT_BADGE" in line and "img.shields.io" in line:
            f.write(badge + "\n")
            found = True
        else:
            f.write(line)
if not found:
    raise SystemExit("README.md is missing the VISITOR_COUNT_BADGE marker")
print(f"Updated observed repository-view counter to: {total}")
PY
