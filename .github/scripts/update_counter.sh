#!/usr/bin/env bash
# Save as: .github/scripts/update_counter.sh
# in your Venombolteop/Venombolteop profile repo.
#
# Fetches the last 14 days of repo views from the GitHub Traffic API,
# adds any NEW views (not already counted) to a running total stored in
# .github/view_count.txt, then updates the counter line in README.md.

set -euo pipefail

COUNT_FILE=".github/view_count.txt"
LAST_SEEN_FILE=".github/last_seen_date.txt"
README="README.md"

mkdir -p .github

# Initialize files if they don't exist yet
if [ ! -f "$COUNT_FILE" ]; then
  echo "0" > "$COUNT_FILE"
fi
if [ ! -f "$LAST_SEEN_FILE" ]; then
  echo "1970-01-01" > "$LAST_SEEN_FILE"
fi

TOTAL=$(cat "$COUNT_FILE")
LAST_SEEN=$(cat "$LAST_SEEN_FILE")

# Fetch traffic data (requires GH_TOKEN with repo scope; default GITHUB_TOKEN works for public repos)
TRAFFIC=$(curl -s \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO}/traffic/views")

# Parse each day's uniques/count, only add days newer than LAST_SEEN
NEW_TOTAL=$TOTAL
NEWEST_DATE=$LAST_SEEN

while IFS=$'\t' read -r day count; do
  [ -z "$day" ] && continue
  if [[ "$day" > "$LAST_SEEN" ]]; then
    NEW_TOTAL=$((NEW_TOTAL + count))
  fi
  if [[ "$day" > "$NEWEST_DATE" ]]; then
    NEWEST_DATE="$day"
  fi
done < <(echo "$TRAFFIC" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for entry in data.get('views', []):
    print(f\"{entry['timestamp'][:10]}\t{entry['count']}\")
")

echo "$NEW_TOTAL" > "$COUNT_FILE"
echo "$NEWEST_DATE" > "$LAST_SEEN_FILE"

# Update README badge line
# Looks for a line containing VISITOR_COUNT_BADGE marker and replaces the number
BADGE_LINE="![Profile Views](https://img.shields.io/badge/Profile%20Views-${NEW_TOTAL}-blue?style=for-the-badge) <!-- VISITOR_COUNT_BADGE -->"

if grep -q "VISITOR_COUNT_BADGE" "$README"; then
  # Replace existing badge line
  python3 - "$README" "$BADGE_LINE" <<'EOF'
import sys
readme_path, new_line = sys.argv[1], sys.argv[2]
with open(readme_path, "r") as f:
    lines = f.readlines()
with open(readme_path, "w") as f:
    for line in lines:
        if "VISITOR_COUNT_BADGE" in line:
            f.write(new_line + "\n")
        else:
            f.write(line)
EOF
else
  echo "Warning: no VISITOR_COUNT_BADGE marker found in README.md — add one manually."
fi

echo "Updated visitor count to: $NEW_TOTAL"
