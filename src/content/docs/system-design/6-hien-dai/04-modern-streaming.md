---
title: "Kafka và kiến trúc hướng sự kiện"
description: "Log streaming kiểu Kafka giữ sự kiện trong log bền vững để nhiều consumer group đọc độc lập và đọc lại được, khác với queue xoá message sau khi xử lý."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 8
quiz:
  - q: "Service phân tích có bug làm sai số liệu ba ngày qua. Hệ thống dùng Kafka với retention 7 ngày. Cách khắc phục hợp lý nhất?"
    options: ["Yêu cầu producer gửi lại toàn bộ sự kiện ba ngày qua", "Không làm được vì message đã bị xoá sau khi consumer đọc", "Tạo topic mới và chuyển các consumer khác sang đó", "Sửa bug rồi lùi offset của consumer group phân tích về ba ngày trước để xử lý lại"]
    answer: 3
    why: "Kafka giữ message theo retention bất kể đã đọc hay chưa, và mỗi group có offset riêng, nên chỉ group phân tích cần replay."
  - q: "Sự kiện của cùng một đơn hàng đôi khi được xử lý sai thứ tự (thanh toán trước khi tạo). Nguyên nhân khả dĩ nhất?"
    options: ["Producer không dùng order_id làm key nên sự kiện rơi vào các partition khác nhau", "Retention của topic quá ngắn", "Consumer group có quá ít consumer", "Kafka không đảm bảo thứ tự trong bất kỳ trường hợp nào"]
    answer: 0
    why: "Kafka chỉ giữ thứ tự trong một partition; dùng order_id làm key để mọi sự kiện của đơn hàng vào cùng partition."
  - q: "Consumer trừ tiền ví theo sự kiện, chạy at-least-once. Điều gì cần thiết nhất để tránh trừ tiền hai lần?"
    options: ["Chuyển sang at-most-once để không bao giờ xử lý trùng", "Tăng số partition của topic", "Làm consumer idempotent, ví dụ lưu ID sự kiện đã xử lý trong cùng transaction với việc trừ tiền", "Bật log compaction cho topic"]
    answer: 2
    why: "At-least-once có thể giao trùng; consumer idempotent biến xử lý trùng thành vô hại. At-most-once thì có thể mất giao dịch."
cards:
  - q: "Khác biệt cốt lõi giữa message queue và log streaming?"
    a: "Queue xoá message sau khi xử lý và phân việc cho worker. Log giữ message theo retention, nhiều consumer group đọc độc lập và có thể đọc lại."
  - q: "Offset trong Kafka là gì?"
    a: "Số thứ tự của message trong một partition. Consumer group commit offset để biết đã xử lý tới đâu và tiếp tục sau khi khởi động lại."
  - q: "Consumer group chia việc thế nào?"
    a: "Trong một group, mỗi partition chỉ do một consumer đọc tại một thời điểm. Số consumer hữu ích tối đa bằng số partition."
  - q: "Làm sao giữ thứ tự sự kiện của cùng một thực thể trong Kafka?"
    a: "Dùng ID thực thể làm key; các message cùng key vào cùng partition, nơi thứ tự được đảm bảo."
  - q: "Log compaction dùng để làm gì?"
    a: "Giữ bản ghi mới nhất cho mỗi key thay vì xoá theo thời gian, hợp với topic biểu diễn trạng thái hiện tại."
  - q: "At-most-once và at-least-once khác nhau ở thời điểm commit nào?"
    a: "At-most-once commit trước khi xử lý (có thể mất). At-least-once xử lý xong mới commit (có thể trùng)."
  - q: "Vấn đề dual write là gì và cách xử lý?"
    a: "Ghi DB rồi publish sự kiện, một bước lỗi thì hai bên lệch nhau. Dùng transactional outbox hoặc change data capture."
  - q: "Event sourcing lưu gì thay cho trạng thái hiện tại?"
    a: "Lưu chuỗi sự kiện bất biến đã xảy ra; trạng thái được tính bằng cách chơi lại sự kiện, thường kèm snapshot."
  - q: "Khi nào CQRS và event sourcing là over-engineering?"
    a: "Khi ứng dụng chỉ là CRUD thông thường, không cần lịch sử kiểm toán hay nhiều mô hình đọc khác nhau."
