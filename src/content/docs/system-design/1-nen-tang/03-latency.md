---
title: "Latency vs Throughput"
description: "Latency: thời gian để thực hiện một hành động hoặc tạo ra một kết quả."
lesson:
  group: "Nền tảng"
  minutes: 5
quiz:
  - q: "\"API xử lý được 5.000 request mỗi giây\" mô tả đại lượng nào?"
    options: ["Latency", "Throughput", "Availability", "Durability"]
    answer: 1
    why: "Số việc trên một đơn vị thời gian là throughput."
cards:
  - q: "Latency là gì?"
    a: "Thời gian để thực hiện một hành động hoặc tạo ra một kết quả."
  - q: "Throughput là gì?"
    a: "Số hành động hoặc kết quả được tạo ra trong một đơn vị thời gian."
  - q: "Khi thiết kế, nên đặt mục tiêu latency và throughput thế nào?"
    a: "Nhắm tới throughput tối đa trong khi giữ latency ở mức chấp nhận được."
  - q: "\"Mỗi request mất 200 ms\" là latency hay throughput?"
    a: "Latency: nó đo thời gian của một hành động, không phải số hành động mỗi giây."
---

:::tip[Ý chính]
- Latency: thời gian để thực hiện một hành động hoặc tạo ra một kết quả.
- Throughput: số hành động hoặc kết quả trên một đơn vị thời gian.
- Mục tiêu thường đặt ra: throughput tối đa với latency chấp nhận được.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Latency vs throughput

**Latency** is the time to perform some action or to produce some result.

**Throughput** is the number of such actions or results per unit of time.

Generally, you should aim for **maximal throughput** with **acceptable latency**.

### Source(s) and further reading

* [Understanding latency vs throughput](https://community.cadence.com/cadence_blogs_8/b/fv/posts/understanding-latency-vs-throughput "Bài ngắn giải thích sự khác nhau giữa latency và throughput qua ví dụ phần cứng pipeline. Củng cố hai khái niệm hiệu năng cốt lõi.")
