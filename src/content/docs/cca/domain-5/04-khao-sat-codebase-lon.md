---
title: 5.4 · Khảo sát codebase lớn mà không cạn context
description: Nhận biết context xuống cấp, giao việc khảo sát cho subagent, dùng scratchpad file, compact đúng lúc và lưu trạng thái để phục hồi.
lesson:
  day: 11
  minutes: 14
quiz:
  - q: "Three hours into investigating a large monorepo, Claude starts answering questions about the billing module with phrases like 'services like this typically validate input in a middleware layer' instead of naming the actual classes it read earlier. What does this indicate, and what should you do?"
    options:
      - text: "The model is being cautious; ask it to be more confident"
        why: "Đây không phải vấn đề giọng điệu. Model nói chung chung vì chi tiết cụ thể không còn rõ trong context."
      - text: "The billing module has no middleware; the answer is correct"
        why: "Câu trả lời không khẳng định điều gì về code thật. Nó mô tả 'thông lệ', đó chính là dấu hiệu cần chú ý."
      - text: "Context degradation: save key findings to a scratchpad file, then compact or start a fresh session that reads the scratchpad"
        why: "Đúng. Trả lời theo 'thông lệ' thay vì tên lớp cụ thể là dấu hiệu context xuống cấp. Ghi phát hiện ra file rồi làm gọn context sẽ khôi phục độ chính xác."
      - text: "The repository changed on disk; re-read every file"
        why: "Đề bài không nói file đã đổi. Đọc lại mọi thứ vào một context đã đầy chỉ làm tình trạng tệ hơn."
    answer: 2
    keyword: "trả lời theo 'thông lệ' thay vì tên cụ thể = **context xuống cấp**"
    relearn: "#dấu-hiệu-context-xuống-cấp"
    relearnLabel: "Dấu hiệu context xuống cấp"
  - q: "You need to know which modules depend on a payments package. Finding out means reading about 30 files. You will then spend the rest of the session designing a refactor. How should the dependency question be handled?"
    options:
      - text: "Read all 30 files in the main session so the refactor design has full detail"
        why: "30 file nằm lại trong context suốt phần còn lại của phiên, dù phần thiết kế chỉ cần kết luận về phụ thuộc."
      - text: "Skip the investigation and let the model infer dependencies from module names"
        why: "Đoán từ tên không phải là khảo sát. Thiết kế refactor sẽ dựa trên giả định chưa kiểm chứng."
      - text: "Run `/compact` before reading the files"
        why: "Compact làm gọn phần đã có, nhưng 30 file sắp đọc vẫn sẽ đổ vào context chính ngay sau đó."
      - text: "Delegate the question to a subagent that reads the files and returns a short list of dependents with file paths"
        why: "Đúng. Việc đọc diễn ra trong context của subagent. Phiên chính chỉ nhận bản tóm tắt và giữ chỗ cho việc thiết kế."
    answer: 3
    keyword: "khảo sát nhiều output → **subagent**, phiên chính giữ kết luận"
    relearn: "#giao-việc-khảo-sát-cho-subagent"
    relearnLabel: "Giao việc khảo sát cho subagent"
  - q: "A multi-agent migration runs for hours and the coordinator process crashes halfway. On restart, the team wants to continue without redoing finished work. Which design makes that possible?"
    options:
      - text: "Each agent writes its status and findings to a known file, and the coordinator reads a manifest of those files on startup"
        why: "Đúng. Trạng thái nằm trên đĩa ở vị trí biết trước, nên tiến trình mới biết việc nào xong, việc nào dở, và phát hiện nào đã có."
      - text: "Increase the context window so the coordinator can hold all progress in memory"
        why: "Context nằm trong tiến trình đang chạy. Khi tiến trình chết, thứ chưa được ghi ra ngoài sẽ mất."
      - text: "Have each subagent return longer final messages"
        why: "Message cuối chỉ tới được coordinator đang chạy. Nếu coordinator đã crash, không ai nhận."
      - text: "Lower `max_turns` so the run finishes before it can crash"
        why: "Giới hạn turn không ngăn được crash và có thể cắt ngang công việc đang dở."
    answer: 0
    keyword: "phục hồi sau crash = **trạng thái có cấu trúc trên đĩa** + manifest"
    relearn: "#lưu-trạng-thái-có-cấu-trúc-để-phục-hồi"
    relearnLabel: "Lưu trạng thái có cấu trúc để phục hồi"
---

Khảo sát một codebase lớn là kiểu việc ăn context nhanh nhất: mỗi file đọc, mỗi lần tìm kiếm đều để lại hàng nghìn token. [Bài 5.1](../01-giu-thong-tin-hoi-thoai-dai/) nói về việc giữ dữ kiện qua hội thoại dài. Bài này nói về chiến lược làm việc: thứ gì nên vào context chính, thứ gì nên ở ngoài.

## Dấu hiệu context xuống cấp

Context xuống cấp không báo lỗi. Bạn nhận ra nó qua cách model trả lời:

