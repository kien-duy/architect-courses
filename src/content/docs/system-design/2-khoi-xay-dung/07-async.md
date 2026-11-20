---
title: "Bất đồng bộ: message queue, task queue"
description: "Đưa việc tốn thời gian ra khỏi luồng request để giảm thời gian phản hồi."
lesson:
  group: "Các khối xây dựng"
  minutes: 8
quiz:
  - q: "Queue đầy và tiếp tục nhận request sẽ làm hệ thống chậm dần. Kỹ thuật nào giải quyết việc này?"
    options: ["Back pressure", "Denormalization", "Sharding", "DNS caching"]
    answer: 0
    why: "Back pressure giới hạn queue, từ chối bớt request (503) để giữ throughput."
cards:
  - q: "Xử lý bất đồng bộ giúp hệ thống ở những điểm nào?"
    a: "Giảm thời gian request cho thao tác tốn kém lẽ ra phải làm inline, và cho phép làm trước việc tốn thời gian, như tổng hợp dữ liệu định kỳ."
  - q: "Luồng xử lý cơ bản với message queue diễn ra thế nào?"
    a: "Ứng dụng đẩy job vào queue và báo trạng thái cho người dùng; worker lấy job ra xử lý rồi báo hoàn tất. Người dùng không bị chặn, job chạy nền."
  - q: "Client có thể làm gì để tác vụ bất đồng bộ trông như đã xong?"
    a: "Xử lý một phần nhỏ phía client. Ví dụ đăng tweet: hiện ngay trên timeline của mình, dù phải mất thời gian mới gửi tới mọi follower."
  - q: "Đánh đổi khi chọn Redis, RabbitMQ hay Amazon SQS làm message broker?"
    a: "Redis đơn giản nhưng có thể mất message. RabbitMQ phổ biến nhưng phải theo giao thức AMQP và tự quản lý node. SQS được host sẵn nhưng latency có thể cao và message có thể được giao hai lần."
  - q: "Task queue khác message queue thế nào?"
    a: "Message queue nhận, giữ và chuyển message. Task queue nhận task kèm dữ liệu, chạy chúng rồi trả kết quả; hỗ trợ lập lịch và chạy job tính toán nặng ở nền (ví dụ Celery)."
  - q: "Queue phình quá lớn thì có hậu quả gì?"
    a: "Kích thước queue có thể vượt bộ nhớ, dẫn tới cache miss, đọc disk và hiệu năng càng tệ hơn."
  - q: "Khi nào không nên dùng xử lý bất đồng bộ?"
    a: "Với phép tính rẻ hoặc luồng realtime, xử lý đồng bộ thường hợp hơn vì thêm queue gây trễ và phức tạp."
---

:::tip[Ý chính]
- Đưa việc tốn thời gian ra khỏi luồng request để giảm thời gian phản hồi.
- Message queue (Redis, RabbitMQ, SQS) nhận và chuyển message; task queue nhận job và chạy chúng.
- Back pressure: giới hạn kích thước queue, trả HTTP 503 khi đầy để hệ thống không sụp.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Asynchronism

<p align="center">
  <img src="../../../sd-images/54GYsSx.png">
  <br/>
  <i><a href=http://lethain.com/introduction-to-architecting-systems-for-scale/#platform_layer>Source: Intro to architecting systems for scale</a></i>
</p>

Asynchronous workflows help reduce request times for expensive operations that would otherwise be performed in-line.  They can also help by doing time-consuming work in advance, such as periodic aggregation of data.

### Message queues

Message queues receive, hold, and deliver messages.  If an operation is too slow to perform inline, you can use a message queue with the following workflow:

* An application publishes a job to the queue, then notifies the user of job status
* A worker picks up the job from the queue, processes it, then signals the job is complete

The user is not blocked and the job is processed in the background.  During this time, the client might optionally do a small amount of processing to make it seem like the task has completed.  For example, if posting a tweet, the tweet could be instantly posted to your timeline, but it could take some time before your tweet is actually delivered to all of your followers.

