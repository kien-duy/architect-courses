---
title: "Data pipeline: OLTP, OLAP và dòng dữ liệu"
description: "OLTP phục vụ giao dịch ngắn với lưu trữ theo dòng, còn OLAP phục vụ phân tích quét nhiều dòng với lưu trữ theo cột, nén tốt và chỉ đọc cột cần thiết."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 9
quiz:
  - q: "Vì sao lưu trữ theo cột (columnar) thường nhanh hơn cho truy vấn phân tích?"
    options: ["Vì nó hỗ trợ giao dịch ACID tốt hơn", "Vì cập nhật một dòng đơn lẻ rẻ hơn", "Vì nó luôn nằm trong RAM", "Vì truy vấn chỉ đọc các cột cần dùng và dữ liệu cùng cột nén rất tốt"]
    answer: 3
    why: "Phân tích thường chỉ chạm vài cột trên rất nhiều dòng; lưu theo cột giảm lượng dữ liệu đọc và nén hiệu quả. Đổi lại, ghi từng dòng đắt hơn."
  - q: "Sau khi lưu đơn hàng vào DB, service cần phát sự kiện OrderCreated lên Kafka một cách tin cậy. Cách nào tốt nhất?"
    options: ["Ghi DB rồi gửi Kafka trong cùng hàm, nếu lỗi thì log ra", "Ghi sự kiện vào bảng outbox trong cùng giao dịch với đơn hàng, rồi dùng CDC hoặc relay phát lên Kafka", "Gửi Kafka trước, sau đó mới ghi DB", "Chạy job batch mỗi đêm để so sánh hai bên"]
    answer: 1
    why: "Outbox gắn sự kiện vào cùng giao dịch với dữ liệu nghiệp vụ nên không thể lệch; consumer cần idempotent vì sự kiện có thể gửi lại."
  - q: "Báo cáo doanh thu chỉ cần cập nhật mỗi sáng. Lựa chọn nào hợp lý nhất?"
    options: ["Batch ETL/ELT chạy hằng đêm vào warehouse", "Stream processing với độ trễ vài giây", "Chạy truy vấn tổng hợp trực tiếp trên database OLTP chính mỗi lần mở báo cáo", "Dual write vào warehouse từ ứng dụng"]
    answer: 0
    why: "Yêu cầu độ tươi theo ngày nên batch rẻ và dễ vận hành hơn streaming; truy vấn nặng trên OLTP chính ảnh hưởng người dùng."
cards:
  - q: "OLTP và OLAP khác nhau ở kiểu truy vấn nào?"
    a: "OLTP: nhiều truy vấn ngắn đọc/ghi vài dòng theo khoá, cần latency thấp. OLAP: ít truy vấn nhưng quét và tổng hợp rất nhiều dòng."
  - q: "Schema-on-write và schema-on-read là gì?"
    a: "Schema-on-write (warehouse) bắt dữ liệu khớp schema khi ghi. Schema-on-read (data lake) lưu dữ liệu thô và chỉ áp schema lúc đọc."
  - q: "Lakehouse bổ sung gì cho data lake?"
    a: "Một lớp table format như Delta Lake, Iceberg hoặc Hudi, đem lại giao dịch ACID, quản lý schema và phiên bản trên file nằm ở object storage."
  - q: "Ưu điểm chính của ELT so với ETL?"
    a: "Dữ liệu thô được nạp trước nên có thể biến đổi lại khi logic thay đổi, và tận dụng sức tính toán của warehouse trên cloud."
  - q: "Vì sao stream processing khó hơn batch?"
    a: "Phải xử lý sự kiện đến muộn hoặc sai thứ tự, phân biệt event time và processing time, quản lý state và tránh đếm trùng khi khởi động lại."
  - q: "Log-based CDC hoạt động thế nào?"
    a: "Đọc log sẵn có của DB (binlog MySQL, WAL PostgreSQL) để phát mỗi insert/update/delete đã commit thành sự kiện theo thứ tự, thường đẩy vào Kafka, ví dụ bằng Debezium."
  - q: "CDC dựa trên cột `updated_at` có hạn chế gì?"
    a: "Tăng tải do poll định kỳ, có độ trễ theo chu kỳ poll và không bắt được các dòng bị xoá cứng."
  - q: "Dual write là gì và vì sao nguy hiểm?"
    a: "Ứng dụng ghi DB rồi tự gửi message lên broker. Không có giao dịch chung nên nếu một bước lỗi, hai hệ lệch nhau mà không ai phát hiện."
