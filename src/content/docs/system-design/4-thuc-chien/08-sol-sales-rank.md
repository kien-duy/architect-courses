---
title: "Thiết kế Amazon sales ranking"
description: "Log bán hàng thô lưu ở object store; dùng MapReduce để tính số lượng bán theo danh mục."
lesson:
  group: "Thiết kế thực chiến"
  minutes: 20
quiz:
  - q: "Vì sao tính xếp hạng bằng MapReduce batch thay vì tính khi người dùng mở trang?"
    options: ["Vì MapReduce là bắt buộc", "Vì tính trên dữ liệu khổng lồ rất tốn kém; tính trước giúp đọc nhanh", "Vì người dùng không cần dữ liệu mới", "Vì SQL không hỗ trợ đếm"]
    answer: 1
    why: "Tách tính toán nặng ra chạy định kỳ, trang chỉ đọc kết quả đã tính."
cards:
  - q: "Sales rank: hệ thống cần làm gì và những gì ngoài phạm vi?"
    a: "Service tính sản phẩm phổ biến nhất tuần qua theo danh mục, user xem kết quả, high availability. Trang e-commerce tổng thể nằm ngoài phạm vi, chỉ thiết kế phần tính sales rank."
  - q: "Các giả định về sản phẩm và danh mục trong bài sales rank?"
    a: "Một item có thể thuộc nhiều danh mục nhưng không đổi danh mục; không có danh mục con; kết quả cập nhật mỗi giờ (sản phẩm phổ biến có thể cần thường hơn); 10 triệu sản phẩm, 1.000 danh mục."
  - q: "Quy mô giao dịch và lượt đọc của sales rank?"
    a: "1 tỷ giao dịch và 100 tỷ read request mỗi tháng, tỷ lệ đọc:ghi 100:1 → trung bình 400 giao dịch/giây và 40.000 read/giây."
  - q: "Dung lượng giao dịch mới được ước lượng thế nào?"
    a: "Khoảng 40 byte mỗi giao dịch → 40 GB mỗi tháng, 1,44 TB sau 3 năm (giả định phần lớn là giao dịch mới, không phải cập nhật)."
  - q: "Log thô từ Sales API được lưu ở đâu và vì sao?"
    a: "Trên managed Object Store như Amazon S3, thay vì tự vận hành distributed file system. Object Store xử lý thoải mái 40 GB dữ liệu mới mỗi tháng."
  - q: "MapReduce nhiều bước tính sales rank gồm những bước nào?"
    a: "Bước 1: lọc giao dịch trong tuần qua, biến đổi thành `(category, product_id) → sum(quantity)`. Bước 2: đổi key thành `(category, quantity)` để shuffle/sort của MapReduce thực hiện distributed sort."
  - q: "Kết quả xếp hạng được lưu và đọc ra sao?"
    a: "Ghi vào bảng tổng hợp `sales_rank` trong SQL Database, có index trên `id`, `category_id`, `product_id`. Read API đọc trực tiếp bảng này khi user xem trang."
  - q: "Làm sao chịu được 40.000 read/giây trung bình?"
    a: "Đưa traffic nội dung phổ biến vào Memory Cache thay vì database, cũng giúp xử lý traffic không đều và spike. Với lượng đọc lớn, SQL Read Replica có thể không kham nổi cache miss nên cần thêm các SQL scaling pattern."
  - q: "Điểm nghẽn phía ghi của sales rank và hướng xử lý?"
    a: "400 write/giây trung bình (cao hơn lúc peak) có thể quá sức một SQL Write Master-Slave; cần federation, sharding, denormalization, SQL tuning, hoặc chuyển một phần dữ liệu sang NoSQL."
  - q: "Dữ liệu cũ và phân tích nên đặt ở đâu?"
    a: "Analytics Database dùng data warehouse như Redshift hoặc BigQuery; chỉ giữ một khoảng thời gian giới hạn trong database, phần còn lại đưa vào data warehouse hoặc Object Store."
---

:::tip[Ý chính]
- Log bán hàng thô lưu ở object store; dùng MapReduce để tính số lượng bán theo danh mục.
- Kết quả xếp hạng ghi vào bảng sales_rank cho phần web đọc.
- Phân tích nặng chạy batch theo giờ, tách khỏi đường xử lý request.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/sales_rank/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Design Amazon's sales rank by category feature

*Note: This document links directly to relevant areas found in the [system design topics](../../) to avoid duplication.  Refer to the linked content for general talking points, tradeoffs, and alternatives.*

