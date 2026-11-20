---
title: "Cache"
description: "Cache có thể đặt ở nhiều nơi: client, CDN, web server, database, application (Memcached, Redis)."
lesson:
  group: "Các khối xây dựng"
  minutes: 18
quiz:
  - q: "Mẫu cache nào có rủi ro mất dữ liệu nếu cache sập trước khi dữ liệu được ghi xuống DB?"
    options: ["Cache-aside", "Write-through", "Write-behind", "Refresh-ahead"]
    answer: 2
    why: "Write-behind ghi DB bất đồng bộ, nên dữ liệu chưa kịp ghi có thể mất."
  - q: "Trong cache-aside, khi cache miss thì ai đọc từ database?"
    options: ["Chính cache tự đọc", "Ứng dụng", "Load balancer", "CDN"]
    answer: 1
    why: "Ứng dụng đọc DB, trả kết quả và ghi vào cache."
cards:
  - q: "Vì sao đặt cache trước database giúp xử lý item phổ biến?"
    a: "DB thích đọc ghi phân bố đều giữa các partition; item phổ biến làm lệch phân bố gây nút cổ chai. Cache hấp thụ tải không đều và các đợt tăng traffic đột biến."
  - q: "Cache có thể đặt ở những tầng nào?"
    a: "Client (OS, trình duyệt), CDN, web server/reverse proxy (như Varnish), bên trong database, và application cache (Memcached, Redis)."
  - q: "Application cache như Memcached/Redis nhanh nhờ đâu và giới hạn gì?"
    a: "Dữ liệu nằm trong RAM nên nhanh hơn DB lưu trên disk. RAM hạn chế hơn disk nên cần thuật toán loại bỏ như LRU để bỏ dữ liệu 'lạnh', giữ dữ liệu 'nóng'."
  - q: "Redis có gì hơn Memcached theo bài?"
    a: "Có tùy chọn persistence và các cấu trúc dữ liệu dựng sẵn như sorted set, list."
  - q: "Vì sao nên tránh cache dựa trên file?"
    a: "Cache file làm việc clone server và auto-scaling khó hơn."
  - q: "Cache theo mức query DB gặp vấn đề gì?"
    a: "Khó xóa kết quả cache của query phức tạp; khi một ô dữ liệu đổi, phải xóa mọi query đã cache có thể chứa ô đó."
  - q: "Cache theo mức object có ưu điểm gì?"
    a: "Ứng dụng dựng dữ liệu thành object; khi dữ liệu gốc đổi chỉ cần xóa object đó khỏi cache. Còn cho phép xử lý bất đồng bộ: worker dựng object từ bản cache mới nhất."
  - q: "Nhược điểm của cache-aside (lazy loading)?"
    a: "Mỗi cache miss tốn ba lượt đi (gây trễ); dữ liệu có thể cũ nếu DB được cập nhật (giảm bằng TTL hoặc write-through); node hỏng được thay bằng node rỗng làm tăng latency."
  - q: "Write-through đánh đổi gì?"
    a: "Ghi chậm vì cache ghi đồng bộ xuống DB, nhưng đọc dữ liệu vừa ghi rất nhanh và cache không bị cũ. Nhược: node mới không có dữ liệu cho tới khi được cập nhật; nhiều dữ liệu ghi có thể không bao giờ được đọc."
  - q: "Refresh-ahead là gì và rủi ro ra sao?"
    a: "Cache tự làm mới các entry vừa được truy cập trước khi chúng hết hạn, giảm latency nếu đoán đúng item sẽ cần. Đoán sai thì hiệu năng còn kém hơn không dùng."
---

:::tip[Ý chính]
- Cache có thể đặt ở nhiều nơi: client, CDN, web server, database, application (Memcached, Redis).
- Cache-aside: ứng dụng tự đọc DB khi cache miss rồi ghi vào cache. Đây là mẫu phổ biến nhất.
- Write-through ghi đồng bộ vào cache và DB; write-behind ghi cache trước rồi ghi DB bất đồng bộ; refresh-ahead làm mới trước khi hết hạn.
- Khó nhất là cache invalidation: giữ cache đồng bộ với nguồn dữ liệu thật.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Cache

<p align="center">
  <img src="../../../sd-images/Q6z24La.png">
  <br/>
  <i><a href=http://horicky.blogspot.com/2010/10/scalable-system-design-patterns.html>Source: Scalable system design patterns</a></i>
</p>

Caching improves page load times and can reduce the load on your servers and databases.  In this model, the dispatcher will first lookup if the request has been made before and try to find the previous result to return, in order to save the actual execution.

Databases often benefit from a uniform distribution of reads and writes across its partitions.  Popular items can skew the distribution, causing bottlenecks.  Putting a cache in front of a database can help absorb uneven loads and spikes in traffic.

