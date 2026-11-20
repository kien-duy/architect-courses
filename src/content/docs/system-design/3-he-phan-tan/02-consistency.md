---
title: "Các mẫu nhất quán (consistency)"
description: "Weak consistency: sau khi ghi, lần đọc sau có thể thấy hoặc không. Ví dụ: memcached, VoIP, game."
lesson:
  group: "Hệ phân tán"
  minutes: 6
quiz:
  - q: "DNS là ví dụ của mẫu nhất quán nào?"
    options: ["Weak", "Eventual", "Strong", "Không thuộc mẫu nào"]
    answer: 1
    why: "Bản ghi DNS lan truyền dần và cuối cùng sẽ đồng bộ."
cards:
  - q: "Weak consistency là gì?"
    a: "Sau khi ghi, lần đọc sau có thể thấy hoặc không thấy dữ liệu mới; theo kiểu best effort. Ví dụ: memcached."
  - q: "Vì sao weak consistency hợp với VoIP, video chat, game multiplayer realtime?"
    a: "Các ứng dụng realtime chỉ cần dữ liệu hiện tại. Như cuộc gọi mất sóng vài giây, khi kết nối lại bạn không nghe lại phần đã nói lúc mất sóng."
  - q: "Eventual consistency replicate dữ liệu theo cách nào, và bao lâu thì đọc thấy dữ liệu mới?"
    a: "Replicate bất đồng bộ (asynchronous). Lần đọc sau cùng sẽ thấy bản ghi mới, thường trong vài mili giây."
  - q: "Eventual consistency hợp với loại hệ thống nào? Cho ví dụ."
    a: "Hợp với hệ thống cần high availability. Ví dụ: DNS, email."
  - q: "Strong consistency replicate thế nào và hợp với hệ thống nào?"
    a: "Replicate đồng bộ (synchronous), đọc ngay sau ghi luôn thấy dữ liệu mới. Hợp với hệ thống cần transaction; ví dụ file system, RDBMS."
---

:::tip[Ý chính]
- Weak consistency: sau khi ghi, lần đọc sau có thể thấy hoặc không. Ví dụ: memcached, VoIP, game.
- Eventual consistency: dữ liệu sẽ đồng bộ sau một khoảng ngắn. Ví dụ: DNS, email.
- Strong consistency: đọc ngay sau ghi luôn thấy dữ liệu mới. Ví dụ: hệ thống cần transaction.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Consistency patterns

With multiple copies of the same data, we are faced with options on how to synchronize them so clients have a consistent view of the data.  Recall the definition of consistency from the [CAP theorem](../../3-he-phan-tan/01-cap/#cap-theorem) - Every read receives the most recent write or an error.

### Weak consistency

After a write, reads may or may not see it.  A best effort approach is taken.

This approach is seen in systems such as memcached.  Weak consistency works well in real time use cases such as VoIP, video chat, and realtime multiplayer games.  For example, if you are on a phone call and lose reception for a few seconds, when you regain connection you do not hear what was spoken during connection loss.

### Eventual consistency

After a write, reads will eventually see it (typically within milliseconds).  Data is replicated asynchronously.

This approach is seen in systems such as DNS and email.  Eventual consistency works well in highly available systems.

### Strong consistency

After a write, reads will see it.  Data is replicated synchronously.

This approach is seen in file systems and RDBMSes.  Strong consistency works well in systems that need transactions.

### Source(s) and further reading

* [Transactions across data centers](http://snarfed.org/transactions_across_datacenters_io.html "Slide bài nói của Google I/O về transaction giữa nhiều datacenter: CAP, consistency và multihoming, qua case study App Engine datastore. Hiểu đánh đổi giữa consistency và availability.")
