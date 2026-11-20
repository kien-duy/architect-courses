---
title: 5.3 · Lan truyền lỗi trong hệ nhiều agent
description: Phân biệt truy cập thất bại với kết quả rỗng, trả lỗi có cấu trúc lên coordinator, phục hồi tại chỗ, và chú thích độ phủ trong báo cáo cuối.
lesson:
  day: 10
  minutes: 14
quiz:
  - q: "A web-search subagent hits a timeout. Its code catches the exception and returns `{\"results\": []}`. The coordinator's final report states that no published research exists on the topic. What is the design flaw?"
    options:
      - text: "The coordinator should have retried the subagent three times before writing the report"
        why: "Coordinator không có lý do gì để thử lại: thứ nó nhận được trông giống hệt một lần tìm thành công mà không có kết quả."
      - text: "The subagent should have raised an exception that stops the whole research run"
        why: "Dừng toàn bộ quy trình làm mất kết quả của các subagent khác. Đây là anti-pattern ở chiều ngược lại."
      - text: "The timeout value was too short"
        why: "Timeout dài hơn làm lỗi hiếm hơn nhưng không sửa được việc lỗi bị che khi nó xảy ra."
      - text: "An access failure was reported as a valid empty result, so the coordinator could not tell 'nothing found' from 'could not search'"
        why: "Đúng. Rỗng vì không có gì và rỗng vì không tìm được là hai sự thật khác nhau. Subagent phải báo rõ đây là lỗi truy cập."
    answer: 3
    keyword: "**truy cập thất bại** ≠ **kết quả rỗng hợp lệ**"
    relearn: "#truy-cập-thất-bại-khác-kết-quả-rỗng"
    relearnLabel: "Truy cập thất bại khác kết quả rỗng"
  - q: "A document-analysis subagent fails on one of five PDFs because the file is corrupted. Which response gives the coordinator the best basis for deciding what to do?"
    options:
      - text: "`{\"status\": \"error\", \"message\": \"Document analysis unavailable\"}`"
        why: "Trạng thái chung chung che mất mọi thứ coordinator cần: lỗi loại gì, ở file nào, bốn file còn lại ra sao."
      - text: "A structured result with the failure type, the file that was attempted, the analyses of the four readable PDFs, and suggested alternatives"
        why: "Đúng. Coordinator biết lỗi gì, ở đâu, đã có gì trong tay và có thể thử gì tiếp, nên quyết định được: thử cách khác, dùng kết quả một phần, hay ghi nhận lỗ hổng."
      - text: "The analyses of the four readable PDFs, with no mention of the fifth"
        why: "Đây là che lỗi. Báo cáo cuối sẽ trông như đã phủ đủ năm tài liệu."
      - text: "The full stack trace of the PDF parser"
        why: "Stack trace là chi tiết triển khai. Nó tốn context và không cho coordinator biết phần nào của nhiệm vụ bị ảnh hưởng hay nên làm gì tiếp."
    answer: 1
    keyword: "lỗi có cấu trúc: **loại lỗi + đã thử gì + kết quả một phần + phương án khác**"
    relearn: "#lỗi-có-cấu-trúc-gửi-lên-coordinator"
    relearnLabel: "Lỗi có cấu trúc gửi lên coordinator"
  - q: "A research coordinator receives full results for two subtopics and a structured timeout error with partial results for the third. A retry with a narrower query also times out. What should the final report do?"
    options:
      - text: "Present all three sections, marking the third as partially covered and stating why and what is missing"
        why: "Đúng. Kết quả của hai phần đầu vẫn có giá trị. Phần thứ ba được trình bày kèm chú thích độ phủ để người đọc biết giới hạn của nó."
      - text: "Return an error instead of a report, because the research is incomplete"
        why: "Một lỗi ở một nhánh không nên xóa bỏ kết quả hợp lệ của các nhánh khác."
      - text: "Write the third section from the model's general knowledge so the report looks complete"
        why: "Nội dung không có nguồn được trộn vào như thể đã nghiên cứu. Người đọc không thể phân biệt phần nào có căn cứ."
      - text: "Omit the third section so the report only contains verified content"
        why: "Bỏ lặng lẽ khiến người đọc tưởng chủ đề chỉ có hai phần. Lỗ hổng phải được nêu ra, không phải giấu đi."
    answer: 0
    keyword: "tiếp tục với kết quả một phần + **chú thích độ phủ**"
    relearn: "#chú-thích-độ-phủ-trong-báo-cáo-cuối"
    relearnLabel: "Chú thích độ phủ trong báo cáo cuối"
---

Trong hệ nhiều agent, lỗi ở một subagent là chuyện thường: timeout, file hỏng, nguồn không truy cập được. Điều quyết định độ tin cậy của cả hệ là lỗi đó **đi lên coordinator dưới dạng gì**. Che đi thì báo cáo cuối sai mà không ai biết; dừng tất cả thì mất luôn phần đã làm tốt.

