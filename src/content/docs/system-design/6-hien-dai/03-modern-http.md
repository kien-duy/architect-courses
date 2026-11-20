---
title: "HTTPS/TLS, HTTP/2 và HTTP/3"
description: "TLS bảo đảm bí mật, toàn vẹn và xác thực server, và TLS 1.3 rút bắt tay xuống còn 1 round trip."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 8
quiz:
  - q: "Một app di động dùng HTTP/2 chạy chậm hẳn trên mạng 4G hay mất gói, dù server không quá tải. Nguyên nhân hợp lý nhất là gì?"
    options: ["HTTP/2 không hỗ trợ nén header nên tốn băng thông", "Một gói TCP bị mất làm mọi stream trên kết nối phải chờ truyền lại", "HTTP/2 bắt buộc mở một kết nối riêng cho mỗi request", "TLS 1.3 không tương thích với mạng di động"]
    answer: 1
    why: "HTTP/2 multiplex trên một kết nối TCP; TCP giao byte theo thứ tự nên một gói mất chặn mọi stream. HTTP/3 trên QUIC tránh được vấn đề này."
  - q: "Bạn chuyển các service nội bộ sang gRPC và thấy một backend nhận phần lớn lưu lượng trong khi các backend khác rảnh. Cách xử lý phù hợp nhất?"
    options: ["Tắt keep-alive để mỗi request mở kết nối mới", "Chuyển về HTTP/1.1 và bật pipelining", "Dùng load balancer tầng 7 hiểu HTTP/2 hoặc client-side load balancing để phân phối theo request", "Tăng số CPU cho backend đang quá tải"]
    answer: 2
    why: "gRPC giữ ít kết nối sống lâu, nên cân bằng theo kết nối ở tầng 4 bị lệch; phân phối theo request ở tầng 7 giải quyết gốc vấn đề."
  - q: "Vì sao dữ liệu gửi bằng 0-RTT của TLS 1.3 chỉ nên dùng cho request kiểu GET an toàn?"
    options: ["Vì dữ liệu 0-RTT có thể bị kẻ tấn công phát lại", "Vì dữ liệu 0-RTT không được mã hoá", "Vì 0-RTT chỉ hỗ trợ phương thức GET theo đặc tả HTTP", "Vì 0-RTT bỏ qua kiểm tra chứng chỉ của server"]
    answer: 0
    why: "Dữ liệu 0-RTT vẫn được mã hoá nhưng không có bảo vệ chống replay như phần còn lại của kết nối, nên request có tác dụng phụ có thể bị thực hiện nhiều lần."
cards:
  - q: "TLS đảm bảo ba điều gì?"
    a: "Bảo mật nội dung, toàn vẹn dữ liệu (phát hiện bị sửa) và xác thực server qua chứng chỉ. Xác thực client là tuỳ chọn (mTLS)."
  - q: "TLS 1.3 nhanh hơn TLS 1.2 ở điểm nào?"
    a: "Bắt tay đầy đủ còn 1 round trip thay vì khoảng 2, và có chế độ 0-RTT khi kết nối lại tới server đã gặp."
  - q: "CA làm gì trong HTTPS?"
    a: "CA ký chứng chỉ gắn public key với tên miền. Client kiểm tra chuỗi chữ ký lên một CA gốc được tin tưởng, tên miền khớp và chứng chỉ còn hạn."
  - q: "TLS termination là gì và thường đặt ở đâu?"
    a: "Là điểm giải mã TLS, thường ở load balancer, reverse proxy hoặc CDN. Phía sau có thể dùng HTTP thường, mã hoá lại, hoặc dùng passthrough."
  - q: "Head-of-line blocking trong HTTP/1.1 là gì?"
    a: "Trên một kết nối, response phải trả theo thứ tự nên một response chậm chặn mọi response sau. Trình duyệt lách bằng cách mở nhiều kết nối song song."
  - q: "HTTP/2 multiplexing hoạt động thế nào?"
    a: "Request và response được chia thành frame nhị phân có mã stream, đan xen trên một kết nối TCP và ghép lại ở đầu kia."
  - q: "QUIC giải quyết điều gì mà TCP không làm được?"
    a: "QUIC truyền lại gói mất theo từng stream nên stream này không chặn stream khác, tích hợp TLS 1.3 và hỗ trợ giữ kết nối khi đổi mạng nhờ connection ID."
  - q: "Vì sao HTTP/3 luôn cần fallback về HTTP/2?"
    a: "Một số mạng và tường lửa chặn hoặc bóp UDP, nên client phải sẵn sàng dùng TCP khi QUIC không kết nối được."
  - q: "Cách rẻ nhất để người dùng hưởng HTTP/3 là gì?"
    a: "Bật HTTP/3 ở CDN: CDN nói HTTP/3 với người dùng và vẫn dùng HTTP/1.1 hoặc HTTP/2 với origin."