### Step 1: Outline use cases and constraints

> Gather requirements and scope the problem.
> Ask questions to clarify use cases and constraints.
> Discuss assumptions.

Without an interviewer to address clarifying questions, we'll define some use cases and constraints.

#### Use cases

##### We'll scope the problem to handle only the following use case

* **Service** calculates the past week's most popular products by category
* **User** views the past week's most popular products by category
* **Service** has high availability

##### Out of scope

* The general e-commerce site
    * Design components only for calculating sales rank

#### Constraints and assumptions

##### State assumptions

* Traffic is not evenly distributed
* Items can be in multiple categories
* Items cannot change categories
* There are no subcategories ie `foo/bar/baz`
* Results must be updated hourly
    * More popular products might need to be updated more frequently
* 10 million products
* 1000 categories
* 1 billion transactions per month
* 100 billion read requests per month
* 100:1 read to write ratio

##### Calculate usage

**Clarify with your interviewer if you should run back-of-the-envelope usage calculations.**

* Size per transaction:
    * `created_at` - 5 bytes
    * `product_id` - 8 bytes
    * `category_id` - 4 bytes
    * `seller_id` - 8 bytes
    * `buyer_id` - 8 bytes
    * `quantity` - 4 bytes
    * `total_price` - 5 bytes
    * Total: ~40 bytes
* 40 GB of new transaction content per month
    * 40 bytes per transaction * 1 billion transactions per month
    * 1.44 TB of new transaction content in 3 years
    * Assume most are new transactions instead of updates to existing ones
* 400 transactions per second on average
* 40,000 read requests per second on average

Handy conversion guide:

* 2.5 million seconds per month
* 1 request per second = 2.5 million requests per month
* 40 requests per second = 100 million requests per month
* 400 requests per second = 1 billion requests per month

### Step 2: Create a high level design

> Outline a high level design with all important components.

<img src="../../../sd-images/sol/sales_rank_sales_rank_basic.png" alt="Imgur" loading="lazy" />

### Step 3: Design core components

> Dive into details for each core component.

#### Use case: Service calculates the past week's most popular products by category

We could store the raw **Sales API** server log files on a managed **Object Store** such as Amazon S3, rather than managing our own distributed file system.

**Clarify with your interviewer how much code you are expected to write**.

We'll assume this is a sample log entry, tab delimited:

```
timestamp   product_id  category_id    qty     total_price   seller_id    buyer_id
t1          product1    category1      2       20.00         1            1
t2          product1    category2      2       20.00         2            2
t2          product1    category2      1       10.00         2            3
t3          product2    category1      3        7.00         3            4
t4          product3    category2      7        2.00         4            5
t5          product4    category1      1        5.00         5            6
...
```

