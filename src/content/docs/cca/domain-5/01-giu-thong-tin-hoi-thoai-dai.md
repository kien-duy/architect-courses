---
title: 5.1 · Giữ thông tin quan trọng qua hội thoại dài
description: Context window chứa gì, thông tin bị mất theo những cách nào, và các kỹ thuật giữ con số, ngày tháng, quyết định qua một hội thoại dài.
lesson:
  day: 10
  minutes: 15
quiz:
  - q: "A support agent handles a 60-turn conversation. After the history was summarized, the agent tells the customer the refund is 'around 1.3 million dong, requested sometime last month'. The original turns contained the exact amount and date. Which change best prevents this?"
    options:
      - text: "Ask the model to write longer summaries so fewer details are dropped"
        why: "Tóm tắt dài hơn vẫn là tóm tắt. Không có gì bảo đảm con số và ngày cụ thể được giữ nguyên qua nhiều lần nén."
      - text: "Switch to a model with a larger context window"
        why: "Context lớn hơn chỉ lùi thời điểm phải nén. Khi hội thoại đủ dài, vấn đề quay lại y nguyên."
      - text: "Keep exact amounts, dates and IDs in a structured 'case facts' block that is updated by code and included in every request, outside the summarized history"
        why: "Đúng. Dữ kiện giao dịch nằm trong một khối riêng, không đi qua bước tóm tắt, nên không bị làm mờ thành 'khoảng' hay 'tháng trước'."
      - text: "Tell the model in the system prompt to never use approximate wording"
        why: "Model không thể nói chính xác một con số đã bị mất khỏi context. Chỉ dẫn này chỉ đổi cách diễn đạt, không khôi phục dữ liệu."
    answer: 2
    keyword: "con số, ngày, mã → khối **case facts** ngoài phần tóm tắt"
    relearn: "#khối-case-facts-nằm-ngoài-phần-tóm-tắt"
    relearnLabel: "Khối case facts nằm ngoài phần tóm tắt"
  - q: "An order-lookup tool returns 45 fields per order. The agent uses only the status, total, items and return eligibility. After a dozen lookups, answers get slower and the agent starts confusing orders. What is the most effective fix?"
    options:
      - text: "Trim each tool result to the fields the task needs before it enters the conversation, for example in a `PostToolUse` hook"
        why: "Đúng. Kết quả tool nằm lại trong context ở mọi turn về sau. Giữ đúng các trường cần dùng làm giảm cả chi phí lẫn nhiễu."
      - text: "Ask the model to ignore the fields it does not need"
        why: "Các trường thừa vẫn nằm trong context và vẫn tốn token ở mọi request. Bỏ qua bằng lời không giải phóng chỗ."
      - text: "Call the tool less often and let the model rely on its memory of earlier results"
        why: "Cách này đổi dữ liệu mới lấy dữ liệu có thể đã cũ, và không giải quyết việc mỗi kết quả đang lớn gấp nhiều lần mức cần thiết."
      - text: "Raise `max_tokens` so the model has more room"
        why: "`max_tokens` giới hạn độ dài output. Nó không liên quan tới lượng input đang tích lũy."
    answer: 0
    keyword: "kết quả tool **tích lũy** → cắt còn trường cần dùng"
    relearn: "#cắt-gọn-kết-quả-tool"
    relearnLabel: "Cắt gọn kết quả tool"
  - q: "In a Claude Code session, a developer typed 'never touch the `legacy/` folder' in the first prompt. Hours later, after automatic compaction, Claude edits a file in `legacy/`. Where should the rule have been placed?"
    options:
      - text: "Repeated in every prompt the developer sends"
        why: "Cách này dựa vào việc con người không quên, và vẫn có thể bị tóm tắt mất giữa hai lần nhắc."
      - text: "In a rule file with `paths:` frontmatter scoped to `legacy/`"
        why: "Rule có `paths:` chỉ được nạp khi Claude đụng tới file khớp và cũng bị tóm tắt đi khi compaction. Nó không bảo đảm có mặt sau khi nén."
      - text: "In a longer, more emphatic first prompt"
        why: "Prompt đầu tiên là phần lịch sử cũ nhất, tức là phần bị tóm tắt trước tiên, dù viết nhấn mạnh thế nào."
      - text: "In the project-root CLAUDE.md, which is re-injected after compaction"
        why: "Đúng. CLAUDE.md ở gốc dự án được đọc lại từ đĩa sau khi nén, còn chỉ dẫn chỉ có trong hội thoại thì có thể mất."
    answer: 3
    keyword: "quy tắc lâu dài → **CLAUDE.md gốc**, không để trong hội thoại"
    relearn: "#compaction-giữ-gì-và-mất-gì"
    relearnLabel: "Compaction giữ gì và mất gì"
