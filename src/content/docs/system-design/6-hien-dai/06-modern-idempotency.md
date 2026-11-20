---
title: "Idempotency, chống xử lý trùng và sinh ID"
description: "Retry qua mạng không tin cậy chắc chắn sinh request trùng, nên hệ thống phải được thiết kế để nhận trùng mà không gây hại."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 8
quiz:
  - q: "Hai request mang cùng idempotency key tới hai server gần như cùng lúc. Cách nào ngăn trừ tiền hai lần một cách đáng tin cậy?"
    options: ["Mỗi server đọc bảng khoá, nếu chưa có thì xử lý", "Client chờ lâu hơn trước khi retry", "Cache phản hồi ở load balancer", "Giành khoá bằng thao tác nguyên tử như INSERT với ràng buộc UNIQUE, bên thua trả 409"]
    answer: 3
    why: "Đọc rồi mới ghi có race condition; chỉ thao tác nguyên tử mới đảm bảo đúng một bên được xử lý."
  - q: "Một hệ thống quảng cáo hỗ trợ exactly-once nhờ Kafka transactions, nhưng consumer gọi API gửi email. Nhận định nào đúng?"
    options: ["Email chắc chắn chỉ gửi một lần nhờ Kafka", "Đảm bảo của Kafka chỉ bao phủ đọc-xử lý-ghi trong Kafka; gửi email vẫn cần idempotency hoặc dedup riêng", "Cần chuyển sang at-most-once để tránh trùng email", "Chỉ cần bật idempotent producer là đủ"]
    answer: 1
    why: "Exactly-once thực chất là at-least-once cộng xử lý idempotent trong một ranh giới; tác dụng phụ ra ngoài ranh giới đó phải tự lo."
  - q: "Vì sao UUID v7 thường được ưa hơn UUID v4 khi làm khoá chính B-tree?"
    options: ["Vì v7 ngắn hơn, chỉ 64 bit", "Vì v7 không bao giờ trùng còn v4 có thể trùng", "Vì v7 bắt đầu bằng timestamp nên bản ghi mới chèn gần cuối index, ít phân mảnh hơn", "Vì v7 cần một dịch vụ trung tâm cấp phát"]
    answer: 2
    why: "UUID v7 vẫn 128 bit và sinh độc lập, nhưng phần đầu là timestamp nên tăng gần tuần tự, thân thiện với index hơn ID ngẫu nhiên."
cards:
  - q: "Thao tác idempotent là gì?"
    a: "Thao tác mà thực hiện một lần hay nhiều lần đều để lại cùng trạng thái phía server, ví dụ đặt giá trị tuyệt đối hoặc xoá theo ID."
  - q: "Vì sao retry gây xử lý trùng?"
    a: "Khi timeout, phía gửi không biết request chưa tới hay đã xử lý xong nhưng mất phản hồi. Gửi lại trong trường hợp thứ hai làm thao tác chạy hai lần."
  - q: "Phương thức HTTP nào được định nghĩa là idempotent?"
    a: "Theo RFC 9110: GET, HEAD, PUT, DELETE, OPTIONS, TRACE. POST và PATCH không bắt buộc idempotent nên cần cơ chế như idempotency key."
  - q: "Server làm gì khi nhận idempotency key đã xử lý xong?"
    a: "Trả lại đúng phản hồi đã lưu (mã trạng thái và body) mà không thực hiện lại thao tác. Nếu body khác với lần đầu thì trả lỗi."
  - q: "Idempotency key nên sống bao lâu?"
    a: "Lâu hơn khoảng thời gian client còn có thể retry, thường tính bằng giờ hoặc ngày; Stripe cho phép xoá khoá sau ít nhất 24 giờ."
  - q: "Consumer at-least-once chống xử lý trùng thế nào?"
    a: "Ghi ID message vào bảng có ràng buộc unique trong cùng transaction với thay đổi nghiệp vụ, hoặc thiết kế thao tác dạng upsert hay kiểm tra version."
  - q: "Nhược điểm của auto-increment trong hệ phân tán?"
    a: "Một database là điểm nghẽn và điểm lỗi đơn, khó dùng khi sharding, và ID liên tiếp làm lộ quy mô cũng như cho phép dò tài nguyên kế bên."
  - q: "ID kiểu Snowflake gồm những phần nào?"
    a: "Trong thiết kế gốc: 41 bit timestamp mili giây, 10 bit ID máy, 12 bit sequence, gói trong 64 bit nên vừa kiểu `BIGINT` và tăng theo thời gian."
  - q: "Rủi ro chính của bộ sinh ID kiểu Snowflake?"
    a: "Phụ thuộc đồng hồ: nếu đồng hồ chạy lùi có thể sinh trùng, nên phải chờ hoặc từ chối. Ngoài ra cần cấp ID máy không trùng nhau."
