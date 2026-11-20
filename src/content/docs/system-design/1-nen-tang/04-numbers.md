---
title: "Những con số cần nhớ"
description: "Bảng lũy thừa của 2 giúp ước lượng nhanh dung lượng: 2^10 ≈ 1 nghìn (KB), 2^20 ≈ 1 triệu (MB), 2^30 ≈ 1 tỷ (GB)."
lesson:
  group: "Nền tảng"
  minutes: 12
quiz:
  - q: "Thao tác nào chậm nhất trong các thao tác sau?"
    options: ["Tham chiếu bộ nhớ chính (RAM)", "Đọc tuần tự 1 MB từ SSD", "Gửi một gói tin từ California sang Hà Lan rồi về", "Truy cập cache L1"]
    answer: 2
    why: "Một vòng mạng liên lục địa mất khoảng 150 ms, chậm hơn nhiều bậc so với các thao tác trong máy."
  - q: "2^30 byte xấp xỉ bằng bao nhiêu?"
    options: ["1 KB", "1 MB", "1 GB", "1 TB"]
    answer: 2
    why: "2^30 ≈ 1 tỷ byte = 1 GB."
cards:
  - q: "2^10, 2^20, 2^30, 2^40 byte xấp xỉ bao nhiêu?"
    a: "2^10 ≈ 1 nghìn (1 KB), 2^20 ≈ 1 triệu (1 MB), 2^30 ≈ 1 tỷ (1 GB), 2^40 ≈ 1 nghìn tỷ (1 TB)."
  - q: "Latency tham chiếu L1 cache, L2 cache và main memory xấp xỉ bao nhiêu?"
    a: "L1 khoảng 0,5 ns, L2 khoảng 7 ns, main memory khoảng 100 ns (gấp ~200 lần L1)."
  - q: "Đọc tuần tự 1 MB từ memory, SSD và HDD mất bao lâu?"
    a: "Memory khoảng 250 µs, SSD khoảng 1 ms, HDD khoảng 30 ms (gấp ~120 lần memory, ~30 lần SSD)."
  - q: "Round trip trong cùng datacenter so với gửi gói tin CA → Hà Lan → CA?"
    a: "Trong datacenter khoảng 500 µs (~2.000 round trip/giây); xuyên lục địa khoảng 150 ms (chỉ ~6-7 round trip/giây)."
  - q: "Tốc độ đọc tuần tự xấp xỉ của HDD, Ethernet 1 Gbps, SSD và main memory?"
    a: "HDD ~30 MB/s, 1 Gbps Ethernet ~100 MB/s, SSD ~1 GB/s, main memory ~4 GB/s."
  - q: "Một lần HDD seek tốn bao lâu, so với round trip trong datacenter?"
    a: "Khoảng 10 ms, gấp ~20 lần một round trip trong cùng datacenter."
  - q: "Đọc ngẫu nhiên 4 KB từ SSD tốn bao lâu?"
    a: "Khoảng 150 µs."
  - q: "Bảng con số latency dùng để làm gì trong phỏng vấn system design?"
    a: "Làm nền cho ước lượng back-of-the-envelope: so sánh chi phí memory, SSD, HDD, mạng để biết đâu là nút thắt và nên cache hay đặt dữ liệu ở đâu."
---

:::tip[Ý chính]
- Bảng lũy thừa của 2 giúp ước lượng nhanh dung lượng: 2^10 ≈ 1 nghìn (KB), 2^20 ≈ 1 triệu (MB), 2^30 ≈ 1 tỷ (GB).
- Đọc từ RAM nhanh hơn đọc từ SSD, SSD nhanh hơn ổ đĩa quay rất nhiều lần; đi qua mạng giữa các datacenter là đắt nhất.
- Các con số này là nền cho bước "back-of-the-envelope" khi ước lượng quy mô hệ thống.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Powers of two table

