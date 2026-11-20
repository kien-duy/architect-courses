---
title: "Bảo mật cơ bản"
description: "Mã hóa dữ liệu khi truyền và khi lưu."
lesson:
  group: "Các khối xây dựng"
  minutes: 4
quiz:
  - q: "Cách chống SQL injection được khuyến nghị là gì?"
    options: ["Nối chuỗi input vào câu SQL", "Dùng parameterized query", "Tắt log", "Dùng NoSQL"]
    answer: 1
    why: "Parameterized query tách dữ liệu khỏi câu lệnh SQL."
cards:
  - q: "Dữ liệu cần được mã hóa ở những trạng thái nào?"
    a: "Cả khi đang truyền (in transit) và khi lưu trữ (at rest)."
  - q: "Vì sao phải sanitize mọi input từ người dùng?"
    a: "Để ngăn XSS và SQL injection. Áp dụng cho mọi input người dùng và mọi tham số lộ ra cho người dùng."
  - q: "Nguyên tắc least privilege là gì?"
    a: "Mỗi người dùng, service hay tiến trình chỉ được cấp đúng những quyền tối thiểu cần để làm việc của mình."
  - q: "Trong phỏng vấn system design, cần biết sâu về bảo mật tới đâu?"
    a: "Trừ khi có kinh nghiệm chuyên sâu hoặc ứng tuyển vị trí cần bảo mật, thường chỉ cần nắm cơ bản: mã hóa, sanitize input, parameterized query, least privilege."
---

:::tip[Ý chính]
- Mã hóa dữ liệu khi truyền và khi lưu.
- Làm sạch mọi input người dùng để chống XSS và SQL injection; dùng parameterized query.
- Áp dụng nguyên tắc quyền tối thiểu (least privilege).
:::

*Phần nội dung tiếng Anh dưới đây lấy từ [The System Design Primer](https://github.com/donnemartin/system-design-primer/blob/master/README.md) của Donne Martin, giấy phép CC BY 4.0. Tiêu đề, ý chính, câu hỏi và flashcard là phần tiếng Việt của khóa học.*

## Security

This section could use some updates.  Consider [contributing](https://github.com/donnemartin/system-design-primer#contributing "Hướng dẫn đóng góp cho repo System Design Primer gốc trên GitHub: sửa lỗi, bổ sung nội dung hoặc dịch thuật.")!

Security is a broad topic.  Unless you have considerable experience, a security background, or are applying for a position that requires knowledge of security, you probably won't need to know more than the basics:

* Encrypt in transit and at rest.
* Sanitize all user inputs or any input parameters exposed to user to prevent [XSS](https://en.wikipedia.org/wiki/Cross-site_scripting "Bài Wikipedia về XSS, lỗ hổng cho phép chèn script vào trang web của người khác, gồm các loại tấn công và biện pháp phòng chống.") and [SQL injection](https://en.wikipedia.org/wiki/SQL_injection "Bài Wikipedia về SQL injection: chèn câu lệnh SQL độc hại qua đầu vào để tấn công ứng dụng, cùng các dạng tấn công và cách phòng chống như parameterized query.").
* Use parameterized queries to prevent SQL injection.
* Use the principle of [least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege "Bài Wikipedia về nguyên tắc đặc quyền tối thiểu: chỉ cấp quyền truy cập vừa đủ cho người dùng hoặc tiến trình, một nguyên lý nền tảng của bảo mật.").

### Source(s) and further reading

* [API security checklist](https://github.com/shieldfy/API-Security-Checklist "Checklist các biện pháp bảo mật quan trọng khi thiết kế, kiểm thử và phát hành API: xác thực, giới hạn request, xử lý input.")
* [Security guide for developers](https://github.com/FallibleInc/security-guide-for-developers "Kho GitHub tổng hợp hướng dẫn bảo mật cho lập trình viên, đi qua các lỗ hổng web phổ biến và cách phòng tránh. Dùng như checklist bảo mật khi thiết kế hệ thống.")
* [OWASP top ten](https://www.owasp.org/index.php/OWASP_Top_Ten_Cheat_Sheet "Cheat sheet OWASP liệt kê mười rủi ro bảo mật web hàng đầu như injection và XSS, kèm hướng phòng tránh. Hữu ích cho phần security.")
