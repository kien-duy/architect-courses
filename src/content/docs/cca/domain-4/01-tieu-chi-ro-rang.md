---
title: 4.1 · Tiêu chí rõ ràng
description: Thay chỉ dẫn mơ hồ bằng tiêu chí cụ thể, định nghĩa mức nghiêm trọng, và xử lý false positive.
lesson:
  day: 8
  minutes: 12
quiz:
  - q: "A CI review bot is prompted with 'Check that comments are accurate.' It flags dozens of comments per pull request, most of them harmless wording differences. Which change will most improve precision?"
    options:
      - text: "Add 'Be more conservative and only report issues you are confident about'"
        why: "'Thận trọng hơn' vẫn là chỉ dẫn mơ hồ. Model không biết ranh giới nằm ở đâu, nên kết quả thay đổi ít và khó đoán."
      - text: "Replace it with 'Flag a comment only when it states behavior that contradicts the code it describes; ignore wording, tone, and missing comments'"
        why: "Đúng. Tiêu chí này nói rõ khi nào báo (comment mâu thuẫn với code) và khi nào bỏ qua (câu chữ, giọng văn, thiếu comment). Model có một ranh giới để áp dụng."
      - text: "Switch the bot to a larger model"
        why: "Model lớn hơn vẫn phải đoán 'accurate' nghĩa là gì. Vấn đề nằm ở tiêu chí, không ở năng lực model."
      - text: "Lower the temperature so the output is more deterministic"
        why: "Output ổn định hơn không có nghĩa là đúng hơn. Bot sẽ báo nhầm một cách nhất quán."
    answer: 1
    keyword: "tiêu chí **cụ thể** (báo khi nào, bỏ qua khi nào) thắng 'hãy thận trọng hơn'"
    relearn: "#mơ-hồ-và-cụ-thể-khác-nhau-thế-nào"
    relearnLabel: "Mơ hồ và cụ thể khác nhau thế nào"
  - q: "A code review assistant reports four categories. Security and logic findings are almost always correct, but about 70% of its 'naming convention' findings are wrong. Developers have started dismissing every comment from the bot. What should the team do first?"
    options:
      - text: "Keep all categories and add a note asking developers to read each comment carefully"
        why: "Người dùng đã mất niềm tin. Yêu cầu họ đọc kỹ hơn không giảm số cảnh báo sai."
      - text: "Add a confidence score to every finding and let developers filter"
        why: "Điểm tự chấm không sửa được tiêu chí sai của nhóm naming, và đẩy việc lọc sang cho người dùng."
      - text: "Rewrite the whole prompt from scratch"
        why: "Ba nhóm còn lại đang chạy tốt. Viết lại toàn bộ có thể làm hỏng phần đang đúng."
      - text: "Temporarily turn off the naming category, then bring it back once its criteria are precise enough"
        why: "Đúng. False positive của một nhóm làm người dùng nghi ngờ cả những nhóm chính xác. Tắt nhóm gây nhiễu giữ được niềm tin trong lúc bạn sửa tiêu chí cho nó."
    answer: 3
    keyword: "false positive của **một** nhóm phá niềm tin vào **mọi** nhóm → tắt tạm nhóm đó"
    relearn: "#false-positive-và-niềm-tin"
    relearnLabel: "False positive và niềm tin"
  - q: "Two runs of the same review prompt label the same SQL string concatenation as 'critical' in one run and 'medium' in the other. The prompt says: 'Assign a severity: critical, high, medium, or low.' What is the best fix?"
    options:
      - text: "Define each severity level with a concrete condition and a short code example"
        why: "Đúng. Khi mỗi mức có điều kiện cụ thể và ví dụ code, model có cùng một thước đo ở mọi lượt chạy."
      - text: "Ask the model to explain its severity choice in a sentence"
        why: "Lời giải thích giúp bạn hiểu lựa chọn, nhưng không tạo ra định nghĩa chung cho các mức."
      - text: "Reduce the scale to two levels, 'high' and 'low'"
        why: "Ít mức hơn vẫn không có định nghĩa. Model vẫn phải tự đoán ranh giới giữa hai mức."
      - text: "Run the review three times and take the majority label"
        why: "Cách này tốn gấp ba và chỉ che bớt triệu chứng. Thước đo vẫn không được định nghĩa."
    answer: 0
    keyword: "mỗi mức severity = **điều kiện cụ thể + ví dụ code**"
    relearn: "#định-nghĩa-mức-nghiêm-trọng"
    relearnLabel: "Định nghĩa mức nghiêm trọng"
---

