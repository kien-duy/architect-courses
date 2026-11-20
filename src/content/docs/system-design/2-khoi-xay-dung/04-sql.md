---
title: "Database quan hệ: replication, federation, sharding"
description: "RDBMS đảm bảo ACID: atomicity, consistency, isolation, durability."
lesson:
  group: "Các khối xây dựng"
  minutes: 25
quiz:
  - q: "Bảng users quá lớn cho một máy. Chia user A–M vào DB1, N–Z vào DB2 là kỹ thuật gì?"
    options: ["Federation", "Sharding", "Denormalization", "Replication"]
    answer: 1
    why: "Chia cùng một loại dữ liệu ra nhiều database là sharding. Federation chia theo chức năng (users, products, forums)."
  - q: "Hệ thống đọc nhiều gấp 100 lần ghi. Giải pháp đơn giản nhất để scale đọc là gì?"
    options: ["Master-slave replication với read replicas", "Bỏ index", "Chuyển sang file CSV", "Master-master với mọi node đều ghi"]
    answer: 0
    why: "Thêm slave để phục vụ đọc, master xử lý ghi."
cards:
  - q: "Bốn tính chất ACID của transaction là gì?"
    a: "Atomicity: tất cả hoặc không gì cả. Consistency: chuyển DB từ trạng thái hợp lệ này sang trạng thái hợp lệ khác. Isolation: chạy đồng thời cho kết quả như chạy tuần tự. Durability: đã commit thì không mất."
  - q: "Trong master-slave replication, master chết thì hệ thống ra sao?"
    a: "Hệ thống vẫn chạy ở chế độ chỉ đọc cho tới khi một slave được promote thành master hoặc dựng master mới. Việc promote cần thêm logic."
  - q: "Master-master replication có ưu điểm gì so với master-slave?"
    a: "Cả hai master đều phục vụ đọc và ghi; nếu một master sập, hệ thống vẫn tiếp tục đọc và ghi được."
  - q: "Nhược điểm của master-master replication?"
    a: "Cần load balancer hoặc logic ứng dụng để chọn nơi ghi; đa số hoặc nhất quán lỏng (vi phạm ACID) hoặc tăng write latency do đồng bộ; xung đột càng nhiều khi thêm node ghi và latency tăng."
  - q: "Vì sao replication có thể gây mất dữ liệu?"
    a: "Nếu master hỏng trước khi dữ liệu mới ghi kịp được replicate sang các node khác thì phần dữ liệu đó bị mất."
  - q: "Vì sao thêm quá nhiều read replica hoặc ghi quá nhiều lại hại?"
    a: "Replica phải replay mọi lệnh ghi, ghi nhiều thì chúng bận replay và đọc được ít hơn. Càng nhiều slave càng phải replicate nhiều, replication lag càng lớn. Replica thường ghi tuần tự một thread."
  - q: "Federation (functional partitioning) là gì và lợi ích ra sao?"
    a: "Chia database theo chức năng, ví dụ forums, users, products. Mỗi DB ít traffic hơn, ít replication lag, dữ liệu vừa RAM hơn nên cache hit cao, và ghi song song được vì không có master trung tâm."
  - q: "Nhược điểm chính của sharding?"
    a: "Logic ứng dụng phức tạp hơn; dữ liệu có thể lệch (power user dồn vào một shard), rebalancing phức tạp; join giữa nhiều shard khó; thêm phần cứng. Consistent hashing giúp giảm dữ liệu phải di chuyển."
  - q: "Denormalization đánh đổi gì và khi nào nên dùng?"
    a: "Hy sinh một phần hiệu năng ghi để đọc nhanh hơn, bằng cách lưu bản sao dư thừa để tránh join đắt. Hợp khi đọc áp đảo ghi (100:1 hay 1000:1); dưới tải ghi nặng có thể chậm hơn bản normalized."
  - q: "Index trong RDBMS có cái giá gì?"
    a: "Index (thường là B-tree) tăng tốc truy vấn nhưng tốn thêm bộ nhớ và làm ghi chậm hơn vì phải cập nhật index. Khi nạp dữ liệu lớn, có thể tắt index, nạp xong rồi build lại."