---

:::tip[Ý chính]
- TLS bảo đảm bí mật, toàn vẹn và xác thực server, và TLS 1.3 rút bắt tay xuống còn 1 round trip.
- HTTP/2 ghép nhiều stream trên một kết nối TCP nhưng vẫn bị head-of-line blocking khi mất gói, còn HTTP/3 trên QUIC tách các stream độc lập.
- Nơi terminate TLS, việc tái sử dụng kết nối và CDN ở edge ảnh hưởng trực tiếp tới latency và cân bằng tải.
:::

Mọi request tới hệ thống của bạn đều đi qua hai lớp ta hay coi là hiển nhiên: TLS để bảo mật và một phiên bản HTTP để chuyên chở dữ liệu. Hai lớp này quyết định phần lớn chi phí "khởi động" của request: mất bao nhiêu round trip (một vòng đi và về giữa client và server) trước khi byte dữ liệu đầu tiên tới nơi, và một gói tin bị mất làm kẹt bao nhiêu request khác.

Bài này tiếp nối [Giao tiếp](../../1-nen-tang/05-communication/): HTTPS bảo vệ gì, vì sao TLS 1.3 nhanh hơn, và HTTP/2, HTTP/3 ảnh hưởng tới kết nối, [load balancer](../../2-khoi-xay-dung/01-load-balancer/), [CDN](../../1-nen-tang/07-cdn/) ra sao.

## TLS bảo vệ gì

HTTPS là HTTP chạy bên trong kênh TLS (Transport Layer Security). TLS mang lại ba đảm bảo:

- **Bảo mật**: người ở giữa đường truyền không đọc được nội dung.
- **Toàn vẹn**: dữ liệu bị sửa trên đường sẽ bị phát hiện.
- **Xác thực server**: client biết mình nói chuyện với đúng `api.example.com`. Xác thực cả client (mutual TLS, hay mTLS) cũng làm được, thường dùng giữa các service nội bộ.

TLS **không** giấu mọi thứ: IP, thời điểm và kích thước lưu lượng vẫn lộ, tên miền thường vẫn thấy được qua trường SNI. TLS cũng không bảo vệ dữ liệu sau khi đã tới server; đó là việc của bài [Bảo mật](../../2-khoi-xay-dung/08-security/).

### Handshake ở mức khái niệm

Trước khi gửi dữ liệu, hai bên "bắt tay" (handshake) để chọn thuật toán, server chứng minh danh tính bằng chứng chỉ, và cùng suy ra một khoá phiên đối xứng dùng cho phần còn lại (mã hoá đối xứng rẻ hơn nhiều so với bất đối xứng). Sơ đồ dưới đây minh hoạ luồng HTTPS từ lúc mở kết nối tới lúc truyền dữ liệu.



<figure class="ccf-figure"><a href="../../guides/how-does-https-work/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0220-how-does-https-work.png" alt="How does HTTPS work?" loading="lazy" /><figcaption><strong>How does HTTPS work?</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



Điều quan trọng với thiết kế là **số round trip**. TLS 1.2 tốn khoảng 2 round trip cho bắt tay đầy đủ, cộng 1 round trip của TCP. **TLS 1.3** (RFC 8446) rút xuống 1 round trip vì client gửi luôn phần trao đổi khoá trong thông điệp đầu. Khi kết nối lại, chế độ **0-RTT** cho gửi dữ liệu ngay lập tức, nhưng dữ liệu đó có thể bị phát lại (replay), nên chỉ hợp với request an toàn khi lặp như GET (xem [idempotency](../../6-hien-dai/06-modern-idempotency/)). Với người dùng cách server 150 ms, bớt một round trip là bớt 150 ms (xem [Latency](../../1-nen-tang/03-latency/)).

