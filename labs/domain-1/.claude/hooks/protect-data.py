#!/usr/bin/env python3
"""Hook PreToolUse: không cho Write/Edit sửa file trong thư mục data/.

Claude Code gửi thông tin lời gọi tool qua stdin dưới dạng JSON.
Thoát với mã 2 nghĩa là CHẶN; nội dung stderr được gửi cho model làm lý do.
Thoát với mã 0 nghĩa là không ý kiến, lời gọi đi tiếp theo luồng bình thường.
"""
import json
import os
import sys

event = json.load(sys.stdin)
file_path = event.get("tool_input", {}).get("file_path", "")
project_dir = os.environ.get("CLAUDE_PROJECT_DIR", event.get("cwd", ""))
data_dir = os.path.realpath(os.path.join(project_dir, "data"))
target = os.path.realpath(os.path.join(project_dir, file_path))

if target == data_dir or target.startswith(data_dir + os.sep):
    print(
        "Thư mục data/ chứa báo cáo sự cố gốc và chỉ được đọc. "
        "Hãy ghi kết quả vào thư mục out/ thay vì sửa file gốc.",
        file=sys.stderr,
    )
    sys.exit(2)

sys.exit(0)
