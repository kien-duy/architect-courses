---
title: 4.8 · Quiz Domain 4
description: 10 câu tình huống tổng hợp về prompt engineering và structured output.
sidebar:
  badge:
    text: Quiz
    variant: note
lesson:
  day: 9
  kind: quiz
  minutes: 20
quiz:
  - q: "A support-ticket triage prompt says: 'Mark a ticket as urgent if it is important.' About 60% of tickets come back as urgent, and the on-call team has stopped trusting the label. What is the most effective change?"
    options:
      - text: "Add 'Only a small share of tickets should be urgent'"
        why: "Một hạn mức chung không nói ticket nào đáng gấp. Model sẽ hạ nhãn một cách tùy ý để đạt tỉ lệ, kể cả với ticket thật sự gấp."
      - text: "Ask the model to rate importance from 1 to 10 and treat 8 or higher as urgent"
        why: "Thang điểm không có định nghĩa vẫn là một phán đoán mơ hồ, chỉ được đổi thành con số."
      - text: "Define urgent with concrete conditions, such as 'production is down, data was lost, or a payment failed', and list what is not urgent"
        why: "Điều kiện cụ thể cho model một ranh giới để áp dụng giống nhau trên mọi ticket. Danh sách 'không gấp' xử lý vùng xám."
      - text: "Lower the temperature so labels are stable"
        why: "Nhãn ổn định hơn nhưng vẫn sai theo cùng một cách, vì tiêu chí không đổi."
    answer: 2
    keyword: "'important' không phải tiêu chí → nêu **điều kiện cụ thể**"
    relearn: "cca/domain-4/01-tieu-chi-ro-rang#mơ-hồ-và-cụ-thể-khác-nhau-thế-nào"
    relearnLabel: "4.1 · Mơ hồ và cụ thể khác nhau thế nào"
  - q: "A review bot's overall precision is measured at 85%, yet developers say they ignore it because 'it is wrong all the time'. The bot reports six categories of findings. What should the team do first?"
    options:
      - text: "Measure the false-positive rate per category to find the categories that generate most of the noise"
        why: "Con số trung bình che mất nhóm tệ. Một hoặc hai nhóm sai nhiều đủ làm người dùng nghi ngờ mọi nhóm. Phải biết nhóm nào trước khi tắt hay sửa."
      - text: "Publish the 85% figure so developers trust the bot"
        why: "Niềm tin đến từ trải nghiệm với từng comment, không đến từ một con số trung bình."
      - text: "Add 'be more careful' to the system prompt for all categories"
        why: "Chỉ dẫn chung không nhắm vào nhóm gây lỗi và có thể làm giảm phát hiện đúng ở các nhóm đang tốt."
      - text: "Require developers to reply to every comment before merging"
        why: "Ép người dùng xử lý cảnh báo sai làm họ khó chịu hơn và không giảm số cảnh báo sai."
    answer: 0
    keyword: "đo false positive **theo từng nhóm**, không chỉ trung bình"
    relearn: "cca/domain-4/01-tieu-chi-ro-rang#false-positive-và-niềm-tin"
    relearnLabel: "4.1 · False positive và niềm tin"
  - q: "A code review prompt contains three few-shot examples. All three happen to be labeled severity 'high'. In production, nearly every finding is labeled 'high', including typos in log messages. What is the most likely cause and fix?"
    options:
      - text: "The model cannot distinguish severity levels; remove the severity field"
        why: "Model phân biệt được khi có căn cứ. Bỏ trường này làm mất thông tin mà người dùng cần."
      - text: "There are too few examples; add ten more 'high' examples"
        why: "Thêm ví dụ cùng mức củng cố đúng mẫu sai."
      - text: "The examples are too long; shorten them"
        why: "Độ dài không phải nguyên nhân. Điểm chung ngoài ý muốn của ba ví dụ mới là nguyên nhân."
      - text: "The examples share an unintended pattern; replace them with examples that span different severity levels"
        why: "Model học cả những điểm chung ngẫu nhiên của ví dụ. Ví dụ phải đa dạng ở mọi thứ, trừ thứ bạn muốn nó bắt chước."
    answer: 3
    keyword: "ví dụ giống nhau ở điểm ngẫu nhiên → model học luôn điểm đó"
    relearn: "cca/domain-4/02-few-shot#viết-ví-dụ-thế-nào"
    relearnLabel: "4.2 · Viết ví dụ thế nào"
  - q: "An extraction prompt pastes two sample documents with their expected outputs, followed by the real document, all as plain text. Occasionally the output contains data from one of the sample documents. What should be changed?"
    options:
      - text: "Remove the samples; few-shot does not work for extraction"
        why: "Few-shot rất có ích cho trích xuất. Lỗi nằm ở cách trình bày, không ở kỹ thuật."
      - text: "Wrap each sample in `<example>` tags and put the real input in its own tag such as `<document>`"
        why: "Thẻ giúp model phân biệt ví dụ với dữ liệu thật cần xử lý. Không có ranh giới, ví dụ dễ bị coi là một phần của đầu vào."
      - text: "Move the samples after the real document"
        why: "Đổi thứ tự không tạo ra ranh giới giữa ví dụ và đầu vào."
      - text: "Translate the samples into a different language from the real document"
        why: "Ví dụ khác ngôn ngữ kém sát thực tế hơn và vẫn không có ranh giới rõ ràng."
    answer: 1
    keyword: "ví dụ trong `<example>`, dữ liệu thật trong thẻ riêng"
    relearn: "cca/domain-4/02-few-shot#những-lỗi-hay-gặp-khi-dùng-few-shot"
    relearnLabel: "4.2 · Những lỗi hay gặp khi dùng few-shot"
  - q: "A document pipeline exposes `extract_metadata`, `enrich_entities`, and `link_records`. The first model call must always produce metadata, but with the default settings the model sometimes starts with `enrich_entities`. Which setting enforces the required first step?"
    options:
      - text: "`tool_choice: {\"type\": \"tool\", \"name\": \"extract_metadata\"}` on the first call"
        why: "Ép một tool cụ thể bảo đảm lời gọi đầu tiên là `extract_metadata`. Các lời gọi sau có thể quay về `auto`."
      - text: "`tool_choice: {\"type\": \"any\"}` on the first call"
        why: "`any` chỉ bảo đảm có một tool được gọi. Model vẫn có thể chọn `enrich_entities`."
      - text: "`tool_choice: {\"type\": \"auto\"}` with 'call extract_metadata first' in the system prompt"
        why: "Đây là cấu hình hiện tại cộng một lời dặn. Lời dặn là xác suất, không phải ép buộc."
      - text: "List `extract_metadata` first in the `tools` array"
        why: "Thứ tự khai báo tool không quyết định tool nào được gọi."
    answer: 0
    keyword: "ép bước đầu tiên → `tool_choice` kiểu `tool` với tên cụ thể"
    relearn: "cca/domain-4/03-structured-output#tool_choice"
    relearnLabel: "4.3 · tool_choice"
  - q: "A ticket classifier uses `category` with the enum `[\"billing\", \"shipping\", \"technical\"]`. An audit shows 12% of tickets labeled 'billing' are really partnership requests or legal notices. What schema change best preserves information for those tickets?"
    options:
      - text: "Change `category` to a free-text string"
        why: "Chuỗi tự do làm mất tính nhất quán: mỗi lượt một cách viết, không thống kê hay định tuyến được."
      - text: "Make `category` optional so the model can omit it"
        why: "Bỏ trống làm mất hẳn thông tin về loại ticket, và code không phân biệt được 'không rõ' với 'loại khác'."
      - text: "Add `\"other\"` (and `\"unclear\"`) to the enum together with a nullable `category_detail` string"
        why: "`other` kèm trường mô tả giữ lại nội dung của những loại chưa có trong danh sách, và `unclear` cho phép model nói trung thực khi không đủ căn cứ."
      - text: "Add an instruction: 'Only use billing when you are sure'"
        why: "Enum đóng kín vẫn buộc model chọn một trong ba giá trị. Không chắc về billing thì nó sẽ nhét vào shipping hoặc technical."
    answer: 2
    keyword: "enum cần lối thoát: `other` + trường mô tả, `unclear`"
    relearn: "cca/domain-4/03-structured-output#thiết-kế-schema-để-model-không-phải-bịa"
    relearnLabel: "4.3 · Thiết kế schema để model không phải bịa"
  - q: "Developers can dismiss findings from a security scanner built on Claude. The team wants to learn which kinds of findings are dismissed most, so they can refine the prompt. Each finding currently has `file`, `line`, `issue`, and `severity`. What should be added?"
    options:
      - text: "A `confidence` number between 0 and 1"
        why: "Điểm tự chấm không cho biết phát hiện thuộc mẫu nào, nên không gom nhóm được các lần bị bác bỏ."
      - text: "A `detected_pattern` field naming the code construct that triggered the finding"
        why: "Gom các phát hiện bị bác bỏ theo `detected_pattern` cho thấy mẫu nào gây ra phần lớn false positive, và từ đó sửa đúng tiêu chí cho mẫu đó."
      - text: "A longer `issue` description"
        why: "Văn bản tự do dài hơn khó thống kê hơn, và mỗi lượt diễn đạt một khác."
      - text: "A `reviewed_by_model` timestamp"
        why: "Thời điểm review không liên quan tới nguyên nhân của false positive."
    answer: 1
    keyword: "`detected_pattern` → phân tích false positive theo mẫu"
    relearn: "cca/domain-4/04-validation-retry#vòng-phản-hồi-để-cải-thiện-prompt"
    relearnLabel: "4.4 · Vòng phản hồi để cải thiện prompt"
  - q: "A contract-extraction pipeline retries failed validations with the original document, the previous output, and the specific error. For which failure is this retry most likely to succeed?"
    options:
      - text: "The governing-law clause is on a page missing from the scan"
        why: "Thông tin không có trong đầu vào. Retry không tạo ra được nó."
      - text: "The renewal terms are defined in a master agreement that was not provided"
        why: "Thông tin nằm ở tài liệu khác. Phải bổ sung tài liệu đó, không phải retry."
      - text: "The document states two different contract values in two places"
        why: "Nguồn tự mâu thuẫn. Model không thể biết con số nào đúng; cần giữ cả hai và chuyển cho người duyệt."
      - text: "`effective_date` was returned as '5 March 2026' instead of the required YYYY-MM-DD"
        why: "Đây là lỗi định dạng của bước trích xuất. Thông tin có trong văn bản, và thông báo lỗi cụ thể cho model biết chính xác phải sửa gì."
    answer: 3
    keyword: "retry sửa lỗi **trích xuất** (định dạng, nhầm trường), không tạo ra thông tin"
    relearn: "cca/domain-4/04-validation-retry#khi-nào-retry-vô-ích"
    relearnLabel: "4.4 · Khi nào retry vô ích"
  - q: "A team's enrichment agent calls their in-house `lookup_customer` tool three or four times per document, feeding each result back to the model. To cut costs they plan to submit the same requests through the Message Batches API. What is the main problem?"
    options:
      - text: "A batch request yields a single response, so the application cannot return tool results mid-request; the multi-turn tool loop does not fit"
        why: "Mỗi request batch cho một phản hồi. Phản hồi có `tool_use` sẽ dừng ở đó, không có bước trả `tool_result` trong cùng request. Muốn dùng batch phải tra cứu trước và đưa dữ liệu vào prompt để thành lời gọi một lượt."
      - text: "The Batches API does not accept the `tools` parameter at all"
        why: "Request batch nhận `tools`. Trích xuất một lượt bằng `tool_use` vẫn chạy tốt trong batch."
      - text: "Batch requests cost more when tools are defined"
        why: "Batch được giảm 50% cho mọi token. Định nghĩa tool không làm đổi mức giảm."
      - text: "Batch results are returned in a different order from the requests"
        why: "Điều này đúng nhưng đã có `custom_id` để giải quyết. Nó không phải trở ngại của vòng lặp tool."
    answer: 0
    keyword: "batch = một request, một phản hồi → không có vòng lặp tool nhiều turn"
    relearn: "cca/domain-4/05-batch#giới-hạn-với-tool"
    relearnLabel: "4.5 · Giới hạn với tool"
  - q: "An automated reviewer posts about 40 findings per pull request, and developers report that many do not hold up when checked against the code. The team wants to keep recall high while posting fewer wrong comments. Which design fits best?"
    options:
      - text: "Ask the same review call to 'double-check each finding before reporting it'"
        why: "Cùng context vừa đưa ra phát hiện vừa tự kiểm lại thì dễ xác nhận chính mình."
      - text: "Post only the first ten findings of each review"
        why: "Cắt theo số lượng bỏ cả phát hiện đúng lẫn sai một cách ngẫu nhiên."
      - text: "Add an independent verification pass that checks each candidate finding against the code and routes low-confidence ones to a human instead of posting them"
        why: "Lượt xác minh độc lập lọc những phát hiện không đứng vững. Độ tin cậy dùng để định tuyến: đăng, chuyển cho người, hoặc loại."
      - text: "Switch the whole review to the Message Batches API"
        why: "Batch đổi chi phí và thời gian, không đổi chất lượng phát hiện. Review pull request cũng thường là việc có người chờ."
    answer: 2
    keyword: "lượt **xác minh** độc lập + định tuyến theo độ tin cậy"
    relearn: "cca/domain-4/06-review-nhieu-luot#lượt-xác-minh-và-độ-tin-cậy"
    relearnLabel: "4.6 · Lượt xác minh và độ tin cậy"
---

Mười câu hỏi dưới đây trộn kiến thức của cả sáu bài trong Domain 4. Mỗi câu mô tả một hệ thống cụ thể và hỏi quyết định đúng, giống cách đề thật ra đề.

Bạn nên hoàn thành các bài 4.1 đến 4.6 và [lab](../07-lab/) trước. Cần đúng từ **7/10** để tích hoàn thành. Sau khi nộp, lời giải cho từng phương án hiện ra, kèm nút **← Học lại** mở đúng đoạn bài học trong ngăn trượt.