---

:::tip[Ý chính]
- Retry qua mạng không tin cậy chắc chắn sinh request trùng, nên hệ thống phải được thiết kế để nhận trùng mà không gây hại.
- Idempotency key lưu kết quả theo khoá có thời hạn và giành khoá nguyên tử; consumer at-least-once thì dedup theo ID message, và exactly-once thực chất là at-least-once cộng xử lý idempotent.
- Sinh ID phân tán là đánh đổi giữa auto-increment (gọn, cần phối hợp), UUID v4/v7 (không phối hợp, v7 sắp theo thời gian) và kiểu Snowflake (64 bit, phụ thuộc đồng hồ và ID máy).
:::

Người dùng bấm "Thanh toán", server trừ tiền thành công nhưng phản hồi bị mất. Ứng dụng thấy timeout và gửi lại. Nếu server coi request thứ hai là giao dịch mới, khách bị trừ tiền **hai lần**. Lỗi không nằm ở việc retry, vì retry là cần thiết, mà ở chỗ phía gửi **không phân biệt được** "request chưa tới" với "đã xử lý xong nhưng phản hồi bị mất".

Bài này nói về **idempotency** (tính luỹ đẳng): thao tác thực hiện một hay nhiều lần đều cho cùng kết quả. Đây là nền tảng để retry an toàn và tiêu thụ message không trùng, gắn với bài toán sinh ID duy nhất. Chiến lược retry, backoff, circuit breaker được bàn ở bài [Resilience](../../6-hien-dai/05-modern-resilience/).

## Vì sao xử lý trùng là không thể tránh

Với phía gửi, một lời gọi từ xa có ba kết cục: thành công, thất bại rõ ràng, hoặc **không biết** (timeout, mất kết nối). Khi "không biết", chỉ có thể bỏ qua (có thể mất thao tác) hoặc gửi lại (có thể trùng). Hầu hết hệ thống chọn gửi lại, và trùng lặp đến từ nhiều tầng: client, proxy, SDK tự retry, hàng đợi giao lại message khi consumer chưa kịp xác nhận. Vì vậy câu hỏi đúng là "làm sao **nhận trùng mà không gây hại**".



<figure class="ccf-figure"><a href="../../guides/how-to-avoid-double-payment/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0178-double-charge.jpg" alt="How to Avoid Double Payment" loading="lazy" /><figcaption><strong>How to Avoid Double Payment</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



## Thao tác luỹ đẳng tự nhiên và không

Một số thao tác vốn luỹ đẳng: đặt giá trị (`SET status = 'shipped'`), xoá theo ID, `PUT` thay toàn bộ tài nguyên. Theo RFC 9110, GET, HEAD, PUT, DELETE, OPTIONS, TRACE là idempotent; POST và PATCH thì không bắt buộc. "Idempotent" nói về **trạng thái phía server**, không phải phản hồi: DELETE lần hai có thể trả 404 nhưng trạng thái vẫn như sau lần đầu.

Thao tác *tương đối* như "cộng 100.000đ vào số dư", "tạo đơn mới", "gửi email" thì không. Mẹo: dùng thao tác có điều kiện, như `UPDATE ... SET balance = 500 WHERE version = 7` (optimistic locking), để lần thứ hai tự bị loại.

## Idempotency key

Cách phổ biến cho API tạo tài nguyên hoặc thanh toán: client sinh một khoá duy nhất cho **mỗi ý định thao tác** (thường là UUID), gửi trong header `Idempotency-Key`, mọi lần retry dùng **lại đúng khoá đó**. Stripe là ví dụ nổi tiếng; IETF đang có bản nháp chuẩn hoá header này.

