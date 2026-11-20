---
title: "Performance vs Scalability"
description: "Một service là scalable nếu hiệu năng tăng tương xứng khi thêm tài nguyên."
lesson:
  group: "Nền tảng"
  minutes: 5
quiz:
  - q: "Trang web phản hồi nhanh khi có 10 người dùng nhưng chậm hẳn khi có 10.000 người. Đây là vấn đề gì?"
    options: ["Performance", "Scalability", "Consistency", "Security"]
    answer: 1
    why: "Nhanh với ít người nhưng chậm khi tải tăng là dấu hiệu của vấn đề scalability."
cards:
  - q: "Khi nào một service được gọi là scalable?"
    a: "Khi thêm tài nguyên thì performance tăng tương xứng với lượng tài nguyên đã thêm."
  - q: "Dấu hiệu nhận biết vấn đề performance (khác với scalability)?"
    a: "Hệ thống chậm ngay cả khi chỉ có một người dùng."
  - q: "Dấu hiệu nhận biết vấn đề scalability?"
    a: "Hệ thống nhanh với một người dùng nhưng chậm đi khi tải lớn."
  - q: "\"Tăng performance\" trong ngữ cảnh scalability có thể mang những nghĩa nào?"
    a: "Thường là phục vụ được nhiều đơn vị công việc hơn, nhưng cũng có thể là xử lý được đơn vị công việc lớn hơn, ví dụ khi dataset tăng kích thước."
---

:::tip[Ý chính]
- Một service là scalable nếu hiệu năng tăng tương xứng khi thêm tài nguyên.
- Vấn đề performance: hệ thống chậm với một người dùng.
- Vấn đề scalability: nhanh với một người dùng nhưng chậm khi tải lớn.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Performance vs scalability

A service is **scalable** if it results in increased **performance** in a manner proportional to resources added. Generally, increasing performance means serving more units of work, but it can also be to handle larger units of work, such as when datasets grow.<sup><a href=http://www.allthingsdistributed.com/2006/03/a_word_on_scalability.html>1</a></sup>

Another way to look at performance vs scalability:

* If you have a **performance** problem, your system is slow for a single user.
* If you have a **scalability** problem, your system is fast for a single user but slow under heavy load.

### Source(s) and further reading

* [A word on scalability](http://www.allthingsdistributed.com/2006/03/a_word_on_scalability.html "Bài của Werner Vogels (CTO Amazon) bàn về ý nghĩa thực sự của scalability và vì sao nó thường bị dùng mơ hồ. Cho góc nhìn nền tảng về tăng trưởng hệ thống.")
* [Scalability, availability, stability, patterns](http://www.slideshare.net/jboner/scalability-availability-stability-patterns/ "Bộ slide của Jonas Bonér tổng hợp các pattern về scalability, availability, stability: trade-off latency/throughput, consistency/availability và các kỹ thuật liên quan. Bản tổng quan tốt.")
