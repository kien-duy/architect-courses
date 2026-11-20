---
title: "Observability: logging, metrics và tracing"
description: "Metrics cho biết có gì bất thường, traces chỉ ra request chậm hay lỗi ở đâu, logs giải thích chính xác chuyện gì đã xảy ra; ba thứ nên liên kết qua trace_id."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 8
quiz:
  - q: "Một service có latency trung bình 45 ms nhưng người dùng vẫn phàn nàn chậm. Chỉ số nào giúp thấy rõ vấn đề nhất?"
    options: ["Latency trung bình theo từng giờ", "Latency p99", "Tổng số request mỗi giây", "CPU trung bình của các máy"]
    answer: 1
    why: "Trung bình che giấu phần đuôi; p99 cho thấy những request chậm mà một phần người dùng thực sự gặp phải."
  - q: "Đội muốn biết hoá đơn metrics tăng gấp 10 vì sao. Thay đổi nào nhiều khả năng là thủ phạm?"
    options: ["Chuyển log sang định dạng JSON", "Tăng tỉ lệ head sampling của trace từ 1% lên 2%", "Thêm label user_id vào metric đếm request", "Thêm một dashboard mới cho latency"]
    answer: 2
    why: "Mỗi tổ hợp giá trị label là một time series; user_id có hàng triệu giá trị nên làm số series bùng nổ (cardinality cao)."
  - q: "Alert nào phù hợp nhất để gọi người trực lúc nửa đêm?"
    options: ["Tỉ lệ checkout lỗi đang tiêu error budget nhanh, sẽ hết trong vài giờ", "CPU của một máy vượt 85% trong 5 phút", "Dung lượng log hôm nay cao hơn hôm qua", "Một pod khởi động lại một lần"]
    answer: 0
    why: "Đây là triệu chứng người dùng cảm nhận và cần hành động ngay; các lựa chọn khác là nguyên nhân tiềm năng có thể không ảnh hưởng ai."
cards:
  - q: "Ba trụ cột của observability là gì?"
    a: "Metrics (con số theo thời gian, rẻ, để phát hiện bất thường), logs (sự kiện chi tiết, để biết chuyện gì xảy ra) và traces (hành trình một request qua nhiều service)."
  - q: "Structured logging khác log văn bản tự do thế nào?"
    a: "Mỗi sự kiện được ghi thành bản ghi có trường rõ ràng (thường JSON) như service, level, `trace_id`, nên máy lọc, đếm và ghép log dễ dàng."
  - q: "Counter, gauge và histogram khác nhau ra sao?"
    a: "Counter chỉ tăng (số request, số lỗi). Gauge lên xuống tự do (bộ nhớ, độ dài hàng đợi). Histogram đếm quan sát theo bucket để ước lượng phân vị như p99."
  - q: "Vì sao không lấy trung bình p99 của nhiều server để ra p99 toàn hệ thống?"
    a: "Percentile không cộng hay lấy trung bình được. Cần gộp dữ liệu gốc, ví dụ cộng bucket histogram của các instance rồi mới tính phân vị."
  - q: "Span là gì và trace được ghép thế nào?"
    a: "Span là một đơn vị công việc (lời gọi HTTP, truy vấn DB) có thời lượng và span cha. Các span cùng `trace_id` ghép thành cây mô tả cả request."
  - q: "Context propagation trong tracing là gì?"
    a: "Truyền `trace_id` và span hiện tại sang lời gọi kế tiếp, qua header như `traceparent` (W3C Trace Context) hoặc metadata của message trong hàng đợi."
  - q: "Head sampling và tail sampling khác nhau ra sao?"
    a: "Head sampling quyết định giữ trace ngay đầu request, đơn giản nhưng có thể bỏ sót lỗi. Tail sampling quyết định khi trace xong, giữ được trace lỗi/chậm nhưng tốn bộ đệm."
  - q: "SLI, SLO, SLA khác nhau thế nào?"
    a: "SLI là chỉ số đo được, SLO là mục tiêu nội bộ cho chỉ số đó, SLA là cam kết với khách hàng kèm hậu quả, thường lỏng hơn SLO."
  - q: "Error budget của SLO 99,9% trong 30 ngày là bao nhiêu và dùng để làm gì?"
    a: "Khoảng 43 phút không đạt mục tiêu. Còn ngân sách thì được deploy nhanh, gần hết thì ưu tiên ổn định; alert theo burn rate dựa trên tốc độ tiêu nó."
