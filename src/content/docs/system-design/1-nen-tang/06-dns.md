---
title: "Domain Name System (DNS)"
description: "DNS dịch tên miền như www.example.com thành địa chỉ IP, theo cấu trúc phân cấp."
lesson:
  group: "Nền tảng"
  minutes: 7
quiz:
  - q: "Bản ghi DNS nào trỏ một tên miền tới một tên miền khác?"
    options: ["A", "MX", "CNAME", "NS"]
    answer: 2
    why: "CNAME trỏ tên này sang tên khác; bản ghi A trỏ tên miền tới địa chỉ IP."
cards:
  - q: "DNS làm nhiệm vụ gì và tổ chức ra sao?"
    a: "Dịch tên miền (vd www.example.com) thành địa chỉ IP. DNS có cấu trúc phân cấp, vài authoritative server ở tầng trên cùng; router hoặc ISP cho biết cần hỏi DNS server nào."
  - q: "Kết quả DNS được cache ở đâu và rủi ro là gì?"
    a: "Ở DNS server tầng dưới, trình duyệt và hệ điều hành, trong thời gian do TTL quy định. Rủi ro: bản ghi cache có thể cũ do độ trễ lan truyền DNS."
  - q: "Bản ghi NS, MX và A dùng để làm gì?"
    a: "NS chỉ định DNS server cho domain/subdomain; MX chỉ định mail server nhận thư; A trỏ một tên tới một địa chỉ IP."
  - q: "Weighted round robin ở tầng DNS dùng cho những việc gì?"
    a: "Tránh đẩy traffic vào server đang bảo trì, cân bằng giữa các cluster có kích thước khác nhau, và làm A/B testing."
  - q: "Ngoài weighted round robin, managed DNS còn định tuyến theo cách nào?"
    a: "Theo latency (latency-based) và theo vị trí địa lý (geolocation-based)."
  - q: "Nhược điểm của DNS?"
    a: "Truy vấn DNS thêm chút độ trễ (giảm nhờ cache); quản lý DNS server phức tạp; DNS có thể bị DDoS khiến người dùng không vào được site nếu không biết IP."
---

:::tip[Ý chính]
- DNS dịch tên miền như www.example.com thành địa chỉ IP, theo cấu trúc phân cấp.
- Kết quả được cache ở trình duyệt và hệ điều hành theo TTL.
- Các bản ghi hay gặp: NS, MX, A, CNAME. Một số dịch vụ DNS còn định tuyến theo trọng số, độ trễ hoặc vị trí địa lý.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Domain name system

<p align="center">
  <img src="../../../sd-images/IOyLj4i.jpg">
  <br/>
  <i><a href=http://www.slideshare.net/srikrupa5/dns-security-presentation-issa>Source: DNS security presentation</a></i>
</p>

A Domain Name System (DNS) translates a domain name such as www.example.com to an IP address.

DNS is hierarchical, with a few authoritative servers at the top level.  Your router or ISP provides information about which DNS server(s) to contact when doing a lookup.  Lower level DNS servers cache mappings, which could become stale due to DNS propagation delays.  DNS results can also be cached by your browser or OS for a certain period of time, determined by the [time to live (TTL)](https://en.wikipedia.org/wiki/Time_to_live "Trang Wikipedia về TTL: giới hạn vòng đời dữ liệu hoặc gói tin trong mạng và cache. Hiểu cách TTL dùng trong DNS và cache expiry.").

* **NS record (name server)** - Specifies the DNS servers for your domain/subdomain.
* **MX record (mail exchange)** - Specifies the mail servers for accepting messages.
* **A record (address)** - Points a name to an IP address.
* **CNAME (canonical)** - Points a name to another name or `CNAME` (example.com to www.example.com) or to an `A` record.

Services such as [CloudFlare](https://www.cloudflare.com/dns/ "Trang giới thiệu dịch vụ authoritative DNS của Cloudflare với mạng anycast toàn cầu, tốc độ truy vấn nhanh và chống DDoS. Minh họa cách DNS được vận hành ở quy mô lớn.") and [Route 53](https://aws.amazon.com/route53/ "Trang sản phẩm Amazon Route 53, dịch vụ DNS có tính sẵn sàng và khả năng mở rộng cao với nhiều chính sách định tuyến giảm latency. Cho thấy DNS được dùng ra sao trong kiến trúc cloud.") provide managed DNS services.  Some DNS services can route traffic through various methods:

* [Weighted round robin](https://www.jscape.com/blog/load-balancing-algorithms "Bài so sánh các thuật toán cân bằng tải như Round Robin, Weighted Round Robin, Least Connections và Random, nêu trường hợp phù hợp. Giúp chọn thuật toán cho load balancer.")
    * Prevent traffic from going to servers under maintenance
    * Balance between varying cluster sizes
    * A/B testing
* [Latency-based](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-latency.html "Tài liệu AWS về định tuyến theo độ trễ của Route 53, đưa người dùng tới Region có latency thấp nhất. Dùng khi triển khai đa region để cải thiện hiệu năng.")
* [Geolocation-based](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geo.html "Tài liệu Route 53 về geolocation routing, định tuyến DNS theo vị trí người dùng. Biết cách điều hướng lưu lượng theo vùng.")

### Disadvantage(s): DNS

* Accessing a DNS server introduces a slight delay, although mitigated by caching described above.
* DNS server management could be complex and is generally managed by [governments, ISPs, and large companies](https://web.archive.org/web/20260216043422/https://superuser.com/questions/472695/who-controls-the-dns-servers/472729 "Câu hỏi trên Super User về ai điều khiển các DNS server, giải thích phân cấp root, TLD và nameserver. Giúp hiểu nhanh cách DNS được quản trị.").
* DNS services have recently come under [DDoS attack](https://web.archive.org/web/20200625183317/https://dyn.com/blog/dyn-analysis-summary-of-friday-october-21-attack/ "Phân tích của Dyn về vụ tấn công DDoS ngày 21/10/2016 làm sập hạ tầng DNS bằng botnet Mirai. Giúp hiểu rủi ro khi phụ thuộc một nhà cung cấp DNS và cách tấn công ảnh hưởng dịch vụ lớn."), preventing users from accessing websites such as Twitter without knowing Twitter's IP address(es).

### Source(s) and further reading

* [DNS architecture](https://technet.microsoft.com/en-us/library/dd197427(v=ws.10).aspx)
* [Wikipedia](https://en.wikipedia.org/wiki/Domain_Name_System "Bài Wikipedia về DNS, hệ thống phân giải tên miền thành địa chỉ IP, gồm phân cấp server, bản ghi và cơ chế cache. Kiến thức nền cho routing và load balancing.")
* [DNS articles](https://support.dnsimple.com/categories/dns/ "Mục bài hỗ trợ về DNS của DNSimple: khái niệm DNS, loại record, TTL, anycast. Chỉ là mục lục tài liệu tham khảo.")
