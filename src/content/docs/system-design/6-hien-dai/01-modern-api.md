---
title: "API Gateway và các kiểu API: REST, GraphQL, gRPC"
description: "API gateway là điểm vào duy nhất, gánh các việc xuyên suốt như routing, xác thực, rate limit và gộp request, nhưng không nên chứa logic nghiệp vụ."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 9
quiz:
  - q: "Một ứng dụng mobile phải gọi 5 endpoint REST khác nhau để dựng màn hình chính, mạng di động chậm. Hướng cải thiện nào hợp lý nhất?"
    options: ["Chuyển toàn bộ sang WebSocket", "Thêm aggregation ở API gateway/BFF hoặc dùng GraphQL để lấy đủ dữ liệu trong một request", "Tăng số instance của load balancer", "Chuyển API công khai sang gRPC thuần để trình duyệt và app gọi trực tiếp"]
    answer: 1
    why: "Vấn đề là nhiều vòng mạng (under-fetching); gộp request ở gateway/BFF hoặc GraphQL giảm số round trip. Thêm load balancer không giảm số lời gọi."
  - q: "Vì sao GraphQL thường khó tận dụng cache HTTP/CDN hơn REST?"
    options: ["Vì GraphQL không chạy trên HTTP", "Vì GraphQL luôn trả dữ liệu nhị phân", "Vì query thường gửi bằng POST tới một endpoint duy nhất, URL không còn đại diện cho tài nguyên cụ thể", "Vì schema GraphQL cấm caching"]
    answer: 2
    why: "Cache HTTP dựa vào method GET và URL; khi mọi query đi qua một endpoint bằng POST, CDN không phân biệt được các response."
  - q: "Nhược điểm nào là rủi ro kiến trúc đáng lo nhất khi đặt API gateway?"
    options: ["Gateway trở thành điểm lỗi tập trung và dễ phình thành monolith nếu chứa logic nghiệp vụ", "Gateway khiến không thể dùng HTTPS", "Gateway bắt buộc mọi service dùng cùng ngôn ngữ", "Gateway không thể chạy nhiều instance"]
    answer: 0
    why: "Gateway nằm trên mọi đường đi nên phải chạy dư thừa, và cần giữ nó mỏng, chỉ lo việc xuyên suốt."
cards:
  - q: "Kể 4 việc điển hình một API gateway đảm nhận."
    a: "Routing tới service phù hợp, xác thực token/API key, rate limiting và quota, gộp nhiều lời gọi nội bộ thành một response (aggregation). Ngoài ra: TLS termination, logging, chuyển đổi giao thức."
  - q: "BFF (Backend for Frontend) là gì?"
    a: "Mỗi loại client (web, mobile) có một gateway riêng, trả dữ liệu đúng dạng client đó cần, tránh một gateway chung phình to và phục vụ kém mọi bên."
  - q: "Load balancer và API gateway khác nhau cốt lõi ở đâu?"
    a: "Load balancer chia tải cho nhiều bản sao của cùng một service, không quan tâm user. API gateway định tuyến tới nhiều service khác nhau và áp chính sách theo client như auth, quota."
  - q: "Over-fetching và under-fetching trong REST là gì?"
    a: "Over-fetching: endpoint trả thừa trường client không dùng. Under-fetching: một endpoint không đủ dữ liệu nên client phải gọi thêm nhiều endpoint khác."
  - q: "Vấn đề N+1 trong GraphQL là gì và xử lý thế nào?"
    a: "Resolver của trường lồng nhau chạy một truy vấn cho mỗi phần tử danh sách, tạo N+1 truy vấn. Thường xử lý bằng batching và cache theo request, kiểu DataLoader."
  - q: "Vì sao gRPC nhanh và gọn hơn REST/JSON?"
    a: "Dùng protobuf nhị phân nhỏ hơn JSON, chạy trên HTTP/2 cho phép multiplex nhiều lời gọi trên một kết nối, và hỗ trợ streaming hai chiều."
  - q: "Hạn chế chính của gRPC với trình duyệt là gì?"
    a: "Trình duyệt không gọi gRPC trực tiếp được; cần gRPC-Web và một proxy chuyển đổi, nên gRPC thường dùng cho giao tiếp giữa các service."
  - q: "Vì sao scale WebSocket khó hơn REST?"
    a: "Mỗi kết nối sống lâu và gắn với một server cụ thể, nên cần định tuyến message tới đúng server (thường qua pub/sub) và xử lý reconnect, heartbeat."
  - q: "Bên nhận webhook cần chú ý những gì?"
    a: "Xác minh chữ ký (ví dụ HMAC) để chắc nguồn gửi, xử lý `idempotent` vì bên gửi có thể retry, và trả lời nhanh rồi đẩy việc nặng vào hàng đợi."
