---
title: 1.3 · Coordinator và subagent
description: Mô hình hub-and-spoke, context cô lập, AgentDefinition, và cách truyền context cho subagent.
lesson:
  day: 2
  minutes: 15
quiz:
  - q: "A coordinator has spent many turns learning that the customer cares only about EU regulations after 2023. It then delegates with the prompt 'Research the regulations we discussed.' The subagent returns broad, irrelevant results. What is the root cause?"
    options:
      - text: "The subagent was given too few tools to search effectively"
        why: "Kết quả rộng và lạc đề không phải do thiếu tool. Subagent tìm được, nhưng không biết phải tìm gì."
      - text: "The subagent does not see the coordinator's conversation history; the delegation prompt must carry the needed context"
        why: "Đúng. Subagent bắt đầu với context mới. Thứ duy nhất đi từ coordinator sang là chuỗi prompt của lời gọi Agent tool, nên 'những gì ta đã bàn' không có nghĩa gì với nó."
      - text: "The subagent's `description` field was not specific enough"
        why: "`description` giúp coordinator chọn đúng subagent. Ở đây subagent đã được chọn đúng; vấn đề nằm ở nội dung được giao."
      - text: "The coordinator should have used a larger model for the subagent"
        why: "Model lớn hơn cũng không đoán được thông tin nó chưa từng nhận."
    answer: 1
    keyword: "subagent **không** kế thừa lịch sử hội thoại → ghi rõ trong prompt giao việc"
    relearn: "#subagent-nhận-được-gì"
    relearnLabel: "Subagent nhận được gì"
  - q: "A research coordinator must analyze three independent documents. Each analysis takes about two minutes. How should it delegate to minimize total time?"
    options:
      - text: "Call the three subagents one per turn, waiting for each result before the next call"
        why: "Cách này tuần tự: tổng thời gian bằng tổng ba lần phân tích, dù ba việc không phụ thuộc nhau."
      - text: "Let one subagent spawn the other two"
        why: "Lồng subagent không làm ba việc chạy song song hơn, và làm mất khả năng quan sát của coordinator."
      - text: "Emit all three subagent calls in a single coordinator response so they run concurrently"
        why: "Đúng. Nhiều lời gọi Agent tool trong cùng một phản hồi được chạy đồng thời, nên tổng thời gian xấp xỉ lần phân tích chậm nhất."
      - text: "Merge the three documents and send them to one subagent"
        why: "Gộp lại làm một subagent phải giữ cả ba tài liệu trong context và vẫn xử lý tuần tự."
    answer: 2
    keyword: "nhiều lời gọi trong **một** phản hồi = chạy song song"
    relearn: "#chạy-song-song"
    relearnLabel: "Chạy song song"
  - q: "A `doc-reviewer` subagent must be able to analyze files but must never modify them. Which configuration enforces this?"
    options:
      - text: "Add 'Do not edit any files' to the subagent's prompt"
        why: "Chỉ dẫn trong prompt không phải cơ chế ép buộc. Tool Edit và Write vẫn nằm trong phiên của subagent."
      - text: "Put `Read`, `Grep`, `Glob` in the coordinator's `allowed_tools`"
        why: "`allowed_tools` của coordinator là danh sách tự duyệt cho phiên chính. Nó không giới hạn bộ tool của subagent."
      - text: "Give the subagent a smaller model so it is less likely to attempt edits"
        why: "Kích thước model không liên quan tới quyền dùng tool."
      - text: "Set the subagent's `tools` to `Read`, `Grep`, `Glob`"
        why: "Đúng. Tool không được liệt kê trong `tools` hoàn toàn không có trong phiên của subagent, nên nó không thể sửa file."
    answer: 3
    keyword: "giới hạn subagent bằng trường `tools`, không bằng prompt"
    relearn: "#agentdefinition"
    relearnLabel: "AgentDefinition"
---

Khi một agent phải làm quá nhiều việc khác loại, context của nó đầy lên và chất lượng giảm. Giải pháp phổ biến là chia việc: một **coordinator** điều phối và nhiều **subagent** chuyên biệt. Bài này là phần nặng điểm nhất của Domain 1.

