---
title: 1.1 · Vòng lặp agent
description: Agent là một vòng lặp gọi model, chạy tool, trả kết quả lại cho model, và dừng theo tín hiệu có cấu trúc.
lesson:
  day: 1
  minutes: 12
quiz:
  - q: "You are implementing an agentic loop directly on the Messages API. Which condition should decide whether the loop runs another iteration?"
    options:
      - text: "The assistant text contains a phrase such as 'Task complete'"
        why: "Đây là phân tích ngôn ngữ tự nhiên để đoán trạng thái. Model có thể diễn đạt khác đi, hoặc viết câu đó khi vẫn còn gọi tool."
      - text: "The response `stop_reason` is `tool_use`"
        why: "Đúng. `tool_use` nghĩa là model đang chờ kết quả tool, nên phải chạy tool rồi gọi lại. Giá trị khác nghĩa là lượt này không còn yêu cầu tool nào."
      - text: "The iteration counter is still below a fixed limit of 10"
        why: "Giới hạn số vòng là lưới an toàn, không phải điều kiện dừng chính. Dùng nó làm điều kiện chính sẽ cắt ngang tác vụ dài hoặc chạy thừa vòng."
      - text: "The response contains at least one text block"
        why: "Một phản hồi có thể vừa có text vừa có `tool_use`. Sự có mặt của text không nói lên việc đã xong hay chưa."
    answer: 1
    keyword: "`stop_reason` — tín hiệu có cấu trúc, không đọc nội dung text"
    relearn: "#stop_reason-quyết-định-bước-tiếp-theo"
    relearnLabel: "stop_reason quyết định bước tiếp theo"
  - q: "After executing the tools Claude requested, how must the results be returned so Claude can reason about them on the next iteration?"
    options:
      - text: "As `tool_result` blocks in a new `user` message, each carrying the matching `tool_use_id`"
        why: "Đúng. Kết quả tool đi trong message `user`, và `tool_use_id` nối từng kết quả với đúng lời gọi."
      - text: "Appended to the system prompt before the next request"
        why: "System prompt không phải nơi chứa kết quả tool. Model sẽ không thấy kết quả nào thuộc lời gọi nào, và lịch sử hội thoại thiếu phần trả lời cho `tool_use`."
      - text: "As a new `assistant` message containing the tool output"
        why: "Message `assistant` là lời của model. Kết quả tool là dữ liệu từ phía ứng dụng nên thuộc message `user`."
      - text: "They do not need to be returned; Claude remembers which tools it called"
        why: "API không giữ trạng thái. Mỗi request phải gửi lại toàn bộ lịch sử, gồm cả kết quả tool."
    answer: 0
    keyword: "`tool_result` trong message `user`, khớp `tool_use_id`"
    relearn: "#tự-viết-vòng-lặp-bằng-messages-api"
    relearnLabel: "Tự viết vòng lặp bằng Messages API"
---

Một agent không phải là một model đặc biệt. Nó là một **vòng lặp** do code của bạn (hoặc Agent SDK) chạy quanh model: gọi model, chạy tool mà model yêu cầu, trả kết quả lại, rồi gọi tiếp. Đề thi hỏi rất kỹ một điểm: **vòng lặp biết lúc nào dừng bằng cách nào**.

## Vòng lặp gồm những bước nào

1. **Gửi request**: system prompt, định nghĩa tool, và toàn bộ lịch sử hội thoại.
2. **Model trả lời**: có thể là text, một hoặc nhiều yêu cầu gọi tool (`tool_use`), hoặc cả hai.
3. **Chạy tool**: code của bạn thực thi từng tool được yêu cầu.
4. **Trả kết quả**: thêm kết quả vào lịch sử rồi quay lại bước 1.
5. **Kết thúc**: khi model trả lời mà không yêu cầu tool nào nữa.

Điều quan trọng là **model quyết định bước tiếp theo** dựa trên kết quả vừa nhận. Bạn không viết sẵn thứ tự gọi tool. Đó là điểm khác giữa agent và một pipeline cố định.

Messages API **không giữ trạng thái**. Mỗi request phải gửi lại toàn bộ lịch sử, kể cả các lần gọi tool và kết quả trước đó.

## stop_reason quyết định bước tiếp theo

Mỗi phản hồi của Messages API có trường `stop_reason` cho biết vì sao model dừng sinh output. Đây là tín hiệu để điều khiển vòng lặp.

| `stop_reason` | Ý nghĩa | Vòng lặp làm gì |
|---|---|---|
| `tool_use` | Model yêu cầu gọi tool và đang chờ kết quả | Chạy tool, trả `tool_result`, gọi tiếp |
| `end_turn` | Model đã nói xong lượt của mình | Dừng, trả kết quả cho người dùng |
| `max_tokens` | Chạm giới hạn `max_tokens`, output bị cắt | Không coi là xong. Tăng giới hạn hoặc cho model viết tiếp |
| `stop_sequence` | Gặp một chuỗi dừng bạn khai báo | Xử lý theo mục đích của chuỗi dừng đó |
| `pause_turn` | Lượt chạy dài bị tạm ngưng (thường gặp với server tool) | Gửi lại hội thoại để model chạy tiếp |
| `refusal` | Model từ chối yêu cầu | Dừng, xử lý như một trường hợp từ chối |
| `model_context_window_exceeded` | Hết context window | Dừng, cần rút gọn context |

