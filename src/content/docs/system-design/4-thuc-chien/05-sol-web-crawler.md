---
title: "Thiết kế Web crawler"
description: "Danh sách link cần crawl lưu trong NoSQL dạng sorted set, xếp theo độ phổ biến."
lesson:
  group: "Thiết kế thực chiến"
  minutes: 25
quiz:
  - q: "Làm sao crawler tránh crawl lại trang có nội dung giống hệt?"
    options: ["So sánh URL", "Tính signature của nội dung và so sánh", "Crawl mọi thứ hai lần", "Dùng DNS"]
    answer: 1
    why: "URL khác nhau vẫn có thể cùng nội dung, nên so signature nội dung."
cards:
  - q: "Web crawler: những use case nào nằm trong phạm vi bài?"
    a: "Service crawl danh sách URL, sinh reverse index (từ → trang) và title/snippet tĩnh; user nhập từ khóa để xem trang liên quan; service high availability. Search analytics, cá nhân hóa, page rank nằm ngoài phạm vi."
  - q: "Giả định về quy mô crawl và tần suất refresh của web crawler?"
    a: "1 tỷ link, refresh trung bình mỗi tuần (site phổ biến thường hơn) → khoảng 4 tỷ link crawl mỗi tháng; trung bình 500 KB mỗi trang; 100 tỷ lượt search mỗi tháng."
  - q: "Ước lượng dung lượng lưu trữ và tải request của web crawler?"
    a: "Khoảng 2 PB nội dung trang mỗi tháng (500 KB × 4 tỷ), 72 PB sau 3 năm; khoảng 1.600 write/giây và 40.000 search request/giây."
  - q: "`links_to_crawl` và `crawled_links` được lưu ở đâu, ra sao?"
    a: "Trong NoSQL key-value. `links_to_crawl` có thể dùng Redis sorted set để giữ thứ hạng link theo độ phổ biến; `crawled_links` lưu link đã xử lý kèm page signature."
  - q: "Vòng lặp chính của Crawler Service gồm các bước nào?"
    a: "Lấy link hạng cao nhất; nếu đã có trang signature tương tự thì hạ priority link đó. Nếu không: crawl, đẩy job vào queue của Reverse Index Service và Document Service, sinh signature, xóa khỏi `links_to_crawl`, thêm vào `crawled_links`."
  - q: "Với 1 tỷ link, làm sao loại bỏ URL trùng lặp?"
    a: "Danh sách nhỏ có thể dùng `sort | unique`; ở quy mô 1 tỷ link, dùng MapReduce: mapper phát (url, 1), reducer chỉ xuất những URL có tần suất bằng 1."
  - q: "Thuật toán nào có thể dùng để so độ giống nhau giữa hai signature nội dung trang?"
    a: "Jaccard index hoặc cosine similarity. Phát hiện nội dung trùng phức tạp hơn URL trùng, nên phải so signature theo độ tương đồng chứ không chỉ so bằng nhau."
  - q: "Làm sao quyết định khi nào crawl lại một trang?"
    a: "Lưu `timestamp` lần crawl cuối; mặc định refresh sau khoảng một tuần, site cập nhật thường hoặc phổ biến thì ngắn hơn. Có thể data mining thời gian trung bình trước khi trang đổi, và hỗ trợ `Robots.txt` để webmaster điều chỉnh tần suất."
  - q: "Query API xử lý một truy vấn tìm kiếm thế nào?"
    a: "Parse query (bỏ markup, tách term, sửa lỗi gõ, chuẩn hóa chữ hoa/thường, chuyển sang phép boolean), gọi Reverse Index Service để tìm và xếp hạng tài liệu, rồi Document Service trả title và snippet."
  - q: "Các tối ưu nào giúp scale web crawler?"
    a: "Cache query phổ biến bằng Redis/Memcached; sharding và federation cho Reverse Index và Document Service; crawler tự giữ DNS lookup làm mới định kỳ; connection pooling (có thể cân nhắc UDP); bảo đảm đủ bandwidth."
---

:::tip[Ý chính]
- Danh sách link cần crawl lưu trong NoSQL dạng sorted set, xếp theo độ phổ biến.
- Phát hiện trang trùng bằng signature của nội dung; tránh vòng lặp vô hạn.
- Reverse index và sinh snippet chạy như các service riêng xử lý bất đồng bộ.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/web_crawler/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Design a web crawler

*Note: This document links directly to relevant areas found in the [system design topics](../../) to avoid duplication.  Refer to the linked content for general talking points, tradeoffs, and alternatives.*

### Step 1: Outline use cases and constraints

