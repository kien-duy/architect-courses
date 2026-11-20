---
title: 2.3 · Chia tool cho agent và tool_choice
description: Vì sao ít tool hơn thì chọn đúng hơn, cách giới hạn bộ tool theo vai trò, và bốn giá trị của tham số tool_choice.
lesson:
  day: 4
  minutes: 15
quiz:
  - q: "A single operations agent has been given 22 tools covering billing, inventory, HR and deployment. Tool-selection accuracy has dropped, and it sometimes calls `restart_service` while answering payroll questions. What is the best architectural change?"
    options:
      - text: "Add a line to every tool description: 'Only use this tool when it is relevant'"
        why: "Câu này không thêm thông tin nào để phân biệt tool. 22 mô tả vẫn nằm trong context và vẫn cạnh tranh nhau."
      - text: "Split the work across specialized agents, each with only the handful of tools its role needs"
        why: "Đúng. Càng nhiều tool, lựa chọn càng kém tin cậy, và tool ngoài chuyên môn dễ bị dùng sai. Mỗi agent chỉ nên có vài tool đúng vai trò của nó."
      - text: "Set `tool_choice` to `any` so the agent always calls a tool"
        why: "`any` chỉ đảm bảo có một lời gọi tool. Nó không giúp chọn đúng trong 22 tool, và còn ép gọi tool cả khi không cần."
      - text: "Increase `max_tokens` so the model can consider all tools more carefully"
        why: "`max_tokens` giới hạn độ dài output. Nó không ảnh hưởng tới chất lượng chọn tool."
    answer: 1
    keyword: "quá nhiều tool → chọn kém; **chia theo vai trò**"
    relearn: "#vì-sao-nhiều-tool-làm-agent-kém-đi"
    relearnLabel: "Vì sao nhiều tool làm agent kém đi"
  - q: "An extraction service sends each support email to Claude with three tools, one per email type (`record_complaint`, `record_question`, `record_feedback`). About 5% of responses are plain text apologies with no tool call, which breaks the downstream parser. The model supports forced tool use. Which setting fixes this while still letting the model pick the right type?"
    options:
      - text: "`tool_choice: {\"type\": \"auto\"}`"
        why: "`auto` là mặc định hiện tại: model được phép trả lời bằng text. Chính nó sinh ra 5% phản hồi không có lời gọi tool."
      - text: "`tool_choice: {\"type\": \"tool\", \"name\": \"record_complaint\"}`"
        why: "Ép một tool cụ thể đảm bảo có lời gọi tool, nhưng mọi email sẽ bị ghi là khiếu nại, kể cả câu hỏi và góp ý."
      - text: "`tool_choice: {\"type\": \"any\"}`"
        why: "Đúng. `any` buộc model gọi một trong các tool đã khai báo nhưng để nó tự chọn tool nào, nên luôn có output có cấu trúc và vẫn phân loại đúng."
      - text: "`tool_choice: {\"type\": \"none\"}`"
        why: "`none` cấm model gọi tool, tức là 100% phản hồi sẽ là text."
    answer: 2
    keyword: "bắt buộc gọi tool, model tự chọn → `any`"
    relearn: "#bốn-giá-trị-của-tool_choice"
    relearnLabel: "Bốn giá trị của tool_choice"
  - q: "A read-only `log-analyst` subagent is defined with `tools: Read, Grep, Glob`. A developer wants to be sure it can never run shell commands, even if a log file contains text telling it to. Why is this configuration sufficient?"
    options:
      - text: "Tools not listed in the subagent's `tools` field are not available in its session at all, so there is no `Bash` tool to call"
        why: "Đúng. `tools` kiểm soát tool nào **tồn tại** với subagent. Không có định nghĩa `Bash` trong context thì model không thể phát ra lời gọi tới nó, bất kể nội dung nó đọc được."
      - text: "The subagent will ask the user for permission before each `Bash` call"
        why: "Đó là hành vi của tool có tồn tại nhưng chưa được duyệt. Ở đây `Bash` không tồn tại trong phiên của subagent."
      - text: "`Read`, `Grep` and `Glob` are auto-approved, which blocks every other tool"
        why: "Tự duyệt và giới hạn là hai việc khác nhau. Danh sách tự duyệt không chặn tool nào cả."
      - text: "Subagents can never use `Bash`"
        why: "Subagent dùng được `Bash` nếu nó được liệt kê trong `tools` hoặc được kế thừa khi bỏ trống `tools`."
    answer: 0
    keyword: "`tools` = tool nào **tồn tại**; khác với danh sách tự duyệt"
    relearn: "#hai-lớp-kiểm-soát-tồn-tại-và-được-duyệt"
    relearnLabel: "Hai lớp kiểm soát tồn tại và được duyệt"
---