Với câu hỏi về vòng lặp, quy tắc cần nhớ rất ngắn: **`tool_use` thì tiếp tục, `end_turn` thì dừng**.

Tài liệu gốc: [Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons).

## Tự viết vòng lặp bằng Messages API

Đoạn code dưới đây là vòng lặp tối thiểu. Hãy đọc kỹ ba chỗ được đánh số.

```python
# Code đọc hiểu. Chưa chạy kiểm chứng trong khóa học này (cần ANTHROPIC_API_KEY).
import anthropic

client = anthropic.Anthropic()
messages = [{"role": "user", "content": "Đơn hàng #1042 đang ở đâu?"}]

while True:
    response = client.messages.create(
        model="claude-haiku-5-5",
        max_tokens=1024,
        tools=TOOLS,            # danh sách định nghĩa tool
        messages=messages,
    )

    # (1) Luôn lưu nguyên phản hồi của model vào lịch sử, kể cả các khối tool_use.
    messages.append({"role": "assistant", "content": response.content})

    # (2) Điều kiện dừng là stop_reason, không phải nội dung text.
    if response.stop_reason != "tool_use":
        break

    # (3) Chạy mọi tool được yêu cầu, trả kết quả trong MỘT message user.
    results = []
    for block in response.content:
        if block.type == "tool_use":
            output = run_tool(block.name, block.input)
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,   # nối kết quả với đúng lời gọi
                "content": output,
            })
    messages.append({"role": "user", "content": results})
```

Ba điều dễ bị hỏi:

- Kết quả tool nằm trong message **`user`**, dưới dạng khối `tool_result`. Không có role riêng cho tool.
- Mỗi `tool_result` mang **`tool_use_id`** trùng với `id` của khối `tool_use` tương ứng. Một lượt có thể có nhiều lời gọi tool, và mọi kết quả của lượt đó đi chung trong một message.
- Phải lưu message `assistant` có khối `tool_use` vào lịch sử **trước** khi gửi `tool_result`. Thiếu nó, request tiếp theo không hợp lệ.

Tài liệu gốc: [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview).

## Ba cách dừng vòng lặp sai

Đây là nhóm phương án sai xuất hiện thường xuyên nhất trong câu hỏi về vòng lặp.

| Cách làm sai | Vì sao sai |
|---|---|
| Tìm cụm từ trong text như "Done" hay "Task complete" | Model không cam kết dùng đúng cụm từ đó, và có thể viết nó khi vẫn còn gọi tool. Đây là đoán trạng thái từ ngôn ngữ tự nhiên trong khi đã có tín hiệu có cấu trúc. |
| Dùng số vòng lặp tối đa làm điều kiện dừng **chính** | Tác vụ dài bị cắt ngang, tác vụ ngắn vẫn dừng đúng nhờ `stop_reason` chứ không nhờ con số đó. Giới hạn vòng chỉ nên là lưới an toàn. |
| Dừng khi phản hồi có khối text | Một phản hồi có thể vừa giải thích bằng text vừa yêu cầu tool. Có text không có nghĩa là đã xong. |

Giới hạn số vòng và giới hạn chi phí **vẫn nên có** để chặn agent chạy không kiểm soát. Điểm đề thi nhấn mạnh là chúng không được thay thế `stop_reason`. Bài tiếp theo nói về các giới hạn này.

## Agent SDK chạy vòng lặp thay bạn

Claude Agent SDK đóng gói chính vòng lặp trên, cùng bộ tool có sẵn của Claude Code. Bạn gửi prompt, SDK tự chạy tool và gọi lại model cho tới khi model trả lời mà không còn lời gọi tool nào.

Trong SDK, một **turn** là một lượt đi qua vòng lặp: model sinh output, nếu có lời gọi tool thì SDK chạy và trả kết quả lại. Trong lúc đó SDK phát ra một chuỗi message để bạn theo dõi:

| Message | Xuất hiện khi | Dùng để |
|---|---|---|
| `SystemMessage` (subtype `init`) | Bắt đầu phiên | Lấy metadata của phiên |
| `AssistantMessage` | Mỗi khối nội dung model sinh ra (text hoặc lời gọi tool) | Hiển thị tiến độ |
| `UserMessage` | Sau mỗi lần chạy tool, chứa kết quả tool | Kiểm tra kết quả tool |
| `ResultMessage` | Vòng lặp kết thúc | Lấy kết quả cuối, chi phí, `session_id` |

Bạn vẫn cần hiểu vòng lặp thô ở trên vì hai lý do: đề thi hỏi trực tiếp về `stop_reason`, và mọi công cụ kiểm soát của SDK (hook, giới hạn, permission) đều can thiệp vào đúng các bước của vòng lặp đó.

Tài liệu gốc: [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop).

## Tóm tắt

- Agent là vòng lặp: gọi model → chạy tool → trả kết quả → gọi lại.
- `stop_reason: "tool_use"` thì tiếp tục, `"end_turn"` thì dừng.
- Kết quả tool là khối `tool_result` trong message `user`, khớp `tool_use_id`.
- Không dừng vòng lặp bằng cách đọc text, và không dùng số vòng tối đa làm điều kiện dừng chính.