Phần lớn output tệ không đến từ model yếu mà đến từ prompt không nói rõ thế nào là đúng. Bài này dạy cách đổi một chỉ dẫn mơ hồ thành tiêu chí mà model áp dụng được, và vì sao cảnh báo sai nguy hiểm hơn bạn nghĩ.

## Mơ hồ và cụ thể khác nhau thế nào

Hãy coi Claude như một đồng nghiệp giỏi nhưng mới vào nhóm: họ không biết quy ước của bạn, không biết bạn ghét loại cảnh báo nào. Một chỉ dẫn mơ hồ buộc họ phải đoán, và mỗi lần đoán một khác.

| Chỉ dẫn mơ hồ | Tiêu chí cụ thể |
|---|---|
| "Kiểm tra comment có chính xác không" | "Chỉ báo khi comment mô tả hành vi **mâu thuẫn** với đoạn code ngay bên dưới. Bỏ qua câu chữ, lỗi chính tả, thiếu comment" |
| "Hãy thận trọng hơn" | "Chỉ báo lỗi khi bạn chỉ ra được dòng code và đầu vào cụ thể làm lỗi xảy ra" |
| "Tìm vấn đề bảo mật" | "Báo: SQL ghép chuỗi từ đầu vào người dùng, secret ghi cứng trong code, thiếu kiểm tra quyền ở endpoint ghi dữ liệu" |
| "Trích xuất thông tin hóa đơn, hãy chính xác" | "Ngày theo dạng YYYY-MM-DD. Trường không có trong văn bản thì để null. Chiết khấu là một dòng riêng có số tiền âm" |

Điểm chung của cột bên phải: mỗi câu trả lời được hai câu hỏi **khi nào thì làm** và **khi nào thì không**. Những từ như "chính xác", "thận trọng", "quan trọng", "hợp lý" không trả lời được câu nào.

Cách thử nhanh mà tài liệu của Anthropic gợi ý: đưa prompt cho một đồng nghiệp không biết gì về tác vụ. Nếu họ phải hỏi lại, Claude cũng sẽ phải đoán.

```text
Prompt tệ:
  Review đoạn diff sau và nêu các vấn đề.

Prompt tốt:
  Review đoạn diff sau.
  Báo cáo:
    - Lỗi logic làm kết quả sai với một đầu vào hợp lệ.
    - Lỗ hổng bảo mật: injection, lộ secret, thiếu kiểm tra quyền.
  Không báo cáo:
    - Phong cách code, đặt tên, định dạng (đã có linter).
    - Đề xuất refactor không sửa lỗi nào.
    - Vấn đề nằm ngoài các dòng bị thay đổi.
  Nếu không có gì để báo, trả lời đúng một dòng: "Không có vấn đề."
```

Prompt tốt dài hơn, và đó là điều bình thường. Độ dài ở đây là thông tin model cần, không phải lời thừa.

## Nói rõ cả phần bỏ qua

Một model được yêu cầu "tìm vấn đề" sẽ luôn tìm ra thứ gì đó. Nếu bạn chỉ liệt kê thứ cần báo, mọi thứ còn lại rơi vào vùng xám, và model thường chọn báo cho chắc. Danh sách **không báo cáo** quan trọng ngang danh sách cần báo.

Ba điều nên có trong một bộ tiêu chí review:

1. **Phạm vi**: chỉ các dòng thay đổi, hay cả code xung quanh.
2. **Nhóm cần báo**, mỗi nhóm có điều kiện kích hoạt cụ thể.
3. **Nhóm bỏ qua**, kèm lý do ngắn nếu có (ví dụ "đã có linter").

Lý do đi kèm giúp model suy rộng đúng hướng. "Không dùng dấu ba chấm" là một luật trơ trọi. "Câu trả lời sẽ được đọc bằng máy đọc văn bản, nên không dùng dấu ba chấm vì máy không đọc được" cho model biết mục đích, và nó tự tránh thêm những ký hiệu khó đọc khác.

Dịch vụ Code Review của Claude Code áp dụng đúng ý này: nhóm phát triển ghi vào file `REVIEW.md` những gì cần báo, ở mức nào, và những gì bỏ qua. Mặc định dịch vụ tập trung vào lỗi làm hỏng production, không báo sở thích định dạng.

## False positive và niềm tin

**False positive** là cảnh báo về một vấn đề không có thật. Tác hại của nó lớn hơn thời gian đọc một comment thừa.