Cho agent thêm tool không làm nó giỏi hơn. Sau một ngưỡng nhất định, mỗi tool thêm vào làm việc chọn tool kém tin cậy đi. Bài này nói về việc chia tool cho đúng agent, và về `tool_choice`, tham số quyết định model có bắt buộc phải gọi tool hay không.

## Vì sao nhiều tool làm agent kém đi

Mỗi định nghĩa tool chiếm chỗ trong context và là một lựa chọn model phải cân nhắc ở mọi lượt. Có hai hệ quả:

- **Chọn kém chính xác hơn.** Một agent có khoảng 4–5 tool đúng việc chọn ổn định hơn nhiều so với agent có gần 20 tool, nhất là khi vài tool trong đó na ná nhau.
- **Dùng sai tool ngoài chuyên môn.** Agent tổng hợp báo cáo mà có tool tìm kiếm web sẽ có lúc tự đi tìm kiếm thay vì dùng dữ liệu được giao. Agent có tool thì sẽ tìm ra lý do để dùng nó.

Ngoài ra còn chi phí: định nghĩa tool được gửi lại ở mọi request. Tài liệu của Anthropic gợi ý cân nhắc **tool search** (nạp định nghĩa tool khi cần thay vì nạp hết từ đầu) khi số tool lên tới khoảng 10 trở lên. Claude Code bật cơ chế này mặc định cho tool của MCP server, xem [bài 2.4](../04-cau-hinh-mcp/).

## Chia tool theo vai trò

Nguyên tắc là **scoped access**: mỗi agent chỉ có tool phục vụ vai trò của nó, cộng một số rất ít tiện ích dùng chung.

| Agent | Tool nên có | Tool không nên có |
|---|---|---|
| Tìm kiếm web | `web_search`, `fetch_page` | Tool ghi file, tool gửi email |
| Phân tích tài liệu | `load_document`, `extract_tables` | `web_search` |
| Tổng hợp | `verify_fact` (tiện ích dùng chung) | Tool tìm kiếm, tool tải tài liệu |
| Viết báo cáo | `write_report` | Mọi tool thu thập dữ liệu |

Hai kỹ thuật đi kèm:

- **Thay tool đa năng bằng tool có ràng buộc.** Một agent phân tích hợp đồng chỉ cần đọc file trong kho hợp đồng. Cho nó `run_sql` hay `http_request` là mở ra cả một lớp hành vi ngoài ý muốn. Một tool hẹp như `get_contract(contract_id)` làm đúng việc đó và không làm được gì khác.
- **Tiện ích dùng chung có chọn lọc.** Nếu agent tổng hợp thường xuyên cần kiểm tra lại một con số, cho nó một tool kiểm chứng phạm vi hẹp sẽ rẻ hơn là mỗi lần phải quay về coordinator. Nhưng đó là một tool cụ thể, không phải cả bộ tool tìm kiếm.

