#!/usr/bin/env bash
# Bước review tự động kiểu CI: review một file và trả mã thoát cho pipeline.
# Dùng:  ./ci-review.sh <file> [số-turn-tối-đa]
#   mã thoát 0 = đạt, 1 = có vi phạm mức high, 2 = lượt chạy không cho ra kết quả hợp lệ
set -euo pipefail
cd "$(dirname "$0")"

FILE="${1:?Thiếu đường dẫn file cần review}"
MAX_TURNS="${2:-8}"

# -p: chạy một lượt rồi thoát. < /dev/null: không chờ stdin.
# --allowedTools: chỉ tự duyệt tool đọc. --max-turns: chặn vòng lặp chạy quá dài.
OUT=$(claude -p "Review file $FILE theo quy ước của dự án. Chỉ báo vi phạm quy ước và lỗi ảnh hưởng tới tính đúng. verdict là fail nếu có ít nhất một finding mức high." \
  --model haiku \
  --allowedTools "Read,Grep,Glob" \
  --max-turns "$MAX_TURNS" \
  --output-format json \
  --json-schema "$(cat review-schema.json)" < /dev/null) || true

# Kiểm tra lượt chạy trước khi tin vào dữ liệu.
if [ "$(jq -r '.subtype // "none"' <<<"$OUT")" != "success" ] || [ "$(jq 'has("structured_output")' <<<"$OUT")" != "true" ]; then
  echo "REVIEW KHÔNG HOÀN TẤT: subtype=$(jq -r '.subtype // "none"' <<<"$OUT")" >&2
  exit 2
fi

jq '.structured_output' <<<"$OUT" > out/review.json
jq -r '.findings[] | "\(.file):\(.line) [\(.severity)] \(.message)"' out/review.json

VERDICT=$(jq -r '.verdict' out/review.json)
echo "verdict=$VERDICT findings=$(jq '.findings | length' out/review.json)"
[ "$VERDICT" = "pass" ]