## Mô hình hub-and-spoke

Coordinator là trục (hub), các subagent là nan hoa (spoke).

- **Coordinator** phân tích yêu cầu, chia thành việc con, chọn subagent, giao việc, rồi tổng hợp kết quả.
- **Subagent** làm đúng một loại việc trong context riêng và trả về báo cáo cuối.
- **Mọi trao đổi đi qua coordinator.** Subagent không nói chuyện trực tiếp với nhau. Nhờ vậy có một nơi duy nhất nhìn thấy toàn bộ tiến trình, xử lý lỗi và quyết định bước tiếp theo.

Ví dụ hệ nghiên cứu: coordinator giao cho subagent tìm kiếm web, subagent phân tích tài liệu, subagent tổng hợp và subagent viết báo cáo, rồi tự kiểm tra báo cáo có đủ độ phủ và trích dẫn hay chưa.

## Bốn lợi ích của subagent

| Lợi ích | Ý nghĩa |
|---|---|
| **Context cô lập** | Các lời gọi tool và kết quả trung gian ở lại trong subagent. Chỉ message cuối quay về coordinator. Một subagent có thể đọc hàng chục file mà coordinator chỉ nhận một bản tóm tắt. |
| **Chạy song song** | Việc con độc lập chạy cùng lúc, nên tổng thời gian bằng việc chậm nhất chứ không phải tổng các việc. |
| **Chỉ dẫn chuyên biệt** | Mỗi subagent có system prompt riêng với kiến thức và ràng buộc riêng, không làm nhiễu prompt của agent chính. |
| **Giới hạn tool** | Subagent chỉ có đúng bộ tool nó cần, giảm rủi ro hành động ngoài ý muốn. |

## AgentDefinition

Trong Agent SDK, subagent được khai báo qua tham số `agents`. Mỗi subagent là một `AgentDefinition`.

```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

options = ClaudeAgentOptions(
    allowed_tools=["Read", "Grep", "Glob", "Agent"],
    agents={
        "doc-analyst": AgentDefinition(
            description="Phân tích tài liệu nội bộ. Dùng khi cần trích ý chính từ file báo cáo.",
            prompt="Bạn là chuyên viên phân tích tài liệu. Chỉ dựa vào nội dung file, luôn ghi tên file nguồn.",
            tools=["Read", "Grep", "Glob"],   # chỉ đọc
            model="haiku",
        ),
    },
)
```

| Trường | Bắt buộc | Ý nghĩa |
|---|:-:|---|
| `description` | Có | Mô tả bằng ngôn ngữ tự nhiên về **khi nào** dùng subagent này. Coordinator dựa vào đây để chọn |
| `prompt` | Có | System prompt của subagent: vai trò và cách làm việc |
| `tools` | Không | Danh sách tool được phép. Bỏ trống thì kế thừa mọi tool dành cho subagent |
| `disallowedTools` | Không | Tool bị loại khỏi bộ tool của subagent |
| `model` | Không | Model riêng cho subagent (`haiku`, `sonnet`, `opus`, `inherit` hoặc ID đầy đủ) |
| `maxTurns` | Không | Số turn tối đa của subagent |

Hai điểm cần nhớ:

- **Tool không được liệt kê trong `tools` thì không tồn tại trong phiên của subagent.** Không có hộp thoại xin quyền, không có lỗi; subagent đơn giản là làm việc mà không có tool đó. Đây là cách ép "chỉ đọc" một cách chắc chắn.
- **`description` quyết định việc được chọn.** Model tự quyết định khi nào giao việc dựa trên tác vụ và `description` của từng subagent. Mô tả mơ hồ dẫn tới chọn sai subagent hoặc không giao việc.

Ngoài cách khai báo trong code, subagent còn có thể là file Markdown trong `.claude/agents/` (frontmatter YAML là cấu hình, phần thân là system prompt). Lab của domain này dùng cách đó. Subagent khai báo trong code được ưu tiên hơn file cùng tên.