### Client caching

Caches can be located on the client side (OS or browser), [server side](../../2-khoi-xay-dung/02-reverse-proxy/#reverse-proxy-web-server), or in a distinct cache layer.

### CDN caching

[CDNs](../../1-nen-tang/07-cdn/#content-delivery-network) are considered a type of cache.

### Web server caching

[Reverse proxies](../../2-khoi-xay-dung/02-reverse-proxy/#reverse-proxy-web-server) and caches such as [Varnish](https://www.varnish-cache.org/ "Trang chủ Varnish Cache, reverse caching proxy mã nguồn mở đặt trước origin để phục vụ nội dung từ bộ nhớ. Giúp hiểu HTTP accelerator và cache tầng edge.") can serve static and dynamic content directly.  Web servers can also cache requests, returning responses without having to contact application servers.

### Database caching

Your database usually includes some level of caching in a default configuration, optimized for a generic use case.  Tweaking these settings for specific usage patterns can further boost performance.

### Application caching

In-memory caches such as Memcached and Redis are key-value stores between your application and your data storage.  Since the data is held in RAM, it is much faster than typical databases where data is stored on disk.  RAM is more limited than disk, so [cache invalidation](https://en.wikipedia.org/wiki/Cache_algorithms "Trang Wikipedia về các chính sách thay thế cache như LRU, LFU, FIFO. Hiểu cách chọn dữ liệu để loại bỏ khi cache đầy.") algorithms such as [least recently used (LRU)](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)) can help invalidate 'cold' entries and keep 'hot' data in RAM.

Redis has the following additional features:

* Persistence option
* Built-in data structures such as sorted sets and lists

There are multiple levels you can cache that fall into two general categories: **database queries** and **objects**:

* Row level
* Query-level
* Fully-formed serializable objects
* Fully-rendered HTML

Generally, you should try to avoid file-based caching, as it makes cloning and auto-scaling more difficult.

### Caching at the database query level

Whenever you query the database, hash the query as a key and store the result to the cache.  This approach suffers from expiration issues:

* Hard to delete a cached result with complex queries
* If one piece of data changes such as a table cell, you need to delete all cached queries that might include the changed cell

### Caching at the object level

See your data as an object, similar to what you do with your application code.  Have your application assemble the dataset from the database into a class instance or a data structure(s):

* Remove the object from cache if its underlying data has changed
* Allows for asynchronous processing: workers assemble objects by consuming the latest cached object

Suggestions of what to cache:

* User sessions
* Fully rendered web pages
* Activity streams
* User graph data

### When to update the cache

Since you can only store a limited amount of data in cache, you'll need to determine which cache update strategy works best for your use case.

#### Cache-aside

<p align="center">
  <img src="../../../sd-images/ONjORqk.png">
  <br/>
  <i><a href=http://www.slideshare.net/tmatyashovsky/from-cache-to-in-memory-data-grid-introduction-to-hazelcast>Source: From cache to in-memory data grid</a></i>
</p>

The application is responsible for reading and writing from storage.  The cache does not interact with storage directly.  The application does the following:

* Look for entry in cache, resulting in a cache miss
* Load entry from the database
* Add entry to cache
* Return entry

```python
def get_user(self, user_id):
    user = cache.get("user.{0}", user_id)
    if user is None:
        user = db.query("SELECT * FROM users WHERE user_id = {0}", user_id)
        if user is not None:
            key = "user.{0}".format(user_id)
            cache.set(key, json.dumps(user))
    return user
```

[Memcached](https://memcached.org/ "Trang chủ Memcached, hệ thống cache đối tượng phân tán lưu key-value trong bộ nhớ để giảm tải database cho ứng dụng web. Điểm khởi đầu để tìm hiểu cache phân tán.") is generally used in this manner.

Subsequent reads of data added to cache are fast.  Cache-aside is also referred to as lazy loading.  Only requested data is cached, which avoids filling up the cache with data that isn't requested.

##### Disadvantage(s): cache-aside

* Each cache miss results in three trips, which can cause a noticeable delay.
* Data can become stale if it is updated in the database.  This issue is mitigated by setting a time-to-live (TTL) which forces an update of the cache entry, or by using write-through.
* When a node fails, it is replaced by a new, empty node, increasing latency.

#### Write-through

<p align="center">
  <img src="../../../sd-images/0vBc0hN.png">
  <br/>
  <i><a href=http://www.slideshare.net/jboner/scalability-availability-stability-patterns/>Source: Scalability, availability, stability, patterns</a></i>
</p>

The application uses the cache as the main data store, reading and writing data to it, while the cache is responsible for reading and writing to the database:

* Application adds/updates entry in cache
* Cache synchronously writes entry to data store
* Return

Application code:

```python
set_user(12345, {"foo":"bar"})
```

Cache code:

```python
def set_user(user_id, values):
    user = db.query("UPDATE Users WHERE id = {0}", user_id, values)
    cache.set(user_id, user)
```

Write-through is a slow overall operation due to the write operation, but subsequent reads of just written data are fast.  Users are generally more tolerant of latency when updating data than reading data.  Data in the cache is not stale.

##### Disadvantage(s): write through

* When a new node is created due to failure or scaling, the new node will not cache entries until the entry is updated in the database.  Cache-aside in conjunction with write through can mitigate this issue.
* Most data written might never be read, which can be minimized with a TTL.

#### Write-behind (write-back)

<p align="center">
  <img src="../../../sd-images/rgSrvjG.png">
  <br/>
  <i><a href=http://www.slideshare.net/jboner/scalability-availability-stability-patterns/>Source: Scalability, availability, stability, patterns</a></i>
</p>

In write-behind, the application does the following:

* Add/update entry in cache
* Asynchronously write entry to the data store, improving write performance

##### Disadvantage(s): write-behind

* There could be data loss if the cache goes down prior to its contents hitting the data store.
* It is more complex to implement write-behind than it is to implement cache-aside or write-through.

#### Refresh-ahead

<p align="center">
  <img src="../../../sd-images/kxtjqgE.png">
  <br/>
  <i><a href=http://www.slideshare.net/tmatyashovsky/from-cache-to-in-memory-data-grid-introduction-to-hazelcast>Source: From cache to in-memory data grid</a></i>
</p>

You can configure the cache to automatically refresh any recently accessed cache entry prior to its expiration.

Refresh-ahead can result in reduced latency vs read-through if the cache can accurately predict which items are likely to be needed in the future.

##### Disadvantage(s): refresh-ahead

* Not accurately predicting which items are likely to be needed in the future can result in reduced performance than without refresh-ahead.

### Disadvantage(s): cache

* Need to maintain consistency between caches and the source of truth such as the database through [cache invalidation](https://en.wikipedia.org/wiki/Cache_algorithms "Trang Wikipedia về các chính sách thay thế cache như LRU, LFU, FIFO. Hiểu cách chọn dữ liệu để loại bỏ khi cache đầy.").
* Cache invalidation is a difficult problem, there is additional complexity associated with when to update the cache.
* Need to make application changes such as adding Redis or memcached.

### Source(s) and further reading

* [From cache to in-memory data grid](http://www.slideshare.net/tmatyashovsky/from-cache-to-in-memory-data-grid-introduction-to-hazelcast "Bộ slide đi từ khái niệm cache và các pattern caching đến in-memory data grid, kèm giới thiệu Hazelcast và so sánh với Infinispan. Hữu ích để hiểu cache phân tán.")
* [Scalable system design patterns](http://horicky.blogspot.com/2010/10/scalable-system-design-patterns.html "Bài tổng hợp các mẫu thiết kế hệ thống mở rộng thường gặp như load balancer, scatter and gather, result cache, shared space, pipe and filter, MapReduce. Hữu ích như bảng tra nhanh các pattern.")
* [Introduction to architecting systems for scale](http://lethain.com/introduction-to-architecting-systems-for-scale/ "Bài giới thiệu của Will Larson về các khối xây dựng hệ thống mở rộng: load balancing, cache, cơ sở dữ liệu, queue và cách chia nhỏ tầng. Điểm khởi đầu tốt cho người mới học system design.")
* [Scalability, availability, stability, patterns](http://www.slideshare.net/jboner/scalability-availability-stability-patterns/ "Bộ slide của Jonas Bonér tổng hợp các pattern về scalability, availability, stability: trade-off latency/throughput, consistency/availability và các kỹ thuật liên quan. Bản tổng quan tốt.")
* [Scalability](https://web.archive.org/web/20230126233752/https://www.lecloud.net/post/9246290032/scalability-for-dummies-part-3-cache "Phần 3 của loạt bài về scalability, nói về cache: cache cấp query và cấp object, cách dùng memcached/Redis. Nhập môn tốt về caching.")
* [AWS ElastiCache strategies](http://docs.aws.amazon.com/AmazonElastiCache/latest/UserGuide/Strategies.html "Tài liệu của AWS giới thiệu ElastiCache, dịch vụ cache phân tán trong bộ nhớ, cùng các chiến lược caching như lazy loading và write-through. Phù hợp để hiểu cách áp dụng cache vào kiến trúc thực tế.")
* [Wikipedia](https://en.wikipedia.org/wiki/Cache_(computing))
