---
title: 5.2 · Escalation và yêu cầu mơ hồ
description: Tín hiệu nào đáng tin để chuyển cho con người, khi nào chuyển ngay, khi nào thử giải quyết trước, và cách hỏi lại khi dữ liệu mơ hồ.
lesson:
  day: 10
  minutes: 14
quiz:
  - q: "A customer opens a chat with: 'I don't want a bot. Put me through to a person about my invoice.' The agent has tools that could look up the invoice. What should it do first?"
    options:
      - text: "Look up the invoice so the human agent receives a complete diagnosis"
        why: "Khách đã yêu cầu rõ ràng. Tự điều tra thêm là làm trái yêu cầu đó và kéo dài thời gian chờ của khách."
      - text: "Hand off to a human immediately, passing along what the customer has already said"
        why: "Đúng. Yêu cầu gặp người một cách rõ ràng là tín hiệu escalate ngay, không điều tra thêm và không thuyết phục khách ở lại."
      - text: "Explain what the bot can do and ask whether the customer still wants a person"
        why: "Khách đã trả lời câu hỏi đó rồi. Hỏi lại là trì hoãn một yêu cầu đã rõ."
      - text: "Run sentiment analysis and escalate only if the customer is angry enough"
        why: "Cảm xúc không phải tiêu chí. Yêu cầu rõ ràng đã đủ, dù khách bình tĩnh hay bực bội."
    answer: 1
    keyword: "yêu cầu gặp người **rõ ràng** → chuyển ngay, không điều tra thêm"
    relearn: "#escalate-ngay-hay-thử-giải-quyết-trước"
    relearnLabel: "Escalate ngay hay thử giải quyết trước"
  - q: "A team wants to reduce unnecessary escalations. They add: 'Rate your confidence from 1 to 10 and escalate when it is below 6.' Escalation volume barely changes, and several confidently wrong answers reach customers. Why does this approach fail?"
    options:
      - text: "The threshold is too low; it should be 8"
        why: "Đổi ngưỡng không sửa được việc điểm số không phản ánh độ đúng. Câu trả lời sai mà tự tin vẫn vượt mọi ngưỡng."
      - text: "The model should output the score as JSON so it can be parsed reliably"
        why: "Định dạng output không làm điểm số chính xác hơn."
      - text: "A model's self-rated confidence is not a reliable proxy for whether the case is beyond its scope; explicit criteria based on the situation work better"
        why: "Đúng. Model có thể sai một cách tự tin. Tiêu chí cần dựa vào đặc điểm của tình huống (khách yêu cầu, policy không phủ, không tiến triển được) chứ không dựa vào cảm giác chắc chắn của model."
      - text: "Confidence scores only work with temperature set to 0"
        why: "Temperature ảnh hưởng độ ngẫu nhiên của output, không biến tự đánh giá thành phép đo đã hiệu chỉnh."
    answer: 2
    keyword: "tự chấm điểm tin cậy ≠ độ khó của ca"
    relearn: "#hai-tín-hiệu-không-đáng-tin"
    relearnLabel: "Hai tín hiệu không đáng tin"
  - q: "A customer says 'cancel the order for Nguyen Van An'. The `find_customer` tool returns three customers with that name in different cities. What is the right next step?"
    options:
      - text: "Pick the customer with the most recent order, since that is the most likely one"
        why: "Đây là đoán theo heuristic. Hủy nhầm đơn của người khác là lỗi không hoàn tác được bằng lời xin lỗi."
      - text: "Cancel the latest order for all three to be safe"
        why: "Cách này chắc chắn gây hại cho ít nhất hai khách không liên quan."
      - text: "Escalate to a human because the tool result is ambiguous"
        why: "Agent tự giải quyết được bằng một câu hỏi. Escalate ở đây tốn thời gian của nhân viên cho việc trong tầm của agent."
      - text: "Ask the customer for another identifier such as email, phone number or order ID"
        why: "Đúng. Nhiều kết quả khớp là thiếu thông tin, không phải thiếu năng lực. Xin thêm định danh rồi tra lại."
    answer: 3
    keyword: "nhiều kết quả khớp → **hỏi thêm định danh**, không đoán"
    relearn: "#kết-quả-mơ-hồ-thì-hỏi-lại"
    relearnLabel: "Kết quả mơ hồ thì hỏi lại"
