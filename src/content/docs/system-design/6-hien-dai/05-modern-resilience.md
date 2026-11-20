---
title: "Rate limiting, retry và circuit breaker"
description: "Rate limiting (token bucket, leaky bucket, fixed/sliding window) bảo vệ hệ thống khỏi bị một client làm cạn tài nguyên, trả 429 kèm Retry-After khi vượt hạn mức."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 9
quiz:
  - q: "Một API dùng fixed window counter 100 request/phút. Vấn đề nào có thể xảy ra?"
    options: ["Không thể cài đặt trên Redis", "Client có thể gửi gần 200 request trong khoảng vài giây quanh ranh giới hai phút", "Mọi request đều bị trễ vì phải xếp hàng", "Tốn bộ nhớ tỉ lệ với số request"]
    answer: 1
    why: "Bộ đếm reset ở biên cửa sổ, nên dồn hạn mức cuối phút trước và đầu phút sau sẽ vượt gần gấp đôi trong thời gian ngắn."
  - q: "Service A gọi B, B gọi C, mỗi tầng đều tự retry tối đa 3 lần. C bắt đầu quá tải. Cách cải thiện hợp lý nhất là gì?"
    options: ["Tăng số lần retry ở mọi tầng để tăng tỉ lệ thành công", "Bỏ timeout để request không bị huỷ", "Chỉ retry ở một tầng, dùng backoff có jitter và retry budget, kèm circuit breaker trước C", "Chuyển mọi lời gọi sang POST"]
    answer: 2
    why: "Retry ở nhiều tầng nhân tải lên C đúng lúc nó yếu nhất; giới hạn retry và fail fast giúp C có thời gian hồi phục."
  - q: "Circuit breaker đang ở trạng thái Open. Điều gì xảy ra với request mới?"
    options: ["Bị từ chối ngay (hoặc dùng fallback) mà không gọi dependency, cho tới khi hết thời gian chờ và chuyển sang Half-open", "Được xếp hàng chờ dependency hồi phục", "Được gửi tới dependency với timeout dài hơn", "Được retry liên tục cho tới khi thành công"]
    answer: 0
    why: "Open nghĩa là fail fast để giải phóng tài nguyên phía gọi và cho dependency thời gian hồi phục; Half-open mới cho vài request thử."
cards:
  - q: "Token bucket khác leaky bucket ở điểm chính nào?"
    a: "Token bucket cho phép burst tới dung lượng xô trong khi giữ tốc độ trung bình; leaky bucket làm đầu ra đều đặn, request dư phải chờ trong hàng hoặc bị bỏ."
  - q: "Vì sao rate limiter nhiều instance cần store chung như Redis?"
    a: "Nếu mỗi instance đếm cục bộ, tổng lượng cho phép bị nhân với số instance. Redis giữ bộ đếm chung; Lua script giúp thao tác đọc - tính - ghi nguyên tử."
  - q: "Khi vượt hạn mức, server nên trả gì cho client?"
    a: "Mã `429 Too Many Requests` kèm header `Retry-After` cho biết nên chờ bao lâu (số giây hoặc một thời điểm) trước khi thử lại."
  - q: "Jitter trong retry dùng để làm gì?"
    a: "Ngẫu nhiên hoá thời gian chờ để nhiều client không retry đồng loạt cùng một thời điểm, tránh tạo các đợt tải dồn dập lên server đang hồi phục."
  - q: "Retry budget là gì?"
    a: "Giới hạn tỉ lệ request retry so với request gốc (ví dụ khoảng 10% mỗi client). Khi dependency hỏng diện rộng, budget cạn và client ngừng dồn thêm tải."
  - q: "Vì sao truyền deadline tốt hơn để mỗi tầng tự đặt timeout?"
    a: "Deadline cho tầng dưới biết client còn chờ bao lâu, để không tốn công xử lý một kết quả mà phía trên đã bỏ cuộc."
  - q: "Bulkhead bảo vệ hệ thống thế nào?"
    a: "Tách thread pool hoặc connection pool riêng cho từng dependency, nên một dependency treo chỉ làm cạn pool của nó, các luồng khác vẫn chạy."
  - q: "Load shedding khác graceful degradation thế nào?"
    a: "Load shedding từ chối sớm một phần request khi quá tải; graceful degradation vẫn phục vụ nhưng giảm chất lượng, ví dụ tắt tính năng phụ hoặc trả cache cũ."
  - q: "Nêu một kịch bản cascading failure điển hình."
    a: "Một replica quá tải và chết, load balancer dồn traffic sang các replica còn lại, chúng quá tải và chết theo; retry của client càng làm tình hình tệ hơn."
