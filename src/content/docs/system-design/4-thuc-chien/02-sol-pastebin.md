---
title: "Thiết kế Pastebin / Bit.ly"
description: "Sinh URL ngắn bằng cách hash (MD5) rồi mã hóa Base62, lấy 7 ký tự đầu."
lesson:
  group: "Thiết kế thực chiến"
  minutes: 25
quiz:
  - q: "Vì sao Pastebin dùng Base62 thay vì Base64 khi tạo short link?"
    options: ["Base62 nhanh hơn", "Base62 bỏ các ký tự + và / vốn khó dùng trong URL", "Base64 không tồn tại", "Base62 ngắn hơn hẳn"]
    answer: 1
    why: "Base62 chỉ dùng [a-zA-Z0-9], an toàn trong URL."
cards:
  - q: "Pastebin: các use case chính trong phạm vi bài là gì?"
    a: "User ẩn danh dán text và nhận link ngẫu nhiên (mặc định không hết hạn, có thể đặt hạn), xem nội dung qua URL; service thống kê lượt xem theo tháng, xóa paste hết hạn, có high availability."
  - q: "Pastebin: giả định về lưu lượng là bao nhiêu?"
    a: "10 triệu user, 10 triệu lượt ghi paste/tháng, 100 triệu lượt đọc/tháng, tỉ lệ đọc/ghi 10:1. Tương đương khoảng 4 ghi/giây và 40 đọc/giây trung bình."
  - q: "Pastebin: mỗi paste chiếm bao nhiêu dung lượng và tăng bao nhiêu mỗi tháng?"
    a: "Khoảng 1.27 KB/paste (1 KB nội dung + metadata). Khoảng 12.7 GB/tháng, ~450 GB và 360 triệu shortlink sau 3 năm."
  - q: "Quy đổi nhanh request/giây sang request/tháng thế nào?"
    a: "Một tháng ≈ 2.5 triệu giây. 1 req/s ≈ 2.5 triệu req/tháng; 40 req/s ≈ 100 triệu; 400 req/s ≈ 1 tỉ req/tháng."
  - q: "Pastebin: nội dung paste và metadata được lưu ở đâu?"
    a: "Nội dung paste lưu ở Object Store (như S3). SQL database đóng vai hash table lớn, ánh xạ shortlink tới đường dẫn file (cùng hạn và thời điểm tạo). Có thể thay bằng NoSQL key-value store."
  - q: "Pastebin: luồng tạo paste do Write API xử lý thế nào?"
    a: "Sinh URL, kiểm tra trùng trong SQL database (trùng thì sinh lại), lưu bản ghi vào bảng pastes, lưu nội dung vào Object Store, rồi trả URL về."
  - q: "Pastebin: sinh shortlink 7 ký tự thế nào và vì sao 7 ký tự đủ?"
    a: "MD5 hash của IP + timestamp (hoặc dữ liệu ngẫu nhiên), mã hóa Base62, lấy 7 ký tự đầu. 62^7 giá trị đủ cho 360 triệu shortlink trong 3 năm."
  - q: "Pastebin: thống kê lượt xem và xóa paste hết hạn làm thế nào?"
    a: "Analytics không cần realtime nên chạy MapReduce trên log của Web Server để đếm hit. Xóa hết hạn: quét SQL database tìm bản ghi quá hạn rồi xóa hoặc đánh dấu hết hạn."
  - q: "Pastebin: xử lý tải đọc và traffic không đều thế nào?"
    a: "Nội dung phổ biến phục vụ từ Memory Cache, giúp chịu traffic không đều và spike. SQL Read Replicas xử lý cache miss, miễn là replica không bị quá tải vì replicate các lượt ghi."
  - q: "Pastebin: tải ghi có cần sharding ngay không?"
    a: "Khoảng 4 ghi/giây trung bình thì một SQL Write Master-Slave là đủ. Nếu không, dùng thêm federation, sharding, denormalization, SQL tuning hoặc chuyển bớt dữ liệu sang NoSQL."
---

:::tip[Ý chính]
- Sinh URL ngắn bằng cách hash (MD5) rồi mã hóa Base62, lấy 7 ký tự đầu.
- Nội dung paste lưu ở object store (S3), metadata ở SQL.
- Tỉ lệ đọc/ghi 10:1, nên scale bằng cache, read replicas và CDN.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Design Pastebin.com (or Bit.ly)

*Note: This document links directly to relevant areas found in the [system design topics](../../) to avoid duplication.  Refer to the linked content for general talking points, tradeoffs, and alternatives.*

**Design Bit.ly** - is a similar question, except pastebin requires storing the paste contents instead of the original unshortened url.

### Step 1: Outline use cases and constraints

> Gather requirements and scope the problem.
> Ask questions to clarify use cases and constraints.
> Discuss assumptions.

Without an interviewer to address clarifying questions, we'll define some use cases and constraints.

