---
title: "Load Balancer"
description: "Load balancer phân phối request tới các server, chặn request tới server lỗi và tránh điểm lỗi đơn lẻ."
lesson:
  group: "Các khối xây dựng"
  minutes: 12
quiz:
  - q: "Muốn chuyển request /video tới cụm server video và /billing tới cụm thanh toán, cần load balancing ở tầng nào?"
    options: ["Layer 4", "Layer 7", "Layer 2", "Không cần load balancer"]
    answer: 1
    why: "Định tuyến theo URL cần đọc nội dung request, đó là việc của layer 7."
  - q: "Điều kiện quan trọng để scale ngang các web server là gì?"
    options: ["Mỗi server lưu session người dùng trong RAM", "Server stateless, dữ liệu phiên lưu ở nơi tập trung", "Mỗi server có database riêng", "Dùng một server thật mạnh"]
    answer: 1
    why: "Server stateless thì request nào cũng có thể đi tới server nào."
cards:
  - q: "Load balancer giúp hệ thống ở ba điểm chính nào?"
    a: "Không gửi request tới server lỗi (unhealthy), tránh quá tải một tài nguyên, và giúp loại bỏ điểm lỗi đơn lẻ (single point of failure)."
  - q: "SSL termination tại load balancer mang lại lợi ích gì?"
    a: "Load balancer giải mã request đến và mã hóa response, nên backend không phải làm việc tốn CPU này và không cần cài chứng chỉ X.509 trên từng server."
  - q: "Session persistence (sticky session) ở load balancer là gì?"
    a: "Load balancer phát cookie và luôn chuyển request của cùng một client tới cùng một instance, dùng khi web app không tự quản lý session."
  - q: "Layer 4 load balancer dựa vào thông tin gì để định tuyến?"
    a: "Thông tin tầng transport: IP nguồn, IP đích và port trong header, không đọc nội dung gói tin. Nó chuyển tiếp gói tin tới server upstream bằng NAT."
  - q: "Đánh đổi giữa load balancing layer 4 và layer 7?"
    a: "Layer 4 tốn ít thời gian và tài nguyên hơn nhưng kém linh hoạt. Layer 7 đọc nội dung request nên định tuyến thông minh hơn; trên phần cứng hiện đại chênh lệch hiệu năng thường nhỏ."
  - q: "Vì sao horizontal scaling thường được chuộng hơn vertical scaling?"
    a: "Scale ngang bằng nhiều máy phổ thông rẻ hơn và sẵn sàng cao hơn so với nâng cấp một server đắt tiền; cũng dễ tuyển người làm với phần cứng phổ thông hơn hệ thống enterprise chuyên dụng."
  - q: "Khi scale ngang web server, tầng phía sau gặp vấn đề gì?"
    a: "Các server downstream như cache và database phải chịu nhiều kết nối đồng thời hơn khi số server upstream tăng lên."
  - q: "Nhược điểm của bản thân load balancer là gì?"
    a: "Có thể thành nút cổ chai nếu thiếu tài nguyên hoặc cấu hình sai; thêm độ phức tạp; một load balancer duy nhất là single point of failure, còn chạy nhiều cái (active-passive/active-active) lại càng phức tạp."
---

:::tip[Ý chính]
- Load balancer phân phối request tới các server, chặn request tới server lỗi và tránh điểm lỗi đơn lẻ.
- Layer 4 dựa vào IP và port; layer 7 nhìn vào nội dung request như header, URL, cookie.
- Horizontal scaling rẻ và sẵn sàng cao hơn, nhưng server phải stateless; session nên nằm ở kho tập trung như Redis.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Load balancer

<p align="center">
  <img src="../../../sd-images/h81n9iK.png">
  <br/>
  <i><a href=http://horicky.blogspot.com/2010/10/scalable-system-design-patterns.html>Source: Scalable system design patterns</a></i>
</p>

Load balancers distribute incoming client requests to computing resources such as application servers and databases.  In each case, the load balancer returns the response from the computing resource to the appropriate client.  Load balancers are effective at:

* Preventing requests from going to unhealthy servers
* Preventing overloading resources
* Helping to eliminate a single point of failure

Load balancers can be implemented with hardware (expensive) or with software such as HAProxy.

Additional benefits include:

