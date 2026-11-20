---
title: 4.4 · Validation và retry kèm phản hồi lỗi
description: Kiểm tra lỗi ngữ nghĩa bằng code, gửi lại kèm lỗi cụ thể, nhận biết khi nào retry vô ích, và thiết kế vòng phản hồi.
lesson:
  day: 9
  minutes: 14
quiz:
  - q: "A pipeline's validator finds that an extracted invoice has line items summing to 2,214,000 but a subtotal of 2,000,000. The team wants the model to correct it. Which retry request is most likely to succeed?"
    options:
      - text: "Send the same prompt again unchanged"
        why: "Model nhận đúng thông tin như lần đầu nên dễ lặp lại đúng lỗi đó. Không có gì cho nó biết sai ở đâu."
      - text: "Send 'The previous answer was wrong. Try again and be more careful.'"
        why: "Model không biết sai ở trường nào và sai bao nhiêu. Nó có thể sửa những chỗ đang đúng."
      - text: "Send only the failed JSON and ask the model to fix the numbers"
        why: "Thiếu văn bản gốc, model chỉ có thể sửa số cho khớp phép tính, tức là bịa, thay vì đọc lại nguồn."
      - text: "Send the original document, the previous extraction, and the specific error: 'line items sum to 2,214,000 but subtotal is 2,000,000 (difference 214,000)'"
        why: "Đúng. Ba thành phần này cho model biết chính xác sai ở đâu và cho phép nó đọc lại nguồn để tìm phần bị sót, ví dụ một dòng chiết khấu 214.000."
    answer: 3
    keyword: "retry = **văn bản gốc + kết quả sai + lỗi cụ thể**"
    relearn: "#retry-kèm-phản-hồi-lỗi"
    relearnLabel: "Retry kèm phản hồi lỗi"
  - q: "An extraction job must fill `contract_end_date`. For some contracts the end date is defined only in a separate annex that is not part of the input. After three retries with detailed error messages, the field is either null or a guessed date. What should the team conclude?"
    options:
      - text: "The error message needs to be even more specific"
        why: "Thông báo lỗi dù cụ thể đến đâu cũng không tạo ra thông tin không có trong đầu vào."
      - text: "Retrying cannot help because the information is absent from the input; provide the annex or route the document to a human"
        why: "Đúng. Retry chỉ sửa được lỗi trích xuất. Khi thông tin nằm ở tài liệu khác, phải bổ sung tài liệu đó hoặc chuyển cho người xử lý. Retry thêm chỉ làm tăng nguy cơ bịa."
      - text: "The retry limit should be raised from three to ten"
        why: "Nhiều lượt hơn trên cùng đầu vào thiếu thông tin chỉ tốn thêm tiền và thêm cơ hội để model đoán."
      - text: "The field should be made required and non-nullable so the model must answer"
        why: "Ép phải có giá trị khi nguồn không có là công thức tạo ra dữ liệu bịa."
    answer: 1
    keyword: "thông tin **không có trong nguồn** → retry vô ích"
    relearn: "#khi-nào-retry-vô-ích"
    relearnLabel: "Khi nào retry vô ích"
  - q: "A finance team wants the extraction itself to reveal invoices whose printed total disagrees with their line items, without hiding the discrepancy. Which schema design supports this?"
    options:
      - text: "Extract both `stated_total` (as printed) and `calculated_total` (summed from the line items), and compare them in code"
        why: "Đúng. Tách con số văn bản ghi khỏi con số tự tính làm sự chênh lệch hiện ra thành dữ liệu, và code có thể chuyển những hóa đơn lệch cho người duyệt."
      - text: "A single `total` field with the instruction 'make sure the total is correct'"
        why: "Một trường không thể chứa cả con số in trên hóa đơn lẫn con số đúng. Model sẽ chọn một trong hai và sự chênh lệch biến mất."
      - text: "A `total` field plus a boolean `is_valid` set by the model"
        why: "Cờ tự chấm không cho biết lệch bao nhiêu và lệch ở đâu, và model có thể đặt `true` trong khi số liệu vẫn lệch."
      - text: "A `total` field constrained with `minimum` and `maximum`"
        why: "Khoảng giá trị không biểu diễn được quan hệ giữa tổng và các dòng, và ràng buộc số không được hỗ trợ ở chế độ strict."
    answer: 0
    keyword: "`stated_total` + `calculated_total` → chênh lệch tự lộ ra"
    relearn: "#tự-phát-hiện-mâu-thuẫn"
    relearnLabel: "Tự phát hiện mâu thuẫn"
---

