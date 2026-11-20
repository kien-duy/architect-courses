---
title: 4.2 · Few-shot
description: Dùng vài ví dụ có chủ đích để output nhất quán, xử lý trường hợp mơ hồ và giảm bịa dữ liệu.
lesson:
  day: 8
  minutes: 12
quiz:
  - q: "A review tool's prompt describes the desired output in two paragraphs of prose. Findings still come back in different shapes: sometimes a paragraph, sometimes bullets, often without a file location. What is the most effective fix?"
    options:
      - text: "Add a third paragraph that describes the format in more detail"
        why: "Mô tả bằng lời đã thử và không đủ. Thêm lời mô tả vẫn để model tự hình dung hình dạng output."
      - text: "Add 'IMPORTANT: always follow the format exactly' in capital letters"
        why: "Nhấn mạnh không cho model biết định dạng trông ra sao. Nó chỉ làm model căng hơn với một yêu cầu vẫn mơ hồ."
      - text: "Add two or three example findings that show the exact fields: location, issue, severity, suggested fix"
        why: "Đúng. Ví dụ cho model thấy trực tiếp hình dạng output cần có. Đây là cách đáng tin nhất để có định dạng nhất quán."
      - text: "Post-process the output with regular expressions to normalize it"
        why: "Regex không khôi phục được trường bị thiếu như vị trí file, và sẽ vỡ khi model đổi cách viết."
    answer: 2
    keyword: "định dạng không nhất quán → **cho ví dụ**, đừng tả thêm"
    relearn: "#vì-sao-ví-dụ-hiệu-quả-hơn-lời-tả"
    relearnLabel: "Vì sao ví dụ hiệu quả hơn lời tả"
  - q: "An extraction prompt includes three examples, all of them standard tabular invoices with every field present. In production, the model invents a due date for emails that do not mention one. Which change addresses the cause?"
    options:
      - text: "Add an example of an informal document where missing fields are output as null"
        why: "Đúng. Cả ba ví dụ đều đủ trường, nên model học rằng output luôn đủ trường. Một ví dụ có trường null cho thấy cách xử lý đúng khi thông tin vắng mặt."
      - text: "Add five more tabular invoices to the examples"
        why: "Thêm ví dụ cùng loại củng cố đúng mẫu sai: output luôn đủ trường."
      - text: "Remove all examples so the model is not biased"
        why: "Bỏ ví dụ làm mất luôn sự nhất quán về định dạng, và không dạy model cách xử lý trường thiếu."
      - text: "Tell the model that invoices always contain a due date"
        why: "Điều này sai với dữ liệu thật và đẩy model bịa mạnh hơn."
    answer: 0
    keyword: "ví dụ phải **đa dạng**: có cả trường hợp thiếu trường → null"
    relearn: "#few-shot-cho-trích-xuất-dữ-liệu"
    relearnLabel: "Few-shot cho trích xuất dữ liệu"
  - q: "A support agent often picks `search_orders` when it should pick `search_customers` for requests like 'find Lan's account'. The tool descriptions are already detailed. What should be added to the prompt?"
    options:
      - text: "A rule: 'Always call search_customers first'"
        why: "Luật cứng này sai với những yêu cầu thật sự về đơn hàng, và làm mỗi yêu cầu tốn thêm một lời gọi."
      - text: "A few examples of ambiguous requests, each with the chosen tool and a one-line reason"
        why: "Đúng. Ví dụ cho trường hợp mơ hồ kèm lý do dạy model cách phân biệt, và nó suy rộng được sang yêu cầu mới."
      - text: "Twenty examples covering every possible request"
        why: "Không thể liệt kê mọi yêu cầu. Quá nhiều ví dụ tốn token và model dễ bám vào mẫu thay vì lý do."
      - text: "A longer system prompt explaining the database schema"
        why: "Hiểu schema không giải quyết việc chọn tool cho câu hỏi mơ hồ."
    answer: 1
    keyword: "trường hợp mơ hồ → 2–4 ví dụ **kèm lý do**"
    relearn: "#ví-dụ-cho-trường-hợp-mơ-hồ"
    relearnLabel: "Ví dụ cho trường hợp mơ hồ"
---

**Few-shot prompting** là đưa vào prompt vài cặp đầu vào và đầu ra mẫu để model làm theo. Khi tiêu chí bằng lời ở bài [4.1](../01-tieu-chi-ro-rang/) vẫn chưa đủ, ví dụ thường là thứ giải quyết được.

