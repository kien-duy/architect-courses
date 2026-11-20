---
title: 4.6 · Review nhiều lượt và nhiều instance
description: Giới hạn của tự review, reviewer độc lập không có context sinh code, lượt theo file cộng lượt tích hợp, và lượt xác minh.
lesson:
  day: 9
  minutes: 12
quiz:
  - q: "An agent writes a 300-line migration and is then asked, in the same session, 'Review your work for bugs.' It reports that everything looks correct. A human later finds a wrong default value the agent had reasoned about at length. Why did the self-review miss it?"
    options:
      - text: "The session ran out of context window"
        why: "Đề bài không nói context đầy. Lỗi bị sót là thứ agent đã cân nhắc kỹ, không phải thứ bị quên."
      - text: "The agent was not given enough tools to run the migration"
        why: "Thiếu tool chạy thử là một hạn chế khác. Nó không giải thích vì sao agent không nghi ngờ quyết định của chính mình."
      - text: "The reviewer shares the generation context, so it carries the same reasoning and tends to confirm its own decisions"
        why: "Đúng. Trong cùng phiên, model vẫn giữ lập luận đã dẫn tới giá trị đó. Nó đọc lại code qua chính lập luận ấy nên thấy hợp lý."
      - text: "Review prompts only work on code written by humans"
        why: "Model review được code do model viết. Vấn đề là review trong cùng context đã sinh ra code."
    answer: 2
    keyword: "tự review trong cùng phiên giữ nguyên lập luận cũ → dễ **xác nhận** thay vì phản biện"
    relearn: "#giới-hạn-của-tự-review"
    relearnLabel: "Giới hạn của tự review"
  - q: "A pull request touches 14 files. A single review call over the whole diff gives detailed comments on the first few files, shallow comments on the rest, and flags a pattern in one file while accepting the same pattern in another. Which redesign addresses this?"
    options:
      - text: "Review each file in its own pass, then run a separate integration pass that looks at interactions between files"
        why: "Đúng. Mỗi lượt theo file có toàn bộ sự chú ý cho một file, nên chất lượng đều. Lượt tích hợp riêng lo những vấn đề chỉ thấy được khi nhìn nhiều file cùng lúc."
      - text: "Use a model with a larger context window for the single call"
        why: "Toàn bộ diff đã vừa context. Vấn đề là sự chú ý bị dàn mỏng, không phải thiếu chỗ chứa."
      - text: "Run the same single call three times and merge the comments"
        why: "Ba lượt cùng thiết kế lặp lại cùng điểm yếu: file cuối vẫn bị xem qua loa, và kết quả còn mâu thuẫn nhau nhiều hơn."
      - text: "Review only the three largest files"
        why: "Bỏ qua 11 file là chấp nhận sót lỗi, và vẫn không xem được quan hệ giữa các file."
    answer: 0
    keyword: "nhiều file → lượt **theo file** + lượt **tích hợp**"
    relearn: "#lượt-theo-file-và-lượt-tích-hợp"
    relearnLabel: "Lượt theo file và lượt tích hợp"
---

Một model review code tốt hơn nhiều khi nó không phải là "người" vừa viết ra code đó, và khi nó không phải xem quá nhiều thứ cùng lúc. Bài này giải thích hai ý đó và cách dựng kiến trúc review quanh chúng.

## Giới hạn của tự review

Cách đơn giản nhất để kiểm tra output là hỏi lại trong cùng phiên: "Hãy xem lại và tìm lỗi." Cách này bắt được lỗi hiển nhiên nhưng yếu với lỗi tinh vi, vì ba lý do:

- **Context sinh code vẫn còn nguyên.** Mọi lập luận dẫn tới quyết định ("dùng `<=` ở đây vì…") nằm ngay trong lịch sử hội thoại. Khi đọc lại code, model đọc qua chính lập luận đó và thấy nó hợp lý.
- **Model ít khi phản bác quyết định của chính mình.** Một giả định sai ở bước viết vẫn là giả định ở bước review.
- **Reviewer biết ý định, không chỉ biết code.** Nó dễ đọc thành "thứ mình định viết" thay vì "thứ thật sự nằm trong file".

Điều này giống con người: tác giả là người kém nhất trong việc bắt lỗi bài viết của chính mình.