| Dấu hiệu | Ví dụ |
|---|---|
| **Nói theo thông lệ thay vì theo code thật** | "Các service kiểu này thường kiểm tra input ở tầng middleware" thay vì "`RefundValidator` trong `billing/validators.ts` kiểm tra số tiền" |
| **Trả lời không nhất quán** | Hai câu hỏi cách nhau mười phút cho hai mô tả khác nhau về cùng một hàm |
| **Quên quyết định đã chốt** | Đề xuất lại phương án đã bị loại từ đầu phiên |
| **Đọc lại file đã đọc** | Khảo sát lại thứ đã khảo sát vì kết quả cũ không còn rõ |

Dấu hiệu đầu tiên là thứ đề thi hay mô tả nhất: model chuyển từ tên lớp, tên file cụ thể sang "typical patterns". Khi thấy nó, đừng hỏi thêm trong cùng context. Hãy làm gọn context bằng các cách trong bài này.

Cách phòng ngừa đơn giản nhất là không đọc thừa. Khảo sát **tăng dần**: dùng Grep tìm điểm vào (định nghĩa hàm, chỗ export), đọc đúng những file đó, Grep tiếp để tìm nơi sử dụng, rồi đọc các file gọi tới. Đọc cả thư mục ngay từ đầu là cách nhanh nhất để đầy context bằng thứ không cần.

## Giao việc khảo sát cho subagent

Một subagent làm việc trong context riêng. Các file nó đọc ở lại đó; phiên chính chỉ nhận message cuối. Đây là công cụ mạnh nhất để bảo vệ context chính.

```text
Phiên chính:  "Module payments phụ thuộc vào những gì? Trả về danh sách kèm đường dẫn."
   └─ Subagent: đọc 30 file, lần theo import
        └─ Trả về: "payments phụ thuộc AuthService (auth/service.ts),
                    OrderModel (orders/model.ts), và API ngoài PaymentGateway
                    (gọi tại payments/gateway-client.ts)."

Phiên chính giữ 3 dòng thay vì 30 file.
```

Claude Code có sẵn subagent **Explore** cho việc này: Claude giao cho nó khi cần tìm hiểu codebase mà không sửa gì, và kết quả khảo sát không đổ vào hội thoại chính.

Bốn nguyên tắc khi dùng subagent để khảo sát:

- **Mỗi subagent một câu hỏi cụ thể.** "Hàm `refund()` được gọi từ đâu?" tốt hơn "tìm hiểu module payments". Việc điều phối ở mức cao nằm lại ở agent chính.
- **Yêu cầu kết quả có cấu trúc, không phải dữ liệu thô.** Một subagent dán lại nguyên văn 30 file vào message cuối thì việc cô lập context trở nên vô nghĩa. Nêu rõ định dạng trả về: danh sách, đường dẫn, một câu cho mỗi mục.
- **Tóm tắt phát hiện trước khi sang pha tiếp theo.** Subagent của pha sau không thấy gì từ pha trước ([bài 1.3](../../domain-1/03-coordinator-subagent/)). Agent chính phải đưa bản tóm tắt các phát hiện chính vào prompt giao việc.
- **Chú ý tổng lượng trả về.** Kết quả của subagent vẫn quay về context chính. Mười subagent, mỗi cái trả một báo cáo dài, cũng làm đầy context.

Subagent cũng có giới hạn riêng: context window của nó theo model của nó, và nó cũng tự compact khi đầy. Việc quá lớn cho một subagent thì chia tiếp.

## Scratchpad file

**Scratchpad** là một file trên đĩa nơi agent ghi lại phát hiện quan trọng trong lúc làm việc. File không nằm trong context, nên không bị tóm tắt, không bị nén, và sống qua cả một phiên mới.

```markdown
# notes/khao-sat-payments.md

## Phát hiện chính
- `PaymentProcessor` (payments/processor.ts) kế thừa `BaseProcessor`
- `refund()` được gọi từ 3 nơi: OrderController, AdminPanel, job `nightly-reconcile`
- API PaymentGateway giới hạn 100 request mỗi phút
- Migration 0047 (2026-08-12) thêm cột `refund_reason`, NOT NULL

## Đã loại
- Không dùng event bus cho refund: AdminPanel cần kết quả đồng bộ

## Còn mở
- Job `nightly-reconcile` có thử lại khi gateway trả 429 không?
```

Cách dùng:

- **Ghi ngay khi phát hiện**, không đợi cuối phiên. Lúc context xuống cấp thì đã quá muộn để nhớ lại chính xác.
- **Ghi dữ kiện cụ thể**: tên lớp, đường dẫn, con số, ngày. Ghi cả phương án đã loại và lý do, để không khảo sát lại.
- **Đọc lại khi cần**, thay vì hỏi context. Sau khi compact, hoặc trong một phiên mới, agent đọc scratchpad và tiếp tục mà không phải khảo sát lại từ đầu.

So với cách "phiên mới kèm tóm tắt có cấu trúc" ở [bài 1.6](../../domain-1/06-session/), scratchpad chính là bản tóm tắt đó, được viết dần trong lúc làm thay vì dựng lại sau cùng.

