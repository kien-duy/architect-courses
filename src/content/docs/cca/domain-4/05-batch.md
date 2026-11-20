---
title: 4.5 · Message Batches API
description: Khi nào dùng batch, custom_id, tính lịch gửi theo SLA, và gửi lại đúng những request lỗi.
lesson:
  day: 9
  minutes: 13
quiz:
  - q: "A company runs two Claude workloads: (1) a check that must pass before a pull request can be merged, and (2) a nightly job that summarizes 40,000 support tickets for a report read the next morning. How should each be called?"
    options:
      - text: "Both through the Message Batches API to save 50%"
        why: "Kiểm tra trước khi merge có người đang chờ. Batch không cam kết thời gian trả kết quả và có thể mất tới 24 giờ."
      - text: "Both through the synchronous Messages API for consistency"
        why: "Việc tóm tắt ban đêm không ai chờ từng kết quả. Gọi đồng bộ là trả gấp đôi cho một việc không cần độ trễ thấp."
      - text: "The merge check synchronously; the nightly summaries through the Message Batches API"
        why: "Đúng. Việc chặn người dùng cần gọi đồng bộ. Việc khối lượng lớn, không gấp thì hợp với batch và được giảm 50% chi phí."
      - text: "The merge check through the Batches API with a 5-minute polling loop; the summaries synchronously"
        why: "Ngược hoàn toàn. Polling nhanh hơn không làm batch xong nhanh hơn, và việc ban đêm lại bị tính giá đầy đủ."
    answer: 2
    keyword: "có người chờ → đồng bộ; khối lượng lớn, không gấp → batch"
    relearn: "#khi-nào-dùng-batch"
    relearnLabel: "Khi nào dùng batch"
  - q: "A batch of 5,000 extraction requests ends. `request_counts` shows 4,930 succeeded, 50 errored, and 20 expired. What is the correct next step?"
    options:
      - text: "Resubmit all 5,000 requests so the results are consistent"
        why: "4.930 request đã thành công và đã bị tính tiền. Gửi lại tất cả là trả tiền hai lần cho cùng kết quả."
      - text: "Read the results, collect the `custom_id` of each non-succeeded result, fix the cause for errored ones, and resubmit only those 70"
        why: "Đúng. Mỗi kết quả mang `custom_id` của request gốc. Chỉ những request `errored` và `expired` cần gửi lại, và request lỗi cần được sửa nguyên nhân trước."
      - text: "Match the failed requests by their position in the results file"
        why: "Thứ tự kết quả không được bảo đảm trùng thứ tự request. Phải khớp bằng `custom_id`."
      - text: "Wait another 24 hours for the expired requests to complete"
        why: "Request `expired` đã kết thúc. Batch không xử lý tiếp sau khi hết hạn 24 giờ."
    answer: 1
    keyword: "khớp bằng `custom_id`, gửi lại **chỉ** phần lỗi"
    relearn: "#xử-lý-kết-quả-và-lỗi"
    relearnLabel: "Xử lý kết quả và lỗi"
  - q: "Documents arrive continuously, and the contract promises results within 30 hours of arrival. Processing uses the Message Batches API. Which submission schedule meets the promise?"
    options:
      - text: "Submit one batch every 12 hours"
        why: "Văn bản đến ngay sau một lần gửi phải chờ 12 giờ, cộng tối đa 24 giờ xử lý là 36 giờ, vượt cam kết."
      - text: "Submit one batch every 24 hours"
        why: "Chờ tối đa 24 giờ cộng 24 giờ xử lý là 48 giờ."
      - text: "Submit one batch every 8 hours"
        why: "8 giờ chờ cộng 24 giờ xử lý là 32 giờ, vẫn vượt 30 giờ."
      - text: "Submit one batch every 4 hours"
        why: "Đúng. Trường hợp xấu nhất là 4 giờ chờ cộng 24 giờ xử lý, tức 28 giờ, nằm trong 30 giờ và còn dư thời gian để xử lý phần lỗi."
    answer: 3
    keyword: "chu kỳ gửi + 24 giờ ≤ SLA"
    relearn: "#tính-lịch-gửi-theo-sla"
    relearnLabel: "Tính lịch gửi theo SLA"
---

Không phải lời gọi model nào cũng cần câu trả lời ngay. Với những việc có thể chờ, **Message Batches API** giảm một nửa chi phí. Bài này giúp bạn quyết định việc nào đưa vào batch và vận hành batch cho đúng.

## Batch hoạt động thế nào

Bạn gửi một danh sách request, mỗi request có hình dạng giống một lời gọi Messages API thông thường. Hệ thống xử lý chúng **bất đồng bộ** và **độc lập với nhau**. Bạn hỏi trạng thái định kỳ và tải kết quả khi batch kết thúc.

