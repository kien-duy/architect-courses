---
title: "NoSQL và chọn SQL hay NoSQL"
description: "NoSQL thường theo BASE và ưu tiên availability hơn consistency."
lesson:
  group: "Các khối xây dựng"
  minutes: 15
quiz:
  - q: "Lưu quan hệ bạn bè và tìm \"bạn của bạn\" phù hợp nhất với loại database nào?"
    options: ["Key-value store", "Document store", "Wide column store", "Graph database"]
    answer: 3
    why: "Graph database tối ưu cho quan hệ phức tạp, nhiều-nhiều."
  - q: "Trường hợp nào nghiêng về NoSQL?"
    options: ["Cần transaction phức tạp, nhiều join", "Dữ liệu clickstream, log với lượng ghi rất lớn", "Hệ thống kế toán cần ACID nghiêm ngặt", "Dữ liệu quan hệ chặt chẽ"]
    answer: 1
    why: "Log, clickstream, dữ liệu tạm cần throughput ghi cao là ứng viên tốt cho NoSQL."
cards:
  - q: "BASE trong NoSQL gồm những gì và nó chọn gì theo CAP?"
    a: "Basically available, Soft state, Eventual consistency. Theo CAP, BASE chọn availability thay vì consistency."
  - q: "Eventual consistency nghĩa là gì?"
    a: "Hệ thống sẽ trở nên nhất quán sau một khoảng thời gian, với điều kiện không có input mới trong khoảng đó."
  - q: "Trong NoSQL, việc join thường được xử lý ở đâu?"
    a: "Dữ liệu được denormalize và join thường thực hiện trong code ứng dụng. Đa số NoSQL thiếu transaction ACID thật sự."
  - q: "Key-value store có đặc điểm gì và hợp với việc gì?"
    a: "Trừu tượng như hash table, đọc ghi thường O(1), lưu trên RAM hoặc SSD. Hợp với mô hình dữ liệu đơn giản hoặc dữ liệu thay đổi nhanh như in-memory cache; thao tác phức tạp bị đẩy về ứng dụng."
  - q: "Document store khác key-value store ở điểm nào?"
    a: "Value là document (JSON, XML…) chứa toàn bộ thông tin một đối tượng, và có API/ngôn ngữ truy vấn theo cấu trúc bên trong document. Các document có thể có field khác nhau hoàn toàn."
  - q: "Wide column store tổ chức dữ liệu thế nào và dùng khi nào?"
    a: "Đơn vị cơ bản là column (cặp name/value) gom thành column family; mỗi value có timestamp để versioning và giải xung đột. Ví dụ Bigtable, HBase, Cassandra; dùng cho tập dữ liệu rất lớn, cần availability và scale cao."
  - q: "Nhược điểm của graph database?"
    a: "Còn tương đối mới, chưa phổ biến nên khó tìm công cụ và tài liệu; nhiều graph DB chỉ truy cập được qua REST API."
  - q: "Những lý do nên chọn SQL thay vì NoSQL?"
    a: "Dữ liệu có cấu trúc, schema chặt, có quan hệ, cần join phức tạp và transaction; cách scale đã rõ ràng; hệ sinh thái trưởng thành; tra cứu theo index rất nhanh."
  - q: "Kiểu dữ liệu mẫu nào rất hợp với NoSQL?"
    a: "Clickstream và log cần ghi nhanh, bảng xếp hạng/điểm số, dữ liệu tạm như giỏ hàng, bảng truy cập nhiều (hot), bảng metadata/lookup."
---

:::tip[Ý chính]
- NoSQL thường theo BASE và ưu tiên availability hơn consistency.
- Bốn nhóm: key-value, document, wide column, graph. Mỗi nhóm hợp với một kiểu truy cập dữ liệu.
- Chọn SQL khi dữ liệu có cấu trúc, cần join và transaction. Chọn NoSQL khi dữ liệu bán cấu trúc, schema linh hoạt, cần ghi rất nhiều.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## NoSQL