Scratchpad khác CLAUDE.md. CLAUDE.md chứa quy tắc lâu dài của dự án và được nạp vào mọi phiên. Scratchpad chứa phát hiện của một cuộc khảo sát cụ thể và chỉ được đọc khi cần.

## Dùng compact và clear đúng lúc

Trong Claude Code, bạn có các lệnh sau để chủ động làm gọn context.

| Lệnh | Tác dụng | Dùng khi |
|---|---|---|
| `/compact` | Thay hội thoại bằng một bản tóm tắt | Phiên khảo sát đã dài, context đầy output tool, nhưng bạn còn tiếp tục cùng việc |
| `/compact <trọng tâm>` | Như trên, bạn chỉ định thứ cần giữ | Trước khi bắt đầu một việc lớn mới trong cùng phiên |
| `/clear` | Xóa hội thoại, bắt đầu lại | Chuyển sang việc không liên quan |
| `/context` | Hiện thứ gì đang chiếm context | Muốn biết nên cắt ở đâu |
| `/rewind` rồi chọn Summarize | Tóm tắt một phần hội thoại, trước hoặc sau một điểm | Chỉ một đoạn (ví dụ một lần debug dài) cần được nén |

`/compact` có rủi ro đã nêu ở bài 5.1: con số, ngày tháng và chi tiết cụ thể có thể không qua được bản tóm tắt. Vì vậy thứ tự đúng là **ghi scratchpad trước, compact sau**. Sau khi compact, thứ gì bản tóm tắt làm mất thì vẫn còn trong file.

`/compact` cũng không miễn phí: nó là một request lớn đọc lại toàn bộ hội thoại để tóm tắt. Nếu bạn không còn cần lịch sử, một phiên mới đọc scratchpad rẻ hơn.

## Lưu trạng thái có cấu trúc để phục hồi

Scratchpad dành cho phát hiện. Với quy trình nhiều agent chạy dài, bạn còn cần biết **việc nào đã xong** để phục hồi sau crash. Context nằm trong tiến trình; tiến trình chết thì thứ chưa ghi ra ngoài sẽ mất.

Mẫu thiết kế: mỗi agent ghi trạng thái của mình vào một vị trí biết trước, và coordinator đọc một file manifest khi khởi động.

```jsonc
// state/manifest.json
{
  "inventory":  {"status": "completed",   "output": "state/inventory.json"},
  "analysis":   {"status": "in_progress", "output": "state/analysis.json"},
  "migration":  {"status": "not_started", "output": null}
}
```

```jsonc
// state/analysis.json
{
  "status": "in_progress",
  "modules_done": ["auth", "orders"],
  "modules_remaining": ["payments", "reports"],
  "key_findings": ["orders gọi thẳng bảng payments, bỏ qua PaymentService"],
  "gaps": ["chưa đọc được reports/legacy vì file nhị phân"]
}
```

Khi khởi động lại, coordinator đọc manifest, bỏ qua pha đã xong, tiếp tục pha đang dở từ `modules_remaining`, và nạp `key_findings` vào prompt giao việc. Không pha nào phải chạy lại từ đầu.

Ba đặc điểm của trạng thái phục hồi được:

- **Có cấu trúc.** Trạng thái là trường có tên, đọc được bằng code, không phải một đoạn văn.
- **Ở vị trí biết trước.** Tiến trình mới không phải đi tìm.
- **Ghi sau mỗi bước có ý nghĩa**, không chỉ ở cuối.

Liên hệ với các cơ chế có sẵn: session của Agent SDK lưu **hội thoại** xuống đĩa để resume ([bài 1.6](../../domain-1/06-session/)), nhưng một hội thoại được khôi phục vẫn mang theo context đã đầy. File trạng thái cho phép bắt đầu bằng context sạch. Ở tầng API, **memory tool** phục vụ cùng mục đích: Claude ghi và đọc các file trong một thư mục bộ nhớ do ứng dụng của bạn lưu trữ, nên kiến thức sống qua nhiều phiên mà không chiếm context.

Tài liệu gốc: [Create custom subagents](https://code.claude.com/docs/en/sub-agents), [Explore the context window](https://code.claude.com/docs/en/context-window), [Checkpointing](https://code.claude.com/docs/en/checkpointing), [Memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool).

## Tóm tắt

- Context xuống cấp lộ ra qua câu trả lời theo "thông lệ", không nhất quán, quên quyết định cũ.
- Khảo sát tăng dần: Grep trước, đọc đúng file cần.
- Việc khảo sát nhiều output giao cho subagent với một câu hỏi cụ thể; yêu cầu kết quả có cấu trúc và tóm tắt phát hiện trước khi sang pha sau.
- Scratchpad file giữ phát hiện qua compaction và qua phiên mới. Ghi scratchpad trước, `/compact` sau.
- `/compact` khi còn tiếp tục cùng việc; `/clear` khi đổi việc.
- Phục hồi sau crash cần trạng thái có cấu trúc trên đĩa và một manifest ở vị trí biết trước.
