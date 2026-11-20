---
title: "Thiết kế Twitter timeline và search"
description: "Fan-out on write: khi user đăng tweet, đẩy tweet id vào timeline (lưu trong cache) của các follower."
lesson:
  group: "Thiết kế thực chiến"
  minutes: 30
quiz:
  - q: "Vì sao fan-out on write gặp khó với tài khoản có hàng chục triệu follower?"
    options: ["Vì tweet quá dài", "Vì mỗi tweet phải ghi vào hàng chục triệu timeline, rất chậm và tốn kém", "Vì cache không lưu được tweet", "Vì không có load balancer"]
    answer: 1
    why: "Với tài khoản lớn, nên trộn tweet của họ vào timeline lúc đọc."
cards:
  - q: "Twitter: các use case chính trong phạm vi bài là gì?"
    a: "User đăng tweet (service đẩy tới follower kèm notification), xem user timeline, xem home timeline, tìm kiếm theo từ khóa; service có high availability."
  - q: "Twitter: giả định lưu lượng chính là bao nhiêu?"
    a: "100 triệu user active, 500 triệu tweet/ngày, mỗi tweet fan-out trung bình 10 lần. Khoảng 6.000 tweet/s, 60.000 lượt fan-out/s, 100.000 đọc/s, 4.000 search/s."
  - q: "Twitter: mỗi tweet bao nhiêu dung lượng, mỗi tháng tăng bao nhiêu?"
    a: "Khoảng 10 KB/tweet (chủ yếu do media). Khoảng 150 TB/tháng, 5.4 PB sau 3 năm."
  - q: "Twitter: user timeline và home timeline được lưu ở đâu?"
    a: "User timeline (tweet của chính user) lưu ở SQL database. Home timeline lưu trong Memory Cache (ví dụ Redis list chứa tweet_id, user_id), vì fan-out 60.000/s sẽ làm quá tải RDBMS."
  - q: "Twitter: Fan Out Service làm gì khi user đăng tweet?"
    a: "Hỏi User Graph Service lấy danh sách follower, chèn tweet vào home timeline của từng follower trong cache (O(n)), đưa tweet vào Search Index, lưu media ở Object Store, gửi notification qua queue bất đồng bộ."
  - q: "Twitter: luồng đọc home timeline diễn ra thế nào?"
    a: "Timeline Service lấy danh sách tweet_id và user_id từ Memory Cache (O(1)), rồi multiget tới Tweet Info Service và User Info Service để lấy chi tiết (O(n))."
  - q: "Twitter: Search Service xử lý một truy vấn thế nào?"
    a: "Parse/tokenize query (bỏ markup, tách từ, sửa lỗi chính tả, chuẩn hóa hoa thường, chuyển sang toán tử boolean), scatter-gather tới các server trong Search Cluster (như Lucene), rồi gộp, xếp hạng, sắp xếp kết quả."
  - q: "Twitter: fan-out tweet của tài khoản nhiều follower gây vấn đề gì và xử lý ra sao?"
    a: "Có thể mất vài phút, gây race condition với @reply. Giảm bằng cách sắp xếp lại tweet lúc phục vụ, hoặc không fan-out mà tìm tweet của họ lúc đọc rồi trộn vào home timeline."
  - q: "Twitter: những tối ưu nào giúp giảm dung lượng Memory Cache?"
    a: "Chỉ giữ vài trăm tweet mỗi home timeline, chỉ giữ timeline của user active; user không active 30 ngày thì dựng lại timeline từ SQL database khi cần."
  - q: "Twitter: vì sao SQL database vẫn là điểm nghẽn và xử lý thế nào?"
    a: "Read Replicas khó gánh hết cache miss, lượng ghi lớn làm quá tải một Write Master-Slave. Cần federation, sharding, denormalization, SQL tuning và chuyển bớt dữ liệu sang NoSQL."
---

:::tip[Ý chính]
- Fan-out on write: khi user đăng tweet, đẩy tweet id vào timeline (lưu trong cache) của các follower.
- Người có quá nhiều follower là trường hợp đặc biệt: trộn tweet của họ lúc đọc thay vì fan-out.
- Search dùng service riêng: tách từ, tạo inverted index, query scatter-gather.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/twitter/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Design the Twitter timeline and search

*Note: This document links directly to relevant areas found in the [system design topics](../../) to avoid duplication.  Refer to the linked content for general talking points, tradeoffs, and alternatives.*

**Design the Facebook feed** and **Design Facebook search** are similar questions.

### Step 1: Outline use cases and constraints

> Gather requirements and scope the problem.
> Ask questions to clarify use cases and constraints.
> Discuss assumptions.

Without an interviewer to address clarifying questions, we'll define some use cases and constraints.

#### Use cases

##### We'll scope the problem to handle only the following use cases

* **User** posts a tweet
    * **Service** pushes tweets to followers, sending push notifications and emails