| Đặc điểm | Giá trị theo tài liệu hiện hành |
|---|---|
| Chi phí | **50%** giá API chuẩn, cho cả token đầu vào và đầu ra |
| Thời gian | Phần lớn batch xong trong vòng 1 giờ. **Tối đa 24 giờ**; request chưa xong sau 24 giờ sẽ hết hạn. Không có cam kết về độ trễ |
| Kích thước | Tối đa 100.000 request hoặc 256 MB mỗi batch |
| Lưu kết quả | 29 ngày kể từ khi tạo batch |
| Trạng thái | `processing_status` đi từ `in_progress` sang `ended` |
| Thứ tự kết quả | **Không** bảo đảm trùng thứ tự request |
| Không hỗ trợ | `stream: true` và một vài tham số chỉ có ý nghĩa với lời gọi đồng bộ |

Điều đề thi nhấn mạnh: giảm 50%, cửa sổ xử lý tới 24 giờ, và **không có SLA về độ trễ**. "Thường xong trong một giờ" là quan sát, không phải cam kết để bạn thiết kế dựa vào.

```python
import anthropic

client = anthropic.Anthropic()

batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": f"invoice-{doc_id}",
            "params": {
                "model": "claude-haiku-5-5",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt + text}],
            },
        }
        for doc_id, text in documents.items()
    ]
)
print(batch.id, batch.processing_status)   # msgbatch_..., in_progress
```

Chưa chạy kiểm chứng trong khóa học này (cần `ANTHROPIC_API_KEY`).

## Khi nào dùng batch

Câu hỏi quyết định: **có ai hoặc có bước nào đang chờ kết quả không?**

| Công việc | Cách gọi | Lý do |
|---|---|---|
| Kiểm tra trước khi merge pull request | Đồng bộ | Lập trình viên đang chờ, bước merge bị chặn |
| Chatbot, review tương tác | Đồng bộ | Người dùng cần câu trả lời ngay |
| Báo cáo nợ kỹ thuật chạy ban đêm | Batch | Sáng mai mới đọc |
| Kiểm tra bảo mật toàn bộ repo hằng tuần | Batch | Không gấp, khối lượng lớn |
| Trích xuất 50.000 hóa đơn tồn | Batch | Xử lý hàng loạt, tiết kiệm đáng kể |
| Chạy bộ đánh giá hàng nghìn mẫu | Batch | Không ai chờ từng mẫu |

Sai lầm thường thấy trong câu hỏi thi là đưa một việc **chặn** (blocking) vào batch vì muốn tiết kiệm. Tiết kiệm 50% không có nghĩa lý gì nếu pull request phải đợi nhiều giờ. Chiều ngược lại cũng là lỗi: chạy việc ban đêm bằng lời gọi đồng bộ là trả gấp đôi mà không được gì.

## Giới hạn với tool

Mỗi request trong batch cho ra **một** phản hồi. Không có bước nào ở giữa để code của bạn chạy tool rồi gửi `tool_result` lại trong cùng request. Vì vậy vòng lặp agent nhiều turn với tool của bạn (như ở [bài 1.1](../../domain-1/01-agentic-loop/)) không chạy được bên trong một request batch.

Thứ vẫn dùng tốt trong batch:

- Lời gọi một lượt, kể cả trích xuất bằng `tool_use` hoặc structured outputs ở bài [4.3](../03-structured-output/): bạn chỉ cần đọc `input` của khối `tool_use`, không cần trả kết quả tool.
- Hội thoại nhiều lượt **đã có sẵn** trong `messages` của request.

:::note[Tool trong batch theo tài liệu hiện hành]
Hướng dẫn ôn thi ghi: Batch API không hỗ trợ gọi tool nhiều turn trong một request. Tài liệu hiện hành nói rõ hơn: request batch dùng được tool, và các **server tool** (web search, code execution…) chạy vòng lặp ngay phía máy chủ nên vẫn hoạt động trong batch. Giới hạn áp dụng cho tool do ứng dụng của bạn thực thi: batch trả về phản hồi có `tool_use` rồi dừng, và bạn phải tự gửi một request khác nếu muốn tiếp tục. Với đề thi, nhớ ý gốc: việc cần vòng lặp tool nhiều turn thì không hợp với batch.
:::

## custom_id

Vì kết quả không trả về theo thứ tự gửi, mỗi request phải mang một **`custom_id`** duy nhất trong batch. Kết quả tương ứng mang lại đúng `custom_id` đó. Đây là cách duy nhất để nối kết quả với văn bản gốc.

Đặt `custom_id` có nghĩa với hệ thống của bạn, ví dụ `invoice-2026-000117`, để từ một dòng kết quả tìm lại được ngay bản ghi nguồn. Tránh dùng số thứ tự trong mảng: nó vô nghĩa khi bạn gửi lại một phần.

`custom_id` phục vụ ba việc:

1. Nối kết quả với văn bản gốc.
2. Xác định chính xác request nào thất bại.
3. Gửi lại chỉ những request đó, không đụng tới phần đã thành công.

## Xử lý kết quả và lỗi

Khi batch kết thúc, mỗi request có một trong bốn loại kết quả:

| Loại | Ý nghĩa | Bị tính tiền | Việc cần làm |
|---|---|:-:|---|
| `succeeded` | Có phản hồi của model | Có | Kiểm tra `stop_reason`, rồi validation như bài [4.4](../04-validation-retry/) |
| `errored` | Request lỗi (request không hợp lệ, lỗi máy chủ) | Không | Sửa nguyên nhân nếu là lỗi request, rồi gửi lại |
| `canceled` | Batch bị hủy trước khi request được xử lý | Không | Gửi lại nếu vẫn cần |
| `expired` | Hết 24 giờ trước khi request được xử lý | Không | Gửi lại |

Một request lỗi **không** ảnh hưởng tới các request khác trong batch.

```python
retry_ids = []
for result in client.messages.batches.results(batch.id):
    if result.result.type == "succeeded":
        save(result.custom_id, result.result.message)
    else:
        retry_ids.append(result.custom_id)     # errored, canceled, expired

# Gửi batch mới chỉ gồm các văn bản trong retry_ids
```

Chưa chạy kiểm chứng trong khóa học này (cần `ANTHROPIC_API_KEY`).

Hai điều cần phân biệt:

- **`succeeded` không có nghĩa là dữ liệu đúng.** Nó chỉ nói request đã có phản hồi. Phản hồi vẫn có thể bị cắt (`stop_reason: "max_tokens"`) hoặc sai về ngữ nghĩa.
- **Gửi lại nguyên văn một request lỗi thường lại lỗi.** Nếu lỗi do văn bản quá dài, hãy đổi cách làm (chia văn bản thành phần nhỏ) cho đúng những `custom_id` đó rồi mới gửi lại.

## Tính lịch gửi theo SLA

Batch có thể mất tới 24 giờ, nên thời điểm **gửi** quyết định bạn có giữ được cam kết hay không. Công thức cho trường hợp xấu nhất:

```text
thời gian chờ tới lần gửi kế tiếp  +  24 giờ xử lý  ≤  thời hạn cam kết
```

Ví dụ: văn bản đến liên tục, cam kết trả kết quả trong 30 giờ kể từ khi nhận.

| Chu kỳ gửi | Xấu nhất | Đạt 30 giờ |
|---|---|:-:|
| Mỗi 24 giờ | 24 + 24 = 48 giờ | Không |
| Mỗi 8 giờ | 8 + 24 = 32 giờ | Không |
| Mỗi 6 giờ | 6 + 24 = 30 giờ | Vừa khít, không còn chỗ cho lỗi |
| Mỗi 4 giờ | 4 + 24 = 28 giờ | Có, dư 2 giờ |

Phần dư là cần thiết: request `expired` hoặc `errored` phải được gửi lại, và lần gửi lại cũng cần thời gian. Nếu thời hạn cam kết ngắn hơn 24 giờ, batch không bảo đảm được và bạn phải dùng lời gọi đồng bộ.

## Thử trên mẫu nhỏ trước

Một lỗi trong prompt nhân lên theo số request. Trước khi gửi 50.000 văn bản:

1. Chạy prompt và schema trên vài chục văn bản bằng lời gọi đồng bộ, gồm cả trường hợp biên.
2. Chạy validation, sửa tiêu chí và ví dụ few-shot cho tới khi tỉ lệ lỗi chấp nhận được.
3. Gửi thử một request đúng hình dạng sẽ dùng trong batch để chắc nó không bị từ chối vì sai tham số.
4. Rồi mới gửi toàn bộ.

Tài liệu hiện hành cũng gợi ý dùng prompt caching với phần prompt chung của các request trong batch để giảm thêm chi phí, với lưu ý cache trong batch chỉ là nỗ lực tốt nhất vì các request chạy đồng thời và không theo thứ tự.

Tài liệu gốc: [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing).

## Tóm tắt

- Batch giảm 50% chi phí, xử lý tối đa 24 giờ, không cam kết độ trễ.
- Việc có người hoặc có bước đang chờ thì gọi đồng bộ. Việc khối lượng lớn, không gấp thì dùng batch.
- Một request batch cho một phản hồi; vòng lặp tool nhiều turn của ứng dụng không chạy trong đó.
- `custom_id` nối kết quả với request, vì thứ tự kết quả không được bảo đảm.
- Gửi lại chỉ những request không thành công, sau khi sửa nguyên nhân.
- Lịch gửi: chu kỳ gửi cộng 24 giờ phải nhỏ hơn thời hạn cam kết. Thử prompt trên mẫu nhỏ trước khi chạy lớn.