Giới hạn bằng cấu hình luôn chắc hơn dặn trong prompt. "Đừng dùng tool X" là chỉ dẫn xác suất; tool X không có trong phiên là điều chắc chắn. Đây là cùng nguyên tắc với trường `tools` của `AgentDefinition` ở [bài 1.3](../../domain-1/03-coordinator-subagent/#agentdefinition).

## Hai lớp kiểm soát tồn tại và được duyệt

Claude Code và Agent SDK tách hai câu hỏi mà người mới hay gộp làm một:

1. **Tồn tại:** tool có nằm trong context của model không?
2. **Được duyệt:** khi model gọi tool, lời gọi có chạy mà không phải hỏi không?

| Cấu hình | Lớp | Tác dụng |
|---|---|---|
| `tools` (SDK), `--tools` (CLI) | Tồn tại | Chỉ các tool có sẵn được liệt kê mới có trong context. Không ảnh hưởng tới tool MCP |
| `tools` trong định nghĩa subagent | Tồn tại | Subagent chỉ có đúng các tool này |
| `allowedTools`, `--allowedTools` | Được duyệt | Tool được liệt kê chạy không cần hỏi. Tool khác **vẫn tồn tại** và đi qua luồng xin quyền |
| `disallowedTools`, `--disallowedTools` | Cả hai | Tên tool trần (`Bash`, `mcp__shop__refund_order`) gỡ tool khỏi context. Luật có phạm vi (`Bash(rm *)`) giữ tool lại và chỉ từ chối lời gọi khớp |

Hệ quả hay bị hỏi: **`allowedTools` không phải danh sách giới hạn.** Muốn một agent không thể hoàn tiền, phải gỡ tool hoàn tiền khỏi context (`tools` của subagent hoặc `disallowedTools`), không phải chỉ bỏ nó ra khỏi `allowedTools`. [Lab](../06-lab/) cho thấy sự khác nhau: với tool chỉ không được duyệt, model vẫn thử gọi và bị từ chối; với tool bị gỡ, model không hề thấy nó.

## Bốn giá trị của tool_choice

Khi gọi Messages API, `tool_choice` quyết định mức độ tự do của model với các tool đã khai báo.

| Giá trị | Model được làm gì | Dùng khi |
|---|---|---|
| `{"type": "auto"}` | Tự quyết định gọi tool hay trả lời bằng text. Mặc định khi có `tools` | Hầu hết agent |
| `{"type": "any"}` | **Phải** gọi một tool, tự chọn tool nào | Cần chắc chắn có output có cấu trúc, có nhiều tool để chọn |
| `{"type": "tool", "name": "..."}` | **Phải** gọi đúng tool được nêu tên | Ép một bước cụ thể, thường là bước đầu tiên |
| `{"type": "none"}` | Không được gọi tool. Mặc định khi không có `tools` | Tạm cấm tool ở một lượt mà vẫn giữ định nghĩa |

```python
import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-haiku-5-5",
    max_tokens=1024,
    tools=tools,                       # record_complaint, record_question, record_feedback
    tool_choice={"type": "any"},       # phải gọi một trong ba tool
    messages=[{"role": "user", "content": email_text}],
)
```

Chưa chạy kiểm chứng trong khóa học này (cần `ANTHROPIC_API_KEY`).

Ghi nhớ nhanh cho đề thi:

- Cần **đảm bảo có lời gọi tool** thay vì câu trả lời text: `any`.
- Cần **đảm bảo một tool cụ thể chạy trước**: ép tool đó ở request đầu, rồi trả `tool_choice` về `auto` cho các request sau. `tool_choice` chỉ có hiệu lực với request mang nó.
- `auto` kèm câu "hãy dùng tool X" trong prompt là chỉ dẫn, không phải đảm bảo.

## Giới hạn của việc ép tool

Ép tool có cái giá và có giới hạn. Các điểm sau lấy từ tài liệu hiện hành:

- **Không có text trước lời gọi tool.** Với `any` hoặc `tool`, phản hồi bắt đầu thẳng bằng khối `tool_use`. Model không giải thích trước, kể cả khi bạn yêu cầu.
- **Bỏ qua bước suy nghĩ.** Lời gọi bị ép không có khối `thinking`. Với extended thinking bật thủ công, `any` và `tool` trả về lỗi; chỉ `auto` và `none` dùng được.
- **Không ép được nội dung tham số.** `tool_choice` đảm bảo tool nào được gọi, không đảm bảo input đúng schema. Muốn input luôn khớp schema, thêm `strict: true` vào định nghĩa tool.
- **Tắt gọi song song là chuyện khác.** Thêm `"disable_parallel_tool_use": true` vào `tool_choice` để model gọi tối đa một tool mỗi lượt (với `auto`) hoặc đúng một tool (với `any` và `tool`).
- **Đổi `tool_choice` làm mất cache của phần message.** Định nghĩa tool và system prompt vẫn được cache.

:::note[Một số model mới không nhận `any` và `tool`]
Tài liệu hiện hành liệt kê một số model đời mới nhất trả lỗi 400 khi nhận `tool_choice` kiểu `any` hoặc `tool`; với chúng, cách thay thế là `auto` kèm `strict: true` hoặc structured outputs. `claude-haiku-5-5` dùng trong ví dụ vẫn nhận lời gọi bị ép. Đề thi và tài liệu luyện thi được viết trước thay đổi này, nên vẫn coi `any` và ép tool là đáp án chuẩn cho "đảm bảo có lời gọi tool" và "đảm bảo thứ tự". Khi làm bài, trả lời theo ba giá trị `auto`, `any`, `tool`. Khi viết code thật, kiểm tra bảng hỗ trợ của model bạn dùng.
:::

Tài liệu gốc: [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools), [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use), [Manage tool context](https://platform.claude.com/docs/en/agents-and-tools/tool-use/manage-tool-context), [Give Claude custom tools](https://code.claude.com/docs/en/agent-sdk/custom-tools), [CLI reference](https://code.claude.com/docs/en/cli-reference).

## Tóm tắt

- Nhiều tool hơn làm việc chọn tool kém tin cậy hơn. Mỗi agent chỉ nên có vài tool đúng vai trò.
- Thay tool đa năng bằng tool hẹp. Tiện ích dùng chung thì cho có chọn lọc.
- "Tồn tại" và "được duyệt" là hai lớp. `allowedTools` chỉ tự duyệt, không giới hạn.
- `auto`: model tự quyết. `any`: phải gọi một tool. `tool`: phải gọi đúng tool đó. `none`: không gọi tool.
- Ép tool đảm bảo tool nào được gọi, không đảm bảo input đúng. Dùng `strict: true` cho việc đó.