---

:::tip[Ý chính]
- OLTP phục vụ giao dịch ngắn với lưu trữ theo dòng, còn OLAP phục vụ phân tích quét nhiều dòng với lưu trữ theo cột, nén tốt và chỉ đọc cột cần thiết.
- Warehouse, lake và lakehouse là các cách lưu dữ liệu phân tích; ETL/ELT và batch/stream là các cách đưa và xử lý dữ liệu vào đó.
- Change Data Capture đọc log của database để đồng bộ search, cache, warehouse; outbox pattern tránh lỗi dual write, với đánh đổi giữa độ tươi và chi phí.
:::

Database phục vụ ứng dụng được tối ưu cho hàng nghìn thao tác nhỏ mỗi giây: đặt một đơn hàng, cập nhật một hồ sơ. Nhưng khi đội kinh doanh hỏi "doanh thu theo vùng trong 12 tháng qua", câu truy vấn phải quét hàng trăm triệu dòng. Chạy nó trên database chính vừa chậm vừa làm ảnh hưởng tới người dùng thật.

Vì thế hầu hết công ty có hai thế giới dữ liệu: một bên phục vụ giao dịch, một bên phục vụ phân tích, và giữa chúng là các **data pipeline** (đường ống dữ liệu) để di chuyển, biến đổi và đồng bộ dữ liệu. Bài này giải thích các khái niệm nền tảng của dòng dữ liệu đó.

## OLTP và OLAP

**OLTP** (Online Transaction Processing) là khối lượng công việc của ứng dụng: nhiều truy vấn ngắn, đọc/ghi vài dòng theo khoá, cần latency thấp và tính đúng đắn giao dịch. Ví dụ: database [SQL](../../2-khoi-xay-dung/04-sql/) như PostgreSQL, MySQL và nhiều hệ [NoSQL](../../2-khoi-xay-dung/05-nosql/).

**OLAP** (Online Analytical Processing) là khối lượng công việc phân tích: ít truy vấn hơn nhưng mỗi truy vấn quét rất nhiều dòng, thường chỉ dùng vài cột, rồi tổng hợp (SUM, COUNT, GROUP BY).

### Row storage và columnar storage

Khác biệt cốt lõi nằm ở cách lưu dữ liệu trên đĩa:

- **Row-oriented** (lưu theo dòng): các cột của một dòng nằm cạnh nhau. Đọc/ghi trọn một bản ghi rất nhanh, phù hợp OLTP.
- **Column-oriented** (lưu theo cột): mọi giá trị của một cột nằm cạnh nhau. Truy vấn chỉ cần 3 trong 50 cột thì chỉ đọc 3 cột đó. Các giá trị cùng kiểu và thường lặp lại nên nén rất tốt, và CPU có thể xử lý theo lô (vectorized). Đổi lại, cập nhật một dòng đơn lẻ đắt hơn vì phải chạm vào nhiều vùng lưu trữ.

| Tiêu chí | OLTP | OLAP |
|---|---|---|
| Kiểu truy vấn | Ngắn, theo khoá, đọc/ghi vài dòng | Quét và tổng hợp nhiều dòng |
| Lưu trữ thường gặp | Theo dòng | Theo cột |
| Người dùng | Ứng dụng, người dùng cuối | Analyst, dashboard, ML |
| Ưu tiên | Latency thấp, giao dịch | Throughput quét, chi phí trên mỗi TB |

## Data warehouse, data lake, lakehouse

- **Data warehouse**: kho dữ liệu đã được làm sạch và có schema rõ ràng, tối ưu cho SQL phân tích. Dữ liệu phải khớp schema khi ghi vào (schema-on-write). Ví dụ: BigQuery, Snowflake, Amazon Redshift.
- **Data lake**: lưu dữ liệu thô ở định dạng gốc (JSON, CSV, log, ảnh, hoặc file cột như Parquet) trên object storage giá rẻ như S3. Schema chỉ được áp khi đọc (schema-on-read). Linh hoạt và rẻ, nhưng dễ thành "đầm lầy dữ liệu" nếu thiếu quản lý metadata và chất lượng.
- **Lakehouse**: cố gắng lấy cái tốt của cả hai. Dữ liệu vẫn nằm trong file trên object storage, nhưng một lớp "table format" (Delta Lake, Apache Iceberg, Apache Hudi) bổ sung giao dịch ACID, quản lý schema và phiên bản, để nhiều engine truy vấn như một bảng warehouse.