Schema ở bài [4.3](../03-structured-output/) bảo đảm output đúng hình dạng. Nó không bảo đảm output đúng. Bài này nói về lớp thứ hai: kiểm tra nội dung bằng code, và làm gì khi kiểm tra thất bại.

## Hai lớp kiểm tra

| Lớp | Bắt được gì | Ai thực hiện |
|---|---|---|
| Schema | Thiếu trường, sai kiểu, giá trị ngoài enum, JSON hỏng | API (strict, structured outputs) hoặc Claude Code (`--json-schema`) |
| Validation ngữ nghĩa | Tổng không khớp, ngày vô lý, mã sai định dạng, giá trị nằm nhầm trường | Code của bạn, chạy sau khi nhận output |

Validation ngữ nghĩa là code thường, không phải prompt. Ví dụ các luật cho một hóa đơn:

```python
def check(inv):
    errors = []
    lines_sum = sum(item["amount"] for item in inv["line_items"])
    if inv["stated_subtotal"] is not None and lines_sum != inv["stated_subtotal"]:
        errors.append(
            f"Tổng amount của line_items = {lines_sum}, "
            f"khác stated_subtotal = {inv['stated_subtotal']}."
        )
    if inv["due_date"] and inv["issue_date"] and inv["due_date"] < inv["issue_date"]:
        errors.append("due_date sớm hơn issue_date.")
    return errors
```

Trong Python, thư viện Pydantic hay được dùng cho việc này: một model Pydantic vừa sinh ra JSON schema để gửi cho Claude, vừa chạy các validator tùy biến (tổng các dòng bằng tổng hóa đơn, ngày bắt đầu trước ngày kết thúc) trên dữ liệu nhận về. Nhờ vậy schema và luật kiểm tra có chung một nguồn.

Thông báo lỗi của validator nên viết cho **model đọc**, không chỉ cho log: nêu tên trường, giá trị nhận được, giá trị mong đợi, và độ lệch. Lý do nằm ở mục tiếp theo.

## Retry kèm phản hồi lỗi

Khi validation thất bại, gửi lại đúng prompt cũ thường cho ra đúng lỗi cũ. Model cần biết nó sai ở đâu. Một yêu cầu retry tốt gồm ba phần:

1. **Văn bản gốc**, để model đọc lại nguồn.
2. **Kết quả trích xuất lần trước**, để model thấy nó đã trả lời gì.
3. **Lỗi validation cụ thể**, để model biết phải sửa chỗ nào.

```text
Retry tệ:
  Kết quả sai. Hãy làm lại cẩn thận hơn.

Retry tốt:
  <document> ...văn bản gốc... </document>

  Kết quả trích xuất lần trước:
  <previous_extraction> ...JSON lần trước... </previous_extraction>

  Bộ kiểm tra báo lỗi:
  <validation_errors>
  Tổng amount của line_items = 2.214.000, khác stated_subtotal = 2.000.000 (lệch 214.000).
  </validation_errors>

  Đọc lại văn bản và trích xuất lại. Nếu chính văn bản ghi số không khớp nhau,
  giữ nguyên số văn bản ghi, không sửa cho khớp.
```

Con số "lệch 214.000" là một manh mối: model đọc lại văn bản và tìm thứ gì có giá trị 214.000, ví dụ một dòng chiết khấu bị bỏ sót. Câu cuối cũng quan trọng. Thiếu nó, model có thể "sửa" bằng cách đổi số liệu cho khớp phép tính, tức là làm validator hài lòng bằng dữ liệu sai.

Luôn **giới hạn số lần retry** (thường 1 đến 2 lần). Lỗi còn lại sau giới hạn được chuyển cho người duyệt, không lặp vô hạn.

Claude Code và Agent SDK đã có sẵn một vòng retry cho lớp schema: khi output không khớp `--json-schema`, agent được yêu cầu nộp lại, và nếu hết số lần thử thì lượt chạy kết thúc với `error_max_structured_output_retries`. Vòng retry cho lớp ngữ nghĩa thì bạn phải tự viết, như trong [lab 4.7](../07-lab/).

## Khi nào retry vô ích

Retry sửa được lỗi của **bước trích xuất**. Nó không tạo ra được thông tin.

| Retry có ích | Retry vô ích |
|---|---|
| Sai định dạng (ngày viết `03/11/2026` thay cho `2026-11-03`) | Thông tin không có trong văn bản (tin nhắn không ghi hạn trả) |
| Giá trị nằm nhầm trường | Thông tin nằm ở một tài liệu khác không được đưa vào (phụ lục, hợp đồng khung) |
| Bỏ sót một dòng, cộng sai | Chính văn bản nguồn mâu thuẫn (hóa đơn in sai tổng) |
| Tính nhầm `calculated_total` | Văn bản không đọc được (ảnh mờ, mất trang) |