---

:::tip[Ý chính]
- RDBMS đảm bảo ACID: atomicity, consistency, isolation, durability.
- Replication master-slave để scale đọc; master-master để ghi ở nhiều nơi, đổi lại phức tạp hơn và dễ xung đột.
- Federation chia database theo chức năng; sharding chia dữ liệu cùng loại ra nhiều database.
- Denormalization đổi chi phí ghi lấy tốc độ đọc. SQL tuning: schema chặt, index tốt, tránh join đắt.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Database

<p align="center">
  <img src="../../../sd-images/Xkm5CXz.png">
  <br/>
  <i><a href=https://www.youtube.com/watch?v=kKjm4ehYiMs>Source: Scaling up to your first 10 million users</a></i>
</p>

### Relational database management system (RDBMS)

A relational database like SQL is a collection of data items organized in tables.

**ACID** is a set of properties of relational database [transactions](https://en.wikipedia.org/wiki/Database_transaction "Trang Wikipedia về database transaction: đơn vị công việc, thuộc tính ACID và cách xử lý lỗi. Nền tảng để hiểu tính nhất quán trong cơ sở dữ liệu.").

* **Atomicity** - Each transaction is all or nothing
* **Consistency** - Any transaction will bring the database from one valid state to another
* **Isolation** - Executing transactions concurrently has the same results as if the transactions were executed serially
* **Durability** - Once a transaction has been committed, it will remain so

There are many techniques to scale a relational database: **master-slave replication**, **master-master replication**, **federation**, **sharding**, **denormalization**, and **SQL tuning**.

#### Master-slave replication

The master serves reads and writes, replicating writes to one or more slaves, which serve only reads.  Slaves can also replicate to additional slaves in a tree-like fashion.  If the master goes offline, the system can continue to operate in read-only mode until a slave is promoted to a master or a new master is provisioned.

<p align="center">
  <img src="../../../sd-images/C9ioGtn.png">
  <br/>
  <i><a href=http://www.slideshare.net/jboner/scalability-availability-stability-patterns/>Source: Scalability, availability, stability, patterns</a></i>
</p>

##### Disadvantage(s): master-slave replication

* Additional logic is needed to promote a slave to a master.
* See [Disadvantage(s): replication](#disadvantages-replication) for points related to **both** master-slave and master-master.

#### Master-master replication

Both masters serve reads and writes and coordinate with each other on writes.  If either master goes down, the system can continue to operate with both reads and writes.

<p align="center">
  <img src="../../../sd-images/krAHLGg.png">
  <br/>
  <i><a href=http://www.slideshare.net/jboner/scalability-availability-stability-patterns/>Source: Scalability, availability, stability, patterns</a></i>
</p>

##### Disadvantage(s): master-master replication

* You'll need a load balancer or you'll need to make changes to your application logic to determine where to write.
* Most master-master systems are either loosely consistent (violating ACID) or have increased write latency due to synchronization.
* Conflict resolution comes more into play as more write nodes are added and as latency increases.
* See [Disadvantage(s): replication](#disadvantages-replication) for points related to **both** master-slave and master-master.

##### Disadvantage(s): replication

* There is a potential for loss of data if the master fails before any newly written data can be replicated to other nodes.
* Writes are replayed to the read replicas.  If there are a lot of writes, the read replicas can get bogged down with replaying writes and can't do as many reads.
* The more read slaves, the more you have to replicate, which leads to greater replication lag.
* On some systems, writing to the master can spawn multiple threads to write in parallel, whereas read replicas only support writing sequentially with a single thread.
* Replication adds more hardware and additional complexity.

##### Source(s) and further reading: replication

* [Scalability, availability, stability, patterns](http://www.slideshare.net/jboner/scalability-availability-stability-patterns/ "Bộ slide của Jonas Bonér tổng hợp các pattern về scalability, availability, stability: trade-off latency/throughput, consistency/availability và các kỹ thuật liên quan. Bản tổng quan tốt.")
* [Multi-master replication](https://en.wikipedia.org/wiki/Multi-master_replication "Bài Wikipedia về multi-master replication, nơi nhiều nút cùng nhận ghi và đồng bộ cho nhau, kèm vấn đề xung đột ghi. Giúp so sánh với replication master-slave.")

#### Federation

<p align="center">
  <img src="../../../sd-images/U3qV33e.png">
  <br/>
  <i><a href=https://www.youtube.com/watch?v=kKjm4ehYiMs>Source: Scaling up to your first 10 million users</a></i>
</p>

Federation (or functional partitioning) splits up databases by function.  For example, instead of a single, monolithic database, you could have three databases: **forums**, **users**, and **products**, resulting in less read and write traffic to each database and therefore less replication lag.  Smaller databases result in more data that can fit in memory, which in turn results in more cache hits due to improved cache locality.  With no single central master serializing writes you can write in parallel, increasing throughput.

##### Disadvantage(s): federation

* Federation is not effective if your schema requires huge functions or tables.
* You'll need to update your application logic to determine which database to read and write.
* Joining data from two databases is more complex with a [server link](https://web.archive.org/web/20260324155305/https://stackoverflow.com/questions/5145637/querying-data-by-joining-two-tables-in-two-database-on-different-servers "Câu hỏi Stack Overflow về cách join hai bảng nằm trên hai database server khác nhau. Minh họa khó khăn của join giữa các shard và các cách xử lý ở tầng ứng dụng.").
* Federation adds more hardware and additional complexity.

##### Source(s) and further reading: federation

* [Scaling up to your first 10 million users](https://www.youtube.com/watch?v=kKjm4ehYiMs "Bài nói của AWS về cách mở rộng ứng dụng từ một người dùng đến 10 triệu, theo từng giai đoạn thêm load balancer, database replica, cache và microservices.")

#### Sharding

<p align="center">
  <img src="../../../sd-images/wU8x5Id.png">
  <br/>
  <i><a href=http://www.slideshare.net/jboner/scalability-availability-stability-patterns/>Source: Scalability, availability, stability, patterns</a></i>
</p>

Sharding distributes data across different databases such that each database can only manage a subset of the data.  Taking a users database as an example, as the number of users increases, more shards are added to the cluster.

Similar to the advantages of [federation](#federation), sharding results in less read and write traffic, less replication, and more cache hits.  Index size is also reduced, which generally improves performance with faster queries.  If one shard goes down, the other shards are still operational, although you'll want to add some form of replication to avoid data loss.  Like federation, there is no single central master serializing writes, allowing you to write in parallel with increased throughput.

Common ways to shard a table of users is either through the user's last name initial or the user's geographic location.

##### Disadvantage(s): sharding

* You'll need to update your application logic to work with shards, which could result in complex SQL queries.
* Data distribution can become lopsided in a shard.  For example, a set of power users on a shard could result in increased load to that shard compared to others.
    * Rebalancing adds additional complexity.  A sharding function based on [consistent hashing](http://www.paperplanes.de/2011/12/9/the-magic-of-consistent-hashing.html "Bài viết giải thích consistent hashing một cách dễ hiểu: cách xác định node chứa key trong cluster và giảm xáo trộn khi thêm bớt node. Nền tảng cho sharding và distributed cache.") can reduce the amount of transferred data.
* Joining data from multiple shards is more complex.
* Sharding adds more hardware and additional complexity.

##### Source(s) and further reading: sharding

* [The coming of the shard](http://highscalability.com/blog/2009/8/6/an-unorthodox-approach-to-database-design-the-coming-of-the.html "Bài trên High Scalability về việc tách cơ sở dữ liệu thành các shard khi một máy không còn đủ, kèm các bài cập nhật bàn về ưu nhược điểm và thời điểm nên sharding.")
* [Shard database architecture](https://en.wikipedia.org/wiki/Shard_(database_architecture))
* [Consistent hashing](http://www.paperplanes.de/2011/12/9/the-magic-of-consistent-hashing.html "Bài viết giải thích consistent hashing một cách dễ hiểu: cách xác định node chứa key trong cluster và giảm xáo trộn khi thêm bớt node. Nền tảng cho sharding và distributed cache.")

#### Denormalization

Denormalization attempts to improve read performance at the expense of some write performance.  Redundant copies of the data are written in multiple tables to avoid expensive joins.  Some RDBMS such as [PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL "Bài Wikipedia về PostgreSQL, hệ quản trị CSDL quan hệ mã nguồn mở: lịch sử, tính năng, MVCC và replication. Hiểu thêm một lựa chọn RDBMS phổ biến.") and Oracle support [materialized views](https://en.wikipedia.org/wiki/Materialized_view "Bài Wikipedia về materialized view, kết quả truy vấn được lưu sẵn trong database để đọc nhanh, cùng các cách làm mới dữ liệu.") which handle the work of storing redundant information and keeping redundant copies consistent.

Once data becomes distributed with techniques such as [federation](#federation) and [sharding](#sharding), managing joins across data centers further increases complexity.  Denormalization might circumvent the need for such complex joins.

In most systems, reads can heavily outnumber writes 100:1 or even 1000:1.  A read resulting in a complex database join can be very expensive, spending a significant amount of time on disk operations.

##### Disadvantage(s): denormalization

* Data is duplicated.
* Constraints can help redundant copies of information stay in sync, which increases complexity of the database design.
* A denormalized database under heavy write load might perform worse than its normalized counterpart.

###### Source(s) and further reading: denormalization

* [Denormalization](https://en.wikipedia.org/wiki/Denormalization "Bài Wikipedia về denormalization: chủ động thêm dư thừa vào CSDL đã chuẩn hóa để tăng tốc đọc, đổi lại ghi phức tạp hơn. Giúp hiểu đánh đổi giữa read và write.")

#### SQL tuning

SQL tuning is a broad topic and many [books](https://web.archive.org/web/20241006125511/https://www.amazon.com/s/ref=nb_sb_noss_2?url=search-alias%3Daps&field-keywords=sql+tuning "Trang kết quả tìm kiếm sách về SQL tuning trên Amazon, không phải nội dung học tập.") have been written as reference.

It's important to **benchmark** and **profile** to simulate and uncover bottlenecks.

* **Benchmark** - Simulate high-load situations with tools such as [ab](http://httpd.apache.org/docs/2.2/programs/ab.html "Tài liệu của công cụ ab (ApacheBench) để benchmark HTTP server: cách chạy, tham số và đọc kết quả. Hữu ích khi cần load test đơn giản cho web server.").
* **Profile** - Enable tools such as the [slow query log](https://web.archive.org/web/20260720070934/https://dev.mysql.com/doc/refman/5.7/en/slow-query-log.html "Tài liệu MySQL giải thích slow query log, cách bật và cấu hình để ghi lại các truy vấn chạy chậm. Giúp bạn tìm và tối ưu truy vấn khi tuning hiệu năng database.") to help track performance issues.

Benchmarking and profiling might point you to the following optimizations.

##### Tighten up the schema

* MySQL dumps to disk in contiguous blocks for fast access.
* Use `CHAR` instead of `VARCHAR` for fixed-length fields.
    * `CHAR` effectively allows for fast, random access, whereas with `VARCHAR`, you must find the end of a string before moving onto the next one.
* Use `TEXT` for large blocks of text such as blog posts.  `TEXT` also allows for boolean searches.  Using a `TEXT` field results in storing a pointer on disk that is used to locate the text block.
* Use `INT` for larger numbers up to 2^32 or 4 billion.
* Use `DECIMAL` for currency to avoid floating point representation errors.
* Avoid storing large `BLOBS`, store the location of where to get the object instead.
* `VARCHAR(255)` is the largest number of characters that can be counted in an 8 bit number, often maximizing the use of a byte in some RDBMS.
* Set the `NOT NULL` constraint where applicable to [improve search performance](https://web.archive.org/web/20260324161953/https://stackoverflow.com/questions/1017239/how-do-null-values-affect-performance-in-a-database-search "Câu hỏi Stack Overflow về ảnh hưởng của giá trị NULL đến hiệu năng tìm kiếm trong database và index. Phần trả lời giúp hiểu cách index xử lý NULL.").

##### Use good indices

* Columns that you are querying (`SELECT`, `GROUP BY`, `ORDER BY`, `JOIN`) could be faster with indices.
* Indices are usually represented as self-balancing [B-tree](https://en.wikipedia.org/wiki/B-tree "Bài Wikipedia về B-tree, cấu trúc cây cân bằng cho phép tìm kiếm, chèn, xóa trong O(log n) và tối ưu cho đọc ghi theo block. Nền tảng của index trong cơ sở dữ liệu quan hệ.") that keeps data sorted and allows searches, sequential access, insertions, and deletions in logarithmic time.
* Placing an index can keep the data in memory, requiring more space.
* Writes could also be slower since the index also needs to be updated.
* When loading large amounts of data, it might be faster to disable indices, load the data, then rebuild the indices.

##### Avoid expensive joins

* [Denormalize](#denormalization) where performance demands it.

##### Partition tables

* Break up a table by putting hot spots in a separate table to help keep it in memory.

##### Tune the query cache

* In some cases, the [query cache](https://web.archive.org/web/20260811114045/https://dev.mysql.com/doc/refman/5.7/en/query-cache.html "Tài liệu MySQL 5.7 về query cache: cách lưu kết quả SELECT, khi nào bị vô hiệu hóa và cấu hình. Minh họa caching ở tầng database cùng hạn chế của nó.") could lead to [performance issues](https://www.percona.com/blog/2016/10/12/mysql-5-7-performance-tuning-immediately-after-installation/ "Bài của Percona hướng dẫn các tham số cấu hình MySQL 5.7 nên chỉnh ngay sau khi cài, như bộ nhớ InnoDB và log. Hữu ích khi tối ưu hiệu năng database.").

##### Source(s) and further reading: SQL tuning

* [Tips for optimizing MySQL queries](https://web.archive.org/web/20230328150100/https://aiddroid.com/10-tips-optimizing-mysql-queries-dont-suck/ "Bài viết liệt kê các mẹo tối ưu truy vấn MySQL như dùng index hợp lý, tránh SELECT *, phân tích bằng EXPLAIN. Hữu ích khi tìm hiểu cách tăng hiệu năng tầng database.")
* [Is there a good reason i see VARCHAR(255) used so often?](https://web.archive.org/web/20260310042152/https://stackoverflow.com/questions/1217466/is-there-a-good-reason-i-see-varchar255-used-so-often-as-opposed-to-another-l "Câu hỏi Stack Overflow giải thích vì sao VARCHAR(255) xuất hiện nhiều: lý do lịch sử về giới hạn độ dài 1 byte và tối ưu lưu trữ. Giúp hiểu cách chọn kiểu dữ liệu khi thiết kế schema.")
* [How do null values affect performance?](https://web.archive.org/web/20260324161953/https://stackoverflow.com/questions/1017239/how-do-null-values-affect-performance-in-a-database-search "Câu hỏi Stack Overflow về ảnh hưởng của giá trị NULL đến hiệu năng tìm kiếm trong database và index. Phần trả lời giúp hiểu cách index xử lý NULL.")
* [Slow query log](https://web.archive.org/web/20260720070934/https://dev.mysql.com/doc/refman/5.7/en/slow-query-log.html "Tài liệu MySQL giải thích slow query log, cách bật và cấu hình để ghi lại các truy vấn chạy chậm. Giúp bạn tìm và tối ưu truy vấn khi tuning hiệu năng database.")
