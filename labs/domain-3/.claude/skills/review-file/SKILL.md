---
name: review-file
description: Review một file Python của shopkit theo quy ước dự án. Dùng khi người dùng yêu cầu review, soát hoặc kiểm tra một file cụ thể.
argument-hint: "[đường-dẫn-file]"
allowed-tools: Read Grep Glob
---

Review file `$ARGUMENTS` theo quy ước của dự án shopkit.

1. Đọc file bằng tool Read. Không sửa file.
2. Đối chiếu với mọi quy ước dự án đang có trong context.
3. Trả lời đúng định dạng sau, không thêm lời dẫn:

```text
REVIEW <đường dẫn file>
- [cao|vừa|thấp] dòng <số>: <vấn đề> → <cách sửa>
KẾT LUẬN: ĐẠT hoặc CẦN SỬA
```

Chỉ nêu vi phạm quy ước và lỗi ảnh hưởng tới tính đúng. Bỏ qua góp ý về phong cách.