---

:::tip[Ý chính]
- Rate limiting (token bucket, leaky bucket, fixed/sliding window) bảo vệ hệ thống khỏi bị một client làm cạn tài nguyên, trả 429 kèm Retry-After khi vượt hạn mức.
- Mọi lời gọi mạng cần timeout; retry chỉ dành cho thao tác idempotent, phải có exponential backoff, jitter và retry budget để tránh retry storm.
- Circuit breaker, bulkhead, load shedding và graceful degradation chặn lỗi dây chuyền bằng cách fail fast, cô lập tài nguyên và chủ động giảm việc khi quá tải.
:::

Trong hệ thống phân tán, câu hỏi không phải là "có lỗi hay không" mà là "lỗi lan rộng tới đâu". Một database chậm đi vài trăm mili giây, một service phụ bị treo hay một đợt traffic đột biến có thể kéo sập cả hệ thống nếu các thành phần cứ chờ nhau, thử lại liên tục và dồn tải vào chỗ đang yếu nhất.

Bài này gom các kỹ thuật giúp hệ thống "chịu đòn" (resilience): giới hạn request đi vào (rate limiting), không chờ vô hạn (timeout), thử lại có kiểm soát (retry), ngắt mạch (circuit breaker), cô lập tài nguyên (bulkhead) và chủ động bỏ bớt việc khi quá tải (load shedding). Chúng thường được dùng kết hợp.



<figure class="ccf-figure"><a href="../../guides/resiliency-patterns/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0316-reliciency-patterns.jpg" alt="Resiliency Patterns" loading="lazy" /><figcaption><strong>Resiliency Patterns</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



## Cascading failure

Cascading failure (lỗi dây chuyền) là khi sự cố ở một chỗ làm hỏng các chỗ khác như domino:

- Một replica quá tải và chết, [load balancer](../../2-khoi-xay-dung/01-load-balancer/) dồn traffic sang các replica còn lại khiến chúng quá tải theo.
- Một dependency chậm giữ thread/connection của service gọi nó; pool cạn, service gọi cũng ngừng phản hồi và lỗi lan lên tầng trên.
- Client thấy lỗi thì retry, lượng request nhân lên đúng lúc server yếu nhất (retry storm).

Mọi kỹ thuật bên dưới đều nhằm cắt một trong các vòng phản hồi này.

## Rate limiting

Rate limiting giới hạn số request một chủ thể (user, API key, IP, tenant) được gửi trong một khoảng thời gian, để bảo vệ tài nguyên, chống lạm dụng (brute-force đăng nhập, scraping), đảm bảo công bằng giữa các tenant và kiểm soát chi phí.

### Các thuật toán

- **Token bucket**: xô chứa tối đa B token, nạp thêm r token/giây; mỗi request lấy một token, hết thì bị từ chối. Cho phép burst tới B request trong khi tốc độ trung bình vẫn là r. Chỉ cần lưu số token và thời điểm nạp gần nhất.
- **Leaky bucket**: request vào hàng đợi cố định và được xử lý ra với tốc độ đều; hàng đầy thì bỏ. Đầu ra mượt, hợp khi phía sau chỉ chịu tốc độ ổn định, nhưng request phải chờ nên tăng latency.
- **Fixed window counter**: đếm request trong từng cửa sổ cố định (mỗi phút). Rẻ, nhưng lỗi ở biên: client gửi đủ hạn mức cuối phút này và đầu phút sau, tức gần gấp đôi trong thời gian ngắn.
- **Sliding window log**: lưu timestamp từng request, bỏ các timestamp cũ hơn cửa sổ rồi đếm. Chính xác nhất nhưng tốn bộ nhớ.
- **Sliding window counter**: ước lượng bằng số đếm cửa sổ trước nhân tỉ lệ còn chồng lấn, cộng số đếm cửa sổ hiện tại. Gần đúng nhưng rẻ.

