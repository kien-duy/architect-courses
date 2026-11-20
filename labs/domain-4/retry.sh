#!/bin/sh
# Cách dùng: ./retry.sh <file prompt> <file schema> <file văn bản> <file JSON lần trước> <file lỗi>
# Chạy lại lượt trích xuất, kèm văn bản gốc, kết quả lần trước và lỗi cụ thể từ bộ kiểm tra.
claude -p "$(cat "$1")

<document>
$(cat "$3")
</document>

Đây là kết quả trích xuất lần trước:
<previous_extraction>
$(cat "$4")
</previous_extraction>

Bộ kiểm tra tự động báo các lỗi sau:
<validation_errors>
$(cat "$5")
</validation_errors>

Đọc lại văn bản và trích xuất lại. Sửa những chỗ lần trước trích xuất sai. Nếu chính văn bản ghi con số không khớp nhau hoặc không có thông tin, giữ nguyên điều văn bản ghi: không sửa số liệu và không tự điền cho hết lỗi." --model haiku --output-format json --json-schema "$(cat "$2")" < /dev/null | jq '.structured_output'
