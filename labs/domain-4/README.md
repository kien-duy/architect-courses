# Lab Domain 4: trích xuất hóa đơn có schema

Hướng dẫn từng bước nằm trong bài **4.7 · Lab** của khóa học:
https://kien-duy.github.io/architect-courses/cca/domain-4/07-lab/

Chạy mọi lệnh từ trong thư mục này. Lab dùng Claude Code với tài khoản đang đăng nhập, không cần API key.

- `data/`: 4 văn bản mẫu (hóa đơn chuẩn, tin nhắn thiếu trường, hóa đơn có tổng không khớp, phiếu có chiết khấu).
- `schema/`: `invoice-v1.json` (mọi trường bắt buộc) và `invoice-v2.json` (trường nullable, `stated_total` và `calculated_total`).
- `prompts/`: `vague.txt` (mơ hồ) và `explicit.txt` (tiêu chí rõ và few-shot).
- `extract.sh`, `retry.sh`: gọi `claude -p --output-format json --json-schema`.
- `validate.py`: kiểm tra lỗi ngữ nghĩa (Python stdlib).
- `samples/`: output thật của lần chạy ngày 2026-11-19, dùng khi kết quả của bạn khác output mẫu.
- `out/`: nơi ghi kết quả của bạn.
