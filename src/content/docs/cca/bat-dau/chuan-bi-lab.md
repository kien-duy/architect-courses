---
title: Chuẩn bị chạy lab
description: Chạy lab bằng Claude Code với tài khoản đang đăng nhập, không cần API key.
---

Lab trong khóa này chạy bằng **Claude Code** với tài khoản bạn đã đăng nhập. Bạn **không cần `ANTHROPIC_API_KEY`** và không cần file `.env`.

## Bạn cần gì

1. **Claude Code** đã cài và đã đăng nhập. Kiểm tra:

   ```bash
   claude --version
   ```

   Nếu chưa cài, xem [hướng dẫn cài đặt](https://code.claude.com/docs/en/quickstart). Lần đầu chạy `claude`, làm theo bước đăng nhập trên màn hình.

2. **Mã nguồn khóa học**, vì thư mục lab nằm trong repo:

   ```bash
   git clone https://github.com/kien-duy/architect-courses.git
   ```

3. `jq` để đọc output JSON cho dễ (không bắt buộc):

   ```bash
   brew install jq
   ```

## Lab chạy như thế nào

Mỗi lab là một thư mục trong `labs/`, chứa sẵn cấu hình Claude Code: subagent trong `.claude/agents/`, hook trong `.claude/settings.json`, và dữ liệu mẫu. Bạn `cd` vào thư mục lab rồi chạy các lệnh `claude -p "..."` ghi trong bài.

`claude -p` là chế độ không tương tác: Claude Code nhận một prompt, chạy vòng lặp agent tới khi xong, in kết quả rồi thoát. Đây cũng chính là cách Claude Code được dùng trong CI/CD ở Domain 3. Chi tiết xem [Run Claude Code programmatically](https://code.claude.com/docs/en/headless).

Mỗi bước trong lab đều có **output mẫu**, nên bạn vẫn theo được nếu chưa chạy.

## Chi phí và an toàn

- Lab dùng hạn mức của gói Claude bạn đang đăng nhập. Mỗi lệnh trong lab chỉ là vài lượt gọi model với model nhỏ (`--model haiku`).
- Lab chỉ đọc và ghi trong thư mục lab. Lệnh nào tự duyệt tool đều liệt kê rõ tool trong `--allowedTools`.
- Không chạy lab trong thư mục chứa dữ liệu quan trọng.

## Phần cần API key (tùy chọn)

Một số bài có code Python gọi thẳng Messages API (`client.messages.create(...)`) để bạn thấy vòng lặp ở mức thấp nhất. Phần đó để **đọc hiểu**; output mẫu đi kèm được ghi rõ là chưa chạy kiểm chứng.

Nếu muốn tự chạy:

1. Tạo key tại [Claude Console](https://platform.claude.com/settings/keys). Việc gọi API tính phí riêng, không dùng hạn mức gói Claude.
2. Đặt key vào biến môi trường của phiên terminal hiện tại, không ghi vào file trong repo:

   ```bash
   export ANTHROPIC_API_KEY="dán-key-của-bạn"
   ```

3. Cài SDK rồi chạy file:

   ```bash
   pip install anthropic
   ```
