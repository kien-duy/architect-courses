---
title: "Availability vs Consistency: định lý CAP"
description: "Hệ phân tán chỉ đảm bảo được 2 trong 3: Consistency, Availability, Partition tolerance."
lesson:
  group: "Hệ phân tán"
  minutes: 10
quiz:
  - q: "Vì sao trong thực tế thường chỉ chọn giữa CP và AP?"
    options: ["Vì CA rẻ hơn", "Vì mạng không đáng tin cậy, phải luôn chịu được partition", "Vì availability không quan trọng", "Vì consistency luôn được đảm bảo"]
    answer: 1
    why: "Partition chắc chắn xảy ra, nên P là bắt buộc."
  - q: "Hệ thống đếm lượt like có thể chấp nhận số liệu lệch vài giây. Nên nghiêng về đâu?"
    options: ["CP", "AP", "Không cần quan tâm", "Chỉ dùng một server"]
    answer: 1
    why: "Chấp nhận eventual consistency để luôn sẵn sàng là lựa chọn AP."
cards:
  - q: "Theo định lý CAP, Consistency nghĩa là gì?"
    a: "Mọi lần đọc đều nhận được bản ghi mới nhất, hoặc nhận lỗi."
  - q: "Theo định lý CAP, Availability nghĩa là gì?"
    a: "Mọi request đều nhận được phản hồi, nhưng không đảm bảo đó là phiên bản dữ liệu mới nhất."
  - q: "Partition tolerance trong CAP là gì?"
    a: "Hệ thống vẫn tiếp tục hoạt động dù mạng bị chia cắt (partition) tùy ý do lỗi mạng."
  - q: "Định lý CAP nói hệ phân tán đảm bảo được bao nhiêu trong 3 thuộc tính?"
    a: "Chỉ 2 trong 3: Consistency, Availability, Partition tolerance."
  - q: "Trong hệ CP, điều gì có thể xảy ra khi một node bị partition?"
    a: "Request phải chờ phản hồi từ node bị tách nên có thể gặp lỗi timeout. Đổi lại dữ liệu luôn nhất quán; hợp khi nghiệp vụ cần đọc/ghi nguyên tử (atomic)."
  - q: "Trong hệ AP, dữ liệu trả về và thao tác ghi hoạt động thế nào khi có partition?"
    a: "Trả về phiên bản sẵn có nhất trên node bất kỳ, có thể không mới nhất. Các thao tác ghi cần thời gian để lan truyền sau khi partition được khắc phục."
---

:::tip[Ý chính]
- Hệ phân tán chỉ đảm bảo được 2 trong 3: Consistency, Availability, Partition tolerance.
- Mạng luôn có thể chập chờn nên phải chấp nhận P. Lựa chọn thực tế là CP hoặc AP.
- CP hợp khi nghiệp vụ cần đọc/ghi nguyên tử; AP hợp khi chấp nhận eventual consistency để hệ thống luôn phản hồi.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Availability vs consistency

### CAP theorem

<p align="center">
  <img src="../../../sd-images/bgLMI2u.png">
  <br/>
  <i><a href="https://robertgreiner.com/cap-theorem-revisited">Source: CAP theorem revisited</a></i>
</p>

In a distributed computer system, you can only support two of the following guarantees:

* **Consistency** - Every read receives the most recent write or an error
* **Availability** - Every request receives a response, without guarantee that it contains the most recent version of the information
* **Partition Tolerance** - The system continues to operate despite arbitrary partitioning due to network failures

*Networks aren't reliable, so you'll need to support partition tolerance.  You'll need to make a software tradeoff between consistency and availability.*

#### CP - consistency and partition tolerance

Waiting for a response from the partitioned node might result in a timeout error.  CP is a good choice if your business needs require atomic reads and writes.

#### AP - availability and partition tolerance

Responses return the most readily available version of the data available on any node, which might not be the latest.  Writes might take some time to propagate when the partition is resolved.

AP is a good choice if the business needs to allow for [eventual consistency](../../3-he-phan-tan/02-consistency/#eventual-consistency) or when the system needs to continue working despite external errors.

### Source(s) and further reading

* [CAP theorem revisited](https://robertgreiner.com/cap-theorem-revisited/ "Bài giải thích lại định lý CAP, làm rõ cách hiểu consistency, availability và partition tolerance. Giúp tránh hiểu sai khi chọn hệ phân tán.")
* [A plain english introduction to CAP theorem](http://ksat.me/a-plain-english-introduction-to-cap-theorem "Bài giải thích định lý CAP bằng câu chuyện đời thường, không dùng thuật ngữ nặng. Giúp hiểu trade-off giữa consistency, availability và partition tolerance.")
* [CAP FAQ](https://github.com/henryr/cap-faq "Bộ FAQ của Henry Robinson giải thích định lý CAP một cách chính xác, gỡ các hiểu lầm về consistency, availability và partition tolerance. Đọc để nắm vững CAP.")
* [The CAP theorem](https://www.youtube.com/watch?v=k-Yaq8AHlFA "Video bài giảng về định lý CAP của Eric Brewer, nói về đánh đổi giữa consistency và availability trong hệ thống phân tán. Phù hợp để ôn nhanh bằng hình ảnh.")