<figure class="ccf-figure"><a href="../../guides/key-data-terms/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0158-data-terms.png" alt="Key Data Terms" loading="lazy" /><figcaption><strong>Key Data Terms</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



## ETL và ELT

Cả hai đều gồm Extract (lấy dữ liệu từ nguồn), Transform (làm sạch, ghép, tính toán) và Load (nạp vào đích). Khác nhau ở thứ tự:

- **ETL**: biến đổi trên một hệ trung gian rồi mới nạp vào warehouse. Phổ biến khi warehouse đắt và năng lực tính toán hạn chế. Ưu điểm: dữ liệu vào kho đã sạch, có thể loại bỏ dữ liệu nhạy cảm trước khi nạp.
- **ELT**: nạp dữ liệu thô vào warehouse/lake trước, sau đó dùng chính sức mạnh tính toán của kho (thường bằng SQL) để biến đổi. Phổ biến hơn từ khi warehouse trên cloud tách lưu trữ và tính toán. Ưu điểm: giữ được dữ liệu gốc để biến đổi lại khi logic thay đổi. Nhược điểm: kho chứa cả dữ liệu thô, cần kiểm soát quyền truy cập kỹ hơn.

## Batch và stream processing



<figure class="ccf-figure"><a href="../../guides/data-pipelines-overview/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0157-data-pipeline-overview.png" alt="Data Pipelines Overview" loading="lazy" /><figcaption><strong>Data Pipelines Overview</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



**Batch processing** xử lý một khối dữ liệu có giới hạn theo lịch: ví dụ mỗi đêm tổng hợp toàn bộ đơn hàng của ngày hôm trước. Đơn giản, dễ chạy lại khi lỗi, tận dụng tốt tài nguyên. Mô hình MapReduce và sau này Apache Spark là các ví dụ tiêu biểu; bài [hệ thống thực tế](../../5-hoc-tiep/01-real-world/) có nhắc tới cách các công ty lớn dùng MapReduce/Spark.

**Stream processing** xử lý dữ liệu liên tục ngay khi sự kiện tới, thường đọc từ một log như Kafka ([xem bài streaming](../../6-hien-dai/04-modern-streaming/)) và dùng engine như Apache Flink, Kafka Streams hoặc Spark Structured Streaming. Phù hợp với phát hiện gian lận, dashboard thời gian thực, cảnh báo. Khó hơn đáng kể: phải xử lý sự kiện đến muộn hoặc sai thứ tự, phân biệt event time (lúc sự kiện xảy ra) với processing time (lúc hệ thống nhận), quản lý state và đảm bảo không đếm trùng khi khởi động lại.

Nhiều hệ thống kết hợp cả hai: stream cho số liệu "gần đúng, ngay bây giờ", batch chạy lại định kỳ để có số liệu chính xác cuối cùng.

## Change Data Capture (CDC)

Làm sao đưa thay đổi từ database OLTP sang các hệ khác (search index, [cache](../../2-khoi-xay-dung/06-cache/), warehouse) một cách tin cậy và gần thời gian thực?

### Các cách tiếp cận

- **Query-based**: định kỳ truy vấn các dòng có `updated_at` mới hơn lần trước. Đơn giản nhưng tăng tải cho DB, không bắt được thao tác xoá cứng, và có độ trễ theo chu kỳ poll.
- **Trigger-based**: trigger ghi thay đổi vào một bảng phụ. Bắt được mọi thao tác nhưng làm chậm mỗi lần ghi.
- **Log-based**: đọc trực tiếp log mà database vốn đã ghi để phục vụ replication và phục hồi, như binlog của MySQL hay WAL của PostgreSQL (qua logical decoding). Mỗi insert/update/delete đã commit được phát ra thành một sự kiện theo đúng thứ tự, gần như không thêm tải lên các truy vấn của ứng dụng. Debezium là công cụ mã nguồn mở phổ biến theo hướng này, thường đẩy sự kiện vào Kafka.



<figure class="ccf-figure"><a href="../../guides/change-data-capture-key-to-leverage-real-time-data/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0133-change-data-capture-key-to-leverage-real-time-data.png" alt="Change Data Capture: Key to Leverage Real-time Data" loading="lazy" /><figcaption><strong>Change Data Capture: Key to Leverage Real-time Data</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



