---
title: 1.2 · Kiểm soát vòng lặp
description: Giới hạn số turn và chi phí, đọc kết quả kết thúc, và chọn permission mode cho agent.
lesson:
  day: 1
  minutes: 12
quiz:
  - q: "A production agent built with the Agent SDK occasionally runs for a very long time on open-ended requests. The team wants a hard safety limit without changing how the agent normally decides it is finished. What should they do?"
    options:
      - text: "Add an instruction to the system prompt: 'Never use more than 15 tool calls'"
        why: "Chỉ dẫn trong prompt là gợi ý, model có thể không tuân theo. Yêu cầu là một giới hạn cứng."
      - text: "Stop the loop as soon as the assistant produces any text block"
        why: "Text có thể đi kèm lời gọi tool. Cách này làm hỏng điều kiện dừng bình thường của agent."
      - text: "Set `max_turns` and `max_budget_usd`, and handle the `error_max_turns` / `error_max_budget_usd` result subtypes"
        why: "Đúng. Hai tùy chọn này là giới hạn cứng do SDK thực thi, không đổi cách agent tự kết thúc. Khi chạm giới hạn, `ResultMessage` có subtype lỗi tương ứng để code xử lý."
      - text: "Remove the `Bash` tool so the agent has fewer ways to keep working"
        why: "Bỏ tool làm giảm năng lực của agent chứ không giới hạn thời gian chạy. Agent vẫn có thể lặp dài với tool khác."
    answer: 2
    keyword: "hard limit → `max_turns` / `max_budget_usd`, không phải prompt"
    relearn: "#giới-hạn-số-turn-và-chi-phí"
    relearnLabel: "Giới hạn số turn và chi phí"
  - q: "Your code reads `message.result` from every `ResultMessage` and sometimes crashes. What is the correct fix?"
    options:
      - text: "Check that `subtype` is `success` before reading `result`"
        why: "Đúng. Trường `result` chỉ có ở biến thể `success`. Các subtype lỗi không có kết quả cuối."
      - text: "Retry the same query until `result` is present"
        why: "Chạy lại không sửa được lỗi logic. Nếu agent chạm `max_turns`, lần chạy lại rất có thể chạm tiếp."
      - text: "Read the last `AssistantMessage` instead; it always holds the final answer"
        why: "Khi vòng lặp dừng vì chạm giới hạn, message cuối của model có thể là một lời gọi tool dang dở chứ không phải câu trả lời."
      - text: "Increase `max_tokens` so the result is never truncated"
        why: "Vấn đề không phải output bị cắt. Trường `result` vắng mặt vì lượt chạy kết thúc bằng lỗi."
    answer: 0
    keyword: "`result` chỉ có khi `subtype == \"success\"`"
    relearn: "#đọc-kết-quả-kết-thúc"
    relearnLabel: "Đọc kết quả kết thúc"
  - q: "An agent runs unattended in a CI container with nobody available to approve tool calls. Only pre-approved tools should run; anything else that would normally prompt must be denied rather than executed. Which permission mode fits?"
    options:
      - text: "`bypassPermissions`"
        why: "Mode này chạy mọi tool mà không hỏi, kể cả tool bạn không liệt kê. Nó trái với yêu cầu từ chối những lời gọi chưa được duyệt trước."
      - text: "`acceptEdits`"
        why: "Mode này tự duyệt thao tác sửa file. Các lệnh khác vẫn theo luật mặc định và cần người duyệt, mà ở đây không có ai."
      - text: "`plan`"
        why: "Plan mode để model khảo sát và lập kế hoạch, không dành cho agent phải thực thi công việc trong CI."
      - text: "`dontAsk`"
        why: "Đúng. `dontAsk` không bao giờ hỏi: tool đã được duyệt trước thì chạy, mọi lời gọi lẽ ra phải hỏi thì bị từ chối."
    answer: 3
    keyword: "headless + chỉ tool đã duyệt → `dontAsk`"
    relearn: "#permission-mode"
    relearnLabel: "Permission mode"
---

Bài trước nói vòng lặp **dừng đúng** nhờ `stop_reason`. Bài này nói về lưới an toàn quanh vòng lặp: giới hạn, cách đọc kết quả, và ai được phép duyệt lời gọi tool. Mọi ví dụ dùng tên tùy chọn của Python SDK; TypeScript dùng tên tương ứng ở dạng camelCase (`max_turns` ↔ `maxTurns`).

## Giới hạn số turn và chi phí

| Tùy chọn | Kiểm soát | Mặc định |
|---|---|---|
| `max_turns` | Số turn tối đa | Không giới hạn |
| `max_budget_usd` | Mức chi ước tính mà tại đó vòng lặp dừng | Không giới hạn |

Không có giới hạn, vòng lặp chạy tới khi model tự xong. Điều đó ổn với tác vụ có phạm vi rõ, nhưng một prompt mở như "cải thiện codebase này" có thể chạy rất lâu. Với agent production, đặt ngân sách là mặc định hợp lý.

Hai chi tiết đáng nhớ:

- **Cách đếm turn**: mỗi turn có lời gọi tool tính một, cộng thêm một turn cho câu trả lời cuối chỉ có text. Nếu không chừa turn cuối đó, lượt chạy kết thúc bằng `error_max_turns` và không có câu trả lời.
- **Ngân sách bao gồm cả subagent**. Chi phí của subagent cộng vào tổng. SDK so sánh mức chi sau khi mỗi phản hồi về, nên tổng thực tế có thể vượt trần một chút. Hãy chừa khoảng dư.