```
Power           Exact Value         Approx Value        Bytes
---------------------------------------------------------------
7                             128
8                             256
10                           1024   1 thousand           1 KB
16                         65,536                       64 KB
20                      1,048,576   1 million            1 MB
30                  1,073,741,824   1 billion            1 GB
32                  4,294,967,296                        4 GB
40              1,099,511,627,776   1 trillion           1 TB
```

### Source(s) and further reading

* [Powers of two](https://en.wikipedia.org/wiki/Power_of_two "Bài Wikipedia về lũy thừa của hai và các tính chất của chúng. Hữu ích để ước lượng dung lượng và dùng các con số 2^n trong tính toán system design.")

## Latency numbers every programmer should know

```
Latency Comparison Numbers
--------------------------
L1 cache reference                           0.5 ns
Branch mispredict                            5   ns
L2 cache reference                           7   ns                      14x L1 cache
Mutex lock/unlock                           25   ns
Main memory reference                      100   ns                      20x L2 cache, 200x L1 cache
Compress 1K bytes with Zippy            10,000   ns       10 us
Send 1 KB bytes over 1 Gbps network     10,000   ns       10 us
Read 4 KB randomly from SSD*           150,000   ns      150 us          ~1GB/sec SSD
Read 1 MB sequentially from memory     250,000   ns      250 us
Round trip within same datacenter      500,000   ns      500 us
Read 1 MB sequentially from SSD*     1,000,000   ns    1,000 us    1 ms  ~1GB/sec SSD, 4X memory
HDD seek                            10,000,000   ns   10,000 us   10 ms  20x datacenter roundtrip
Read 1 MB sequentially from 1 Gbps  10,000,000   ns   10,000 us   10 ms  40x memory, 10X SSD
Read 1 MB sequentially from HDD     30,000,000   ns   30,000 us   30 ms 120x memory, 30X SSD
Send packet CA->Netherlands->CA    150,000,000   ns  150,000 us  150 ms

Notes
-----
1 ns = 10^-9 seconds
1 us = 10^-6 seconds = 1,000 ns
1 ms = 10^-3 seconds = 1,000 us = 1,000,000 ns
```

Handy metrics based on numbers above:

* Read sequentially from HDD at 30 MB/s
* Read sequentially from 1 Gbps Ethernet at 100 MB/s
* Read sequentially from SSD at 1 GB/s
* Read sequentially from main memory at 4 GB/s
* 6-7 world-wide round trips per second
* 2,000 round trips per second within a data center

### Latency numbers visualized

![](https://camo.githubusercontent.com/77f72259e1eb58596b564d1ad823af1853bc60a3/687474703a2f2f692e696d6775722e636f6d2f6b307431652e706e67)

### Source(s) and further reading

* [Latency numbers every programmer should know - 1](https://gist.github.com/jboner/2841832 "Bảng Latency Numbers Every Programmer Should Know: thời gian truy cập cache, RAM, SSD, đĩa, mạng. Dùng để ước lượng hiệu năng khi back-of-the-envelope.")
* [Latency numbers every programmer should know - 2](https://gist.github.com/hellerbarde/2843375 "Bảng các con số latency điển hình như truy cập cache, RAM, SSD, đĩa và mạng giữa datacenter. Công cụ thiết yếu để ước lượng nhanh khi thiết kế hệ thống.")
* [Designs, lessons, and advice from building large distributed systems](http://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf "Slide keynote của Jeff Dean tại LADIS 2009 về thiết kế hệ thống phân tán tại Google: GFS, MapReduce, Bigtable và bài học thực tế. Hữu ích để nắm tư duy scale của Google.")
* [Software Engineering Advice from Building Large-Scale Distributed Systems](https://static.googleusercontent.com/media/research.google.com/en//people/jeff/stanford-295-talk.pdf "Slide bài nói của Jeff Dean tại Stanford về kinh nghiệm xây hệ thống phân tán lớn ở Google: thiết kế, các con số latency và bài học thực tế.")