## Hai anti-pattern đối xứng

| Anti-pattern | Trông như thế nào | Hậu quả |
|---|---|---|
| **Che lỗi** (silent suppression) | Subagent bắt exception rồi trả danh sách rỗng, hoặc trả phần làm được mà không nhắc phần lỗi | Coordinator tưởng mọi thứ đã được phủ. Báo cáo cuối tự tin về một kết luận thiếu căn cứ |
| **Dừng tất cả** | Một subagent lỗi làm cả quy trình trả về lỗi | Kết quả hợp lệ của các subagent khác bị vứt bỏ. Người dùng không nhận được gì |

Hai lỗi này ngược chiều nhau nhưng cùng gốc: coordinator không được trao đủ thông tin để **tự quyết định**. Thiết kế đúng nằm ở giữa: subagent báo lỗi rõ ràng kèm những gì đã có, coordinator chọn cách phục hồi, và báo cáo cuối nói thật về phần thiếu.

Nhớ lại từ [bài 1.3](../../domain-1/03-coordinator-subagent/): coordinator chỉ nhận **message cuối** của subagent. Nó không thấy lời gọi tool nào bị lỗi bên trong. Nếu message cuối không nói về lỗi, với coordinator lỗi đó chưa từng xảy ra.

## Truy cập thất bại khác kết quả rỗng

Đây là phân biệt quan trọng nhất của bài.

| | Truy cập thất bại | Kết quả rỗng hợp lệ |
|---|---|---|
| Chuyện gì xảy ra | Không thực hiện được việc tìm hoặc đọc: timeout, file không tồn tại, bị từ chối quyền | Đã tìm hoặc đọc thành công, và không có gì khớp |
| Điều suy ra được | **Chưa biết** câu trả lời | Câu trả lời là **không có** |
| Coordinator nên làm gì | Quyết định: thử lại, thử cách khác, hay ghi nhận lỗ hổng | Dùng như một phát hiện: "nguồn này không đề cập" |

Một subagent trả `[]` cho cả hai trường hợp buộc coordinator đoán. Và nó sẽ đoán theo hướng lạc quan: không có kết quả nghĩa là không tồn tại.

```json
{"status": "ok", "source": "sources/khao-sat-2023.md", "claims": []}
```

```json
{"status": "error", "failure_type": "not_found", "attempted": "sources/chi-phi-2026.md"}
```

Hai phản hồi trên đều "không có nhận định nào", nhưng nói hai điều khác hẳn. Cái đầu là một phát hiện. Cái sau là một lỗ hổng.

Cùng nguyên tắc áp dụng ở tầng tool: một tool lỗi phải báo là lỗi (`is_error` trong `tool_result` của Messages API, hay cờ `isError` của MCP, học ở Domain 2), không trả về một chuỗi rỗng trông như thành công.

## Bốn loại lỗi và cách xử lý

Không phải lỗi nào cũng nên thử lại. Phân loại quyết định hành động.

| Loại lỗi | Ví dụ | Thử lại nguyên trạng? | Hành động |
|---|---|:-:|---|
| **Tạm thời** (transient) | Timeout, HTTP 503, mất mạng | Có | Thử lại vài lần, có giãn cách tăng dần |
| **Dữ liệu vào sai** (validation) | Sai định dạng ngày, thiếu trường bắt buộc | Không | Sửa input rồi gọi lại |
| **Nghiệp vụ** (business) | Vượt hạn mức hoàn tiền, đơn đã hủy | Không | Giải thích cho người dùng, đề xuất phương án khác |
| **Quyền truy cập** (permission) | Bị từ chối truy cập tài liệu | Không | Báo lên, thường là escalate |

Một thông báo như "search unavailable" không cho biết lỗi thuộc loại nào. Coordinator không thể biết nên thử lại (lỗi tạm thời), nên đổi truy vấn (dữ liệu vào sai), hay nên bỏ (lỗi quyền). Đó là lý do trạng thái chung chung bị coi là anti-pattern: nó không sai, nhưng nó giấu đúng thứ cần cho quyết định.

## Lỗi có cấu trúc gửi lên coordinator

Một báo cáo lỗi tốt trả lời bốn câu hỏi: lỗi gì, đã thử gì, đã có gì trong tay, và có thể thử gì khác.

```json
{
  "status": "partial_failure",
  "failure_type": "timeout",
  "attempted": {
    "query": "thị phần xe điện Đông Nam Á 2026",
    "sources_tried": ["cổng thống kê A", "kho báo cáo B"],
    "retries": 2
  },
  "partial_results": [
    {
      "claim": "Xe điện chiếm 14% doanh số xe mới tại Thái Lan nửa đầu 2026",
      "source": "kho báo cáo B, báo cáo quý 2",
      "published": "2026-07-18"
    }
  ],
  "alternatives": [
    "Thu hẹp truy vấn theo từng nước",
    "Dùng subagent phân tích tài liệu trên các báo cáo đã tải về"
  ],
  "coverage_impact": "Chưa có số liệu cho Indonesia, Việt Nam, Malaysia"
}
```

