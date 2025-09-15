#!/bin/bash
# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Copy Latest OTP from Messages
# @raycast.mode silent
# @raycast.packageName 2FA
# Optional parameters:
# @raycast.icon ✉️
# @raycast.argument1 { "type": "text", "optional": true, "placeholder": "digits(6),4-8,etc.", "percentEncoded": false }
# Documentation:
# @raycast.description Find the most recent numeric code (default: 6 digits) in macOS Messages DB and copy to clipboard.

DB="$HOME/Library/Messages/chat.db"
if [ ! -f "$DB" ]; then
  echo "Messages DB not found."
  exit 1
fi

# 기본은 6자리. 필요시 인자로 4-8 같은 패턴을 줄 수 있음.
DIGIT_LEN="${1:-6}"

# 최근 메시지 150개 텍스트에서 숫자코드 추출
# macOS Messages DB time filtering이 까다로워 단순히 최신순으로 가져와서 첫 매칭을 사용.
TEXTS=$(sqlite3 "$DB" "SELECT text FROM message WHERE text IS NOT NULL ORDER BY date DESC LIMIT 150;")

# 일반적으로 쓰는 패턴: 6자리 정수. 원하면 4~8 자리로 변경: {4,8}
REGEX="\\b[0-9]{${DIGIT_LEN}}\\b"

CODE=$(echo "$TEXTS" | grep -Eo "$REGEX" | head -n 1)

if [ -n "$CODE" ]; then
  printf "%s" "$CODE" | pbcopy
  echo "Copied OTP: $CODE"
else
  # 하이픈/공백 포함 패턴도 탐색(예: 123-456, 123 456 → 6자리로 정규화)
  RAW=$(echo "$TEXTS" | grep -Eo "\\b[0-9][0-9 -]{${DIGIT_LEN}-1}[0-9]\\b" | head -n 1)
  NORM=$(echo "$RAW" | tr -d ' -')
  if [[ "$NORM" =~ ^[0-9]{${DIGIT_LEN}}$ ]]; then
    printf "%s" "$NORM" | pbcopy
    echo "Copied OTP: $NORM"
  else
    echo "No OTP code found."
    exit 2
  fi
fi