---

:::tip[Ý chính]
- Log streaming kiểu Kafka giữ sự kiện trong log bền vững để nhiều consumer group đọc độc lập và đọc lại được, khác với queue xoá message sau khi xử lý.
- Thứ tự chỉ được đảm bảo trong một partition, và cách thực dụng nhất là at-least-once kết hợp consumer idempotent.
- Event-driven, event sourcing và CQRS giảm phụ thuộc và giữ lịch sử, đổi lại tăng độ phức tạp và chấp nhận nhất quán dần.
:::

Bài [Xử lý bất đồng bộ](../../2-khoi-xay-dung/07-async/) giới thiệu message queue: một service đẩy việc vào hàng đợi, worker lấy ra làm, xong thì message biến mất. Mô hình đó tốt cho phân phối công việc, nhưng không trả lời được những câu hỏi như: "Năm service khác nhau cùng cần biết có đơn hàng mới thì sao?", "Service phân tích bị lỗi hai ngày, làm sao xử lý lại dữ liệu cũ?".

Log streaming kiểu Apache Kafka giải quyết bài toán đó bằng cách coi dữ liệu là một **nhật ký sự kiện** (event log) bền vững, ai cũng đọc được, đọc lại được. Đây là nền móng của kiến trúc hướng sự kiện.

## Message queue và log streaming

| | Message queue (RabbitMQ, SQS...) | Log streaming (Kafka, Pulsar, Kinesis...) |
|---|---|---|
| Sau khi xử lý | Message bị xoá | Message vẫn nằm trong log tới hết hạn retention |
| Nhiều bên cùng đọc | Cần cấu hình fan-out riêng | Mỗi consumer group đọc độc lập |
| Đọc lại dữ liệu cũ | Thường không | Có, bằng cách lùi offset |
| Ai nhớ vị trí đọc | Broker theo dõi từng message | Consumer tự lưu offset |
| Mạnh ở | Phân việc, retry, ưu tiên từng message | Thông lượng cao, nhiều bên tiêu thụ, replay |

Ranh giới ngày càng mờ, nhưng tư duy khác nhau: queue là "việc cần làm", log là "chuyện đã xảy ra".

## Kafka hoạt động thế nào

Sơ đồ dưới đây minh hoạ các khái niệm cơ bản của Kafka.



<figure class="ccf-figure"><a href="../../guides/the-ultimate-kafka-101-you-cannot-miss/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0246-kafka-101-8-steps-to-learn-the-fundamentals-of-kafka.png" alt="The Ultimate Kafka 101 You Cannot Miss" loading="lazy" /><figcaption><strong>The Ultimate Kafka 101 You Cannot Miss</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



- **Topic**: một dòng sự kiện có tên, ví dụ `orders`.
- **Partition**: mỗi topic chia thành nhiều partition. Mỗi partition là một log chỉ ghi nối vào cuối (append-only), được sao chép sang vài broker để chịu lỗi. Partition là đơn vị song song: nhiều partition thì nhiều consumer đọc cùng lúc được.
- **Offset**: số thứ tự của message trong một partition. Consumer ghi lại (commit) offset đã xử lý tới đâu.
- **Consumer group**: một nhóm consumer chia nhau các partition của topic; trong một group, mỗi partition tại một thời điểm chỉ do một consumer đọc. Các group khác nhau đọc độc lập, mỗi group có offset riêng. Service email và service phân tích là hai group cùng đọc `orders` mà không ảnh hưởng nhau.
- **Retention**: message được giữ theo thời gian hoặc dung lượng (mặc định của Kafka là 7 ngày), bất kể đã đọc hay chưa. Với **log compaction**, Kafka chỉ giữ bản ghi mới nhất cho mỗi key, hợp cho dữ liệu dạng "trạng thái hiện tại".
- **Replay**: vì log còn đó, consumer có thể lùi offset để xử lý lại, ví dụ sau khi sửa bug, hoặc để dựng một service mới từ lịch sử.