---

:::tip[Ý chính]
- API gateway là điểm vào duy nhất, gánh các việc xuyên suốt như routing, xác thực, rate limit và gộp request, nhưng không nên chứa logic nghiệp vụ.
- Load balancer chia tải cho các bản sao giống nhau, reverse proxy là khái niệm chung, còn API gateway là reverse proxy hiểu API và áp chính sách theo client.
- REST hợp API công khai, GraphQL hợp client đa dạng, gRPC hợp giao tiếp nội bộ, WebSocket hợp realtime hai chiều, webhook để báo sự kiện cho bên ngoài.
:::

Khi hệ thống chỉ có một backend, client gọi thẳng vào nó là đủ. Nhưng khi tách thành hàng chục microservice, mỗi client (web, mobile, đối tác) sẽ phải biết địa chỉ của từng service, tự xử lý xác thực ở từng nơi, và gọi nhiều lượt mạng chỉ để dựng một màn hình. Logic chung như kiểm tra token, giới hạn tần suất (rate limit) hay ghi log bị lặp lại ở mọi service.

Bài này nói về hai câu hỏi đi cùng nhau: đặt gì ở "cửa ngõ" của hệ thống (API gateway), và client nói chuyện với service bằng kiểu API nào (REST, GraphQL, gRPC, WebSocket, webhook). Kiến thức nền về HTTP, TCP, RPC và REST đã có trong bài [Giao tiếp](../../1-nen-tang/05-communication/); ở đây ta tập trung vào cách chọn và đánh đổi.

## API gateway làm gì

API gateway là một lớp đứng giữa client và các service nội bộ, trở thành điểm vào duy nhất (single entry point) cho mọi request từ bên ngoài. Các việc thường gặp:

- **Routing**: dựa vào path, host, header hoặc version để chuyển request tới đúng service, ví dụ `/orders/*` tới order-service, `/users/*` tới user-service.
- **Xác thực (authentication)**: kiểm tra token hoặc API key một lần ở cửa, rồi chuyển thông tin danh tính (user id, scope) xuống service phía sau. Chi tiết về token xem bài [Xác thực và phân quyền](../../6-hien-dai/02-modern-auth/).
- **Rate limiting và quota**: chặn client gọi quá nhiều, bảo vệ backend khỏi quá tải hoặc lạm dụng.
- **Aggregation (gộp request)**: một request từ client được gateway tách thành nhiều lời gọi nội bộ rồi gộp kết quả, giảm số vòng mạng cho mobile.
- **Chuyển đổi giao thức**: nhận REST/JSON từ ngoài, gọi gRPC vào trong; hoặc đổi định dạng request/response.
- **Việc "xuyên suốt" khác**: TLS termination (giải mã HTTPS tại gateway), caching, nén, CORS, ghi log, gắn trace id cho [observability](../../6-hien-dai/09-modern-observability/), timeout và retry.

Sơ đồ dưới đây minh hoạ các bước một request đi qua gateway trước khi tới service.



<figure class="ccf-figure"><a href="../../guides/what-does-api-gateway-do/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0072-what-does-api-gateway-do.png" alt="What Does an API Gateway Do?" loading="lazy" /><figcaption><strong>What Does an API Gateway Do?</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



Một biến thể phổ biến là **BFF (Backend for Frontend)**: mỗi loại client có một gateway riêng (một cho web, một cho mobile) để mỗi bên nhận đúng dạng dữ liệu mình cần, thay vì một gateway chung phình to.

### Gateway, load balancer và reverse proxy khác nhau thế nào

Ba khái niệm này chồng lấn nhau, và trong thực tế một phần mềm (như Nginx, Envoy) có thể đóng cả ba vai trò.

| | Reverse proxy | Load balancer | API gateway |
|---|---|---|---|
| Mục tiêu chính | Đứng thay server, che giấu backend | Chia tải đều cho nhiều bản sao giống nhau | Quản lý API: định tuyến theo nghiệp vụ, chính sách |
| Lớp hoạt động | Thường L7 (HTTP) | L4 (TCP/UDP) hoặc L7 | L7, hiểu ngữ nghĩa API |
| Biết về user/API key? | Thường không | Không | Có: auth, quota theo client |
| Đích chuyển tới | Một hoặc vài server | Nhiều instance cùng một service | Nhiều service khác nhau |

