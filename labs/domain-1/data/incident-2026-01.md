# Sự cố 2026-01: API thanh toán trả lỗi 502

- Thời gian: 14/01/2026, 09:12–09:47 (35 phút)
- Ảnh hưởng: 18% giao dịch thanh toán thất bại
- Diễn biến: sau đợt deploy 09:10, số kết nối tới database tăng vọt. Pool kết nối (tối đa 50) cạn trong 2 phút.
- Nguyên nhân gốc: bản deploy thêm một truy vấn trong vòng lặp nhưng không trả kết nối về pool khi gặp lỗi.
- Khắc phục: rollback lúc 09:45.
- Việc cần làm: thêm cảnh báo khi pool dùng trên 80%; review bắt buộc cho mọi thay đổi chạm vào lớp truy cập database.