**[Redis](https://redis.io/ "Trang chủ Redis, kho dữ liệu trong bộ nhớ dùng làm cache, database và message broker. Trang thiên về giới thiệu sản phẩm, nên tài liệu chi tiết cần xem thêm.")** is useful as a simple message broker but messages can be lost.

**[RabbitMQ](https://www.rabbitmq.com/ "Trang chủ RabbitMQ, message broker mã nguồn mở hỗ trợ hàng đợi và streaming cho microservice. Điểm vào để tìm hiểu message queue và giao tiếp bất đồng bộ.")** is popular but requires you to adapt to the 'AMQP' protocol and manage your own nodes.

**[Amazon SQS](https://aws.amazon.com/sqs/ "Trang sản phẩm Amazon SQS, dịch vụ message queue được quản lý, gồm standard và FIFO queue để tách rời các microservice. Tổng quan tính năng và trường hợp dùng.")** is hosted but can have high latency and has the possibility of messages being delivered twice.

### Task queues

Tasks queues receive tasks and their related data, runs them, then delivers their results.  They can support scheduling and can be used to run computationally-intensive jobs in the background.

**[Celery](https://docs.celeryproject.org/en/stable/ "Tài liệu chính thức của Celery, task queue phân tán cho Python xử lý tác vụ nền và lập lịch. Giúp hiểu cách dùng message broker với worker.")** has support for scheduling and primarily has python support.

### Back pressure

If queues start to grow significantly, the queue size can become larger than memory, resulting in cache misses, disk reads, and even slower performance.  [Back pressure](http://mechanical-sympathy.blogspot.com/2012/05/apply-back-pressure-when-overloaded.html "Bài giải thích vì sao hệ thống nên áp dụng back pressure khi quá tải thay vì nhận mãi request đến lúc sập. Học cách dùng bounded queue và từ chối tải để giữ latency ổn định.") can help by limiting the queue size, thereby maintaining a high throughput rate and good response times for jobs already in the queue.  Once the queue fills up, clients get a server busy or HTTP 503 status code to try again later.  Clients can retry the request at a later time, perhaps with [exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff "Bài Wikipedia về exponential backoff, thuật toán giảm tốc độ retry theo cấp số nhân, dùng trong mạng và hệ thống phân tán để tránh quá tải.").

### Disadvantage(s): asynchronism

* Use cases such as inexpensive calculations and realtime workflows might be better suited for synchronous operations, as introducing queues can add delays and complexity.

### Source(s) and further reading

* [It's all a numbers game](https://www.youtube.com/watch?v=1KRYH75wgy4 "Bài nói của Martin Thompson tại GOTO 2012 về những con số và hiệu năng thực sự đằng sau hệ thống mở rộng được. Hữu ích để hiểu vì sao ước lượng và đo lường quan trọng.")
* [Applying back pressure when overloaded](http://mechanical-sympathy.blogspot.com/2012/05/apply-back-pressure-when-overloaded.html "Bài giải thích vì sao hệ thống nên áp dụng back pressure khi quá tải thay vì nhận mãi request đến lúc sập. Học cách dùng bounded queue và từ chối tải để giữ latency ổn định.")
* [Little's law](https://en.wikipedia.org/wiki/Little%27s_law "Bài Wikipedia về định luật Little (L = λW) trong lý thuyết hàng đợi, liên hệ số yêu cầu đồng thời, tốc độ đến và thời gian xử lý. Hữu ích khi ước lượng capacity.")
* [What is the difference between a message queue and a task queue?](https://www.quora.com/What-is-the-difference-between-a-message-queue-and-a-task-queue-Why-would-a-task-queue-require-a-message-broker-like-RabbitMQ-Redis-Celery-or-IronMQ-to-function "Câu hỏi Quora về khác biệt giữa message queue và task queue, và vì sao cần broker như RabbitMQ hay Redis. Bị chặn nên chưa đọc được nội dung.")
