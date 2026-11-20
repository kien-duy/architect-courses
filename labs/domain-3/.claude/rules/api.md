---
paths:
  - "src/api/**/*.py"
---

# Quy ước cho API handler

- Handler trả về dict có đúng ba khóa: `ok`, `data`, `error`.
- `error` là mã lỗi viết hoa dạng `SNAKE_CASE`, ví dụ `ORDER_NOT_FOUND`. Không trả nguyên văn exception cho client.
- Handler kiểm tra đầu vào trước khi gọi tầng dữ liệu.