---

Một agent hỗ trợ tốt biết việc nào nó làm được và việc nào phải chuyển cho con người. Chuyển quá nhiều thì agent vô dụng; chuyển quá ít thì khách bị kẹt với một cái máy đang đoán. Đề thi hỏi rất cụ thể: tín hiệu nào đáng tin, và thời điểm nào là đúng.

## Ba tín hiệu escalation đáng tin

**Escalation** là việc agent dừng tự xử lý và chuyển ca cho con người. Có ba tín hiệu rõ ràng, quan sát được từ chính tình huống:

| Tín hiệu | Ví dụ | Vì sao phải chuyển |
|---|---|---|
| **Khách yêu cầu gặp người một cách rõ ràng** | "Cho tôi nói chuyện với nhân viên" | Đó là quyền của khách. Agent không có lý do gì để từ chối hay trì hoãn |
| **Policy không phủ hoặc mơ hồ** | Khách xin giảm giá theo giá của đối thủ; policy chỉ nói về điều chỉnh giá trong hệ thống của mình | Agent không có căn cứ để quyết định. Tự suy diễn policy là tạo ra policy mới |
| **Không tiến triển được** | Đã thử hai cách tra cứu, cả hai đều lỗi; hoặc khách đã giải thích ba lần mà vấn đề vẫn chưa xác định | Tiếp tục chỉ làm tốn thời gian của khách |

Một tín hiệu thứ tư thường xuất hiện trong đề: **thao tác vượt ngưỡng nghiệp vụ**, ví dụ hoàn tiền trên một số tiền nhất định. Với loại này, đừng dựa vào prompt. Hãy chặn bằng hook và chuyển hướng sang quy trình duyệt, như đã học ở [bài 1.5](../../domain-1/05-hooks/).

## Hai tín hiệu không đáng tin

Hai cách dưới đây nghe hợp lý và hay xuất hiện làm phương án sai.

| Cách làm | Vì sao không đáng tin |
|---|---|
| **Phân tích cảm xúc** (sentiment) | Mức bực bội của khách không tương quan với độ khó của ca. Khách giận về một việc agent sửa được trong một bước; khách điềm tĩnh hỏi một việc policy không phủ. Dùng cảm xúc làm ngưỡng sẽ chuyển nhầm cả hai chiều |
| **Model tự chấm điểm tin cậy** (1 đến 10) | Model có thể sai một cách rất tự tin. Điểm tự chấm không được hiệu chỉnh với kết quả thực, nên ngưỡng nào cũng tùy tiện |

Phương án thứ ba hay gặp là "huấn luyện một bộ phân loại riêng để quyết định escalation". Nó không sai về nguyên lý, nhưng thường là quá mức cần thiết: cần dữ liệu gán nhãn mà bạn chưa có, trong khi tiêu chí rõ ràng trong prompt chưa hề được thử.

:::note[Còn điểm tin cậy ở bài 5.5?]
[Bài 5.5](../05-giam-sat-va-do-tin-cay/) dùng điểm tin cậy theo từng trường để định tuyến sang người duyệt. Hai bài không mâu thuẫn. Điểm tự chấm **chưa hiệu chỉnh** không dùng được làm tín hiệu. Điểm đã được đối chiếu với một tập dữ liệu gán nhãn thì dùng được, và chỉ trong phạm vi đã đối chiếu.
:::

## Escalate ngay hay thử giải quyết trước

