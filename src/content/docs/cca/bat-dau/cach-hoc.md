---
title: Cách dùng trang học
description: Ngăn trượt tài liệu, checklist nổi, bài kiểm tra, đánh giá và lưu tiến trình.
---

## Đọc tài liệu chính thức ngay trong trang

Link tới tài liệu của Anthropic và MCP có ký hiệu ◨ ở cuối. Bấm vào, nội dung trang đó mở trong ngăn trượt bên phải; bài học vẫn nằm nguyên bên dưới và bạn cuộn tiếp được.

Thử ngay: [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop).

- Đóng ngăn trượt bằng nút ✕ hoặc phím Esc.
- Link trong ngăn trượt dẫn tới trang đã được chụp sẽ mở tiếp trong ngăn trượt, có nút ← để quay lại. Trang chưa được chụp mở ở tab mới.
- Tiêu đề ngăn trượt ghi **ngày chụp**. Nội dung được chụp lại mỗi lần trang học được build (ít nhất mỗi tuần một lần). Nút “Mở trang gốc ↗” luôn dẫn về bản mới nhất.

Trình duyệt không cho nhúng trực tiếp các trang tài liệu này vào trang khác, nên khóa học dùng bản chụp thay cho khung nhúng trực tiếp.

## Hoàn thành một bài

Cuối mỗi bài có 1–3 câu hỏi. Bài chỉ được tích hoàn thành khi bạn **trả lời đúng toàn bộ trong một lượt**.

- Trả lời sai: trang cho biết vì sao lựa chọn của bạn sai, nhưng chưa lộ đáp án. Bấm **← Học lại** để tới đúng đoạn cần đọc, rồi bấm **Làm lại**.
- Trả lời đúng hết: lời giải đầy đủ cho từng phương án và **từ khóa chốt đáp án** hiện ra.

Quiz cuối domain có 10 câu, đạt từ 70%. Lời giải hiện ngay sau khi nộp.

## Thi thử

[Đề thi thử](../../on-tap/thi-thu/) có 60 câu, 120 phút, đồng hồ đếm ngược luôn hiện ở đầu bài. Thứ tự câu được xáo mỗi lần thi. Sau khi nộp, bạn thấy tỉ lệ đúng theo từng domain và lời giải từng câu. Tải lại trang giữa chừng không làm mất bài đang làm.

## Checklist nổi

Nút tròn ở **góc phải dưới** cho biết số mục đã hoàn thành. Bấm để mở:

- **Checklist**: danh sách bài theo ngày của lộ trình. Bạn không tự tích được; mục được tích khi qua bài kiểm tra. Nút ↺ xóa trạng thái hoàn thành của một bài để học lại từ đầu.
- **Ghi chú**: ghi chú tự do cho bài đang mở.

## Đánh giá bài học

Dưới bài kiểm tra là phần đánh giá 1–5 sao và ô “Bài này nên cải thiện điều gì?”. Dùng nó để ghi lại chỗ khó hiểu, ví dụ còn thiếu hoặc lỗi sai ngay lúc đang học.

## Lưu và khôi phục tiến trình

Mọi dữ liệu (bài đã hoàn thành, điểm, ghi chú, sao, góp ý) chỉ nằm trong `localStorage` của trình duyệt này. Không có gì được gửi đi. Đổi máy, đổi trình duyệt hoặc xóa dữ liệu duyệt web là mất.

- **Lưu tiến trình học** (góc trên bên phải): tải về một file JSON chứa toàn bộ dữ liệu.
- **Khôi phục**: nạp lại file đó, thay thế tiến trình hiện có trên trình duyệt.

Trên màn hình hẹp, hai nút này nằm trong menu ☰.