The **Sales Rank Service** could use **MapReduce**, using the **Sales API** server log files as input and writing the results to an aggregate table `sales_rank` in a **SQL Database**.  We should discuss the [use cases and tradeoffs between choosing SQL or NoSQL](../../2-khoi-xay-dung/05-nosql/#sql-or-nosql).

We'll use a multi-step **MapReduce**:

* **Step 1** - Transform the data to `(category, product_id), sum(quantity)`
* **Step 2** - Perform a distributed sort

```python
class SalesRanker(MRJob):

    def within_past_week(self, timestamp):
        """Return True if timestamp is within past week, False otherwise."""
        ...

    def mapper(self, _ line):
        """Parse each log line, extract and transform relevant lines.

        Emit key value pairs of the form:

        (category1, product1), 2
        (category2, product1), 2
        (category2, product1), 1
        (category1, product2), 3
        (category2, product3), 7
        (category1, product4), 1
        """
        timestamp, product_id, category_id, quantity, total_price, seller_id, \
            buyer_id = line.split('\t')
        if self.within_past_week(timestamp):
            yield (category_id, product_id), quantity

    def reducer(self, key, value):
        """Sum values for each key.

        (category1, product1), 2
        (category2, product1), 3
        (category1, product2), 3
        (category2, product3), 7
        (category1, product4), 1
        """
        yield key, sum(values)

    def mapper_sort(self, key, value):
        """Construct key to ensure proper sorting.

        Transform key and value to the form:

        (category1, 2), product1
        (category2, 3), product1
        (category1, 3), product2
        (category2, 7), product3
        (category1, 1), product4

        The shuffle/sort step of MapReduce will then do a
        distributed sort on the keys, resulting in:

        (category1, 1), product4
        (category1, 2), product1
        (category1, 3), product2
        (category2, 3), product1
        (category2, 7), product3
        """
        category_id, product_id = key
        quantity = value
        yield (category_id, quantity), product_id

    def reducer_identity(self, key, value):
        yield key, value

    def steps(self):
        """Run the map and reduce steps."""
        return [
            self.mr(mapper=self.mapper,
                    reducer=self.reducer),
            self.mr(mapper=self.mapper_sort,
                    reducer=self.reducer_identity),
        ]
```

The result would be the following sorted list, which we could insert into the `sales_rank` table:

```
(category1, 1), product4
(category1, 2), product1
(category1, 3), product2
(category2, 3), product1
(category2, 7), product3
```

The `sales_rank` table could have the following structure:

```
id int NOT NULL AUTO_INCREMENT
category_id int NOT NULL
total_sold int NOT NULL
product_id int NOT NULL
PRIMARY KEY(id)
FOREIGN KEY(category_id) REFERENCES Categories(id)
FOREIGN KEY(product_id) REFERENCES Products(id)
```

We'll create an [index](../../2-khoi-xay-dung/04-sql/#use-good-indices) on `id `, `category_id`, and `product_id` to speed up lookups (log-time instead of scanning the entire table) and to keep the data in memory.  Reading 1 MB sequentially from memory takes about 250 microseconds, while reading from SSD takes 4x and from disk takes 80x longer.<sup><a href=https://github.com/donnemartin/system-design-primer#latency-numbers-every-programmer-should-know>1</a></sup>

#### Use case: User views the past week's most popular products by category

* The **Client** sends a request to the **Web Server**, running as a [reverse proxy](../../2-khoi-xay-dung/02-reverse-proxy/#reverse-proxy-web-server)
* The **Web Server** forwards the request to the **Read API** server
* The **Read API** server reads from the **SQL Database** `sales_rank` table

We'll use a public [**REST API**](../../1-nen-tang/05-communication/#representational-state-transfer-rest):

```
$ curl https://amazon.com/api/v1/popular?category_id=1234
```

Response:

```
{
    "id": "100",
    "category_id": "1234",
    "total_sold": "100000",
    "product_id": "50",
},
{
    "id": "53",
    "category_id": "1234",
    "total_sold": "90000",
    "product_id": "200",
},
{
    "id": "75",
    "category_id": "1234",
    "total_sold": "80000",
    "product_id": "3",
},
```

For internal communications, we could use [Remote Procedure Calls](../../1-nen-tang/05-communication/#remote-procedure-call-rpc).

### Step 4: Scale the design

> Identify and address bottlenecks, given the constraints.

<img src="../../../sd-images/MzExP06.png" alt="Imgur" loading="lazy" />

**Important: Do not simply jump right into the final design from the initial design!**

State you would 1) **Benchmark/Load Test**, 2) **Profile** for bottlenecks 3) address bottlenecks while evaluating alternatives and trade-offs, and 4) repeat.  See [Design a system that scales to millions of users on AWS](../../4-thuc-chien/03-sol-scaling-aws/) as a sample on how to iteratively scale the initial design.

It's important to discuss what bottlenecks you might encounter with the initial design and how you might address each of them.  For example, what issues are addressed by adding a **Load Balancer** with multiple **Web Servers**?  **CDN**?  **Master-Slave Replicas**?  What are the alternatives and **Trade-Offs** for each?

We'll introduce some components to complete the design and to address scalability issues.  Internal load balancers are not shown to reduce clutter.

*To avoid repeating discussions*, refer to the following [system design topics](../../) for main talking points, tradeoffs, and alternatives:

