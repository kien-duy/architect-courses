---
title: "Application layer & Microservices"
description: "Tách web layer khỏi application layer để scale và cấu hình từng tầng độc lập."
lesson:
  group: "Các khối xây dựng"
  minutes: 7
quiz:
  - q: "Nhược điểm chính của kiến trúc microservices là gì?"
    options: ["Không thể scale", "Phức tạp hơn về triển khai và vận hành", "Không dùng được HTTP", "Bắt buộc dùng một database"]
    answer: 1
    why: "Microservices tăng độ phức tạp kiến trúc và vận hành."
cards:
  - q: "Tách web layer khỏi application layer (platform layer) được lợi gì?"
    a: "Scale và cấu hình hai tầng độc lập. Ví dụ thêm API mới chỉ cần thêm application server mà không nhất thiết thêm web server."
  - q: "Single responsibility principle gợi ý gì về cách tổ chức service?"
    a: "Nên có các service nhỏ, tự chủ, phối hợp với nhau. Team nhỏ với service nhỏ có thể lên kế hoạch tăng trưởng nhanh mạnh mẽ hơn."
  - q: "Microservices được định nghĩa thế nào?"
    a: "Một tập các service nhỏ, module hóa, triển khai độc lập. Mỗi service chạy một process riêng và giao tiếp qua cơ chế nhẹ, rõ ràng để phục vụ một mục tiêu nghiệp vụ."
  - q: "Service discovery giải quyết vấn đề gì?"
    a: "Giúp các service tìm thấy nhau bằng cách theo dõi tên, địa chỉ và port đã đăng ký. Ví dụ: Consul, Etcd, Zookeeper."
  - q: "Service discovery kiểm tra một service còn hoạt động bằng cách nào?"
    a: "Dùng health check, thường qua một HTTP endpoint, để xác minh service vẫn khỏe."
  - q: "Ngoài tìm service, Consul và Etcd còn hữu ích để làm gì?"
    a: "Cả hai có sẵn key-value store, tiện để lưu giá trị cấu hình và dữ liệu dùng chung giữa các service."
---

:::tip[Ý chính]
- Tách web layer khỏi application layer để scale và cấu hình từng tầng độc lập.
- Microservices: tập hợp các service nhỏ, triển khai độc lập, mỗi service một việc.
- Service discovery (Consul, Etcd, Zookeeper) giúp các service tìm thấy nhau.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Application layer

<p align="center">
  <img src="../../../sd-images/yB5SYwm.png">
  <br/>
  <i><a href=http://lethain.com/introduction-to-architecting-systems-for-scale/#platform_layer>Source: Intro to architecting systems for scale</a></i>
</p>

Separating out the web layer from the application layer (also known as platform layer) allows you to scale and configure both layers independently.  Adding a new API results in adding application servers without necessarily adding additional web servers.  The **single responsibility principle** advocates for small and autonomous services that work together.  Small teams with small services can plan more aggressively for rapid growth.

Workers in the application layer also help enable [asynchronism](../../2-khoi-xay-dung/07-async/#asynchronism).

### Microservices

Related to this discussion are [microservices](https://en.wikipedia.org/wiki/Microservices "Trang Wikipedia về kiến trúc microservices: các service nhỏ, lỏng lẻo, triển khai độc lập, cùng ưu và nhược điểm. Cái nhìn tổng quan về pattern này."), which can be described as a suite of independently deployable, small, modular services.  Each service runs a unique process and communicates through a well-defined, lightweight mechanism to serve a business goal. <sup><a href=https://smartbear.com/learn/api-design/what-are-microservices>1</a></sup>

Pinterest, for example, could have the following microservices: user profile, follower, feed, search, photo upload, etc.

### Service Discovery

Systems such as [Consul](https://www.consul.io/docs/index.html "Tài liệu HashiCorp Consul, nền tảng service networking cho service discovery, health check và key-value store trong kiến trúc microservices."), [Etcd](https://coreos.com/etcd/docs/latest "Tài liệu chính thức của etcd, kho key-value phân tán nhất quán mạnh dùng Raft cho leader election và lưu cấu hình cluster. Giúp hiểu coordination service trong hệ thống phân tán."), and [Zookeeper](http://www.slideshare.net/sauravhaloi/introduction-to-apache-zookeeper "Slide giới thiệu ZooKeeper, dịch vụ điều phối cho ứng dụng phân tán: znode, watch, cấu hình, đồng bộ và consensus. Giúp hiểu vai trò coordination service.") can help services find each other by keeping track of registered names, addresses, and ports.  [Health checks](https://www.consul.io/intro/getting-started/checks.html "Hướng dẫn đăng ký service với Consul và thiết lập health check. Học cách dùng service discovery để giám sát sức khỏe service.") help verify service integrity and are often done using an [HTTP](../../1-nen-tang/05-communication/#hypertext-transfer-protocol-http) endpoint.  Both Consul and Etcd have a built in [key-value store](../../2-khoi-xay-dung/05-nosql/#key-value-store) that can be useful for storing config values and other shared data.

### Disadvantage(s): application layer

* Adding an application layer with loosely coupled services requires a different approach from an architectural, operations, and process viewpoint (vs a monolithic system).
* Microservices can add complexity in terms of deployments and operations.

### Source(s) and further reading

* [Intro to architecting systems for scale](http://lethain.com/introduction-to-architecting-systems-for-scale "Bài giới thiệu của Will Larson về các thành phần xây hệ thống scale: load balancing, caching, database replication, sharding và xử lý bất đồng bộ. Điểm khởi đầu tốt cho người mới.")
* [Crack the system design interview](http://www.puncsky.com/blog/2016-02-13-crack-the-system-design-interview "Hướng dẫn tiếp cận phỏng vấn system design: các bước phân tích yêu cầu, ước lượng và đưa ra quyết định thiết kế để thể hiện năng lực kỹ thuật.")
* [Service oriented architecture](https://en.wikipedia.org/wiki/Service-oriented_architecture "Bài Wikipedia về SOA, phong cách kiến trúc chia hệ thống thành các service rời rạc thay vì monolith. Nền tảng khái niệm cho microservices.")
* [Introduction to Zookeeper](http://www.slideshare.net/sauravhaloi/introduction-to-apache-zookeeper "Slide giới thiệu ZooKeeper, dịch vụ điều phối cho ứng dụng phân tán: znode, watch, cấu hình, đồng bộ và consensus. Giúp hiểu vai trò coordination service.")
* [Here's what you need to know about building microservices](https://cloudncode.wordpress.com/2016/07/22/msa-getting-started/ "Bài nhập môn microservices: so sánh với SOA và các điểm cần lưu ý khi bắt đầu. Hữu ích để hiểu khi nào và cách chia nhỏ ứng dụng.")
