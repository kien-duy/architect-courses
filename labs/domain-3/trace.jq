# Rút gọn output `--output-format stream-json` thành một dòng cho mỗi bước của vòng lặp.
# Dùng:  claude -p "..." --output-format stream-json --verbose | jq -rf trace.jq
if .type == "system" and .subtype == "init" then
  "system/init   model=\(.model)"
elif .type == "assistant" then
  .message.content[]
  | if .type == "tool_use" then
      "assistant  → tool_use: \(.name)" +
      (if .name == "Skill" then " (skill: \(.input.skill // "?"), args: \(.input.args // ""))"
       elif .name == "Read" then " (\(.input.file_path | split("/") | .[-2:] | join("/")))"
       else "" end)
    elif .type == "text" then
      "assistant  → text (\(.text | length) ký tự)"
    else empty end
elif .type == "user" then
  (.message.content | if type == "array" then .[] else empty end)
  | select(.type == "tool_result")
  | "user       ← tool_result" + (if .is_error then " (LỖI/BỊ CHẶN)" else "" end)
elif .type == "result" then
  "result        subtype=\(.subtype) turns=\(.num_turns) stop_reason=\(.stop_reason // "null")"
else empty end
