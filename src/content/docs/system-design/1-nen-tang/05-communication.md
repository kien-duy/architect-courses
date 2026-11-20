---
title: "Giao tiếp: HTTP, TCP, UDP, RPC, REST"
description: "HTTP là giao thức request/response giữa client và server, chạy trên các giao thức tầng dưới như TCP."
lesson:
  group: "Nền tảng"
  minutes: 20
quiz:
  - q: "Ứng dụng gọi video thời gian thực nên ưu tiên giao thức nào?"
    options: ["TCP vì đảm bảo không mất dữ liệu", "UDP vì độ trễ thấp, mất vài khung hình vẫn chấp nhận được", "SMTP", "FTP"]
    answer: 1
    why: "Với dữ liệu thời gian thực, đến muộn còn tệ hơn mất gói. UDP phù hợp hơn."
  - q: "Đặc điểm nào thuộc về REST?"
    options: ["Gọi hàm như thể hàm chạy cục bộ", "Tài nguyên được định danh bằng URI và thao tác qua các động từ HTTP", "Bắt buộc dùng Protobuf", "Client và server phải dùng chung thư viện"]
    answer: 1
    why: "REST dựa trên URI cho tài nguyên và các động từ GET, POST, PUT, DELETE."
cards:
  - q: "HTTP hoạt động theo mô hình nào và vì sao dễ đi qua proxy, load balancer?"
    a: "HTTP là giao thức request/response ở tầng application, chạy trên TCP/UDP. Mỗi request/response tự chứa đủ thông tin nên có thể đi qua router, server trung gian làm load balancing, caching, mã hoá, nén."
  - q: "Trong các HTTP verb GET, POST, PUT, PATCH, DELETE, verb nào idempotent?"
    a: "GET, PUT và DELETE idempotent (gọi nhiều lần cho cùng kết quả). POST và PATCH thì không. Chỉ GET là safe."
  - q: "TCP đảm bảo gói tin đến đủ, đúng thứ tự bằng cách nào?"
    a: "Dùng handshake để mở/đóng kết nối, sequence number và checksum cho mỗi gói, ACK và tự động gửi lại; nhiều lần timeout thì ngắt kết nối. Có thêm flow control và congestion control."
  - q: "Cái giá của việc giữ nhiều kết nối TCP mở là gì và cách giảm?"
    a: "Tốn nhiều memory, nhất là giữa thread web server với memcached. Có thể dùng connection pooling, hoặc chuyển sang UDP khi phù hợp."
  - q: "Khi nào chọn TCP thay vì UDP?"
    a: "Khi cần mọi dữ liệu đến nguyên vẹn và muốn tự động tận dụng tốt throughput mạng. Hợp với web server, database, SMTP, FTP, SSH: cần tin cậy, ít gấp về thời gian."
  - q: "Khi nào chọn UDP thay vì TCP?"
    a: "Khi cần latency thấp nhất, dữ liệu đến muộn còn tệ hơn mất dữ liệu, hoặc muốn tự xử lý sửa lỗi. Ví dụ VoIP, video chat, streaming, game nhiều người chơi."
  - q: "RPC tập trung vào điều gì và thường dùng khi nào?"
    a: "RPC phơi ra hành vi (hành động), gọi hàm từ xa như gọi hàm cục bộ. Hay dùng cho giao tiếp nội bộ vì lý do performance, có thể tinh chỉnh lời gọi cho đúng use case."
  - q: "Nhược điểm của RPC?"
    a: "Client gắn chặt với implementation của service, mỗi thao tác mới cần API mới, khó debug, và khó tận dụng hạ tầng có sẵn như cache server."
  - q: "Nhược điểm chính của REST?"
    a: "Khó biểu diễn tài nguyên không theo cấu trúc phân cấp đơn giản, ít verb nên đôi khi không khớp use case, tài nguyên lồng nhau cần nhiều round trip (tệ cho mobile), và response phình to theo thời gian."
  - q: "Vì sao REST thích hợp cho public API và horizontal scaling?"
    a: "REST phơi ra dữ liệu qua URI và verb chuẩn, giảm coupling giữa client và server. Vì stateless nên REST rất hợp cho horizontal scaling và partitioning."
---

:::tip[Ý chính]
- HTTP là giao thức request/response giữa client và server, chạy trên các giao thức tầng dưới như TCP.
- TCP có kết nối, đảm bảo thứ tự và độ tin cậy; UDP không kết nối, nhanh hơn nhưng có thể mất gói. UDP hợp với video call, game, VoIP.
- RPC gọi hàm từ xa, tập trung vào hành động; REST xoay quanh tài nguyên và các động từ HTTP, giữ client và server tách biệt.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Communication

