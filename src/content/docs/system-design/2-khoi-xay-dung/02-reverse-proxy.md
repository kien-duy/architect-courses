---
title: "Reverse Proxy (web server)"
description: "Reverse proxy là web server đứng trước các service nội bộ, tập trung xử lý request và trả kết quả."
lesson:
  group: "Các khối xây dựng"
  minutes: 7
quiz:
  - q: "Nhận định nào đúng?"
    options: ["Reverse proxy chỉ có ích khi có nhiều server", "Reverse proxy vẫn có ích khi chỉ có một server, ví dụ để SSL termination và cache", "Reverse proxy thay thế được database", "Reverse proxy luôn làm hệ thống chậm đi"]
    answer: 1
    why: "Reverse proxy mang lại bảo mật, cache, nén... kể cả với một server."
cards:
  - q: "Reverse proxy là gì?"
    a: "Một web server đứng trước các service nội bộ, cung cấp một giao diện thống nhất ra ngoài: nhận request của client, chuyển tới server phù hợp rồi trả response về client."
  - q: "Reverse proxy tăng bảo mật cho backend bằng cách nào?"
    a: "Ẩn thông tin về các server backend, chặn (blacklist) IP, và giới hạn số kết nối trên mỗi client."
  - q: "Vì sao reverse proxy giúp scale và đổi cấu hình backend dễ hơn?"
    a: "Client chỉ thấy IP của reverse proxy, nên có thể thêm bớt server hoặc thay đổi cấu hình phía sau mà client không bị ảnh hưởng."
  - q: "Ngoài bảo mật, reverse proxy còn đảm nhận những việc gì?"
    a: "SSL termination, nén response, cache response cho request lặp lại, và phục vụ trực tiếp nội dung tĩnh như HTML/CSS/JS, ảnh, video."
  - q: "Chỉ có một application server thì có cần load balancer hay reverse proxy?"
    a: "Load balancer hữu ích khi có nhiều server cùng chức năng. Reverse proxy vẫn có ích ngay cả với một server nhờ các lợi ích như SSL termination, cache, nén, file tĩnh."
  - q: "Nhược điểm của reverse proxy là gì?"
    a: "Tăng độ phức tạp. Một reverse proxy duy nhất là single point of failure; cấu hình nhiều cái để failover lại càng phức tạp thêm."
---

:::tip[Ý chính]
- Reverse proxy là web server đứng trước các service nội bộ, tập trung xử lý request và trả kết quả.
- Lợi ích: ẩn backend, SSL termination, nén, cache, phục vụ file tĩnh.
- Load balancer hữu ích khi có nhiều server; reverse proxy hữu ích ngay cả khi chỉ có một server.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Reverse proxy (web server)

<p align="center">
  <img src="../../../sd-images/n41Azff.png">
  <br/>
  <i><a href=https://upload.wikimedia.org/wikipedia/commons/6/67/Reverse_proxy_h2g2bob.svg>Source: Wikipedia</a></i>
  <br/>
</p>

A reverse proxy is a web server that centralizes internal services and provides unified interfaces to the public.  Requests from clients are forwarded to a server that can fulfill it before the reverse proxy returns the server's response to the client.

Additional benefits include:

* **Increased security** - Hide information about backend servers, blacklist IPs, limit number of connections per client
* **Increased scalability and flexibility** - Clients only see the reverse proxy's IP, allowing you to scale servers or change their configuration
* **SSL termination** - Decrypt incoming requests and encrypt server responses so backend servers do not have to perform these potentially expensive operations
    * Removes the need to install [X.509 certificates](https://en.wikipedia.org/wiki/X.509 "Bài Wikipedia về chuẩn X.509 cho chứng chỉ khóa công khai, nền tảng của TLS/HTTPS và chuỗi tin cậy chứng chỉ. Giúp hiểu cách bảo mật kết nối hoạt động.") on each server
* **Compression** - Compress server responses
* **Caching** - Return the response for cached requests
* **Static content** - Serve static content directly
    * HTML/CSS/JS
    * Photos
    * Videos
    * Etc

### Load balancer vs reverse proxy

* Deploying a load balancer is useful when you have multiple servers.  Often, load balancers  route traffic to a set of servers serving the same function.
* Reverse proxies can be useful even with just one web server or application server, opening up the benefits described in the previous section.
* Solutions such as NGINX and HAProxy can support both layer 7 reverse proxying and load balancing.

### Disadvantage(s): reverse proxy

* Introducing a reverse proxy results in increased complexity.
* A single reverse proxy is a single point of failure, configuring multiple reverse proxies (ie a [failover](https://en.wikipedia.org/wiki/Failover "Trang Wikipedia về failover: tự động chuyển sang hệ thống dự phòng khi hệ thống chính lỗi. Hiểu khái niệm redundancy và high availability.")) further increases complexity.

### Source(s) and further reading

* [Reverse proxy vs load balancer](https://www.nginx.com/resources/glossary/reverse-proxy-vs-load-balancer/ "Bài của NGINX giải thích reverse proxy là gì, vai trò cân bằng tải và bảo mật. Giúp phân biệt reverse proxy với load balancer.")
* [NGINX architecture](https://www.nginx.com/blog/inside-nginx-how-we-designed-for-performance-scale/ "Bài của NGINX giải thích kiến trúc hướng sự kiện, không chặn và dùng ít worker process giúp xử lý hàng chục nghìn kết nối. Nội dung trích xuất là trang chủ sản phẩm nên chưa chính xác.")
* [HAProxy architecture guide](http://www.haproxy.org/download/1.2/doc/architecture.txt "Tài liệu của tác giả HAProxy với các ví dụ cấu hình thực tế: cân bằng tải HTTP, cookie insertion, session persistence, tách tầng và HA. Học cách triển khai load balancer thực tế.")
* [Wikipedia](https://en.wikipedia.org/wiki/Reverse_proxy "Trang Wikipedia về reverse proxy: máy chủ đứng trước backend để chuyển request, cache, bảo mật và load balancing. Hiểu vai trò của nó trong kiến trúc web.")