Tự review trong cùng phiên vẫn có chỗ dùng: nó rẻ, và đủ cho việc kiểm tra theo một danh sách tiêu chí rõ ràng (đã có test chưa, đã cập nhật tài liệu chưa). Nó không đủ làm lớp bảo vệ duy nhất trước lỗi logic.

## Reviewer độc lập

Giải pháp là dùng **một instance Claude thứ hai, không có context của bước sinh code**. Instance này chỉ nhận thứ cần review (diff, file, đặc tả) và tiêu chí review. Nó không biết tác giả đã lập luận thế nào, nên phải tự đánh giá code như nó đang có.

| | Tự review cùng phiên | Instance độc lập |
|---|---|---|
| Thấy lập luận của bước viết | Có | Không |
| Xu hướng | Xác nhận quyết định cũ | Đánh giá lại từ đầu |
| Bắt lỗi tinh vi | Kém | Tốt hơn |
| Chi phí | Thấp | Thêm một lượt gọi và phải tự nạp context |

Cùng model, khác context là đủ để tạo khác biệt. "Độc lập" ở đây nói về context, không đòi model khác hay model lớn hơn.

Các cách tạo reviewer độc lập:

- **Subagent.** Như ở [bài 1.3](../../domain-1/03-coordinator-subagent/), subagent bắt đầu với context mới và không thấy hội thoại của phiên chính. Lệnh `/code-review` của Claude Code làm đúng như vậy: nó review diff trong một subagent chưa từng thấy cuộc hội thoại đã sinh ra code.
- **Phiên mới.** Một lời gọi `claude -p` riêng trong CI, hoặc một lời gọi Messages API mới chỉ chứa diff và tiêu chí.
- **Giới hạn tool của reviewer.** Cho reviewer chỉ `Read`, `Grep`, `Glob`. Nó đọc được mọi thứ nhưng không tự "sửa giúp", nên vai trò viết và vai trò review tách bạch.

Khi giao việc cho reviewer, áp dụng bài [4.1](../01-tieu-chi-ro-rang/): nói rõ cần báo gì và bỏ qua gì. Một reviewer được yêu cầu "tìm vấn đề" sẽ luôn tìm ra thứ gì đó; nếu sửa theo mọi phát hiện, code sẽ đầy lớp trừu tượng thừa và test cho những trường hợp không thể xảy ra.

```text
Prompt tệ:
  Review thay đổi này.

Prompt tốt:
  Dùng một subagent để review diff của bộ giới hạn tần suất so với SPEC.md.
  Kiểm tra từng yêu cầu trong SPEC.md đã được cài đặt chưa và các trường hợp biên
  liệt kê trong đó đã có test chưa. Chỉ báo thiếu sót ảnh hưởng tới tính đúng.
  Bỏ qua phong cách code.
```

## Lượt theo file và lượt tích hợp

Vấn đề thứ hai là quy mô. Đưa một pull request 14 file vào một lời gọi review thường cho ra:

- **Chú ý bị dàn mỏng**: vài file đầu được phân tích kỹ, các file sau chỉ được lướt qua.
- **Nhận xét không nhất quán**: một mẫu code bị báo ở file này nhưng được chấp nhận ở file khác.
- **Sót lỗi hiển nhiên**, vì quá nhiều thứ phải theo dõi cùng lúc.

Cách sửa là chia thành nhiều lượt, mỗi lượt một mục tiêu hẹp:

```text
Lượt 1, theo từng file (chạy song song được):
  auth.ts      → danh sách vấn đề cục bộ
  database.ts  → danh sách vấn đề cục bộ
  routes.ts    → danh sách vấn đề cục bộ
  ...

Lượt 2, tích hợp (một lời gọi, nhìn xuyên file):
  đầu vào: tóm tắt thay đổi của từng file, chữ ký hàm và kiểu dữ liệu bị đổi
  tìm:     luồng dữ liệu qua nhiều file, kiểu không khớp giữa nơi gọi và nơi định nghĩa,
           hàm bị đổi chữ ký nhưng nơi gọi chưa cập nhật
```

| Lượt | Nhìn vào | Bắt được |
|---|---|---|
| Theo file | Một file và phần diff của nó | Lỗi logic cục bộ, thiếu kiểm tra đầu vào, xử lý lỗi sai |
| Tích hợp | Quan hệ giữa các file | Luồng dữ liệu xuyên file, hợp đồng giữa các module, thay đổi không đồng bộ |

