# Sự cố 2026-03: Trang tìm kiếm chậm

- Thời gian: 21/03/2026, 20:30–21:10 (40 phút)
- Ảnh hưởng: thời gian phản hồi p95 của tìm kiếm tăng từ 300 ms lên 6 giây
- Diễn biến: một chiến dịch khuyến mãi làm lượng truy vấn tăng gấp 4. Cache bị xóa toàn bộ do một job dọn dẹp chạy sai giờ.
- Nguyên nhân gốc: job dọn cache được lên lịch theo giờ UTC nhưng cấu hình ghi giờ địa phương; không có cảnh báo về tỉ lệ cache hit.
- Khắc phục: nạp lại cache thủ công lúc 21:05.
- Việc cần làm: sửa múi giờ của job; thêm cảnh báo khi tỉ lệ cache hit dưới 70%.