| Trường | Coordinator dùng để |
|---|---|
| `failure_type` | Biết lỗi thuộc loại nào, có đáng thử lại không |
| `attempted` | Không lặp lại đúng thứ đã thất bại |
| `partial_results` | Giữ lại phần đã làm được |
| `alternatives` | Chọn bước tiếp theo mà không phải tự đoán |
| `coverage_impact` | Viết chú thích độ phủ trong báo cáo cuối |

Với thông tin này, coordinator có bốn lựa chọn thực sự: thử lại với truy vấn khác, dùng kết quả một phần, giao cho subagent khác, hoặc đi tiếp và ghi nhận lỗ hổng. Thiếu nó, coordinator chỉ còn hai lựa chọn tồi: bỏ qua hoặc dừng.

Để subagent trả đúng dạng này, hãy ghi định dạng lỗi vào system prompt của nó, ngang hàng với định dạng kết quả thành công. [Lab 5.7](../07-lab/) làm đúng việc này.

## Phục hồi tại chỗ trước rồi mới báo lên

Không phải lỗi nào cũng cần lên tới coordinator. Quy tắc chia việc:

- **Subagent tự xử lý lỗi tạm thời.** Timeout lần đầu thì thử lại một hai lần. Coordinator không cần biết về một lần thử lại đã thành công.
- **Subagent báo lên khi không tự phục hồi được**, kèm kết quả một phần và những gì đã thử.
- **Subagent không thử lại vô hạn.** Vòng lặp thử lại không giới hạn làm cả hệ chậm và tốn chi phí, trong khi coordinator có thể đã chọn cách khác từ lâu.

| Tình huống | Ai xử lý |
|---|---|
| Timeout một lần, lần sau thành công | Subagent. Không báo gì |
| Timeout ba lần liên tiếp | Subagent báo lên kèm kết quả một phần |
| File không tồn tại | Subagent báo lên ngay. Thử lại không thay đổi gì |
| Nguồn trả dữ liệu mâu thuẫn | Không phải lỗi. Subagent trả cả hai giá trị kèm nguồn, xem [bài 5.6](../06-nguon-goc-du-lieu/) |

Lý do để coordinator quyết định các lỗi không phục hồi được: chỉ nó nhìn thấy toàn cảnh. Nó biết phần bị thiếu có quan trọng với câu hỏi gốc không, có subagent nào khác bù được không, và ngân sách còn bao nhiêu.

## Chú thích độ phủ trong báo cáo cuối

Bước cuối cùng của lan truyền lỗi là tới người đọc. Báo cáo tổng hợp phải nói rõ phần nào có căn cứ đầy đủ và phần nào còn hổng.

```markdown
# Thị trường xe điện Đông Nam Á, 2026

## Thái Lan · ĐỘ PHỦ: ĐỦ
Xe điện chiếm 14% doanh số xe mới nửa đầu 2026 (kho báo cáo B, 2026-07-18). ...

## Indonesia · ĐỘ PHỦ: MỘT PHẦN
Chỉ có số liệu quý 1. Truy vấn số liệu quý 2 bị timeout sau 2 lần thử lại.
Các nhận định dưới đây dựa trên một nguồn duy nhất. ...

## Việt Nam · ĐỘ PHỦ: THIẾU
Không truy cập được nguồn nào (lỗi quyền truy cập cổng thống kê A).
Phần này chưa được nghiên cứu, không phải là "không có dữ liệu".
```

Chú thích độ phủ làm ba việc: giữ lại giá trị của phần đã làm tốt, ngăn người đọc suy ra kết luận từ phần thiếu, và chỉ ra chính xác việc cần làm tiếp. Dòng cuối của ví dụ trên chính là phân biệt giữa truy cập thất bại và kết quả rỗng, được đưa tới tận người đọc.

Tài liệu gốc: [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents), [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls).

## Tóm tắt

- Hai anti-pattern: che lỗi (trả rỗng như thành công) và dừng tất cả vì một lỗi.
- Truy cập thất bại nghĩa là chưa biết; kết quả rỗng hợp lệ nghĩa là không có. Hai thứ phải trông khác nhau.
- Lỗi có cấu trúc gồm loại lỗi, đã thử gì, kết quả một phần, phương án khác, ảnh hưởng tới độ phủ.
- Subagent tự xử lý lỗi tạm thời với số lần thử lại có giới hạn; lỗi không phục hồi được thì báo lên để coordinator quyết định.
- Báo cáo cuối có chú thích độ phủ cho từng phần: đủ, một phần, thiếu, kèm lý do.