Không phải tín hiệu nào cũng dẫn tới chuyển ngay. Phân biệt bốn tình huống:

| Tình huống | Hành động đúng |
|---|---|
| Khách **yêu cầu gặp người** ngay từ đầu | Chuyển ngay. Không tra cứu thêm, không mời khách thử để agent giúp trước |
| Khách **bực bội** nhưng chưa yêu cầu gặp người, và việc nằm trong tầm agent | Ghi nhận cảm xúc, đưa ra giải pháp cụ thể. Bực bội không phải là yêu cầu gặp người |
| Khách đã được đề xuất giải pháp và **nhắc lại** rằng muốn gặp người | Chuyển ngay. Không thuyết phục lần thứ hai |
| Việc nằm ngoài policy | Chuyển, kèm mô tả policy thiếu chỗ nào |

```text
Khách:  Giao hàng kiểu gì vậy, cối máy xay nứt một đường dài!
Agent:  Tôi rất tiếc về chuyện này. Đơn DH-48213 còn trong hạn đổi trả.
        Tôi có thể đổi máy mới (giao trong 2 ngày) hoặc hoàn 1.290.000 đ. Anh chọn cách nào?
Khách:  Thôi, cho tôi gặp nhân viên.
Agent:  [chuyển ngay, kèm bản chuyển giao]
```

Ở lượt đầu, agent không chuyển: khách bực nhưng việc nằm gọn trong quyền của agent. Ở lượt thứ hai, khách yêu cầu rõ ràng, và agent chuyển mà không nài thêm.

Sai lầm ở cả hai phía đều bị đề thi khai thác: chuyển ngay khi khách vừa phàn nàn (bỏ qua một ca dễ), và cố giải quyết khi khách đã nói rõ muốn gặp người.

## Tiêu chí rõ ràng và ví dụ few-shot

Một dòng "hãy chuyển cho nhân viên khi cần thiết" trong system prompt không đủ. Model sẽ tự diễn giải "cần thiết", và mỗi lần một khác. Cách sửa đầu tiên luôn là **viết tiêu chí tường minh, kèm vài ví dụ**.

```text
Chuyển cho nhân viên NGAY khi:
1. Khách yêu cầu gặp người, bằng bất kỳ cách diễn đạt nào.
2. Yêu cầu không được policy đề cập, hoặc policy có thể hiểu theo hai cách.
3. Bạn đã thử hai cách khác nhau mà không tiến triển.

KHÔNG chuyển chỉ vì khách dùng lời lẽ gay gắt. Hãy ghi nhận và đề xuất giải pháp.

Ví dụ 1
Khách: "Bên kia bán rẻ hơn 200 nghìn, giảm cho tôi bằng giá đó đi."
Đúng: chuyển. Lý do: policy điều chỉnh giá không nói gì về giá của đối thủ.

Ví dụ 2
Khách: "Quá tệ! Ba ngày rồi chưa thấy hàng."
Đúng: không chuyển. Tra trạng thái vận chuyển, báo ngày giao dự kiến, đề xuất phương án.
```

Ví dụ few-shot hiệu quả nhất khi nhắm vào đúng ranh giới dễ nhầm: một ca trông giống cần chuyển nhưng không cần, và một ca trông bình thường nhưng phải chuyển. Kỹ thuật few-shot được học kỹ ở Domain 4.

Thứ tự ưu tiên khi gặp câu hỏi "agent chuyển sai, sửa thế nào": tiêu chí tường minh và ví dụ trước; hạ tầng phức tạp hơn (bộ phân loại, model lớn hơn) chỉ khi cách đầu đã thử và không đủ.

## Kết quả mơ hồ thì hỏi lại

Mơ hồ không phải lúc nào cũng cần con người bên trong công ty. Nhiều khi người cần hỏi chính là khách.