| Thuật toán | Burst | Độ chính xác | Bộ nhớ mỗi khoá |
|---|---|---|---|
| Token bucket | Có, tới dung lượng xô | Tốt | 2 giá trị |
| Leaky bucket | Không, đầu ra đều | Tốt | Hàng đợi |
| Fixed window | Có, lỗi ở biên | Thấp | 1 bộ đếm |
| Sliding window log | Không | Cao nhất | Tỉ lệ số request |
| Sliding window counter | Ít | Gần đúng | 2 bộ đếm |

### Đặt ở đâu

Có thể đặt ở edge/CDN hoặc WAF để chặn traffic xấu sớm; ở API gateway hoặc [reverse proxy](../../2-khoi-xay-dung/02-reverse-proxy/) để áp hạn mức theo API key; hoặc trong service để bảo vệ tài nguyên đặc thù (số lần gửi OTP). Càng gần biên càng rẻ nhưng càng ít ngữ cảnh nghiệp vụ. Hạn mức theo IP dễ phạt nhầm nhiều người dùng chung một NAT.

### Rate limit phân tán với Redis

Nhiều instance gateway mà mỗi cái tự đếm cục bộ thì tổng cho phép gấp N lần. Cách phổ biến là đếm chung trên Redis:

- Fixed window: `INCR` key `rl:{user}:{phút}` kèm `EXPIRE`.
- Sliding window log: sorted set theo timestamp, `ZREMRANGEBYSCORE` rồi `ZCARD`.
- Token bucket: Lua script để đọc - tính - ghi chạy nguyên tử, tránh race condition.

Đánh đổi: thêm một round-trip mỗi request và Redis thành điểm phụ thuộc. Cần chọn khi Redis lỗi thì "fail open" (cho qua) hay "fail closed" (chặn).

### Trả lời client

Vượt hạn mức thì trả `429 Too Many Requests` (RFC 6585) kèm header `Retry-After` (số giây hoặc thời điểm nên thử lại). Các header như `X-RateLimit-Remaining` là quy ước phổ biến chứ không phải chuẩn. Xem thêm bài [HTTP hiện đại](../../6-hien-dai/03-modern-http/).

## Timeout

Mọi lời gọi mạng phải có timeout, nếu không một dependency treo sẽ giữ thread mãi. Phân biệt connect timeout (ngắn) và request timeout. Giá trị nên dựa trên phân phối [latency](../../1-nen-tang/03-latency/) thực tế, ví dụ nhỉnh hơn p99, không đặt tuỳ tiện 30 giây.

Trong chuỗi nhiều tầng, nên truyền **deadline** (hạn chót tuyệt đối) xuống dưới: nếu client chỉ còn 200 ms thì tầng dưới không nên làm 2 giây cho kết quả không ai chờ. gRPC hỗ trợ sẵn việc truyền deadline.

## Retry có kiểm soát

Retry giúp vượt lỗi tạm thời (mất gói, instance đang restart), nhưng retry ngây thơ là nguyên nhân hàng đầu của retry storm.



<figure class="ccf-figure"><a href="../../guides/how-do-we-retry-on-failures/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0229-how-do-we-retry-on-failures.png" alt="Retry Strategies for System Failures" loading="lazy" /><figcaption><strong>Retry Strategies for System Failures</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



### Exponential backoff và jitter

Chờ một khoảng tăng theo cấp số nhân, ví dụ `min(cap, base * 2^n)`, và thêm **jitter**: chọn ngẫu nhiên trong khoảng từ 0 tới giá trị đó, để hàng nghìn client không retry cùng lúc. Luôn giới hạn số lần thử.

### Retry budget

Retry ở nhiều tầng sẽ nhân lên: ba tầng, mỗi tầng thử tối đa 3 lần, thì một request gốc có thể thành 27 request ở tầng cuối. Nên chỉ retry ở một tầng, và đặt **retry budget**: tỉ lệ retry so với request gốc không vượt ngưỡng (sách SRE của Google gợi ý khoảng 10% mỗi client). Khi dependency hỏng diện rộng, budget cạn và client ngừng dồn thêm tải.

### Chỉ retry thao tác idempotent

GET thường an toàn; POST tạo đơn hay trừ tiền thì retry có thể gây trùng, trừ khi dùng idempotency key (xem [bài idempotency](../../6-hien-dai/06-modern-idempotency/)). Lỗi 4xx thường không nên retry; 5xx, timeout và 429 (tôn trọng `Retry-After`) mới là ứng viên.



