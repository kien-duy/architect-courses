---
title: 1.6 · Session, resume và fork
description: Tiếp tục, khôi phục và rẽ nhánh một phiên; khi nào nên bắt đầu phiên mới kèm bản tóm tắt.
lesson:
  day: 3
  minutes: 10
quiz:
  - q: "A multi-user support application runs many conversations at once. A customer returns the next day and should continue their own earlier conversation. Which approach is correct?"
    options:
      - text: "Use `continue`, which picks up the most recent session"
        why: "`continue` lấy phiên gần nhất trong thư mục hiện tại. Trong ứng dụng nhiều người dùng, phiên gần nhất rất có thể là của khách khác."
      - text: "Store each customer's session ID and pass it to `resume`"
        why: "Đúng. `resume` nhận một session ID cụ thể. Khi có nhiều phiên song song, bạn phải tự lưu ID và khôi phục đúng phiên."
      - text: "Fork the most recent session for every returning customer"
        why: "Fork tạo bản sao lịch sử của một phiên để thử hướng khác. Nó không giải quyết việc tìm đúng phiên của khách."
      - text: "Start a new session and paste the full previous transcript into the system prompt"
        why: "Cách này tốn context, làm mất cấu trúc lời gọi tool và kết quả, và không cần thiết khi đã có `resume`."
    answer: 1
    keyword: "nhiều phiên / không phải phiên gần nhất → `resume` với session ID"
    relearn: "#continue-resume-và-fork"
    relearnLabel: "Continue, resume và fork"
  - q: "An agent analyzed a codebase yesterday. Overnight, a teammate refactored several of the files it had read. Today you want the agent to continue the work. What is the most reliable approach?"
    options:
      - text: "Resume the session unchanged; the agent will notice the differences by itself"
        why: "Phiên được khôi phục vẫn chứa kết quả đọc file cũ. Agent có thể suy luận trên nội dung đã lỗi thời mà không đọc lại."
      - text: "Fork the session so the stale results are removed"
        why: "Fork sao chép nguyên lịch sử, gồm cả kết quả tool cũ. Nó không loại bỏ dữ liệu lỗi thời."
      - text: "Resume and raise `max_turns` so the agent has time to re-check everything"
        why: "Thêm turn không báo cho agent biết thứ gì đã đổi. Nó vẫn tin vào kết quả cũ trong context."
      - text: "Tell the agent which files changed so it re-reads them, or start a fresh session seeded with a summary of the prior findings"
        why: "Đúng. Kết quả tool trong lịch sử đã lỗi thời. Hoặc chỉ rõ file thay đổi để agent phân tích lại đúng chỗ, hoặc bắt đầu phiên mới với bản tóm tắt có cấu trúc khi thay đổi lớn."
    answer: 3
    keyword: "kết quả tool **lỗi thời** → chỉ rõ file thay đổi, hoặc phiên mới + tóm tắt"
    relearn: "#khi-nào-nên-bắt-đầu-phiên-mới"
    relearnLabel: "Khi nào nên bắt đầu phiên mới"
---

Một **session** là lịch sử hội thoại mà SDK tích lũy khi agent làm việc: prompt của bạn, mọi lời gọi tool, mọi kết quả tool, mọi phản hồi. SDK tự ghi nó xuống đĩa để bạn quay lại sau.

Quay lại một session nghĩa là agent có lại toàn bộ context trước đó: file đã đọc, phân tích đã làm, quyết định đã chốt.

:::caution[Session lưu hội thoại, không lưu file]
Khôi phục một session không khôi phục trạng thái file trên đĩa. Muốn chụp và hoàn tác thay đổi file mà agent đã thực hiện, dùng file checkpointing.
:::

## Continue, resume và fork

| | Tìm phiên bằng cách nào | Phiên gốc | Dùng khi |
|---|---|---|---|
| **Continue** | Phiên gần nhất trong thư mục hiện tại. Không cần theo dõi ID | Được nối thêm | Ứng dụng chạy một hội thoại tại một thời điểm |
| **Resume** | Session ID bạn truyền vào | Được nối thêm | Có nhiều phiên (mỗi người dùng một phiên), hoặc cần quay lại phiên không phải gần nhất |
| **Fork** | Session ID bạn truyền vào | **Giữ nguyên**. Phiên mới bắt đầu từ bản sao lịch sử | Thử một hướng khác mà vẫn giữ được đường quay lại |