Chỉ chạy lượt theo file thì sót loại lỗi thứ hai: mỗi file đúng khi đứng riêng, nhưng ghép lại thì sai. Chỉ chạy một lượt gộp thì gặp lại vấn đề dàn mỏng chú ý. Cần cả hai.

Đây là mẫu "tách việc lớn theo lượt" ở [bài 1.4](../../domain-1/04-phan-ra-nhiem-vu/), áp dụng cho review. Các lượt theo file độc lập với nhau nên chạy song song được bằng subagent.

## Lượt xác minh và độ tin cậy

Thêm reviewer làm tăng số phát hiện, và cả số false positive. Lớp tiếp theo là **lượt xác minh**: một lượt riêng nhận từng phát hiện ứng viên, đối chiếu lại với code, và loại những cái không đứng vững.

Dịch vụ Code Review của Claude Code được mô tả theo đúng mẫu này: nhiều agent tìm vấn đề song song trên diff và code xung quanh, một bước xác minh kiểm tra các phát hiện ứng viên với code để lọc false positive, rồi các phát hiện còn lại được gộp trùng và xếp theo mức nghiêm trọng.

Lượt xác minh cũng có thể kèm **độ tin cậy tự chấm** cho từng phát hiện, dùng để định tuyến:

| Kết quả xác minh | Xử lý |
|---|---|
| Xác nhận được bằng dòng code cụ thể, tin cậy cao | Đăng thành comment |
| Có khả năng đúng nhưng thiếu bằng chứng | Chuyển cho người review, hoặc gom vào mục "cần xem thêm" |
| Không tái hiện được trên code | Loại bỏ |

Hai lưu ý để việc định tuyến này đáng tin:

- **Điểm tự chấm phải được hiệu chỉnh.** Một con số 0,9 do model tự đưa ra chưa có nghĩa là đúng 90%. So nó với phán quyết của người review trên một tập mẫu, rồi mới chọn ngưỡng. Trường `detected_pattern` ở bài [4.4](../04-validation-retry/) giúp bạn làm việc này theo từng loại phát hiện.
- **Lượt xác minh cũng nên độc lập.** Nếu cùng context vừa đưa ra phát hiện vừa tự chấm điểm, bạn gặp lại vấn đề tự review ở đầu bài.

## Chọn kiến trúc theo rủi ro

Mỗi lượt và mỗi instance thêm vào đều tốn token và thời gian. Một reviewer độc lập còn phải tự đọc lại những thứ phiên chính đã biết, nên có thể chậm hơn. Chọn mức phù hợp với thay đổi:

| Tình huống | Kiến trúc hợp lý |
|---|---|
| Sửa một dòng, đổi tên biến | Không cần lượt review riêng; đọc diff là đủ |
| Thay đổi một file, logic vừa phải | Một reviewer độc lập |
| Pull request nhiều file | Lượt theo file song song, cộng một lượt tích hợp |
| Thay đổi rủi ro cao (thanh toán, phân quyền) | Như trên, thêm lượt xác minh và người duyệt cho phát hiện tin cậy thấp |
| Review hằng đêm toàn bộ repo, không ai chờ | Các lượt theo file gửi qua Message Batches API ở bài [4.5](../05-batch/) |

Review tự động không thay cho người chịu trách nhiệm merge. Tài liệu của Code Review ghi rõ: một lượt review không có phát hiện không có nghĩa là code hết lỗi.

Tài liệu gốc: [Code Review](https://code.claude.com/docs/en/code-review), [Review locally with /code-review](https://code.claude.com/docs/en/code-review-local), [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices).

## Tóm tắt

- Tự review trong cùng phiên giữ nguyên lập luận của bước viết, nên dễ xác nhận hơn là phản biện.
- Reviewer độc lập là một instance không có context sinh code: subagent hoặc phiên mới. Cùng model vẫn có tác dụng.
- Pull request nhiều file: review từng file ở lượt riêng để tránh dàn mỏng chú ý, rồi thêm lượt tích hợp cho vấn đề xuyên file.
- Lượt xác minh lọc false positive; độ tin cậy tự chấm dùng để định tuyến, sau khi đã hiệu chỉnh với phán quyết của người.
- Thêm lượt là thêm chi phí. Chọn kiến trúc theo mức rủi ro của thay đổi.
