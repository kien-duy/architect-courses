---
title: 1.5 · Hooks và ép buộc quy trình
description: Dùng hook để chặn, sửa và chuẩn hóa lời gọi tool; phân biệt ép buộc bằng code với chỉ dẫn trong prompt.
lesson:
  day: 3
  minutes: 15
quiz:
  - q: "Production logs show that in 12% of cases a support agent calls `process_refund` without first verifying the customer with `get_customer`, occasionally refunding the wrong account. The business requires verification before every refund. Which change is most effective?"
    options:
      - text: "Add few-shot examples showing `get_customer` being called before `process_refund`"
        why: "Ví dụ few-shot làm tăng xác suất model làm đúng, nhưng vẫn là xác suất. Với thao tác tài chính, 'thường đúng' là chưa đủ."
      - text: "Strengthen the system prompt: 'ALWAYS verify the customer before any refund'"
        why: "Chỉ dẫn trong prompt, kể cả viết hoa, không đảm bảo được tuân thủ 100%. Tỉ lệ sai có thể giảm nhưng không về 0."
      - text: "Add a programmatic prerequisite that blocks `process_refund` until `get_customer` has returned a verified customer ID"
        why: "Đúng. Một điều kiện tiên quyết bằng code (ví dụ hook `PreToolUse`) chặn lời gọi một cách xác định, không phụ thuộc vào việc model có nhớ quy tắc hay không."
      - text: "Give `process_refund` a longer description explaining the verification policy"
        why: "Mô tả tool giúp model chọn và dùng tool đúng hơn, nhưng cũng chỉ là hướng dẫn, không phải ép buộc."
    answer: 2
    keyword: "quy tắc **bắt buộc** + hậu quả tài chính → ép bằng code, không bằng prompt"
    relearn: "#ép-buộc-bằng-code-hay-dặn-trong-prompt"
    relearnLabel: "Ép buộc bằng code hay dặn trong prompt"
  - q: "Three MCP tools return dates in different formats (Unix timestamp, ISO 8601, and `MM/DD/YYYY`), and the agent sometimes compares them incorrectly. Where is the best place to fix this?"
    options:
      - text: "A `PreToolUse` hook that rewrites the tool input"
        why: "`PreToolUse` chạy trước khi tool thực thi, lúc đó chưa có kết quả nào để chuẩn hóa."
      - text: "A `PostToolUse` hook that normalizes the tool output before Claude sees it"
        why: "Đúng. `PostToolUse` chạy sau khi tool trả kết quả, và có thể thay output bằng dạng đã chuẩn hóa trước khi model đọc."
      - text: "A system prompt section listing all three formats and how to convert them"
        why: "Cách này bắt model tự chuyển đổi ở mỗi lần đọc. Nó tốn token và vẫn có thể sai, trong khi chuyển đổi định dạng là việc xác định mà code làm chính xác."
      - text: "A `Stop` hook that checks the final answer for date mistakes"
        why: "`Stop` chạy khi agent kết thúc, lúc đó quyết định sai đã được đưa ra. Phải sửa dữ liệu ở đầu vào của suy luận."
    answer: 1
    keyword: "chuẩn hóa **kết quả** tool → `PostToolUse`"
    relearn: "#posttooluse-chuẩn-hóa-kết-quả"
    relearnLabel: "PostToolUse: chuẩn hóa kết quả"
  - q: "Two `PreToolUse` hooks match the same tool call. One returns `permissionDecision: \"allow\"` and the other returns `\"deny\"`. What happens?"
    options:
      - text: "The tool call is blocked"
        why: "Đúng. Khi nhiều hook trả quyết định khác nhau, quyết định hạn chế nhất được áp dụng: `deny` thắng `ask`, `ask` thắng `allow`."
      - text: "The tool call runs, because `allow` was returned by at least one hook"
        why: "Ngược lại: một `deny` là đủ để chặn. Nếu `allow` thắng, mọi hook bảo vệ đều có thể bị một hook khác vô hiệu hóa."
      - text: "The hook registered first wins"
        why: "Các hook khớp cùng một sự kiện chạy song song và thứ tự hoàn thành không xác định, nên không có khái niệm hook nào thắng theo thứ tự."
      - text: "The SDK raises a configuration error"
        why: "Quyết định mâu thuẫn là trường hợp hợp lệ và có quy tắc xử lý rõ ràng; không có lỗi nào xảy ra."
    answer: 0
    keyword: "nhiều hook → quyết định **hạn chế nhất** thắng (`deny`)"
    relearn: "#nhiều-hook-cùng-khớp"
    relearnLabel: "Nhiều hook cùng khớp"