---

:::tip[Ý chính]
- Metrics cho biết có gì bất thường, traces chỉ ra request chậm hay lỗi ở đâu, logs giải thích chính xác chuyện gì đã xảy ra; ba thứ nên liên kết qua trace_id.
- Đo latency bằng percentile (p50, p99) thay vì trung bình, và đặt SLO kèm error budget để cân bằng giữa tốc độ phát triển và độ tin cậy.
- Alert vào triệu chứng người dùng cảm nhận, và kiểm soát chi phí bằng cách giữ cardinality của metric thấp và lấy mẫu trace.
:::

Khi một request đi qua load balancer, API gateway, vài microservice, một hàng đợi và hai database, câu hỏi "vì sao trang tải chậm?" trở nên rất khó, vì mỗi thành phần chỉ thấy một mảnh bức tranh.

**Observability** (khả năng quan sát) là mức độ bạn hiểu được trạng thái bên trong hệ thống chỉ từ dữ liệu nó phát ra, kể cả với sự cố chưa từng gặp. Monitoring truyền thống hỏi "cái đã biết có đang hỏng không?"; observability nhắm tới việc trả lời cả câu hỏi mới mà không phải sửa code rồi deploy lại. Bài này nối tiếp [Hiệu năng](../../1-nen-tang/02-performance/) và [Độ trễ](../../1-nen-tang/03-latency/): muốn tối ưu thì trước hết phải đo được.

## Ba trụ cột và câu hỏi mỗi cái trả lời



<figure class="ccf-figure"><a href="../../guides/logging-tracing-metrics/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0264-logging-tracing-metrics.png" alt="Logging, Tracing, and Metrics" loading="lazy" /><figcaption><strong>Logging, Tracing, and Metrics</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



| Tín hiệu | Trả lời câu hỏi | Dạng dữ liệu | Chi phí |
|---|---|---|---|
| Metrics | "Có gì bất thường? Tệ đến mức nào?" | Con số theo thời gian, đã gộp | Rẻ, lưu được lâu |
| Logs | "Chính xác đã xảy ra gì?" | Sự kiện rời rạc, chi tiết | Đắt khi lưu lượng lớn |
| Traces | "Request đi qua đâu, chậm ở bước nào?" | Cây các span của một request | Trung bình, thường lấy mẫu |

Luồng điều tra điển hình: metric báo động (tỉ lệ lỗi tăng) → trace chỉ ra service gây lỗi → log của service đó cho biết nguyên nhân. Ba tín hiệu mạnh nhất khi **liên kết được với nhau**, thường qua một `trace_id` chung.

## Logging

### Structured logging

Log văn bản tự do như `User 42 failed to pay order 991` dễ đọc với người nhưng khó truy vấn. **Structured logging** ghi mỗi sự kiện thành bản ghi có trường rõ ràng, thường là JSON:

```json
{"level":"error","service":"payment","msg":"charge failed",
 "order_id":991,"trace_id":"4bf92f35...","error":"card_declined"}
```

Nhờ vậy có thể lọc `service=payment AND error=card_declined` hay nhảy từ một trace sang đúng các dòng log liên quan. Dùng level nhất quán, luôn kèm `trace_id`, và **không** ghi mật khẩu, token, dữ liệu cá nhân nhạy cảm (xem [Bảo mật](../../2-khoi-xay-dung/08-security/)).

### Log tập trung

Container có thể bị xoá bất cứ lúc nào (xem [Container](../../6-hien-dai/07-modern-containers/)), nên log không thể chỉ nằm trên đĩa máy chạy. Mô hình phổ biến: ứng dụng ghi ra stdout → agent thu thập (Fluent Bit, Vector, OpenTelemetry Collector…) → kho lưu và tìm kiếm (Elasticsearch/OpenSearch, Loki, dịch vụ đám mây) → giao diện truy vấn. Sơ đồ dưới đây minh hoạ một stack quen thuộc theo mô hình này.