* [DNS](../../1-nen-tang/06-dns/#domain-name-system)
* [CDN](../../1-nen-tang/07-cdn/#content-delivery-network)
* [Load balancer](../../2-khoi-xay-dung/01-load-balancer/)
* [Horizontal scaling](../../2-khoi-xay-dung/01-load-balancer/#horizontal-scaling)
* [Web server (reverse proxy)](../../2-khoi-xay-dung/02-reverse-proxy/#reverse-proxy-web-server)
* [API server (application layer)](../../2-khoi-xay-dung/03-application-layer/)
* [Cache](../../2-khoi-xay-dung/06-cache/)
* [Relational database management system (RDBMS)](../../2-khoi-xay-dung/04-sql/#relational-database-management-system-rdbms)
* [SQL write master-slave failover](../../3-he-phan-tan/03-availability/#fail-over)
* [Master-slave replication](../../2-khoi-xay-dung/04-sql/#master-slave-replication)
* [Consistency patterns](../../3-he-phan-tan/02-consistency/#consistency-patterns)
* [Availability patterns](../../3-he-phan-tan/03-availability/#availability-patterns)

The **Analytics Database** could use a data warehousing solution such as Amazon Redshift or Google BigQuery.

We might only want to store a limited time period of data in the database, while storing the rest in a data warehouse or in an **Object Store**.  An **Object Store** such as Amazon S3 can comfortably handle the constraint of 40 GB of new content per month.

To address the 40,000 *average* read requests per second (higher at peak), traffic for popular content (and their sales rank) should be handled by the **Memory Cache** instead of the database.  The **Memory Cache** is also useful for handling the unevenly distributed traffic and traffic spikes.  With the large volume of reads, the **SQL Read Replicas** might not be able to handle the cache misses.  We'll probably need to employ additional SQL scaling patterns.

400 *average* writes per second (higher at peak) might be tough for a single **SQL Write Master-Slave**, also pointing to a need for additional scaling techniques.

SQL scaling patterns include:

* [Federation](../../2-khoi-xay-dung/04-sql/#federation)
* [Sharding](../../2-khoi-xay-dung/04-sql/#sharding)
* [Denormalization](../../2-khoi-xay-dung/04-sql/#denormalization)
* [SQL Tuning](../../2-khoi-xay-dung/04-sql/#sql-tuning)

We should also consider moving some data to a **NoSQL Database**.

### Additional talking points

> Additional topics to dive into, depending on the problem scope and time remaining.

##### NoSQL

* [Key-value store](../../2-khoi-xay-dung/05-nosql/#key-value-store)
* [Document store](../../2-khoi-xay-dung/05-nosql/#document-store)
* [Wide column store](../../2-khoi-xay-dung/05-nosql/#wide-column-store)
* [Graph database](../../2-khoi-xay-dung/05-nosql/#graph-database)
* [SQL vs NoSQL](../../2-khoi-xay-dung/05-nosql/#sql-or-nosql)

#### Caching

* Where to cache
    * [Client caching](../../2-khoi-xay-dung/06-cache/#client-caching)
    * [CDN caching](../../2-khoi-xay-dung/06-cache/#cdn-caching)
    * [Web server caching](../../2-khoi-xay-dung/06-cache/#web-server-caching)
    * [Database caching](../../2-khoi-xay-dung/06-cache/#database-caching)
    * [Application caching](../../2-khoi-xay-dung/06-cache/#application-caching)
* What to cache
    * [Caching at the database query level](../../2-khoi-xay-dung/06-cache/#caching-at-the-database-query-level)
    * [Caching at the object level](../../2-khoi-xay-dung/06-cache/#caching-at-the-object-level)
* When to update the cache
    * [Cache-aside](../../2-khoi-xay-dung/06-cache/#cache-aside)
    * [Write-through](../../2-khoi-xay-dung/06-cache/#write-through)
    * [Write-behind (write-back)](../../2-khoi-xay-dung/06-cache/#write-behind-write-back)
    * [Refresh ahead](../../2-khoi-xay-dung/06-cache/#refresh-ahead)

#### Asynchronism and microservices

* [Message queues](../../2-khoi-xay-dung/07-async/#message-queues)
* [Task queues](../../2-khoi-xay-dung/07-async/#task-queues)
* [Back pressure](../../2-khoi-xay-dung/07-async/#back-pressure)
* [Microservices](../../2-khoi-xay-dung/03-application-layer/#microservices)

#### Communications

* Discuss tradeoffs:
    * External communication with clients - [HTTP APIs following REST](../../1-nen-tang/05-communication/#representational-state-transfer-rest)
    * Internal communications - [RPC](../../1-nen-tang/05-communication/#remote-procedure-call-rpc)
* [Service discovery](../../2-khoi-xay-dung/03-application-layer/#service-discovery)

#### Security

Refer to the [security section](../../2-khoi-xay-dung/08-security/).

#### Latency numbers

See [Latency numbers every programmer should know](../../1-nen-tang/04-numbers/#latency-numbers-every-programmer-should-know).

#### Ongoing

* Continue benchmarking and monitoring your system to address bottlenecks as they come up
* Scaling is an iterative process