### Thứ tự chỉ được đảm bảo trong một partition

Kafka đảm bảo thứ tự **trong một partition**, không đảm bảo giữa các partition. Producer chọn partition theo **key** (mặc định băm key), nên mọi sự kiện cùng key, ví dụ cùng `order_id`, đi vào cùng partition và giữ đúng thứ tự "tạo, thanh toán, giao hàng".

Hệ quả thiết kế:

- Chọn key theo thực thể cần giữ thứ tự (đơn hàng, tài khoản), không phải ngẫu nhiên.
- Key quá "nóng" (một khách hàng cực lớn) tạo **partition nóng**, giống vấn đề hot shard trong [sharding SQL](../../2-khoi-xay-dung/04-sql/).
- Tăng số partition về sau làm thay đổi ánh xạ key sang partition, phá thứ tự tạm thời. Nên ước lượng số partition từ đầu.
- Số consumer hữu ích trong một group tối đa bằng số partition; consumer thừa sẽ ngồi chơi.

## Delivery semantics

Sơ đồ dưới đây minh hoạ ba mức đảm bảo giao nhận.



<figure class="ccf-figure"><a href="../../guides/delivery-semantics/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0165-delivery-semantics.png" alt="Delivery Semantics" loading="lazy" /><figcaption><strong>Delivery Semantics</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



- **At-most-once**: commit offset trước rồi mới xử lý. Lỗi giữa chừng thì message bị mất, không bao giờ trùng. Chấp nhận được cho metric, log ít quan trọng.
- **At-least-once**: xử lý xong mới commit. Lỗi trước khi commit thì message được xử lý lại, nên có thể **trùng**. Đây là mặc định thực tế của đa số hệ thống.
- **Exactly-once**: mỗi message có tác dụng đúng một lần. Kafka hỗ trợ trong phạm vi của nó qua idempotent producer và transaction (đọc từ topic, xử lý, ghi sang topic khác một cách nguyên tử). Khi tác dụng phụ ra ngoài Kafka (ghi DB, gọi API thanh toán), bạn vẫn phải tự làm.

Cách thực dụng: **at-least-once cộng consumer idempotent**, nghĩa là xử lý cùng một message hai lần cho kết quả như một lần, ví dụ lưu ID sự kiện đã xử lý hoặc dùng upsert. Xem chi tiết ở bài [Idempotency](../../6-hien-dai/06-modern-idempotency/).

Độ bền phía producer cũng quan trọng: trong Kafka, `acks=all` kết hợp `min.insync.replicas` đủ lớn giúp message không mất khi một broker chết, đổi lại latency ghi cao hơn.

## Kiến trúc hướng sự kiện

Trong **event-driven architecture**, service không gọi trực tiếp nhau mà phát sự kiện "điều gì đã xảy ra" (`OrderPlaced`), và ai quan tâm thì đăng ký nghe. Service đơn hàng không cần biết có service email, kho, phân tích. Thêm bên tiêu thụ mới không phải sửa bên phát.

Lợi ích: giảm phụ thuộc, hấp thụ đột biến tải, dễ mở rộng. Cái giá: luồng nghiệp vụ trải trên nhiều service nên khó theo dõi (cần [tracing](../../6-hien-dai/09-modern-observability/)), dữ liệu chỉ [nhất quán dần](../../3-he-phan-tan/02-consistency/), và **schema sự kiện** trở thành hợp đồng công khai cần quản lý phiên bản (thường dùng schema registry).

Lỗi kinh điển là **dual write**: ghi DB xong rồi publish sự kiện, nếu bước sau lỗi thì hai bên lệch nhau. Giải pháp phổ biến là **transactional outbox** (ghi sự kiện vào bảng outbox trong cùng transaction, rồi một tiến trình đẩy sang Kafka) hoặc **change data capture** (đọc log thay đổi của DB thành sự kiện).