<figure class="ccf-figure"><a href="../../guides/how-to-handle-web-request-error/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0144-client-handle-error.png" alt="How to Handle Web Request Errors" loading="lazy" /><figcaption><strong>How to Handle Web Request Errors</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



## Circuit breaker

Circuit breaker (cầu dao) đứng giữa service và một dependency, theo dõi lỗi và chuyển giữa ba trạng thái:

- **Closed**: request đi qua bình thường, breaker đếm lỗi/timeout. Tỉ lệ lỗi vượt ngưỡng thì chuyển sang Open.
- **Open**: mọi request bị từ chối ngay (fail fast), không gọi dependency, giúp nó có thời gian hồi phục và giải phóng tài nguyên phía gọi. Hết thời gian chờ thì sang Half-open.
- **Half-open**: cho vài request thử đi qua. Thành công thì về Closed, thất bại thì quay lại Open.

Khi breaker mở, cần fallback: dữ liệu cache cũ, giá trị mặc định hoặc ẩn tính năng. Ngưỡng quá nhạy khiến breaker nhảy vì lỗi lẻ tẻ; quá chậm thì không kịp bảo vệ.

## Bulkhead

Tên lấy từ vách ngăn thân tàu: một khoang thủng không làm chìm cả tàu. Bulkhead tách tài nguyên (thread pool, connection pool, thậm chí instance riêng) cho từng dependency hoặc nhóm khách hàng. Dependency A treo chỉ làm cạn pool của A, request dùng B vẫn chạy. Đổi lại, dùng tài nguyên kém hiệu quả hơn một pool chung.

## Load shedding và graceful degradation

**Load shedding** là chủ động từ chối một phần request khi gần hết năng lực, thay vì nhận hết rồi ai cũng chậm và cuối cùng sập. Từ chối sớm (503 hoặc 429 ngay đầu pipeline) rẻ hơn xử lý dở dang. Nên có mức ưu tiên: giữ request thanh toán, bỏ trước request gợi ý sản phẩm hay job nền.

**Graceful degradation** là giảm chất lượng thay vì ngừng hẳn: tắt tính năng phụ, trả cache hơi cũ, hiển thị danh sách không cá nhân hoá. Người dùng vẫn làm được việc chính, gắn với đánh đổi giữa [availability](../../3-he-phan-tan/03-availability/) và [consistency](../../3-he-phan-tan/02-consistency/).

## Khi nào dùng / không dùng

- Timeout: luôn dùng cho mọi lời gọi mạng.
- Retry: cho lỗi tạm thời và thao tác idempotent; không dùng khi lỗi do dữ liệu sai hay dependency quá tải diện rộng.
- Circuit breaker: hợp với dependency đồng bộ có thể hỏng kéo dài; ít giá trị với tác vụ đã qua hàng đợi [bất đồng bộ](../../2-khoi-xay-dung/07-async/).
- Rate limiting: cần cho API công khai và hệ nhiều tenant; với traffic nội bộ tin cậy, load shedding theo năng lực thường hợp hơn.

## Đánh đổi

Các cơ chế này đổi một phần trải nghiệm (request bị từ chối, dữ liệu cũ) lấy sự sống còn của toàn hệ thống, và thêm nhiều tham số cần tinh chỉnh. Tham số sai còn gây hại: timeout ngắn hơn latency bình thường biến mọi request thành lỗi. Cần [observability](../../6-hien-dai/09-modern-observability/) để thấy breaker mở, tỉ lệ 429 và retry theo thời gian.

## Trong phỏng vấn

- Với API công khai, chủ động nhắc rate limiting tại API gateway, token bucket, Redis để đếm chung, trả 429 kèm `Retry-After`.
- Với chuỗi microservice, nói rõ mỗi lời gọi có timeout, retry có backoff + jitter chỉ cho thao tác idempotent, circuit breaker cho dependency quan trọng.
- Câu hỏi hay gặp: "Thiết kế rate limiter phân tán", "Fixed window có vấn đề gì?", "Làm sao tránh retry storm?", "Service gợi ý chết thì trang chủ hiển thị gì?".

## Đọc thêm

- [Google SRE Book: Handling Overload](https://sre.google/sre-book/handling-overload/)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [AWS Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [RFC 6585: mã trạng thái 429](https://www.rfc-editor.org/rfc/rfc6585)
