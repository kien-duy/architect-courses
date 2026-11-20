# Rút gọn output `--output-format stream-json` thành một dòng cho mỗi bước của vòng lặp.
# Dùng:  claude -p "..." --output-format stream-json --verbose | jq -rf trace.jq
def who: if .parent_tool_use_id then "  [subagent] " else "" end;
if .type == "system" and .subtype == "init" then
  "system/init   model=\(.model)"
elif .type == "assistant" then
  . as $m
  | .message.content[]
  | if .type == "tool_use" then
      "\($m | who)assistant  → tool_use: \(.name)" +
      (if .name == "Agent" or .name == "Task" then " (subagent: \(.input.subagent_type // "general-purpose"))" else "" end)
    elif .type == "text" then
      "\($m | who)assistant  → text (\(.text | length) ký tự)"
    else empty end
elif .type == "user" then
  . as $m
  | (.message.content | if type == "array" then .[] else empty end)
  | select(.type == "tool_result")
  | "\($m | who)user       ← tool_result" + (if .is_error then " (LỖI/BỊ CHẶN)" else "" end)
elif .type == "result" then
  "result        subtype=\(.subtype) turns=\(.num_turns) stop_reason=\(.stop_reason // "null")"
else empty end