---

Prompt hướng dẫn model nên làm gì. **Hook** là code của bạn chạy tại các điểm cố định của vòng lặp và có thể chặn, sửa hoặc bổ sung thông tin. Khác biệt cốt lõi: prompt là xác suất, hook là xác định.

## Hook hoạt động thế nào

1. **Một sự kiện xảy ra** trong vòng lặp: sắp gọi tool, tool vừa trả kết quả, subagent bắt đầu hoặc kết thúc, agent dừng…
2. **SDK tìm các hook đã đăng ký** cho sự kiện đó.
3. **Matcher lọc**: nếu hook có `matcher` (ví dụ `"Write|Edit"`), SDK so nó với đối tượng của sự kiện, thường là tên tool. Hook không có matcher chạy cho mọi sự kiện cùng loại.
4. **Callback chạy** và nhận thông tin: tên tool, tham số, `session_id`…
5. **Callback trả về quyết định**: cho phép, chặn, sửa input, hoặc chèn thêm context.

Hook chạy trong tiến trình ứng dụng của bạn, không nằm trong context window, nên không tốn token.

## Các sự kiện hay gặp

| Hook | Chạy khi | Dùng để |
|---|---|---|
| `PreToolUse` | Trước khi tool chạy. Chặn hoặc sửa được | Chặn lệnh nguy hiểm, kiểm tra điều kiện tiên quyết |
| `PostToolUse` | Sau khi tool trả kết quả | Ghi log kiểm toán, chuẩn hóa hoặc rút gọn kết quả |
| `UserPromptSubmit` | Khi một prompt được gửi | Chèn thêm context vào prompt |
| `Stop` | Khi agent kết thúc | Kiểm tra kết quả, lưu trạng thái |
| `SubagentStart` / `SubagentStop` | Subagent bắt đầu hoặc hoàn thành | Theo dõi và gom kết quả của các việc song song |
| `PreCompact` | Trước khi nén hội thoại | Lưu lại transcript đầy đủ trước khi tóm tắt |

## PreToolUse: chặn và sửa lời gọi

Callback `PreToolUse` trả quyết định trong `hookSpecificOutput`:

| Trường | Ý nghĩa |
|---|---|
| `permissionDecision` | `"allow"`, `"deny"`, `"ask"` hoặc `"defer"` |
| `permissionDecisionReason` | Lý do, gửi cho **model** để nó biết vì sao bị chặn và nên làm gì tiếp |
| `updatedInput` | Tham số tool đã được sửa |

Trả về `{}` nghĩa là không can thiệp. Trường `systemMessage` ở cấp ngoài cùng hiển thị thông báo cho **người dùng**.

Ví dụ chặn hoàn tiền trên 500 USD và hướng model sang chuyển cho nhân viên:

```python
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher

async def limit_refunds(input_data, tool_use_id, context):
    amount = input_data["tool_input"].get("amount", 0)
    if amount > 500:
        return {
            "hookSpecificOutput": {
                "hookEventName": input_data["hook_event_name"],
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    "Hoàn tiền trên 500 USD cần nhân viên duyệt. "
                    "Hãy gọi escalate_to_human kèm tóm tắt trường hợp."
                ),
            }
        }
    return {}   # không ý kiến: lời gọi đi tiếp theo luồng permission bình thường

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="mcp__support__process_refund", hooks=[limit_refunds])
        ]
    }
)
```

Chú ý `permissionDecisionReason`. Khi bị chặn, model nhận lý do này thay cho kết quả tool. Một lý do tốt nói rõ **bước tiếp theo đúng là gì**, nhờ vậy agent chuyển hướng thay vì thử lại cùng lời gọi.

Một hook chỉ chặn đúng thứ matcher của nó khớp. Hook với matcher `Write|Edit` bảo vệ file `.env` sẽ không chạy nếu model ghi file đó bằng lệnh `Bash`.

## PostToolUse: chuẩn hóa kết quả

`PostToolUse` chạy sau khi tool trả kết quả. Callback có thể:

- đặt `additionalContext` để **nối thêm** thông tin vào kết quả tool;
- đặt `updatedToolOutput` để **thay** output trước khi model thấy.