<figure class="ccf-figure"><a href="../../guides/what-is-elk-stack-and-why-is-it-so-popular-for-log-management/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0183-elk.jpg" alt="What is ELK Stack and Why is it Popular?" loading="lazy" /><figcaption><strong>What is ELK Stack and Why is it Popular?</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



## Metrics

Metric là con số đo định kỳ, có tên và các **label** (nhãn), ví dụ `http_requests_total{service="cart",status="500"}`. Ba kiểu cơ bản (tên theo Prometheus/OpenTelemetry):

- **Counter**: chỉ tăng (reset về 0 khi tiến trình khởi động lại), như số request, số lỗi. Thường ta xem *tốc độ tăng*.
- **Gauge**: giá trị lên xuống tại một thời điểm, như bộ nhớ đang dùng, độ dài hàng đợi.
- **Histogram**: đếm số quan sát rơi vào các bucket (latency < 50 ms, < 100 ms…), từ đó ước lượng phân vị.

### Vì sao dùng p50/p99 thay vì trung bình

Trung bình che giấu phần đuôi. Nếu 99 request mất 20 ms và 1 request mất 3 giây, trung bình khoảng 50 ms trông ổn, nhưng cứ 100 người có một người chờ 3 giây. **Percentile** sát trải nghiệm hơn: p50 là mức điển hình, p99 là ngưỡng mà 99% request nhanh hơn. Đuôi càng quan trọng khi một trang gọi hàng chục backend song song, vì trang chỉ xong khi lời gọi chậm nhất xong.

Lưu ý: **không thể lấy trung bình các percentile** của nhiều server để ra percentile toàn cục. Histogram giải quyết được vì bucket của các instance cộng lại được rồi mới tính phân vị; độ chính xác phụ thuộc cách chọn bucket.

Metric được thu thập kiểu **pull** (server giám sát định kỳ gọi endpoint của ứng dụng, như Prometheus) hoặc **push** (ứng dụng gửi về collector); sơ đồ dưới đây so sánh hai cách. Bộ khởi đầu tốt là bốn "golden signal" trong sách SRE của Google: **latency, traffic, errors, saturation**.



<figure class="ccf-figure"><a href="../../guides/push-vs-pull-in-metrics-collecting-systems/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0274-metrics-push-pull.png" alt="Push vs Pull in Metrics Collection Systems" loading="lazy" /><figcaption><strong>Push vs Pull in Metrics Collection Systems</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



## Distributed tracing

Một **trace** là hành trình của một request qua hệ thống, gồm nhiều **span**. Mỗi span là một đơn vị công việc (lời gọi HTTP, truy vấn SQL) có thời điểm bắt đầu, thời lượng, thuộc tính và trỏ tới span cha. Ghép lại thành cây, hiển thị dạng thác nước cho thấy ngay bước nào tốn thời gian nhất.

**Propagate context**: để span ở nhiều service thuộc cùng một trace, mỗi service phải truyền `trace_id` và span hiện tại sang lời gọi kế tiếp qua header; chuẩn W3C Trace Context định nghĩa header `traceparent`. Với hàng đợi (xem [Bất đồng bộ](../../2-khoi-xay-dung/07-async/)), context nằm trong metadata của message. Một service ở giữa làm rơi header là trace bị đứt.

**OpenTelemetry (OTel)** là dự án mã nguồn mở của CNCF, cung cấp API, SDK và giao thức OTLP thống nhất cho traces, metrics và logs, không phụ thuộc nhà cung cấp. Instrument một lần, rồi qua OpenTelemetry Collector gửi tới backend tuỳ chọn (Jaeger, Grafana Tempo, Prometheus, dịch vụ thương mại).

