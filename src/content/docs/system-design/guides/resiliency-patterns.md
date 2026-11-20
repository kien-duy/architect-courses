---
title: "Resiliency Patterns"
description: "Hình minh họa và giải thích của ByteByteGo: Resiliency Patterns"
---

*Hình và nội dung của [ByteByteGo](https://bytebytego.com/guides/resiliency-patterns/), giữ nguyên tiếng Anh. Bản quyền thuộc ByteByteGo.*

Have you noticed that the largest incidents are usually caused by something very small?

![](https://assets.bytebytego.com/diagrams/0316-reliciency-patterns.jpg)

A minor error starts the snowball effect that keeps building up. Suddenly, everything is down.

Here are 8 cloud design patterns to reduce the damage done by failures.

*   Timeout
*   Retry
*   Circuit breaker
*   Rate limiting
*   Load shedding
*   Bulkhead
*   Back pressure
*   Let it crash

These patterns are usually not used alone. To apply them effectively, we need to understand why we need them, how they work, and their limitations.