Có thể hiểu: [reverse proxy](../../2-khoi-xay-dung/02-reverse-proxy/) là khái niệm chung; [load balancer](../../2-khoi-xay-dung/01-load-balancer/) là reverse proxy chuyên phân tải; API gateway là reverse proxy "hiểu API", thêm các chính sách theo client và theo endpoint. Kiến trúc hay gặp: load balancer ở biên → nhiều instance gateway → gateway gọi các service, và mỗi service lại có load balancing riêng (qua service discovery hoặc service mesh).



<figure class="ccf-figure"><a href="../../guides/reverse-proxy-vs-api-gateway-vs-load-balancer/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0320-reverse-gateway-lb.png" alt="Reverse Proxy vs. API Gateway vs. Load Balancer" loading="lazy" /><figcaption><strong>Reverse Proxy vs. API Gateway vs. Load Balancer</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



### Khi nào dùng, khi nào không

Nên dùng khi có nhiều service, nhiều loại client, hoặc cần mở API cho bên thứ ba với key và quota. Không cần (hoặc chưa cần) khi chỉ có một monolith, khi đó một reverse proxy và load balancer là đủ.

Đánh đổi:
- **Thêm một hop mạng** nên tăng [latency](../../1-nen-tang/03-latency/), dù thường nhỏ.
- **Điểm lỗi tập trung**: gateway sập là cả hệ thống sập, nên phải chạy nhiều instance, stateless, phía sau load balancer.
- **Nguy cơ thành "monolith mới"**: nếu nhét logic nghiệp vụ vào gateway, mọi team phải sửa chung một chỗ. Nguyên tắc: gateway lo việc xuyên suốt, không lo nghiệp vụ.

## Các kiểu API

### REST

Mô hình hoá dữ liệu thành tài nguyên (resource) có URL, thao tác bằng các method HTTP, thường trả JSON. Ưu điểm lớn nhất là đơn giản và phổ biến: mọi ngôn ngữ, trình duyệt, công cụ đều hỗ trợ, và tận dụng tốt [cache](../../2-khoi-xay-dung/06-cache/) HTTP và [CDN](../../1-nen-tang/07-cdn/) cho request GET. Nhược điểm: client hay bị **over-fetching** (nhận thừa trường) hoặc **under-fetching** (phải gọi nhiều endpoint để đủ dữ liệu), và hợp đồng API thường chỉ được mô tả ngoài (ví dụ OpenAPI) chứ không bắt buộc.

### GraphQL

Server công bố một **schema** có kiểu dữ liệu; client gửi một query (thường qua một endpoint duy nhất, method POST) mô tả chính xác các trường cần lấy, kể cả dữ liệu lồng nhau. Server dùng các hàm **resolver** để lấy từng trường từ DB hoặc service khác.

- Hợp khi: nhiều loại client cần dạng dữ liệu khác nhau, màn hình gộp dữ liệu từ nhiều nguồn, team frontend muốn tự chủ.
- Đánh đổi: khó dùng cache HTTP vì mọi thứ đi qua một endpoint; dễ gặp **N+1 query** ở resolver (thường giải bằng batching kiểu DataLoader); query lồng sâu có thể rất tốn tài nguyên nên cần giới hạn độ sâu và độ phức tạp; rate limit theo "số request" không còn phản ánh đúng chi phí.

### gRPC

Framework RPC dùng **Protocol Buffers** (protobuf) để định nghĩa service và message trong file `.proto`, sinh code client/server cho nhiều ngôn ngữ, và chạy trên HTTP/2. Dữ liệu được mã hoá nhị phân nên gọn và nhanh hơn JSON; HTTP/2 cho phép nhiều lời gọi song song trên một kết nối và hỗ trợ **streaming** bốn kiểu: unary, server streaming, client streaming và bidirectional streaming. Xem thêm về HTTP/2 ở bài [HTTP hiện đại](../../6-hien-dai/03-modern-http/).



<figure class="ccf-figure"><a href="../../guides/how-does-grpc-work/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0210-grpc.png" alt="How does gRPC work?" loading="lazy" /><figcaption><strong>How does gRPC work?</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



