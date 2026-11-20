# Rút gọn output `--output-format stream-json`: mỗi lời gọi tool một dòng kèm tham số,
# mỗi kết quả tool một dòng kèm nội dung (cắt ở 230 ký tự), cuối cùng là câu trả lời của model.
# Dùng:  claude -p "..." --output-format stream-json --verbose | jq -rf trace.jq
def clip: if length > 230 then .[0:230] + "…" else . end;
def body: if type == "array" then (map(select(.type == "text") | .text) | join(" ")) else (. // "" | tostring) end;
if .type == "system" and .subtype == "init" then
  "system/init   tool của server shop: \([.tools[] | select(startswith("mcp__shop__")) | sub("mcp__shop__"; "")] | join(", ") | if . == "" then "(không có)" else . end)"
elif .type == "assistant" then
  .message.content[]
  | if .type == "tool_use" then
      "assistant  → tool_use: \(.name | sub("mcp__shop__"; "shop/")) \(.input | tojson)"
    elif .type == "text" then
      "assistant  → text (\(.text | length) ký tự)"
    else empty end
elif .type == "user" then
  (.message.content | if type == "array" then .[] else empty end)
  | select(.type == "tool_result")
  | "user       ← tool_result" + (if .is_error then " [is_error]" else "" end) + ": \(.content | body | gsub("\n"; " ") | clip)"
elif .type == "result" then
  "result        subtype=\(.subtype) turns=\(.num_turns)",
  (if .result then "---", .result else empty end)
else empty end