### Chứng chỉ và CA

Chứng chỉ (certificate) gắn một public key với tên miền, được ký bởi một **CA** (Certificate Authority) mà hệ điều hành hoặc trình duyệt tin sẵn. Client kiểm tra chuỗi chữ ký lên tới CA gốc, tên miền khớp và chứng chỉ còn hạn. Không có private key thì kẻ tấn công không giả làm server được.

Lỗi vận hành hay gặp nhất là **chứng chỉ hết hạn**: hãy tự động gia hạn (ví dụ giao thức ACME của Let's Encrypt) và cảnh báo trước hạn qua [observability](../../6-hien-dai/09-modern-observability/).

### TLS termination

Giải mã tốn CPU và quản lý chứng chỉ trên hàng trăm server rất phiền, nên hệ thống thường **kết thúc TLS** (TLS termination) tại điểm vào: [load balancer](../../2-khoi-xay-dung/01-load-balancer/), [reverse proxy](../../2-khoi-xay-dung/02-reverse-proxy/) hoặc CDN.

| Cách làm | Ưu điểm | Nhược điểm |
|---|---|---|
| Terminate ở biên, phía sau dùng HTTP thường | Đơn giản, định tuyến theo header được | Lưu lượng nội bộ không mã hoá |
| Terminate rồi mã hoá lại tới backend | Vẫn định tuyến theo nội dung, nội bộ vẫn mã hoá | Thêm CPU và chứng chỉ nội bộ |
| Passthrough (chỉ chuyển tiếp TCP) | Mã hoá tới tận service | Chỉ cân bằng được ở tầng 4 |

Xu hướng hiện nay là mã hoá cả lưu lượng nội bộ (zero trust), thường bằng mTLS do service mesh tự lo.

## Từ HTTP/1.1 đến HTTP/3

Sơ đồ dưới đây minh hoạ khác biệt giữa ba thế hệ HTTP.



<figure class="ccf-figure"><a href="../../guides/http1-http2-http3/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0101-http-1-http-2-http-3.png" alt="HTTP/1 -> HTTP/2 -> HTTP/3" loading="lazy" /><figcaption><strong>HTTP/1 -> HTTP/2 -> HTTP/3</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



### HTTP/1.1 và head-of-line blocking

HTTP/1.1 có **keep-alive**: dùng lại một kết nối TCP cho nhiều request. Nhưng trên một kết nối, response phải trả lần lượt, nên một response chậm làm kẹt mọi thứ sau nó: **head-of-line blocking** (chặn đầu hàng). Pipelining gần như không được bật trong thực tế. Cách lách là mở nhiều kết nối song song (trình duyệt thường giới hạn khoảng 6 kết nối mỗi origin), sinh ra mẹo domain sharding.

### HTTP/2: nhiều stream trên một kết nối

HTTP/2 (RFC 9113) chia request và response thành **frame** nhị phân gắn mã **stream**, đan xen trên **một kết nối TCP** (multiplexing), nên response chậm không chặn response khác ở tầng HTTP. Header được nén (HPACK). Domain sharding giờ thành phản tác dụng. Server push của HTTP/2 hầu như không được dùng và nhiều trình duyệt đã bỏ.



<figure class="ccf-figure"><a href="../../guides/what-makes-http2-faster-than-http1/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0421-why-http2-is-faster-than-http1.png" alt="What makes HTTP2 faster than HTTP1?" loading="lazy" /><figcaption><strong>What makes HTTP2 faster than HTTP1?</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



Giới hạn còn lại: TCP giao byte đúng thứ tự. Khi **một gói bị mất**, mọi dữ liệu phía sau bị giữ lại chờ gửi lại, nên **mọi stream** đều phải chờ. Head-of-line blocking chuyển xuống tầng TCP; trên mạng di động hay mất gói, một kết nối HTTP/2 có thể chậm hơn vài kết nối HTTP/1.1.

### HTTP/3 trên QUIC

HTTP/3 (RFC 9114) chạy trên **QUIC** (RFC 9000), giao thức truyền tải xây trên UDP. QUIC tự truyền lại gói mất và kiểm soát tắc nghẽn, nhưng theo **từng stream**: gói mất của stream A không chặn stream B. Thêm nữa:

- **TLS 1.3 tích hợp**: bắt tay truyền tải và mã hoá gộp một, kết nối mới thường tốn 1 round trip, kết nối lại có thể 0-RTT.
- **Connection migration**: kết nối nhận diện bằng connection ID thay vì (IP, port), nên khi điện thoại chuyển Wi-Fi sang 4G có thể giữ kết nối.
- **Chạy ở user space**: dễ cập nhật, nhưng thường tốn CPU hơn TCP vốn được tối ưu trong kernel.

Lợi ích rõ nhất ở **mạng di động**: độ trễ cao, mất gói, đổi mạng liên tục. Trong data center, khác biệt thường nhỏ. Một số tường lửa chặn UDP nên client luôn cần **fallback** về HTTP/2; trình duyệt biết server hỗ trợ HTTP/3 qua header `Alt-Svc` hoặc bản ghi DNS kiểu HTTPS.

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Truyền tải | TCP | TCP | QUIC trên UDP |
| Song song | Nhiều kết nối | Multiplexing 1 kết nối | Multiplexing, stream độc lập |
| Head-of-line blocking | Tầng HTTP | Tầng TCP khi mất gói | Chỉ trong từng stream |
| Đổi mạng | Kết nối mới | Kết nối mới | Có thể giữ kết nối |

## Ảnh hưởng tới thiết kế

- **Tái sử dụng kết nối**: bật keep-alive, dùng connection pool giữa các service; với gọi nội bộ dày đặc, handshake có thể chiếm phần lớn latency.
- **Cân bằng tải**: HTTP/2 và gRPC giữ ít kết nối sống lâu, nên load balancer tầng 4 phân phối theo kết nối sẽ dồn tải vào vài backend. Cần load balancer tầng 7 hiểu HTTP/2 hoặc client-side load balancing (xem [API hiện đại](../../6-hien-dai/01-modern-api/)).
- **CDN và edge**: terminate TLS gần người dùng làm handshake đi quãng ngắn. CDN lớn thường hỗ trợ HTTP/3 với người dùng trong khi vẫn nói HTTP/1.1 hoặc HTTP/2 với origin, cách rẻ nhất để có HTTP/3.

**Khi nào dùng**: HTTPS luôn bật cho mọi thứ ra Internet. HTTP/2 là mặc định hợp lý cho web và API (gRPC bắt buộc dùng). HTTP/3 đáng bật khi có nhiều người dùng di động hoặc ở xa; ít giá trị cho lưu lượng nội bộ.

## Đánh đổi

- **TLS**: chi phí CPU nay nhỏ; cái đắt thật là round trip và vận hành chứng chỉ.
- **Terminate sớm hay mã hoá đầu cuối**: terminate ở biên dễ định tuyến, quan sát; đổi lại phải tin mạng nội bộ hoặc trả thêm chi phí mã hoá lại.
- **Một kết nối hay nhiều**: HTTP/2 tiết kiệm handshake nhưng gom rủi ro vào một kết nối và làm cân bằng tải khó hơn.
- **QUIC hay TCP**: QUIC tốt hơn trên mạng kém, nhưng tốn CPU hơn, khó quan sát hơn và có thể bị chặn UDP.

## Trong phỏng vấn

Khi vẽ kiến trúc, nói rõ TLS terminate ở đâu và nội bộ có mã hoá không. Khi bàn latency toàn cầu, nhắc tới round trip của handshake, TLS 1.3 và terminate ở edge. Câu hỏi hay gặp:

- "Gõ URL vào trình duyệt thì chuyện gì xảy ra?": [DNS](../../1-nen-tang/06-dns/), TCP hoặc QUIC, TLS, rồi HTTP.
- "Vì sao HTTP/2 vẫn bị head-of-line blocking?": vì TCP giao byte theo thứ tự.
- "gRPC qua load balancer có vấn đề gì?": kết nối sống lâu làm lệch tải nếu cân bằng ở tầng 4.

## Đọc thêm

- [RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [RFC 9114: HTTP/3](https://www.rfc-editor.org/rfc/rfc9114)
- [RFC 9000: QUIC](https://www.rfc-editor.org/rfc/rfc9000)
- [MDN: Evolution of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Evolution_of_HTTP)