**Sampling**: ghi trace cho mọi request rất tốn, nên thường lấy mẫu. *Head sampling* quyết định ngay đầu request (giữ 1%), đơn giản nhưng có thể bỏ sót request lỗi; *tail sampling* quyết định khi trace đã xong (giữ mọi trace lỗi hoặc chậm), hữu ích hơn nhưng collector phải đệm dữ liệu.

## SLI, SLO, SLA và error budget

- **SLI** (Service Level Indicator): chỉ số đo được, ví dụ tỉ lệ request thành công trong dưới 300 ms.
- **SLO** (Service Level Objective): mục tiêu nội bộ cho SLI, ví dụ 99,9% trong mỗi cửa sổ 30 ngày.
- **SLA** (Service Level Agreement): cam kết với khách hàng kèm hậu quả (hoàn tiền). Thường lỏng hơn SLO để có khoảng an toàn.

**Error budget** = 100% − SLO. Với SLO 99,9% trong 30 ngày, ngân sách là khoảng 43 phút. Còn ngân sách thì đội được deploy nhanh, thử nghiệm; gần hết thì ưu tiên ổn định. Về các mức "số 9" xem [Tính sẵn sàng](../../3-he-phan-tan/03-availability/).

## Alerting theo triệu chứng

**Alert vào triệu chứng người dùng cảm nhận, không vào nguyên nhân.** "Tỉ lệ lỗi checkout vượt SLO" đáng đánh thức người trực; "CPU một máy 90%" có thể chẳng ảnh hưởng ai, nên để trên dashboard. Alert tốt phải cần hành động ngay và có runbook. Cách phổ biến dựa trên SLO là cảnh báo theo **burn rate** (tốc độ tiêu error budget): tiêu nhanh thì page ngay, tiêu chậm thì tạo ticket. Quá nhiều alert vô nghĩa gây "alert fatigue": người trực quen bỏ qua và lỡ alert thật.

## Chi phí và cardinality

Dữ liệu observability có thể tốn ngang hạ tầng chạy ứng dụng. Thủ phạm lớn nhất với metrics là **cardinality**: số tổ hợp giá trị label, mỗi tổ hợp là một time series. `status` × `endpoint` vài trăm series là ổn; thêm label `user_id` sẽ nổ thành hàng triệu series. Quy tắc: thông tin cardinality cao (user_id, order_id, URL đầy đủ) đặt trong **log hoặc trace**, không đặt trong label metric. Ngoài ra: lấy mẫu trace, giảm log level, giữ dữ liệu chi tiết ngắn ngày.

## Khi nào dùng / không dùng

- Một service nhỏ: log tập trung và vài metric cơ bản thường đủ; tracing phân tán chưa đáng công.
- Microservices, nhiều đội: tracing và SLO gần như bắt buộc.
- Đừng thu thập "mọi thứ phòng khi cần"; bắt đầu từ SLO.

## Đánh đổi

- **Chi tiết vs chi phí**: log, trace đầy đủ dễ gỡ lỗi nhưng tốn lưu trữ; lấy mẫu có thể mất đúng request cần xem.
- **Pull vs push**: pull dễ phát hiện target chết; push hợp với job ngắn hạn hoặc mạng mà server giám sát không gọi vào được.
- **Tự vận hành vs dịch vụ**: mã nguồn mở tốn công vận hành; dịch vụ tính phí theo lượng dữ liệu, dễ vỡ hoá đơn khi cardinality tăng.

## Trong phỏng vấn

Khi trình bày thiết kế (xem [Cách tiếp cận](../../4-thuc-chien/01-approach/)), dành một phút cuối cho observability: "Mỗi service phát metrics rate/errors/duration qua OpenTelemetry, log JSON kèm trace_id về hệ thống tập trung, tracing có tail sampling cho request lỗi; SLO checkout 99,9% dưới 500 ms, alert theo burn rate." Câu hỏi hay gặp: vì sao p99 quan trọng hơn trung bình; tìm nguyên nhân request chậm qua nhiều service thế nào; alert vào metric nào; chi phí metrics tăng vọt thì kiểm tra gì (cardinality).

## Đọc thêm

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [OpenTelemetry: Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