### Server xử lý thế nào

1. Tra khoá trong kho lưu (database, Redis…), thường kèm ID người dùng để khoá của hai người không đụng nhau.
2. Chưa có: ghi khoá ở trạng thái "đang xử lý", thực hiện thao tác, rồi **lưu kết quả** (mã trạng thái và body) gắn với khoá.
3. Đã có và đã xong: trả lại **đúng phản hồi đã lưu**, không làm lại.
4. Cùng khoá nhưng body khác (so bằng hash): trả lỗi (bản nháp IETF đề xuất 422).

Khi có thể, ghi kết quả nghiệp vụ và bản ghi idempotency trong **cùng một transaction**. Nếu thao tác gọi ra hệ thống ngoài (cổng thanh toán), hãy truyền tiếp một khoá idempotency sang đó.

### Thời hạn của khoá

Khoá không thể giữ mãi, nhưng phải sống lâu hơn khoảng thời gian client còn có thể retry, thường tính bằng giờ hoặc ngày; Stripe nêu rằng khoá có thể bị xoá sau ít nhất 24 giờ. Hết hạn thì khoá cũ được coi như mới, nên client không nên retry một thao tác quá cũ.

### Request đồng thời cùng khoá

Hai bản retry có thể tới hai server cùng lúc; nếu cả hai "tra, thấy chưa có, rồi xử lý", lại trùng. Cần thao tác nguyên tử để **giành khoá**: ràng buộc `UNIQUE` trong database (`INSERT` thứ hai thất bại) hoặc `SET key value NX` trong Redis. Bên thua trả lỗi "đang xử lý, thử lại sau"; bản nháp IETF đề xuất mã 409 Conflict. Bản ghi "đang xử lý" cũng cần thời hạn ngắn để nếu server giành khoá chết giữa chừng, lần retry sau được tiếp quản.

## Dedup khi tiêu thụ message

Hầu hết message broker mặc định giao **at-least-once**: consumer xử lý xong mới xác nhận (ack/commit offset); chết trước khi ack thì message được giao lại. Consumer phải chịu được trùng (xem [Bất đồng bộ](../../2-khoi-xay-dung/07-async/) và [Streaming](../../6-hien-dai/04-modern-streaming/)).



<figure class="ccf-figure"><a href="../../guides/delivery-semantics/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0165-delivery-semantics.png" alt="Delivery Semantics" loading="lazy" /><figcaption><strong>Delivery Semantics</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



- **Bảng message đã xử lý**: ghi ID message vào bảng có ràng buộc unique **trong cùng transaction** với thay đổi nghiệp vụ; trùng thì bỏ qua.
- **Ghi tuyệt đối/upsert**: "đặt đơn 991 = đã giao" thay vì "chuyển sang bước kế tiếp".
- **Version/sequence**: chỉ áp dụng sự kiện có số thứ tự lớn hơn số đã thấy cho thực thể đó.

ID message nên do **phía sinh sự kiện** đặt theo ý nghĩa nghiệp vụ, vì nếu producer retry gửi, broker có thể lưu hai bản với hai offset khác nhau.

## "Exactly-once" thực chất là gì

Ở mức mạng, không thể đảm bảo một message được *giao* đúng một lần. "Exactly-once" mà các hệ thống quảng cáo thực chất là **hiệu ứng** đúng một lần: **at-least-once + xử lý idempotent (hoặc dedup)**. Ví dụ Kafka có idempotent producer và transaction để đạt exactly-once cho luồng đọc-xử lý-ghi *bên trong Kafka*; khi consumer gây tác dụng phụ ra ngoài (gọi API thanh toán, gửi email), bạn vẫn phải tự lo idempotency. Hãy luôn hỏi: ranh giới đảm bảo nằm ở đâu?

## Sinh ID trong hệ phân tán

Idempotency và dedup cần ID duy nhất, và sinh ID cũng là bài toán phân tán. Sơ đồ dưới đây minh hoạ một số cách phổ biến.