> Gather requirements and scope the problem.
> Ask questions to clarify use cases and constraints.
> Discuss assumptions.

Without an interviewer to address clarifying questions, we'll define some use cases and constraints.

#### Use cases

##### We'll scope the problem to handle only the following use cases

* **Service** crawls a list of urls:
    * Generates reverse index of words to pages containing the search terms
    * Generates titles and snippets for pages
        * Title and snippets are static, they do not change based on search query
* **User** inputs a search term and sees a list of relevant pages with titles and snippets  the crawler generated
    * Only sketch high level components and interactions for this use case, no need to go into depth
* **Service** has high availability

##### Out of scope

* Search analytics
* Personalized search results
* Page rank

#### Constraints and assumptions

##### State assumptions

* Traffic is not evenly distributed
    * Some searches are very popular, while others are only executed once
* Support only anonymous users
* Generating search results should be fast
* The web crawler should not get stuck in an infinite loop
    * We get stuck in an infinite loop if the graph contains a cycle
* 1 billion links to crawl
    * Pages need to be crawled regularly to ensure freshness
    * Average refresh rate of about once per week, more frequent for popular sites
        * 4 billion links crawled each month
    * Average stored size per web page: 500 KB
        * For simplicity, count changes the same as new pages
* 100 billion searches per month

Exercise the use of more traditional systems - don't use existing systems such as [solr](http://lucene.apache.org/solr/ "Trang chủ Apache Solr, nền tảng tìm kiếm mã nguồn mở xây trên Lucene, hỗ trợ full-text, vector và phân tán. Dùng để tìm hiểu giải pháp search engine trong thiết kế hệ thống.") or [nutch](http://nutch.apache.org/ "Trang chủ Apache Nutch, web crawler mã nguồn mở có khả năng mở rộng dựa trên Hadoop. Hữu ích khi thiết kế web crawler và xử lý crawl theo lô.").

##### Calculate usage

**Clarify with your interviewer if you should run back-of-the-envelope usage calculations.**

* 2 PB of stored page content per month
    * 500 KB per page * 4 billion links crawled per month
    * 72 PB of stored page content in 3 years
* 1,600 write requests per second
* 40,000 search requests per second

Handy conversion guide:

* 2.5 million seconds per month
* 1 request per second = 2.5 million requests per month
* 40 requests per second = 100 million requests per month
* 400 requests per second = 1 billion requests per month

### Step 2: Create a high level design

> Outline a high level design with all important components.

<img src="../../../sd-images/sol/web_crawler_web_crawler_basic.png" alt="Imgur" loading="lazy" />

### Step 3: Design core components

> Dive into details for each core component.

#### Use case: Service crawls a list of urls

We'll assume we have an initial list of `links_to_crawl` ranked initially based on overall site popularity.  If this is not a reasonable assumption, we can seed the crawler with popular sites that link to outside content such as [Yahoo](https://www.yahoo.com/ "Trang chủ Yahoo, chủ yếu là tin tức và dịch vụ, không phải tài liệu system design. Chỉ là liên kết tham khảo về công ty."), [DMOZ](https://web.archive.org/web/20250305234014/http://www.dmoz.org/), etc.

We'll use a table `crawled_links` to store processed links and their page signatures.