* **User** views the user timeline (activity from the user)
* **User** views the home timeline (activity from people the user is following)
* **User** searches keywords
* **Service** has high availability

##### Out of scope

* **Service** pushes tweets to the Twitter Firehose and other streams
* **Service** strips out tweets based on users' visibility settings
    * Hide @reply if the user is not also following the person being replied to
    * Respect 'hide retweets' setting
* Analytics

#### Constraints and assumptions

##### State assumptions

General

* Traffic is not evenly distributed
* Posting a tweet should be fast
    * Fanning out a tweet to all of your followers should be fast, unless you have millions of followers
* 100 million active users
* 500 million tweets per day or 15 billion tweets per month
    * Each tweet averages a fanout of 10 deliveries
    * 5 billion total tweets delivered on fanout per day
    * 150 billion tweets delivered on fanout per month
* 250 billion read requests per month
* 10 billion searches per month

Timeline

* Viewing the timeline should be fast
* Twitter is more read heavy than write heavy
    * Optimize for fast reads of tweets
* Ingesting tweets is write heavy

Search

* Searching should be fast
* Search is read-heavy

##### Calculate usage

**Clarify with your interviewer if you should run back-of-the-envelope usage calculations.**

* Size per tweet:
    * `tweet_id` - 8 bytes
    * `user_id` - 32 bytes
    * `text` - 140 bytes
    * `media` - 10 KB average
    * Total: ~10 KB
* 150 TB of new tweet content per month
    * 10 KB per tweet * 500 million tweets per day * 30 days per month
    * 5.4 PB of new tweet content in 3 years
* 100 thousand read requests per second
    * 250 billion read requests per month * (400 requests per second / 1 billion requests per month)
* 6,000 tweets per second
    * 15 billion tweets per month * (400 requests per second / 1 billion requests per month)
* 60 thousand tweets delivered on fanout per second
    * 150 billion tweets delivered on fanout per month * (400 requests per second / 1 billion requests per month)
* 4,000 search requests per second
    * 10 billion searches per month * (400 requests per second / 1 billion requests per month)

Handy conversion guide:

* 2.5 million seconds per month
* 1 request per second = 2.5 million requests per month
* 40 requests per second = 100 million requests per month
* 400 requests per second = 1 billion requests per month

### Step 2: Create a high level design

> Outline a high level design with all important components.

<img src="../../../sd-images/sol/twitter_twitter_basic.png" alt="Imgur" loading="lazy" />

### Step 3: Design core components

> Dive into details for each core component.

#### Use case: User posts a tweet

We could store the user's own tweets to populate the user timeline (activity from the user) in a [relational database](../../2-khoi-xay-dung/04-sql/#relational-database-management-system-rdbms).  We should discuss the [use cases and tradeoffs between choosing SQL or NoSQL](../../2-khoi-xay-dung/05-nosql/#sql-or-nosql).

