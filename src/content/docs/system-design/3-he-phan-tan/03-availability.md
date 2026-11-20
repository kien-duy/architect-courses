---
title: "Các mẫu sẵn sàng (availability)"
description: "Fail-over active-passive: máy dự phòng nhận việc khi máy chính ngừng heartbeat. Active-active: cả hai cùng phục vụ."
lesson:
  group: "Hệ phân tán"
  minutes: 10
quiz:
  - q: "Hai thành phần, mỗi cái 99.9%, mắc nối tiếp. Availability tổng xấp xỉ bao nhiêu?"
    options: ["99.9999%", "99.9%", "99.8%", "100%"]
    answer: 2
    why: "Nối tiếp: 0.999 × 0.999 ≈ 0.998 = 99.8%."
  - q: "Hai thành phần 99.9% chạy song song (chỉ cần một cái sống). Availability tổng là bao nhiêu?"
    options: ["99.8%", "99.9%", "99.9999%", "50%"]
    answer: 2
    why: "Song song: 1 − (0.001 × 0.001) = 99.9999%."
cards:
  - q: "Hai mẫu bổ trợ nhau để đạt high availability là gì?"
    a: "Fail-over và replication."
  - q: "Fail-over active-passive hoạt động thế nào?"
    a: "Server active và passive gửi heartbeat cho nhau. Nếu heartbeat bị gián đoạn, server passive chiếm địa chỉ IP của active và tiếp tục phục vụ. Chỉ server active xử lý traffic."
  - q: "Với active-passive, điều gì quyết định thời gian downtime?"
    a: "Server passive đang ở chế độ 'hot' standby (đã chạy sẵn) hay 'cold' standby (phải khởi động lên)."
  - q: "Với active-active fail-over, client cần biết về các server thế nào?"
    a: "Cả hai server cùng xử lý traffic. Nếu public-facing thì DNS phải biết IP public của cả hai; nếu nội bộ thì logic ứng dụng phải biết cả hai server."
  - q: "Nhược điểm của fail-over là gì?"
    a: "Thêm phần cứng và độ phức tạp. Có thể mất dữ liệu nếu hệ thống active hỏng trước khi dữ liệu mới ghi kịp replicate sang passive."
  - q: "Ba số 9 (99.9%) và bốn số 9 (99.99%) cho phép downtime bao nhiêu mỗi ngày?"
    a: "99.9%: khoảng 1 phút 26 giây/ngày (≈43 phút/tháng). 99.99%: khoảng 8.6 giây/ngày (≈4 phút 23 giây/tháng)."
  - q: "Công thức availability tổng khi hai thành phần chạy nối tiếp và song song?"
    a: "Nối tiếp: A = A1 × A2 (giảm). Song song: A = 1 − (1 − A1) × (1 − A2) (tăng)."
---

:::tip[Ý chính]
- Fail-over active-passive: máy dự phòng nhận việc khi máy chính ngừng heartbeat. Active-active: cả hai cùng phục vụ.
- Ba số 9 (99.9%) cho phép downtime khoảng 8h45m mỗi năm; bốn số 9 khoảng 52 phút.
- Thành phần nối tiếp làm availability giảm (nhân lại); song song làm availability tăng.
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Availability patterns

There are two complementary patterns to support high availability: **fail-over** and **replication**.

### Fail-over

#### Active-passive

With active-passive fail-over, heartbeats are sent between the active and the passive server on standby.  If the heartbeat is interrupted, the passive server takes over the active's IP address and resumes service.

The length of downtime is determined by whether the passive server is already running in 'hot' standby or whether it needs to start up from 'cold' standby.  Only the active server handles traffic.

Active-passive failover can also be referred to as master-slave failover.

#### Active-active

In active-active, both servers are managing traffic, spreading the load between them.

If the servers are public-facing, the DNS would need to know about the public IPs of both servers.  If the servers are internal-facing, application logic would need to know about both servers.

Active-active failover can also be referred to as master-master failover.

### Disadvantage(s): failover

* Fail-over adds more hardware and additional complexity.
* There is a potential for loss of data if the active system fails before any newly written data can be replicated to the passive.

### Replication

#### Master-slave and master-master

This topic is further discussed in the [Database](../../2-khoi-xay-dung/04-sql/#database) section:

* [Master-slave replication](../../2-khoi-xay-dung/04-sql/#master-slave-replication)
* [Master-master replication](../../2-khoi-xay-dung/04-sql/#master-master-replication)

### Availability in numbers

Availability is often quantified by uptime (or downtime) as a percentage of time the service is available.  Availability is generally measured in number of 9s--a service with 99.99% availability is described as having four 9s.

#### 99.9% availability - three 9s

| Duration            | Acceptable downtime|
|---------------------|--------------------|
| Downtime per year   | 8h 45min 57s       |
| Downtime per month  | 43m 49.7s          |
| Downtime per week   | 10m 4.8s           |
| Downtime per day    | 1m 26.4s           |

#### 99.99% availability - four 9s

| Duration            | Acceptable downtime|
|---------------------|--------------------|
| Downtime per year   | 52min 35.7s        |
| Downtime per month  | 4m 23s             |
| Downtime per week   | 1m 5s              |
| Downtime per day    | 8.6s               |

#### Availability in parallel vs in sequence

If a service consists of multiple components prone to failure, the service's overall availability depends on whether the components are in sequence or in parallel.

###### In sequence

Overall availability decreases when two components with availability < 100% are in sequence:

```
Availability (Total) = Availability (Foo) * Availability (Bar)
```

If both `Foo` and `Bar` each had 99.9% availability, their total availability in sequence would be 99.8%.

###### In parallel

Overall availability increases when two components with availability < 100% are in parallel:

```
Availability (Total) = 1 - (1 - Availability (Foo)) * (1 - Availability (Bar))
```

If both `Foo` and `Bar` each had 99.9% availability, their total availability in parallel would be 99.9999%.
