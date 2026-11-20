---
title: "Content Delivery Network (CDN)"
description: "CDN là mạng proxy phân tán toàn cầu, phục vụ nội dung từ vị trí gần người dùng."
lesson:
  group: "Nền tảng"
  minutes: 7
quiz:
  - q: "Site có lưu lượng lớn, nội dung mới thường xuyên được truy cập lại. Loại CDN nào phù hợp hơn?"
    options: ["Push CDN", "Pull CDN", "Không dùng CDN", "Chỉ dùng DNS"]
    answer: 1
    why: "Pull CDN hợp với site nhiều traffic vì nội dung phổ biến luôn nằm sẵn trên CDN."
cards:
  - q: "CDN là gì và thường phục vụ loại nội dung nào?"
    a: "Mạng proxy server phân tán toàn cầu, phục vụ nội dung từ nơi gần người dùng. Thường là file tĩnh như HTML/CSS/JS, ảnh, video; một số CDN hỗ trợ cả nội dung động."
  - q: "CDN cải thiện performance theo hai cách nào?"
    a: "Người dùng nhận nội dung từ datacenter gần họ, và server của bạn không phải xử lý những request mà CDN đã đáp ứng."
  - q: "Push CDN hoạt động thế nào?"
    a: "Bạn chủ động upload nội dung lên CDN mỗi khi có thay đổi và rewrite URL trỏ tới CDN, tự cấu hình khi nào hết hạn/cập nhật. Chỉ upload khi mới hoặc đổi nên ít traffic nhưng tốn storage."
  - q: "Push CDN hợp với loại site nào?"
    a: "Site ít traffic hoặc nội dung ít cập nhật: nội dung đặt lên CDN một lần thay vì bị kéo lại định kỳ."
  - q: "Pull CDN hoạt động thế nào và đánh đổi là gì?"
    a: "CDN lấy nội dung từ server khi có người dùng đầu tiên yêu cầu, cache theo TTL. Tiết kiệm storage, nhưng request đầu chậm và có thể tạo traffic thừa nếu file hết hạn rồi bị kéo lại dù chưa đổi."
  - q: "Vì sao pull CDN hợp với site nhiều traffic?"
    a: "Traffic được dàn đều hơn và chỉ nội dung được yêu cầu gần đây mới nằm lại trên CDN."
  - q: "Nhược điểm của CDN?"
    a: "Chi phí có thể lớn tuỳ traffic (cần so với chi phí khi không dùng CDN); nội dung có thể cũ nếu cập nhật trước khi TTL hết hạn; phải đổi URL file tĩnh để trỏ tới CDN."
---

:::tip[Ý chính]
- CDN là mạng proxy phân tán toàn cầu, phục vụ nội dung từ vị trí gần người dùng.
- Push CDN: bạn chủ động đẩy nội dung khi có thay đổi, hợp với site ít truy cập hoặc nội dung ít đổi.
- Pull CDN: lấy nội dung về khi có người dùng đầu tiên yêu cầu, hợp với site nhiều truy cập.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Content delivery network

<p align="center">
  <img src="../../../sd-images/h9TAuGI.jpg">
  <br/>
  <i><a href=https://www.creative-artworks.eu/why-use-a-content-delivery-network-cdn/>Source: Why use a CDN</a></i>
</p>

A content delivery network (CDN) is a globally distributed network of proxy servers, serving content from locations closer to the user.  Generally, static files such as HTML/CSS/JS, photos, and videos are served from CDN, although some CDNs such as Amazon's CloudFront support dynamic content.  The site's DNS resolution will tell clients which server to contact.

Serving content from CDNs can significantly improve performance in two ways:

* Users receive content from data centers close to them
* Your servers do not have to serve requests that the CDN fulfills

### Push CDNs

Push CDNs receive new content whenever changes occur on your server.  You take full responsibility for providing content, uploading directly to the CDN and rewriting URLs to point to the CDN.  You can configure when content expires and when it is updated.  Content is uploaded only when it is new or changed, minimizing traffic, but maximizing storage.

Sites with a small amount of traffic or sites with content that isn't often updated work well with push CDNs.  Content is placed on the CDNs once, instead of being re-pulled at regular intervals.

### Pull CDNs

Pull CDNs grab new content from your server when the first user requests the content.  You leave the content on your server and rewrite URLs to point to the CDN.  This results in a slower request until the content is cached on the CDN.

A [time-to-live (TTL)](https://en.wikipedia.org/wiki/Time_to_live "Trang Wikipedia về TTL: giới hạn vòng đời dữ liệu hoặc gói tin trong mạng và cache. Hiểu cách TTL dùng trong DNS và cache expiry.") determines how long content is cached.  Pull CDNs minimize storage space on the CDN, but can create redundant traffic if files expire and are pulled before they have actually changed.

Sites with heavy traffic work well with pull CDNs, as traffic is spread out more evenly with only recently-requested content remaining on the CDN.

### Disadvantage(s): CDN

* CDN costs could be significant depending on traffic, although this should be weighed with additional costs you would incur not using a CDN.
* Content might be stale if it is updated before the TTL expires it.
* CDNs require changing URLs for static content to point to the CDN.

### Source(s) and further reading

* [Globally distributed content delivery](https://figshare.com/articles/Globally_distributed_content_delivery/6605972 "Trang figshare cho tài liệu có tên Globally distributed content delivery, nghiên cứu về CDN phân phối nội dung toàn cầu. Nội dung trích xuất trống nên chưa rõ chi tiết.")
* [The differences between push and pull CDNs](https://www.geeksforgeeks.org/system-design/pull-cdn-vs-push-cdn/ "Bài GeeksforGeeks so sánh Pull CDN và Push CDN: cách hoạt động, ưu nhược điểm và khi nào nên chọn loại nào.")
* [Wikipedia](https://en.wikipedia.org/wiki/Content_delivery_network "Bài Wikipedia về CDN: mạng proxy server phân tán địa lý giúp tăng availability và giảm latency khi phân phối nội dung. Nắm cách hoạt động và lợi ích của CDN.")