Delivering tweets and building the home timeline (activity from people the user is following) is trickier.  Fanning out tweets to all followers (60 thousand tweets delivered on fanout per second) will overload a traditional [relational database](../../2-khoi-xay-dung/04-sql/#relational-database-management-system-rdbms).  We'll probably want to choose a data store with fast writes such as a **NoSQL database** or **Memory Cache**.  Reading 1 MB sequentially from memory takes about 250 microseconds, while reading from SSD takes 4x and from disk takes 80x longer.<sup><a href=https://github.com/donnemartin/system-design-primer#latency-numbers-every-programmer-should-know>1</a></sup>

We could store media such as photos or videos on an **Object Store**.

* The **Client** posts a tweet to the **Web Server**, running as a [reverse proxy](../../2-khoi-xay-dung/02-reverse-proxy/#reverse-proxy-web-server)
* The **Web Server** forwards the request to the **Write API** server
* The **Write API** stores the tweet in the user's timeline on a **SQL database**
* The **Write API** contacts the **Fan Out Service**, which does the following:
    * Queries the **User Graph Service** to find the user's followers stored in the **Memory Cache**
    * Stores the tweet in the *home timeline of the user's followers* in a **Memory Cache**
        * O(n) operation:  1,000 followers = 1,000 lookups and inserts
    * Stores the tweet in the **Search Index Service** to enable fast searching
    * Stores media in the **Object Store**
    * Uses the **Notification Service** to send out push notifications to followers:
        * Uses a **Queue** (not pictured) to asynchronously send out notifications

**Clarify with your interviewer how much code you are expected to write**.

If our **Memory Cache** is Redis, we could use a native Redis list with the following structure:

```
           tweet n+2                   tweet n+1                   tweet n
| 8 bytes   8 bytes  1 byte | 8 bytes   8 bytes  1 byte | 8 bytes   8 bytes  1 byte |
| tweet_id  user_id  meta   | tweet_id  user_id  meta   | tweet_id  user_id  meta   |
```

The new tweet would be placed in the **Memory Cache**, which populates the user's home timeline (activity from people the user is following).

We'll use a public [**REST API**](../../1-nen-tang/05-communication/#representational-state-transfer-rest):

```
$ curl -X POST --data '{ "user_id": "123", "auth_token": "ABC123", \
    "status": "hello world!", "media_ids": "ABC987" }' \
    https://twitter.com/api/v1/tweet
```

Response:

```
{
    "created_at": "Wed Sep 05 00:37:15 +0000 2012",
    "status": "hello world!",
    "tweet_id": "987",
    "user_id": "123",
    ...
}
```

For internal communications, we could use [Remote Procedure Calls](../../1-nen-tang/05-communication/#remote-procedure-call-rpc).

#### Use case: User views the home timeline

* The **Client** posts a home timeline request to the **Web Server**
* The **Web Server** forwards the request to the **Read API** server
* The **Read API** server contacts the **Timeline Service**, which does the following:
    * Gets the timeline data stored in the **Memory Cache**, containing tweet ids and user ids - O(1)
    * Queries the **Tweet Info Service** with a [multiget](http://redis.io/commands/mget "Tài liệu lệnh MGET của Redis, lấy giá trị của nhiều key trong một lần gọi. Giúp giảm số round trip mạng khi đọc cache.") to obtain additional info about the tweet ids - O(n)
    * Queries the **User Info Service** with a multiget to obtain additional info about the user ids - O(n)

REST API:

```
$ curl https://twitter.com/api/v1/home_timeline?user_id=123
```

Response:

```
{
    "user_id": "456",
    "tweet_id": "123",
    "status": "foo"
},
{
    "user_id": "789",
    "tweet_id": "456",
    "status": "bar"
},
{
    "user_id": "789",
    "tweet_id": "579",
    "status": "baz"
},
```

#### Use case: User views the user timeline

* The **Client** posts a user timeline request to the **Web Server**
* The **Web Server** forwards the request to the **Read API** server
* The **Read API** retrieves the user timeline from the **SQL Database**

The REST API would be similar to the home timeline, except all tweets would come from the user as opposed to the people the user is following.

#### Use case: User searches keywords

* The **Client** sends a search request to the **Web Server**
* The **Web Server** forwards the request to the **Search API** server
* The **Search API** contacts the **Search Service**, which does the following:
    * Parses/tokenizes the input query, determining what needs to be searched
        * Removes markup
        * Breaks up the text into terms
        * Fixes typos
        * Normalizes capitalization
        * Converts the query to use boolean operations
    * Queries the **Search Cluster** (ie [Lucene](https://lucene.apache.org/ "Trang chủ Apache Lucene, thư viện tìm kiếm và đánh chỉ mục tốc độ cao, là lõi của Solr, Elasticsearch và OpenSearch. Giúp hiểu nền tảng của full-text search.")) for the results:
        * [Scatter gathers](https://github.com/donnemartin/system-design-primer#under-development "Các chủ đề repo gốc đang soạn dở, như distributed computing với MapReduce, consistent hashing và scatter gather.") each server in the cluster to determine if there are any results for the query
        * Merges, ranks, sorts, and returns the results

REST API:

```
$ curl https://twitter.com/api/v1/search?query=hello+world
```

The response would be similar to that of the home timeline, except for tweets matching the given query.

### Step 4: Scale the design

> Identify and address bottlenecks, given the constraints.

<img src="../../../sd-images/jrUBAF7.png" alt="Imgur" loading="lazy" />

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

The **Fanout Service** is a potential bottleneck.  Twitter users with millions of followers could take several minutes to have their tweets go through the fanout process.  This could lead to race conditions with @replies to the tweet, which we could mitigate by re-ordering the tweets at serve time.

We could also avoid fanning out tweets from highly-followed users.  Instead, we could search to find tweets for highly-followed users, merge the search results with the user's home timeline results, then re-order the tweets at serve time.

Additional optimizations include:

* Keep only several hundred tweets for each home timeline in the **Memory Cache**
* Keep only active users' home timeline info in the **Memory Cache**
    * If a user was not previously active in the past 30 days, we could rebuild the timeline from the **SQL Database**
        * Query the **User Graph Service** to determine who the user is following
        * Get the tweets from the **SQL Database** and add them to the **Memory Cache**
* Store only a month of tweets in the **Tweet Info Service**
* Store only active users in the **User Info Service**
* The **Search Cluster** would likely need to keep the tweets in memory to keep latency low

We'll also want to address the bottleneck with the **SQL Database**.

Although the **Memory Cache** should reduce the load on the database, it is unlikely the **SQL Read Replicas** alone would be enough to handle the cache misses.  We'll probably need to employ additional SQL scaling patterns.

The high volume of writes would overwhelm a single **SQL Write Master-Slave**, also pointing to a need for additional scaling techniques.

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