NoSQL is a collection of data items represented in a **key-value store**, **document store**, **wide column store**, or a **graph database**.  Data is denormalized, and joins are generally done in the application code.  Most NoSQL stores lack true ACID transactions and favor [eventual consistency](../../3-he-phan-tan/02-consistency/#eventual-consistency).

**BASE** is often used to describe the properties of NoSQL databases.  In comparison with the [CAP Theorem](../../3-he-phan-tan/01-cap/#cap-theorem), BASE chooses availability over consistency.

* **Basically available** - the system guarantees availability.
* **Soft state** - the state of the system may change over time, even without input.
* **Eventual consistency** - the system will become consistent over a period of time, given that the system doesn't receive input during that period.

In addition to choosing between [SQL or NoSQL](#sql-or-nosql), it is helpful to understand which type of NoSQL database best fits your use case(s).  We'll review **key-value stores**, **document stores**, **wide column stores**, and **graph databases** in the next section.

### Key-value store

> Abstraction: hash table

A key-value store generally allows for O(1) reads and writes and is often backed by memory or SSD.  Data stores can maintain keys in [lexicographic order](https://en.wikipedia.org/wiki/Lexicographical_order "Bài Wikipedia về thứ tự từ điển, cách so sánh chuỗi hay dãy phần tử theo từng vị trí. Hữu ích để hiểu sắp xếp khóa và range query trong key-value store."), allowing efficient retrieval of key ranges.  Key-value stores can allow for storing of metadata with a value.

Key-value stores provide high performance and are often used for simple data models or for rapidly-changing data, such as an in-memory cache layer.  Since they offer only a limited set of operations, complexity is shifted to the application layer if additional operations are needed.

A key-value store is the basis for more complex systems such as a document store, and in some cases, a graph database.

#### Source(s) and further reading: key-value store

* [Key-value database](https://en.wikipedia.org/wiki/Key-value_database "Trang Wikipedia về key-value database: lưu trữ dạng từ điển, các kiểu triển khai và ví dụ hệ thống. Nắm mô hình dữ liệu nền tảng của NoSQL.")
* [Disadvantages of key-value stores](https://web.archive.org/web/20250430232317/https://stackoverflow.com/questions/4056093/what-are-the-disadvantages-of-using-a-key-value-table-over-nullable-columns-or "Câu hỏi Stack Overflow về nhược điểm của bảng key-value (EAV) so với cột nullable trong schema. Giúp cân nhắc linh hoạt schema với truy vấn và ràng buộc dữ liệu.")
* [Redis architecture](https://web.archive.org/web/20221222173554/http://qnimate.com/overview-of-redis-architecture/ "Bài tổng quan kiến trúc Redis: cơ chế lưu trữ in-memory, mô hình đơn luồng, persistence và replication. Giúp hiểu vì sao Redis nhanh và dùng làm cache ra sao.")
* [Memcached architecture](https://adayinthelifeof.nl/2011/02/06/memcache-internals/ "Bài giải thích cách memcache hoạt động bên trong: quản lý bộ nhớ slab, LRU eviction và hash. Giúp hiểu để dùng cache hiệu quả hơn.")

### Document store

> Abstraction: key-value store with documents stored as values

A document store is centered around documents (XML, JSON, binary, etc), where a document stores all information for a given object.  Document stores provide APIs or a query language to query based on the internal structure of the document itself.  *Note, many key-value stores include features for working with a value's metadata, blurring the lines between these two storage types.*

Based on the underlying implementation, documents are organized by collections, tags, metadata, or directories.  Although documents can be organized or grouped together, documents may have fields that are completely different from each other.

Some document stores like [MongoDB](https://www.mongodb.com/mongodb-architecture "Trang của MongoDB giới thiệu các best practice kiến trúc và Well-Architected Framework cho Atlas. Mang tính giới thiệu sản phẩm nhiều hơn là chiều sâu kỹ thuật.") and [CouchDB](https://blog.couchdb.org/2016/08/01/couchdb-2-0-architecture/ "Bài viết mô tả kiến trúc cluster của CouchDB 2.0 theo mô hình Dynamo: phân vùng dữ liệu, replication và quorum. Giúp hiểu cách một document database phân tán hoạt động.") also provide a SQL-like language to perform complex queries.  [DynamoDB](http://www.read.seas.harvard.edu/~kohler/class/cs239-w08/decandia07dynamo.pdf "Paper kinh điển của Amazon về Dynamo, kho key-value ưu tiên availability với consistent hashing, vector clock và eventual consistency. Nền tảng để hiểu các NoSQL phân tán.") supports both key-values and documents.

Document stores provide high flexibility and are often used for working with occasionally changing data.

#### Source(s) and further reading: document store

* [Document-oriented database](https://en.wikipedia.org/wiki/Document-oriented_database "Bài Wikipedia về document-oriented database, nhóm NoSQL lưu dữ liệu bán cấu trúc như JSON. Nắm khái niệm, so sánh với quan hệ và các hệ phổ biến.")
* [MongoDB architecture](https://www.mongodb.com/mongodb-architecture "Trang của MongoDB giới thiệu các best practice kiến trúc và Well-Architected Framework cho Atlas. Mang tính giới thiệu sản phẩm nhiều hơn là chiều sâu kỹ thuật.")
* [CouchDB architecture](https://blog.couchdb.org/2016/08/01/couchdb-2-0-architecture/ "Bài viết mô tả kiến trúc cluster của CouchDB 2.0 theo mô hình Dynamo: phân vùng dữ liệu, replication và quorum. Giúp hiểu cách một document database phân tán hoạt động.")
* [Elasticsearch architecture](https://www.elastic.co/blog/found-elasticsearch-from-the-bottom-up "Bài đầu của loạt về Elasticsearch đi từ tầng thấp: Lucene, inverted index và segment. Giúp hiểu cách search engine lưu và truy vấn dữ liệu.")

### Wide column store

<p align="center">
  <img src="../../../sd-images/n16iOGk.png">
  <br/>
  <i><a href=http://blog.grio.com/2015/11/sql-nosql-a-brief-history.html>Source: SQL & NoSQL, a brief history</a></i>
</p>

> Abstraction: nested map `ColumnFamily<RowKey, Columns<ColKey, Value, Timestamp>>`

A wide column store's basic unit of data is a column (name/value pair).  A column can be grouped in column families (analogous to a SQL table).  Super column families further group column families.  You can access each column independently with a row key, and columns with the same row key form a row.  Each value contains a timestamp for versioning and for conflict resolution.

Google introduced [Bigtable](http://www.read.seas.harvard.edu/~kohler/class/cs239-w08/chang06bigtable.pdf "Bài báo Bigtable của Google (OSDI 2006) mô tả hệ lưu trữ dữ liệu có cấu trúc phân tán: data model, tablet, GFS, Chubby. Tài liệu nền tảng về wide column store.") as the first wide column store, which influenced the open-source [HBase](https://www.edureka.co/blog/hbase-architecture/ "Bài giải thích kiến trúc HBase: data model, region server, đọc/ghi và cơ chế bên trong. Dễ tiếp cận để hiểu wide column store trên HDFS.") often-used in the Hadoop ecosystem, and [Cassandra](http://docs.datastax.com/en/cassandra/3.0/cassandra/architecture/archIntro.html "Tổng quan kiến trúc Cassandra: hệ thống peer-to-peer không có single point of failure, dữ liệu phân tán trên nhiều node. Nắm các khái niệm cốt lõi như replication và partitioning của Cassandra.") from Facebook.  Stores such as BigTable, HBase, and Cassandra maintain keys in lexicographic order, allowing efficient retrieval of selective key ranges.

Wide column stores offer high availability and high scalability.  They are often used for very large data sets.

#### Source(s) and further reading: wide column store

* [SQL & NoSQL, a brief history](http://blog.grio.com/2015/11/sql-nosql-a-brief-history.html "Bài viết điểm qua lịch sử từ mô hình quan hệ và SQL của Codd đến sự ra đời của NoSQL. Giúp bạn hiểu vì sao các loại database khác nhau xuất hiện.")
* [Bigtable architecture](http://www.read.seas.harvard.edu/~kohler/class/cs239-w08/chang06bigtable.pdf "Bài báo Bigtable của Google (OSDI 2006) mô tả hệ lưu trữ dữ liệu có cấu trúc phân tán: data model, tablet, GFS, Chubby. Tài liệu nền tảng về wide column store.")
* [HBase architecture](https://www.edureka.co/blog/hbase-architecture/ "Bài giải thích kiến trúc HBase: data model, region server, đọc/ghi và cơ chế bên trong. Dễ tiếp cận để hiểu wide column store trên HDFS.")
* [Cassandra architecture](http://docs.datastax.com/en/cassandra/3.0/cassandra/architecture/archIntro.html "Tổng quan kiến trúc Cassandra: hệ thống peer-to-peer không có single point of failure, dữ liệu phân tán trên nhiều node. Nắm các khái niệm cốt lõi như replication và partitioning của Cassandra.")

### Graph database

<p align="center">
  <img src="../../../sd-images/fNcl65g.png">
  <br/>
  <i><a href=https://en.wikipedia.org/wiki/File:GraphDatabase_PropertyGraph.png>Source: Graph database</a></i>
</p>

> Abstraction: graph

In a graph database, each node is a record and each arc is a relationship between two nodes.  Graph databases are optimized to represent complex relationships with many foreign keys or many-to-many relationships.

Graphs databases offer high performance for data models with complex relationships, such as a social network.  They are relatively new and are not yet widely-used; it might be more difficult to find development tools and resources.  Many graphs can only be accessed with [REST APIs](../../1-nen-tang/05-communication/#representational-state-transfer-rest).

#### Source(s) and further reading: graph

* [Graph database](https://en.wikipedia.org/wiki/Graph_database "Bài Wikipedia về graph database dùng node, edge và property để biểu diễn và truy vấn quan hệ. Hiểu khi nào nên chọn graph thay cho relational.")
* [Neo4j](https://neo4j.com/ "Trang chủ Neo4j, cơ sở dữ liệu đồ thị lưu dữ liệu dưới dạng node và quan hệ. Tham khảo khi cần hiểu graph database.")
* [FlockDB](https://web.archive.org/web/20170407041322/https://blog.twitter.com/2010/introducing-flockdb "Bài của Twitter giới thiệu FlockDB, cơ sở dữ liệu đồ thị phân tán lưu quan hệ follow, dựa trên MySQL và sharding. Cho thấy cách lưu graph xã hội quy mô lớn.")

### Source(s) and further reading: NoSQL

* [Explanation of base terminology](https://web.archive.org/web/20260609154329/https://stackoverflow.com/questions/3342497/explanation-of-base-terminology "Câu hỏi và trả lời trên Stack Overflow giải thích thuật ngữ BASE (Basically Available, Soft state, Eventual consistency) và đối chiếu với ACID trong cơ sở dữ liệu phân tán.")
* [NoSQL databases a survey and decision guidance](https://web.archive.org/web/20160816032217/https://medium.com/baqend-blog/nosql-databases-a-survey-and-decision-guidance-ea7823a822d "Bài khảo sát các loại NoSQL và hướng dẫn chọn database theo yêu cầu về consistency, availability và truy vấn. Giúp ra quyết định chọn kho dữ liệu.")
* [Scalability](https://web.archive.org/web/20250307201408/https://web.archive.org/web/20220602114024/https://www.lecloud.net/post/7994751381/scalability-for-dummies-part-2-database "Phần 2 loạt bài Scalability for Dummies, bàn về scale database: replication, sharding, denormalization và SQL tuning. Bài nhập môn dễ đọc.")
* [Introduction to NoSQL](https://www.youtube.com/watch?v=qI_g07C_Q5I "Bài nói của Martin Fowler tại GOTO 2012 giới thiệu NoSQL: các loại kho dữ liệu, lý do ra đời và khi nào nên dùng thay vì cơ sở dữ liệu quan hệ.")
* [NoSQL patterns](http://horicky.blogspot.com/2009/11/nosql-patterns.html "Bài tổng hợp các pattern thiết kế của NoSQL: key-value, replication, consistency, partitioning. Nền tảng tốt để hiểu vì sao các hệ NoSQL khác RDBMS.")

## SQL or NoSQL

<p align="center">
  <img src="../../../sd-images/wXGqG5f.png">
  <br/>
  <i><a href=https://www.infoq.com/articles/Transition-RDBMS-NoSQL/>Source: Transitioning from RDBMS to NoSQL</a></i>
</p>

Reasons for **SQL**:

* Structured data
* Strict schema
* Relational data
* Need for complex joins
* Transactions
* Clear patterns for scaling
* More established: developers, community, code, tools, etc
* Lookups by index are very fast

Reasons for **NoSQL**:

* Semi-structured data
* Dynamic or flexible schema
* Non-relational data
* No need for complex joins
* Store many TB (or PB) of data
* Very data intensive workload
* Very high throughput for IOPS

Sample data well-suited for NoSQL:

* Rapid ingest of clickstream and log data
* Leaderboard or scoring data
* Temporary data, such as a shopping cart
* Frequently accessed ('hot') tables
* Metadata/lookup tables

#### Source(s) and further reading: SQL or NoSQL

* [Scaling up to your first 10 million users](https://www.youtube.com/watch?v=kKjm4ehYiMs "Bài nói của AWS về cách mở rộng ứng dụng từ một người dùng đến 10 triệu, theo từng giai đoạn thêm load balancer, database replica, cache và microservices.")
* [SQL vs NoSQL differences](https://www.sitepoint.com/sql-vs-nosql-differences/ "Bài so sánh SQL và NoSQL: bảng với document, schema, khả năng scale, giúp chọn loại database phù hợp cho dự án.")