Trong Python SDK:

```python
from claude_agent_sdk import ClaudeAgentOptions

ClaudeAgentOptions(continue_conversation=True)              # continue
ClaudeAgentOptions(resume=session_id)                       # resume
ClaudeAgentOptions(resume=session_id, fork_session=True)    # fork
```

Session ID lấy từ `ResultMessage.session_id`, có ở mọi kết quả kể cả khi lượt chạy kết thúc bằng lỗi.

Với Claude Code dòng lệnh, tương ứng là `--continue` và `--resume <session-id>`:

```bash
claude -p "Review module auth" --output-format json | jq -r '.session_id'
```

```bash
claude -p "Giờ xem tiếp các truy vấn database" --continue
```

## Chọn cách làm theo hình dạng ứng dụng

| Bạn đang xây | Dùng |
|---|---|
| Việc một lượt, không có câu hỏi tiếp theo | Không cần gì thêm. Một lời gọi `query()` là đủ |
| Chat nhiều lượt trong một tiến trình | `ClaudeSDKClient` (Python). SDK tự theo dõi phiên |
| Tiếp tục sau khi tiến trình khởi động lại | `continue_conversation=True` |
| Quay lại một phiên cụ thể trong quá khứ | Lưu session ID, truyền vào `resume` |
| Thử phương án khác mà không mất bản gốc | Fork |

Fork đặc biệt hữu ích để **so sánh phương án**: sau khi agent khảo sát xong codebase, fork hai nhánh, mỗi nhánh thử một cách refactor. Cả hai nhánh dùng chung phần khảo sát mà không phải làm lại, và không nhánh nào làm bẩn context của nhánh kia.

## Khi nào nên bắt đầu phiên mới

Resume không phải lúc nào cũng tốt. Một phiên được khôi phục mang theo **mọi kết quả tool cũ**. Nếu thế giới đã đổi trong lúc đó, các kết quả ấy đã lỗi thời, và agent vẫn tin chúng.

Hai tình huống:

- **Vài file đã thay đổi.** Resume, nhưng nói rõ file nào đổi để agent đọc lại đúng những file đó: "Từ lần trước, `auth.ts` và `session.ts` đã được refactor. Hãy đọc lại hai file này trước khi tiếp tục." Đừng mong agent tự phát hiện.
- **Thay đổi lớn, hoặc phiên đã quá dài.** Bắt đầu phiên mới và mở đầu bằng một **bản tóm tắt có cấu trúc** về những gì đã biết: mục tiêu, phát hiện chính, quyết định đã chốt, việc còn lại. Cách này đáng tin hơn là kéo theo một context đầy kết quả cũ.

Nguyên tắc: resume khi context cũ **vẫn đúng**. Khi nó không còn đúng, context mới kèm tóm tắt tốt hơn context cũ kèm dữ liệu sai.

## Session và nén hội thoại

Context window không được làm mới giữa các turn trong một phiên; mọi thứ tích lũy dần. Khi gần đầy, SDK tự **nén** (compact): tóm tắt phần lịch sử cũ để giải phóng chỗ.

Nén có thể làm mất chỉ dẫn cụ thể từ đầu hội thoại. Vì vậy quy tắc lâu dài nên nằm trong CLAUDE.md chứ không nằm trong prompt đầu tiên: nội dung CLAUDE.md được đưa lại vào mọi request. Chủ đề này được học kỹ ở Domain 5.

Tài liệu gốc: [Work with sessions](https://code.claude.com/docs/en/agent-sdk/sessions).

## Tóm tắt

- Continue = phiên gần nhất. Resume = phiên theo ID. Fork = bản sao để rẽ nhánh, bản gốc giữ nguyên.
- Nhiều người dùng → lưu session ID và dùng resume.
- Session lưu hội thoại, không lưu trạng thái file.
- Kết quả tool lỗi thời: chỉ rõ file đã đổi, hoặc bắt đầu phiên mới kèm tóm tắt có cấu trúc.