<p align="center">
  <img src="../../../sd-images/5KeocQs.jpg">
  <br/>
  <i><a href=http://www.escotal.com/osilayer.html>Source: OSI 7 layer model</a></i>
</p>

### Hypertext transfer protocol (HTTP)

HTTP is a method for encoding and transporting data between a client and a server.  It is a request/response protocol: clients issue requests and servers issue responses with relevant content and completion status info about the request.  HTTP is self-contained, allowing requests and responses to flow through many intermediate routers and servers that perform load balancing, caching, encryption, and compression.

A basic HTTP request consists of a verb (method) and a resource (endpoint).  Below are common HTTP verbs:

| Verb | Description | Idempotent* | Safe | Cacheable |
|---|---|---|---|---|
| GET | Reads a resource | Yes | Yes | Yes |
| POST | Creates a resource or trigger a process that handles data | No | No | Yes if response contains freshness info |
| PUT | Creates or replace a resource | Yes | No | No |
| PATCH | Partially updates a resource | No | No | Yes if response contains freshness info |
| DELETE | Deletes a resource | Yes | No | No |

*Can be called many times without different outcomes.

HTTP is an application layer protocol relying on lower-level protocols such as **TCP** and **UDP**.

#### Source(s) and further reading: HTTP

* [What is HTTP?](https://www.nginx.com/resources/glossary/http/ "Mục thuật ngữ của NGINX giải thích giao thức HTTP, cầu nối giữa mạng và phát triển ứng dụng, cơ chế request/response.")
* [Difference between HTTP and TCP](https://www.quora.com/What-is-the-difference-between-HTTP-protocol-and-TCP-protocol "Câu hỏi Quora phân biệt HTTP (tầng ứng dụng) và TCP (tầng giao vận). Trang yêu cầu đăng nhập nên chưa đọc được nội dung.")
* [Difference between PUT and PATCH](https://laracasts.com/discuss/channels/general-discussion/whats-the-differences-between-put-and-patch?page=1 "Thảo luận trên Laracasts về khác biệt giữa PUT và PATCH trong REST: thay thế toàn bộ so với cập nhật một phần. Giúp chọn phương thức khi thiết kế API.")

### Transmission control protocol (TCP)

<p align="center">
  <img src="../../../sd-images/JdAsdvG.jpg">
  <br/>
  <i><a href=http://www.wildbunny.co.uk/blog/2012/10/09/how-to-make-a-multi-player-game-part-1/>Source: How to make a multiplayer game</a></i>
</p>

TCP is a connection-oriented protocol over an [IP network](https://en.wikipedia.org/wiki/Internet_Protocol "Bài Wikipedia về Internet Protocol, giao thức tầng mạng chuyển datagram giữa các mạng và định tuyến gói tin, gồm IPv4 và IPv6. Nền tảng để hiểu giao tiếp mạng.").  Connection is established and terminated using a [handshake](https://en.wikipedia.org/wiki/Handshaking "Trang Wikipedia này nói về cái bắt tay giữa con người, không phải handshake trong mạng máy tính nên không liên quan đến system design.").  All packets sent are guaranteed to reach the destination in the original order and without corruption through:

* Sequence numbers and [checksum fields](https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Checksum_computation "Bài Wikipedia về giao thức TCP: handshake, đánh số thứ tự, kiểm soát luồng và tắc nghẽn, checksum. Tài liệu tham khảo chi tiết về giao thức transport đáng tin cậy.") for each packet
* [Acknowledgement](https://en.wikipedia.org/wiki/Acknowledgement_(data_networks)) packets and automatic retransmission

If the sender does not receive a correct response, it will resend the packets.  If there are multiple timeouts, the connection is dropped.  TCP also implements [flow control](https://en.wikipedia.org/wiki/Flow_control_(data)) and [congestion control](https://en.wikipedia.org/wiki/Network_congestion#Congestion_control "Bài Wikipedia về network congestion và các cơ chế congestion control, nguyên nhân gây mất gói và độ trễ. Bổ trợ kiến thức mạng cho thiết kế hệ thống.").  These guarantees cause delays and generally result in less efficient transmission than UDP.

To ensure high throughput, web servers can keep a large number of TCP connections open, resulting in high memory usage.  It can be expensive to have a large number of open connections between web server threads and say, a [memcached](https://memcached.org/ "Trang chủ Memcached, hệ thống cache đối tượng phân tán lưu key-value trong bộ nhớ để giảm tải database cho ứng dụng web. Điểm khởi đầu để tìm hiểu cache phân tán.") server.  [Connection pooling](https://en.wikipedia.org/wiki/Connection_pool "Bài Wikipedia về connection pool: bộ nhớ đệm các kết nối database tái sử dụng để giảm chi phí mở/đóng kết nối. Hiểu cách tăng hiệu năng tầng database.") can help in addition to switching to UDP where applicable.

TCP is useful for applications that require high reliability but are less time critical.  Some examples include web servers, database info, SMTP, FTP, and SSH.

Use TCP over UDP when:

* You need all of the data to arrive intact
* You want to automatically make a best estimate use of the network throughput

### User datagram protocol (UDP)

<p align="center">
  <img src="../../../sd-images/yzDrJtA.jpg">
  <br/>
  <i><a href=http://www.wildbunny.co.uk/blog/2012/10/09/how-to-make-a-multi-player-game-part-1/>Source: How to make a multiplayer game</a></i>
</p>

UDP is connectionless.  Datagrams (analogous to packets) are guaranteed only at the datagram level.  Datagrams might reach their destination out of order or not at all.  UDP does not support congestion control.  Without the guarantees that TCP support, UDP is generally more efficient.

UDP can broadcast, sending datagrams to all devices on the subnet.  This is useful with [DHCP](https://en.wikipedia.org/wiki/Dynamic_Host_Configuration_Protocol "Bài Wikipedia về DHCP, giao thức tự cấp phát địa chỉ IP và cấu hình mạng cho thiết bị. Kiến thức mạng nền tảng cho phần tìm hiểu cách hệ thống kết nối.") because the client has not yet received an IP address, thus preventing a way for TCP to stream without the IP address.

UDP is less reliable but works well in real time use cases such as VoIP, video chat, streaming, and realtime multiplayer games.

Use UDP over TCP when:

* You need the lowest latency
* Late data is worse than loss of data
* You want to implement your own error correction

#### Source(s) and further reading: TCP and UDP

* [Networking for game programming](https://gafferongames.com/post/udp_vs_tcp/ "Bài của Glenn Fiedler giải thích vì sao game thời gian thực nên dùng UDP thay vì TCP, nêu rõ vấn đề head-of-line blocking. Giúp chọn transport đúng.")
* [Key differences between TCP and UDP protocols](http://www.cyberciti.biz/faq/key-differences-between-tcp-and-udp-protocols/ "Bài FAQ so sánh TCP và UDP: hướng kết nối, độ tin cậy, thứ tự gói tin và tốc độ. Giúp chọn giao thức phù hợp cho từng loại ứng dụng.")
* [Difference between TCP and UDP](https://web.archive.org/web/20260228062715/https://stackoverflow.com/questions/5970383/difference-between-tcp-and-udp "Câu hỏi Stack Overflow nổi tiếng so sánh TCP và UDP: độ tin cậy, thứ tự, overhead và trường hợp sử dụng. Nắm nhanh khi chọn giao thức tầng transport.")
* [Transmission control protocol](https://en.wikipedia.org/wiki/Transmission_Control_Protocol "Bài Wikipedia về TCP: bắt tay ba bước, truyền tin cậy, đánh số thứ tự, flow control và congestion control. Nền tảng mạng cần có khi thiết kế hệ thống phân tán.")
* [User datagram protocol](https://en.wikipedia.org/wiki/User_Datagram_Protocol "Bài Wikipedia về UDP: giao thức không kết nối, không đảm bảo thứ tự và độ tin cậy nhưng độ trễ thấp. Dùng để so sánh với TCP.")
* [Scaling memcache at Facebook](http://www.cs.bu.edu/~jappavoo/jappavoo.github.com/451/papers/memcache-fb.pdf "Bài báo NSDI 2013 của Facebook mô tả cách mở rộng memcached thành hệ thống cache phân tán xử lý hàng tỷ request: replication, lease, gutter và nhiều region. Bắt buộc đọc về caching quy mô lớn.")

### Remote procedure call (RPC)

<p align="center">
  <img src="../../../sd-images/iF4Mkb5.png">
  <br/>
  <i><a href=http://www.puncsky.com/blog/2016-02-13-crack-the-system-design-interview>Source: Crack the system design interview</a></i>
</p>

In an RPC, a client causes a procedure to execute on a different address space, usually a remote server.  The procedure is coded as if it were a local procedure call, abstracting away the details of how to communicate with the server from the client program.  Remote calls are usually slower and less reliable than local calls so it is helpful to distinguish RPC calls from local calls.  Popular RPC frameworks include [Protobuf](https://developers.google.com/protocol-buffers/ "Tài liệu chính thức Protocol Buffers của Google, cơ chế serialize dữ liệu có cấu trúc nhỏ gọn, nhanh, độc lập ngôn ngữ; nền tảng của gRPC."), [Thrift](https://thrift.apache.org/ "Trang chủ Apache Thrift, framework RPC và sinh code để xây service đa ngôn ngữ. Giúp hiểu cách serialize và gọi RPC giữa các service."), and [Avro](https://avro.apache.org/docs/current/ "Tài liệu Apache Avro, framework serialization dữ liệu theo schema, dùng nhiều trong Hadoop và Kafka. Học cách định nghĩa schema và tiến hóa dữ liệu.").

RPC is a request-response protocol:

* **Client program** - Calls the client stub procedure.  The parameters are pushed onto the stack like a local procedure call.
* **Client stub procedure** - Marshals (packs) procedure id and arguments into a request message.
* **Client communication module** - OS sends the message from the client to the server.
* **Server communication module** - OS passes the incoming packets to the server stub procedure.
* **Server stub procedure** -  Unmarshalls the results, calls the server procedure matching the procedure id and passes the given arguments.
* The server response repeats the steps above in reverse order.

Sample RPC calls:

```
GET /someoperation?data=anId

POST /anotheroperation
{
  "data":"anId";
  "anotherdata": "another value"
}
```

RPC is focused on exposing behaviors.  RPCs are often used for performance reasons with internal communications, as you can hand-craft native calls to better fit your use cases.

Choose a native library (aka SDK) when:

* You know your target platform.
* You want to control how your "logic" is accessed.
* You want to control how error control happens off your library.
* Performance and end user experience is your primary concern.

HTTP APIs following **REST** tend to be used more often for public APIs.

#### Disadvantage(s): RPC

* RPC clients become tightly coupled to the service implementation.
* A new API must be defined for every new operation or use case.
* It can be difficult to debug RPC.
* You might not be able to leverage existing technologies out of the box.  For example, it might require additional effort to ensure [RPC calls are properly cached](https://web.archive.org/web/20250307201610/https://web.archive.org/web/20170608193645/http://etherealbits.com/2012/12/debunking-the-myths-of-rpc-rest/ "Bản lưu của bài Debunking the Myths of RPC and REST, so sánh hai phong cách API và bác bỏ các ngộ nhận phổ biến.") on caching servers such as [Squid](http://www.squid-cache.org/ "Trang chủ Squid, caching proxy cho web hỗ trợ HTTP/HTTPS/FTP, giảm băng thông và cải thiện thời gian phản hồi. Ví dụ điển hình về proxy cache và reverse proxy.").

### Representational state transfer (REST)

REST is an architectural style enforcing a client/server model where the client acts on a set of resources managed by the server.  The server provides a representation of resources and actions that can either manipulate or get a new representation of resources.  All communication must be stateless and cacheable.

There are four qualities of a RESTful interface:

* **Identify resources (URI in HTTP)** - use the same URI regardless of any operation.
* **Change with representations (Verbs in HTTP)** - use verbs, headers, and body.
* **Self-descriptive error message (status response in HTTP)** - Use status codes, don't reinvent the wheel.
* **[HATEOAS](https://web.archive.org/web/20260820115227/https://www.restcookbook.com/Basics/hateoas/ "Bài giải thích HATEOAS, ràng buộc của REST trong đó response chứa liên kết để client tự khám phá các hành động tiếp theo của API.") (HTML interface for HTTP)** - your web service should be fully accessible in a browser.

Sample REST calls:

```
GET /someresources/anId

PUT /someresources/anId
{"anotherdata": "another value"}
```

REST is focused on exposing data.  It minimizes the coupling between client/server and is often used for public HTTP APIs.  REST uses a more generic and uniform method of exposing resources through URIs, [representation through headers](https://github.com/for-GET/know-your-http-well/blob/master/headers.md "Trang GitHub liệt kê HTTP headers kèm mô tả ngắn và liên kết tới đặc tả. Tra cứu nhanh khi thiết kế API và caching."), and actions through verbs such as GET, POST, PUT, DELETE, and PATCH.  Being stateless, REST is great for horizontal scaling and partitioning.

#### Disadvantage(s): REST

* With REST being focused on exposing data, it might not be a good fit if resources are not naturally organized or accessed in a simple hierarchy.  For example, returning all updated records from the past hour matching a particular set of events is not easily expressed as a path.  With REST, it is likely to be implemented with a combination of URI path, query parameters, and possibly the request body.
* REST typically relies on a few verbs (GET, POST, PUT, DELETE, and PATCH) which sometimes doesn't fit your use case.  For example, moving expired documents to the archive folder might not cleanly fit within these verbs.
* Fetching complicated resources with nested hierarchies requires multiple round trips between the client and server to render single views, e.g. fetching content of a blog entry and the comments on that entry. For mobile applications operating in variable network conditions, these multiple roundtrips are highly undesirable.
* Over time, more fields might be added to an API response and older clients will receive all new data fields, even those that they do not need, as a result, it bloats the payload size and leads to larger latencies.

### RPC and REST calls comparison

| Operation | RPC | REST |
|---|---|---|
| Signup    | **POST** /signup | **POST** /persons |
| Resign    | **POST** /resign<br/>{<br/>"personid": "1234"<br/>} | **DELETE** /persons/1234 |
| Read a person | **GET** /readPerson?personid=1234 | **GET** /persons/1234 |
| Read a person’s items list | **GET** /readUsersItemsList?personid=1234 | **GET** /persons/1234/items |
| Add an item to a person’s items | **POST** /addItemToUsersItemsList<br/>{<br/>"personid": "1234";<br/>"itemid": "456"<br/>} | **POST** /persons/1234/items<br/>{<br/>"itemid": "456"<br/>} |
| Update an item    | **POST** /modifyItem<br/>{<br/>"itemid": "456";<br/>"key": "value"<br/>} | **PUT** /items/456<br/>{<br/>"key": "value"<br/>} |
| Delete an item | **POST** /removeItem<br/>{<br/>"itemid": "456"<br/>} | **DELETE** /items/456 |

<p align="center">
  <i><a href=https://apihandyman.io/do-you-really-know-why-you-prefer-rest-over-rpc/>Source: Do you really know why you prefer REST over RPC</a></i>
</p>

#### Source(s) and further reading: REST and RPC

* [Do you really know why you prefer REST over RPC](https://apihandyman.io/do-you-really-know-why-you-prefer-rest-over-rpc/ "Bài của Arnaud Lauret phân tích sâu tranh luận REST và RPC, chỉ ra các lý do thật sự khi chọn kiểu API. Hữu ích khi thiết kế giao tiếp giữa các service.")
* [When are RPC-ish approaches more appropriate than REST?](http://programmers.stackexchange.com/a/181186 "Câu trả lời trên Programmers StackExchange về một chủ đề thiết kế phần mềm; không đọc được nội dung nên chưa xác định chính xác nội dung.")
* [REST vs JSON-RPC](https://web.archive.org/web/20260222045708/https://stackoverflow.com/questions/15056878/rest-vs-json-rpc "Thảo luận trên Stack Overflow so sánh REST với JSON-RPC: khác biệt về tư duy tài nguyên so với gọi hàm, ưu nhược điểm của từng kiểu. Giúp chọn kiểu giao tiếp API phù hợp.")
* [Debunking the myths of RPC and REST](https://web.archive.org/web/20250307201610/https://web.archive.org/web/20170608193645/http://etherealbits.com/2012/12/debunking-the-myths-of-rpc-rest/ "Bản lưu của bài Debunking the Myths of RPC and REST, so sánh hai phong cách API và bác bỏ các ngộ nhận phổ biến.")
* [What are the drawbacks of using REST](https://www.quora.com/What-are-the-drawbacks-of-using-RESTful-APIs "Câu hỏi Quora về nhược điểm của REST API, như over-fetching và nhiều round trip. Giúp cân nhắc REST với các kiểu RPC.")
* [Crack the system design interview](http://www.puncsky.com/blog/2016-02-13-crack-the-system-design-interview "Hướng dẫn tiếp cận phỏng vấn system design: các bước phân tích yêu cầu, ước lượng và đưa ra quyết định thiết kế để thể hiện năng lực kỹ thuật.")
* [Thrift](https://code.facebook.com/posts/1468950976659943/)
* [Why REST for internal use and not RPC](https://web.archive.org/web/20221030091901/https://arstechnica.com/civis/viewtopic.php?t=1190508 "Thảo luận trên diễn đàn Ars Technica về việc vì sao nhiều team dùng REST cho giao tiếp nội bộ thay vì RPC. Giúp bạn thấy các lập luận đánh đổi giữa REST và RPC.")