## Vì sao ví dụ hiệu quả hơn lời tả

Lời mô tả buộc model tự hình dung output. Ví dụ cho model thấy thẳng output đó. Tài liệu của Anthropic xếp ví dụ vào nhóm cách đáng tin nhất để điều khiển định dạng, giọng văn và cấu trúc của output.

Few-shot giúp bốn việc mà đề thi hay hỏi:

| Vấn đề | Few-shot giúp thế nào |
|---|---|
| Định dạng output mỗi lần một kiểu | Ví dụ chốt hình dạng: trường nào, thứ tự nào, viết ngắn hay dài |
| Trường hợp mơ hồ (chọn tool nào, có tính là lỗi không) | Ví dụ kèm lý do cho thấy ranh giới |
| Model lặp lại hành vi mặc định khi gặp mẫu mới | Ví dụ đa dạng dạy **nguyên tắc**, model suy rộng sang mẫu chưa gặp |
| Bịa giá trị khi trích xuất | Ví dụ có trường để trống cho thấy "không có thì ghi null" |

Few-shot không thay cho tiêu chí. Tiêu chí nói luật; ví dụ cho thấy luật được áp dụng ra sao. Hai thứ đi cùng nhau.

## Viết ví dụ thế nào

Ba tính chất của một bộ ví dụ tốt:

- **Sát thực tế.** Ví dụ giống dữ liệu thật mà hệ thống sẽ gặp, không phải trường hợp sách giáo khoa.
- **Đa dạng.** Bao gồm trường hợp biên và khác nhau đủ nhiều. Nếu mọi ví dụ đều giống nhau ở một điểm ngẫu nhiên (cùng độ dài, cùng mức nghiêm trọng, cùng ngôn ngữ), model sẽ học luôn điểm đó.
- **Có cấu trúc.** Bọc mỗi ví dụ trong thẻ `<example>`, cả nhóm trong `<examples>`, để model phân biệt ví dụ với chỉ dẫn và với dữ liệu thật cần xử lý.

Về số lượng: tài liệu hiện hành khuyên 3 đến 5 ví dụ. Hướng dẫn ôn thi viết "2 đến 4 ví dụ có chủ đích cho tình huống mơ hồ". Hai con số nói cùng một ý: **một vài ví dụ được chọn kỹ**, không phải hàng chục. Mỗi ví dụ thêm vào đều tốn token ở mọi lời gọi.

```text
Prompt tệ:
  Mỗi phát hiện cần nêu vị trí, vấn đề, mức nghiêm trọng và cách sửa.

Prompt tốt:
  Mỗi phát hiện viết theo đúng dạng trong các ví dụ.

  <examples>
  <example>
  Vị trí: src/auth/session.py:42
  Vấn đề: token hết hạn vẫn được chấp nhận vì so sánh bằng `<=` thay cho `<`.
  Mức: high
  Cách sửa: đổi thành `if now < token.expires_at`.
  </example>
  <example>
  Vị trí: src/api/users.py:88
  Vấn đề: tham số `id` được ghép thẳng vào câu SQL.
  Mức: critical
  Cách sửa: dùng tham số hóa: `cursor.execute("... WHERE id = %s", (id,))`.
  </example>
  </examples>
```

Hai ví dụ khác file, khác loại lỗi, khác mức. Điểm giống nhau duy nhất là thứ bạn muốn model học: bốn trường, vị trí có số dòng, cách sửa là code cụ thể.

## Ví dụ cho trường hợp mơ hồ

Trường hợp rõ ràng thì model đã làm đúng. Ví dụ nên dành cho nơi model hay phân vân. Với mỗi trường hợp, ghi kèm **lý do** ngắn: lý do là thứ giúp model suy rộng, không chỉ bắt chước.

Chọn tool:

```text
<example>
Yêu cầu: "Tìm tài khoản của chị Lan"
Tool: search_customers
Lý do: người dùng hỏi về một người, chưa nhắc tới đơn hàng nào.
</example>
<example>
Yêu cầu: "Đơn hôm qua của chị Lan tới đâu rồi"
Tool: search_customers, sau đó search_orders với customer_id tìm được
Lý do: cần xác định đúng khách trước, vì tên có thể trùng.
</example>
```

Phân biệt mẫu code chấp nhận được với lỗi thật:

```text
<example>
Code: except FileNotFoundError: return None
Kết luận: không báo
Lý do: bắt đúng một loại lỗi dự kiến và có giá trị trả về rõ ràng.
</example>
<example>
Code: except Exception: pass
Kết luận: báo, mức high
Lý do: nuốt mọi lỗi, kể cả lỗi lập trình, và không ghi log.
</example>
```

