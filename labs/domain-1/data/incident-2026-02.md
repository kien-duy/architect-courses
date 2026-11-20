# Sự cố 2026-02: Hàng đợi email chậm 3 giờ

- Thời gian: 03/02/2026, 13:00–16:05
- Ảnh hưởng: 42.000 email xác nhận đơn hàng gửi trễ
- Diễn biến: worker gửi email bị treo sau khi nhà cung cấp SMTP đổi chứng chỉ TLS. Worker thử lại vô hạn, không có giới hạn số lần.
- Nguyên nhân gốc: không có timeout và không có giới hạn retry ở worker; không có cảnh báo về độ dài hàng đợi.
- Khắc phục: cập nhật chứng chỉ, khởi động lại worker lúc 16:00.
- Việc cần làm: thêm timeout 30 giây và tối đa 5 lần retry; thêm cảnh báo khi hàng đợi vượt 5.000 thư.