### Ứng dụng

- Đồng bộ search index (ví dụ Elasticsearch) mỗi khi sản phẩm thay đổi.
- Xoá hoặc cập nhật cache khi dữ liệu gốc đổi, thay vì để ứng dụng tự lo.
- Nạp liên tục vào warehouse/lakehouse thay cho job batch dump toàn bảng hằng đêm.

### Dual write và outbox pattern

Cách ngây thơ là ứng dụng ghi DB rồi gửi thêm message lên broker (dual write). Không có giao dịch chung giữa hai hệ, nên nếu bước thứ hai lỗi thì chúng lệch nhau mà không ai biết.

**Outbox pattern** giải quyết bằng cách ghi sự kiện vào một bảng `outbox` **trong cùng giao dịch** với thay đổi nghiệp vụ. Giao dịch hoặc thành công cả hai, hoặc không có gì. Sau đó một tiến trình riêng (thường chính là CDC đọc log của bảng outbox) phát sự kiện ra broker. Sự kiện có thể bị gửi lại nhiều lần nên phía tiêu thụ cần xử lý [idempotent](../../6-hien-dai/06-modern-idempotency/). Đây cũng là một dạng [xử lý bất đồng bộ](../../2-khoi-xay-dung/07-async/) với [tính nhất quán](../../3-he-phan-tan/02-consistency/) sau cùng (eventual consistency).

## Độ tươi dữ liệu và chi phí

| Mức độ tươi | Cách thường dùng | Chi phí và độ phức tạp |
|---|---|---|
| Hằng ngày | Batch ETL/ELT ban đêm | Thấp, dễ vận hành |
| Vài phút tới hằng giờ | Micro-batch, CDC nạp theo lô | Trung bình |
| Vài giây | CDC + stream processing | Cao: cụm streaming chạy liên tục, xử lý state, theo dõi độ trễ |

Câu hỏi đúng là "ai cần dữ liệu tươi tới mức nào, với giá bao nhiêu": báo cáo cuối tháng không cần độ trễ vài giây, phát hiện gian lận thẻ thì cần.

## Khi nào dùng / không dùng

- Hệ nhỏ: một read replica của database chính có thể đủ cho báo cáo; chưa cần warehouse.
- Cần phân tích trên lượng dữ liệu lớn hoặc gộp nhiều nguồn: dùng warehouse/lakehouse, lưu theo cột.
- Cần đồng bộ nhiều hệ dẫn xuất (search, cache, analytics) từ một nguồn: ưu tiên log-based CDC thay vì để ứng dụng tự ghi nhiều nơi.
- Đừng chọn streaming chỉ vì nghe hiện đại nếu yêu cầu nghiệp vụ chấp nhận độ trễ vài giờ.

## Đánh đổi

Mỗi bản sao dữ liệu là thêm chi phí lưu trữ, thêm độ trễ đồng bộ và thêm chỗ có thể lệch. CDC phụ thuộc vào định dạng log nội bộ của DB và cấu hình giữ log; nếu consumer dừng quá lâu, log có thể đã bị xoá và phải snapshot lại. Thay đổi schema ở nguồn có thể làm vỡ pipeline phía sau nếu không có quy ước tương thích.

## Trong phỏng vấn

- Khi thiết kế hệ có phần thống kê (đếm lượt xem, dashboard quảng cáo), tách đường ghi OLTP khỏi đường phân tích, nêu rõ dữ liệu đi qua log/Kafka vào kho lưu theo cột.
- Khi cần search hoặc cache đồng bộ với DB, đề xuất CDC hoặc outbox thay vì dual write, và giải thích vì sao.
- Câu hỏi hay gặp: "Vì sao columnar nhanh cho phân tích?", "ETL khác ELT thế nào?", "Làm sao gửi sự kiện tin cậy sau khi ghi DB?", "Batch hay streaming cho bài toán này?".

## Đọc thêm

- [Debezium Documentation](https://debezium.io/documentation/reference/stable/index.html)
- [Transactional Outbox pattern (microservices.io)](https://microservices.io/patterns/data/transactional-outbox.html)
- [Apache Parquet Documentation](https://parquet.apache.org/docs/)
- [Lakehouse paper, CIDR 2021](https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf)