## Event sourcing và CQRS

**Event sourcing**: thay vì lưu trạng thái hiện tại (số dư = 500), lưu **chuỗi sự kiện** đã xảy ra (nạp 1000, rút 300, rút 200). Trạng thái là kết quả "chơi lại" các sự kiện; thường kèm snapshot để không phải chơi lại từ đầu. Sơ đồ dưới đây so sánh thiết kế CRUD thông thường với event sourcing.



<figure class="ccf-figure"><a href="../../guides/differences-in-event-sourcing-system-design/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0188-event-sourcing.jpeg" alt="Differences in Event Sourcing System Design" loading="lazy" /><figcaption><strong>Differences in Event Sourcing System Design</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



**CQRS** (Command Query Responsibility Segregation): tách mô hình ghi (nhận lệnh, kiểm tra quy tắc) khỏi mô hình đọc (các view tối ưu cho truy vấn, có thể nằm ở DB khác như Elasticsearch hay [cache](../../2-khoi-xay-dung/06-cache/)). Hai mẫu hay đi cùng nhau: sự kiện từ phía ghi được dùng để cập nhật các view đọc, nhưng có thể dùng riêng.

**Khi nào đáng**: miền cần lịch sử kiểm toán đầy đủ (tài chính, kế toán, y tế), cần trả lời "trạng thái tại thời điểm X", hoặc tỉ lệ đọc và ghi chênh lệch lớn với nhiều kiểu truy vấn khác nhau.

**Cái giá**: phức tạp hơn CRUD nhiều; view đọc trễ hơn phía ghi; thay đổi cấu trúc sự kiện cũ rất khó vì sự kiện là bất biến; xoá dữ liệu cá nhân theo yêu cầu pháp lý phải thiết kế riêng. Với ứng dụng CRUD thông thường, đây thường là over-engineering.

## Khi nào dùng, khi nào không

**Nên dùng Kafka** khi có nhiều bên tiêu thụ cùng một dòng dữ liệu, cần replay, thông lượng lớn (log, clickstream, CDC, pipeline dữ liệu), hoặc cần thứ tự theo key.

**Không nên** khi chỉ cần hàng đợi việc đơn giản với retry và delay từng message (queue thường hợp hơn), cần request-response đồng bộ, hoặc đội ngũ nhỏ không đủ sức vận hành cluster (cân nhắc dịch vụ managed).

## Đánh đổi

- **Tách rời và dễ hiểu**: event giảm phụ thuộc trực tiếp nhưng làm luồng nghiệp vụ khó lần theo.
- **Thông lượng và độ trễ**: gom lô, `acks=all` tăng độ bền, thông lượng nhưng thêm latency.
- **Thứ tự và song song**: thứ tự chỉ trong partition; nhiều partition thì song song hơn nhưng khó giữ thứ tự toàn cục.
- **Exactly-once và đơn giản**: thường rẻ hơn khi chọn at-least-once cộng idempotency.

## Trong phỏng vấn

Khi thiết kế news feed, thông báo, thanh toán hay phân tích, hãy đặt Kafka giữa service ghi và các bên tiêu thụ, rồi nói rõ: key phân partition là gì và vì sao, mức delivery semantics, cách consumer khử trùng lặp, retention bao lâu. Câu hỏi hay gặp:

- "Làm sao đảm bảo thứ tự sự kiện của một người dùng?": dùng user ID làm key.
- "Consumer chết giữa chừng thì sao?": group rebalance, partition chuyển sang consumer khác, xử lý lại từ offset đã commit, nên cần idempotent.
- "Kafka khác RabbitMQ thế nào?": log bền và replay so với hàng đợi bị xoá sau khi xử lý.

## Đọc thêm

- [Apache Kafka: Introduction](https://kafka.apache.org/intro)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Martin Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Martin Fowler: CQRS](https://martinfowler.com/bliki/CQRS.html)