* **SSL termination** - Decrypt incoming requests and encrypt server responses so backend servers do not have to perform these potentially expensive operations
    * Removes the need to install [X.509 certificates](https://en.wikipedia.org/wiki/X.509 "Bài Wikipedia về chuẩn X.509 cho chứng chỉ khóa công khai, nền tảng của TLS/HTTPS và chuỗi tin cậy chứng chỉ. Giúp hiểu cách bảo mật kết nối hoạt động.") on each server
* **Session persistence** - Issue cookies and route a specific client's requests to same instance if the web apps do not keep track of sessions

To protect against failures, it's common to set up multiple load balancers, either in [active-passive](../../3-he-phan-tan/03-availability/#active-passive) or [active-active](../../3-he-phan-tan/03-availability/#active-active) mode.

Load balancers can route traffic based on various metrics, including:

* Random
* Least loaded
* Session/cookies
* [Round robin or weighted round robin](https://www.g33kinfo.com/info/round-robin-vs-weighted-round-robin-lb "Bài ngắn so sánh round robin và weighted round robin trong load balancing, cách phân phối request tới nhiều server. Dễ hiểu cho phần thuật toán cân bằng tải.")
* [Layer 4](#layer-4-load-balancing)
* [Layer 7](#layer-7-load-balancing)

### Layer 4 load balancing

Layer 4 load balancers look at info at the [transport layer](../../1-nen-tang/05-communication/) to decide how to distribute requests.  Generally, this involves the source, destination IP addresses, and ports in the header, but not the contents of the packet.  Layer 4 load balancers forward network packets to and from the upstream server, performing [Network Address Translation (NAT)](https://web.archive.org/web/20240117134735/https://www.nginx.com/resources/glossary/layer-4-load-balancing/ "Bài glossary của NGINX giải thích load balancing tầng 4 dựa trên thông tin mạng (IP, port), khác tầng 7 ra sao và vì sao quan trọng.").

### Layer 7 load balancing

Layer 7 load balancers look at the [application layer](../../1-nen-tang/05-communication/) to decide how to distribute requests.  This can involve contents of the header, message, and cookies.  Layer 7 load balancers terminate network traffic, reads the message, makes a load-balancing decision, then opens a connection to the selected server.  For example, a layer 7 load balancer can direct video traffic to servers that host videos while directing more sensitive user billing traffic to security-hardened servers.

At the cost of flexibility, layer 4 load balancing requires less time and computing resources than Layer 7, although the performance impact can be minimal on modern commodity hardware.

### Horizontal scaling

Load balancers can also help with horizontal scaling, improving performance and availability.  Scaling out using commodity machines is more cost efficient and results in higher availability than scaling up a single server on more expensive hardware, called **Vertical Scaling**.  It is also easier to hire for talent working on commodity hardware than it is for specialized enterprise systems.

#### Disadvantage(s): horizontal scaling

* Scaling horizontally introduces complexity and involves cloning servers
    * Servers should be stateless: they should not contain any user-related data like sessions or profile pictures
    * Sessions can be stored in a centralized data store such as a [database](../../2-khoi-xay-dung/04-sql/#database) (SQL, NoSQL) or a persistent [cache](../../2-khoi-xay-dung/06-cache/) (Redis, Memcached)
* Downstream servers such as caches and databases need to handle more simultaneous connections as upstream servers scale out

### Disadvantage(s): load balancer

* The load balancer can become a performance bottleneck if it does not have enough resources or if it is not configured properly.
* Introducing a load balancer to help eliminate a single point of failure results in increased complexity.
* A single load balancer is a single point of failure, configuring multiple load balancers further increases complexity.

### Source(s) and further reading

* [NGINX architecture](https://www.nginx.com/blog/inside-nginx-how-we-designed-for-performance-scale/ "Bài của NGINX giải thích kiến trúc hướng sự kiện, không chặn và dùng ít worker process giúp xử lý hàng chục nghìn kết nối. Nội dung trích xuất là trang chủ sản phẩm nên chưa chính xác.")
* [HAProxy architecture guide](http://www.haproxy.org/download/1.2/doc/architecture.txt "Tài liệu của tác giả HAProxy với các ví dụ cấu hình thực tế: cân bằng tải HTTP, cookie insertion, session persistence, tách tầng và HA. Học cách triển khai load balancer thực tế.")
* [Scalability](https://web.archive.org/web/20250307202838/https://web.archive.org/web/20220530193911/https://www.lecloud.net/post/7295452622/scalability-for-dummies-part-1-clones "Phần 1 loạt Scalability for Dummies, nói về clone: nhân bản server sau load balancer để scale ngang và giữ web server stateless. Nhập môn scale web app (bản archive).")
* [Wikipedia](https://en.wikipedia.org/wiki/Load_balancing_(computing))
* [Layer 4 load balancing](https://www.nginx.com/resources/glossary/layer-4-load-balancing/ "Mục glossary của NGINX về layer 4 load balancing, cân bằng tải ở tầng TCP/UDP. Hiểu khác biệt giữa L4 và L7.")
* [Layer 7 load balancing](https://www.nginx.com/resources/glossary/layer-7-load-balancing/ "Bài glossary của NGINX về load balancing tầng 7, định tuyến theo nội dung HTTP như URL, header, cookie. Hiện trang trả về trang chủ NGINX nên nội dung trích được không đúng.")
* [ELB listener config](http://docs.aws.amazon.com/elasticloadbalancing/latest/classic/elb-listener-config.html "Tài liệu AWS về cách cấu hình listener cho Classic Load Balancer: giao thức, cổng và cách load balancer nhận rồi chuyển tiếp request tới các instance phía sau.")