Giả sử bot review báo bốn nhóm: bảo mật, logic, hiệu năng, đặt tên. Ba nhóm đầu đúng 90%. Nhóm đặt tên sai 70%. Lập trình viên không nhớ nhóm nào đáng tin. Họ chỉ nhớ "bot này hay nói sai", và bắt đầu bỏ qua mọi comment, kể cả cảnh báo SQL injection đúng.

Hệ quả cho thiết kế:

- **Đo tỉ lệ false positive theo từng nhóm**, không chỉ đo chung. Một con số trung bình tốt che mất một nhóm rất tệ.
- **Tắt tạm nhóm có tỉ lệ sai cao.** Bỏ nhóm đó khỏi prompt cho tới khi tiêu chí của nó đủ chính xác. Thà thiếu một nhóm còn hơn làm hỏng uy tín của các nhóm còn lại.
- **Sửa tiêu chí của nhóm đó**, không sửa bằng câu chung chung. "Hãy thận trọng hơn với việc đặt tên" không giúp gì. "Chỉ báo tên biến khi nó mô tả sai kiểu dữ liệu hoặc đơn vị, ví dụ `timeout_ms` chứa giây" thì giúp.

Để biết nhóm nào và mẫu nào gây ra false positive, mỗi phát hiện nên mang theo thông tin về thứ đã kích hoạt nó. Bài [4.4](../04-validation-retry/) nói về trường `detected_pattern` dùng cho việc này.

## Định nghĩa mức nghiêm trọng

"Gán mức critical, high, medium hoặc low" là một chỉ dẫn mơ hồ khác. Model sẽ gán, nhưng cùng một lỗi có thể nhận hai mức ở hai lượt chạy. Mỗi mức cần một điều kiện kiểm tra được, và tốt nhất là một ví dụ code ngắn.

```text
Mức nghiêm trọng:

critical: kẻ tấn công không cần đăng nhập có thể đọc hoặc sửa dữ liệu.
  Ví dụ: query = "SELECT * FROM users WHERE id = " + request.args["id"]

high: kết quả sai hoặc mất dữ liệu với đầu vào hợp lệ thường gặp.
  Ví dụ: for i in range(len(items) - 1)   # bỏ sót phần tử cuối

medium: sai chỉ ở trường hợp biên hiếm, có cách khắc phục thủ công.
  Ví dụ: chia cho len(rows) mà không xử lý danh sách rỗng trong một báo cáo nội bộ

low: không ảnh hưởng hành vi. Chỉ báo khi được yêu cầu.
```

Mỗi định nghĩa mô tả **hậu quả** (ai bị ảnh hưởng, trong điều kiện nào), không mô tả cảm giác ("rất nghiêm trọng"). Ví dụ code neo định nghĩa vào thứ model nhìn thấy trong diff. Kỹ thuật dùng ví dụ để dạy model được nói kỹ ở bài [4.2](../02-few-shot/).

## Quy trình tinh chỉnh tiêu chí

Tiêu chí tốt hiếm khi đúng ngay lần đầu. Một vòng tinh chỉnh thực tế:

1. Chạy prompt trên một tập mẫu nhỏ có đáp án (vài chục trường hợp, gồm cả trường hợp không có vấn đề).
2. Phân loại từng kết quả sai: báo nhầm hay bỏ sót, thuộc nhóm nào.
3. Với nhóm báo nhầm nhiều: viết lại điều kiện kích hoạt, hoặc tắt tạm.
4. Với trường hợp mơ hồ lặp lại: thêm ví dụ minh họa thay vì thêm một câu luật nữa.
5. Chạy lại đúng tập mẫu đó để chắc rằng thay đổi không làm hỏng phần đang đúng.

Cũng nên tránh viết tiêu chí bằng chữ in hoa và từ ngữ gay gắt ("TUYỆT ĐỐI KHÔNG..."). Các model hiện nay tuân theo chỉ dẫn khá sát, nên nhấn quá mạnh dễ làm model áp dụng luật đó quá tay ở những chỗ không liên quan.

Tài liệu gốc: [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), [Customize Code Review](https://code.claude.com/docs/en/code-review-customize).

## Tóm tắt

- Tiêu chí cụ thể trả lời được "khi nào báo" và "khi nào bỏ qua". "Chính xác hơn", "thận trọng hơn" không phải tiêu chí.
- Luôn viết cả danh sách **không báo cáo**.
- False positive của một nhóm làm người dùng bỏ qua cả những nhóm chính xác. Đo theo từng nhóm và tắt tạm nhóm gây nhiễu.
- Mỗi mức nghiêm trọng cần điều kiện cụ thể về hậu quả, kèm ví dụ code.
- Tinh chỉnh trên một tập mẫu có đáp án trước khi chạy quy mô lớn.