Phân biệt với bài trước: giới hạn là **lưới an toàn**, còn điều kiện dừng bình thường vẫn là model trả lời mà không gọi tool.

## Đọc kết quả kết thúc

Khi vòng lặp kết thúc, SDK phát `ResultMessage`. Trường `subtype` cho biết chuyện gì đã xảy ra.

| `subtype` | Chuyện gì xảy ra | Có trường `result`? |
|---|---|:-:|
| `success` | Model hoàn thành bình thường | Có |
| `error_max_turns` | Chạm `max_turns` trước khi xong | Không |
| `error_max_budget_usd` | Chạm `max_budget_usd` trước khi xong | Không |
| `error_during_execution` | Một lỗi làm gián đoạn vòng lặp | Không |
| `error_max_structured_output_retries` | Không tạo được structured output hợp lệ trong số lần thử cho phép | Không |

Vì trường `result` chỉ có ở `success`, **luôn kiểm tra `subtype` trước khi đọc `result`**. Mọi subtype đều mang `total_cost_usd`, `usage`, `num_turns` và `session_id`, nên bạn vẫn theo dõi được chi phí và tiếp tục phiên sau khi lỗi.

```python
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

options = ClaudeAgentOptions(max_turns=20, max_budget_usd=2.0)

try:
    async for message in query(prompt="Sửa các test đang lỗi", options=options):
        if isinstance(message, ResultMessage):
            if message.subtype == "success":
                print(message.result)
            else:
                print(f"Dừng sớm: {message.subtype}, đã chi {message.total_cost_usd}")
except Exception as error:
    # query() một lượt sẽ raise sau khi phát ResultMessage lỗi.
    print(f"Phiên kết thúc với lỗi: {error}")
```

`ResultMessage` còn có trường `stop_reason` của lượt cuối cùng (`end_turn`, `max_tokens`, `refusal`…). Muốn phát hiện model từ chối, kiểm tra `stop_reason == "refusal"`.

## Ba cách kiểm soát tool

Model chọn tool nào để gọi; bạn kiểm soát lời gọi đó có được chạy hay không. Ba tùy chọn này hay bị nhầm với nhau:

| Tùy chọn | Tác dụng | Điều dễ hiểu sai |
|---|---|---|
| `allowed_tools` | **Tự duyệt** các tool được liệt kê, không cần hỏi | Không phải danh sách giới hạn. Tool không có trong danh sách vẫn tồn tại; lời gọi tới chúng đi qua permission mode |
| `disallowed_tools` | **Chặn** tool được liệt kê, bất kể cấu hình khác | Đây mới là cách cấm một tool |
| `permission_mode` | Mức giám sát của con người với các lời gọi còn lại | Xem bảng bên dưới |

Có thể giới hạn tới từng lệnh bằng rule, ví dụ `"Bash(npm *)"` chỉ cho phép lệnh `npm`. Khi một lời gọi bị từ chối, model nhận thông báo từ chối làm kết quả tool, và thường thử cách khác hoặc báo rằng không thể làm tiếp.

## Permission mode

| Mode | Hành vi | Dùng khi |
|---|---|---|
| `default` | Lời gọi cần duyệt và không khớp rule cho phép sẽ gọi callback `canUseTool`; không có callback thì từ chối | Ứng dụng tương tác có màn hình duyệt riêng |
| `acceptEdits` | Tự duyệt sửa file và các lệnh file phổ biến trong thư mục làm việc; lệnh Bash khác theo luật mặc định | Bạn tin các chỉnh sửa và muốn lặp nhanh |
| `plan` | Model khảo sát và lập kế hoạch | Muốn có kế hoạch trước một thay đổi lớn |
| `dontAsk` | Không bao giờ hỏi. Tool đã duyệt trước thì chạy, lời gọi lẽ ra phải hỏi thì bị từ chối | Agent headless, không có ai để duyệt |
| `auto` | Một bộ phân loại bằng model xét từng hành động như lệnh shell, request mạng | Agent tự hành nhưng vẫn muốn lớp bảo vệ |
| `bypassPermissions` | Chạy mọi lời gọi mà không hỏi, kể cả tool không có trong `allowed_tools` | Chỉ trong CI, container hoặc môi trường cô lập |

Cách chọn nhanh: ứng dụng tương tác dùng `default` kèm callback duyệt; agent sửa file trên máy dev dùng `acceptEdits`; `bypassPermissions` chỉ dành cho môi trường mà hành động của agent không ảnh hưởng tới hệ thống bạn quan tâm.

Tài liệu gốc: [Turns and budget](https://code.claude.com/docs/en/agent-sdk/agent-loop#turns-and-budget), [Configure permissions](https://code.claude.com/docs/en/agent-sdk/permissions).

## Tóm tắt

- `max_turns` và `max_budget_usd` là lưới an toàn do SDK thực thi; chúng không thay điều kiện dừng bình thường.
- Kiểm tra `ResultMessage.subtype` trước khi đọc `result`.
- `allowed_tools` là tự duyệt, `disallowed_tools` là chặn.
- Chọn permission mode theo việc có ai ngồi duyệt hay không và môi trường có cô lập hay không.