Hai ứng dụng điển hình:

- **Chuẩn hóa dữ liệu không đồng nhất.** Ba tool trả ngày tháng theo ba kiểu (Unix timestamp, ISO 8601, `MM/DD/YYYY`). Một hook chuyển tất cả về ISO 8601. Model không phải tự chuyển đổi và không so sánh nhầm.
- **Rút gọn kết quả lớn.** Tool trả 40 trường mà agent chỉ cần 5. Hook giữ lại 5 trường đó, tiết kiệm context ở mọi turn về sau.

Chuyển đổi định dạng là việc xác định. Giao nó cho code thì đúng tuyệt đối và không tốn token; giao cho model thì tốn token và đôi khi sai.

## Ép buộc bằng code hay dặn trong prompt

Đây là một trong những phán đoán được hỏi nhiều nhất trong toàn đề thi.

| | Dặn trong prompt | Ép bằng code (hook, điều kiện tiên quyết) |
|---|---|---|
| Bản chất | Xác suất: model thường làm theo | Xác định: lời gọi sai không thể xảy ra |
| Chi phí | Thấp, linh hoạt | Phải viết và bảo trì code |
| Hợp với | Phong cách, giọng văn, ưu tiên mềm, hướng dẫn chung | Quy tắc nghiệp vụ bắt buộc, thao tác tài chính, bảo mật, tuân thủ |

Quy tắc chọn: **nếu vi phạm một lần đã gây hậu quả thật (mất tiền, lộ dữ liệu, sai tài khoản), hãy ép bằng code.** Tăng cường prompt hay thêm ví dụ few-shot chỉ làm giảm tỉ lệ sai, không đưa nó về 0.

Ví dụ: agent hỗ trợ khách hàng phải xác minh khách bằng `get_customer` trước khi `process_refund`. Cách đúng là một điều kiện tiên quyết bằng code: `process_refund` bị chặn cho tới khi `get_customer` đã trả về ID khách được xác minh trong phiên này.

## Chuyển giao cho con người

Khi một quy trình nhiều bước phải dừng để chuyển cho nhân viên, người nhận thường **không đọc được hội thoại**. Bản chuyển giao phải tự đủ:

- ID khách hàng và cách đã xác minh;
- vấn đề gốc và những gì agent đã tìm ra;
- hành động đã thử và kết quả;
- đề xuất bước tiếp theo, kèm số tiền hoặc mã đơn nếu có.

Chủ đề chuyển giao được học kỹ hơn ở Domain 5.

## Nhiều hook cùng khớp

Khi một sự kiện xảy ra, các hook khớp chạy **song song**. Với quyết định permission, kết quả **hạn chế nhất** được áp dụng: `deny` thắng `defer`, `defer` thắng `ask`, `ask` thắng `allow`. Một hook trả `deny` là đủ chặn lời gọi.

Vì thứ tự hoàn thành không xác định, mỗi hook phải tự hoạt động độc lập, không dựa vào việc hook khác đã chạy trước.

Mặc định, nếu callback ném lỗi thì hành động **vẫn tiếp tục**. Một hook bảo vệ bị crash sẽ để lọt lời gọi. Với hook bảo vệ, đặt `on_failure="block"` trên matcher để lỗi của hook cũng chặn lời gọi.

## Hook trong Claude Code

Claude Code dùng cùng các sự kiện đó, nhưng hook là lệnh shell khai báo trong `.claude/settings.json`. Lệnh nhận JSON qua stdin; **thoát với mã 2 nghĩa là chặn**, và nội dung stderr được gửi cho model làm lý do.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-data.sh" }]
      }
    ]
  }
}
```

Bạn sẽ tự viết và chạy hook này trong [lab của domain](../07-lab/).

Tài liệu gốc: [Intercept and control agent behavior with hooks](https://code.claude.com/docs/en/agent-sdk/hooks), [Hooks reference](https://code.claude.com/docs/en/hooks).

## Tóm tắt

- `PreToolUse` chặn hoặc sửa lời gọi; `PostToolUse` chuẩn hóa hoặc rút gọn kết quả.
- `permissionDecisionReason` nói với model vì sao bị chặn và nên làm gì.
- Quy tắc bắt buộc có hậu quả thật → ép bằng code. Prompt chỉ là xác suất.
- Nhiều hook: quyết định hạn chế nhất thắng.
