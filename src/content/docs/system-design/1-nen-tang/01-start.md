---
title: "Bắt đầu: học thế nào cho đúng"
description: "System design là chủ đề rất rộng: mục tiêu là hiểu đủ rộng ở mọi chủ đề rồi đào sâu vài chủ đề."
lesson:
  group: "Nền tảng"
  minutes: 10
quiz:
  - q: "Theo study guide, nếu bạn chỉ có ít thời gian trước buổi phỏng vấn thì nên làm gì?"
    options: ["Đào thật sâu một chủ đề, ví dụ Cassandra", "Học rộng các chủ đề system design", "Chỉ luyện câu hỏi OOD", "Bỏ qua system design"]
    answer: 1
    why: "Ngắn hạn: ưu tiên độ rộng. Có thêm thời gian mới đào sâu dần."
cards:
  - q: "Có cần biết hết mọi chủ đề system design để đi phỏng vấn không?"
    a: "Không. Nội dung bị hỏi phụ thuộc kinh nghiệm, nền tảng kỹ thuật, vị trí ứng tuyển, công ty và cả may mắn. Ứng viên càng nhiều kinh nghiệm (architect, team lead) càng được kỳ vọng biết nhiều hơn."
  - q: "Nguyên tắc chung khi ôn system design là gì?"
    a: "Bắt đầu rộng rồi đào sâu vài mảng: biết sơ qua nhiều chủ đề then chốt, sau đó điều chỉnh độ sâu theo thời gian, kinh nghiệm, vị trí và công ty bạn nhắm tới."
  - q: "Ôn theo lộ trình dài khác lộ trình ngắn và vừa thế nào?"
    a: "Ngắn: học rộng, luyện một số câu hỏi. Vừa: rộng và sâu một phần, luyện nhiều câu. Dài: rộng và sâu hơn, luyện hầu hết các câu hỏi phỏng vấn."
  - q: "Người mới học system design nên bắt đầu từ đâu và đi tiếp thế nào?"
    a: "Nắm nguyên lý cơ bản qua bài giảng và bài viết về scalability (scaling, caching, load balancing, replication, partitioning). Tiếp theo là các đánh đổi lớn: performance vs scalability, latency vs throughput, availability vs consistency. Mọi thứ đều là trade-off."
---

:::tip[Ý chính]
- System design là chủ đề rất rộng: mục tiêu là hiểu đủ rộng ở mọi chủ đề rồi đào sâu vài chủ đề.
- Thời gian ôn phụ thuộc kinh nghiệm: ngắn hạn thì học rộng, dài hạn thì học cả rộng lẫn sâu.
- Bắt đầu bằng bài giảng Scalability của Harvard và bài viết về scalability để có bức tranh tổng thể.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Study guide

> Suggested topics to review based on your interview timeline (short, medium, long).

<img src="../../../sd-images/OfVllex.png" alt="Imgur" loading="lazy" />

**Q: For interviews, do I need to know everything here?**

**A: No, you don't need to know everything here to prepare for the interview**.

What you are asked in an interview depends on variables such as:

* How much experience you have
* What your technical background is
* What positions you are interviewing for
* Which companies you are interviewing with
* Luck

More experienced candidates are generally expected to know more about system design.  Architects or team leads might be expected to know more than individual contributors.  Top tech companies are likely to have one or more design interview rounds.

Start broad and go deeper in a few areas.  It helps to know a little about various key system design topics.  Adjust the following guide based on your timeline, experience, what positions you are interviewing for, and which companies you are interviewing with.

* **Short timeline** - Aim for **breadth** with system design topics.  Practice by solving **some** interview questions.
* **Medium timeline** - Aim for **breadth** and **some depth** with system design topics.  Practice by solving **many** interview questions.
* **Long timeline** - Aim for **breadth** and **more depth** with system design topics.  Practice by solving **most** interview questions.