Tình huống kinh điển: tool tìm khách hàng trả về **nhiều kết quả khớp**. Agent không được chọn theo heuristic ("người có đơn gần nhất", "kết quả đầu tiên"). Nó phải xin thêm định danh: email, số điện thoại, mã đơn.

| Tình huống mơ hồ | Hành động đúng | Hành động sai |
|---|---|---|
| Nhiều khách hàng trùng tên | Hỏi thêm định danh rồi tra lại | Chọn kết quả có vẻ hợp lý nhất |
| Yêu cầu có hai cách hiểu ("hủy đơn" khi khách có hai đơn đang mở) | Hỏi khách muốn nói đơn nào | Hủy đơn mới nhất |
| Policy có hai cách hiểu | Escalate | Chọn cách hiểu có lợi cho khách, hoặc cho công ty |

Phân biệt: thiếu thông tin **từ khách** thì hỏi khách. Thiếu căn cứ **từ policy** thì chuyển cho người có thẩm quyền.

Trong Agent SDK, Claude hỏi lại người dùng qua tool có sẵn `AskUserQuestion`. Lời gọi này đi vào callback `canUseTool` của ứng dụng; bạn hiển thị câu hỏi và trả lựa chọn của người dùng về. Mỗi lời gọi chứa 1 đến 4 câu hỏi, mỗi câu 2 đến 4 lựa chọn. Hai điều dễ sót: nếu bạn giới hạn bộ tool bằng `tools`, phải đưa `AskUserQuestion` vào danh sách; và tool này hiện không có trong subagent, nên câu hỏi phải đi qua agent chính.

## Bản chuyển giao tự đủ

Người nhận ca thường **không đọc được hội thoại**. Thứ duy nhất họ có là bản chuyển giao. [Bài 1.5](../../domain-1/05-hooks/) đã nêu bốn thành phần; dưới đây là một bản đầy đủ.

```json
{
  "customer_id": "KH-20931",
  "verified_by": "email + 4 số cuối thẻ",
  "order_id": "DH-48213",
  "issue": "Máy xay giao ngày 2026-09-05 bị nứt cối. Khách đã gửi 2 ảnh.",
  "actions_taken": [
    "Xác minh khách và đơn hàng",
    "Xác nhận đơn còn trong hạn đổi trả (tới 2026-10-02)",
    "Đề xuất đổi máy hoặc hoàn 1.290.000 đ; khách không chọn"
  ],
  "escalation_reason": "Khách yêu cầu gặp nhân viên sau khi nghe đề xuất",
  "recommended_action": "Hoàn 1.290.000 đ về phương thức thanh toán gốc",
  "open_questions": ["Khách có muốn giữ máy lỗi hay gửi trả?"]
}
```

Kiểm tra một bản chuyển giao bằng câu hỏi: nhân viên có phải hỏi lại khách điều gì mà agent đã biết không? Nếu có, bản chuyển giao còn thiếu. Hai thứ hay bị bỏ sót nhất là **lý do chuyển** và **những gì đã thử**; thiếu chúng, nhân viên sẽ lặp lại đúng các bước agent đã làm.

Tài liệu gốc: [Handle approvals and user input](https://code.claude.com/docs/en/agent-sdk/user-input).

## Tóm tắt

- Ba tín hiệu đáng tin: khách yêu cầu gặp người, policy không phủ hoặc mơ hồ, agent không tiến triển được.
- Cảm xúc của khách và điểm tin cậy tự chấm không phải tín hiệu đáng tin.
- Yêu cầu gặp người rõ ràng → chuyển ngay. Bực bội mà việc trong tầm → ghi nhận, giải quyết; chuyển khi khách nhắc lại.
- Tiêu chí tường minh kèm ví dụ few-shot là cách sửa đầu tiên khi agent chuyển sai.
- Nhiều kết quả khớp → hỏi thêm định danh, không đoán.
- Bản chuyển giao phải tự đủ: định danh, vấn đề, việc đã làm, lý do chuyển, đề xuất.