- Hợp khi: giao tiếp nội bộ giữa các microservice, cần hiệu năng và hợp đồng chặt chẽ có kiểu.
- Đánh đổi: trình duyệt không gọi gRPC trực tiếp được (cần gRPC-Web và một proxy), payload nhị phân khó đọc khi debug, và một số load balancer L4 phân tải kém vì kết nối HTTP/2 sống lâu (cần load balancer L7 hoặc phân tải phía client).

### WebSocket

Bắt đầu bằng một request HTTP với yêu cầu "upgrade", sau đó giữ một kết nối TCP **hai chiều, sống lâu**; cả client và server đều có thể gửi message bất cứ lúc nào. Hợp với chat, game nhiều người chơi, bảng giá realtime, cộng tác tài liệu.

Đánh đổi: server phải giữ trạng thái kết nối, nên scale khó hơn request/response (cần sticky connection hoặc một lớp pub/sub để gửi message tới đúng server đang giữ kết nối của user); cần tự xử lý reconnect và heartbeat. Nếu chỉ cần server đẩy một chiều, SSE (Server-Sent Events) đơn giản hơn; so sánh chi tiết ở bài [streaming](../../6-hien-dai/04-modern-streaming/).

### Webhook

Đảo chiều so với polling: thay vì client hỏi liên tục "có gì mới chưa", **server gọi HTTP POST tới URL do client đăng ký** khi có sự kiện (thanh toán thành công, có commit mới). Cần lưu ý: phải ký request (ví dụ HMAC) để bên nhận xác minh nguồn gửi; bên gửi thường retry khi thất bại, nên bên nhận phải xử lý trùng lặp một cách [idempotent](../../6-hien-dai/06-modern-idempotency/); và endpoint nhận phải trả lời nhanh, đẩy việc nặng sang [hàng đợi bất đồng bộ](../../2-khoi-xay-dung/07-async/).

### Bảng so sánh

| | REST | GraphQL | gRPC | WebSocket |
|---|---|---|---|---|
| Mô hình | Tài nguyên + HTTP method | Query theo schema | Gọi hàm từ xa | Kênh message hai chiều |
| Định dạng | Thường JSON | JSON | Protobuf nhị phân | Tự chọn (text/binary) |
| Hợp đồng | Tuỳ chọn (OpenAPI) | Schema bắt buộc | `.proto` bắt buộc | Tự định nghĩa |
| Cache HTTP | Tốt | Khó | Gần như không | Không áp dụng |
| Trình duyệt | Tự nhiên | Tự nhiên | Cần gRPC-Web | Tự nhiên |
| Chỗ hợp nhất | API công khai, CRUD | Client đa dạng, dữ liệu lồng | Service-to-service | Realtime hai chiều |



<figure class="ccf-figure"><a href="../../guides/a-cheatsheet-on-comparing-api-architectural-styles/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0092-cheatsheet-on-comparing-api-architectural-styles.png" alt="A Cheatsheet on Comparing API Architectural Styles" loading="lazy" /><figcaption><strong>A Cheatsheet on Comparing API Architectural Styles</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



Một kiến trúc hay gặp kết hợp nhiều kiểu: client gọi REST hoặc GraphQL vào gateway, gateway và các service nói chuyện với nhau bằng gRPC, sự kiện realtime đi qua WebSocket, còn tích hợp với đối tác bên ngoài dùng webhook.

## Trong phỏng vấn

- Khi vẽ kiến trúc microservice, đặt API gateway ở biên và nói rõ nó gánh việc gì (auth, rate limit, routing), đồng thời nhắc nó cần nhiều instance để tránh điểm lỗi tập trung.
- Khi định nghĩa API, nói luôn lý do chọn kiểu: "API công khai dùng REST vì dễ dùng và cache được; nội bộ dùng gRPC vì hiệu năng và hợp đồng có kiểu; tính năng chat dùng WebSocket."
- Câu hỏi hay gặp: "API gateway khác load balancer thế nào?", "Khi nào GraphQL không phải lựa chọn tốt?", "Làm sao scale một triệu kết nối WebSocket?", "Làm sao đảm bảo webhook không bị xử lý hai lần?".
- Dấu hiệu tốt: không chọn công nghệ vì "mới", mà gắn với đặc điểm client, tải và yêu cầu latency.

## Đọc thêm

- [Pattern: API Gateway / Backends for Frontends - microservices.io](https://microservices.io/patterns/apigateway.html)
- [Introduction to gRPC - tài liệu chính thức](https://grpc.io/docs/what-is-grpc/introduction/)
- [Learn GraphQL - graphql.org](https://graphql.org/learn/)
- [RFC 6455 - The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