#### Use cases

##### We'll scope the problem to handle only the following use cases

* **User** enters a block of text and gets a randomly generated link
    * Expiration
        * Default setting does not expire
        * Can optionally set a timed expiration
* **User** enters a paste's url and views the contents
* **User** is anonymous
* **Service** tracks analytics of pages
    * Monthly visit stats
* **Service** deletes expired pastes
* **Service** has high availability

##### Out of scope

* **User** registers for an account
    * **User** verifies email
* **User** logs into a registered account
    * **User** edits the document
* **User** can set visibility
* **User** can set the shortlink

#### Constraints and assumptions

##### State assumptions

* Traffic is not evenly distributed
* Following a short link should be fast
* Pastes are text only
* Page view analytics do not need to be realtime
* 10 million users
* 10 million paste writes per month
* 100 million paste reads per month
* 10:1 read to write ratio

##### Calculate usage

**Clarify with your interviewer if you should run back-of-the-envelope usage calculations.**

* Size per paste
    * 1 KB content per paste
    * `shortlink` - 7 bytes
    * `expiration_length_in_minutes` - 4 bytes
    * `created_at` - 5 bytes
    * `paste_path` - 255 bytes
    * total = ~1.27 KB
* 12.7 GB of new paste content per month
    * 1.27 KB per paste * 10 million pastes per month
    * ~450 GB of new paste content in 3 years
    * 360 million shortlinks in 3 years
    * Assume most are new pastes instead of updates to existing ones
* 4 paste writes per second on average
* 40 read requests per second on average

Handy conversion guide:

* 2.5 million seconds per month
* 1 request per second = 2.5 million requests per month
* 40 requests per second = 100 million requests per month
* 400 requests per second = 1 billion requests per month

### Step 2: Create a high level design

> Outline a high level design with all important components.

<img src="../../../sd-images/sol/pastebin_pastebin_basic.png" alt="Imgur" loading="lazy" />

### Step 3: Design core components

> Dive into details for each core component.

#### Use case: User enters a block of text and gets a randomly generated link