:::note[Tên tool: `Agent` hay `Task`?]
Coordinator tạo subagent bằng một tool có sẵn. Tài liệu hiện tại gọi nó là **`Agent`**. Trước Claude Code v2.1.63 nó tên là **`Task`**, và nhiều tài liệu luyện thi vẫn viết "`Task` tool" hay "`allowedTools` phải chứa `Task`". Hai tên chỉ cùng một cơ chế. Khi gặp câu hỏi dùng tên `Task`, hãy hiểu đó là tool tạo subagent.
:::

## Subagent nhận được gì

Đây là nguồn câu hỏi bẫy phổ biến nhất. Context của subagent **bắt đầu mới**, không có hội thoại của coordinator.

| Subagent nhận | Subagent không nhận |
|---|---|
| System prompt riêng (`AgentDefinition.prompt`) và prompt của lời gọi Agent tool | Lịch sử hội thoại và kết quả tool của coordinator |
| CLAUDE.md của dự án | System prompt của coordinator |
| Định nghĩa tool (kế thừa hoặc tập con trong `tools`) | Nội dung skill đã nạp sẵn, trừ khi liệt kê trong `skills` |

Hệ quả: **thứ duy nhất bạn truyền từ coordinator sang subagent là chuỗi prompt của lời gọi Agent tool.** Mọi thứ subagent cần biết phải nằm trong đó: đường dẫn file, thông báo lỗi, quyết định đã chốt, tiêu chí đầu ra.

```text
Giao việc tệ:   "Nghiên cứu các quy định mà ta đã bàn."
Giao việc tốt:  "Tìm các quy định của EU về lưu trữ dữ liệu khách hàng ban hành sau 2023.
                 Phạm vi: chỉ văn bản đã có hiệu lực. Bỏ qua dự thảo.
                 Trả về: danh sách gồm tên văn bản, ngày hiệu lực, URL nguồn, một câu tóm tắt."
```

Chiều ngược lại cũng có giới hạn: coordinator chỉ nhận **message cuối** của subagent, không nhận các bước trung gian. Vì vậy hãy yêu cầu subagent trả kết quả có cấu trúc, kèm nguồn, ngay trong báo cáo cuối.

## Chạy song song

Để các subagent chạy đồng thời, coordinator phải phát **nhiều lời gọi Agent tool trong cùng một phản hồi**. Nếu coordinator gọi một subagent, chờ kết quả, rồi mới gọi cái tiếp theo ở turn sau, các việc chạy tuần tự.

Điều kiện để song song hóa là các việc con **độc lập**: việc này không cần kết quả của việc kia. Việc có phụ thuộc thì phải chạy nối tiếp và coordinator chuyển kết quả của bước trước vào prompt của bước sau.

## Giới hạn cây subagent

Model tự quyết định tạo bao nhiêu subagent, và subagent có thể tạo subagent của riêng nó. Một prompt có thể nở thành cả một cây agent. Có ba cách chặn:

| Giới hạn | Cấu hình | Khi chạm giới hạn |
|---|---|---|
| Độ sâu | Biến môi trường `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | Subagent ở tầng cuối không tạo thêm được, tự làm việc được giao |
| Số chạy đồng thời | Biến môi trường `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | Từ chối tạo thêm cho tới khi số đang chạy giảm |
| Chi phí | `max_budget_usd` | Từ chối tạo thêm, dừng subagent nền, kết thúc với `error_max_budget_usd` |

Tài liệu gốc: [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents), [Create custom subagents](https://code.claude.com/docs/en/sub-agents).

## Tóm tắt

- Hub-and-spoke: mọi trao đổi đi qua coordinator.
- Subagent có context riêng và **không** thấy hội thoại của coordinator. Prompt giao việc phải tự đủ.
- Coordinator chỉ nhận message cuối của subagent.
- Giới hạn subagent bằng `tools`; chọn đúng subagent nhờ `description` rõ ràng.
- Song song = nhiều lời gọi Agent tool trong một phản hồi.