We could store `links_to_crawl` and `crawled_links` in a key-value **NoSQL Database**.  For the ranked links in `links_to_crawl`, we could use [Redis](https://redis.io/ "Trang chủ Redis, kho dữ liệu trong bộ nhớ dùng làm cache, database và message broker. Trang thiên về giới thiệu sản phẩm, nên tài liệu chi tiết cần xem thêm.") with sorted sets to maintain a ranking of page links.  We should discuss the [use cases and tradeoffs between choosing SQL or NoSQL](../../2-khoi-xay-dung/05-nosql/#sql-or-nosql).

* The **Crawler Service** processes each page link by doing the following in a loop:
    * Takes the top ranked page link to crawl
        * Checks `crawled_links` in the **NoSQL Database** for an entry with a similar page signature
            * If we have a similar page, reduces the priority of the page link
                * This prevents us from getting into a cycle
                * Continue
            * Else, crawls the link
                * Adds a job to the **Reverse Index Service** queue to generate a [reverse index](https://en.wikipedia.org/wiki/Search_engine_indexing "Bài Wikipedia về search engine indexing: thu thập, phân tích và lưu dữ liệu, inverted index để truy xuất nhanh. Nền tảng cho thiết kế hệ thống search.")
                * Adds a job to the **Document Service** queue to generate a static title and snippet
                * Generates the page signature
                * Removes the link from `links_to_crawl` in the **NoSQL Database**
                * Inserts the page link and signature to `crawled_links` in the **NoSQL Database**

**Clarify with your interviewer how much code you are expected to write**.

`PagesDataStore` is an abstraction within the **Crawler Service** that uses the **NoSQL Database**:

```python
class PagesDataStore(object):

    def __init__(self, db);
        self.db = db
        ...

    def add_link_to_crawl(self, url):
        """Add the given link to `links_to_crawl`."""
        ...

    def remove_link_to_crawl(self, url):
        """Remove the given link from `links_to_crawl`."""
        ...

    def reduce_priority_link_to_crawl(self, url)
        """Reduce the priority of a link in `links_to_crawl` to avoid cycles."""
        ...

    def extract_max_priority_page(self):
        """Return the highest priority link in `links_to_crawl`."""
        ...

    def insert_crawled_link(self, url, signature):
        """Add the given link to `crawled_links`."""
        ...

    def crawled_similar(self, signature):
        """Determine if we've already crawled a page matching the given signature"""
        ...
```

`Page` is an abstraction within the **Crawler Service** that encapsulates a page, its contents, child urls, and signature:

```python
class Page(object):

    def __init__(self, url, contents, child_urls, signature):
        self.url = url
        self.contents = contents
        self.child_urls = child_urls
        self.signature = signature
```

`Crawler` is the main class within **Crawler Service**, composed of `Page` and `PagesDataStore`.

```python
class Crawler(object):

    def __init__(self, data_store, reverse_index_queue, doc_index_queue):
        self.data_store = data_store
        self.reverse_index_queue = reverse_index_queue
        self.doc_index_queue = doc_index_queue

    def create_signature(self, page):
        """Create signature based on url and contents."""
        ...

    def crawl_page(self, page):
        for url in page.child_urls:
            self.data_store.add_link_to_crawl(url)
        page.signature = self.create_signature(page)
        self.data_store.remove_link_to_crawl(page.url)
        self.data_store.insert_crawled_link(page.url, page.signature)

    def crawl(self):
        while True:
            page = self.data_store.extract_max_priority_page()
            if page is None:
                break
            if self.data_store.crawled_similar(page.signature):
                self.data_store.reduce_priority_link_to_crawl(page.url)
            else:
                self.crawl_page(page)
```

#### Handling duplicates

We need to be careful the web crawler doesn't get stuck in an infinite loop, which happens when the graph contains a cycle.

**Clarify with your interviewer how much code you are expected to write**.

We'll want to remove duplicate urls:

* For smaller lists we could use something like `sort | unique`
* With 1 billion links to crawl, we could use **MapReduce** to output only entries that have a frequency of 1

```python
class RemoveDuplicateUrls(MRJob):

    def mapper(self, _, line):
        yield line, 1

    def reducer(self, key, values):
        total = sum(values)
        if total == 1:
            yield key, total
```

Detecting duplicate content is more complex.  We could generate a signature based on the contents of the page and compare those two signatures for similarity.  Some potential algorithms are [Jaccard index](https://en.wikipedia.org/wiki/Jaccard_index "Bài Wikipedia về chỉ số Jaccard, thước đo độ giống nhau giữa hai tập hợp, hay dùng trong đề xuất và phát hiện trùng lặp.") and [cosine similarity](https://en.wikipedia.org/wiki/Cosine_similarity "Bài Wikipedia về độ tương đồng cosine, thước đo góc giữa hai vector, hay dùng trong tìm kiếm và hệ thống gợi ý. Hữu ích cho phần recommendation và search.").

#### Determining when to update the crawl results

Pages need to be crawled regularly to ensure freshness.  Crawl results could have a `timestamp` field that indicates the last time a page was crawled.  After a default time period, say one week, all pages should be refreshed.  Frequently updated or more popular sites could be refreshed in shorter intervals.

Although we won't dive into details on analytics, we could do some data mining to determine the mean time before a particular page is updated, and use that statistic to determine how often to re-crawl the page.

We might also choose to support a `Robots.txt` file that gives webmasters control of crawl frequency.

#### Use case: User inputs a search term and sees a list of relevant pages with titles and snippets

* The **Client** sends a request to the **Web Server**, running as a [reverse proxy](../../2-khoi-xay-dung/02-reverse-proxy/#reverse-proxy-web-server)
* The **Web Server** forwards the request to the **Query API** server
* The **Query API** server does the following:
    * Parses the query
        * Removes markup
        * Breaks up the text into terms
        * Fixes typos
        * Normalizes capitalization
        * Converts the query to use boolean operations
    * Uses the **Reverse Index Service** to find documents matching the query
        * The **Reverse Index Service** ranks the matching results and returns the top ones
    * Uses the **Document Service** to return titles and snippets

We'll use a public [**REST API**](../../1-nen-tang/05-communication/#representational-state-transfer-rest):

```
$ curl https://search.com/api/v1/search?query=hello+world
```

Response:

```
{
    "title": "foo's title",
    "snippet": "foo's snippet",
    "link": "https://foo.com",
},
{
    "title": "bar's title",
    "snippet": "bar's snippet",
    "link": "https://bar.com",
},
{
    "title": "baz's title",
    "snippet": "baz's snippet",
    "link": "https://baz.com",
},
```

For internal communications, we could use [Remote Procedure Calls](../../1-nen-tang/05-communication/#remote-procedure-call-rpc).

### Step 4: Scale the design

> Identify and address bottlenecks, given the constraints.

<img src="../../../sd-images/bWxPtQA.png" alt="Imgur" loading="lazy" />

**Important: Do not simply jump right into the final design from the initial design!**

State you would 1) **Benchmark/Load Test**, 2) **Profile** for bottlenecks 3) address bottlenecks while evaluating alternatives and trade-offs, and 4) repeat.  See [Design a system that scales to millions of users on AWS](../../4-thuc-chien/03-sol-scaling-aws/) as a sample on how to iteratively scale the initial design.

It's important to discuss what bottlenecks you might encounter with the initial design and how you might address each of them.  For example, what issues are addressed by adding a **Load Balancer** with multiple **Web Servers**?  **CDN**?  **Master-Slave Replicas**?  What are the alternatives and **Trade-Offs** for each?

We'll introduce some components to complete the design and to address scalability issues.  Internal load balancers are not shown to reduce clutter.

*To avoid repeating discussions*, refer to the following [system design topics](../../) for main talking points, tradeoffs, and alternatives:

* [DNS](../../1-nen-tang/06-dns/#domain-name-system)
* [Load balancer](../../2-khoi-xay-dung/01-load-balancer/)
* [Horizontal scaling](../../2-khoi-xay-dung/01-load-balancer/#horizontal-scaling)
* [Web server (reverse proxy)](../../2-khoi-xay-dung/02-reverse-proxy/#reverse-proxy-web-server)
* [API server (application layer)](../../2-khoi-xay-dung/03-application-layer/)
* [Cache](../../2-khoi-xay-dung/06-cache/)
* [NoSQL](../../2-khoi-xay-dung/05-nosql/)
* [Consistency patterns](../../3-he-phan-tan/02-consistency/#consistency-patterns)
* [Availability patterns](../../3-he-phan-tan/03-availability/#availability-patterns)

Some searches are very popular, while others are only executed once.  Popular queries can be served from a **Memory Cache** such as Redis or Memcached to reduce response times and to avoid overloading the **Reverse Index Service** and **Document Service**.  The **Memory Cache** is also useful for handling the unevenly distributed traffic and traffic spikes.  Reading 1 MB sequentially from memory takes about 250 microseconds, while reading from SSD takes 4x and from disk takes 80x longer.<sup><a href=https://github.com/donnemartin/system-design-primer#latency-numbers-every-programmer-should-know>1</a></sup>

Below are a few other optimizations to the **Crawling Service**:

* To handle the data size and request load, the **Reverse Index Service** and **Document Service** will likely need to make heavy use sharding and federation.
* DNS lookup can be a bottleneck, the **Crawler Service** can keep its own DNS lookup that is refreshed periodically
* The **Crawler Service** can improve performance and reduce memory usage by keeping many open connections at a time, referred to as [connection pooling](https://en.wikipedia.org/wiki/Connection_pool "Bài Wikipedia về connection pool: bộ nhớ đệm các kết nối database tái sử dụng để giảm chi phí mở/đóng kết nối. Hiểu cách tăng hiệu năng tầng database.")
    * Switching to [UDP](../../1-nen-tang/05-communication/#user-datagram-protocol-udp) could also boost performance
* Web crawling is bandwidth intensive, ensure there is enough bandwidth to sustain high throughput

### Additional talking points

> Additional topics to dive into, depending on the problem scope and time remaining.

#### SQL scaling patterns

* [Read replicas](../../2-khoi-xay-dung/04-sql/#master-slave-replication)
* [Federation](../../2-khoi-xay-dung/04-sql/#federation)
* [Sharding](../../2-khoi-xay-dung/04-sql/#sharding)
* [Denormalization](../../2-khoi-xay-dung/04-sql/#denormalization)
* [SQL Tuning](../../2-khoi-xay-dung/04-sql/#sql-tuning)

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