---

Một agent chạy lâu sẽ quên. Nó không quên theo kiểu báo lỗi; nó vẫn trả lời trôi chảy, chỉ là con số thành "khoảng", ngày thành "gần đây", và một phát hiện ở giữa tài liệu dài không bao giờ được nhắc tới. Bài này giải thích vì sao, và cách giữ những thứ không được phép mất.

## Context window chứa những gì

**Context window** là toàn bộ thông tin model nhìn thấy khi sinh một phản hồi: system prompt, định nghĩa tool, mọi message trong lịch sử (kể cả kết quả tool, ảnh, tài liệu), và chính output đang sinh ra.

Hai điều nền tảng:

- **Messages API không có trạng thái.** Model không nhớ gì giữa hai request. Muốn nó "nhớ" turn trước, request sau phải gửi lại toàn bộ lịch sử. Bỏ sót một phần lịch sử là model mất phần đó.
- **Trong một phiên, mọi thứ chỉ tích lũy.** Context không được làm mới giữa các turn. Mỗi lời gọi tool thêm cả input lẫn output của nó vào lịch sử và nằm lại đó ở mọi request về sau.

Nhiều hơn không có nghĩa là tốt hơn. Tài liệu chính thức gọi hiện tượng này là **context rot**: khi số token tăng, độ chính xác và khả năng nhớ lại của model giảm. Vì vậy chọn lọc thứ gì nằm trong context quan trọng không kém kích thước của nó.

:::note[Context 1M token có làm bài này lỗi thời?]
Tài liệu luyện thi thường coi context là thứ khan hiếm. Theo tài liệu hiện hành, phần lớn model đang dùng có context window 1 triệu token, và Claude Code tự nén khi gần đầy, nên bạn hiếm khi "hết chỗ". Nhưng ba rủi ro trong bài vẫn nguyên: tóm tắt làm mất chi tiết, input dài làm giảm độ chính xác, và mọi token thừa đều bị gửi lại (và tính tiền) ở từng request. Đề thi hỏi về cách thiết kế, không hỏi con số giới hạn.
:::

## Ba cách thông tin bị mất

| Hiện tượng | Chuyện gì xảy ra | Dấu hiệu |
|---|---|---|
| **Tóm tắt lũy tiến** (progressive summarization) | Lịch sử cũ được thay bằng bản tóm tắt. Bản tóm tắt lại bị tóm tắt tiếp. Mỗi lần, con số, phần trăm, ngày tháng bị nén thành mô tả chung | "Khoảng 1,3 triệu", "vài ngày trước", "khách có nhắc tới một đơn hàng" |
| **Lost in the middle** | Với input dài, model xử lý phần đầu và phần cuối đáng tin hơn phần giữa. Phát hiện nằm ở giữa dễ bị bỏ sót | Báo cáo tổng hợp 12 file nhưng chỉ nhắc tới phát hiện của 3 file đầu và 2 file cuối |
| **Kết quả tool phình to** | Tool trả 40 trường trong khi việc đang làm cần 5. Phần thừa chiếm context không tương xứng với giá trị | Sau vài chục lời gọi, phần lớn context là dữ liệu không ai dùng |

Cả ba đều không tạo ra lỗi nào để bạn bắt. Agent vẫn kết thúc với trạng thái thành công. Bạn phải thiết kế để chúng không xảy ra.

## Khối case facts nằm ngoài phần tóm tắt