| | Short | Medium | Long |
|---|---|---|---|
| Read through the [System design topics](../../) to get a broad understanding of how systems work | :+1: | :+1: | :+1: |
| Read through a few articles in the [Company engineering blogs](../../5-hoc-tiep/01-real-world/#company-engineering-blogs) for the companies you are interviewing with | :+1: | :+1: | :+1: |
| Read through a few [Real world architectures](../../5-hoc-tiep/01-real-world/#real-world-architectures) | :+1: | :+1: | :+1: |
| Review [How to approach a system design interview question](../../4-thuc-chien/01-approach/#how-to-approach-a-system-design-interview-question) | :+1: | :+1: | :+1: |
| Work through [System design interview questions with solutions](../../4-thuc-chien/02-sol-pastebin/) | Some | Many | Most |
| Work through [Object-oriented design interview questions with solutions](https://github.com/donnemartin/system-design-primer#object-oriented-design-interview-questions-with-solutions "Phần câu hỏi thiết kế hướng đối tượng (OOD) có lời giải bằng notebook Python trong repo gốc: hash map, LRU cache, call center, bãi đỗ xe, bộ bài. Lộ trình này chưa đưa phần OOD vào.") | Some | Many | Most |
| Review [Additional system design interview questions](../../5-hoc-tiep/01-real-world/#additional-system-design-interview-questions) | Some | Many | Most |


## System design topics: start here

New to system design?

First, you'll need a basic understanding of common principles, learning about what they are, how they are used, and their pros and cons.

### Step 1: Review the scalability video lecture

[Scalability Lecture at Harvard](https://www.youtube.com/watch?v=-W9F__D3oY4 "Bài giảng của David Malan (Harvard CS75) về scalability web: vertical/horizontal scaling, load balancing, caching và replication. Dễ tiếp cận cho người mới.")

* Topics covered:
    * Vertical scaling
    * Horizontal scaling
    * Caching
    * Load balancing
    * Database replication
    * Database partitioning

### Step 2: Review the scalability article

[Scalability](https://web.archive.org/web/20250307202020/https://web.archive.org/web/20221030091841/http://www.lecloud.net/tagged/scalability/chrono "Bản lưu loạt bài về scalability trên blog lecloud.net, đi qua các bước mở rộng hệ thống từ clones, database, cache đến asynchronism.")

* Topics covered:
    * [Clones](https://web.archive.org/web/20250307202838/https://web.archive.org/web/20220530193911/https://www.lecloud.net/post/7295452622/scalability-for-dummies-part-1-clones "Phần 1 loạt Scalability for Dummies, nói về clone: nhân bản server sau load balancer để scale ngang và giữ web server stateless. Nhập môn scale web app (bản archive).")
    * [Databases](https://web.archive.org/web/20250307201408/https://web.archive.org/web/20220602114024/https://www.lecloud.net/post/7994751381/scalability-for-dummies-part-2-database "Phần 2 loạt bài Scalability for Dummies, bàn về scale database: replication, sharding, denormalization và SQL tuning. Bài nhập môn dễ đọc.")
    * [Caches](https://web.archive.org/web/20230126233752/https://www.lecloud.net/post/9246290032/scalability-for-dummies-part-3-cache "Phần 3 của loạt bài về scalability, nói về cache: cache cấp query và cấp object, cách dùng memcached/Redis. Nhập môn tốt về caching.")
    * [Asynchronism](https://web.archive.org/web/20220926171507/https://www.lecloud.net/post/9699762917/scalability-for-dummies-part-4-asynchronism "Phần 4 của loạt Scalability for Dummies, giải thích xử lý bất đồng bộ qua hai mô hình: làm trước rồi phục vụ và dùng queue cho tác vụ nặng. Dễ hiểu cho người mới.")

### Next steps

Next, we'll look at high-level trade-offs:

* **Performance** vs **scalability**
* **Latency** vs **throughput**
* **Availability** vs **consistency**

Keep in mind that **everything is a trade-off**.

Then we'll dive into more specific topics such as DNS, CDNs, and load balancers.