<figure class="ccf-figure"><a href="../../guides/explaining-5-unique-id-generators-in-distributed-systems/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0006-explaining-5-unique-id-generators-in-distributed-systems.png" alt="Explaining 5 Unique ID Generators" loading="lazy" /><figcaption><strong>Explaining 5 Unique ID Generators</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



- **Auto-increment**: ngắn, tăng dần, tốt cho index. Nhưng một database là điểm nghẽn; khi sharding (xem [SQL](../../2-khoi-xay-dung/04-sql/)) phải chia dải hoặc dùng dịch vụ cấp dải ID. ID liên tiếp còn lộ quy mô kinh doanh và cho phép dò tài nguyên kế bên.
- **UUID v4**: 128 bit, 122 bit ngẫu nhiên, sinh ở đâu cũng được, xác suất trùng không đáng kể. Nhược điểm: dài, và vì ngẫu nhiên nên làm khoá chính B-tree thì bản ghi mới chèn rải rác khắp index, gây phân mảnh.
- **UUID v7** (chuẩn hoá trong RFC 9562, 2024): 48 bit đầu là Unix timestamp mili giây, phần còn lại chủ yếu ngẫu nhiên. Vẫn sinh độc lập nhưng **sắp gần theo thời gian**, chèn index gần như tuần tự; đổi lại lộ thời điểm tạo.
- **Kiểu Snowflake** (Twitter công bố khoảng 2010): số 64 bit gồm timestamp 41 bit mili giây từ một epoch tự chọn, ID máy 10 bit và sequence 12 bit (4.096 ID mỗi mili giây mỗi máy) trong thiết kế gốc. Vừa kiểu `BIGINT`, tăng theo thời gian, nhưng cần cấp ID máy không trùng và phụ thuộc đồng hồ: nếu đồng hồ chạy lùi, bộ sinh phải chờ hoặc từ chối để không tạo trùng.

| Cách | Kích thước | Cần phối hợp | Sắp theo thời gian | Rủi ro chính |
|---|---|---|---|---|
| Auto-increment | 32/64 bit | Có (database) | Có | Điểm nghẽn, lộ số lượng |
| UUID v4 | 128 bit | Không | Không | Index phân mảnh |
| UUID v7 | 128 bit | Không | Có (theo ms) | Lộ thời điểm tạo |
| Snowflake | 64 bit | Cấp ID máy | Có (theo ms) | Lệch đồng hồ |

## Khi nào dùng / không dùng

- **Cần idempotency key**: thao tác có tác dụng phụ đắt hoặc không đảo ngược được: thanh toán, tạo đơn, gửi tin nhắn.
- **Không cần**: thao tác vốn luỹ đẳng, hoặc trùng lặp vô hại (đếm lượt xem gần đúng).
- **Chọn ID**: một database nhỏ thì auto-increment; sinh ở nhiều nơi mà muốn index tốt thì UUID v7; cần ID 64 bit gọn ở lưu lượng rất lớn thì kiểu Snowflake.

## Đánh đổi

- Bảng idempotency thêm một lần ghi mỗi request và tốn lưu trữ theo thời hạn khoá.
- Khoá sống ngắn thì rẻ nhưng hở khi retry muộn; sống dài thì tốn hơn.
- Dedup chung transaction là chắc nhất nhưng buộc dữ liệu ở cùng database.

## Trong phỏng vấn

Khi thiết kế có retry, hàng đợi hoặc thanh toán, hãy chủ động nói: "Client gửi idempotency key; server giành khoá bằng ràng buộc unique, lưu phản hồi 24 giờ; consumer dedup theo event ID trong cùng transaction." Câu hỏi hay gặp: tránh trừ tiền hai lần thế nào; hai request cùng khoá tới đồng thời; vì sao không có exactly-once thật; thiết kế bộ sinh ID cho hệ thống cỡ Twitter và vì sao không dùng UUID v4 làm khoá chính. Liên hệ [Tính nhất quán](../../3-he-phan-tan/02-consistency/) khi bàn đồng bộ giữa nhiều hệ thống.

## Đọc thêm

- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [IETF draft: The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [RFC 9562: Universally Unique IDentifiers (UUIDs)](https://www.rfc-editor.org/rfc/rfc9562)
- [Apache Kafka: Message Delivery Semantics](https://kafka.apache.org/documentation/#semantics)