We could use a [relational database](../../2-khoi-xay-dung/04-sql/#relational-database-management-system-rdbms) as a large hash table, mapping the generated url to a file server and path containing the paste file.

Instead of managing a file server, we could use a managed **Object Store** such as Amazon S3 or a [NoSQL document store](../../2-khoi-xay-dung/05-nosql/#document-store).

An alternative to a relational database acting as a large hash table, we could use a [NoSQL key-value store](../../2-khoi-xay-dung/05-nosql/#key-value-store).  We should discuss the [tradeoffs between choosing SQL or NoSQL](../../2-khoi-xay-dung/05-nosql/#sql-or-nosql).  The following discussion uses the relational database approach.

* The **Client** sends a create paste request to the **Web Server**, running as a [reverse proxy](../../2-khoi-xay-dung/02-reverse-proxy/#reverse-proxy-web-server)
* The **Web Server** forwards the request to the **Write API** server
* The **Write API** server does the following:
    * Generates a unique url
        * Checks if the url is unique by looking at the **SQL Database** for a duplicate
        * If the url is not unique, it generates another url
        * If we supported a custom url, we could use the user-supplied (also check for a duplicate)
    * Saves to the **SQL Database** `pastes` table
    * Saves the paste data to the **Object Store**
    * Returns the url

**Clarify with your interviewer how much code you are expected to write**.

The `pastes` table could have the following structure:

```
shortlink char(7) NOT NULL
expiration_length_in_minutes int NOT NULL
created_at datetime NOT NULL
paste_path varchar(255) NOT NULL
PRIMARY KEY(shortlink)
```

Setting the primary key to be based on the `shortlink` column creates an [index](../../2-khoi-xay-dung/04-sql/#use-good-indices) that the database uses to enforce uniqueness. We'll create an additional index on `created_at` to speed up lookups (log-time instead of scanning the entire table) and to keep the data in memory.  Reading 1 MB sequentially from memory takes about 250 microseconds, while reading from SSD takes 4x and from disk takes 80x longer.<sup><a href=https://github.com/donnemartin/system-design-primer#latency-numbers-every-programmer-should-know>1</a></sup>

To generate the unique url, we could:

* Take the [**MD5**](https://en.wikipedia.org/wiki/MD5 "Bài Wikipedia về thuật toán băm MD5, thiết kế, cách hoạt động và các điểm yếu va chạm đã bị khai thác. Hữu ích khi cân nhắc hàm băm cho hashing hoặc kiểm tra toàn vẹn.") hash of the user's ip_address + timestamp
    * MD5 is a widely used hashing function that produces a 128-bit hash value
    * MD5 is uniformly distributed
    * Alternatively, we could also take the MD5 hash of randomly-generated data
* [**Base 62**](https://www.kerstner.at/2012/07/shortening-strings-using-base-62-encoding/ "Bài hướng dẫn rút gọn chuỗi/URL bằng mã hóa Base 62, kèm cách chuyển đổi số sang ký tự. Hữu ích khi thiết kế URL shortener như Pastebin/TinyURL.") encode the MD5 hash
    * Base 62 encodes to `[a-zA-Z0-9]` which works well for urls, eliminating the need for escaping special characters
    * There is only one hash result for the original input and Base 62 is deterministic (no randomness involved)
    * Base 64 is another popular encoding but provides issues for urls because of the additional `+` and `/` characters
    * The following [Base 62 pseudocode](https://web.archive.org/web/20181009152458/https://stackoverflow.com/questions/742013/how-to-code-a-url-shortener "Thảo luận Stack Overflow về cách xây URL shortener, đặc biệt là mã hóa ID sang chuỗi ngắn như base62. Bổ trợ cho bài thiết kế bit.ly/Pastebin.") runs in O(k) time where k is the number of digits = 7:

```python
def base_encode(num, base=62):
    digits = []
    while num > 0
      remainder = modulo(num, base)
      digits.push(remainder)
      num = divide(num, base)
    digits = digits.reverse
```

* Take the first 7 characters of the output, which results in 62^7 possible values and should be sufficient to handle our constraint of 360 million shortlinks in 3 years:

```python
url = base_encode(md5(ip_address+timestamp))[:URL_LENGTH]
```

We'll use a public [**REST API**](../../1-nen-tang/05-communication/#representational-state-transfer-rest):

```
$ curl -X POST --data '{ "expiration_length_in_minutes": "60", \
    "paste_contents": "Hello World!" }' https://pastebin.com/api/v1/paste
```

Response:

```
{
    "shortlink": "foobar"
}
```

For internal communications, we could use [Remote Procedure Calls](../../1-nen-tang/05-communication/#remote-procedure-call-rpc).

#### Use case: User enters a paste's url and views the contents

* The **Client** sends a get paste request to the **Web Server**
* The **Web Server** forwards the request to the **Read API** server
* The **Read API** server does the following:
    * Checks the **SQL Database** for the generated url
        * If the url is in the **SQL Database**, fetch the paste contents from the **Object Store**
        * Else, return an error message for the user

REST API:

```
$ curl https://pastebin.com/api/v1/paste?shortlink=foobar
```

Response:

```
{
    "paste_contents": "Hello World"
    "created_at": "YYYY-MM-DD HH:MM:SS"
    "expiration_length_in_minutes": "60"
}
```

#### Use case: Service tracks analytics of pages

Since realtime analytics are not a requirement, we could simply **MapReduce** the **Web Server** logs to generate hit counts.

**Clarify with your interviewer how much code you are expected to write**.

```python
class HitCounts(MRJob):

    def extract_url(self, line):
        """Extract the generated url from the log line."""
        ...

    def extract_year_month(self, line):
        """Return the year and month portions of the timestamp."""
        ...

    def mapper(self, _, line):
        """Parse each log line, extract and transform relevant lines.

        Emit key value pairs of the form:

        (2016-01, url0), 1
        (2016-01, url0), 1
        (2016-01, url1), 1
        """
        url = self.extract_url(line)
        period = self.extract_year_month(line)
        yield (period, url), 1

    def reducer(self, key, values):
        """Sum values for each key.

        (2016-01, url0), 2
        (2016-01, url1), 1
        """
        yield key, sum(values)
```

#### Use case: Service deletes expired pastes

To delete expired pastes, we could just scan the **SQL Database** for all entries whose expiration timestamp are older than the current timestamp.  All expired entries would then be deleted (or  marked as expired) from the table.

### Step 4: Scale the design

> Identify and address bottlenecks, given the constraints.

<img src="../../../sd-images/4edXG0T.png" alt="Imgur" loading="lazy" />

**Important: Do not simply jump right into the final design from the initial design!**

State you would do this iteratively: 1) **Benchmark/Load Test**, 2) **Profile** for bottlenecks 3) address bottlenecks while evaluating alternatives and trade-offs, and 4) repeat.  See [Design a system that scales to millions of users on AWS](../../4-thuc-chien/03-sol-scaling-aws/) as a sample on how to iteratively scale the initial design.

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

An **Object Store** such as Amazon S3 can comfortably handle the constraint of 12.7 GB of new content per month.

To address the 40 *average* read requests per second (higher at peak), traffic for popular content should be handled by the **Memory Cache** instead of the database.  The **Memory Cache** is also useful for handling the unevenly distributed traffic and traffic spikes.  The **SQL Read Replicas** should be able to handle the cache misses, as long as the replicas are not bogged down with replicating writes.

4 *average* paste writes per second (with higher at peak) should be do-able for a single **SQL Write Master-Slave**.  Otherwise, we'll need to employ additional SQL scaling patterns:

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