Với cột bên phải, retry không chỉ tốn tiền. Mỗi lượt retry kèm thông điệp "trường này đang thiếu" là một lần ép model điền gì đó, và làm tăng khả năng nó bịa. Cách xử lý đúng:

- Thông tin vắng mặt: chấp nhận `null`, hoặc bổ sung tài liệu còn thiếu rồi mới chạy lại.
- Nguồn mâu thuẫn: giữ nguyên cả hai con số và chuyển cho người duyệt.

Cách phân biệt trong code: nếu sau một lần retry có phản hồi cụ thể mà **cùng lỗi đó vẫn còn**, nhiều khả năng lỗi nằm ở nguồn. Dừng retry và chuyển tiếp.

## Tự phát hiện mâu thuẫn

Bạn có thể thiết kế schema để bước trích xuất tự làm lộ mâu thuẫn, thay vì che nó đi. Mẫu hay gặp là tách **số văn bản ghi** khỏi **số tự tính**:

```json
{
  "line_items": [
    {"description": "Switch 24 cổng", "amount": 2400000},
    {"description": "Cáp mạng Cat6", "amount": 1750000}
  ],
  "stated_total": 4510000,
  "calculated_total": 4150000
}
```

- `stated_total`: chép đúng con số in trên văn bản, kể cả khi nó sai.
- `calculated_total`: model tự cộng từ các dòng.

Hai trường lệch nhau là một tín hiệu rõ ràng, kiểm tra được bằng một phép so sánh. Nếu chỉ có một trường `total`, model phải chọn giữa số in trên hóa đơn và số nó tính ra, và dù chọn bên nào thì sự chênh lệch cũng biến mất khỏi dữ liệu.

Model không phải máy tính. `calculated_total` do model cộng có thể sai, nên code vẫn nên tự cộng lại các `amount`. Giá trị của mẫu này là buộc model nhìn vào từng dòng và cho bạn hai con số độc lập để đối chiếu.

## Vòng phản hồi để cải thiện prompt

Validation từng lượt sửa từng kết quả. **Vòng phản hồi** sửa chính prompt, dựa trên những lần hệ thống sai.

Muốn vậy, mỗi phát hiện phải ghi lại **thứ đã kích hoạt nó**. Mẫu thường dùng là trường `detected_pattern`:

```json
{
  "file": "src/db/query.py",
  "line": 57,
  "issue": "Câu SQL ghép chuỗi từ biến",
  "severity": "critical",
  "detected_pattern": "f-string trong cursor.execute"
}
```

Khi lập trình viên đánh dấu một phát hiện là sai, bạn có một bản ghi gồm mẫu kích hoạt và phán quyết của người dùng. Gom theo `detected_pattern` sẽ thấy ngay mẫu nào gây ra phần lớn false positive, ví dụ "f-string trong `cursor.execute`" bị báo cả khi biến là hằng số tên bảng. Từ đó bạn sửa đúng tiêu chí cho mẫu đó, thêm một ví dụ few-shot phân biệt, hoặc tắt tạm mẫu đó như ở bài [4.1](../01-tieu-chi-ro-rang/).

Không có trường này, bạn chỉ biết "bot sai 30%" mà không biết sai vì đâu.

Một lưu ý khi đặt tên trường: nên hỏi model **bằng chứng** hoặc **mẫu phát hiện được**, không hỏi "toàn bộ quá trình suy luận". Tài liệu hiện hành ghi rằng một trường yêu cầu model chép ra suy nghĩ từng bước có thể dẫn tới từ chối.

Tài liệu gốc: [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Get structured output from agents](https://code.claude.com/docs/en/agent-sdk/structured-outputs), [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).

## Tóm tắt

- Schema bắt lỗi cú pháp. Lỗi ngữ nghĩa phải bắt bằng code validation sau khi nhận output.
- Retry hiệu quả gồm văn bản gốc, kết quả lần trước và lỗi cụ thể. Giới hạn số lần retry.
- Retry vô ích khi thông tin không có trong nguồn, nằm ở tài liệu khác, hoặc nguồn tự mâu thuẫn. Khi đó chấp nhận `null` hoặc chuyển cho người duyệt.
- Trích xuất cả `stated_total` và `calculated_total` để mâu thuẫn tự lộ ra.
- Ghi `detected_pattern` trong mỗi phát hiện để phân tích false positive và sửa prompt.