Với dữ kiện mang tính giao dịch (mã đơn, số tiền, ngày, trạng thái, điều khách yêu cầu), đừng trông vào lịch sử hội thoại. Hãy trích chúng vào một **khối dữ kiện có cấu trúc** và đưa khối đó vào mọi request, tách khỏi phần lịch sử sẽ bị tóm tắt.

```text
=== CASE FACTS (cập nhật mỗi khi có dữ kiện mới) ===
Khách hàng:      KH-20931 (đã xác minh qua email + 4 số cuối thẻ)
Đơn hàng:        DH-48213, đặt ngày 2026-09-02
Số tiền:         1.290.000 đ
Vấn đề:          máy xay giao tới bị nứt cối
Khách yêu cầu:   hoàn tiền toàn bộ, không đổi máy
Hạn đổi trả:     2026-10-02
Trạng thái:      chờ ảnh chụp sản phẩm từ khách
===
```

Ba điểm làm nên khối này:

- **Giá trị chính xác, không diễn giải.** `1.290.000 đ`, không phải "hơn một triệu".
- **Được cập nhật bằng code hoặc bằng một bước rõ ràng**, không phải nhờ model tự nhớ. Khi tool trả về trạng thái mới, khối được ghi đè.
- **Nằm ở vị trí cố định trong mỗi request** (thường trong system prompt hoặc đầu message), nên dù lịch sử bị nén thế nào, dữ kiện vẫn nguyên vẹn.

Cùng ý tưởng áp dụng cho hệ nhiều agent: yêu cầu subagent trả kết quả **có cấu trúc kèm metadata** (ngày, nguồn) thay vì một đoạn văn. Đoạn văn sẽ bị tóm tắt tiếp ở tầng trên; trường có tên thì giữ được. [Bài 5.6](../06-nguon-goc-du-lieu/) đào sâu phần này.

## Cắt gọn kết quả tool

Kết quả tool là nguồn làm đầy context nhanh nhất. Cách xử lý là chỉ để vào hội thoại những trường mà việc đang làm cần đến.

```python
FIELDS = ["order_id", "status", "total", "items", "return_eligible"]

def trim_order(order: dict) -> dict:
    return {k: order[k] for k in FIELDS if k in order}
```

Hàm này có thể đặt ở ba nơi:

| Nơi đặt | Khi nào dùng |
|---|---|
| Trong chính tool | Bạn sở hữu tool. Trả đúng thứ cần ngay từ nguồn |
| Hook `PostToolUse`, trả `updatedToolOutput` | Tool của bên thứ ba hoặc MCP server bạn không sửa được. Xem [bài 1.5](../../domain-1/05-hooks/) |
| Code tự viết quanh Messages API | Bạn tự chạy vòng lặp: rút gọn trước khi tạo block `tool_result` |

Việc cắt này là xác định, nên giao cho code. Dặn model "hãy bỏ qua các trường không cần" không giải phóng một token nào: các trường đó vẫn nằm trong context.

Ở tầng API còn có **context editing** (beta): chiến lược `clear_tool_uses_20250919` tự xóa các kết quả tool cũ nhất khi context vượt ngưỡng bạn đặt, và thay bằng một dòng giữ chỗ. Nó phù hợp khi kết quả cũ không còn cần sau khi model đã xử lý xong.

## Sắp xếp input theo vị trí

Khi phải đưa một lượng lớn nội dung cho model (ví dụ kết quả của mười subagent), thứ tự và cấu trúc quyết định model có dùng hết hay không.

```text
## PHÁT HIỆN CHÍNH                      ← đầu: thứ không được bỏ sót
- 3 lỗ hổng mức nghiêm trọng, đều ở auth/session.ts
- 1 migration chưa có rollback (migration 0047)

## CHI TIẾT THEO FILE                   ← giữa: tra cứu khi cần
### auth/session.ts
...
### db/migrations/0047.sql
...

## VIỆC CẦN LÀM                         ← cuối: câu hỏi hoặc yêu cầu
Xếp ưu tiên ba lỗ hổng trên và đề xuất thứ tự sửa.
```

Nguyên tắc:

- **Phát hiện chính đặt ở đầu**, tóm tắt thành vài dòng.
- **Mỗi phần có tiêu đề rõ ràng.** Tiêu đề là mốc để model tìm lại nội dung ở giữa.
- **Câu hỏi hoặc yêu cầu đặt ở cuối**, sau dữ liệu.

:::note[Thuật ngữ trong tài liệu chính thức]
Đề thi và tài liệu luyện thi dùng tên "lost-in-the-middle effect". Trang prompting của tài liệu chính thức không dùng tên này, nhưng khuyến nghị cùng hướng: đặt tài liệu dài ở **đầu** prompt, đặt câu hỏi ở **cuối** (trong thử nghiệm, cách này cải thiện chất lượng tới 30% với input nhiều tài liệu), và bọc từng tài liệu trong thẻ XML kèm nguồn.
:::

## Compaction giữ gì và mất gì

Khi context gần đầy, Claude Code và Agent SDK tự **compact**: thay lịch sử cũ bằng một bản tóm tắt. [Bài 1.6](../../domain-1/06-session/) đã giới thiệu cơ chế này. Điều cần biết thêm là thứ gì quay lại sau khi nén.

| Nội dung | Sau compaction |
|---|---|
| System prompt | Vẫn áp dụng |
| CLAUDE.md ở gốc dự án, rule không có `paths:` | Được đọc lại từ đĩa và đưa vào lại |
| Rule có `paths:`, CLAUDE.md trong thư mục con | Bị tóm tắt cùng hội thoại. Chỉ nạp lại khi Claude đụng tới file khớp |
| File Claude đã đọc hoặc sửa | Đọc lại tối đa 5 file, ưu tiên file sửa gần nhất |
| Chỉ dẫn bạn chỉ nói trong hội thoại | Chỉ còn nếu bản tóm tắt giữ lại |
| Kết quả tool cũ, chi tiết từng bước | Chỉ còn dưới dạng tóm tắt |

Bạn có bốn cách tác động vào bản tóm tắt:

- **Viết quy tắc lâu dài vào CLAUDE.md gốc.** Nó được đưa lại sau mỗi lần nén.
- **Thêm một mục hướng dẫn tóm tắt trong CLAUDE.md**, liệt kê thứ phải giữ: mục tiêu hiện tại, đường dẫn file đã sửa, kết quả test, quyết định đã chốt. Tên mục tự do; bộ nén đọc theo ý nghĩa.
- **Chạy `/compact` kèm trọng tâm** trước khi bước sang việc lớn: `/compact giữ lại các thay đổi API và lệnh test`. Bạn chọn thứ được giữ thay vì để lần nén tự động đoán.
- **Hook `PreCompact`** chạy trước khi nén, với matcher `manual` hoặc `auto`. Dùng nó để lưu lại toàn bộ transcript trước khi bị tóm tắt.

Nếu bạn tự gọi Messages API, phần này do bạn lo: tự tóm tắt, hoặc dùng compaction phía server (đang ở beta). Nguyên tắc không đổi: thứ gì phải chính xác thì không để nó chỉ sống trong phần sẽ bị tóm tắt.

Tài liệu gốc: [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows), [Explore the context window](https://code.claude.com/docs/en/context-window), [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop), [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing), [Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction).

## Tóm tắt

- API không có trạng thái: lịch sử phải được gửi lại đầy đủ, và trong một phiên nó chỉ tích lũy.
- Ba cách mất thông tin: tóm tắt làm mờ con số và ngày, phần giữa của input dài bị bỏ sót, kết quả tool thừa chiếm chỗ.
- Dữ kiện giao dịch → khối case facts có cấu trúc, cập nhật bằng code, nằm ngoài phần bị tóm tắt.
- Cắt kết quả tool còn các trường cần dùng, bằng code chứ không bằng lời dặn.
- Phát hiện chính ở đầu, tiêu đề rõ cho từng phần, câu hỏi ở cuối.
- Quy tắc lâu dài nằm trong CLAUDE.md gốc; dùng `/compact` kèm trọng tâm để chọn thứ được giữ.