Cặp ví dụ "giống nhau bề ngoài, khác nhau về kết luận" là loại hiệu quả nhất để giảm false positive: nó cho model thấy ranh giới nằm ở đâu. Cách làm tương tự áp dụng cho việc tìm lỗ hổng trong test: một ví dụ về nhánh code chưa được test đáng báo, một ví dụ về nhánh không cần test.

## Few-shot cho trích xuất dữ liệu

Với tác vụ trích xuất, lỗi tốn kém nhất là **bịa**: văn bản không có ngày đến hạn, model vẫn điền một ngày nghe hợp lý. Ví dụ là cách trực tiếp để chặn hành vi này.

Hai loại ví dụ cần có:

1. **Văn bản có cấu trúc khác nhau.** Một hóa đơn dạng bảng, một email viết thành đoạn văn, một tin nhắn. Model học rằng cùng một trường có thể nằm ở nhiều vị trí và dưới nhiều tên gọi.
2. **Văn bản thiếu thông tin.** Ít nhất một ví dụ có trường để `null`, để model thấy rằng "không có" là một đáp án hợp lệ.

```text
<example>
<document>
Anh Tuấn ơi, tiền sửa cửa cuốn hôm 15/9/2026 là 650 nghìn nhé. Em Dũng cửa cuốn.
</document>
<output>
{"vendor_name": "Dũng cửa cuốn", "invoice_number": null,
 "issue_date": "2026-09-15", "due_date": null, "total": 650000}
</output>
<why>Tin nhắn không có số hóa đơn và hạn trả: để null, không suy đoán.</why>
</example>
```

Nếu mọi ví dụ của bạn đều là hóa đơn đầy đủ, model học rằng output luôn đầy đủ. Đó chính là nguyên nhân của việc bịa. [Lab 4.7](../07-lab/) cho bạn thấy sự khác nhau này trên dữ liệu thật: cùng một tin nhắn, prompt mơ hồ cho ra `"N/A"` ở lượt này và một ngày bịa ở lượt khác, còn prompt có ví dụ cho ra `null`.

Ví dụ cũng phải khớp với schema bạn dùng ở bài [4.3](../03-structured-output/). Nếu ví dụ ghi ngày kiểu `15/9/2026` mà schema mô tả `YYYY-MM-DD`, bạn đang gửi hai tín hiệu trái nhau.

## Những lỗi hay gặp khi dùng few-shot

| Lỗi | Hậu quả | Cách sửa |
|---|---|---|
| Mọi ví dụ cùng một kiểu | Model bám vào kiểu đó, xử lý kém trường hợp khác | Thêm ví dụ khác cấu trúc và ví dụ biên |
| Ví dụ không kèm lý do ở trường hợp mơ hồ | Model bắt chước bề mặt, không học được ranh giới | Thêm một dòng lý do |
| Ví dụ mâu thuẫn với chỉ dẫn | Model làm theo ví dụ nhiều hơn theo lời | Sửa ví dụ; coi ví dụ là phần của đặc tả |
| Quá nhiều ví dụ | Tốn token ở mọi lời gọi, dễ quá khớp | Giữ vài ví dụ nhắm vào chỗ hay sai |
| Ví dụ trộn lẫn với dữ liệu thật | Model nhầm ví dụ là đầu vào cần xử lý | Bọc trong thẻ `<example>`, dữ liệu thật trong thẻ riêng như `<document>` |

Một ghi chú về tool: định nghĩa tool trong API có trường `input_examples` để đưa ví dụ đầu vào hợp lệ cho những tool có tham số phức tạp. Đây là few-shot ở tầng định nghĩa tool. Mô tả tool rõ ràng vẫn là yếu tố quan trọng nhất; ví dụ là phần bổ sung.

Tài liệu gốc: [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools).

## Tóm tắt

- Few-shot là cách hiệu quả nhất để có output nhất quán về định dạng và dùng được ngay.
- Dùng vài ví dụ được chọn kỹ, sát thực tế, đa dạng, bọc trong thẻ `<example>`.
- Dành ví dụ cho trường hợp mơ hồ và ghi kèm lý do để model suy rộng được.
- Cặp ví dụ "chấp nhận được" và "lỗi thật" giúp giảm false positive.
- Trong trích xuất, phải có ví dụ khác cấu trúc và ví dụ có trường `null` để giảm bịa.
