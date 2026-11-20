---
title: "Quy trình 4 bước khi thiết kế"
description: "Bước 1: làm rõ use case, ràng buộc và giả định: ai dùng, dùng thế nào, bao nhiêu request, đọc/ghi tỉ lệ ra sao."
lesson:
  group: "Thiết kế thực chiến"
  minutes: 8
quiz:
  - q: "Việc đầu tiên nên làm khi nhận đề \"Thiết kế Twitter\" là gì?"
    options: ["Vẽ ngay 20 server và Kafka", "Hỏi lại để làm rõ use case và ràng buộc", "Chọn ngôn ngữ lập trình", "Viết schema SQL"]
    answer: 1
    why: "Đây là bài toán mở; phải xác định phạm vi trước khi thiết kế."
cards:
  - q: "Phỏng vấn system design có dạng gì, và ai dẫn dắt?"
    a: "Là một cuộc trò chuyện mở (open-ended); ứng viên được kỳ vọng tự dẫn dắt cuộc thảo luận."
  - q: "Bốn bước giải một bài system design là gì?"
    a: "1) Nêu use case, ràng buộc và giả định. 2) Vẽ thiết kế tổng quan. 3) Thiết kế chi tiết các thành phần cốt lõi. 4) Scale thiết kế: tìm và xử lý điểm nghẽn."
  - q: "Ở bước 1, cần hỏi những câu gì về quy mô hệ thống?"
    a: "Bao nhiêu user, lượng dữ liệu cần xử lý, số request mỗi giây, và tỉ lệ đọc/ghi dự kiến; cùng với ai dùng, dùng thế nào, input/output là gì."
  - q: "Bước 2 (high level design) cần làm gì?"
    a: "Phác thảo các thành phần chính và kết nối giữa chúng, đồng thời giải thích lý do cho các lựa chọn."
  - q: "Với bài URL shortener, bước 3 cần đi sâu vào những gì?"
    a: "Cách sinh và lưu hash của URL (MD5, Base62, xử lý hash collision, SQL hay NoSQL, schema), cách tra hash ra URL gốc, cùng API và thiết kế hướng đối tượng."
  - q: "Bước 4 dùng những công cụ nào để xử lý điểm nghẽn?"
    a: "Ví dụ: load balancer, horizontal scaling, caching, database sharding. Luôn thảo luận giải pháp kèm đánh đổi, vì mọi thứ đều là trade-off."
  - q: "Khi phải ước lượng bằng tay (back-of-the-envelope), nên dựa vào tài liệu nào?"
    a: "Bảng lũy thừa của 2 (powers of two) và bảng latency numbers every programmer should know."
---

:::tip[Ý chính]
- Bước 1: làm rõ use case, ràng buộc và giả định: ai dùng, dùng thế nào, bao nhiêu request, đọc/ghi tỉ lệ ra sao.
- Bước 2: vẽ thiết kế tổng quan với các thành phần chính.
- Bước 3: đi sâu các thành phần cốt lõi: API, schema, thuật toán.
- Bước 4: tìm điểm nghẽn và scale: load balancer, cache, sharding, replication. Luôn nói rõ đánh đổi.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## How to approach a system design interview question

> How to tackle a system design interview question.

The system design interview is an **open-ended conversation**.  You are expected to lead it.

You can use the following steps to guide the discussion.  To help solidify this process, work through the [System design interview questions with solutions](../../4-thuc-chien/02-sol-pastebin/) section using the following steps.

### Step 1: Outline use cases, constraints, and assumptions

Gather requirements and scope the problem.  Ask questions to clarify use cases and constraints.  Discuss assumptions.

* Who is going to use it?
* How are they going to use it?
* How many users are there?
* What does the system do?
* What are the inputs and outputs of the system?
* How much data do we expect to handle?
* How many requests per second do we expect?
* What is the expected read to write ratio?

### Step 2: Create a high level design

Outline a high level design with all important components.

* Sketch the main components and connections
* Justify your ideas

### Step 3: Design core components

Dive into details for each core component.  For example, if you were asked to [design a url shortening service](../../4-thuc-chien/02-sol-pastebin/), discuss:

* Generating and storing a hash of the full url
    * [MD5](../../4-thuc-chien/02-sol-pastebin/) and [Base62](../../4-thuc-chien/02-sol-pastebin/)
    * Hash collisions
    * SQL or NoSQL
    * Database schema
* Translating a hashed url to the full url
    * Database lookup
* API and object-oriented design

### Step 4: Scale the design

Identify and address bottlenecks, given the constraints.  For example, do you need the following to address scalability issues?

* Load balancer
* Horizontal scaling
* Caching
* Database sharding

Discuss potential solutions and trade-offs.  Everything is a trade-off.  Address bottlenecks using [principles of scalable system design](../../).

### Back-of-the-envelope calculations

You might be asked to do some estimates by hand.  Refer to the [Appendix](../../1-nen-tang/04-numbers/) for the following resources:

* [Use back of the envelope calculations](http://highscalability.com/blog/2011/1/26/google-pro-tip-use-back-of-the-envelope-calculations-to-choo.html "Bài viết cho thấy cách ước lượng nhanh bằng các con số latency để chọn thiết kế tốt nhất, ví dụ tải 30 thumbnail tuần tự hay song song. Kỹ năng nền tảng cho phần ước lượng trong system design.")
* [Powers of two table](../../1-nen-tang/04-numbers/#powers-of-two-table)
* [Latency numbers every programmer should know](../../1-nen-tang/04-numbers/#latency-numbers-every-programmer-should-know)

### Source(s) and further reading

Check out the following links to get a better idea of what to expect:

* [How to ace a systems design interview](https://web.archive.org/web/20210505130322/https://www.palantir.com/2011/10/how-to-rock-a-systems-design-interview/ "Bài của Palantir hướng dẫn chuẩn bị và trả lời phỏng vấn system design: cách nhìn câu hỏi mở và trình bày thiết kế. Hữu ích cho người luyện phỏng vấn.")
* [The system design interview](http://www.hiredintech.com/system-design "Khóa học HiredInTech về cách tiếp cận câu hỏi system design trong phỏng vấn, với các bước và ví dụ thiết kế. Phù hợp để rèn quy trình trả lời bài thiết kế hệ thống.")
* [Intro to Architecture and Systems Design Interviews](https://www.youtube.com/watch?v=ZgdS0EUmn70 "Video giới thiệu bối cảnh và mục tiêu của buổi phỏng vấn system design và kiến trúc. Hữu ích để biết nhà tuyển dụng đánh giá điều gì.")
* [System design template](https://web.archive.org/web/20250124063736/https://leetcode.com/discuss/career/229177/My-System-Design-Template "Bài thảo luận trên LeetCode chia sẻ một khung mẫu để trả lời phỏng vấn system design theo từng bước. Giúp có cấu trúc khi làm bài.")
